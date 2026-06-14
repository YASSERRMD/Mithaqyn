import {
  IAIProvider,
  GenerateTextOptions,
  GenerateJsonOptions,
  StreamTextOptions,
} from '../interfaces/ai-provider.interface';

export class GroqProvider implements IAIProvider {
  private readonly model: string;
  private readonly baseUrl = 'https://api.groq.com/openai/v1';
  private readonly headers: Record<string, string>;

  constructor(config: { apiKey: string; model?: string }) {
    this.model = config.model || 'llama-3.1-70b-versatile';
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };
  }

  validateConfig(): boolean { return true; }
  getProviderName(): string { return 'groq'; }
  getModelList(): string[] {
    return ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
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
    if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
    return (await res.json()).choices[0]?.message?.content || '';
  }

  async generateJson<T = unknown>(prompt: string, options: GenerateJsonOptions = {}): Promise<T> {
    const text = await this.generateText(`${prompt}\n\nRespond ONLY with valid JSON.`, { ...options, temperature: 0.0 });
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return JSON.parse(match?.[0] || text) as T;
  }

  async generateEmbeddings(_texts: string[]): Promise<number[][]> {
    throw new Error('Groq does not provide an embeddings endpoint. Use OpenAI or Cohere for embeddings.');
  }

  async *streamText(prompt: string, options: StreamTextOptions = {}): AsyncIterable<string> {
    const messages = [];
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ model: this.model, messages, stream: true }),
    });
    if (!res.ok || !res.body) throw new Error(`Groq stream error ${res.status}`);

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
