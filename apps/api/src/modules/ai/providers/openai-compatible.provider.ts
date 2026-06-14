import {
  IAIProvider,
  GenerateTextOptions,
  GenerateJsonOptions,
  StreamTextOptions,
} from '../interfaces/ai-provider.interface';

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
  embeddingModel?: string;
  customHeaders?: Record<string, string>;
  timeout?: number;
  maxRetries?: number;
}

/**
 * OpenAI-compatible provider for any endpoint implementing the OpenAI API spec.
 *
 * Compatible with: LM Studio, vLLM, OpenRouter, LiteLLM, Fireworks,
 * Together AI (OpenAI-compatible mode), local enterprise gateways,
 * and any other server that follows the OpenAI REST interface.
 *
 * Config example for Ollama OpenAI-compatible endpoint:
 *   baseUrl: 'http://localhost:11434/v1'
 *   apiKey: 'ollama'
 *   model: 'llama3.1'
 *
 * Config example for OpenRouter:
 *   baseUrl: 'https://openrouter.ai/api/v1'
 *   apiKey: 'sk-or-...'
 *   model: 'anthropic/claude-3.5-sonnet'
 *
 * Config example for LM Studio:
 *   baseUrl: 'http://localhost:1234/v1'
 *   apiKey: 'lm-studio'
 *   model: 'local-model'
 */
export class OpenAICompatibleProvider implements IAIProvider {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(private readonly config: OpenAICompatibleConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.headers = {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      ...config.customHeaders,
    };
  }

  validateConfig(): boolean {
    return !!this.config.baseUrl && !!this.config.model;
  }

  getProviderName(): string {
    return 'openai-compatible';
  }

  getModelList(): string[] {
    return [this.config.model, ...(this.config.embeddingModel ? [this.config.embeddingModel] : [])];
  }

  async generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
    const messages = [];
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.1,
        stop: options.stopSequences,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI-compatible error ${res.status}: ${await res.text()}`);
    return (await res.json()).choices[0]?.message?.content || '';
  }

  async generateJson<T = unknown>(prompt: string, options: GenerateJsonOptions = {}): Promise<T> {
    const jsonPrompt = `${prompt}\n\nRespond ONLY with valid JSON. No markdown, no code blocks, no explanation.`;
    const messages = [];
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: jsonPrompt });

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: 0.0,
    };

    // Only add json_object format if the server is known to support it
    // (most OpenAI-compatible servers do, but some local ones don't)
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ ...body, response_format: { type: 'json_object' } }),
      });

      if (res.ok) {
        const data = await res.json();
        return JSON.parse(data.choices[0]?.message?.content || '{}') as T;
      }
    } catch { /* fall through to plain text approach */ }

    // Fallback: plain text with JSON extraction
    const text = await this.generateText(jsonPrompt, { ...options, temperature: 0.0 });
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return JSON.parse(match?.[0] || text) as T;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.config.embeddingModel) {
      throw new Error(
        'No embeddingModel configured for this OpenAI-compatible provider. Set OPENAI_COMPAT_EMBEDDING_MODEL.',
      );
    }

    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.config.embeddingModel,
        input: texts,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI-compatible embeddings error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.data.map((item: { embedding: number[] }) => item.embedding);
  }

  async *streamText(prompt: string, options: StreamTextOptions = {}): AsyncIterable<string> {
    const messages = [];
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.1,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) throw new Error(`OpenAI-compatible stream error ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split('\n').filter((l) => l.startsWith('data: '));
      for (const line of lines) {
        const d = line.slice(6);
        if (d === '[DONE]') return;
        try {
          const content = JSON.parse(d).choices?.[0]?.delta?.content;
          if (content) { options.onChunk?.(content); yield content; }
        } catch { /* skip malformed SSE lines */ }
      }
    }
  }
}
