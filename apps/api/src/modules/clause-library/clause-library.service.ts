import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateClauseTemplateDto {
  title: string;
  clauseType: string;
  content: string;
  jurisdiction?: string;
  contractType?: string;
  version?: string;
  tags?: string[];
}

export interface UpdateClauseTemplateDto {
  title?: string;
  clauseType?: string;
  content?: string;
  jurisdiction?: string;
  contractType?: string;
  tags?: string[];
}

export interface GetTemplatesFilters {
  clauseType?: string;
  contractType?: string;
  jurisdiction?: string;
  tags?: string[];
}

@Injectable()
export class ClauseLibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(dto: CreateClauseTemplateDto, userId: string) {
    return this.prisma.clauseTemplate.create({
      data: {
        title: dto.title,
        clauseType: dto.clauseType,
        content: dto.content,
        jurisdiction: dto.jurisdiction,
        contractType: dto.contractType,
        version: dto.version ?? '1.0',
        tags: dto.tags ?? [],
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getTemplates(filters?: GetTemplatesFilters) {
    return this.prisma.clauseTemplate.findMany({
      where: {
        ...(filters?.clauseType ? { clauseType: filters.clauseType } : {}),
        ...(filters?.contractType ? { contractType: filters.contractType } : {}),
        ...(filters?.jurisdiction ? { jurisdiction: filters.jurisdiction } : {}),
        ...(filters?.tags && filters.tags.length > 0
          ? { tags: { hasSome: filters.tags } }
          : {}),
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ isFavorite: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getTemplate(id: string) {
    const template = await this.prisma.clauseTemplate.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!template) throw new NotFoundException(`Clause template ${id} not found`);

    // Increment usage count
    await this.prisma.clauseTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });

    return template;
  }

  async updateTemplate(id: string, dto: UpdateClauseTemplateDto) {
    const existing = await this.prisma.clauseTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Clause template ${id} not found`);

    // Bump patch version: 1.0 → 1.1 → 1.2 etc.
    const currentVersion = existing.version ?? '1.0';
    const [major, minor] = currentVersion.split('.').map(Number);
    const newVersion = `${major}.${(minor ?? 0) + 1}`;

    return this.prisma.clauseTemplate.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.clauseType !== undefined ? { clauseType: dto.clauseType } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.jurisdiction !== undefined ? { jurisdiction: dto.jurisdiction } : {}),
        ...(dto.contractType !== undefined ? { contractType: dto.contractType } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
        version: newVersion,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async toggleFavorite(id: string) {
    const existing = await this.prisma.clauseTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Clause template ${id} not found`);

    return this.prisma.clauseTemplate.update({
      where: { id },
      data: { isFavorite: !existing.isFavorite },
    });
  }

  async deleteTemplate(id: string) {
    const existing = await this.prisma.clauseTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Clause template ${id} not found`);

    await this.prisma.clauseTemplate.delete({ where: { id } });
    return { message: 'Clause template deleted successfully' };
  }

  async searchTemplates(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return this.getTemplates();

    return this.prisma.clauseTemplate.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { clauseType: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
          { jurisdiction: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ isFavorite: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
