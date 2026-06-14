import {
  IAIProvider,
  GenerateTextOptions,
  GenerateJsonOptions,
  StreamTextOptions,
} from '../interfaces/ai-provider.interface';

export class OllamaProvider implements IAIProvider {
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(config: { model?: string; baseUrl?: string }) {
    this.model = config.model || 'llama3.1';
    this.baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
  }

  validateConfig(): boolean { return !!this.baseUrl; }
  getProviderName(): string { return 'ollama'; }
  getModelList(): string[] {
    return ['llama3.1', 'llama3.1:8b', 'mistral', 'codellama', 'phi3', 'gemma2'];
  }

  async generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
    const messages = [];
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          num_predict: options.maxTokens || 4096,
          temperature: options.temperature ?? 0.1,
        },
      }),
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
    return (await res.json()).message?.content || '';
  }

  async generateJson<T = unknown>(prompt: string, options: GenerateJsonOptions = {}): Promise<T> {
    const messages = [];
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: `${prompt}\n\nRespond ONLY with valid JSON.` });

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        format: 'json',
        options: { temperature: 0.0 },
      }),
    });
    if (!res.ok) throw new Error(`Ollama JSON error ${res.status}`);
    const text = (await res.json()).message?.content || '{}';
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return JSON.parse(match?.[0] || text) as T;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const res = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: text }),
      });
      if (!res.ok) throw new Error(`Ollama embeddings error ${res.status}`);
      const data = await res.json();
      results.push(data.embedding);
    }
    return results;
  }

  async *streamText(prompt: string, options: StreamTextOptions = {}): AsyncIterable<string> {
    const messages = [];
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, messages, stream: true }),
    });
    if (!res.ok || !res.body) throw new Error(`Ollama stream error ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          const content = obj.message?.content;
          if (content) { options.onChunk?.(content); yield content; }
          if (obj.done) return;
        } catch { /* skip */ }
      }
    }
  }
}
