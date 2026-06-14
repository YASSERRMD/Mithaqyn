import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { ChunkingService } from './chunking.service';

export interface SearchResult {
  contractId: string;
  contractTitle: string;
  chunkIndex: number;
  chunkText: string;
  score: number;
}

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly chunking: ChunkingService,
  ) {}

  async embedContract(contractId: string): Promise<{ chunks: number; model: string }> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { documents: { select: { extractedText: true }, take: 1 } },
    });
    if (!contract) throw new NotFoundException(`Contract ${contractId} not found`);

    const text = contract.documents[0]?.extractedText || contract.description || '';
    if (!text.trim()) {
      this.logger.warn(`Contract ${contractId} has no extractable text for embedding`);
      return { chunks: 0, model: 'none' };
    }

    const chunks = this.chunking.chunk(text);
    if (chunks.length === 0) return { chunks: 0, model: 'none' };

    const provider = this.aiService.getDefaultProvider();
    const vectors = await provider.generateEmbeddings(chunks.map((c) => c.text));
    const model = provider.getProviderName();

    // Upsert embeddings
    await this.prisma.$transaction([
      this.prisma.contractEmbedding.deleteMany({ where: { contractId } }),
      ...chunks.map((chunk, i) =>
        this.prisma.contractEmbedding.create({
          data: {
            contractId,
            chunkIndex: chunk.index,
            chunkText: chunk.text,
            embedding: vectors[i] ?? [],
            tokenCount: chunk.tokenEstimate,
            model,
          },
        }),
      ),
    ]);

    this.logger.log(`Embedded contract ${contractId}: ${chunks.length} chunks, model=${model}`);
    return { chunks: chunks.length, model };
  }

  async embedClause(clauseId: string): Promise<{ model: string }> {
    const clause = await this.prisma.clause.findUnique({ where: { id: clauseId } });
    if (!clause) throw new NotFoundException(`Clause ${clauseId} not found`);

    const text = `${clause.title}: ${clause.summary} ${clause.textExcerpt}`;
    const provider = this.aiService.getDefaultProvider();
    const [vector] = await provider.generateEmbeddings([text]);
    const model = provider.getProviderName();

    await this.prisma.clauseEmbedding.upsert({
      where: { clauseId },
      update: { embedding: vector, model },
      create: { clauseId, embedding: vector, model },
    });

    return { model };
  }

  async semanticSearch(query: string, limit = 10): Promise<SearchResult[]> {
    const provider = this.aiService.getDefaultProvider();
    const [queryVector] = await provider.generateEmbeddings([query]);

    // Load all embeddings and compute cosine similarity in-memory
    // For production use, replace with pgvector extension: SELECT ... ORDER BY embedding <=> $1
    const allEmbeddings = await this.prisma.contractEmbedding.findMany({
      include: { contract: { select: { id: true, title: true } } },
    });

    const scored = allEmbeddings
      .map((e) => ({
        contractId: e.contractId,
        contractTitle: e.contract.title,
        chunkIndex: e.chunkIndex,
        chunkText: e.chunkText,
        score: this.cosineSimilarity(queryVector, e.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }

  async hybridSearch(query: string, limit = 10): Promise<SearchResult[]> {
    // Keyword results via Prisma full-text search
    const keywordResults = await this.prisma.contractEmbedding.findMany({
      where: { chunkText: { contains: query, mode: 'insensitive' } },
      include: { contract: { select: { id: true, title: true } } },
      take: limit * 2,
    });

    const keywordScored = keywordResults.map((e) => ({
      contractId: e.contractId,
      contractTitle: e.contract.title,
      chunkIndex: e.chunkIndex,
      chunkText: e.chunkText,
      score: 0.5, // Base keyword score
    }));

    // Semantic results
    const semanticResults = await this.semanticSearch(query, limit * 2);

    // Merge and deduplicate by contractId+chunkIndex, combining scores
    const map = new Map<string, SearchResult>();
    for (const r of keywordScored) {
      map.set(`${r.contractId}:${r.chunkIndex}`, r);
    }
    for (const r of semanticResults) {
      const key = `${r.contractId}:${r.chunkIndex}`;
      const existing = map.get(key);
      if (existing) {
        map.set(key, { ...r, score: (existing.score + r.score) / 2 + 0.1 }); // Boost co-occurrence
      } else {
        map.set(key, r);
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length || a.length !== b.length) return 0;
    const dot = a.reduce((sum, v, i) => sum + v * (b[i] ?? 0), 0);
    const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    return magA && magB ? dot / (magA * magB) : 0;
  }
}
