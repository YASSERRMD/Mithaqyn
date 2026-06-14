'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const BRAND_NAVY = '#1B2A4A';
const BRAND_GOLD = '#C5A55A';

interface CategoryStat {
  category: string;
  count: number;
  totalBudget: number;
}

interface ProcurementAnalytics {
  byCategory: CategoryStat[];
  totalBudget: number;
  totalContracts: number;
  avgBudget: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  IT: 'IT',
  FACILITIES: 'Facilities',
  SERVICES: 'Services',
  GOODS: 'Goods',
  CONSTRUCTION: 'Construction',
  CONSULTING: 'Consulting',
  OTHER: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  IT: '#2563EB',
  FACILITIES: '#16A34A',
  SERVICES: '#D97706',
  GOODS: '#7C3AED',
  CONSTRUCTION: '#DC2626',
  CONSULTING: '#0891B2',
  OTHER: '#6B7280',
};

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: amount >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(amount);
}

export default function ProcurementPage() {
  const [analytics, setAnalytics] = useState<ProcurementAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/procurement/analytics', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load procurement analytics');
        return r.json();
      })
      .then(setAnalytics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const maxBudget =
    analytics && analytics.byCategory.length > 0
      ? Math.max(...analytics.byCategory.map((c) => c.totalBudget))
      : 1;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Link
            href="/dashboard"
            style={{ color: BRAND_NAVY, textDecoration: 'none', fontSize: 14, opacity: 0.7 }}
          >
            Dashboard
          </Link>
          <span style={{ color: '#9CA3AF', fontSize: 14 }}>/</span>
          <span style={{ color: BRAND_NAVY, fontSize: 14, fontWeight: 600 }}>Procurement</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: BRAND_NAVY, margin: 0 }}>
              Procurement Dashboard
            </h1>
            <p style={{ color: '#6B7280', marginTop: 4, fontSize: 15 }}>
              Monitor procurement activity, budget allocation, and contract categories.
            </p>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: '#6B7280', fontSize: 16 }}>
            Loading procurement data...
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 8,
              padding: 16,
              color: '#DC2626',
              marginBottom: 24,
            }}
          >
            {error}
          </div>
        )}

        {!loading && analytics && (
          <>
            {/* KPI Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 20,
                marginBottom: 32,
              }}
            >
              <KPICard
                label="Total Portfolio Budget"
                value={formatCurrency(analytics.totalBudget)}
                accent={BRAND_GOLD}
              />
              <KPICard
                label="Total Procurement Contracts"
                value={String(analytics.totalContracts)}
                accent={BRAND_NAVY}
              />
              <KPICard
                label="Average Contract Budget"
                value={formatCurrency(analytics.avgBudget)}
                accent="#2563EB"
              />
              <KPICard
                label="Active Categories"
                value={String(analytics.byCategory.length)}
                accent="#16A34A"
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 24,
                marginBottom: 32,
              }}
            >
              {/* Bar Chart */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 24,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: '1px solid #E5E7EB',
                }}
              >
                <h2
                  style={{ fontSize: 16, fontWeight: 600, color: BRAND_NAVY, marginBottom: 20 }}
                >
                  Budget by Category
                </h2>
                {analytics.byCategory.length === 0 ? (
                  <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 32 }}>
                    No procurement data yet
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {analytics.byCategory
                      .sort((a, b) => b.totalBudget - a.totalBudget)
                      .map((cat) => {
                        const pct = maxBudget > 0 ? (cat.totalBudget / maxBudget) * 100 : 0;
                        const color = CATEGORY_COLORS[cat.category] ?? '#6B7280';
                        return (
                          <div key={cat.category}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 6,
                                fontSize: 13,
                              }}
                            >
                              <span style={{ fontWeight: 500, color: BRAND_NAVY }}>
                                {CATEGORY_LABELS[cat.category] ?? cat.category}
                              </span>
                              <span style={{ color: '#6B7280' }}>
                                {formatCurrency(cat.totalBudget)}
                              </span>
                            </div>
                            <div
                              style={{
                                height: 10,
                                borderRadius: 5,
                                background: '#F3F4F6',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  background: color,
                                  borderRadius: 5,
                                  transition: 'width 0.6s ease',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Contracts by Category Chart */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 24,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: '1px solid #E5E7EB',
                }}
              >
                <h2
                  style={{ fontSize: 16, fontWeight: 600, color: BRAND_NAVY, marginBottom: 20 }}
                >
                  Contracts by Category
                </h2>
                {analytics.byCategory.length === 0 ? (
                  <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 32 }}>
                    No procurement data yet
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {analytics.byCategory
                      .sort((a, b) => b.count - a.count)
                      .map((cat) => {
                        const maxCount = Math.max(...analytics.byCategory.map((c) => c.count));
                        const pct = maxCount > 0 ? (cat.count / maxCount) * 100 : 0;
                        const color = CATEGORY_COLORS[cat.category] ?? '#6B7280';
                        return (
                          <div key={cat.category}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 6,
                                fontSize: 13,
                              }}
                            >
                              <span style={{ fontWeight: 500, color: BRAND_NAVY }}>
                                {CATEGORY_LABELS[cat.category] ?? cat.category}
                              </span>
                              <span style={{ color: '#6B7280' }}>{cat.count} contracts</span>
                            </div>
                            <div
                              style={{
                                height: 10,
                                borderRadius: 5,
                                background: '#F3F4F6',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  background: color,
                                  borderRadius: 5,
                                  transition: 'width 0.6s ease',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: 24,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                border: '1px solid #E5E7EB',
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 600, color: BRAND_NAVY, marginBottom: 20 }}>
                Category Breakdown
              </h2>
              {analytics.byCategory.length === 0 ? (
                <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 32 }}>
                  No procurement categories found. Attach procurement references to contracts.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${BRAND_NAVY}` }}>
                        {['Category', 'Contracts', 'Total Budget', 'Avg Budget', 'Share'].map(
                          (h) => (
                            <th
                              key={h}
                              style={{
                                padding: '10px 14px',
                                textAlign: 'left',
                                fontWeight: 600,
                                color: BRAND_NAVY,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.byCategory
                        .sort((a, b) => b.totalBudget - a.totalBudget)
                        .map((cat, i) => {
                          const share =
                            analytics.totalBudget > 0
                              ? ((cat.totalBudget / analytics.totalBudget) * 100).toFixed(1)
                              : '0.0';
                          const avg =
                            cat.count > 0 ? cat.totalBudget / cat.count : 0;
                          const color = CATEGORY_COLORS[cat.category] ?? '#6B7280';
                          return (
                            <tr
                              key={cat.category}
                              style={{
                                backgroundColor: i % 2 === 0 ? '#F9FAFB' : '#fff',
                                borderBottom: '1px solid #E5E7EB',
                              }}
                            >
                              <td style={{ padding: '12px 14px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 10,
                                      height: 10,
                                      borderRadius: '50%',
                                      background: color,
                                      display: 'inline-block',
                                      flexShrink: 0,
                                    }}
                                  />
                                  <span style={{ fontWeight: 500, color: BRAND_NAVY }}>
                                    {CATEGORY_LABELS[cat.category] ?? cat.category}
                                  </span>
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', color: '#374151' }}>
                                {cat.count}
                              </td>
                              <td style={{ padding: '12px 14px', color: '#374151', fontWeight: 500 }}>
                                {formatCurrency(cat.totalBudget)}
                              </td>
                              <td style={{ padding: '12px 14px', color: '#374151' }}>
                                {formatCurrency(avg)}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span
                                  style={{
                                    background: `${color}20`,
                                    color,
                                    borderRadius: 12,
                                    padding: '2px 10px',
                                    fontWeight: 600,
                                    fontSize: 13,
                                  }}
                                >
                                  {share}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: `2px solid ${BRAND_NAVY}` }}>
                        <td
                          style={{
                            padding: '12px 14px',
                            fontWeight: 700,
                            color: BRAND_NAVY,
                          }}
                        >
                          Total
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: BRAND_NAVY }}>
                          {analytics.totalContracts}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: BRAND_GOLD }}>
                          {formatCurrency(analytics.totalBudget)}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: BRAND_NAVY }}>
                          {formatCurrency(analytics.avgBudget)}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: BRAND_NAVY }}>
                          100%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #E5E7EB',
        borderTop: `4px solid ${accent}`,
      }}
    >
      <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 8px', fontWeight: 500 }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 700, color: accent, margin: 0 }}>{value}</p>
    </div>
  );
}
