import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SlaStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateMetricDto {
  metricName: string;
  targetValue: number;
  unit: string;
  measurementPeriod: string;
  penaltyPerBreach?: number;
}

interface RecordPerformanceDto {
  actualValue: number;
  recordedAt?: string;
  notes?: string;
}

@Injectable()
export class SlaService {
  constructor(private readonly prisma: PrismaService) {}

  private determineStatus(actualValue: number, targetValue: number): SlaStatus {
    if (actualValue >= targetValue) return 'MET';
    if (actualValue < targetValue * 0.9) return 'BREACHED';
    return 'AT_RISK';
  }

  async createMetric(obligationId: string, dto: CreateMetricDto) {
    const obligation = await this.prisma.obligation.findUnique({
      where: { id: obligationId },
    });
    if (!obligation) {
      throw new NotFoundException(`Obligation ${obligationId} not found`);
    }

    return this.prisma.slaMetric.create({
      data: {
        obligationId,
        metricName: dto.metricName,
        targetValue: dto.targetValue,
        unit: dto.unit,
        measurementPeriod: dto.measurementPeriod,
        penaltyPerBreach:
          dto.penaltyPerBreach != null
            ? new Prisma.Decimal(dto.penaltyPerBreach)
            : undefined,
      },
    });
  }

  async recordPerformance(slaMetricId: string, dto: RecordPerformanceDto) {
    const metric = await this.prisma.slaMetric.findUnique({
      where: { id: slaMetricId },
    });
    if (!metric) {
      throw new NotFoundException(`SLA Metric ${slaMetricId} not found`);
    }

    const status = this.determineStatus(dto.actualValue, metric.targetValue);

    return this.prisma.slaRecord.create({
      data: {
        slaMetricId,
        actualValue: dto.actualValue,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        status,
        notes: dto.notes,
      },
    });
  }

  async getMetrics(obligationId: string) {
    const obligation = await this.prisma.obligation.findUnique({
      where: { id: obligationId },
    });
    if (!obligation) {
      throw new NotFoundException(`Obligation ${obligationId} not found`);
    }

    const metrics = await this.prisma.slaMetric.findMany({
      where: { obligationId },
      include: {
        slaRecords: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return metrics.map((m) => ({
      ...m,
      latestRecord: m.slaRecords[0] ?? null,
      slaRecords: undefined,
    }));
  }

  async getSlaReport(contractId: string) {
    const obligations = await this.prisma.obligation.findMany({
      where: { contractId },
      include: {
        slaMetrics: {
          include: {
            slaRecords: {
              orderBy: { recordedAt: 'desc' },
            },
          },
        },
      },
    });

    const metricsWithStats = obligations.flatMap((o) =>
      o.slaMetrics.map((m) => {
        const total = m.slaRecords.length;
        const breached = m.slaRecords.filter((r) => r.status === 'BREACHED').length;
        const atRisk = m.slaRecords.filter((r) => r.status === 'AT_RISK').length;
        const breachRate = total > 0 ? (breached / total) * 100 : 0;
        const penaltyExposure =
          m.penaltyPerBreach != null
            ? Number(m.penaltyPerBreach) * breached
            : 0;
        const latestRecord = m.slaRecords[0] ?? null;

        return {
          id: m.id,
          metricName: m.metricName,
          targetValue: m.targetValue,
          unit: m.unit,
          measurementPeriod: m.measurementPeriod,
          penaltyPerBreach: m.penaltyPerBreach ? Number(m.penaltyPerBreach) : null,
          obligationId: m.obligationId,
          obligationTitle: o.title,
          totalRecords: total,
          breachedCount: breached,
          atRiskCount: atRisk,
          breachRate: Math.round(breachRate * 100) / 100,
          penaltyExposure,
          latestRecord,
          latestStatus: latestRecord?.status ?? 'PENDING',
        };
      }),
    );

    const totalPenaltyExposure = metricsWithStats.reduce(
      (sum, m) => sum + m.penaltyExposure,
      0,
    );

    return {
      contractId,
      metrics: metricsWithStats,
      summary: {
        totalMetrics: metricsWithStats.length,
        totalObligations: obligations.length,
        totalPenaltyExposure,
        overallBreachRate:
          metricsWithStats.length > 0
            ? Math.round(
                (metricsWithStats.reduce((s, m) => s + m.breachRate, 0) /
                  metricsWithStats.length) *
                  100,
              ) / 100
            : 0,
      },
    };
  }

  async getDashboard() {
    const metrics = await this.prisma.slaMetric.findMany({
      include: {
        slaRecords: true,
      },
    });

    let totalBreached = 0;
    let totalRecords = 0;
    let totalPenaltyExposure = 0;

    const breachByMetric: Record<string, { metricName: string; breachCount: number }> = {};

    for (const m of metrics) {
      const breached = m.slaRecords.filter((r) => r.status === 'BREACHED').length;
      totalBreached += breached;
      totalRecords += m.slaRecords.length;

      if (m.penaltyPerBreach != null) {
        totalPenaltyExposure += Number(m.penaltyPerBreach) * breached;
      }

      breachByMetric[m.id] = {
        metricName: m.metricName,
        breachCount: breached,
      };
    }

    const topBreachedMetrics = Object.values(breachByMetric)
      .sort((a, b) => b.breachCount - a.breachCount)
      .slice(0, 5);

    return {
      totalMetrics: metrics.length,
      overallBreachRate:
        totalRecords > 0
          ? Math.round((totalBreached / totalRecords) * 10000) / 100
          : 0,
      topBreachedMetrics,
      totalPenaltyExposure,
    };
  }
}
