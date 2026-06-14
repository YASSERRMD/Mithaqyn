'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClauseComment {
  id: string;
  roundId: string;
  clauseId: string | null;
  author: 'INTERNAL' | 'COUNTERPARTY';
  authorName: string;
  content: string;
  isResolved: boolean;
  createdAt: string;
}

interface NegotiationRound {
  id: string;
  contractId: string;
  roundNumber: number;
  status: 'OPEN' | 'CLOSED' | 'AGREED';
  summary: string | null;
  startedAt: string;
  closedAt: string | null;
  createdAt: string;
  comments: ClauseComment[];
}

interface RedlineSummary {
  totalRounds: number;
  openRounds: number;
  totalComments: number;
  unresolvedComments: number;
  agreedRounds: number;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const ROUND_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  OPEN: { label: 'Open', color: '#C5A55A', bg: '#FFF8EC', border: '#C5A55A' },
  CLOSED: { label: 'Closed', color: '#888', bg: '#F5F5F5', border: '#CCCCCC' },
  AGREED: { label: 'Agreed', color: '#27AE60', bg: '#EAFAF1', border: '#27AE60' },
};

const AUTHOR_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  INTERNAL: { label: 'Internal', color: '#1B2A4A', bg: '#EEF1F7', border: '#BFC9DE' },
  COUNTERPARTY: { label: 'Counterparty', color: '#7B3F00', bg: '#FFF3E0', border: '#FFCC80' },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div
      className="rounded-xl p-4 border flex flex-col gap-1"
      style={{ borderColor: '#E8E4DC', background: '#FAFAFA' }}
    >
      <span className="text-xs font-medium" style={{ color: '#888' }}>{label}</span>
      <span className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: '#AAA' }}>{sub}</span>}
    </div>
  );
}

function RoundStatusBadge({ status }: { status: string }) {
  const cfg = ROUND_STATUS[status] ?? { label: status, color: '#888', bg: '#F5F5F5', border: '#CCC' };
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {status === 'OPEN' && <Clock size={10} />}
      {status === 'CLOSED' && <XCircle size={10} />}
      {status === 'AGREED' && <CheckCircle size={10} />}
      {cfg.label}
    </span>
  );
}

function CommentBubble({
  comment,
  onResolve,
  resolving,
}: {
  comment: ClauseComment;
  onResolve: (id: string) => void;
  resolving: string | null;
}) {
  const cfg = AUTHOR_CONFIG[comment.author] ?? AUTHOR_CONFIG.INTERNAL;
  const isInternal = comment.author === 'INTERNAL';

  return (
    <div
      className={`flex gap-2 ${isInternal ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className="max-w-[80%] rounded-xl px-4 py-3 border text-sm shadow-sm"
        style={{
          background: cfg.bg,
          borderColor: cfg.border,
          color: cfg.color,
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="font-semibold text-xs" style={{ color: cfg.color }}>
            {comment.authorName}
            <span
              className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{
                background: isInternal ? '#BFC9DE' : '#FFCC80',
                color: cfg.color,
              }}
            >
              {cfg.label}
            </span>
          </span>
          <span className="text-[10px] shrink-0" style={{ color: '#AAA' }}>
            {new Date(comment.createdAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {comment.clauseId && (
          <p className="text-[10px] mb-1 font-mono" style={{ color: '#AAA' }}>
            Clause: {comment.clauseId}
          </p>
        )}

        <p className="leading-relaxed">{comment.content}</p>

        {!comment.isResolved ? (
          <button
            onClick={() => onResolve(comment.id)}
            disabled={resolving === comment.id}
            className="mt-2 text-[10px] font-semibold underline opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: '#27AE60' }}
          >
            {resolving === comment.id ? 'Resolving...' : 'Mark resolved'}
          </button>
        ) : (
          <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#27AE60' }}>
            <CheckCircle size={9} /> Resolved
          </span>
        )}
      </div>
    </div>
  );
}

interface AddCommentFormProps {
  roundId: string;
  onAdded: () => void;
}

function AddCommentForm({ roundId, onAdded }: AddCommentFormProps) {
  const [author, setAuthor] = useState<'INTERNAL' | 'COUNTERPARTY'>('INTERNAL');
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [clauseId, setClauseId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/negotiation/rounds/${roundId}/comments`, {
        author,
        authorName: authorName.trim(),
        content: content.trim(),
        clauseId: clauseId.trim() || undefined,
      });
      setAuthorName('');
      setContent('');
      setClauseId('');
      onAdded();
    } catch {
      setError('Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      {error && (
        <div className="rounded-lg px-3 py-2 text-xs font-medium" style={{ background: '#FDECEA', color: '#C0392B' }}>
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>Author</label>
          <select
            value={author}
            onChange={(e) => setAuthor(e.target.value as 'INTERNAL' | 'COUNTERPARTY')}
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-offset-1"
            style={{ borderColor: '#E8E4DC', color: '#1B2A4A' }}
          >
            <option value="INTERNAL">Internal</option>
            <option value="COUNTERPARTY">Counterparty</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>Author Name</label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="e.g. Alice Smith"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-offset-1"
            style={{ borderColor: '#E8E4DC', color: '#1B2A4A' }}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>
          Clause Reference <span className="font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={clauseId}
          onChange={(e) => setClauseId(e.target.value)}
          placeholder="Clause ID or reference"
          className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-offset-1"
          style={{ borderColor: '#E8E4DC', color: '#1B2A4A' }}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>Comment</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your comment or redline note..."
          required
          rows={3}
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-offset-1"
          style={{ borderColor: '#E8E4DC', color: '#1B2A4A' }}
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !authorName.trim() || !content.trim()}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        style={{ background: '#1B2A4A' }}
      >
        <Send size={13} />
        {submitting ? 'Sending...' : 'Add Comment'}
      </button>
    </form>
  );
}

interface RoundCardProps {
  round: NegotiationRound;
  onRefresh: () => void;
}

function RoundCard({ round, onRefresh }: RoundCardProps) {
  const [expanded, setExpanded] = useState(round.status === 'OPEN');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const cfg = ROUND_STATUS[round.status] ?? ROUND_STATUS.OPEN;
  const unresolvedCount = round.comments.filter((c) => !c.isResolved).length;

  async function handleClose(status: 'CLOSED' | 'AGREED') {
    setClosing(true);
    setCloseError(null);
    try {
      await apiClient.patch(`/negotiation/rounds/${round.id}/close`, { status });
      onRefresh();
    } catch {
      setCloseError('Failed to update round status.');
    } finally {
      setClosing(false);
    }
  }

  async function handleResolve(commentId: string) {
    setResolvingId(commentId);
    try {
      await apiClient.patch(`/negotiation/comments/${commentId}/resolve`);
      onRefresh();
    } catch {
      // silently ignore, refresh anyway
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div
      className="bg-white rounded-xl border shadow-sm overflow-hidden"
      style={{ borderColor: cfg.border }}
    >
      {/* Round header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer"
        style={{ borderBottom: expanded ? `1px solid ${cfg.border}` : 'none', background: cfg.bg }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
            style={{ background: '#1B2A4A', color: '#C5A55A' }}
          >
            {round.roundNumber}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm" style={{ color: '#1B2A4A' }}>
                Round {round.roundNumber}
              </span>
              <RoundStatusBadge status={round.status} />
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{ background: '#E8E4DC', color: '#666' }}
              >
                <MessageSquare size={10} />
                {round.comments.length} comment{round.comments.length !== 1 ? 's' : ''}
              </span>
              {unresolvedCount > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: '#FDECEA', color: '#C0392B' }}
                >
                  {unresolvedCount} unresolved
                </span>
              )}
            </div>
            {round.summary && (
              <p className="text-xs mt-0.5" style={{ color: '#888' }}>{round.summary}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {round.status === 'OPEN' && (
            <>
              <button
                onClick={() => handleClose('AGREED')}
                disabled={closing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: '#EAFAF1', color: '#27AE60', border: '1px solid #A9DFBF' }}
              >
                <CheckCircle size={11} />
                Mark Agreed
              </button>
              <button
                onClick={() => handleClose('CLOSED')}
                disabled={closing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: '#F5F5F5', color: '#666', border: '1px solid #CCC' }}
              >
                <XCircle size={11} />
                Close
              </button>
            </>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded hover:bg-white/50 transition-colors"
          >
            {expanded ? <ChevronUp size={16} style={{ color: '#888' }} /> : <ChevronDown size={16} style={{ color: '#888' }} />}
          </button>
        </div>
      </div>

      {/* Round body */}
      {expanded && (
        <div className="px-5 py-4 space-y-3">
          {closeError && (
            <div className="rounded-lg px-3 py-2 text-xs font-medium" style={{ background: '#FDECEA', color: '#C0392B' }}>
              {closeError}
            </div>
          )}

          {round.comments.length === 0 ? (
            <div className="py-6 text-center">
              <MessageSquare size={24} className="mx-auto mb-2" style={{ color: '#DDD' }} />
              <p className="text-xs" style={{ color: '#AAA' }}>No comments yet for this round.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {round.comments.map((comment) => (
                <CommentBubble
                  key={comment.id}
                  comment={comment}
                  onResolve={handleResolve}
                  resolving={resolvingId}
                />
              ))}
            </div>
          )}

          {round.status === 'OPEN' && (
            <div>
              {!showCommentForm ? (
                <button
                  onClick={() => setShowCommentForm(true)}
                  className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors"
                  style={{ borderColor: '#C5A55A', color: '#C5A55A', background: '#FFF8EC' }}
                >
                  <Plus size={12} />
                  Add Comment
                </button>
              ) : (
                <div
                  className="rounded-xl p-4 border"
                  style={{ borderColor: '#E8E4DC', background: '#FAFAFA' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold" style={{ color: '#1B2A4A' }}>New Comment</h4>
                    <button
                      onClick={() => setShowCommentForm(false)}
                      className="text-xs" style={{ color: '#AAA' }}
                    >
                      Cancel
                    </button>
                  </div>
                  <AddCommentForm
                    roundId={round.id}
                    onAdded={() => {
                      setShowCommentForm(false);
                      onRefresh();
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] pt-1" style={{ color: '#AAA' }}>
            <Clock size={10} />
            Started {new Date(round.startedAt).toLocaleString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {round.closedAt && (
              <span>
                &nbsp;&bull;&nbsp;Closed {new Date(round.closedAt).toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Round Form ───────────────────────────────────────────────────────────

interface NewRoundFormProps {
  contractId: string;
  onCreated: () => void;
  onCancel: () => void;
}

function NewRoundForm({ contractId, onCreated, onCancel }: NewRoundFormProps) {
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/contracts/${contractId}/negotiation/rounds`, {
        summary: summary.trim() || undefined,
      });
      onCreated();
    } catch {
      setError('Failed to create negotiation round.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border shadow-sm p-5"
      style={{ borderColor: '#C5A55A' }}
    >
      <h3 className="text-sm font-bold mb-3" style={{ color: '#1B2A4A' }}>New Negotiation Round</h3>
      {error && (
        <div className="rounded-lg px-3 py-2 text-xs mb-3 font-medium" style={{ background: '#FDECEA', color: '#C0392B' }}>
          {error}
        </div>
      )}
      <div className="mb-4">
        <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>
          Summary <span className="font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="e.g. Counter-proposal review, Payment terms negotiation..."
          className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-offset-1"
          style={{ borderColor: '#E8E4DC', color: '#1B2A4A' }}
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
          style={{ borderColor: '#E8E4DC', color: '#888' }}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: '#1B2A4A' }}
        >
          {submitting ? 'Creating...' : 'Create Round'}
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NegotiationPage() {
  const { id } = useParams<{ id: string }>();
  const [rounds, setRounds] = useState<NegotiationRound[]>([]);
  const [summary, setSummary] = useState<RedlineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewRoundForm, setShowNewRoundForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    setError(null);
    try {
      const [roundsRes, summaryRes] = await Promise.all([
        apiClient.get(`/contracts/${id}/negotiation/rounds`),
        apiClient.get(`/contracts/${id}/negotiation/summary`),
      ]);
      setRounds(roundsRes.data);
      setSummary(summaryRes.data);
    } catch {
      setError('Failed to load negotiation data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: '#AAA' }}>Loading negotiation data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/contracts/${id}`}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} style={{ color: '#666' }} />
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1B2A4A' }}>Negotiation Tracking</h1>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>
              Redline rounds, clause comments, and agreement tracking
            </p>
          </div>
        </div>
        {!showNewRoundForm && (
          <button
            onClick={() => setShowNewRoundForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: '#1B2A4A' }}
          >
            <Plus size={14} />
            New Round
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ background: '#FDECEA', color: '#C0392B' }}>
          {error}
        </div>
      )}

      {/* Redline Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <SummaryCard label="Total Rounds" value={summary.totalRounds} />
          <SummaryCard
            label="Open Rounds"
            value={summary.openRounds}
            sub="In progress"
          />
          <SummaryCard
            label="Agreed Rounds"
            value={summary.agreedRounds}
            sub="Fully settled"
          />
          <SummaryCard
            label="Total Comments"
            value={summary.totalComments}
          />
          <SummaryCard
            label="Unresolved"
            value={summary.unresolvedComments}
            sub={summary.unresolvedComments > 0 ? 'Needs attention' : 'All resolved'}
          />
        </div>
      )}

      {/* New Round Form */}
      {showNewRoundForm && (
        <NewRoundForm
          contractId={id}
          onCreated={() => {
            setShowNewRoundForm(false);
            setLoading(true);
            fetchData();
          }}
          onCancel={() => setShowNewRoundForm(false)}
        />
      )}

      {/* Rounds Timeline */}
      {rounds.length === 0 && !showNewRoundForm ? (
        <div
          className="rounded-xl p-10 border text-center"
          style={{ borderColor: '#E8E4DC', background: '#FAFAFA' }}
        >
          <MessageSquare size={32} className="mx-auto mb-3" style={{ color: '#DDD' }} />
          <p className="text-sm font-medium" style={{ color: '#888' }}>No negotiation rounds yet</p>
          <p className="text-xs mt-1" style={{ color: '#AAA' }}>
            Create the first round to start tracking redlines and comments.
          </p>
          <button
            onClick={() => setShowNewRoundForm(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white mx-auto"
            style={{ background: '#1B2A4A' }}
          >
            <Plus size={13} />
            Start First Round
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rounds.map((round) => (
            <RoundCard key={round.id} round={round} onRefresh={() => { setLoading(true); fetchData(); }} />
          ))}
        </div>
      )}
    </div>
  );
}
