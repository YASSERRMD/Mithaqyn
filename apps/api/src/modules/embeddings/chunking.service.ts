import { Injectable } from '@nestjs/common';

export interface TextChunk {
  index: number;
  text: string;
  tokenEstimate: number;
}

@Injectable()
export class ChunkingService {
  // Sliding window chunking with overlap
  chunk(text: string, maxTokens = 512, overlapTokens = 64): TextChunk[] {
    if (!text || !text.trim()) return [];

    // Rough token estimate: 1 token ≈ 4 characters for English
    const CHARS_PER_TOKEN = 4;
    const maxChars = maxTokens * CHARS_PER_TOKEN;
    const overlapChars = overlapTokens * CHARS_PER_TOKEN;

    // Split into sentences for cleaner boundaries
    const sentences = text
      .replace(/([.!?])\s+/g, '$1\n')
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const chunks: TextChunk[] = [];
    let current = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      if ((current + ' ' + sentence).length > maxChars && current.length > 0) {
        chunks.push({
          index: chunkIndex++,
          text: current.trim(),
          tokenEstimate: Math.ceil(current.length / CHARS_PER_TOKEN),
        });
        // Keep overlap from end of previous chunk
        const overlapText = current.slice(-overlapChars);
        current = overlapText + ' ' + sentence;
      } else {
        current = current ? current + ' ' + sentence : sentence;
      }
    }

    if (current.trim()) {
      chunks.push({
        index: chunkIndex,
        text: current.trim(),
        tokenEstimate: Math.ceil(current.length / CHARS_PER_TOKEN),
      });
    }

    // If no sentence splitting worked, fall back to char-level slicing
    if (chunks.length === 0 && text.trim()) {
      for (let i = 0; i < text.length; i += maxChars - overlapChars) {
        chunks.push({
          index: chunkIndex++,
          text: text.slice(i, i + maxChars).trim(),
          tokenEstimate: Math.ceil(Math.min(text.length - i, maxChars) / CHARS_PER_TOKEN),
        });
      }
    }

    return chunks;
  }
}
