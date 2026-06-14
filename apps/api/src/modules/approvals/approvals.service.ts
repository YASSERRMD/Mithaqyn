import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateStepInput {
  role: string;
  assigneeId?: string;
}

export interface DecideInput {
  decision: 'APPROVED' | 'REJECTED';
  comment?: string;
  rejectionReason?: string;
}

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  async createWorkflow(contractId: string, steps: CreateStepInput[]) {
    // Verify contract exists
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    // Check if workflow already exists
    const existing = await this.prisma.approvalWorkflow.findUnique({
      where: { contractId },
    });
    if (existing) {
      throw new ConflictException(
        `An approval workflow already exists for contract ${contractId}`,
      );
    }

    if (!steps || steps.length === 0) {
      throw new BadRequestException('At least one approval step is required');
    }

    const workflow = await this.prisma.approvalWorkflow.create({
      data: {
        contractId,
        status: 'PENDING',
        steps: {
          create: steps.map((step, index) => ({
            stepOrder: index + 1,
            role: step.role,
            assigneeId: step.assigneeId ?? null,
            status: 'PENDING',
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    return workflow;
  }

  async decide(
    stepId: string,
    userId: string,
    input: DecideInput,
  ) {
    const step = await this.prisma.approvalStep.findUnique({
      where: { id: stepId },
      include: {
        workflow: {
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
      },
    });

    if (!step) {
      throw new NotFoundException(`Approval step ${stepId} not found`);
    }

    if (step.status !== 'PENDING') {
      throw new BadRequestException(
        `Step is already in status ${step.status} and cannot be decided again`,
      );
    }

    if (step.workflow.status === 'APPROVED' || step.workflow.status === 'REJECTED') {
      throw new BadRequestException(
        `Workflow is already ${step.workflow.status}`,
      );
    }

    // Update the step
    const updatedStep = await this.prisma.approvalStep.update({
      where: { id: stepId },
      data: {
        status: input.decision,
        comment: input.comment ?? null,
        rejectionReason: input.rejectionReason ?? null,
        decidedAt: new Date(),
      },
    });

    // Determine new workflow status
    const allSteps = step.workflow.steps.map((s) =>
      s.id === stepId ? { ...s, status: input.decision } : s,
    );

    let newWorkflowStatus: string;

    if (input.decision === 'REJECTED') {
      newWorkflowStatus = 'REJECTED';
    } else {
      const allApproved = allSteps.every((s) => s.status === 'APPROVED' || s.status === 'SKIPPED');
      const anyPending = allSteps.some((s) => s.status === 'PENDING');
      if (allApproved) {
        newWorkflowStatus = 'APPROVED';
      } else if (anyPending) {
        newWorkflowStatus = 'IN_PROGRESS';
      } else {
        newWorkflowStatus = 'IN_PROGRESS';
      }
    }

    await this.prisma.approvalWorkflow.update({
      where: { id: step.workflowId },
      data: { status: newWorkflowStatus },
    });

    return {
      step: updatedStep,
      workflowStatus: newWorkflowStatus,
    };
  }

  async getWorkflow(contractId: string) {
    const workflow = await this.prisma.approvalWorkflow.findUnique({
      where: { contractId },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        contract: {
          select: {
            id: true,
            title: true,
            status: true,
            type: true,
          },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException(
        `No approval workflow found for contract ${contractId}`,
      );
    }

    return workflow;
  }

  async getPendingApprovals(userId: string, role?: string) {
    const steps = await this.prisma.approvalStep.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { assigneeId: userId },
          ...(role ? [{ role }] : []),
        ],
      },
      include: {
        workflow: {
          include: {
            contract: {
              select: {
                id: true,
                title: true,
                type: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: [
        { workflow: { createdAt: 'asc' } },
        { stepOrder: 'asc' },
      ],
    });

    return steps;
  }
}
