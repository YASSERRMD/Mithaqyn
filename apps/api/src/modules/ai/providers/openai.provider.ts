import { Logger } from '@nestjs/common';
import {
  IAIProvider,
  GenerateTextOptions,
  GenerateJsonOptions,
  StreamTextOptions,
} from '../interfaces/ai-provider.interface';

export interface OpenAIProviderConfig {
  apiKey: string;
  model?: string;
  embeddingModel?: string;
  baseUrl?: string;
  maxRetries?: number;
  timeout?: number;
}

export class OpenAIProvider implements IAIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly model: string;
  private readonly embeddingModel: string;
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(private readonly config: OpenAIProviderConfig) {
    this.model = config.model || 'gpt-4o';
    this.embeddingModel = config.embeddingModel || 'text-embedding-3-large';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };
  }

  validateConfig(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 10;
  }

  getProviderName(): string {
    return 'openai';
  }

  getModelList(): string[] {
    return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'];
  }

  async generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.1,
        stop: options.stopSequences,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async generateJson<T = unknown>(prompt: string, options: GenerateJsonOptions = {}): Promise<T> {
    const jsonPrompt = `${prompt}\n\nRespond ONLY with valid JSON. No markdown, no code blocks, no explanation.`;

    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: jsonPrompt });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.0,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    return JSON.parse(content) as T;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.embeddingModel,
        input: texts,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI Embeddings error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.data.map((item: { embedding: number[] }) => item.embedding);
  }

  async *streamText(prompt: string, options: StreamTextOptions = {}): AsyncIterable<string> {
    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.1,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`OpenAI stream error ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            options.onChunk?.(content);
            yield content;
          }
        } catch {
          // skip malformed SSE lines
        }
      }
    }
  }
}
