import {
  IAIProvider,
  GenerateTextOptions,
  GenerateJsonOptions,
  StreamTextOptions,
} from '../interfaces/ai-provider.interface';

export class TogetherProvider implements IAIProvider {
  private readonly model: string;
  private readonly baseUrl = 'https://api.together.xyz/v1';
  private readonly headers: Record<string, string>;

  constructor(config: { apiKey: string; model?: string }) {
    this.model = config.model || 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };
  }

  validateConfig(): boolean { return true; }
  getProviderName(): string { return 'together'; }
  getModelList(): string[] {
    return [
      'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      'mistralai/Mistral-7B-Instruct-v0.3',
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
    ];
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
    if (!res.ok) throw new Error(`Together error ${res.status}: ${await res.text()}`);
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
      body: JSON.stringify({ model: 'togethercomputer/m2-bert-80M-8k-retrieval', input: texts }),
    });
    if (!res.ok) throw new Error(`Together embeddings error ${res.status}`);
    return (await res.json()).data.map((d: { embedding: number[] }) => d.embedding);
  }

  async *streamText(prompt: string, options: StreamTextOptions = {}): AsyncIterable<string> {
    const text = await this.generateText(prompt, options);
    options.onChunk?.(text);
    yield text;
  }
}
