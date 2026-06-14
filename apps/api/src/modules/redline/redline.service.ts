import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import {
  REDLINE_SYSTEM_PROMPT,
  buildRedlinePrompt,
  RedlineContext,
  RedlineResult,
} from './redline.prompts';

@Injectable()
export class RedlineService {
  private readonly logger = new Logger(RedlineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  /**
   * Redline a specific clause by ID. Stores the result in an AIAnalysisJob.
   */
  async redlineClause(
    clauseId: string,
    context?: RedlineContext,
  ): Promise<{ jobId: string; result: RedlineResult }> {
    const clause = await this.prisma.clause.findUnique({
      where: { id: clauseId },
      include: { contract: { select: { id: true, type: true } } },
    });

    if (!clause) {
      throw new NotFoundException(`Clause ${clauseId} not found`);
    }

    const enrichedContext: RedlineContext = {
      contractType: context?.contractType ?? clause.contract.type,
      counterpartyType: context?.counterpartyType,
      partyPosition: context?.partyPosition ?? 'REVIEWING_PARTY',
    };

    const result = await this._callAIRedline(clause.textExcerpt, enrichedContext);

    const job = await this.aiService.logAnalysisJob(
      clause.contractId,
      'CLAUSE_EXTRACTION',
      'COMPLETED',
      {
        clauseId,
        redlineResult: result,
        context: enrichedContext,
      },
    );

    this.logger.log(`Redline job ${job.id} created for clause ${clauseId}`);

    return { jobId: job.id, result };
  }

  /**
   * Redline arbitrary text without needing a clause in the DB.
   */
  async redlineText(
    text: string,
    context?: RedlineContext,
  ): Promise<RedlineResult> {
    return this._callAIRedline(text, context);
  }

  /**
   * Get all redline analysis jobs for a clause, ordered newest first.
   */
  async getRedlineHistory(clauseId: string) {
    const clause = await this.prisma.clause.findUnique({
      where: { id: clauseId },
      select: { id: true, contractId: true },
    });

    if (!clause) {
      throw new NotFoundException(`Clause ${clauseId} not found`);
    }

    const jobs = await this.prisma.aIAnalysisJob.findMany({
      where: {
        contractId: clause.contractId,
        analysisType: 'CLAUSE_EXTRACTION',
        result: {
          path: ['clauseId'],
          equals: clauseId,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return jobs;
  }

  /**
   * Accept a redline: update clause.textExcerpt with the redlinedText from the job.
   */
  async acceptRedline(clauseId: string, jobId: string) {
    const clause = await this.prisma.clause.findUnique({
      where: { id: clauseId },
    });
    if (!clause) {
      throw new NotFoundException(`Clause ${clauseId} not found`);
    }

    const job = await this.prisma.aIAnalysisJob.findUnique({
      where: { id: jobId },
    });
    if (!job) {
      throw new NotFoundException(`Redline job ${jobId} not found`);
    }

    const result = job.result as Record<string, unknown>;
    const redlineResult = result?.redlineResult as RedlineResult | undefined;

    if (!redlineResult?.redlinedText) {
      throw new NotFoundException(`Job ${jobId} does not contain a valid redline result`);
    }

    const updated = await this.prisma.clause.update({
      where: { id: clauseId },
      data: {
        textExcerpt: redlineResult.redlinedText,
        reviewStatus: 'APPROVED',
        reviewedAt: new Date(),
      },
    });

    this.logger.log(`Clause ${clauseId} updated with accepted redline from job ${jobId}`);

    return updated;
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private async _callAIRedline(
    text: string,
    context?: RedlineContext,
  ): Promise<RedlineResult> {
    const provider = this.aiService.getDefaultProvider();
    const start = process.hrtime.bigint();

    const result = await provider.generateJson<RedlineResult>(
      buildRedlinePrompt(text, context),
      { systemPrompt: REDLINE_SYSTEM_PROMPT, temperature: 0.2, maxTokens: 4096 },
    );

    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    this.logger.log(`AI redline completed in ${Math.round(durationMs)}ms`);

    return result;
  }
}
