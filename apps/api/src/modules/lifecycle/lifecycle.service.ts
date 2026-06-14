import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type ContractStatus =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'PENDING_SIGNATURE'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'ARCHIVED';

export const TRANSITION_RULES: Map<ContractStatus, ContractStatus[]> = new Map([
  ['DRAFT', ['UNDER_REVIEW', 'TERMINATED']],
  ['UNDER_REVIEW', ['PENDING_SIGNATURE', 'DRAFT', 'TERMINATED']],
  ['PENDING_SIGNATURE', ['ACTIVE', 'UNDER_REVIEW', 'TERMINATED']],
  ['ACTIVE', ['EXPIRED', 'TERMINATED', 'ARCHIVED']],
  ['EXPIRED', ['ARCHIVED', 'ACTIVE']],
  ['TERMINATED', ['ARCHIVED']],
  ['ARCHIVED', []],
]);

export interface TimelineEntry {
  status: string;
  changedAt: Date;
  changedById: string | null;
}

@Injectable()
export class LifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async transition(
    contractId: string,
    toStatus: ContractStatus,
    userId: string,
    reason?: string,
  ) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    const currentStatus = contract.status as ContractStatus;
    const allowed = TRANSITION_RULES.get(currentStatus) ?? [];

    if (!allowed.includes(toStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${toStatus}. Allowed transitions: [${allowed.join(', ')}]`,
      );
    }

    const latestVersion = await this.prisma.contractVersion.findFirst({
      where: { contractId },
      orderBy: { versionNum: 'desc' },
    });

    const nextVersionNum = (latestVersion?.versionNum ?? 0) + 1;

    const [updated] = await this.prisma.$transaction([
      this.prisma.contract.update({
        where: { id: contractId },
        data: { status: toStatus },
        include: { counterparty: true },
      }),
      this.prisma.contractVersion.create({
        data: {
          contractId,
          versionNum: nextVersionNum,
          snapshot: {
            status: toStatus,
            previousStatus: currentStatus,
            reason: reason ?? null,
            transitionedById: userId,
          },
          changedById: userId,
        },
      }),
    ]);

    return updated;
  }

  async getTimeline(contractId: string): Promise<TimelineEntry[]> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    const versions = await this.prisma.contractVersion.findMany({
      where: { contractId },
      orderBy: { changedAt: 'asc' },
    });

    return versions
      .filter((v) => {
        const snap = v.snapshot as Record<string, unknown>;
        return typeof snap?.status === 'string';
      })
      .map((v) => {
        const snap = v.snapshot as Record<string, unknown>;
        return {
          status: snap.status as string,
          changedAt: v.changedAt,
          changedById: v.changedById,
        };
      });
  }

  async getValidTransitions(contractId: string): Promise<ContractStatus[]> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    const currentStatus = contract.status as ContractStatus;
    return TRANSITION_RULES.get(currentStatus) ?? [];
  }
}
