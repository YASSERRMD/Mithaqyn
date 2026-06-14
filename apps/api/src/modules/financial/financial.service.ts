import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { FINANCIAL_SYSTEM_PROMPT, buildFinancialPrompt } from './financial.prompts';

export interface PaymentScheduleItem {
  milestone: string;
  amount: number | null;
  dueDate: string | null;
  description: string;
}

export interface PenaltyClause {
  type: string;
  amount: number | null;
  percentage: number | null;
  triggerCondition: string;
}

export interface LatePaymentTerms {
  interestRate: number | null;
  gracePeriodDays: number | null;
  description: string | null;
}

export interface PriceEscalationClause {
  hasEscalation: boolean;
  escalationRate: number | null;
  indexLinked: boolean;
  description: string | null;
}

export interface FinancialAnalysisResult {
  paymentSchedule: PaymentScheduleItem[];
  penaltyClauses: PenaltyClause[];
  latePaymentTerms: LatePaymentTerms;
  priceEscalationClause: PriceEscalationClause;
  totalContractValue: number | null;
  currency: string | null;
  paymentTermsDays: number | null;
  invoicingFrequency: string | null;
}

@Injectable()
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async analyzeFinancialTerms(contractId: string): Promise<{ jobId: string; result: FinancialAnalysisResult }> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        documents: { select: { extractedText: true }, take: 1 },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    const contractText = contract.documents[0]?.extractedText || contract.description || '';

    const job = await this.aiService.logAnalysisJob(
      contractId,
      'SUMMARIZATION',
      'PROCESSING',
    );

    const start = Date.now();

    try {
      const provider = this.aiService.getDefaultProvider();
      const result = await provider.generateJson<FinancialAnalysisResult>(
        buildFinancialPrompt(contractText),
        { systemPrompt: FINANCIAL_SYSTEM_PROMPT, temperature: 0.0 },
      );

      const durationMs = Date.now() - start;

      await this.prisma.aIAnalysisJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          result: result as unknown as Record<string, unknown>,
          durationMs,
          completedAt: new Date(),
        },
      });

      return { jobId: job.id, result };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await this.prisma.aIAnalysisJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: errMsg,
          completedAt: new Date(),
        },
      });
      throw err;
    }
  }

  async getFinancialSummary(contractId: string): Promise<{ jobId: string; result: FinancialAnalysisResult } | null> {
    const job = await this.prisma.aIAnalysisJob.findFirst({
      where: {
        contractId,
        analysisType: 'SUMMARIZATION',
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
    });

    if (!job || !job.result) return null;

    return {
      jobId: job.id,
      result: job.result as unknown as FinancialAnalysisResult,
    };
  }

  async getFinancialDashboard(): Promise<{
    totalPortfolioValue: number;
    avgContractValue: number;
    contractsWithPenalties: number;
    contractsWithEscalation: number;
  }> {
    const jobs = await this.prisma.aIAnalysisJob.findMany({
      where: {
        analysisType: 'SUMMARIZATION',
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
    });

    // Deduplicate: keep only the latest job per contractId
    const latestByContract = new Map<string, typeof jobs[0]>();
    for (const job of jobs) {
      if (!latestByContract.has(job.contractId)) {
        latestByContract.set(job.contractId, job);
      }
    }

    const results = Array.from(latestByContract.values())
      .map((job) => job.result as unknown as FinancialAnalysisResult)
      .filter(Boolean);

    let totalPortfolioValue = 0;
    let contractsWithPenalties = 0;
    let contractsWithEscalation = 0;
    let valueCount = 0;

    for (const r of results) {
      if (r.totalContractValue != null) {
        totalPortfolioValue += r.totalContractValue;
        valueCount += 1;
      }
      if (r.penaltyClauses && r.penaltyClauses.length > 0) {
        contractsWithPenalties += 1;
      }
      if (r.priceEscalationClause?.hasEscalation) {
        contractsWithEscalation += 1;
      }
    }

    const avgContractValue = valueCount > 0 ? totalPortfolioValue / valueCount : 0;

    return {
      totalPortfolioValue,
      avgContractValue,
      contractsWithPenalties,
      contractsWithEscalation,
    };
  }
}
