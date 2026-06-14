import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClauseType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import {
  CLAUSE_EXTRACTION_SYSTEM_PROMPT,
  buildClauseExtractionPrompt,
} from './clauses.prompts';
import { IExtractedClause } from '@mithaqyn/shared';

interface ExtractionResult {
  clauses: IExtractedClause[];
  totalClausesFound: number;
  coverageScore: number;
  missingHighRiskClauses: string[];
  aiNote: string;
}

@Injectable()
export class ClausesService {
  private readonly logger = new Logger(ClausesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly config: ConfigService,
  ) {}

  async extractClauses(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        documents: { select: { extractedText: true }, orderBy: { uploadedAt: 'desc' }, take: 1 },
      },
    });

    if (!contract) throw new NotFoundException(`Contract ${contractId} not found`);

    const contractText = contract.documents[0]?.extractedText || contract.description || '';

    if (!contractText) {
      return { message: 'No document text available for extraction. Upload and process a document first.', clauses: [] };
    }

    const job = await this.aiService.logAnalysisJob(contractId, 'CLAUSE_EXTRACTION', 'PROCESSING');

    try {
      const provider = this.aiService.getDefaultProvider();
      const start = process.hrtime.bigint();

      const result = await provider.generateJson<ExtractionResult>(
        buildClauseExtractionPrompt(contractText),
        { systemPrompt: CLAUSE_EXTRACTION_SYSTEM_PROMPT, temperature: 0.0, maxTokens: 4096 },
      );

      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

      const VALID_CLAUSE_TYPES = new Set<ClauseType>([
        'PAYMENT_TERMS', 'TERMINATION', 'RENEWAL', 'LIABILITY', 'INDEMNITY',
        'CONFIDENTIALITY', 'GOVERNING_LAW', 'JURISDICTION', 'SLA', 'PENALTIES',
        'FORCE_MAJEURE', 'DATA_PROTECTION', 'INTELLECTUAL_PROPERTY', 'ASSIGNMENT',
        'DISPUTE_RESOLUTION', 'AUDIT_RIGHTS', 'INSURANCE', 'COMPLIANCE',
        'SUBCONTRACTING', 'CHANGE_CONTROL',
      ]);

      const savedClauses = await Promise.all(
        (result.clauses || [])
          .filter((c) => VALID_CLAUSE_TYPES.has(c.type as ClauseType))
          .map((c) =>
            this.prisma.clause.create({
              data: {
                contractId,
                type: c.type as ClauseType,
                title: c.title,
                summary: c.summary,
                textExcerpt: c.textExcerpt,
                confidence: Math.min(1.0, Math.max(0.0, c.confidence)),
                riskLevel: (c.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') || 'LOW',
                pageRef: c.pageReference || null,
              },
            }),
          ),
      );

      await this.prisma.aIAnalysisJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          result: result as Record<string, unknown>,
          durationMs: Math.round(durationMs),
        },
      });

      return {
        clauses: savedClauses,
        metadata: {
          coverageScore: result.coverageScore,
          missingHighRiskClauses: result.missingHighRiskClauses,
          aiNote: result.aiNote,
          durationMs: Math.round(durationMs),
        },
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
    return this.prisma.clause.findMany({
      where: { contractId },
      orderBy: [{ riskLevel: 'desc' }, { confidence: 'desc' }],
    });
  }

  async reviewClause(id: string, reviewStatus: string, reviewedById: string) {
    const clause = await this.prisma.clause.findUnique({ where: { id } });
    if (!clause) throw new NotFoundException(`Clause ${id} not found`);

    return this.prisma.clause.update({
      where: { id },
      data: {
        reviewStatus,
        reviewedById,
        reviewedAt: new Date(),
      },
    });
  }
}
