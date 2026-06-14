import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { PRIVACY_SYSTEM_PROMPT, buildPrivacyPrompt } from './privacy.prompts';

export interface DataSubjectRights {
  hasRightToAccess: boolean;
  hasRightToErasure: boolean;
  hasRightToPortability: boolean;
}

export interface CrossBorderTransfers {
  hasTransfer: boolean;
  destinations: string[];
  safeguards: string[];
}

export interface RetentionPeriod {
  dataType: string;
  period: string;
  legalBasis: string;
}

export interface ComplianceGap {
  regulation: string;
  gap: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface PrivacyAnalysisResult {
  regulatoryFrameworks: string[];
  dataCategories: string[];
  dataProcessingPurposes: string[];
  dataSubjectRights: DataSubjectRights;
  crossBorderTransfers: CrossBorderTransfers;
  retentionPeriods: RetentionPeriod[];
  dpoRequired: boolean;
  dpiaRequired: boolean;
  complianceGaps: ComplianceGap[];
  overallRiskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';
}

@Injectable()
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async analyzePrivacy(contractId: string): Promise<{ jobId: string; result: PrivacyAnalysisResult }> {
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
      'RISK_SCORING',
      'PROCESSING',
    );

    const start = Date.now();

    try {
      const provider = this.aiService.getDefaultProvider();
      const result = await provider.generateJson<PrivacyAnalysisResult>(
        buildPrivacyPrompt(contractText),
        { systemPrompt: PRIVACY_SYSTEM_PROMPT, temperature: 0.0 },
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

  async getPrivacySummary(contractId: string): Promise<{ jobId: string; result: PrivacyAnalysisResult } | null> {
    const job = await this.prisma.aIAnalysisJob.findFirst({
      where: {
        contractId,
        analysisType: 'RISK_SCORING',
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
    });

    if (!job || !job.result) return null;

    return {
      jobId: job.id,
      result: job.result as unknown as PrivacyAnalysisResult,
    };
  }

  async getComplianceDashboard(): Promise<{
    totalAnalyzed: number;
    byRiskLevel: { HIGH: number; MEDIUM: number; LOW: number; MINIMAL: number };
    topGaps: Array<{ regulation: string; count: number }>;
  }> {
    const jobs = await this.prisma.aIAnalysisJob.findMany({
      where: {
        analysisType: 'RISK_SCORING',
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
      .map((job) => job.result as unknown as PrivacyAnalysisResult)
      .filter(Boolean);

    const byRiskLevel = { HIGH: 0, MEDIUM: 0, LOW: 0, MINIMAL: 0 };
    const gapCounts = new Map<string, number>();

    for (const r of results) {
      const level = r.overallRiskLevel;
      if (level && level in byRiskLevel) {
        byRiskLevel[level as keyof typeof byRiskLevel] += 1;
      }

      if (r.complianceGaps) {
        for (const gap of r.complianceGaps) {
          gapCounts.set(gap.regulation, (gapCounts.get(gap.regulation) ?? 0) + 1);
        }
      }
    }

    const topGaps = Array.from(gapCounts.entries())
      .map(([regulation, count]) => ({ regulation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalAnalyzed: results.length,
      byRiskLevel,
      topGaps,
    };
  }
}
