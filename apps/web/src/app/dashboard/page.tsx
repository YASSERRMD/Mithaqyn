'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  FileText, AlertTriangle, Clock, CheckSquare,
  TrendingUp, RefreshCw, Activity, ShieldAlert,
} from 'lucide-react';

interface DashboardData {
  kpis: {
    totalContracts: number;
    activeContracts: number;
    draftContracts: number;
    underReviewContracts: number;
    expiredContracts: number;
    terminatedContracts: number;
    highRiskContracts: number;
    criticalRiskContracts: number;
    expiringIn30: number;
    expiringIn90: number;
    overdueObligations: number;
    pendingObligations: number;
    avgClauseCoverage: number | null;
  };
  contractsByType: { type: string; count: number }[];
  contractsByRisk: { riskLevel: string; count: number }[];
  recentContracts: {
    id: string; title: string; type: string; status: string;
    riskLevel: string; createdAt: string; counterparty?: { name: string };
  }[];
  recentActivity: {
    id: string; type: string; status: string; createdAt: string;
    contractId?: string; contractTitle?: string;
  }[];
}

interface TrendPoint { month: string; count: number }

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#16A34A',
  DRAFT: '#D97706',
  UNDER_REVIEW: '#2563EB',
  EXPIRED: '#DC2626',
  TERMINATED: '#6B7280',
};

const RISK_COLORS: Record<string, string> = {
  LOW: '#16A34A',
  MEDIUM: '#D97706',
  HIGH: '#EA580C',
  CRITICAL: '#DC2626',
};

const CHART_PALETTE = ['#1B2A4A', '#C5A55A', '#2C3E5C', '#3B82F6', '#10B981', '#F59E0B'];

function KpiCard({
  icon: Icon, label, value, sub, urgent,
}: { icon: React.ElementType; label: string; value: string | number; sub?: string; urgent?: boolean }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 flex items-start gap-4"
      style={{ borderColor: urgent ? '#FECACA' : '#E8E4DC' }}>
      <div className="p-2.5 rounded-lg" style={{ background: urgent ? '#FEF2F2' : '#F7F5F0' }}>
        <Icon size={20} style={{ color: urgent ? '#DC2626' : '#1B2A4A' }} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#888' }}>{label}</p>
        <p className="text-2xl font-bold mt-0.5" style={{ color: urgent ? '#DC2626' : '#1B2A4A' }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: '#AAA' }}>{sub}</p>}
      </div>
    </div>
  );
}

function statusLabel(s: string) {
  return s.replace(/_/g, ' ');
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/dashboard/stats'),
      apiClient.get('/dashboard/trend'),
    ])
      .then(([s, t]) => {
        setData(s.data);
        setTrend(t.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#C5A55A', borderTopColor: 'transparent' }} />
        <p className="text-sm mt-3" style={{ color: '#888' }}>Loading dashboard...</p>
      </div>
    );
  }

  if (!data) return null;

  const { kpis } = data;

  const statusData = [
    { name: 'Active', value: kpis.activeContracts, color: STATUS_COLORS.ACTIVE },
    { name: 'Draft', value: kpis.draftContracts, color: STATUS_COLORS.DRAFT },
    { name: 'Under Review', value: kpis.underReviewContracts, color: STATUS_COLORS.UNDER_REVIEW },
    { name: 'Expired', value: kpis.expiredContracts, color: STATUS_COLORS.EXPIRED },
    { name: 'Terminated', value: kpis.terminatedContracts, color: STATUS_COLORS.TERMINATED },
  ].filter((d) => d.value > 0);

  const riskData = data.contractsByRisk.map((r) => ({
    name: r.riskLevel,
    value: r.count,
    color: RISK_COLORS[r.riskLevel] ?? '#6B7280',
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: '#888' }}>Contract intelligence overview</p>
      </div>

      {/* KPI row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={FileText} label="Total Contracts" value={kpis.totalContracts}
          sub={`${kpis.activeContracts} active`} />
        <KpiCard icon={ShieldAlert} label="High Risk" value={kpis.highRiskContracts}
          sub={`${kpis.criticalRiskContracts} critical`} urgent={kpis.criticalRiskContracts > 0} />
        <KpiCard icon={RefreshCw} label="Expiring (30d)" value={kpis.expiringIn30}
          sub={`${kpis.expiringIn90} in 90 days`} urgent={kpis.expiringIn30 > 0} />
        <KpiCard icon={CheckSquare} label="Overdue Tasks" value={kpis.overdueObligations}
          sub={`${kpis.pendingObligations} pending`} urgent={kpis.overdueObligations > 0} />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Clock} label="Drafts" value={kpis.draftContracts} />
        <KpiCard icon={Activity} label="Under Review" value={kpis.underReviewContracts} />
        <KpiCard icon={AlertTriangle} label="Expired" value={kpis.expiredContracts}
          urgent={kpis.expiredContracts > 0} />
        <KpiCard icon={TrendingUp} label="Clause Coverage"
          value={kpis.avgClauseCoverage !== null ? `${kpis.avgClauseCoverage}%` : '—'}
          sub="average across active contracts" />
      </div>

      {/* Trend + Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: '#E8E4DC' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#1B2A4A' }}>Contract Volume (6 months)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E4DC' }} />
              <Line type="monotone" dataKey="count" stroke="#C5A55A" strokeWidth={2.5}
                dot={{ fill: '#C5A55A', r: 4 }} name="Contracts" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: '#E8E4DC' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#1B2A4A' }}>By Status</h2>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                  dataKey="value" paddingAngle={2}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-12" style={{ color: '#CCC' }}>No data</p>
          )}
        </div>
      </div>

      {/* Risk + Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: '#E8E4DC' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#1B2A4A' }}>Risk Distribution</h2>
          {riskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={riskData} barSize={32}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E4DC' }} />
                <Bar dataKey="value" name="Contracts" radius={[4, 4, 0, 0]}>
                  {riskData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-10" style={{ color: '#CCC' }}>No risk data yet</p>
          )}
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: '#E8E4DC' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#1B2A4A' }}>By Contract Type</h2>
          {data.contractsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.contractsByType} layout="vertical" barSize={16}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="type" width={130} tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E4DC' }} />
                <Bar dataKey="count" name="Contracts" radius={[0, 4, 4, 0]}>
                  {data.contractsByType.map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-10" style={{ color: '#CCC' }}>No contracts yet</p>
          )}
        </div>
      </div>

      {/* Recent + Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: '#E8E4DC' }}>
          <div className="px-5 py-3 border-b flex items-center justify-between"
            style={{ borderColor: '#F0EDE8', background: '#FAFAF8' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#1B2A4A' }}>Recent Contracts</h2>
            <Link href="/contracts" className="text-xs font-medium" style={{ color: '#C5A55A' }}>View all</Link>
          </div>
          <div className="divide-y" style={{ borderColor: '#F0EDE8' }}>
            {data.recentContracts.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: '#CCC' }}>No contracts yet</p>
            ) : (
              data.recentContracts.map((c) => (
                <Link key={c.id} href={`/contracts/${c.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1B2A4A' }}>{c.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                      {c.counterparty?.name ?? '—'} · {c.type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: (STATUS_COLORS[c.status] ?? '#888') + '22',
                      color: STATUS_COLORS[c.status] ?? '#888',
                    }}>
                    {statusLabel(c.status)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: '#E8E4DC' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: '#F0EDE8', background: '#FAFAF8' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#1B2A4A' }}>Recent AI Activity</h2>
          </div>
          <div className="divide-y" style={{ borderColor: '#F0EDE8' }}>
            {data.recentActivity.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: '#CCC' }}>No AI jobs run yet</p>
            ) : (
              data.recentActivity.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold" style={{ color: '#1B2A4A' }}>
                      {a.type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#888' }}>
                      {a.contractTitle ?? 'Unknown contract'}
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: a.status === 'COMPLETED' ? '#F0FDF422' : a.status === 'FAILED' ? '#FEF2F222' : '#FFFBEB22',
                      color: a.status === 'COMPLETED' ? '#16A34A' : a.status === 'FAILED' ? '#DC2626' : '#D97706',
                    }}>
                    {a.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
