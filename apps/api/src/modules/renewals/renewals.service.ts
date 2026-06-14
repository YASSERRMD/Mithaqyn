import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { IRenewalPrediction } from '@mithaqyn/shared';

const RENEWAL_PROMPT_SYSTEM = `You are a contract renewal expert. Extract renewal-related information and assess renewal risk.
Return ONLY valid JSON. Do not hallucinate dates — only extract explicitly stated dates.`;

const buildRenewalPrompt = (contractText: string, metadata: Record<string, unknown>) => `
Analyze this contract for renewal information.

CONTRACT METADATA:
${JSON.stringify(metadata, null, 2)}

CONTRACT TEXT (first 8000 chars):
---
${contractText.slice(0, 8000)}
---

Extract:
1. Expiry date (if explicitly stated)
2. Renewal date or window
3. Whether auto-renewal is present
4. Notice period required to cancel
5. Overall renewal risk score (0-100, higher = more at risk)

Return:
{
  "expiryDate": "2025-12-31",
  "renewalDate": "2025-11-01",
  "autoRenewal": true,
  "noticePeriodDays": 60,
  "renewalRiskScore": 72,
  "confidence": 0.87,
  "renewalTerms": "Automatically renews for 12 months unless cancelled with 60 days notice",
  "aiNote": "AI-assisted renewal analysis. Verify dates with original contract."
}

Use null for any field not explicitly found in the contract.
`;

@Injectable()
export class RenewalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async predictRenewal(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { documents: { select: { extractedText: true }, take: 1 } },
    });

    if (!contract) throw new NotFoundException(`Contract ${contractId} not found`);

    const text = contract.documents[0]?.extractedText || contract.description || '';

    const metadata = {
      title: contract.title,
      type: contract.type,
      effectiveDate: contract.effectiveDate,
      expiryDate: contract.expiryDate,
      autoRenewal: contract.autoRenewal,
      noticePeriodDays: contract.noticePeriodDays,
    };

    const job = await this.aiService.logAnalysisJob(contractId, 'RENEWAL_PREDICTION', 'PROCESSING');

    try {
      const provider = this.aiService.getDefaultProvider();
      const result = await provider.generateJson<IRenewalPrediction & { renewalTerms?: string; aiNote?: string }>(
        buildRenewalPrompt(text, metadata as Record<string, unknown>),
        { systemPrompt: RENEWAL_PROMPT_SYSTEM, temperature: 0.0 },
      );

      const renewalEvent = await this.prisma.renewalEvent.create({
        data: {
          contractId,
          expiryDate: result.expiryDate ? new Date(result.expiryDate) : contract.expiryDate ?? undefined,
          renewalDate: result.renewalDate ? new Date(result.renewalDate) : contract.renewalDate ?? undefined,
          autoRenewal: result.autoRenewal ?? contract.autoRenewal,
          noticePeriodDays: result.noticePeriodDays ?? contract.noticePeriodDays ?? undefined,
          renewalRiskScore: result.renewalRiskScore,
        },
      });

      if (result.expiryDate || result.autoRenewal !== undefined) {
        await this.prisma.contract.update({
          where: { id: contractId },
          data: {
            ...(result.expiryDate && { expiryDate: new Date(result.expiryDate) }),
            ...(result.renewalDate && { renewalDate: new Date(result.renewalDate) }),
            ...(result.autoRenewal !== undefined && { autoRenewal: result.autoRenewal }),
            ...(result.noticePeriodDays && { noticePeriodDays: result.noticePeriodDays }),
          },
        });
      }

      await this.prisma.aIAnalysisJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', result: result as Record<string, unknown> },
      });

      return { renewalEvent, prediction: result };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.prisma.aIAnalysisJob.update({ where: { id: job.id }, data: { status: 'FAILED', error: msg } });
      throw error;
    }
  }

  async getUpcomingRenewals(windowDays = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + windowDays);

    return this.prisma.contract.findMany({
      where: {
        status: { in: ['ACTIVE', 'UNDER_REVIEW'] },
        OR: [
          { expiryDate: { lte: cutoff, gte: new Date() } },
          { renewalDate: { lte: cutoff, gte: new Date() } },
        ],
      },
      include: { counterparty: { select: { name: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async findByContract(contractId: string) {
    return this.prisma.renewalEvent.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDashboardStats() {
    const now = new Date();
    const in30 = new Date(); in30.setDate(now.getDate() + 30);
    const in60 = new Date(); in60.setDate(now.getDate() + 60);
    const in90 = new Date(); in90.setDate(now.getDate() + 90);

    const [next30, next60, next90, autoRenewing, expired] = await Promise.all([
      this.prisma.contract.count({ where: { expiryDate: { gte: now, lte: in30 }, status: 'ACTIVE' } }),
      this.prisma.contract.count({ where: { expiryDate: { gte: now, lte: in60 }, status: 'ACTIVE' } }),
      this.prisma.contract.count({ where: { expiryDate: { gte: now, lte: in90 }, status: 'ACTIVE' } }),
      this.prisma.contract.count({ where: { autoRenewal: true, status: 'ACTIVE' } }),
      this.prisma.contract.count({ where: { status: 'EXPIRED' } }),
    ]);

    return { expiringIn30Days: next30, expiringIn60Days: next60, expiringIn90Days: next90, autoRenewing, expired };
  }
}
