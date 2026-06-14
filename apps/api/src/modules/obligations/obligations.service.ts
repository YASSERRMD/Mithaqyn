import { Injectable, NotFoundException } from '@nestjs/common';
import { ObligationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import {
  OBLIGATION_EXTRACTION_SYSTEM_PROMPT,
  buildObligationExtractionPrompt,
} from './obligations.prompts';

interface ExtractedObligation {
  title: string;
  description: string;
  owner?: string;
  dueDate?: string | null;
  priority: string;
  confidence: number;
}

interface ExtractionResult {
  obligations: ExtractedObligation[];
  totalFound: number;
  aiNote: string;
}

const VALID_STATUSES = new Set<ObligationStatus>([
  'OPEN', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'WAIVED', 'CANCELLED',
]);

@Injectable()
export class ObligationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async extractObligations(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { documents: { select: { extractedText: true }, take: 1 } },
    });

    if (!contract) throw new NotFoundException(`Contract ${contractId} not found`);

    const text = contract.documents[0]?.extractedText || contract.description || '';
    if (!text) return { message: 'No text available for obligation extraction.', obligations: [] };

    const job = await this.aiService.logAnalysisJob(contractId, 'OBLIGATION_EXTRACTION', 'PROCESSING');

    try {
      const provider = this.aiService.getDefaultProvider();
      const result = await provider.generateJson<ExtractionResult>(
        buildObligationExtractionPrompt(text),
        { systemPrompt: OBLIGATION_EXTRACTION_SYSTEM_PROMPT, temperature: 0.0 },
      );

      const saved = await Promise.all(
        (result.obligations || []).map((o) =>
          this.prisma.obligation.create({
            data: {
              contractId,
              title: o.title,
              description: o.description,
              owner: o.owner || undefined,
              dueDate: o.dueDate ? new Date(o.dueDate) : undefined,
              status: 'OPEN',
              priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(o.priority)
                ? o.priority
                : 'MEDIUM',
            },
          }),
        ),
      );

      await this.prisma.aIAnalysisJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', result: result as Record<string, unknown> },
      });

      return { obligations: saved, aiNote: result.aiNote };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.prisma.aIAnalysisJob.update({ where: { id: job.id }, data: { status: 'FAILED', error: msg } });
      throw error;
    }
  }

  async findAll(filters?: { status?: string; contractId?: string }) {
    return this.prisma.obligation.findMany({
      where: {
        ...(filters?.contractId && { contractId: filters.contractId }),
        ...(filters?.status && { status: filters.status as ObligationStatus }),
      },
      include: { contract: { select: { id: true, title: true } } },
      orderBy: [{ isEscalated: 'desc' }, { dueDate: 'asc' }, { priority: 'desc' }],
    });
  }

  async findByContract(contractId: string) {
    return this.prisma.obligation.findMany({
      where: { contractId },
      orderBy: [{ isEscalated: 'desc' }, { dueDate: 'asc' }],
    });
  }

  async update(id: string, data: Partial<{ status: string; owner: string; dueDate: string; isEscalated: boolean; priority: string }>) {
    const obligation = await this.prisma.obligation.findUnique({ where: { id } });
    if (!obligation) throw new NotFoundException(`Obligation ${id} not found`);

    return this.prisma.obligation.update({
      where: { id },
      data: {
        ...(data.status && VALID_STATUSES.has(data.status as ObligationStatus) && { status: data.status as ObligationStatus }),
        ...(data.owner !== undefined && { owner: data.owner }),
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
        ...(data.isEscalated !== undefined && { isEscalated: data.isEscalated }),
        ...(data.priority && { priority: data.priority }),
      },
    });
  }

  async getOverdue() {
    const now = new Date();
    return this.prisma.obligation.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ['COMPLETED', 'WAIVED', 'CANCELLED'] },
      },
      include: { contract: { select: { id: true, title: true } } },
      orderBy: { dueDate: 'asc' },
    });
  }
}
