import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { COMPARISON_SYSTEM_PROMPT, buildComparisonPrompt } from './comparison.prompts';

export interface ClauseDiff {
  clauseType: string;
  title: string;
  changeType: 'MODIFIED' | 'ADDED' | 'REMOVED' | 'UNCHANGED';
  contractA?: string;
  contractB?: string;
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
}

export interface KeyRiskChange {
  area: string;
  direction: string;
  detail: string;
}

export interface ComparisonResult {
  contractAId: string;
  contractBId: string;
  contractATitle: string;
  contractBTitle: string;
  summary: string;
  overallSimilarityScore: number;
  riskChangeDirection: 'INCREASED' | 'DECREASED' | 'UNCHANGED';
  clauseDiffs: ClauseDiff[];
  addedClauses: string[];
  removedClauses: string[];
  keyRiskChanges: KeyRiskChange[];
  recommendation: string;
}

@Injectable()
export class ComparisonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async compareContracts(contractAId: string, contractBId: string): Promise<ComparisonResult> {
    if (contractAId === contractBId) {
      throw new BadRequestException('Cannot compare a contract with itself');
    }

    const [contractA, contractB] = await Promise.all([
      this.prisma.contract.findUnique({
        where: { id: contractAId },
        include: {
          documents: { select: { extractedText: true }, take: 1 },
          clauses: { select: { type: true, summary: true, textExcerpt: true } },
        },
      }),
      this.prisma.contract.findUnique({
        where: { id: contractBId },
        include: {
          documents: { select: { extractedText: true }, take: 1 },
          clauses: { select: { type: true, summary: true, textExcerpt: true } },
        },
      }),
    ]);

    if (!contractA) throw new NotFoundException(`Contract ${contractAId} not found`);
    if (!contractB) throw new NotFoundException(`Contract ${contractBId} not found`);

    const textA = contractA.documents[0]?.extractedText || contractA.description || '';
    const textB = contractB.documents[0]?.extractedText || contractB.description || '';

    if (!textA && !textB) {
      throw new BadRequestException('Both contracts lack extractable text. Upload documents or add descriptions first.');
    }

    const job = await this.aiService.logAnalysisJob(contractAId, 'COMPARISON' as never, 'PROCESSING');

    try {
      const provider = this.aiService.getDefaultProvider();

      const aiResult = await provider.generateJson<Omit<ComparisonResult, 'contractAId' | 'contractBId' | 'contractATitle' | 'contractBTitle'>>(
        buildComparisonPrompt(
          { title: contractA.title, text: textA, type: contractA.type },
          { title: contractB.title, text: textB, type: contractB.type },
        ),
        { systemPrompt: COMPARISON_SYSTEM_PROMPT, temperature: 0.0 },
      );

      await this.prisma.aIAnalysisJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', result: aiResult as Record<string, unknown> },
      });

      return {
        contractAId,
        contractBId,
        contractATitle: contractA.title,
        contractBTitle: contractB.title,
        summary: aiResult.summary || '',
        overallSimilarityScore: aiResult.overallSimilarityScore ?? 0,
        riskChangeDirection: aiResult.riskChangeDirection ?? 'UNCHANGED',
        clauseDiffs: Array.isArray(aiResult.clauseDiffs) ? aiResult.clauseDiffs : [],
        addedClauses: Array.isArray(aiResult.addedClauses) ? aiResult.addedClauses : [],
        removedClauses: Array.isArray(aiResult.removedClauses) ? aiResult.removedClauses : [],
        keyRiskChanges: Array.isArray(aiResult.keyRiskChanges) ? aiResult.keyRiskChanges : [],
        recommendation: aiResult.recommendation || '',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.prisma.aIAnalysisJob.update({ where: { id: job.id }, data: { status: 'FAILED', error: msg } });
      throw error;
    }
  }

  async compareVersions(contractId: string, versionAId: string, versionBId: string): Promise<ComparisonResult> {
    const [contract, vA, vB] = await Promise.all([
      this.prisma.contract.findUnique({ where: { id: contractId }, select: { title: true, type: true } }),
      this.prisma.contractVersion.findUnique({ where: { id: versionAId } }),
      this.prisma.contractVersion.findUnique({ where: { id: versionBId } }),
    ]);

    if (!contract) throw new NotFoundException(`Contract ${contractId} not found`);
    if (!vA) throw new NotFoundException(`Version ${versionAId} not found`);
    if (!vB) throw new NotFoundException(`Version ${versionBId} not found`);

    const provider = this.aiService.getDefaultProvider();

    const aiResult = await provider.generateJson<Omit<ComparisonResult, 'contractAId' | 'contractBId' | 'contractATitle' | 'contractBTitle'>>(
      buildComparisonPrompt(
        { title: `${contract.title} v${vA.versionNumber}`, text: vA.content || '', type: contract.type },
        { title: `${contract.title} v${vB.versionNumber}`, text: vB.content || '', type: contract.type },
      ),
      { systemPrompt: COMPARISON_SYSTEM_PROMPT, temperature: 0.0 },
    );

    return {
      contractAId: `${contractId}@v${vA.versionNumber}`,
      contractBId: `${contractId}@v${vB.versionNumber}`,
      contractATitle: `${contract.title} v${vA.versionNumber}`,
      contractBTitle: `${contract.title} v${vB.versionNumber}`,
      summary: aiResult.summary || '',
      overallSimilarityScore: aiResult.overallSimilarityScore ?? 0,
      riskChangeDirection: aiResult.riskChangeDirection ?? 'UNCHANGED',
      clauseDiffs: Array.isArray(aiResult.clauseDiffs) ? aiResult.clauseDiffs : [],
      addedClauses: Array.isArray(aiResult.addedClauses) ? aiResult.addedClauses : [],
      removedClauses: Array.isArray(aiResult.removedClauses) ? aiResult.removedClauses : [],
      keyRiskChanges: Array.isArray(aiResult.keyRiskChanges) ? aiResult.keyRiskChanges : [],
      recommendation: aiResult.recommendation || '',
    };
  }
}
