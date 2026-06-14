# Mithaqyn — AI Provider Configuration

Mithaqyn supports 11 AI providers through a clean abstraction layer. Configure any combination in your `.env`.

## Supported Providers

| Provider | Chat | JSON | Embeddings | Streaming |
|----------|------|------|------------|-----------|
| OpenAI | ✅ | ✅ | ✅ | ✅ |
| Azure OpenAI | ✅ | ✅ | ✅ | ✅ |
| Anthropic Claude | ✅ | ✅ | ❌ | ✅ |
| Google Gemini | ✅ | ✅ | ✅ | ✅ |
| Mistral AI | ✅ | ✅ | ✅ | — |
| Cohere | ✅ | ✅ | ✅ | — |
| Groq | ✅ | ✅ | ❌ | ✅ |
| Together AI | ✅ | ✅ | ✅ | — |
| DeepSeek | ✅ | ✅ | ❌ | — |
| Ollama (local) | ✅ | ✅ | ✅ | ✅ |
| OpenAI-Compatible | ✅ | ✅ | ✅* | ✅ |

*Embeddings require setting `OPENAI_COMPAT_EMBEDDING_MODEL`.

## Provider Priority

When multiple providers are configured, Mithaqyn picks the first available in this order:
`openai → anthropic → google-gemini → mistral → cohere → groq → together → deepseek → azure-openai → ollama → openai-compatible`

## OpenAI-Compatible Endpoint

The `openai-compatible` provider works with **any server that implements the OpenAI REST API**:

### Ollama (OpenAI-compatible endpoint)

```env
OPENAI_COMPAT_BASE_URL=http://localhost:11434/v1
OPENAI_COMPAT_API_KEY=ollama
OPENAI_COMPAT_MODEL=llama3.1
```

### LM Studio

```env
OPENAI_COMPAT_BASE_URL=http://localhost:1234/v1
OPENAI_COMPAT_API_KEY=lm-studio
OPENAI_COMPAT_MODEL=local-model
```

### vLLM

```env
OPENAI_COMPAT_BASE_URL=http://your-vllm-server:8000/v1
OPENAI_COMPAT_API_KEY=your-token
OPENAI_COMPAT_MODEL=meta-llama/Llama-3.1-8B-Instruct
```

### OpenRouter

```env
OPENAI_COMPAT_BASE_URL=https://openrouter.ai/api/v1
OPENAI_COMPAT_API_KEY=sk-or-v1-...
OPENAI_COMPAT_MODEL=anthropic/claude-3.5-sonnet
```

### LiteLLM Proxy

```env
OPENAI_COMPAT_BASE_URL=http://localhost:4000/v1
OPENAI_COMPAT_API_KEY=sk-litellm-...
OPENAI_COMPAT_MODEL=gpt-4o
```

### Fireworks AI

```env
OPENAI_COMPAT_BASE_URL=https://api.fireworks.ai/inference/v1
OPENAI_COMPAT_API_KEY=fw_...
OPENAI_COMPAT_MODEL=accounts/fireworks/models/llama-v3p1-70b-instruct
```

### Enterprise Gateway

Any internal gateway that exposes the OpenAI API spec:

```env
OPENAI_COMPAT_BASE_URL=https://your-enterprise-gateway.internal/v1
OPENAI_COMPAT_API_KEY=your-internal-key
OPENAI_COMPAT_MODEL=approved-model-name
OPENAI_COMPAT_EMBEDDING_MODEL=approved-embedding-model
```

## Testing Providers

Via Admin UI: Navigate to **Admin → AI Providers** and click **Test** on any configured provider.

Via API:
```bash
curl -X POST http://localhost:3001/api/ai/providers/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}'
```

## AI Prompt Requirements

All AI prompts in Mithaqyn:
- Return strict JSON with confidence scores
- Include source text excerpts where possible
- Mark outputs as "AI-assisted, not legal advice"
- State uncertainty clearly
- Never hallucinate legal conclusions
