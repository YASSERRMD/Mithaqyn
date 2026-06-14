import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { RiskLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { RISK_ANALYSIS_SYSTEM_PROMPT, buildRiskScoringPrompt } from './risks.prompts';
import { IExtractedRisk } from '@mithaqyn/shared';

interface RiskAnalysisResult {
  risks: IExtractedRisk[];
  overallRiskScore: number;
  overallRiskLevel: string;
  summary: string;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  aiNote: string;
}

const VALID_RISK_LEVELS = new Set<RiskLevel>(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

@Injectable()
export class RisksService {
  private readonly logger = new Logger(RisksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async analyzeRisks(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        documents: { select: { extractedText: true }, take: 1 },
        clauses: { select: { type: true, summary: true, riskLevel: true }, take: 20 },
      },
    });

    if (!contract) throw new NotFoundException(`Contract ${contractId} not found`);

    const contractText = contract.documents[0]?.extractedText || contract.description || '';
    if (!contractText) {
      return { message: 'No document text available for risk analysis.', risks: [] };
    }

    const clauseSummaries = contract.clauses.length > 0
      ? contract.clauses.map((c) => `${c.type}: ${c.summary} (Risk: ${c.riskLevel})`).join('\n')
      : undefined;

    const job = await this.aiService.logAnalysisJob(contractId, 'RISK_SCORING', 'PROCESSING');

    try {
      const provider = this.aiService.getDefaultProvider();
      const start = process.hrtime.bigint();

      const result = await provider.generateJson<RiskAnalysisResult>(
        buildRiskScoringPrompt(contractText, clauseSummaries),
        { systemPrompt: RISK_ANALYSIS_SYSTEM_PROMPT, temperature: 0.0, maxTokens: 4096 },
      );

      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

      await this.prisma.riskFinding.deleteMany({ where: { contractId } });

      const savedRisks = await Promise.all(
        (result.risks || []).map((r) =>
          this.prisma.riskFinding.create({
            data: {
              contractId,
              category: r.category,
              severity: VALID_RISK_LEVELS.has(r.severity as RiskLevel)
                ? (r.severity as RiskLevel)
                : 'MEDIUM',
              title: r.title,
              explanation: r.explanation,
              recommendation: r.recommendation,
              confidence: Math.min(1.0, Math.max(0.0, r.confidence)),
            },
          }),
        ),
      );

      const riskScore = Math.min(100, Math.max(0, result.overallRiskScore || 0));
      const riskLevelMap: Record<string, RiskLevel> = {
        LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL',
      };

      await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          riskScore,
          riskLevel: riskLevelMap[result.overallRiskLevel] ?? 'MEDIUM',
        },
      });

      await this.prisma.aIAnalysisJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          result: result as Record<string, unknown>,
          durationMs: Math.round(durationMs),
        },
      });

      return {
        risks: savedRisks,
        summary: result.summary,
        overallRiskScore: riskScore,
        overallRiskLevel: result.overallRiskLevel,
        counts: {
          critical: result.criticalCount || 0,
          high: result.highCount || 0,
          medium: result.mediumCount || 0,
          low: result.lowCount || 0,
        },
        aiNote: result.aiNote,
        durationMs: Math.round(durationMs),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.aIAnalysisJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', error: message },
      });
      throw error;
    }
  }

  async findByContract(contractId: string) {
    return this.prisma.riskFinding.findMany({
      where: { contractId },
      orderBy: [{ severity: 'desc' }, { confidence: 'desc' }],
    });
  }

  async updateStatus(id: string, status: string) {
    const risk = await this.prisma.riskFinding.findUnique({ where: { id } });
    if (!risk) throw new NotFoundException(`Risk finding ${id} not found`);
    return this.prisma.riskFinding.update({ where: { id }, data: { status } });
  }
}
