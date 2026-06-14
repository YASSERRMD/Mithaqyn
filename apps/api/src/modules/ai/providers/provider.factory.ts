import { ConfigService } from '@nestjs/config';
import { IAIProvider } from '../interfaces/ai-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { AzureOpenAIProvider } from './azure-openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { GeminiProvider } from './gemini.provider';
import { MistralProvider } from './mistral.provider';
import { CohereProvider } from './cohere.provider';
import { GroqProvider } from './groq.provider';
import { TogetherProvider } from './together.provider';
import { DeepSeekProvider } from './deepseek.provider';
import { OllamaProvider } from './ollama.provider';
import { OpenAICompatibleProvider } from './openai-compatible.provider';

export type ProviderName =
  | 'openai'
  | 'azure-openai'
  | 'anthropic'
  | 'google-gemini'
  | 'mistral'
  | 'cohere'
  | 'groq'
  | 'together'
  | 'deepseek'
  | 'ollama'
  | 'openai-compatible';

export function createProvider(
  providerName: ProviderName,
  config: ConfigService,
  overrides?: Record<string, string>,
): IAIProvider {
  switch (providerName) {
    case 'openai':
      return new OpenAIProvider({
        apiKey: overrides?.apiKey || config.get<string>('OPENAI_API_KEY') || '',
        model: overrides?.model || config.get<string>('OPENAI_MODEL'),
        embeddingModel: overrides?.embeddingModel || config.get<string>('OPENAI_EMBEDDING_MODEL'),
        baseUrl: overrides?.baseUrl || config.get<string>('OPENAI_BASE_URL'),
      });

    case 'azure-openai':
      return new AzureOpenAIProvider({
        apiKey: overrides?.apiKey || config.get<string>('AZURE_OPENAI_API_KEY') || '',
        endpoint: overrides?.endpoint || config.get<string>('AZURE_OPENAI_ENDPOINT') || '',
        deployment: overrides?.deployment || config.get<string>('AZURE_OPENAI_DEPLOYMENT') || '',
        apiVersion: config.get<string>('AZURE_OPENAI_API_VERSION'),
        embeddingDeployment: config.get<string>('AZURE_OPENAI_EMBEDDING_DEPLOYMENT'),
      });

    case 'anthropic':
      return new AnthropicProvider({
        apiKey: overrides?.apiKey || config.get<string>('ANTHROPIC_API_KEY') || '',
        model: overrides?.model || config.get<string>('ANTHROPIC_MODEL'),
      });

    case 'google-gemini':
      return new GeminiProvider({
        apiKey: overrides?.apiKey || config.get<string>('GOOGLE_GEMINI_API_KEY') || '',
        model: overrides?.model || config.get<string>('GOOGLE_GEMINI_MODEL'),
      });

    case 'mistral':
      return new MistralProvider({
        apiKey: overrides?.apiKey || config.get<string>('MISTRAL_API_KEY') || '',
        model: overrides?.model || config.get<string>('MISTRAL_MODEL'),
      });

    case 'cohere':
      return new CohereProvider({
        apiKey: overrides?.apiKey || config.get<string>('COHERE_API_KEY') || '',
        model: overrides?.model || config.get<string>('COHERE_MODEL'),
      });

    case 'groq':
      return new GroqProvider({
        apiKey: overrides?.apiKey || config.get<string>('GROQ_API_KEY') || '',
        model: overrides?.model || config.get<string>('GROQ_MODEL'),
      });

    case 'together':
      return new TogetherProvider({
        apiKey: overrides?.apiKey || config.get<string>('TOGETHER_API_KEY') || '',
        model: overrides?.model || config.get<string>('TOGETHER_MODEL'),
      });

    case 'deepseek':
      return new DeepSeekProvider({
        apiKey: overrides?.apiKey || config.get<string>('DEEPSEEK_API_KEY') || '',
        model: overrides?.model || config.get<string>('DEEPSEEK_MODEL'),
        baseUrl: overrides?.baseUrl || config.get<string>('DEEPSEEK_BASE_URL'),
      });

    case 'ollama':
      return new OllamaProvider({
        model: overrides?.model || config.get<string>('OLLAMA_MODEL'),
        baseUrl: overrides?.baseUrl || config.get<string>('OLLAMA_BASE_URL'),
      });

    case 'openai-compatible':
      return new OpenAICompatibleProvider({
        baseUrl: overrides?.baseUrl || config.get<string>('OPENAI_COMPAT_BASE_URL') || 'http://localhost:8080/v1',
        apiKey: overrides?.apiKey || config.get<string>('OPENAI_COMPAT_API_KEY'),
        model: overrides?.model || config.get<string>('OPENAI_COMPAT_MODEL') || 'default',
        embeddingModel: overrides?.embeddingModel || config.get<string>('OPENAI_COMPAT_EMBEDDING_MODEL'),
      });

    default:
      throw new Error(`Unknown AI provider: ${providerName}`);
  }
}

export function getDefaultProvider(config: ConfigService): IAIProvider {
  const preferred: ProviderName[] = [
    'openai',
    'anthropic',
    'google-gemini',
    'mistral',
    'cohere',
    'groq',
    'together',
    'deepseek',
    'azure-openai',
    'ollama',
    'openai-compatible',
  ];

  const envKeys: Record<ProviderName, string | undefined> = {
    'openai': config.get('OPENAI_API_KEY'),
    'anthropic': config.get('ANTHROPIC_API_KEY'),
    'google-gemini': config.get('GOOGLE_GEMINI_API_KEY'),
    'mistral': config.get('MISTRAL_API_KEY'),
    'cohere': config.get('COHERE_API_KEY'),
    'groq': config.get('GROQ_API_KEY'),
    'together': config.get('TOGETHER_API_KEY'),
    'deepseek': config.get('DEEPSEEK_API_KEY'),
    'azure-openai': config.get('AZURE_OPENAI_API_KEY'),
    'ollama': 'local',
    'openai-compatible': config.get('OPENAI_COMPAT_BASE_URL'),
  };

  for (const name of preferred) {
    if (envKeys[name]) {
      return createProvider(name, config);
    }
  }

  throw new Error(
    'No AI provider configured. Set at least one provider API key in .env. ' +
    'Example: OPENAI_API_KEY, ANTHROPIC_API_KEY, OLLAMA_BASE_URL, or OPENAI_COMPAT_BASE_URL.',
  );
}
