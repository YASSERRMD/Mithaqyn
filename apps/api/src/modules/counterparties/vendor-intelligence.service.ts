import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VendorIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getVendorProfile(counterpartyId: string) {
    const counterparty = await this.prisma.counterparty.findUnique({
      where: { id: counterpartyId },
    });
    if (!counterparty) {
      throw new NotFoundException(`Counterparty ${counterpartyId} not found`);
    }

    const contracts = await this.prisma.contract.findMany({
      where: { counterpartyId },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        value: true,
        riskLevel: true,
        expiryDate: true,
        obligations: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    let totalValue = 0;
    let activeContracts = 0;
    let highRiskContracts = 0;
    let expiringIn90Days = 0;
    let completedObligations = 0;
    let overdueObligations = 0;

    const contractList = contracts.map((c) => {
      const val = c.value ? Number(c.value) : 0;
      totalValue += val;

      if (c.status === 'ACTIVE') activeContracts++;
      if (c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL') highRiskContracts++;
      if (c.expiryDate && c.expiryDate > now && c.expiryDate <= in90Days) {
        expiringIn90Days++;
      }

      for (const ob of c.obligations) {
        if (ob.status === 'COMPLETED') completedObligations++;
        if (ob.status === 'OVERDUE') overdueObligations++;
      }

      return {
        id: c.id,
        title: c.title,
        type: c.type,
        status: c.status,
        value: val,
        riskLevel: c.riskLevel ?? null,
        expiryDate: c.expiryDate ?? null,
      };
    });

    const totalObligations = completedObligations + overdueObligations;
    const obligationCompletionRate =
      totalObligations > 0
        ? Math.round((completedObligations / totalObligations) * 100)
        : 100;

    return {
      counterparty,
      contracts: contractList,
      exposure: {
        totalValue,
        activeContracts,
        highRiskContracts,
        expiringIn90Days,
        overdueObligations,
      },
      performance: {
        completedObligations,
        overdueObligations,
        obligationCompletionRate,
      },
    };
  }

  async getExposureReport() {
    const counterparties = await this.prisma.counterparty.findMany({
      include: {
        contracts: {
          select: {
            id: true,
            status: true,
            value: true,
            riskLevel: true,
            expiryDate: true,
          },
        },
      },
    });

    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const report = counterparties.map((cp) => {
      let totalValue = 0;
      let activeContracts = 0;
      let highRiskContracts = 0;
      let expiringIn90Days = 0;

      for (const c of cp.contracts) {
        const val = c.value ? Number(c.value) : 0;
        totalValue += val;
        if (c.status === 'ACTIVE') activeContracts++;
        if (c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL') highRiskContracts++;
        if (c.expiryDate && c.expiryDate > now && c.expiryDate <= in90Days) {
          expiringIn90Days++;
        }
      }

      return {
        id: cp.id,
        name: cp.name,
        type: cp.type,
        country: cp.country,
        industry: cp.industry,
        riskRating: cp.riskRating,
        totalContracts: cp.contracts.length,
        activeContracts,
        highRiskContracts,
        expiringIn90Days,
        totalValue,
      };
    });

    return report.sort((a, b) => b.totalValue - a.totalValue);
  }

  async updateRiskRating(counterpartyId: string, riskRating: string) {
    const exists = await this.prisma.counterparty.findUnique({
      where: { id: counterpartyId },
    });
    if (!exists) {
      throw new NotFoundException(`Counterparty ${counterpartyId} not found`);
    }

    return this.prisma.counterparty.update({
      where: { id: counterpartyId },
      data: { riskRating },
    });
  }

  async getConcentrationRisk() {
    const counterparties = await this.prisma.counterparty.findMany({
      include: {
        contracts: {
          select: { id: true, value: true },
        },
      },
    });

    const vendors = counterparties.map((cp) => {
      const contractCount = cp.contracts.length;
      const totalValue = cp.contracts.reduce(
        (sum, c) => sum + (c.value ? Number(c.value) : 0),
        0,
      );
      return { name: cp.name, contractCount, totalValue };
    });

    const grandTotal = vendors.reduce((sum, v) => sum + v.totalValue, 0);

    const topVendors = vendors
      .filter((v) => v.totalValue > 0 || v.contractCount > 0)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10)
      .map((v) => ({
        name: v.name,
        contractCount: v.contractCount,
        totalValue: v.totalValue,
        percentage:
          grandTotal > 0
            ? Math.round((v.totalValue / grandTotal) * 10000) / 100
            : 0,
      }));

    // Herfindahl–Hirschman Index (0–1): sum of squared market shares
    const herfindahlIndex =
      grandTotal > 0
        ? vendors.reduce((sum, v) => {
            const share = v.totalValue / grandTotal;
            return sum + share * share;
          }, 0)
        : 0;

    return {
      topVendors,
      herfindahlIndex: Math.round(herfindahlIndex * 10000) / 10000,
    };
  }
}
