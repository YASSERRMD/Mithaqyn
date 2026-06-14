'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { RefreshCw, AlertTriangle, Clock } from 'lucide-react';

interface RenewalContract {
  id: string;
  title: string;
  type: string;
  status: string;
  expiryDate?: string;
  renewalDate?: string;
  autoRenewal: boolean;
  noticePeriodDays?: number;
  counterparty?: { name: string };
}

interface Stats {
  expiringIn30Days: number;
  expiringIn60Days: number;
  expiringIn90Days: number;
  autoRenewing: number;
  expired: number;
}

function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function RenewalsPage() {
  const [contracts, setContracts] = useState<RenewalContract[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiClient.get('/renewals'), apiClient.get('/renewals/stats')])
      .then(([r, s]) => {
        setContracts(r.data);
        setStats(s.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-8 text-center text-sm" style={{ color: '#AAA' }}>Loading renewals...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>Renewals</h1>
        <p className="text-sm mt-0.5" style={{ color: '#888' }}>Upcoming contract renewals and expirations</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Expiring in 30d', value: stats.expiringIn30Days, urgent: stats.expiringIn30Days > 0 },
            { label: 'Expiring in 60d', value: stats.expiringIn60Days },
            { label: 'Expiring in 90d', value: stats.expiringIn90Days },
            { label: 'Auto-Renewing', value: stats.autoRenewing },
            { label: 'Expired', value: stats.expired, urgent: stats.expired > 0 },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 border shadow-sm text-center" style={{ borderColor: s.urgent ? '#FECACA' : '#E8E4DC' }}>
              <p className="text-2xl font-bold" style={{ color: s.urgent ? '#DC2626' : '#1B2A4A' }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: '#888' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: '#E8E4DC' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: '#F0EDE8', background: '#FAFAF8' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#1B2A4A' }}>
            Upcoming Renewals (90-day window)
          </h2>
        </div>
        {contracts.length === 0 ? (
          <div className="py-10 text-center">
            <RefreshCw size={32} className="mx-auto mb-2" style={{ color: '#CCC' }} />
            <p className="text-sm" style={{ color: '#888' }}>No contracts expiring in the next 90 days.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#FAFAF8' }}>
                {['Contract', 'Counterparty', 'Expiry', 'Days Left', 'Auto-Renew', 'Notice'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#888' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const days = c.expiryDate ? daysUntil(c.expiryDate) : null;
                const urgent = days !== null && days <= 30;
                return (
                  <tr key={c.id} className="border-t" style={{ borderColor: '#F0EDE8' }}>
                    <td className="px-4 py-3">
                      <Link href={`/contracts/${c.id}`} className="font-medium hover:underline" style={{ color: '#1B2A4A' }}>
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#666' }}>{c.counterparty?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#666' }}>
                      {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {days !== null ? (
                        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: urgent ? '#DC2626' : '#555' }}>
                          {urgent && <AlertTriangle size={12} />}
                          {days}d
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.autoRenewal ? (
                        <span className="text-green-600 font-medium">Yes</span>
                      ) : (
                        <span style={{ color: '#AAA' }}>No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#666' }}>
                      {c.noticePeriodDays ? `${c.noticePeriodDays}d` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
