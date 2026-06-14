import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  contract: {
    findUnique: jest.fn(),
  },
  approvalWorkflow: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  approvalStep: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockContract = {
  id: 'contract-001',
  title: 'Test NDA',
  type: 'NDA',
  status: 'DRAFT',
};

const mockWorkflow = {
  id: 'workflow-001',
  contractId: 'contract-001',
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
  steps: [
    {
      id: 'step-001',
      workflowId: 'workflow-001',
      stepOrder: 1,
      role: 'LEGAL_ADMIN',
      assigneeId: 'user-001',
      status: 'PENDING',
      comment: null,
      rejectionReason: null,
      decidedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'step-002',
      workflowId: 'workflow-001',
      stepOrder: 2,
      role: 'FINANCE',
      assigneeId: 'user-002',
      status: 'PENDING',
      comment: null,
      rejectionReason: null,
      decidedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

describe('ApprovalsService', () => {
  let service: ApprovalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ApprovalsService>(ApprovalsService);
    jest.clearAllMocks();
  });

  // ─── createWorkflow ──────────────────────────────────────────────────────────

  describe('createWorkflow', () => {
    it('should create a workflow with ordered steps', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.approvalWorkflow.findUnique.mockResolvedValue(null);
      mockPrisma.approvalWorkflow.create.mockResolvedValue(mockWorkflow);

      const result = await service.createWorkflow('contract-001', [
        { role: 'LEGAL_ADMIN', assigneeId: 'user-001' },
        { role: 'FINANCE', assigneeId: 'user-002' },
      ]);

      expect(result.contractId).toBe('contract-001');
      expect(mockPrisma.approvalWorkflow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contractId: 'contract-001',
            status: 'PENDING',
            steps: {
              create: [
                { stepOrder: 1, role: 'LEGAL_ADMIN', assigneeId: 'user-001', status: 'PENDING' },
                { stepOrder: 2, role: 'FINANCE', assigneeId: 'user-002', status: 'PENDING' },
              ],
            },
          }),
        }),
      );
    });

    it('should throw NotFoundException if contract does not exist', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);

      await expect(
        service.createWorkflow('non-existent', [{ role: 'LEGAL_ADMIN' }]),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if workflow already exists for contract', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.approvalWorkflow.findUnique.mockResolvedValue(mockWorkflow);

      await expect(
        service.createWorkflow('contract-001', [{ role: 'LEGAL_ADMIN' }]),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if no steps provided', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.approvalWorkflow.findUnique.mockResolvedValue(null);

      await expect(service.createWorkflow('contract-001', [])).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── decide ─────────────────────────────────────────────────────────────────

  describe('decide', () => {
    const pendingStep = {
      ...mockWorkflow.steps[0],
      workflow: {
        ...mockWorkflow,
        steps: mockWorkflow.steps,
      },
    };

    it('should mark a step as APPROVED and set workflow to IN_PROGRESS when another step is pending', async () => {
      mockPrisma.approvalStep.findUnique.mockResolvedValue(pendingStep);
      mockPrisma.approvalStep.update.mockResolvedValue({
        ...pendingStep,
        status: 'APPROVED',
        decidedAt: new Date(),
      });
      mockPrisma.approvalWorkflow.update.mockResolvedValue({
        ...mockWorkflow,
        status: 'IN_PROGRESS',
      });

      const result = await service.decide('step-001', 'user-001', {
        decision: 'APPROVED',
        comment: 'Looks good',
      });

      expect(result.step.status).toBe('APPROVED');
      expect(result.workflowStatus).toBe('IN_PROGRESS');
      expect(mockPrisma.approvalWorkflow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'IN_PROGRESS' },
        }),
      );
    });

    it('should set workflow to APPROVED when all steps are approved', async () => {
      const allApprovedWorkflow = {
        ...mockWorkflow,
        steps: [
          { ...mockWorkflow.steps[0], status: 'PENDING' },
          { ...mockWorkflow.steps[1], status: 'APPROVED' },
        ],
      };
      const singlePendingStep = {
        ...mockWorkflow.steps[0],
        workflow: allApprovedWorkflow,
      };

      mockPrisma.approvalStep.findUnique.mockResolvedValue(singlePendingStep);
      mockPrisma.approvalStep.update.mockResolvedValue({
        ...singlePendingStep,
        status: 'APPROVED',
        decidedAt: new Date(),
      });
      mockPrisma.approvalWorkflow.update.mockResolvedValue({
        ...mockWorkflow,
        status: 'APPROVED',
      });

      const result = await service.decide('step-001', 'user-001', {
        decision: 'APPROVED',
      });

      expect(result.workflowStatus).toBe('APPROVED');
      expect(mockPrisma.approvalWorkflow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'APPROVED' },
        }),
      );
    });

    it('should set workflow to REJECTED when a step is rejected', async () => {
      mockPrisma.approvalStep.findUnique.mockResolvedValue(pendingStep);
      mockPrisma.approvalStep.update.mockResolvedValue({
        ...pendingStep,
        status: 'REJECTED',
        rejectionReason: 'Missing clauses',
        decidedAt: new Date(),
      });
      mockPrisma.approvalWorkflow.update.mockResolvedValue({
        ...mockWorkflow,
        status: 'REJECTED',
      });

      const result = await service.decide('step-001', 'user-001', {
        decision: 'REJECTED',
        rejectionReason: 'Missing clauses',
      });

      expect(result.workflowStatus).toBe('REJECTED');
      expect(mockPrisma.approvalWorkflow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'REJECTED' },
        }),
      );
    });

    it('should throw NotFoundException for a non-existent step', async () => {
      mockPrisma.approvalStep.findUnique.mockResolvedValue(null);

      await expect(
        service.decide('non-existent-step', 'user-001', { decision: 'APPROVED' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if step is not PENDING', async () => {
      const alreadyDecidedStep = {
        ...pendingStep,
        status: 'APPROVED',
      };
      mockPrisma.approvalStep.findUnique.mockResolvedValue(alreadyDecidedStep);

      await expect(
        service.decide('step-001', 'user-001', { decision: 'APPROVED' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getWorkflow ─────────────────────────────────────────────────────────────

  describe('getWorkflow', () => {
    it('should return the workflow with steps for a contract', async () => {
      const workflowWithContract = {
        ...mockWorkflow,
        contract: mockContract,
      };
      mockPrisma.approvalWorkflow.findUnique.mockResolvedValue(workflowWithContract);

      const result = await service.getWorkflow('contract-001');

      expect(result.contractId).toBe('contract-001');
      expect(result.steps).toHaveLength(2);
      expect(result.contract.title).toBe('Test NDA');
    });

    it('should throw NotFoundException if no workflow exists for contract', async () => {
      mockPrisma.approvalWorkflow.findUnique.mockResolvedValue(null);

      await expect(service.getWorkflow('contract-001')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getPendingApprovals ─────────────────────────────────────────────────────

  describe('getPendingApprovals', () => {
    it('should return pending steps assigned to the user', async () => {
      const pendingStepsWithWorkflow = [
        {
          ...mockWorkflow.steps[0],
          workflow: {
            ...mockWorkflow,
            contract: mockContract,
          },
        },
      ];
      mockPrisma.approvalStep.findMany.mockResolvedValue(pendingStepsWithWorkflow);

      const result = await service.getPendingApprovals('user-001');

      expect(result).toHaveLength(1);
      expect(result[0].assigneeId).toBe('user-001');
      expect(mockPrisma.approvalStep.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
          }),
        }),
      );
    });

    it('should include role-based filter when role is provided', async () => {
      mockPrisma.approvalStep.findMany.mockResolvedValue([]);

      await service.getPendingApprovals('user-001', 'LEGAL_ADMIN');

      const whereArg = mockPrisma.approvalStep.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toContainEqual({ role: 'LEGAL_ADMIN' });
    });

    it('should return empty array when no pending approvals exist', async () => {
      mockPrisma.approvalStep.findMany.mockResolvedValue([]);

      const result = await service.getPendingApprovals('user-999');

      expect(result).toHaveLength(0);
    });
  });
});
