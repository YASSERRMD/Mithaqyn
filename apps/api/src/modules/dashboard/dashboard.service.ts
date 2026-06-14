import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const in30 = new Date(); in30.setDate(now.getDate() + 30);
    const in90 = new Date(); in90.setDate(now.getDate() + 90);
    const past30 = new Date(); past30.setDate(now.getDate() - 30);

    const [
      totalContracts,
      activeContracts,
      draftContracts,
      underReviewContracts,
      expiredContracts,
      terminatedContracts,
      highRiskContracts,
      criticalRiskContracts,
      expiringIn30,
      expiringIn90,
      overdueObligations,
      pendingObligations,
      recentContracts,
      byType,
      byRiskLevel,
      recentActivity,
      clauseCoverage,
    ] = await Promise.all([
      this.prisma.contract.count(),
      this.prisma.contract.count({ where: { status: 'ACTIVE' } }),
      this.prisma.contract.count({ where: { status: 'DRAFT' } }),
      this.prisma.contract.count({ where: { status: 'UNDER_REVIEW' } }),
      this.prisma.contract.count({ where: { status: 'EXPIRED' } }),
      this.prisma.contract.count({ where: { status: 'TERMINATED' } }),
      this.prisma.contract.count({ where: { riskLevel: 'HIGH', status: { not: 'TERMINATED' } } }),
      this.prisma.contract.count({ where: { riskLevel: 'CRITICAL', status: { not: 'TERMINATED' } } }),
      this.prisma.contract.count({ where: { expiryDate: { gte: now, lte: in30 }, status: 'ACTIVE' } }),
      this.prisma.contract.count({ where: { expiryDate: { gte: now, lte: in90 }, status: 'ACTIVE' } }),
      this.prisma.obligation.count({
        where: { dueDate: { lt: now }, status: { notIn: ['COMPLETED', 'WAIVED', 'CANCELLED'] } },
      }),
      this.prisma.obligation.count({ where: { status: 'PENDING' } }),
      this.prisma.contract.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, type: true, status: true, riskLevel: true,
          createdAt: true, counterparty: { select: { name: true } },
        },
      }),
      this.prisma.contract.groupBy({
        by: ['type'],
        _count: { _all: true },
        orderBy: { _count: { type: 'desc' } },
      }),
      this.prisma.contract.groupBy({
        by: ['riskLevel'],
        _count: { _all: true },
        where: { riskLevel: { not: null } },
      }),
      this.prisma.aIAnalysisJob.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, analysisType: true, status: true, createdAt: true,
          contract: { select: { id: true, title: true } },
        },
      }),
      this.prisma.contract.aggregate({
        _avg: { clauseCoverageScore: true },
        where: { clauseCoverageScore: { not: null }, status: { not: 'TERMINATED' } },
      }),
    ]);

    return {
      kpis: {
        totalContracts,
        activeContracts,
        draftContracts,
        underReviewContracts,
        expiredContracts,
        terminatedContracts,
        highRiskContracts: highRiskContracts + criticalRiskContracts,
        criticalRiskContracts,
        expiringIn30,
        expiringIn90,
        overdueObligations,
        pendingObligations,
        avgClauseCoverage: clauseCoverage._avg.clauseCoverageScore
          ? Math.round(clauseCoverage._avg.clauseCoverageScore * 100) / 100
          : null,
      },
      contractsByType: byType.map((b) => ({
        type: b.type,
        count: b._count._all,
      })),
      contractsByRisk: byRiskLevel.map((b) => ({
        riskLevel: b.riskLevel,
        count: b._count._all,
      })),
      recentContracts,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        type: a.analysisType,
        status: a.status,
        createdAt: a.createdAt,
        contractId: a.contract?.id,
        contractTitle: a.contract?.title,
      })),
    };
  }

  async getContractTrend(months = 6) {
    const results: { month: string; count: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const count = await this.prisma.contract.count({
        where: { createdAt: { gte: start, lt: end } },
      });

      results.push({
        month: start.toLocaleString('default', { month: 'short', year: '2-digit' }),
        count,
      });
    }
    return results;
  }
}
