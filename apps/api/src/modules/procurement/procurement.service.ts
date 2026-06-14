import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpsertProcurementRefDto {
  purchaseOrderNumber?: string;
  tenderReference?: string;
  procurementCategory?: string;
  budgetCode?: string;
  budgetAmount?: number;
  currency?: string;
  vendorOnboardingRef?: string;
  procurementNotes?: string;
}

@Injectable()
export class ProcurementService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertRef(contractId: string, dto: UpsertProcurementRefDto) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    return this.prisma.procurementRef.upsert({
      where: { contractId },
      create: {
        contractId,
        purchaseOrderNumber: dto.purchaseOrderNumber ?? null,
        tenderReference: dto.tenderReference ?? null,
        procurementCategory: dto.procurementCategory ?? null,
        budgetCode: dto.budgetCode ?? null,
        budgetAmount: dto.budgetAmount != null ? dto.budgetAmount : null,
        currency: dto.currency ?? 'USD',
        vendorOnboardingRef: dto.vendorOnboardingRef ?? null,
        procurementNotes: dto.procurementNotes ?? null,
      },
      update: {
        purchaseOrderNumber: dto.purchaseOrderNumber ?? null,
        tenderReference: dto.tenderReference ?? null,
        procurementCategory: dto.procurementCategory ?? null,
        budgetCode: dto.budgetCode ?? null,
        budgetAmount: dto.budgetAmount != null ? dto.budgetAmount : null,
        currency: dto.currency ?? 'USD',
        vendorOnboardingRef: dto.vendorOnboardingRef ?? null,
        procurementNotes: dto.procurementNotes ?? null,
      },
    });
  }

  async getRef(contractId: string) {
    const ref = await this.prisma.procurementRef.findUnique({
      where: { contractId },
      include: {
        contract: {
          select: { id: true, title: true, status: true, type: true },
        },
      },
    });
    return ref ?? null;
  }

  async getProcurementAnalytics() {
    const refs = await this.prisma.procurementRef.findMany();

    const byCategory: Record<string, { count: number; totalBudget: number }> = {};

    let totalBudget = 0;

    for (const ref of refs) {
      const cat = ref.procurementCategory ?? 'OTHER';
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, totalBudget: 0 };
      }
      byCategory[cat].count += 1;
      const amt = ref.budgetAmount != null ? Number(ref.budgetAmount) : 0;
      byCategory[cat].totalBudget += amt;
      totalBudget += amt;
    }

    const byCategoryArr = Object.entries(byCategory).map(([category, data]) => ({
      category,
      count: data.count,
      totalBudget: data.totalBudget,
    }));

    const totalContracts = refs.length;
    const avgBudget = totalContracts > 0 ? totalBudget / totalContracts : 0;

    return {
      byCategory: byCategoryArr,
      totalBudget,
      totalContracts,
      avgBudget,
    };
  }

  async searchByPO(poNumber: string) {
    const ref = await this.prisma.procurementRef.findFirst({
      where: {
        purchaseOrderNumber: {
          contains: poNumber,
          mode: 'insensitive',
        },
      },
      include: {
        contract: {
          select: {
            id: true,
            title: true,
            contractNumber: true,
            type: true,
            status: true,
            counterparty: { select: { id: true, name: true } },
          },
        },
      },
    });
    return ref ?? null;
  }
}
