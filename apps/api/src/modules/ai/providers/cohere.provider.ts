import {
  IAIProvider,
  GenerateTextOptions,
  GenerateJsonOptions,
  StreamTextOptions,
} from '../interfaces/ai-provider.interface';

export class CohereProvider implements IAIProvider {
  private readonly model: string;
  private readonly baseUrl = 'https://api.cohere.com/v1';
  private readonly headers: Record<string, string>;

  constructor(config: { apiKey: string; model?: string }) {
    this.model = config.model || 'command-r-plus';
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };
  }

  validateConfig(): boolean { return true; }
  getProviderName(): string { return 'cohere'; }
  getModelList(): string[] {
    return ['command-r-plus', 'command-r', 'command', 'command-light'];
  }

  async generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.model,
        message: prompt,
        preamble: options.systemPrompt,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.1,
      }),
    });
    if (!res.ok) throw new Error(`Cohere error ${res.status}: ${await res.text()}`);
    return (await res.json()).text || '';
  }

  async generateJson<T = unknown>(prompt: string, options: GenerateJsonOptions = {}): Promise<T> {
    const text = await this.generateText(`${prompt}\n\nRespond ONLY with valid JSON.`, { ...options, temperature: 0.0 });
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return JSON.parse(match?.[0] || text) as T;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.baseUrl}/embed`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ model: 'embed-english-v3.0', texts, input_type: 'search_document' }),
    });
    if (!res.ok) throw new Error(`Cohere embeddings error ${res.status}`);
    return (await res.json()).embeddings;
  }

  async *streamText(prompt: string, options: StreamTextOptions = {}): AsyncIterable<string> {
    const text = await this.generateText(prompt, options);
    options.onChunk?.(text);
    yield text;
  }
}
