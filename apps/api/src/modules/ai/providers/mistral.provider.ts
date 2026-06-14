import {
  IAIProvider,
  GenerateTextOptions,
  GenerateJsonOptions,
  StreamTextOptions,
} from '../interfaces/ai-provider.interface';

export class MistralProvider implements IAIProvider {
  private readonly model: string;
  private readonly baseUrl = 'https://api.mistral.ai/v1';
  private readonly headers: Record<string, string>;

  constructor(config: { apiKey: string; model?: string }) {
    this.model = config.model || 'mistral-large-latest';
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };
  }

  validateConfig(): boolean { return true; }
  getProviderName(): string { return 'mistral'; }
  getModelList(): string[] {
    return ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'open-mistral-7b'];
  }

  async generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
    const messages = [];
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ model: this.model, messages, max_tokens: options.maxTokens || 4096, temperature: options.temperature ?? 0.1 }),
    });
    if (!res.ok) throw new Error(`Mistral error ${res.status}: ${await res.text()}`);
    return (await res.json()).choices[0]?.message?.content || '';
  }

  async generateJson<T = unknown>(prompt: string, options: GenerateJsonOptions = {}): Promise<T> {
    const text = await this.generateText(`${prompt}\n\nRespond ONLY with valid JSON.`, { ...options, temperature: 0.0 });
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return JSON.parse(match?.[0] || text) as T;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ model: 'mistral-embed', input: texts }),
    });
    if (!res.ok) throw new Error(`Mistral embeddings error ${res.status}`);
    return (await res.json()).data.map((d: { embedding: number[] }) => d.embedding);
  }

  async *streamText(prompt: string, options: StreamTextOptions = {}): AsyncIterable<string> {
    const text = await this.generateText(prompt, options);
    options.onChunk?.(text);
    yield text;
  }
}
