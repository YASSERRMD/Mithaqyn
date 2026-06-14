'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader, Zap } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface ProviderInfo {
  name: string;
  label: string;
  configured: boolean;
  models: string[];
}

interface TestResult {
  provider: string;
  status: 'ok' | 'error';
  response?: string;
  latencyMs?: number;
  error?: string;
}

export default function AIProvidersPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});

  useEffect(() => {
    apiClient
      .get('/ai/providers')
      .then((r) => setProviders(r.data))
      .finally(() => setLoading(false));
  }, []);

  async function testProvider(name: string) {
    setTesting((prev) => ({ ...prev, [name]: true }));
    try {
      const res = await apiClient.post('/ai/providers/test', { provider: name });
      setResults((prev) => ({ ...prev, [name]: res.data }));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setResults((prev) => ({
        ...prev,
        [name]: { provider: name, status: 'error', error: err.response?.data?.message || err.message },
      }));
    } finally {
      setTesting((prev) => ({ ...prev, [name]: false }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: '#AAA' }}>Loading providers...</p>
      </div>
    );
  }

  const configured = providers.filter((p) => p.configured);
  const unconfigured = providers.filter((p) => !p.configured);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>AI Providers</h1>
        <p className="text-sm mt-0.5" style={{ color: '#888' }}>
          {configured.length} of {providers.length} providers configured
        </p>
      </div>

      {configured.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#888' }}>
            Configured
          </h2>
          <div className="space-y-3">
            {configured.map((p) => (
              <ProviderCard key={p.name} provider={p} testing={!!testing[p.name]} result={results[p.name]} onTest={() => testProvider(p.name)} />
            ))}
          </div>
        </div>
      )}

      {unconfigured.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#AAA' }}>
            Not Configured
          </h2>
          <div className="space-y-3">
            {unconfigured.map((p) => (
              <ProviderCard key={p.name} provider={p} testing={false} result={undefined} onTest={() => {}} />
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">OpenAI-Compatible Endpoint</h3>
        <p className="text-xs text-blue-700">
          Set <code className="font-mono bg-blue-100 px-1 rounded">OPENAI_COMPAT_BASE_URL</code>,{' '}
          <code className="font-mono bg-blue-100 px-1 rounded">OPENAI_COMPAT_MODEL</code>, and optionally{' '}
          <code className="font-mono bg-blue-100 px-1 rounded">OPENAI_COMPAT_API_KEY</code> in your .env to connect
          any OpenAI-compatible endpoint: Ollama, LM Studio, vLLM, OpenRouter, LiteLLM, Fireworks, or your enterprise gateway.
        </p>
      </div>
    </div>
  );
}

function ProviderCard({
  provider,
  testing,
  result,
  onTest,
}: {
  provider: ProviderInfo;
  testing: boolean;
  result?: TestResult;
  onTest: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between p-4 bg-white rounded-xl border shadow-sm"
      style={{ borderColor: '#E8E4DC' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: provider.configured ? '#22C55E' : '#D1D5DB' }}
        />
        <div>
          <p className="text-sm font-medium" style={{ color: '#1B2A4A' }}>{provider.label}</p>
          <p className="text-xs" style={{ color: '#AAA' }}>{provider.models.slice(0, 2).join(', ')}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {result && (
          <div className="flex items-center gap-1.5 text-xs">
            {result.status === 'ok' ? (
              <>
                <CheckCircle size={14} className="text-green-500" />
                <span className="text-green-700">{result.latencyMs}ms</span>
              </>
            ) : (
              <>
                <XCircle size={14} className="text-red-500" />
                <span className="text-red-700 max-w-32 truncate">{result.error}</span>
              </>
            )}
          </div>
        )}
        {provider.configured && (
          <button
            onClick={onTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50"
            style={{ borderColor: '#C5A55A', color: '#A8873A' }}
          >
            {testing ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
            {testing ? 'Testing...' : 'Test'}
          </button>
        )}
        {!provider.configured && (
          <span className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: '#E8E4DC', color: '#CCC' }}>
            Not configured
          </span>
        )}
      </div>
    </div>
  );
}
