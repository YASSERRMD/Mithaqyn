import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AddCommentDto {
  clauseId?: string;
  author: string;
  authorName: string;
  content: string;
}

@Injectable()
export class NegotiationService {
  constructor(private readonly prisma: PrismaService) {}

  async createRound(contractId: string, summary?: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    const lastRound = await this.prisma.negotiationRound.findFirst({
      where: { contractId },
      orderBy: { roundNumber: 'desc' },
    });

    const roundNumber = lastRound ? lastRound.roundNumber + 1 : 1;

    return this.prisma.negotiationRound.create({
      data: {
        contractId,
        roundNumber,
        summary: summary ?? null,
        status: 'OPEN',
      },
      include: {
        comments: true,
      },
    });
  }

  async addComment(roundId: string, dto: AddCommentDto) {
    const round = await this.prisma.negotiationRound.findUnique({
      where: { id: roundId },
    });
    if (!round) {
      throw new NotFoundException(`Negotiation round ${roundId} not found`);
    }

    return this.prisma.clauseComment.create({
      data: {
        roundId,
        clauseId: dto.clauseId ?? null,
        author: dto.author,
        authorName: dto.authorName,
        content: dto.content,
      },
    });
  }

  async closeRound(roundId: string, status: 'CLOSED' | 'AGREED') {
    const round = await this.prisma.negotiationRound.findUnique({
      where: { id: roundId },
    });
    if (!round) {
      throw new NotFoundException(`Negotiation round ${roundId} not found`);
    }

    return this.prisma.negotiationRound.update({
      where: { id: roundId },
      data: {
        status,
        closedAt: new Date(),
      },
      include: {
        comments: true,
      },
    });
  }

  async getRounds(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    return this.prisma.negotiationRound.findMany({
      where: { contractId },
      orderBy: { roundNumber: 'asc' },
      include: {
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getRedlineSummary(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    const rounds = await this.prisma.negotiationRound.findMany({
      where: { contractId },
      include: {
        comments: {
          select: { isResolved: true },
        },
      },
    });

    const totalRounds = rounds.length;
    const openRounds = rounds.filter((r) => r.status === 'OPEN').length;
    const agreedRounds = rounds.filter((r) => r.status === 'AGREED').length;

    let totalComments = 0;
    let unresolvedComments = 0;
    for (const round of rounds) {
      totalComments += round.comments.length;
      unresolvedComments += round.comments.filter((c) => !c.isResolved).length;
    }

    return {
      totalRounds,
      openRounds,
      totalComments,
      unresolvedComments,
      agreedRounds,
    };
  }

  async resolveComment(commentId: string) {
    const comment = await this.prisma.clauseComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    return this.prisma.clauseComment.update({
      where: { id: commentId },
      data: { isResolved: true },
    });
  }
}
