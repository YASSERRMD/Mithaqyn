import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ContractReportFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  counterpartyId?: string;
}

export interface ObligationReportFilters {
  status?: string;
  contractId?: string;
}

export interface RiskReportFilters {
  severity?: string;
  contractId?: string;
}

export interface AuditReportFilters {
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Contract Report ──────────────────────────────────────────────────────

  async getContractReport(filters: ContractReportFilters = {}) {
    const { status, startDate, endDate, counterpartyId } = filters;

    const contracts = await this.prisma.contract.findMany({
      where: {
        ...(status && { status: status as never }),
        ...(counterpartyId && { counterpartyId }),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
              },
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        contractNumber: true,
        type: true,
        status: true,
        value: true,
        currency: true,
        effectiveDate: true,
        expiryDate: true,
        riskLevel: true,
        riskScore: true,
        createdAt: true,
        counterparty: { select: { id: true, name: true, country: true } },
        _count: { select: { clauses: true, riskFindings: true, obligations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return contracts.map((c) => ({
      id: c.id,
      title: c.title,
      contractNumber: c.contractNumber,
      type: c.type,
      status: c.status,
      counterpartyName: c.counterparty.name,
      counterpartyCountry: c.counterparty.country,
      value: c.value ? Number(c.value) : null,
      currency: c.currency,
      effectiveDate: c.effectiveDate?.toISOString() ?? null,
      expiryDate: c.expiryDate?.toISOString() ?? null,
      riskLevel: c.riskLevel,
      riskScore: c.riskScore,
      clauseCount: c._count.clauses,
      riskCount: c._count.riskFindings,
      obligationCount: c._count.obligations,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  // ─── Obligation Report ────────────────────────────────────────────────────

  async getObligationReport(filters: ObligationReportFilters = {}) {
    const { status, contractId } = filters;

    const obligations = await this.prisma.obligation.findMany({
      where: {
        ...(status && { status: status as never }),
        ...(contractId && { contractId }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        owner: true,
        dueDate: true,
        status: true,
        priority: true,
        isEscalated: true,
        createdAt: true,
        contract: {
          select: {
            id: true,
            title: true,
            counterparty: { select: { name: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return obligations.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      owner: o.owner,
      dueDate: o.dueDate?.toISOString() ?? null,
      status: o.status,
      priority: o.priority,
      isEscalated: o.isEscalated,
      contractId: o.contract.id,
      contractTitle: o.contract.title,
      counterpartyName: o.contract.counterparty.name,
      createdAt: o.createdAt.toISOString(),
    }));
  }

  // ─── Risk Report ──────────────────────────────────────────────────────────

  async getRiskReport(filters: RiskReportFilters = {}) {
    const { severity, contractId } = filters;

    const risks = await this.prisma.riskFinding.findMany({
      where: {
        ...(severity && { severity: severity as never }),
        ...(contractId && { contractId }),
      },
      select: {
        id: true,
        category: true,
        severity: true,
        title: true,
        explanation: true,
        recommendation: true,
        confidence: true,
        status: true,
        createdAt: true,
        contract: {
          select: {
            id: true,
            title: true,
            counterparty: { select: { name: true } },
          },
        },
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });

    return risks.map((r) => ({
      id: r.id,
      contractId: r.contract.id,
      contractTitle: r.contract.title,
      counterpartyName: r.contract.counterparty.name,
      category: r.category,
      severity: r.severity,
      title: r.title,
      explanation: r.explanation,
      recommendation: r.recommendation,
      confidence: r.confidence,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // ─── Financial Report ─────────────────────────────────────────────────────

  async getFinancialReport() {
    const contracts = await this.prisma.contract.findMany({
      where: { value: { not: null } },
      select: {
        id: true,
        title: true,
        contractNumber: true,
        status: true,
        value: true,
        currency: true,
        effectiveDate: true,
        expiryDate: true,
        counterparty: { select: { name: true } },
        clauses: {
          where: { type: 'PENALTIES' },
          select: { id: true },
        },
        analysisJobs: {
          where: { analysisType: 'SUMMARIZATION', status: 'COMPLETED' },
          select: { result: true, completedAt: true },
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { value: 'desc' },
    });

    return contracts.map((c) => ({
      id: c.id,
      title: c.title,
      contractNumber: c.contractNumber,
      counterpartyName: c.counterparty.name,
      status: c.status,
      totalContractValue: c.value ? Number(c.value) : 0,
      currency: c.currency ?? 'USD',
      effectiveDate: c.effectiveDate?.toISOString() ?? null,
      expiryDate: c.expiryDate?.toISOString() ?? null,
      penaltyClausesCount: c.clauses.length,
      hasAiSummary: c.analysisJobs.length > 0,
      lastAnalyzedAt: c.analysisJobs[0]?.completedAt?.toISOString() ?? null,
    }));
  }

  // ─── Audit Report ─────────────────────────────────────────────────────────

  async getAuditReport(filters: AuditReportFilters = {}) {
    const { action, userId, startDate, endDate } = filters;

    const logs = await this.prisma.auditLog.findMany({
      where: {
        ...(userId && { userId }),
        ...(action && { action: { contains: action, mode: 'insensitive' as const } }),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
              },
            }
          : {}),
      },
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        ipAddress: true,
        createdAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    return logs.map((l) => ({
      id: l.id,
      userId: l.user?.id ?? null,
      userEmail: l.user?.email ?? null,
      userName: l.user ? `${l.user.firstName} ${l.user.lastName}` : null,
      userRole: l.user?.role ?? null,
      action: l.action,
      entityType: l.entity,
      entityId: l.entityId,
      ipAddress: l.ipAddress,
      timestamp: l.createdAt.toISOString(),
    }));
  }

  // ─── Summary Report ───────────────────────────────────────────────────────

  async generateSummaryReport() {
    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalContracts,
      byStatusRaw,
      totalObligations,
      overdueObligations,
      openRisks,
      criticalRisks,
      upcomingRenewals30Days,
      valueAgg,
    ] = await Promise.all([
      this.prisma.contract.count(),
      this.prisma.contract.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.obligation.count(),
      this.prisma.obligation.count({ where: { status: 'OVERDUE' } }),
      this.prisma.riskFinding.count({ where: { status: 'OPEN' } }),
      this.prisma.riskFinding.count({ where: { severity: 'CRITICAL', status: 'OPEN' } }),
      this.prisma.contract.count({
        where: {
          expiryDate: { gte: now, lte: thirtyDaysOut },
          status: 'ACTIVE',
        },
      }),
      this.prisma.contract.aggregate({
        _avg: { value: true },
        where: { value: { not: null } },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of byStatusRaw) {
      byStatus[row.status] = row._count._all;
    }

    return {
      totalContracts,
      byStatus,
      totalObligations,
      overdueObligations,
      openRisks,
      criticalRisks,
      upcomingRenewals30Days,
      avgContractValue: valueAgg._avg.value ? Number(valueAgg._avg.value) : 0,
    };
  }

  // ─── CSV Export ───────────────────────────────────────────────────────────

  exportToCsv(data: Record<string, unknown>[], _filename: string): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const escape = (val: unknown): string => {
      const str = val === null || val === undefined ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerRow = headers.map(escape).join(',');
    const dataRows = data.map((row) =>
      headers.map((h) => escape(row[h])).join(','),
    );

    return [headerRow, ...dataRows].join('\n');
  }
}
