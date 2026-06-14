'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Globe,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  AlertTriangle,
  TrendingUp,
  Clock,
  FileText,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface Counterparty {
  id: string;
  name: string;
  type: string;
  country?: string;
  city?: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  riskRating?: string;
  registrationNumber?: string;
  notes?: string;
}

interface ContractRow {
  id: string;
  title: string;
  type: string;
  status: string;
  value: number;
  riskLevel?: string;
  expiryDate?: string;
}

interface Exposure {
  totalValue: number;
  activeContracts: number;
  highRiskContracts: number;
  expiringIn90Days: number;
  overdueObligations: number;
}

interface Performance {
  completedObligations: number;
  overdueObligations: number;
  obligationCompletionRate: number;
}

interface VendorProfile {
  counterparty: Counterparty;
  contracts: ContractRow[];
  exposure: Exposure;
  performance: Performance;
}

const RISK_COLORS: Record<string, { bg: string; color: string }> = {
  LOW: { bg: '#DCFCE7', color: '#166534' },
  MEDIUM: { bg: '#FEF9C3', color: '#854D0E' },
  HIGH: { bg: '#FFEDD5', color: '#9A3412' },
  CRITICAL: { bg: '#FEE2E2', color: '#991B1B' },
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: '#DCFCE7', color: '#166534' },
  DRAFT: { bg: '#F3F4F6', color: '#6B7280' },
  EXPIRED: { bg: '#FEE2E2', color: '#991B1B' },
  TERMINATED: { bg: '#FEE2E2', color: '#991B1B' },
  UNDER_REVIEW: { bg: '#FEF9C3', color: '#854D0E' },
  PENDING_SIGNATURE: { bg: '#DBEAFE', color: '#1E40AF' },
  ARCHIVED: { bg: '#F3F4F6', color: '#6B7280' },
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

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: colors.bg, color: colors.color }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function VendorProfilePage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await apiClient.get(`/counterparties/${params.id}/profile`);
        setProfile(res.data);
      } catch {
        setError('Failed to load vendor profile.');
      } finally {
        setLoading(false);
      }
    }
    if (params.id) load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#C5A55A', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-16 text-red-600">
        {error || 'Vendor not found.'}
      </div>
    );
  }

  const { counterparty, contracts, exposure, performance } = profile;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/counterparties"
          className="inline-flex items-center gap-1.5 text-sm mb-3"
          style={{ color: '#C5A55A' }}
        >
          <ArrowLeft size={14} />
          Back to Vendors
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
              style={{ background: '#1B2A4A' }}
            >
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>
                {counterparty.name}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: '#888' }}>
                {counterparty.type}
                {counterparty.industry && ` · ${counterparty.industry}`}
              </p>
            </div>
          </div>
          {counterparty.riskRating && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: '#888' }}>
                Risk Rating
              </span>
              <RiskBadge level={counterparty.riskRating} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Counterparty Details */}
        <div className="lg:col-span-1 space-y-6">
          <div
            className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: '#E8E0D0', background: '#FAFAF8' }}
          >
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: '#1B2A4A' }}>
              Vendor Details
            </h2>
            <div className="space-y-3">
              {counterparty.email && (
                <div className="flex items-center gap-2.5 text-sm" style={{ color: '#444' }}>
                  <Mail size={14} style={{ color: '#C5A55A' }} />
                  {counterparty.email}
                </div>
              )}
              {counterparty.phone && (
                <div className="flex items-center gap-2.5 text-sm" style={{ color: '#444' }}>
                  <Phone size={14} style={{ color: '#C5A55A' }} />
                  {counterparty.phone}
                </div>
              )}
              {counterparty.website && (
                <div className="flex items-center gap-2.5 text-sm" style={{ color: '#444' }}>
                  <Globe size={14} style={{ color: '#C5A55A' }} />
                  <a
                    href={counterparty.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1B2A4A' }}
                    className="underline underline-offset-2"
                  >
                    {counterparty.website}
                  </a>
                </div>
              )}
              {(counterparty.city || counterparty.country) && (
                <div className="flex items-center gap-2.5 text-sm" style={{ color: '#444' }}>
                  <MapPin size={14} style={{ color: '#C5A55A' }} />
                  {[counterparty.city, counterparty.country].filter(Boolean).join(', ')}
                </div>
              )}
              {counterparty.industry && (
                <div className="flex items-center gap-2.5 text-sm" style={{ color: '#444' }}>
                  <Briefcase size={14} style={{ color: '#C5A55A' }} />
                  {counterparty.industry}
                </div>
              )}
              {counterparty.registrationNumber && (
                <div className="text-sm" style={{ color: '#888' }}>
                  Reg #: {counterparty.registrationNumber}
                </div>
              )}
            </div>
            {counterparty.notes && (
              <div
                className="mt-3 p-3 rounded-lg text-xs"
                style={{ background: '#F3EFE6', color: '#555' }}
              >
                {counterparty.notes}
              </div>
            )}
          </div>

          {/* Performance */}
          <div
            className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: '#E8E0D0', background: '#FAFAF8' }}
          >
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: '#1B2A4A' }}>
              Obligation Performance
            </h2>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: '#888' }}>
                  Completion Rate
                </span>
                <span className="text-sm font-semibold" style={{ color: '#1B2A4A' }}>
                  {performance.obligationCompletionRate}%
                </span>
              </div>
              <div
                className="w-full rounded-full h-2.5"
                style={{ background: '#E8E0D0' }}
              >
                <div
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${performance.obligationCompletionRate}%`,
                    background:
                      performance.obligationCompletionRate >= 80
                        ? '#22C55E'
                        : performance.obligationCompletionRate >= 50
                        ? '#C5A55A'
                        : '#EF4444',
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: '#166534' }}>
                  {performance.completedObligations}
                </div>
                <div className="text-xs" style={{ color: '#888' }}>
                  Completed
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: '#991B1B' }}>
                  {performance.overdueObligations}
                </div>
                <div className="text-xs" style={{ color: '#888' }}>
                  Overdue
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Exposure + Contracts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Exposure KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Value',
                value: formatCurrency(exposure.totalValue),
                icon: TrendingUp,
                accent: '#C5A55A',
              },
              {
                label: 'Active Contracts',
                value: exposure.activeContracts,
                icon: FileText,
                accent: '#1B2A4A',
              },
              {
                label: 'High Risk',
                value: exposure.highRiskContracts,
                icon: AlertTriangle,
                accent: '#9A3412',
              },
              {
                label: 'Expiring (90d)',
                value: exposure.expiringIn90Days,
                icon: Clock,
                accent: '#854D0E',
              },
            ].map(({ label, value, icon: Icon, accent }) => (
              <div
                key={label}
                className="rounded-xl border p-4 flex flex-col gap-2"
                style={{ borderColor: '#E8E0D0', background: '#FAFAF8' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${accent}1A` }}
                >
                  <Icon size={16} style={{ color: accent }} />
                </div>
                <div className="text-xl font-bold" style={{ color: '#1B2A4A' }}>
                  {value}
                </div>
                <div className="text-xs" style={{ color: '#888' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Contracts Table */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: '#E8E0D0' }}
          >
            <div
              className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: '#E8E0D0', background: '#FAFAF8' }}
            >
              <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: '#1B2A4A' }}>
                Contracts ({contracts.length})
              </h2>
            </div>
            {contracts.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: '#888' }}>
                No contracts found for this vendor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#F7F4EF' }}>
                      {['Title', 'Type', 'Status', 'Risk', 'Value', 'Expiry'].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                            style={{ color: '#888' }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((c, idx) => (
                      <tr
                        key={c.id}
                        style={{
                          background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAF8',
                          borderTop: '1px solid #F0EBE1',
                        }}
                      >
                        <td className="px-4 py-3 font-medium max-w-[200px] truncate" style={{ color: '#1B2A4A' }}>
                          <Link
                            href={`/contracts/${c.id}`}
                            className="hover:underline underline-offset-2"
                            style={{ color: '#1B2A4A' }}
                          >
                            {c.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3" style={{ color: '#555' }}>
                          {c.type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-4 py-3">
                          {c.riskLevel ? (
                            <RiskBadge level={c.riskLevel} />
                          ) : (
                            <span style={{ color: '#CCC' }}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium" style={{ color: '#1B2A4A' }}>
                          {c.value > 0 ? formatCurrency(c.value) : '—'}
                        </td>
                        <td className="px-4 py-3" style={{ color: '#555' }}>
                          {c.expiryDate
                            ? new Date(c.expiryDate).toLocaleDateString()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
