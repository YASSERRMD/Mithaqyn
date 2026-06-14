import {
  IAIProvider,
  GenerateTextOptions,
  GenerateJsonOptions,
  StreamTextOptions,
} from '../interfaces/ai-provider.interface';

export interface GeminiProviderConfig {
  apiKey: string;
  model?: string;
}

export class GeminiProvider implements IAIProvider {
  private readonly model: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(private readonly config: GeminiProviderConfig) {
    this.model = config.model || 'gemini-1.5-pro';
  }

  validateConfig(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 10;
  }

  getProviderName(): string {
    return 'google-gemini';
  }

  getModelList(): string[] {
    return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'];
  }

  private buildContents(prompt: string, systemPrompt?: string) {
    const contents: unknown[] = [{ role: 'user', parts: [{ text: prompt }] }];
    const systemInstruction = systemPrompt
      ? { parts: [{ text: systemPrompt }] }
      : undefined;
    return { contents, systemInstruction };
  }

  async generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
    const { contents, systemInstruction } = this.buildContents(prompt, options.systemPrompt);
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.config.apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 4096,
          temperature: options.temperature ?? 0.1,
        },
      }),
    });

    if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async generateJson<T = unknown>(prompt: string, options: GenerateJsonOptions = {}): Promise<T> {
    const jsonPrompt = `${prompt}\n\nRespond ONLY with valid JSON. No markdown, no code blocks.`;
    const text = await this.generateText(jsonPrompt, { ...options, temperature: 0.0 });
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return JSON.parse(match?.[0] || text) as T;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const url = `${this.baseUrl}/models/text-embedding-004:batchEmbedContents?key=${this.config.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
        })),
      }),
    });

    if (!res.ok) throw new Error(`Gemini embeddings error ${res.status}`);
    const data = await res.json();
    return data.embeddings.map((e: { values: number[] }) => e.values);
  }

  async *streamText(prompt: string, options: StreamTextOptions = {}): AsyncIterable<string> {
    const text = await this.generateText(prompt, options);
    options.onChunk?.(text);
    yield text;
  }
}
