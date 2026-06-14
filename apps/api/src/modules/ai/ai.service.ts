import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAIProvider } from './interfaces/ai-provider.interface';
import { createProvider, getDefaultProvider, ProviderName } from './providers/provider.factory';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getDefaultProvider(): IAIProvider {
    return getDefaultProvider(this.config);
  }

  getProvider(name: ProviderName, overrides?: Record<string, string>): IAIProvider {
    return createProvider(name, this.config, overrides);
  }

  getAvailableProviders() {
    const providers: Array<{
      name: string;
      label: string;
      configured: boolean;
      models: string[];
    }> = [
      {
        name: 'openai',
        label: 'OpenAI',
        configured: !!this.config.get('OPENAI_API_KEY'),
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      },
      {
        name: 'azure-openai',
        label: 'Azure OpenAI',
        configured: !!this.config.get('AZURE_OPENAI_API_KEY'),
        models: [this.config.get('AZURE_OPENAI_DEPLOYMENT') || 'gpt-4o'],
      },
      {
        name: 'anthropic',
        label: 'Anthropic Claude',
        configured: !!this.config.get('ANTHROPIC_API_KEY'),
        models: ['claude-sonnet-4-6', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'],
      },
      {
        name: 'google-gemini',
        label: 'Google Gemini',
        configured: !!this.config.get('GOOGLE_GEMINI_API_KEY'),
        models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
      },
      {
        name: 'mistral',
        label: 'Mistral AI',
        configured: !!this.config.get('MISTRAL_API_KEY'),
        models: ['mistral-large-latest', 'mistral-medium-latest'],
      },
      {
        name: 'cohere',
        label: 'Cohere',
        configured: !!this.config.get('COHERE_API_KEY'),
        models: ['command-r-plus', 'command-r'],
      },
      {
        name: 'groq',
        label: 'Groq',
        configured: !!this.config.get('GROQ_API_KEY'),
        models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant'],
      },
      {
        name: 'together',
        label: 'Together AI',
        configured: !!this.config.get('TOGETHER_API_KEY'),
        models: ['meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'],
      },
      {
        name: 'deepseek',
        label: 'DeepSeek',
        configured: !!this.config.get('DEEPSEEK_API_KEY'),
        models: ['deepseek-chat', 'deepseek-coder'],
      },
      {
        name: 'ollama',
        label: 'Ollama (Local)',
        configured: true,
        models: ['llama3.1', 'mistral', 'codellama', 'phi3'],
      },
      {
        name: 'openai-compatible',
        label: 'OpenAI-Compatible',
        configured: !!this.config.get('OPENAI_COMPAT_BASE_URL'),
        models: [this.config.get('OPENAI_COMPAT_MODEL') || 'custom'],
      },
    ];

    return providers;
  }

  async testProvider(providerName: ProviderName, overrides?: Record<string, string>) {
    const provider = this.getProvider(providerName, overrides);

    if (!provider.validateConfig()) {
      throw new BadRequestException(`Provider ${providerName} configuration is invalid`);
    }

    const start = process.hrtime.bigint();
    const result = await provider.generateText(
      'Reply with exactly the word: CONNECTED',
      { maxTokens: 10, temperature: 0 },
    );
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

    return {
      provider: providerName,
      status: 'ok',
      response: result.trim(),
      latencyMs: Math.round(durationMs),
    };
  }

  async logAnalysisJob(
    contractId: string,
    analysisType: string,
    status: string,
    result?: unknown,
    error?: string,
    tokensUsed?: number,
    durationMs?: number,
  ) {
    return this.prisma.aIAnalysisJob.create({
      data: {
        contractId,
        analysisType: analysisType as 'CLAUSE_EXTRACTION',
        status,
        result: result ? (result as Record<string, unknown>) : undefined,
        error,
        tokensUsed,
        durationMs,
      },
    });
  }
}
