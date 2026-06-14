'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { CheckSquare, AlertTriangle, Clock } from 'lucide-react';

interface Obligation {
  id: string;
  title: string;
  description: string;
  owner?: string;
  dueDate?: string;
  status: string;
  priority: string;
  isEscalated: boolean;
  contract?: { id: string; title: string };
}

const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: '#FEE2E2', color: '#991B1B' },
  HIGH: { bg: '#FFEDD5', color: '#9A3412' },
  MEDIUM: { bg: '#FEF9C3', color: '#854D0E' },
  LOW: { bg: '#F0FDF4', color: '#166534' },
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  OPEN: { bg: '#DBEAFE', color: '#1E40AF' },
  IN_PROGRESS: { bg: '#FEF9C3', color: '#854D0E' },
  COMPLETED: { bg: '#DCFCE7', color: '#166534' },
  OVERDUE: { bg: '#FEE2E2', color: '#991B1B' },
  WAIVED: { bg: '#F3F4F6', color: '#6B7280' },
  CANCELLED: { bg: '#F3F4F6', color: '#6B7280' },
};

export default function ObligationsPage() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    apiClient
      .get('/obligations')
      .then((r) => setObligations(r.data))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: string) {
    await apiClient.patch(`/obligations/${id}`, { status });
    setObligations((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  const filtered = filter
    ? obligations.filter((o) => o.status === filter)
    : obligations;

  const overdueCount = obligations.filter(
    (o) => o.dueDate && new Date(o.dueDate) < new Date() && !['COMPLETED', 'WAIVED', 'CANCELLED'].includes(o.status),
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>Obligations</h1>
          <p className="text-sm mt-0.5" style={{ color: '#888' }}>
            {obligations.length} total · {overdueCount} overdue
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="OVERDUE">Overdue</option>
          <option value="WAIVED">Waived</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: '#AAA' }}>Loading obligations...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border" style={{ borderColor: '#E8E4DC' }}>
          <CheckSquare size={36} className="mx-auto mb-3" style={{ color: '#CCC' }} />
          <p className="text-sm" style={{ color: '#888' }}>No obligations found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ob) => {
            const isOverdue = ob.dueDate && new Date(ob.dueDate) < new Date() && !['COMPLETED', 'WAIVED', 'CANCELLED'].includes(ob.status);
            return (
              <div
                key={ob.id}
                className="bg-white rounded-xl border shadow-sm p-5"
                style={{ borderColor: isOverdue ? '#FECACA' : '#E8E4DC' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isOverdue && <AlertTriangle size={14} style={{ color: '#DC2626' }} />}
                      <p className="text-sm font-medium" style={{ color: '#1B2A4A' }}>{ob.title}</p>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={PRIORITY_COLORS[ob.priority] ?? { bg: '#F3F4F6', color: '#6B7280' }}>
                        {ob.priority}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: '#666' }}>{ob.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: '#AAA' }}>
                      {ob.contract && <span>{ob.contract.title}</span>}
                      {ob.owner && <span>Owner: {ob.owner}</span>}
                      {ob.dueDate && (
                        <span className="flex items-center gap-1" style={{ color: isOverdue ? '#DC2626' : '#AAA' }}>
                          <Clock size={11} />
                          {new Date(ob.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={STATUS_COLORS[ob.status] ?? { bg: '#F3F4F6', color: '#6B7280' }}>
                      {ob.status.replace('_', ' ')}
                    </span>
                    <select
                      value={ob.status}
                      onChange={(e) => updateStatus(ob.id, e.target.value)}
                      className="text-xs px-2 py-1 rounded border"
                      style={{ borderColor: '#D4C8A8' }}
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="WAIVED">Waived</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
