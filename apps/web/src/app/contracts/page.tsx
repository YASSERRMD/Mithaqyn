'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText } from 'lucide-react';
import { contractsApi } from '@/lib/contracts.api';
import { StatusBadge, RiskBadge } from '@/components/contracts/StatusBadge';

interface Contract {
  id: string;
  title: string;
  contractNumber?: string;
  type: string;
  status: string;
  riskLevel?: string;
  counterparty?: { name: string };
  expiryDate?: string;
  value?: number;
  currency?: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  async function loadContracts() {
    setLoading(true);
    try {
      const res = await contractsApi.list({ page, limit: 20, search, status });
      setContracts(res.data.data);
      setTotal(res.data.meta.total);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadContracts(); }, [page, search, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>
            Contract Repository
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#888' }}>
            {total} contract{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/contracts/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: '#1B2A4A' }}
        >
          <Plus size={16} />
          New Contract
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#AAA' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search contracts..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border text-sm focus:outline-none"
          style={{ borderColor: '#D4C8A8', background: '#FAFAF8', color: '#3A3A3A' }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="EXPIRED">Expired</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="PENDING_SIGNATURE">Pending Signature</option>
          <option value="TERMINATED">Terminated</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: '#E8E4DC' }}>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#BBB' }}>Loading contracts...</div>
        ) : contracts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto mb-3" style={{ color: '#CCC' }} />
            <p className="text-sm font-medium" style={{ color: '#888' }}>No contracts found</p>
            <p className="text-xs mt-1" style={{ color: '#BBB' }}>
              {search || status ? 'Try adjusting your filters.' : 'Upload your first contract to get started.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: '#E8E4DC', background: '#FAFAF8' }}>
                {['Contract', 'Type', 'Counterparty', 'Status', 'Risk', 'Expiry'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#888' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contracts.map((c, i) => (
                <tr
                  key={c.id}
                  className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#F0EDE8' }}
                >
                  <td className="px-4 py-3">
                    <Link href={`/contracts/${c.id}`} className="font-medium hover:underline" style={{ color: '#1B2A4A' }}>
                      {c.title}
                    </Link>
                    {c.contractNumber && (
                      <p className="text-xs mt-0.5" style={{ color: '#AAA' }}>{c.contractNumber}</p>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#555' }}>
                    {c.type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#555' }}>
                    {c.counterparty?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    {c.riskLevel ? <RiskBadge level={c.riskLevel} /> : <span style={{ color: '#CCC' }}>—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#777' }}>
                    {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
