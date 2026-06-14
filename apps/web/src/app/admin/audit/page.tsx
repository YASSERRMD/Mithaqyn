'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { Download, RefreshCw, Search } from 'lucide-react';

interface AuditUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  createdAt: string;
  user?: AuditUser;
}

interface AuditResult {
  data: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: '#16A34A',
  UPDATE: '#2563EB',
  DELETE: '#DC2626',
  VIEW: '#6B7280',
  LOGIN: '#7C3AED',
  LOGOUT: '#D97706',
  EXPORT: '#0891B2',
  ANALYZE: '#C5A55A',
};

function actionColor(action: string) {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return color;
  }
  return '#888';
}

export default function AuditPage() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (search) params.set('action', search);
    if (entityType) params.set('entityType', entityType);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    try {
      const r = await apiClient.get(`/admin/audit?${params}`);
      setResult(r.data);
    } finally {
      setLoading(false);
    }
  }, [page, search, entityType, from, to]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const r = await apiClient.get(`/admin/audit/export?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data as BlobPart], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-log.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>Audit Logs</h1>
          <p className="text-sm mt-0.5" style={{ color: '#888' }}>
            Complete user action history · {result?.total ?? '—'} entries
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border"
          style={{ borderColor: '#E8E4DC', color: '#1B2A4A' }}
        >
          <Download size={15} />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: '#E8E4DC' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#AAA' }} />
            <input
              type="text"
              placeholder="Filter by action..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none"
              style={{ borderColor: '#E8E4DC' }}
            />
          </div>
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: '#E8E4DC', color: '#3A3A3A' }}
          >
            <option value="">All entity types</option>
            {['CONTRACT', 'CLAUSE', 'RISK', 'OBLIGATION', 'RENEWAL', 'USER', 'AUTH'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: '#E8E4DC' }}
            placeholder="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: '#E8E4DC' }}
            placeholder="To date"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: '#E8E4DC' }}>
        {loading ? (
          <div className="py-12 text-center">
            <RefreshCw size={24} className="mx-auto mb-2 animate-spin" style={{ color: '#C5A55A' }} />
            <p className="text-sm" style={{ color: '#888' }}>Loading logs...</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#FAFAF8' }}>
                  {['Timestamp', 'User', 'Action', 'Entity', 'IP Address'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#888' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(result?.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm" style={{ color: '#CCC' }}>
                      No audit entries found
                    </td>
                  </tr>
                ) : (
                  (result?.data ?? []).map((entry) => (
                    <tr key={entry.id} className="border-t hover:bg-gray-50" style={{ borderColor: '#F0EDE8' }}>
                      <td className="px-4 py-3 text-xs" style={{ color: '#666' }}>
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {entry.user ? (
                          <div>
                            <p className="text-xs font-medium" style={{ color: '#1B2A4A' }}>
                              {entry.user.firstName} {entry.user.lastName}
                            </p>
                            <p className="text-xs" style={{ color: '#AAA' }}>{entry.user.role.replace(/_/g, ' ')}</p>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: '#AAA' }}>{entry.userId.slice(0, 8)}…</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: actionColor(entry.action) + '18', color: actionColor(entry.action) }}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#666' }}>
                        <span>{entry.entityType}</span>
                        {entry.entityId && (
                          <span className="ml-1" style={{ color: '#AAA' }}>#{entry.entityId.slice(0, 8)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#AAA' }}>
                        {entry.ipAddress ?? '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {result && result.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: '#F0EDE8' }}>
                <p className="text-xs" style={{ color: '#888' }}>
                  Page {result.page} of {result.totalPages} · {result.total} entries
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40"
                    style={{ borderColor: '#E8E4DC' }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
                    disabled={page === result.totalPages}
                    className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40"
                    style={{ borderColor: '#E8E4DC' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
