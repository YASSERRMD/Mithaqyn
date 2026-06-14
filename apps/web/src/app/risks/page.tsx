'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { RiskBadge } from '@/components/contracts/StatusBadge';
import { ShieldAlert, AlertTriangle, Info } from 'lucide-react';

interface RiskFinding {
  id: string;
  category: string;
  severity: string;
  title: string;
  explanation: string;
  recommendation: string;
  confidence: number;
  status: string;
}

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  CRITICAL: <ShieldAlert size={16} style={{ color: '#DC2626' }} />,
  HIGH: <AlertTriangle size={16} style={{ color: '#EA580C' }} />,
  MEDIUM: <AlertTriangle size={16} style={{ color: '#CA8A04' }} />,
  LOW: <Info size={16} style={{ color: '#16A34A' }} />,
};

export default function RisksPage() {
  const params = useSearchParams();
  const contractId = params.get('contractId');
  const [risks, setRisks] = useState<RiskFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!contractId) { setLoading(false); return; }
    apiClient
      .get(`/contracts/${contractId}/risks`)
      .then((r) => setRisks(r.data))
      .finally(() => setLoading(false));
  }, [contractId]);

  const byLevel = (level: string) => risks.filter((r) => r.severity === level);

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>Risk Analysis</h1>
        <span className="text-sm" style={{ color: '#888' }}>{risks.length} findings</span>
      </div>

      {risks.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((level) => (
            <div key={level} className="bg-white rounded-xl p-4 border shadow-sm text-center" style={{ borderColor: '#E8E4DC' }}>
              <p className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>{byLevel(level).length}</p>
              <RiskBadge level={level} />
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm py-8" style={{ color: '#AAA' }}>Loading risk findings...</p>
      ) : risks.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border" style={{ borderColor: '#E8E4DC' }}>
          <p className="text-sm" style={{ color: '#888' }}>No risk analysis yet. Run risk scoring on this contract.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).flatMap((level) =>
            byLevel(level).map((risk) => (
              <div
                key={risk.id}
                className="bg-white rounded-xl border shadow-sm overflow-hidden"
                style={{ borderColor: '#E8E4DC' }}
              >
                <div
                  className="flex items-start gap-3 px-5 py-4 cursor-pointer"
                  onClick={() => setExpanded(expanded === risk.id ? null : risk.id)}
                >
                  <div className="mt-0.5">{SEVERITY_ICON[risk.severity]}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium" style={{ color: '#1B2A4A' }}>{risk.title}</p>
                      <RiskBadge level={risk.severity} />
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                      {risk.category} · {Math.round(risk.confidence * 100)}% confidence
                    </p>
                  </div>
                </div>

                {expanded === risk.id && (
                  <div className="px-5 pb-4 border-t space-y-3" style={{ borderColor: '#F0EDE8' }}>
                    <div className="pt-3">
                      <p className="text-xs font-semibold uppercase mb-1" style={{ color: '#888' }}>Explanation</p>
                      <p className="text-sm" style={{ color: '#444' }}>{risk.explanation}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <p className="text-xs font-semibold uppercase mb-1" style={{ color: '#92400E' }}>Recommendation</p>
                      <p className="text-sm" style={{ color: '#78350F' }}>{risk.recommendation}</p>
                    </div>
                    <div className="flex gap-2">
                      {['OPEN', 'ACKNOWLEDGED', 'ACCEPTED', 'RESOLVED'].map((s) => (
                        <button
                          key={s}
                          onClick={() => apiClient.patch(`/risks/${risk.id}/status`, { status: s }).then(() => setRisks((prev) => prev.map((r) => r.id === risk.id ? { ...r, status: s } : r)))}
                          className={`px-3 py-1 rounded text-xs font-medium border ${risk.status === s ? 'border-transparent' : ''}`}
                          style={risk.status === s ? { background: '#1B2A4A', color: '#fff' } : { borderColor: '#D4C8A8', color: '#555' }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )),
          )}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: '#CCC' }}>
        AI-assisted risk assessment. Not legal advice. Review with qualified legal counsel.
      </p>
    </div>
  );
}
