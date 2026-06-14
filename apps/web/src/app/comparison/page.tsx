'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { GitCompare, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Minus, Plus, X } from 'lucide-react';

interface Contract {
  id: string;
  title: string;
  type: string;
  status: string;
}

interface ClauseDiff {
  clauseType: string;
  title: string;
  changeType: 'MODIFIED' | 'ADDED' | 'REMOVED' | 'UNCHANGED';
  contractA?: string;
  contractB?: string;
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
}

interface KeyRiskChange {
  area: string;
  direction: string;
  detail: string;
}

interface ComparisonResult {
  contractATitle: string;
  contractBTitle: string;
  summary: string;
  overallSimilarityScore: number;
  riskChangeDirection: 'INCREASED' | 'DECREASED' | 'UNCHANGED';
  clauseDiffs: ClauseDiff[];
  addedClauses: string[];
  removedClauses: string[];
  keyRiskChanges: KeyRiskChange[];
  recommendation: string;
}

const changeTypeStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  ADDED:     { bg: '#F0FDF4', text: '#16A34A', icon: <Plus size={12} /> },
  REMOVED:   { bg: '#FEF2F2', text: '#DC2626', icon: <X size={12} /> },
  MODIFIED:  { bg: '#FFFBEB', text: '#D97706', icon: <GitCompare size={12} /> },
  UNCHANGED: { bg: '#F9FAFB', text: '#6B7280', icon: <Minus size={12} /> },
};

const significanceColor: Record<string, string> = {
  HIGH: '#DC2626',
  MEDIUM: '#D97706',
  LOW: '#6B7280',
};

export default function ComparisonPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractAId, setContractAId] = useState('');
  const [contractBId, setContractBId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState('');
  const [expandedClause, setExpandedClause] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/contracts?limit=100').then((r) => setContracts(r.data.data || []));
  }, []);

  const handleCompare = async () => {
    if (!contractAId || !contractBId) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const r = await apiClient.post('/comparison/contracts', { contractAId, contractBId });
      setResult(r.data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>Contract Comparison</h1>
        <p className="text-sm mt-0.5" style={{ color: '#888' }}>AI-powered side-by-side contract analysis</p>
      </div>

      {/* Selector */}
      <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4" style={{ borderColor: '#E8E4DC' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Contract A (Base)', value: contractAId, onChange: setContractAId },
            { label: 'Contract B (Comparison)', value: contractBId, onChange: setContractBId },
          ].map(({ label, value, onChange }) => (
            <div key={label}>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#888' }}>{label}</label>
              <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E4DC', color: '#3A3A3A', focusRingColor: '#C5A55A' } as React.CSSProperties}
              >
                <option value="">Select a contract...</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button
          onClick={handleCompare}
          disabled={!contractAId || !contractBId || loading || contractAId === contractBId}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: '#1B2A4A' }}
        >
          <GitCompare size={16} />
          {loading ? 'Analyzing...' : 'Compare Contracts'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Header cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: '#E8E4DC' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#888' }}>Similarity Score</p>
              <p className="text-3xl font-bold" style={{ color: '#1B2A4A' }}>
                {Math.round(result.overallSimilarityScore * 100)}%
              </p>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: '#E8E4DC' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#888' }}>Risk Change</p>
              <div className="flex items-center gap-2">
                {result.riskChangeDirection === 'INCREASED' && <TrendingUp className="text-red-500" size={20} />}
                {result.riskChangeDirection === 'DECREASED' && <TrendingDown className="text-green-500" size={20} />}
                {result.riskChangeDirection === 'UNCHANGED' && <Minus className="text-gray-400" size={20} />}
                <span className="text-lg font-bold" style={{
                  color: result.riskChangeDirection === 'INCREASED' ? '#DC2626' :
                         result.riskChangeDirection === 'DECREASED' ? '#16A34A' : '#6B7280',
                }}>
                  {result.riskChangeDirection}
                </span>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: '#E8E4DC' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#888' }}>Clause Changes</p>
              <p className="text-3xl font-bold" style={{ color: '#1B2A4A' }}>
                {result.clauseDiffs.filter((d) => d.changeType !== 'UNCHANGED').length}
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: '#E8E4DC' }}>
            <h2 className="text-sm font-semibold mb-2" style={{ color: '#1B2A4A' }}>AI Summary</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#555' }}>{result.summary}</p>
            {result.recommendation && (
              <div className="mt-3 p-3 rounded-lg" style={{ background: '#F7F5F0', borderLeft: '3px solid #C5A55A' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#C5A55A' }}>RECOMMENDATION</p>
                <p className="text-sm" style={{ color: '#3A3A3A' }}>{result.recommendation}</p>
              </div>
            )}
          </div>

          {/* Added / Removed clauses */}
          {(result.addedClauses.length > 0 || result.removedClauses.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.addedClauses.length > 0 && (
                <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: '#E8E4DC' }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1" style={{ color: '#16A34A' }}>
                    <Plus size={12} /> Added in Contract B
                  </h3>
                  <ul className="space-y-1">
                    {result.addedClauses.map((c) => (
                      <li key={c} className="text-xs px-2 py-1 rounded" style={{ background: '#F0FDF4', color: '#16A34A' }}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.removedClauses.length > 0 && (
                <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: '#E8E4DC' }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1" style={{ color: '#DC2626' }}>
                    <X size={12} /> Removed from Contract A
                  </h3>
                  <ul className="space-y-1">
                    {result.removedClauses.map((c) => (
                      <li key={c} className="text-xs px-2 py-1 rounded" style={{ background: '#FEF2F2', color: '#DC2626' }}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Key risk changes */}
          {result.keyRiskChanges.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: '#E8E4DC' }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#1B2A4A' }}>Key Risk Changes</h2>
              <div className="space-y-2">
                {result.keyRiskChanges.map((rc, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#FAFAF8' }}>
                    {rc.direction === 'INCREASED' ? (
                      <TrendingUp size={16} className="mt-0.5 shrink-0 text-red-500" />
                    ) : rc.direction === 'DECREASED' ? (
                      <TrendingDown size={16} className="mt-0.5 shrink-0 text-green-500" />
                    ) : (
                      <Minus size={16} className="mt-0.5 shrink-0 text-gray-400" />
                    )}
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#1B2A4A' }}>{rc.area}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#666' }}>{rc.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clause diffs */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: '#E8E4DC' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: '#F0EDE8', background: '#FAFAF8' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold" style={{ color: '#1B2A4A' }}>
                  Clause-by-Clause Comparison
                </h2>
                <div className="flex gap-3 text-xs">
                  <span style={{ color: '#888' }}>A: <strong>{result.contractATitle}</strong></span>
                  <span style={{ color: '#888' }}>B: <strong>{result.contractBTitle}</strong></span>
                </div>
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: '#F0EDE8' }}>
              {result.clauseDiffs.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle size={28} className="mx-auto mb-2 text-green-400" />
                  <p className="text-sm" style={{ color: '#888' }}>No clause differences detected.</p>
                </div>
              ) : (
                result.clauseDiffs.map((diff, i) => {
                  const style = changeTypeStyles[diff.changeType] || changeTypeStyles.UNCHANGED;
                  const key = `${diff.clauseType}-${i}`;
                  const expanded = expandedClause === key;
                  return (
                    <div key={key}>
                      <button
                        className="w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedClause(expanded ? null : key)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: style.bg, color: style.text }}>
                              {style.icon}
                              {diff.changeType}
                            </span>
                            <span className="text-sm font-medium" style={{ color: '#1B2A4A' }}>{diff.title}</span>
                            <span className="text-xs" style={{ color: '#AAA' }}>{diff.clauseType}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {diff.significance !== 'LOW' && (
                              <span className="text-xs font-semibold"
                                style={{ color: significanceColor[diff.significance] }}>
                                {diff.significance}
                              </span>
                            )}
                            {diff.significance === 'HIGH' && <AlertTriangle size={14} className="text-red-500" />}
                          </div>
                        </div>
                      </button>
                      {expanded && (
                        <div className="px-5 pb-4 space-y-3">
                          {diff.changeType !== 'ADDED' && diff.contractA && (
                            <div className="p-3 rounded-lg text-xs" style={{ background: '#FEF2F2', color: '#991B1B' }}>
                              <p className="font-semibold mb-1">Contract A</p>
                              <p>{diff.contractA}</p>
                            </div>
                          )}
                          {diff.changeType !== 'REMOVED' && diff.contractB && (
                            <div className="p-3 rounded-lg text-xs" style={{ background: '#F0FDF4', color: '#166534' }}>
                              <p className="font-semibold mb-1">Contract B</p>
                              <p>{diff.contractB}</p>
                            </div>
                          )}
                          {diff.explanation && (
                            <p className="text-xs" style={{ color: '#666' }}>{diff.explanation}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
