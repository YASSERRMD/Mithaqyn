import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { EmbeddingsService, SearchResult } from '../embeddings/embeddings.service';
import { RAG_SYSTEM_PROMPT, buildRagPrompt } from './rag.prompts';

export interface Citation {
  contractId: string;
  contractTitle: string;
  chunkText: string;
  score: number;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  sessionId: string;
}

const RAG_TOP_K = 5;
const RAG_MIN_SCORE = 0.2;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async createSession(
    userId: string,
    contractId?: string,
    title?: string,
    scope?: string,
  ) {
    if (contractId) {
      const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
      if (!contract) {
        throw new NotFoundException(`Contract ${contractId} not found`);
      }
    }

    return this.prisma.chatSession.create({
      data: {
        userId,
        contractId: contractId ?? null,
        title: title ?? 'New Chat',
        scope: scope ?? 'CONTRACT',
      },
    });
  }

  async chat(sessionId: string, question: string): Promise<ChatResponse> {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }

    // Persist user message immediately
    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: question,
      },
    });

    // Retrieve relevant chunks via semantic search
    let searchResults: SearchResult[] = [];

    try {
      if (session.scope === 'CONTRACT' && session.contractId) {
        // Scope search to a specific contract by filtering results
        const allResults = await this.embeddingsService.semanticSearch(question, RAG_TOP_K * 3);
        searchResults = allResults
          .filter((r) => r.contractId === session.contractId)
          .slice(0, RAG_TOP_K);
      } else {
        // Repository-wide search
        searchResults = await this.embeddingsService.semanticSearch(question, RAG_TOP_K);
      }

      // Filter by minimum relevance threshold
      searchResults = searchResults.filter((r) => r.score >= RAG_MIN_SCORE);
    } catch (err) {
      this.logger.warn(`Semantic search failed for session ${sessionId}: ${(err as Error).message}`);
      // Proceed with empty context — the AI will say it couldn't find info
    }

    // Build citations from search results
    const citations: Citation[] = searchResults.map((r) => ({
      contractId: r.contractId,
      contractTitle: r.contractTitle,
      chunkText: r.chunkText,
      score: r.score,
    }));

    // Build the RAG prompt with retrieved chunks
    const ragPrompt = buildRagPrompt(
      question,
      searchResults.map((r) => ({
        contractTitle: r.contractTitle,
        chunkText: r.chunkText,
      })),
    );

    // Generate answer from AI provider
    const provider = this.aiService.getDefaultProvider();
    let answer: string;

    try {
      answer = await provider.generateText(ragPrompt, {
        systemPrompt: RAG_SYSTEM_PROMPT,
        maxTokens: 1500,
        temperature: 0.1,
      });
    } catch (err) {
      this.logger.error(`AI generation failed for session ${sessionId}: ${(err as Error).message}`);
      answer = 'I encountered an error while processing your question. Please try again.';
    }

    // Save assistant message with citations
    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: answer,
        citations: citations.length > 0 ? (citations as unknown as Record<string, unknown>[]) : undefined,
      },
    });

    // Update session updatedAt
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    this.logger.log(
      `RAG chat: session=${sessionId}, chunks=${searchResults.length}, scope=${session.scope}`,
    );

    return { answer, citations, sessionId };
  }

  async getSession(sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        contract: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }

    return session;
  }

  async listSessions(userId: string, contractId?: string) {
    return this.prisma.chatSession.findMany({
      where: {
        userId,
        ...(contractId ? { contractId } : {}),
      },
      include: {
        contract: { select: { id: true, title: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async deleteSession(sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });

    if (!session) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }

    await this.prisma.chatSession.delete({ where: { id: sessionId } });

    return { deleted: true, sessionId };
  }
}
