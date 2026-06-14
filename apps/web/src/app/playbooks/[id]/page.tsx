'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  X,
  Play,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Shield,
  BookOpen,
} from 'lucide-react';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlaybookRule {
  id: string;
  ruleType: string;
  clauseType: string;
  description: string;
  standardText?: string;
  fallbackText?: string;
  priority: number;
}

interface PlaybookDetail {
  id: string;
  name: string;
  description?: string;
  contractType?: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: { firstName: string; lastName: string; email: string };
  rules: PlaybookRule[];
}

interface CheckResult {
  ruleId: string;
  clauseType: string;
  ruleType: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'MISSING' | 'ACCEPTABLE';
  explanation: string;
  recommendation: string;
}

interface CheckResponse {
  playbookName: string;
  overallCompliance: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
  summary: string;
  results: CheckResult[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RULE_TYPE_ORDER = ['MUST_HAVE', 'MUST_NOT_HAVE', 'PREFERRED', 'FALLBACK_POSITION'];

const RULE_TYPE_LABELS: Record<string, string> = {
  MUST_HAVE:         'Must Have',
  MUST_NOT_HAVE:     'Must Not Have',
  PREFERRED:         'Preferred',
  FALLBACK_POSITION: 'Fallback Position',
};

const RULE_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  MUST_HAVE:         { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
  MUST_NOT_HAVE:     { bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA' },
  PREFERRED:         { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  FALLBACK_POSITION: { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; bg: string; text: string }
> = {
  COMPLIANT:     { label: 'Compliant',     icon: CheckCircle,   bg: '#F0FDF4', text: '#166534' },
  NON_COMPLIANT: { label: 'Non-Compliant', icon: AlertCircle,   bg: '#FEF2F2', text: '#991B1B' },
  MISSING:       { label: 'Missing',       icon: AlertTriangle, bg: '#FFFBEB', text: '#92400E' },
  ACCEPTABLE:    { label: 'Acceptable',    icon: Info,          bg: '#EFF6FF', text: '#1E40AF' },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.MISSING;
  const Icon = config.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: config.bg, color: config.text }}
    >
      <Icon size={11} />
      {config.label}
    </span>
  );
}

function RuleTypeBadge({ type }: { type: string }) {
  const colors = RULE_TYPE_COLORS[type] ?? RULE_TYPE_COLORS.PREFERRED;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border"
      style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      {RULE_TYPE_LABELS[type] ?? type}
    </span>
  );
}

function OverallBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    COMPLIANT:     { bg: '#F0FDF4', text: '#166534', label: 'Overall: Compliant' },
    PARTIAL:       { bg: '#FFFBEB', text: '#92400E', label: 'Overall: Partial Compliance' },
    NON_COMPLIANT: { bg: '#FEF2F2', text: '#991B1B', label: 'Overall: Non-Compliant' },
  };
  const c = map[status] ?? map.PARTIAL;
  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold"
      style={{ background: c.bg, color: c.text }}
    >
      <Shield size={14} />
      {c.label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlaybookDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [playbook, setPlaybook] = useState<PlaybookDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Add rule form
  const [showAddRule, setShowAddRule] = useState(false);
  const [addingRule, setAddingRule] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    ruleType: 'MUST_HAVE',
    clauseType: '',
    description: '',
    standardText: '',
    fallbackText: '',
    priority: 0,
  });

  // Playbook check
  const [contractId, setContractId] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResponse | null>(null);
  const [checkError, setCheckError] = useState('');

  async function loadPlaybook() {
    setLoading(true);
    try {
      const res = await api.get(`/playbooks/${id}`);
      setPlaybook(res.data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadPlaybook();
  }, [id]);

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault();
    if (!ruleForm.clauseType.trim() || !ruleForm.description.trim()) return;
    setAddingRule(true);
    try {
      await api.post(`/playbooks/${id}/rules`, {
        ruleType: ruleForm.ruleType,
        clauseType: ruleForm.clauseType.trim(),
        description: ruleForm.description.trim(),
        standardText: ruleForm.standardText.trim() || undefined,
        fallbackText: ruleForm.fallbackText.trim() || undefined,
        priority: Number(ruleForm.priority),
      });
      setRuleForm({
        ruleType: 'MUST_HAVE',
        clauseType: '',
        description: '',
        standardText: '',
        fallbackText: '',
        priority: 0,
      });
      setShowAddRule(false);
      await loadPlaybook();
    } catch {
      // handled
    } finally {
      setAddingRule(false);
    }
  }

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!contractId.trim()) return;
    setChecking(true);
    setCheckError('');
    setCheckResult(null);
    try {
      const res = await api.post(
        `/contracts/${contractId.trim()}/playbook-check/${id}`,
      );
      setCheckResult(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to run playbook check';
      setCheckError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: '#F0EDE8' }} />
        <div className="h-40 rounded-xl animate-pulse" style={{ background: '#F0EDE8' }} />
      </div>
    );
  }

  if (!playbook) {
    return (
      <div className="text-center py-20">
        <p style={{ color: '#888' }}>Playbook not found.</p>
        <Link href="/playbooks" className="text-sm underline mt-2 block" style={{ color: '#C5A55A' }}>
          Back to Playbooks
        </Link>
      </div>
    );
  }

  // Group rules by type
  const rulesByType: Record<string, PlaybookRule[]> = {};
  for (const rule of playbook.rules) {
    if (!rulesByType[rule.ruleType]) rulesByType[rule.ruleType] = [];
    rulesByType[rule.ruleType].push(rule);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <Link
        href="/playbooks"
        className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        style={{ color: '#C5A55A' }}
      >
        <ArrowLeft size={15} />
        All Playbooks
      </Link>

      {/* Header */}
      <div
        className="bg-white rounded-xl border p-6"
        style={{ borderColor: '#E8E4DC' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#F0EAD8' }}
          >
            <BookOpen size={24} style={{ color: '#C5A55A' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold leading-tight" style={{ color: '#1B2A4A' }}>
              {playbook.name}
            </h1>
            {playbook.description && (
              <p className="text-sm mt-1" style={{ color: '#666' }}>
                {playbook.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-3 flex-wrap text-xs" style={{ color: '#888' }}>
              {playbook.contractType && (
                <span
                  className="px-2 py-0.5 rounded font-semibold"
                  style={{ background: '#F0EAD8', color: '#C5A55A' }}
                >
                  {playbook.contractType}
                </span>
              )}
              <span>{playbook.rules.length} rules</span>
              <span>Created {new Date(playbook.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rules Section */}
      <div
        className="bg-white rounded-xl border"
        style={{ borderColor: '#E8E4DC' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: '#E8E4DC' }}
        >
          <h2 className="font-semibold" style={{ color: '#1B2A4A' }}>
            Playbook Rules
          </h2>
          <button
            onClick={() => setShowAddRule(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium"
            style={{ background: '#1B2A4A' }}
          >
            <Plus size={14} />
            Add Rule
          </button>
        </div>

        {playbook.rules.length === 0 ? (
          <div className="p-12 text-center">
            <Shield size={36} className="mx-auto mb-3" style={{ color: '#D4C8A8' }} />
            <p className="text-sm font-medium" style={{ color: '#888' }}>No rules defined yet</p>
            <p className="text-xs mt-1" style={{ color: '#BBB' }}>
              Add rules to specify what clauses must, should, or must not appear in contracts.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#F0EDE8' }}>
            {RULE_TYPE_ORDER.filter((rt) => rulesByType[rt]?.length > 0).map((ruleType) => (
              <div key={ruleType} className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <RuleTypeBadge type={ruleType} />
                  <span className="text-xs" style={{ color: '#888' }}>
                    ({rulesByType[ruleType].length} rule
                    {rulesByType[ruleType].length !== 1 ? 's' : ''})
                  </span>
                </div>
                <div className="space-y-3">
                  {rulesByType[ruleType].map((rule) => (
                    <div
                      key={rule.id}
                      className="rounded-lg border p-4"
                      style={{ borderColor: '#F0EDE8', background: '#FAFAF8' }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold" style={{ color: '#1B2A4A' }}>
                              {rule.clauseType}
                            </span>
                            {rule.priority > 0 && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{ background: '#F0EAD8', color: '#C5A55A' }}
                              >
                                P{rule.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-sm" style={{ color: '#555' }}>
                            {rule.description}
                          </p>
                          {rule.standardText && (
                            <div className="mt-2">
                              <p className="text-xs font-medium mb-1" style={{ color: '#888' }}>
                                Standard Language:
                              </p>
                              <p
                                className="text-xs p-2 rounded border font-mono leading-relaxed"
                                style={{ borderColor: '#E8E4DC', background: '#F7F5F0', color: '#555' }}
                              >
                                {rule.standardText}
                              </p>
                            </div>
                          )}
                          {rule.fallbackText && (
                            <div className="mt-2">
                              <p className="text-xs font-medium mb-1" style={{ color: '#888' }}>
                                Fallback Position:
                              </p>
                              <p
                                className="text-xs p-2 rounded border font-mono leading-relaxed"
                                style={{ borderColor: '#E8E4DC', background: '#F7F5F0', color: '#555' }}
                              >
                                {rule.fallbackText}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contract Check Section */}
      <div
        className="bg-white rounded-xl border"
        style={{ borderColor: '#E8E4DC' }}
      >
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: '#E8E4DC' }}
        >
          <h2 className="font-semibold" style={{ color: '#1B2A4A' }}>
            Check Contract Against Playbook
          </h2>
          <p className="text-xs mt-0.5" style={{ color: '#888' }}>
            Enter a Contract ID to run an AI-powered compliance check against this playbook's rules
          </p>
        </div>
        <div className="p-6">
          <form onSubmit={handleCheck} className="flex gap-3 mb-6">
            <input
              type="text"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              placeholder="Enter Contract ID..."
              className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none"
              style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
            />
            <button
              type="submit"
              disabled={checking || !contractId.trim() || playbook.rules.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: '#C5A55A' }}
            >
              {checking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Play size={14} />
                  Run Check
                </>
              )}
            </button>
          </form>

          {checkError && (
            <div
              className="rounded-lg p-4 mb-4 text-sm"
              style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}
            >
              {checkError}
            </div>
          )}

          {checkResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div
                className="rounded-lg p-4"
                style={{ background: '#F7F5F0', border: '1px solid #E8E4DC' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <OverallBadge status={checkResult.overallCompliance} />
                </div>
                <p className="text-sm" style={{ color: '#555' }}>
                  {checkResult.summary}
                </p>
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: '#E8E4DC' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #E8E4DC' }}>
                      {['Clause Type', 'Rule Type', 'Status', 'Explanation', 'Recommendation'].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                            style={{ color: '#888' }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {checkResult.results.map((r, i) => (
                      <tr
                        key={r.ruleId ?? i}
                        className="border-b last:border-0"
                        style={{ borderColor: '#F0EDE8' }}
                      >
                        <td className="px-4 py-3 font-medium" style={{ color: '#1B2A4A' }}>
                          {r.clauseType}
                        </td>
                        <td className="px-4 py-3">
                          <RuleTypeBadge type={r.ruleType} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3 text-xs max-w-xs" style={{ color: '#555' }}>
                          {r.explanation}
                        </td>
                        <td className="px-4 py-3 text-xs max-w-xs" style={{ color: '#555' }}>
                          {r.recommendation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Rule Modal */}
      {showAddRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div
              className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white"
              style={{ borderColor: '#E8E4DC' }}
            >
              <h2 className="text-base font-semibold" style={{ color: '#1B2A4A' }}>
                Add Playbook Rule
              </h2>
              <button onClick={() => setShowAddRule(false)} className="p-1 rounded hover:bg-gray-100">
                <X size={18} style={{ color: '#888' }} />
              </button>
            </div>
            <form onSubmit={handleAddRule} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>
                    Rule Type *
                  </label>
                  <select
                    value={ruleForm.ruleType}
                    onChange={(e) => setRuleForm({ ...ruleForm, ruleType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                    style={{ borderColor: '#D4C8A8', background: '#FAFAF8', color: '#3A3A3A' }}
                  >
                    <option value="MUST_HAVE">Must Have</option>
                    <option value="MUST_NOT_HAVE">Must Not Have</option>
                    <option value="PREFERRED">Preferred</option>
                    <option value="FALLBACK_POSITION">Fallback Position</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>
                    Priority
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={ruleForm.priority}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                    style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>
                  Clause Type *
                </label>
                <input
                  type="text"
                  required
                  value={ruleForm.clauseType}
                  onChange={(e) => setRuleForm({ ...ruleForm, clauseType: e.target.value })}
                  placeholder="e.g. Liability Cap, Indemnification, Governing Law"
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                  style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>
                  Rule Description *
                </label>
                <textarea
                  required
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  placeholder="Describe what this rule requires or prohibits..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none"
                  style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>
                  Standard Language (optional)
                </label>
                <textarea
                  value={ruleForm.standardText}
                  onChange={(e) => setRuleForm({ ...ruleForm, standardText: e.target.value })}
                  placeholder="Preferred clause language to check against..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none font-mono"
                  style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>
                  Fallback Position (optional)
                </label>
                <textarea
                  value={ruleForm.fallbackText}
                  onChange={(e) => setRuleForm({ ...ruleForm, fallbackText: e.target.value })}
                  placeholder="Minimum acceptable language if standard can't be achieved..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none font-mono"
                  style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRule(false)}
                  className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium"
                  style={{ borderColor: '#D4C8A8', color: '#555' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingRule}
                  className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
                  style={{ background: '#1B2A4A' }}
                >
                  {addingRule ? 'Adding...' : 'Add Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
