'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Clock, XCircle, Archive, FileText, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api';

type ContractStatus =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'PENDING_SIGNATURE'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'ARCHIVED';

interface TimelineEntry {
  status: string;
  changedAt: string;
  changedById: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  DRAFT: { label: 'Draft', color: '#888', bg: '#F5F5F5', icon: FileText },
  UNDER_REVIEW: { label: 'Under Review', color: '#C5A55A', bg: '#FFF8EC', icon: Clock },
  PENDING_SIGNATURE: { label: 'Pending Signature', color: '#E67E22', bg: '#FEF3E8', icon: AlertTriangle },
  ACTIVE: { label: 'Active', color: '#27AE60', bg: '#EAFAF1', icon: CheckCircle },
  EXPIRED: { label: 'Expired', color: '#E74C3C', bg: '#FDECEA', icon: XCircle },
  TERMINATED: { label: 'Terminated', color: '#C0392B', bg: '#FDECEA', icon: XCircle },
  ARCHIVED: { label: 'Archived', color: '#7F8C8D', bg: '#F0F0F0', icon: Archive },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#888', bg: '#F5F5F5', icon: FileText };
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

interface TransitionModalProps {
  toStatus: ContractStatus;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}

function TransitionModal({ toStatus, onConfirm, onCancel, loading }: TransitionModalProps) {
  const [reason, setReason] = useState('');
  const cfg = STATUS_CONFIG[toStatus];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-base font-bold mb-1" style={{ color: '#1B2A4A' }}>
          Transition to {cfg?.label ?? toStatus}
        </h2>
        <p className="text-xs mb-4" style={{ color: '#888' }}>
          Optionally provide a reason for this status change.
        </p>
        <textarea
          className="w-full border rounded-lg p-3 text-sm resize-none outline-none focus:ring-2"
          style={{ borderColor: '#E8E4DC', color: '#1B2A4A' }}
          rows={3}
          placeholder="Reason (optional)..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: '#E8E4DC', color: '#888' }}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: '#1B2A4A' }}
            disabled={loading}
          >
            {loading ? 'Transitioning...' : `Confirm`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LifecyclePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [validTransitions, setValidTransitions] = useState<ContractStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingTransition, setPendingTransition] = useState<ContractStatus | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      const [timelineRes, transitionsRes] = await Promise.all([
        apiClient.get(`/contracts/${id}/lifecycle/timeline`),
        apiClient.get(`/contracts/${id}/lifecycle/transitions`),
      ]);
      setTimeline(timelineRes.data);
      setValidTransitions(transitionsRes.data);
    } catch {
      router.push(`/contracts/${id}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id]);

  async function handleTransitionConfirm(reason: string) {
    if (!pendingTransition) return;
    setTransitioning(true);
    setError(null);
    try {
      await apiClient.post(`/contracts/${id}/lifecycle/transition`, {
        toStatus: pendingTransition,
        reason: reason || undefined,
      });
      setPendingTransition(null);
      setLoading(true);
      await fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Transition failed. Please try again.');
    } finally {
      setTransitioning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: '#AAA' }}>Loading lifecycle data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {pendingTransition && (
        <TransitionModal
          toStatus={pendingTransition}
          onConfirm={handleTransitionConfirm}
          onCancel={() => { setPendingTransition(null); setError(null); }}
          loading={transitioning}
        />
      )}

      <div className="flex items-center gap-3">
        <Link
          href={`/contracts/${id}`}
          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} style={{ color: '#666' }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1B2A4A' }}>Contract Lifecycle</h1>
          <p className="text-xs mt-0.5" style={{ color: '#888' }}>Status history and available transitions</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ background: '#FDECEA', color: '#C0392B' }}>
          {error}
        </div>
      )}

      {validTransitions.length > 0 && (
        <div className="bg-white rounded-xl p-5 border shadow-sm" style={{ borderColor: '#E8E4DC' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#1B2A4A' }}>Available Transitions</h2>
          <div className="flex flex-wrap gap-2">
            {validTransitions.map((status) => {
              const cfg = STATUS_CONFIG[status];
              return (
                <button
                  key={status}
                  onClick={() => setPendingTransition(status)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold border transition-all hover:shadow-md"
                  style={{
                    color: cfg?.color ?? '#888',
                    borderColor: cfg?.color ?? '#E8E4DC',
                    background: cfg?.bg ?? '#F5F5F5',
                  }}
                >
                  Transition to {cfg?.label ?? status}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {validTransitions.length === 0 && !loading && (
        <div
          className="rounded-xl p-5 border text-sm font-medium text-center"
          style={{ borderColor: '#E8E4DC', background: '#FAFAFA', color: '#AAA' }}
        >
          No further transitions available for this contract.
        </div>
      )}

      <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: '#E8E4DC' }}>
        <h2 className="text-sm font-semibold mb-5" style={{ color: '#1B2A4A' }}>Status Timeline</h2>

        {timeline.length === 0 ? (
          <div className="py-8 text-center">
            <Clock size={28} className="mx-auto mb-2" style={{ color: '#CCC' }} />
            <p className="text-xs" style={{ color: '#AAA' }}>No lifecycle transitions recorded yet.</p>
          </div>
        ) : (
          <ol className="relative">
            {timeline.map((entry, idx) => {
              const cfg = STATUS_CONFIG[entry.status] ?? { label: entry.status, color: '#888', bg: '#F5F5F5', icon: FileText };
              const Icon = cfg.icon;
              const isLast = idx === timeline.length - 1;

              return (
                <li key={idx} className="flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                      style={{ background: isLast ? '#1B2A4A' : cfg.bg, border: `2px solid ${isLast ? '#C5A55A' : cfg.color}` }}
                    >
                      <Icon size={14} style={{ color: isLast ? '#C5A55A' : cfg.color }} />
                    </div>
                    {!isLast && (
                      <div className="w-0.5 flex-1 mt-1" style={{ background: '#E8E4DC' }} />
                    )}
                  </div>

                  <div className="flex-1 pt-1 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={entry.status} />
                      {isLast && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#C5A55A', color: '#fff' }}>
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: '#888' }}>
                      {new Date(entry.changedAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {entry.changedById && (
                      <p className="text-xs mt-0.5" style={{ color: '#AAA' }}>
                        by {entry.changedById}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
