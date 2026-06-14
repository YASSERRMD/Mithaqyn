export interface GenerateTextOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stopSequences?: string[];
}

export interface GenerateJsonOptions extends GenerateTextOptions {
  schema?: Record<string, unknown>;
}

export interface StreamTextOptions extends GenerateTextOptions {
  onChunk?: (chunk: string) => void;
}

export interface IAIProvider {
  generateText(prompt: string, options?: GenerateTextOptions): Promise<string>;
  generateJson<T = unknown>(prompt: string, options?: GenerateJsonOptions): Promise<T>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  streamText(prompt: string, options?: StreamTextOptions): AsyncIterable<string>;
  validateConfig(): boolean;
  getProviderName(): string;
  getModelList(): string[];
}
