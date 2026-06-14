import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { JURISDICTION_SYSTEM_PROMPT, buildJurisdictionPrompt } from './jurisdiction.prompts';

export interface ArbitrationDetails {
  hasArbitration: boolean;
  institution: string;
  seat: string;
  rules: string;
  language: string;
}

export interface DisputeResolution {
  mechanism: 'LITIGATION' | 'ARBITRATION' | 'MEDIATION' | 'HYBRID';
  escalationSteps: string[];
}

export interface EnforcementRisk {
  risk: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface JurisdictionAnalysisResult {
  governingLaw: string;
  jurisdiction: string;
  arbitration: ArbitrationDetails;
  disputeResolution: DisputeResolution;
  enforcementRisks: EnforcementRisk[];
  jurisdictionConflicts: boolean;
  keyLegalConsiderations: string[];
  conflictOfLawsClauses: string[];
}

@Injectable()
export class JurisdictionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async analyzeJurisdiction(contractId: string): Promise<{ jobId: string; result: JurisdictionAnalysisResult }> {
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
      'CLAUSE_EXTRACTION',
      'PROCESSING',
    );

    const start = Date.now();

    try {
      const provider = this.aiService.getDefaultProvider();
      const result = await provider.generateJson<JurisdictionAnalysisResult>(
        buildJurisdictionPrompt(contractText),
        { systemPrompt: JURISDICTION_SYSTEM_PROMPT, temperature: 0.0 },
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

  async getJurisdictionSummary(contractId: string): Promise<{ jobId: string; result: JurisdictionAnalysisResult } | null> {
    const job = await this.prisma.aIAnalysisJob.findFirst({
      where: {
        contractId,
        analysisType: 'CLAUSE_EXTRACTION',
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
    });

    if (!job || !job.result) return null;

    return {
      jobId: job.id,
      result: job.result as unknown as JurisdictionAnalysisResult,
    };
  }

  async getJurisdictionDashboard(): Promise<{
    byGoverningLaw: Array<{ law: string; count: number }>;
    byDisputeResolution: Array<{ mechanism: string; count: number }>;
    hasArbitrationCount: number;
    totalAnalyzed: number;
  }> {
    const jobs = await this.prisma.aIAnalysisJob.findMany({
      where: {
        analysisType: 'CLAUSE_EXTRACTION',
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
      .map((job) => job.result as unknown as JurisdictionAnalysisResult)
      .filter(Boolean);

    const lawCounts = new Map<string, number>();
    const mechanismCounts = new Map<string, number>();
    let hasArbitrationCount = 0;

    for (const r of results) {
      if (r.governingLaw) {
        lawCounts.set(r.governingLaw, (lawCounts.get(r.governingLaw) ?? 0) + 1);
      }

      if (r.disputeResolution?.mechanism) {
        mechanismCounts.set(
          r.disputeResolution.mechanism,
          (mechanismCounts.get(r.disputeResolution.mechanism) ?? 0) + 1,
        );
      }

      if (r.arbitration?.hasArbitration) {
        hasArbitrationCount += 1;
      }
    }

    const byGoverningLaw = Array.from(lawCounts.entries())
      .map(([law, count]) => ({ law, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const byDisputeResolution = Array.from(mechanismCounts.entries())
      .map(([mechanism, count]) => ({ mechanism, count }))
      .sort((a, b) => b.count - a.count);

    return {
      byGoverningLaw,
      byDisputeResolution,
      hasArbitrationCount,
      totalAnalyzed: results.length,
    };
  }
}
