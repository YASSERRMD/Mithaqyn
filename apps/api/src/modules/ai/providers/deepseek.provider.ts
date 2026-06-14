import {
  IAIProvider,
  GenerateTextOptions,
  GenerateJsonOptions,
  StreamTextOptions,
} from '../interfaces/ai-provider.interface';

export class DeepSeekProvider implements IAIProvider {
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.model = config.model || 'deepseek-chat';
    this.baseUrl = (config.baseUrl || 'https://api.deepseek.com').replace(/\/$/, '') + '/v1';
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };
  }

  validateConfig(): boolean { return true; }
  getProviderName(): string { return 'deepseek'; }
  getModelList(): string[] {
    return ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'];
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
    if (!res.ok) throw new Error(`DeepSeek error ${res.status}: ${await res.text()}`);
    return (await res.json()).choices[0]?.message?.content || '';
  }

  async generateJson<T = unknown>(prompt: string, options: GenerateJsonOptions = {}): Promise<T> {
    const text = await this.generateText(`${prompt}\n\nRespond ONLY with valid JSON.`, { ...options, temperature: 0.0 });
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return JSON.parse(match?.[0] || text) as T;
  }

  async generateEmbeddings(_texts: string[]): Promise<number[][]> {
    throw new Error('DeepSeek does not provide an embeddings endpoint.');
  }

  async *streamText(prompt: string, options: StreamTextOptions = {}): AsyncIterable<string> {
    const text = await this.generateText(prompt, options);
    options.onChunk?.(text);
    yield text;
  }
}
