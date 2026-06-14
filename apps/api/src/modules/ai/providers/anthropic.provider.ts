import {
  IAIProvider,
  GenerateTextOptions,
  GenerateJsonOptions,
  StreamTextOptions,
} from '../interfaces/ai-provider.interface';

export interface AnthropicProviderConfig {
  apiKey: string;
  model?: string;
  maxRetries?: number;
}

export class AnthropicProvider implements IAIProvider {
  private readonly model: string;
  private readonly baseUrl = 'https://api.anthropic.com/v1';
  private readonly headers: Record<string, string>;

  constructor(private readonly config: AnthropicProviderConfig) {
    this.model = config.model || 'claude-sonnet-4-6';
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  validateConfig(): boolean {
    return !!this.config.apiKey && this.config.apiKey.startsWith('sk-ant-');
  }

  getProviderName(): string {
    return 'anthropic';
  }

  getModelList(): string[] {
    return [
      'claude-sonnet-4-6',
      'claude-opus-4-8',
      'claude-haiku-4-5-20251001',
      'claude-fable-5',
    ];
  }

  async generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.1,
        system: options.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content[0]?.text || '';
  }

  async generateJson<T = unknown>(prompt: string, options: GenerateJsonOptions = {}): Promise<T> {
    const jsonPrompt = `${prompt}\n\nRespond ONLY with valid JSON. No markdown, no code blocks, no preamble.`;

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens || 4096,
        temperature: 0.0,
        system: options.systemPrompt,
        messages: [{ role: 'user', content: jsonPrompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data.content[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return JSON.parse(jsonMatch?.[0] || text) as T;
  }

  async generateEmbeddings(_texts: string[]): Promise<number[][]> {
    throw new Error('Anthropic does not provide an embeddings API. Use a different provider for embeddings.');
  }

  async *streamText(prompt: string, options: StreamTextOptions = {}): AsyncIterable<string> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens || 4096,
        system: options.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
    });

    if (!res.ok || !res.body) throw new Error(`Anthropic stream error ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split('\n').filter((l) => l.startsWith('data: '));
      for (const line of lines) {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'content_block_delta') {
            const text = event.delta?.text;
            if (text) { options.onChunk?.(text); yield text; }
          }
        } catch { /* skip */ }
      }
    }
  }
}
