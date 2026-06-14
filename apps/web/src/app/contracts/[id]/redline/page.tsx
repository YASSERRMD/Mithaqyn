'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Zap,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  History,
  Wand2,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Clause {
  id: string;
  contractId: string;
  type: string;
  title: string;
  summary: string;
  textExcerpt: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reviewStatus: string;
}

interface RedlineChange {
  type: 'ADDITION' | 'DELETION' | 'MODIFICATION';
  original: string;
  suggested: string;
  reason: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface RedlineResult {
  originalText: string;
  redlinedText: string;
  changes: RedlineChange[];
  negotiationPosition: string;
  alternativeFallback: string;
  summary: string;
}

interface RedlineJobResponse {
  jobId: string;
  result: RedlineResult;
}

interface HistoryJob {
  id: string;
  createdAt: string;
  result: {
    clauseId: string;
    redlineResult: RedlineResult;
  };
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CONTRACT_TYPES = [
  'MASTER_AGREEMENT',
  'AMENDMENT',
  'PROCUREMENT_AGREEMENT',
  'VENDOR_AGREEMENT',
  'NDA',
  'SLA',
  'MOU',
  'LEASE',
  'EMPLOYMENT_CONTRACT',
  'CUSTOM',
];

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  HIGH:     { color: '#C0392B', bg: '#FDECEA', border: '#F5C6CB' },
  MEDIUM:   { color: '#B7660A', bg: '#FFF3CD', border: '#FFEAA7' },
  LOW:      { color: '#1D6A39', bg: '#D4EDDA', border: '#C3E6CB' },
  CRITICAL: { color: '#6A0D0D', bg: '#F8D7DA', border: '#F5C6CB' },
};

const CHANGE_TYPE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  ADDITION:     { color: '#1D6A39', bg: '#D4EDDA', label: 'Addition' },
  DELETION:     { color: '#C0392B', bg: '#FDECEA', label: 'Deletion' },
  MODIFICATION: { color: '#B7660A', bg: '#FFF3CD', label: 'Modification' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  const cfg = RISK_CONFIG[level] ?? RISK_CONFIG.LOW;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {level}
    </span>
  );
}

function ChangeBadge({ type }: { type: string }) {
  const cfg = CHANGE_TYPE_CONFIG[type] ?? { color: '#666', bg: '#F5F5F5', label: type };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

function ClauseCard({
  clause,
  selected,
  onClick,
}: {
  clause: Clause;
  selected: boolean;
  onClick: () => void;
}) {
  const riskCfg = RISK_CONFIG[clause.riskLevel] ?? RISK_CONFIG.LOW;
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border px-4 py-3 transition-all hover:shadow-sm"
      style={{
        borderColor: selected ? '#1B2A4A' : '#E8E4DC',
        background: selected ? '#EEF1F7' : '#FAFAFA',
        outline: selected ? '2px solid #1B2A4A' : 'none',
        outlineOffset: '1px',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold truncate" style={{ color: '#1B2A4A' }}>
          {clause.title}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <RiskBadge level={clause.riskLevel} />
          {selected && <ChevronRight size={12} style={{ color: '#1B2A4A' }} />}
        </div>
      </div>
      <p className="text-[11px] mt-0.5 truncate" style={{ color: '#888' }}>
        {clause.type.replace(/_/g, ' ')}
      </p>
    </button>
  );
}

function DiffPanel({
  original,
  redlined,
}: {
  original: string;
  redlined: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Original */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#F5C6CB' }}>
        <div
          className="px-4 py-2 text-xs font-bold flex items-center gap-2"
          style={{ background: '#FDECEA', color: '#C0392B', borderBottom: '1px solid #F5C6CB' }}
        >
          <AlertTriangle size={12} />
          Original
        </div>
        <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#333', minHeight: 120 }}>
          {original}
        </div>
      </div>

      {/* Redlined */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#C3E6CB' }}>
        <div
          className="px-4 py-2 text-xs font-bold flex items-center gap-2"
          style={{ background: '#D4EDDA', color: '#1D6A39', borderBottom: '1px solid #C3E6CB' }}
        >
          <CheckCircle size={12} />
          Redlined
        </div>
        <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#333', minHeight: 120 }}>
          {redlined}
        </div>
      </div>
    </div>
  );
}

function ChangesTable({ changes }: { changes: RedlineChange[] }) {
  if (changes.length === 0) return null;
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#E8E4DC' }}>
      <div
        className="px-4 py-3 text-xs font-bold"
        style={{ background: '#F5F3EE', color: '#1B2A4A', borderBottom: '1px solid #E8E4DC' }}
      >
        Suggested Changes ({changes.length})
      </div>
      <div className="divide-y" style={{ borderColor: '#E8E4DC' }}>
        {changes.map((change, idx) => (
          <div key={idx} className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <ChangeBadge type={change.type} />
              <RiskBadge level={change.riskLevel} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold mb-1" style={{ color: '#888' }}>Original</p>
                <p
                  className="text-xs p-2 rounded"
                  style={{
                    background: '#FDECEA',
                    color: '#C0392B',
                    textDecoration: change.type === 'DELETION' ? 'line-through' : 'none',
                    fontFamily: 'monospace',
                  }}
                >
                  {change.original || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold mb-1" style={{ color: '#888' }}>Suggested</p>
                <p
                  className="text-xs p-2 rounded"
                  style={{
                    background: '#D4EDDA',
                    color: '#1D6A39',
                    fontFamily: 'monospace',
                  }}
                >
                  {change.suggested || '—'}
                </p>
              </div>
            </div>
            <p className="text-xs" style={{ color: '#555' }}>
              <span className="font-semibold" style={{ color: '#1B2A4A' }}>Reason: </span>
              {change.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NegotiationPositionCard({ result }: { result: RedlineResult }) {
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: '#E8E4DC', background: '#FAFAFA' }}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#C5A55A' }}>
          Preferred Position
        </p>
        <p className="text-sm" style={{ color: '#333' }}>{result.negotiationPosition}</p>
      </div>
      <div
        className="rounded-lg p-3"
        style={{ background: '#EEF1F7', borderLeft: '3px solid #1B2A4A' }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#1B2A4A' }}>
          Fallback Position
        </p>
        <p className="text-xs" style={{ color: '#555' }}>{result.alternativeFallback}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RedlinePage() {
  const { id: contractId } = useParams<{ id: string }>();

  // Clause list
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [clausesLoading, setClausesLoading] = useState(true);
  const [clausesError, setClausesError] = useState<string | null>(null);

  // Selected clause
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);

  // Context form
  const [counterpartyType, setCounterpartyType] = useState<string>('');
  const [contractType, setContractType] = useState<string>('');
  const [partyPosition, setPartyPosition] = useState<'DRAFTING_PARTY' | 'REVIEWING_PARTY'>('REVIEWING_PARTY');

  // Redline state
  const [redlineResult, setRedlineResult] = useState<RedlineResult | null>(null);
  const [redlineJobId, setRedlineJobId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // Accept state
  const [accepting, setAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchClauses = useCallback(async () => {
    setClausesLoading(true);
    setClausesError(null);
    try {
      const res = await apiClient.get(`/contracts/${contractId}/clauses`);
      setClauses(res.data);
    } catch {
      setClausesError('Failed to load clauses. Please extract clauses from the contract first.');
    } finally {
      setClausesLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchClauses();
  }, [fetchClauses]);

  function handleSelectClause(clause: Clause) {
    setSelectedClause(clause);
    setRedlineResult(null);
    setRedlineJobId(null);
    setRunError(null);
    setAcceptSuccess(false);
    setShowHistory(false);
  }

  async function handleRunRedline() {
    if (!selectedClause) return;
    setRunning(true);
    setRunError(null);
    setRedlineResult(null);
    setAcceptSuccess(false);

    try {
      const body: Record<string, string> = {};
      if (counterpartyType) body.counterpartyType = counterpartyType;
      if (contractType) body.contractType = contractType;
      if (partyPosition) body.partyPosition = partyPosition;

      const res = await apiClient.post<RedlineJobResponse>(
        `/clauses/${selectedClause.id}/redline`,
        body,
      );
      setRedlineResult(res.data.result);
      setRedlineJobId(res.data.jobId);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to run AI redline. Please try again.';
      setRunError(msg);
    } finally {
      setRunning(false);
    }
  }

  async function handleAcceptRedline() {
    if (!selectedClause || !redlineJobId) return;
    setAccepting(true);
    try {
      await apiClient.post(`/clauses/${selectedClause.id}/redline/${redlineJobId}/accept`);
      setAcceptSuccess(true);
      // Update the clause in local state
      setClauses((prev) =>
        prev.map((c) =>
          c.id === selectedClause.id
            ? { ...c, textExcerpt: redlineResult?.redlinedText ?? c.textExcerpt, reviewStatus: 'APPROVED' }
            : c,
        ),
      );
      setSelectedClause((prev) =>
        prev
          ? { ...prev, textExcerpt: redlineResult?.redlinedText ?? prev.textExcerpt, reviewStatus: 'APPROVED' }
          : null,
      );
    } catch {
      setRunError('Failed to accept redline. Please try again.');
    } finally {
      setAccepting(false);
    }
  }

  async function handleShowHistory() {
    if (!selectedClause) return;
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const res = await apiClient.get<HistoryJob[]>(`/clauses/${selectedClause.id}/redline-history`);
      setHistory(res.data);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: '#F7F6F3' }}>
      {/* Header */}
      <div
        className="px-8 py-5 border-b flex items-center gap-4"
        style={{ background: '#1B2A4A', borderColor: '#263F6A' }}
      >
        <Link
          href={`/contracts/${contractId}`}
          className="p-1.5 rounded transition-colors"
          style={{ color: '#C5A55A' }}
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Wand2 size={18} style={{ color: '#C5A55A' }} />
            AI Redlining Assistant
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#8DA4C8' }}>
            Select a clause, configure context, and let AI suggest professional redlines
          </p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left: Clause List */}
        <div
          className="w-72 shrink-0 border-r flex flex-col"
          style={{ borderColor: '#E8E4DC', background: '#FFFFFF' }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: '#E8E4DC' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1B2A4A' }}>
              Contract Clauses
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: '#AAA' }}>
              {clauses.length} clause{clauses.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {clausesLoading && (
              <div className="py-8 text-center">
                <Clock size={20} className="mx-auto mb-2 animate-pulse" style={{ color: '#CCC' }} />
                <p className="text-xs" style={{ color: '#AAA' }}>Loading clauses...</p>
              </div>
            )}
            {clausesError && (
              <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#FDECEA', color: '#C0392B' }}>
                {clausesError}
              </div>
            )}
            {!clausesLoading && !clausesError && clauses.length === 0 && (
              <div className="py-8 text-center">
                <FileText size={24} className="mx-auto mb-2" style={{ color: '#DDD' }} />
                <p className="text-xs font-medium" style={{ color: '#888' }}>No clauses yet</p>
                <p className="text-[10px] mt-1" style={{ color: '#AAA' }}>
                  Extract clauses from the contract first
                </p>
              </div>
            )}
            {clauses.map((clause) => (
              <ClauseCard
                key={clause.id}
                clause={clause}
                selected={selectedClause?.id === clause.id}
                onClick={() => handleSelectClause(clause)}
              />
            ))}
          </div>
        </div>

        {/* Right: Redline Workspace */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {!selectedClause ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: '#EEF1F7' }}
              >
                <Wand2 size={28} style={{ color: '#1B2A4A' }} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm" style={{ color: '#1B2A4A' }}>
                  Select a clause to redline
                </p>
                <p className="text-xs mt-1" style={{ color: '#AAA' }}>
                  Choose from the list on the left to begin AI-assisted redlining
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Clause Info */}
              <div
                className="rounded-xl border p-5 space-y-2"
                style={{ borderColor: '#E8E4DC', background: '#FFFFFF' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-base" style={{ color: '#1B2A4A' }}>
                      {selectedClause.title}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                      {selectedClause.type.replace(/_/g, ' ')} &bull; Review status: {selectedClause.reviewStatus}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={selectedClause.riskLevel} />
                    <button
                      onClick={showHistory ? () => setShowHistory(false) : handleShowHistory}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                      style={{ borderColor: '#E8E4DC', color: '#666', background: '#FAFAFA' }}
                    >
                      <History size={12} />
                      {showHistory ? 'Hide History' : 'History'}
                    </button>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#444' }}>
                  {selectedClause.summary}
                </p>
                <div
                  className="rounded-lg p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap"
                  style={{ background: '#F7F6F3', color: '#555', border: '1px solid #E8E4DC' }}
                >
                  {selectedClause.textExcerpt}
                </div>
              </div>

              {/* History Panel */}
              {showHistory && (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#E8E4DC' }}>
                  <div
                    className="px-4 py-3 text-xs font-bold flex items-center gap-2"
                    style={{ background: '#F5F3EE', color: '#1B2A4A', borderBottom: '1px solid #E8E4DC' }}
                  >
                    <History size={13} />
                    Redline History
                  </div>
                  {historyLoading ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-xs" style={{ color: '#AAA' }}>Loading history...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-xs" style={{ color: '#AAA' }}>No previous redlines for this clause.</p>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: '#E8E4DC' }}>
                      {history.map((job) => (
                        <div key={job.id} className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono" style={{ color: '#888' }}>
                              {job.id.slice(0, 8)}...
                            </span>
                            <span className="text-[10px]" style={{ color: '#AAA' }}>
                              {new Date(job.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {job.result?.redlineResult?.summary && (
                            <p className="text-xs mt-1" style={{ color: '#555' }}>
                              {job.result.redlineResult.summary}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Context Inputs */}
              <div
                className="rounded-xl border p-5 space-y-4"
                style={{ borderColor: '#E8E4DC', background: '#FFFFFF' }}
              >
                <h3 className="text-sm font-bold" style={{ color: '#1B2A4A' }}>
                  Redline Context
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>
                      Counterparty Type
                    </label>
                    <select
                      value={counterpartyType}
                      onChange={(e) => setCounterpartyType(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ borderColor: '#E8E4DC', color: '#1B2A4A', background: '#FAFAFA' }}
                    >
                      <option value="">Not specified</option>
                      <option value="BUYER">Buyer</option>
                      <option value="SELLER">Seller</option>
                      <option value="VENDOR">Vendor</option>
                      <option value="PARTNER">Partner</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>
                      Contract Type
                    </label>
                    <select
                      value={contractType}
                      onChange={(e) => setContractType(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ borderColor: '#E8E4DC', color: '#1B2A4A', background: '#FAFAFA' }}
                    >
                      <option value="">Not specified</option>
                      {CONTRACT_TYPES.map((t) => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>
                      Our Position
                    </label>
                    <select
                      value={partyPosition}
                      onChange={(e) => setPartyPosition(e.target.value as 'DRAFTING_PARTY' | 'REVIEWING_PARTY')}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ borderColor: '#E8E4DC', color: '#1B2A4A', background: '#FAFAFA' }}
                    >
                      <option value="REVIEWING_PARTY">Reviewing Party</option>
                      <option value="DRAFTING_PARTY">Drafting Party</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleRunRedline}
                  disabled={running}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: '#1B2A4A' }}
                >
                  <Zap size={15} style={{ color: '#C5A55A' }} />
                  {running ? 'Analyzing...' : 'Run AI Redline'}
                </button>

                {runError && (
                  <div className="rounded-lg px-3 py-2 text-xs font-medium" style={{ background: '#FDECEA', color: '#C0392B' }}>
                    {runError}
                  </div>
                )}

                {acceptSuccess && (
                  <div className="rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2" style={{ background: '#D4EDDA', color: '#1D6A39' }}>
                    <CheckCircle size={13} />
                    Redline accepted. Clause text has been updated.
                  </div>
                )}
              </div>

              {/* AI Redline Results */}
              {running && (
                <div
                  className="rounded-xl border p-8 text-center"
                  style={{ borderColor: '#E8E4DC', background: '#FFFFFF' }}
                >
                  <Wand2 size={28} className="mx-auto mb-3 animate-pulse" style={{ color: '#C5A55A' }} />
                  <p className="text-sm font-semibold" style={{ color: '#1B2A4A' }}>
                    AI is analyzing the clause...
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#AAA' }}>
                    Applying expert negotiation lens — this may take a moment
                  </p>
                </div>
              )}

              {redlineResult && !running && (
                <div className="space-y-5">
                  {/* Summary Banner */}
                  <div
                    className="rounded-xl border p-4"
                    style={{ borderColor: '#C5A55A', background: '#FFF8EC' }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#C5A55A' }}>
                      AI Redline Summary
                    </p>
                    <p className="text-sm" style={{ color: '#1B2A4A' }}>{redlineResult.summary}</p>
                  </div>

                  {/* Side-by-side diff */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#888' }}>
                      Side-by-Side Comparison
                    </h3>
                    <DiffPanel
                      original={redlineResult.originalText}
                      redlined={redlineResult.redlinedText}
                    />
                  </div>

                  {/* Changes Table */}
                  <ChangesTable changes={redlineResult.changes} />

                  {/* Negotiation Positions */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#888' }}>
                      Negotiation Positions
                    </h3>
                    <NegotiationPositionCard result={redlineResult} />
                  </div>

                  {/* Accept Redline */}
                  {!acceptSuccess && (
                    <div className="flex justify-end">
                      <button
                        onClick={handleAcceptRedline}
                        disabled={accepting}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                        style={{ background: '#1D6A39' }}
                      >
                        <CheckCircle size={15} />
                        {accepting ? 'Accepting...' : 'Accept Redline'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
