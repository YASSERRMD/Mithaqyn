import {
  IAIProvider,
  GenerateTextOptions,
  GenerateJsonOptions,
  StreamTextOptions,
} from '../interfaces/ai-provider.interface';

export interface AzureOpenAIProviderConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion?: string;
  embeddingDeployment?: string;
}

export class AzureOpenAIProvider implements IAIProvider {
  private readonly apiVersion: string;
  private readonly baseUrl: string;
  private readonly embeddingUrl: string;
  private readonly headers: Record<string, string>;

  constructor(private readonly config: AzureOpenAIProviderConfig) {
    this.apiVersion = config.apiVersion || '2024-02-01';
    const ep = config.endpoint.replace(/\/$/, '');
    this.baseUrl = `${ep}/openai/deployments/${config.deployment}`;
    this.embeddingUrl = `${ep}/openai/deployments/${config.embeddingDeployment || config.deployment}`;
    this.headers = {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    };
  }

  validateConfig(): boolean {
    return !!this.config.apiKey && !!this.config.endpoint && !!this.config.deployment;
  }

  getProviderName(): string {
    return 'azure-openai';
  }

  getModelList(): string[] {
    return [this.config.deployment];
  }

  async generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
    const messages = [];
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(
      `${this.baseUrl}/chat/completions?api-version=${this.apiVersion}`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          messages,
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature ?? 0.1,
        }),
      },
    );

    if (!res.ok) throw new Error(`Azure OpenAI error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices[0]?.message?.content || '';
  }

  async generateJson<T = unknown>(prompt: string, options: GenerateJsonOptions = {}): Promise<T> {
    const jsonPrompt = `${prompt}\n\nRespond ONLY with valid JSON. No markdown, no code blocks.`;
    const messages = [];
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: jsonPrompt });

    const res = await fetch(
      `${this.baseUrl}/chat/completions?api-version=${this.apiVersion}`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          messages,
          max_tokens: options.maxTokens || 4096,
          temperature: 0.0,
          response_format: { type: 'json_object' },
        }),
      },
    );

    if (!res.ok) throw new Error(`Azure OpenAI error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return JSON.parse(data.choices[0]?.message?.content || '{}') as T;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const res = await fetch(
      `${this.embeddingUrl}/embeddings?api-version=${this.apiVersion}`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ input: texts }),
      },
    );

    if (!res.ok) throw new Error(`Azure OpenAI embeddings error ${res.status}`);
    const data = await res.json();
    return data.data.map((item: { embedding: number[] }) => item.embedding);
  }

  async *streamText(prompt: string, options: StreamTextOptions = {}): AsyncIterable<string> {
    const messages = [];
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(
      `${this.baseUrl}/chat/completions?api-version=${this.apiVersion}`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ messages, max_tokens: options.maxTokens || 4096, stream: true }),
      },
    );

    if (!res.ok || !res.body) throw new Error(`Azure OpenAI stream error ${res.status}`);

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
        } catch { /* skip */ }
      }
    }
  }
}
