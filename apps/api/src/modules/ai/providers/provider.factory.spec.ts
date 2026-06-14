import { ConfigService } from '@nestjs/config';
import { createProvider } from './provider.factory';
import { OpenAIProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { OllamaProvider } from './ollama.provider';
import { OpenAICompatibleProvider } from './openai-compatible.provider';

const mockConfig = (overrides: Record<string, string> = {}) => ({
  get: jest.fn((key: string) => overrides[key]),
}) as unknown as ConfigService;

describe('AI Provider Factory', () => {
  describe('createProvider', () => {
    it('should create an OpenAI provider', () => {
      const config = mockConfig({ OPENAI_API_KEY: 'sk-test-key' });
      const provider = createProvider('openai', config);
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.getProviderName()).toBe('openai');
    });

    it('should create an Anthropic provider', () => {
      const config = mockConfig({ ANTHROPIC_API_KEY: 'sk-ant-test' });
      const provider = createProvider('anthropic', config);
      expect(provider).toBeInstanceOf(AnthropicProvider);
      expect(provider.getProviderName()).toBe('anthropic');
    });

    it('should create an Ollama provider', () => {
      const config = mockConfig({ OLLAMA_MODEL: 'llama3.1', OLLAMA_BASE_URL: 'http://localhost:11434' });
      const provider = createProvider('ollama', config);
      expect(provider).toBeInstanceOf(OllamaProvider);
      expect(provider.getProviderName()).toBe('ollama');
    });

    it('should create an OpenAI-compatible provider', () => {
      const config = mockConfig({
        OPENAI_COMPAT_BASE_URL: 'http://localhost:1234/v1',
        OPENAI_COMPAT_MODEL: 'local-llm',
      });
      const provider = createProvider('openai-compatible', config);
      expect(provider).toBeInstanceOf(OpenAICompatibleProvider);
      expect(provider.getProviderName()).toBe('openai-compatible');
    });

    it('should respect overrides for openai-compatible provider', () => {
      const config = mockConfig({});
      const provider = createProvider('openai-compatible', config, {
        baseUrl: 'http://custom:8080/v1',
        model: 'my-model',
        apiKey: 'my-key',
      });
      expect(provider).toBeInstanceOf(OpenAICompatibleProvider);
      expect(provider.validateConfig()).toBe(true);
    });

    it('should throw for unknown provider', () => {
      const config = mockConfig({});
      expect(() => createProvider('unknown' as 'openai', config)).toThrow();
    });
  });

  describe('Ollama provider', () => {
    it('should use default localhost URL', () => {
      const provider = new OllamaProvider({});
      expect(provider.validateConfig()).toBe(true);
      expect(provider.getProviderName()).toBe('ollama');
    });
  });

  describe('OpenAICompatible provider', () => {
    it('should validate config with base URL and model', () => {
      const provider = new OpenAICompatibleProvider({
        baseUrl: 'http://localhost:8080/v1',
        model: 'my-model',
      });
      expect(provider.validateConfig()).toBe(true);
    });

    it('should fail validation without base URL', () => {
      const provider = new OpenAICompatibleProvider({
        baseUrl: '',
        model: 'my-model',
      });
      expect(provider.validateConfig()).toBe(false);
    });

    it('should fail validation without model', () => {
      const provider = new OpenAICompatibleProvider({
        baseUrl: 'http://localhost:8080/v1',
        model: '',
      });
      expect(provider.validateConfig()).toBe(false);
    });
  });
});
