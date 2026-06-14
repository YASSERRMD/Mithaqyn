'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Search, TrendingUp, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface VendorExposure {
  id: string;
  name: string;
  type: string;
  country?: string;
  industry?: string;
  riskRating?: string;
  totalContracts: number;
  activeContracts: number;
  highRiskContracts: number;
  expiringIn90Days: number;
  totalValue: number;
}

const RISK_COLORS: Record<string, { bg: string; color: string }> = {
  LOW: { bg: '#DCFCE7', color: '#166534' },
  MEDIUM: { bg: '#FEF9C3', color: '#854D0E' },
  HIGH: { bg: '#FFEDD5', color: '#9A3412' },
  CRITICAL: { bg: '#FEE2E2', color: '#991B1B' },
};

function RiskBadge({ level }: { level: string }) {
  const colors = RISK_COLORS[level] ?? { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: colors.bg, color: colors.color }}
    >
      {level}
    </span>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function CounterpartiesPage() {
  const [vendors, setVendors] = useState<VendorExposure[]>([]);
  const [filtered, setFiltered] = useState<VendorExposure[]>([]);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await apiClient.get('/counterparties/exposure-report');
        setVendors(res.data);
      } catch {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    let result = vendors;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.country?.toLowerCase().includes(q) ||
          v.industry?.toLowerCase().includes(q),
      );
    }
    if (riskFilter) {
      result = result.filter((v) => v.riskRating === riskFilter);
    }
    setFiltered(result);
  }, [vendors, search, riskFilter]);

  const totalExposure = vendors.reduce((sum, v) => sum + v.totalValue, 0);
  const totalActive = vendors.reduce((sum, v) => sum + v.activeContracts, 0);
  const highRiskCount = vendors.filter(
    (v) => v.riskRating === 'HIGH' || v.riskRating === 'CRITICAL',
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>
            Vendor Exposure Report
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#888' }}>
            {vendors.length} counterpart{vendors.length !== 1 ? 'ies' : 'y'} · sorted by total contract value
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Exposure',
            value: formatCurrency(totalExposure),
            icon: TrendingUp,
            accent: '#C5A55A',
          },
          {
            label: 'Active Contracts',
            value: totalActive,
            icon: Building2,
            accent: '#1B2A4A',
          },
          {
            label: 'High/Critical Risk Vendors',
            value: highRiskCount,
            icon: AlertTriangle,
            accent: '#9A3412',
          },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className="rounded-xl border p-5 flex items-center gap-4"
            style={{ borderColor: '#E8E0D0', background: '#FAFAF8' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${accent}1A` }}
            >
              <Icon size={20} style={{ color: accent }} />
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color: '#1B2A4A' }}>
                {value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#888' }}>
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: '#AAA' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
          />
        </div>
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm focus:outline-none"
          style={{ borderColor: '#D4C8A8', background: '#FAFAF8', color: '#444' }}
        >
          <option value="">All Risk Ratings</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: '#E8E0D0' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: '#C5A55A', borderTopColor: 'transparent' }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: '#888' }}>
            {search || riskFilter ? 'No vendors match your filters.' : 'No vendors found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#F7F4EF' }}>
                  {[
                    'Vendor',
                    'Industry',
                    'Country',
                    'Risk Rating',
                    'Active',
                    'High Risk',
                    'Expiring (90d)',
                    'Total Value',
                    '',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#888' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((vendor, idx) => (
                  <tr
                    key={vendor.id}
                    style={{
                      background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAF8',
                      borderTop: '1px solid #F0EBE1',
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: '#1B2A4A1A' }}
                        >
                          <Building2 size={14} style={{ color: '#1B2A4A' }} />
                        </div>
                        <div>
                          <div className="font-medium" style={{ color: '#1B2A4A' }}>
                            {vendor.name}
                          </div>
                          <div className="text-xs" style={{ color: '#888' }}>
                            {vendor.type} · {vendor.totalContracts} contract{vendor.totalContracts !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#555' }}>
                      {vendor.industry ?? <span style={{ color: '#CCC' }}>—</span>}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#555' }}>
                      {vendor.country ?? <span style={{ color: '#CCC' }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {vendor.riskRating ? (
                        <RiskBadge level={vendor.riskRating} />
                      ) : (
                        <span className="text-xs" style={{ color: '#CCC' }}>
                          Not set
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold"
                        style={{ background: '#DCFCE7', color: '#166534' }}
                      >
                        {vendor.activeContracts}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {vendor.highRiskContracts > 0 ? (
                        <span
                          className="inline-flex items-center justify-center gap-1 w-7 h-7 rounded-full text-xs font-semibold"
                          style={{ background: '#FEE2E2', color: '#991B1B' }}
                        >
                          {vendor.highRiskContracts}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: '#CCC' }}>
                          0
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {vendor.expiringIn90Days > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#854D0E' }}>
                          <Clock size={12} />
                          {vendor.expiringIn90Days}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: '#CCC' }}>
                          0
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#1B2A4A' }}>
                      {vendor.totalValue > 0 ? formatCurrency(vendor.totalValue) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/counterparties/${vendor.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
                        style={{
                          borderColor: '#C5A55A',
                          color: '#C5A55A',
                          background: '#C5A55A1A',
                        }}
                      >
                        <ExternalLink size={12} />
                        Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
