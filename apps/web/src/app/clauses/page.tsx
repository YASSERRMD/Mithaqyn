'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { RiskBadge } from '@/components/contracts/StatusBadge';
import { CheckCircle, Clock, Flag } from 'lucide-react';

interface Clause {
  id: string;
  contractId: string;
  type: string;
  title: string;
  summary: string;
  textExcerpt: string;
  confidence: number;
  riskLevel: string;
  reviewStatus: string;
  pageRef?: number;
}

const REVIEW_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock size={14} style={{ color: '#C5A55A' }} />,
  APPROVED: <CheckCircle size={14} style={{ color: '#22C55E' }} />,
  FLAGGED: <Flag size={14} style={{ color: '#EF4444' }} />,
};

export default function ClausesPage() {
  const params = useSearchParams();
  const contractId = params.get('contractId');
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!contractId) { setLoading(false); return; }
    apiClient
      .get(`/contracts/${contractId}/clauses`)
      .then((r) => setClauses(r.data))
      .finally(() => setLoading(false));
  }, [contractId]);

  async function setReview(id: string, reviewStatus: string) {
    await apiClient.patch(`/clauses/${id}/review`, { reviewStatus });
    setClauses((prev) => prev.map((c) => (c.id === id ? { ...c, reviewStatus } : c)));
  }

  if (!contractId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>Clause Analysis</h1>
        <p className="text-sm" style={{ color: '#888' }}>Open a contract and click &quot;Extract Clauses&quot; to begin analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>Clause Analysis</h1>
        <span className="text-sm" style={{ color: '#888' }}>{clauses.length} clauses</span>
      </div>

      {loading ? (
        <p className="text-sm py-8" style={{ color: '#AAA' }}>Loading clauses...</p>
      ) : clauses.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border" style={{ borderColor: '#E8E4DC' }}>
          <p className="text-sm" style={{ color: '#888' }}>No clauses extracted yet for this contract.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clauses.map((clause) => (
            <div
              key={clause.id}
              className="bg-white rounded-xl border shadow-sm overflow-hidden"
              style={{ borderColor: '#E8E4DC' }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer"
                onClick={() => setExpanded(expanded === clause.id ? null : clause.id)}
              >
                <div className="flex items-center gap-3">
                  {REVIEW_ICONS[clause.reviewStatus]}
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#1B2A4A' }}>{clause.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                      {clause.type.replace(/_/g, ' ')} · {Math.round(clause.confidence * 100)}% confidence
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RiskBadge level={clause.riskLevel} />
                  {clause.pageRef && (
                    <span className="text-xs" style={{ color: '#AAA' }}>p.{clause.pageRef}</span>
                  )}
                </div>
              </div>

              {expanded === clause.id && (
                <div className="px-5 pb-4 border-t" style={{ borderColor: '#F0EDE8' }}>
                  <div className="pt-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#888' }}>Summary</p>
                      <p className="text-sm" style={{ color: '#444' }}>{clause.summary}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#888' }}>Excerpt</p>
                      <blockquote className="border-l-2 pl-3 italic text-sm" style={{ borderColor: '#C5A55A', color: '#666' }}>
                        {clause.textExcerpt}
                      </blockquote>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setReview(clause.id, 'APPROVED')} className="px-3 py-1 rounded text-xs font-medium" style={{ background: '#DCFCE7', color: '#166534' }}>
                        Approve
                      </button>
                      <button onClick={() => setReview(clause.id, 'FLAGGED')} className="px-3 py-1 rounded text-xs font-medium" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                        Flag
                      </button>
                      <button onClick={() => setReview(clause.id, 'PENDING')} className="px-3 py-1 rounded text-xs font-medium" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: '#CCC' }}>
        AI-assisted clause extraction. Not legal advice. Review with qualified counsel.
      </p>
    </div>
  );
}
