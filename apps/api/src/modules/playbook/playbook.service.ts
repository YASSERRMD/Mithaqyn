import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import {
  buildPlaybookCheckPrompt,
  PLAYBOOK_CHECK_SYSTEM_PROMPT,
  PlaybookRuleInput,
} from './playbook.prompts';

export interface CreatePlaybookDto {
  name: string;
  description?: string;
  contractType?: string;
}

export interface CreatePlaybookRuleDto {
  ruleType: string;
  clauseType: string;
  description: string;
  standardText?: string;
  fallbackText?: string;
  priority?: number;
}

export interface PlaybookCheckResult {
  ruleId: string;
  clauseType: string;
  ruleType: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'MISSING' | 'ACCEPTABLE';
  explanation: string;
  recommendation: string;
}

export interface PlaybookCheckResponse {
  contractId: string;
  playbookId: string;
  playbookName: string;
  overallCompliance: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
  summary: string;
  results: PlaybookCheckResult[];
}

@Injectable()
export class PlaybookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async createPlaybook(dto: CreatePlaybookDto, userId: string) {
    return this.prisma.playbook.create({
      data: {
        name: dto.name,
        description: dto.description,
        contractType: dto.contractType,
        createdById: userId,
      },
      include: {
        rules: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async getPlaybooks() {
    const playbooks = await this.prisma.playbook.findMany({
      where: { isActive: true },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { rules: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return playbooks.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      contractType: p.contractType,
      isActive: p.isActive,
      ruleCount: p._count.rules,
      createdBy: p.createdBy,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  async getPlaybook(id: string) {
    const playbook = await this.prisma.playbook.findUnique({
      where: { id },
      include: {
        rules: { orderBy: [{ ruleType: 'asc' }, { priority: 'desc' }] },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!playbook) throw new NotFoundException(`Playbook ${id} not found`);
    return playbook;
  }

  async addRule(playbookId: string, dto: CreatePlaybookRuleDto) {
    const playbook = await this.prisma.playbook.findUnique({ where: { id: playbookId } });
    if (!playbook) throw new NotFoundException(`Playbook ${playbookId} not found`);

    return this.prisma.playbookRule.create({
      data: {
        playbookId,
        ruleType: dto.ruleType,
        clauseType: dto.clauseType,
        description: dto.description,
        standardText: dto.standardText,
        fallbackText: dto.fallbackText,
        priority: dto.priority ?? 0,
      },
    });
  }

  async checkContract(contractId: string, playbookId: string): Promise<PlaybookCheckResponse> {
    const [contract, playbook] = await Promise.all([
      this.prisma.contract.findUnique({
        where: { id: contractId },
        include: {
          documents: { select: { extractedText: true }, take: 1 },
        },
      }),
      this.prisma.playbook.findUnique({
        where: { id: playbookId },
        include: { rules: { orderBy: { priority: 'desc' } } },
      }),
    ]);

    if (!contract) throw new NotFoundException(`Contract ${contractId} not found`);
    if (!playbook) throw new NotFoundException(`Playbook ${playbookId} not found`);

    const contractText =
      contract.documents[0]?.extractedText || contract.description || '';

    if (!contractText) {
      throw new BadRequestException(
        'Contract has no extractable text. Upload a document or add a description first.',
      );
    }

    if (playbook.rules.length === 0) {
      throw new BadRequestException('Playbook has no rules to check against.');
    }

    const rules: PlaybookRuleInput[] = playbook.rules.map((r) => ({
      id: r.id,
      ruleType: r.ruleType,
      clauseType: r.clauseType,
      description: r.description,
      standardText: r.standardText,
      fallbackText: r.fallbackText,
      priority: r.priority,
    }));

    const provider = this.aiService.getDefaultProvider();

    const aiResult = await provider.generateJson<{
      results: PlaybookCheckResult[];
      overallCompliance: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
      summary: string;
    }>(buildPlaybookCheckPrompt(contractText, rules), {
      systemPrompt: PLAYBOOK_CHECK_SYSTEM_PROMPT,
      temperature: 0.0,
    });

    return {
      contractId,
      playbookId,
      playbookName: playbook.name,
      overallCompliance: aiResult.overallCompliance ?? 'PARTIAL',
      summary: aiResult.summary ?? '',
      results: Array.isArray(aiResult.results) ? aiResult.results : [],
    };
  }

  async deletePlaybook(id: string) {
    const playbook = await this.prisma.playbook.findUnique({ where: { id } });
    if (!playbook) throw new NotFoundException(`Playbook ${id} not found`);

    await this.prisma.playbook.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Playbook deactivated successfully' };
  }
}
