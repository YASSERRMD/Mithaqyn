const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET'] as const;

const WARNINGS = [
  { key: 'JWT_SECRET', check: (v: string) => v.length < 32, msg: 'JWT_SECRET should be at least 32 characters for security' },
] as const;

export function validateEnv(): void {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Copy apps/api/.env.example to apps/api/.env and fill in the values.',
    );
  }

  for (const { key, check, msg } of WARNINGS) {
    const val = process.env[key];
    if (val && check(val)) {
      console.warn(`[ENV WARNING] ${msg}`);
    }
  }

  const hasProvider = [
    'OPENAI_API_KEY',
    'AZURE_OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GEMINI_API_KEY',
    'MISTRAL_API_KEY',
    'COHERE_API_KEY',
    'GROQ_API_KEY',
    'TOGETHER_API_KEY',
    'DEEPSEEK_API_KEY',
    'OPENAI_COMPAT_BASE_URL',
  ].some((key) => process.env[key]);

  if (!hasProvider) {
    console.warn(
      '[ENV WARNING] No AI provider configured. Set at least one provider key in .env.\n' +
      'For local usage, set OPENAI_COMPAT_BASE_URL=http://localhost:11434/v1 for Ollama.',
    );
  }
}
