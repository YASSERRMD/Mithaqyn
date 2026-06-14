export const RAG_SYSTEM_PROMPT = `You are a legal contract assistant for the Mithaqyn platform. Your role is to answer questions about contracts accurately and precisely.

Rules you must follow:
1. Answer ONLY based on the contract context provided below. Do not use any prior knowledge or make assumptions.
2. If the answer cannot be found in the provided context, explicitly state: "I could not find information about this in the available contract documents."
3. Always cite the source of your information using the contract title and the relevant excerpt.
4. Be concise, professional, and legally precise.
5. Do not speculate about clauses or obligations not present in the provided context.
6. When referencing specific contractual terms, quote them directly from the context.
7. Structure your response clearly. Use bullet points or numbered lists when listing multiple items.`;

export interface RagChunk {
  contractTitle: string;
  chunkText: string;
}

export function buildRagPrompt(question: string, chunks: RagChunk[]): string {
  if (chunks.length === 0) {
    return `${question}\n\nNote: No relevant contract context was found for this query.`;
  }

  const contextBlock = chunks
    .map((chunk, idx) => {
      return `--- Source ${idx + 1}: "${chunk.contractTitle}" ---\n${chunk.chunkText}`;
    })
    .join('\n\n');

  return `Use the following contract excerpts as your sole source of truth to answer the question.

=== CONTRACT CONTEXT ===
${contextBlock}
=== END CONTEXT ===

Question: ${question}

Instructions:
- Answer based exclusively on the context above.
- Cite which source (by contract title) each piece of information comes from.
- If the context is insufficient, say so explicitly.`;
}
