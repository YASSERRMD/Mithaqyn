'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import {
  FileText, AlertTriangle, Clock, CheckSquare, TrendingUp,
  Download, RefreshCw, ChevronLeft, ChevronRight, BarChart2,
  DollarSign, Shield, Activity,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SummaryData {
  totalContracts: number;
  byStatus: Record<string, number>;
  totalObligations: number;
  overdueObligations: number;
  openRisks: number;
  criticalRisks: number;
  upcomingRenewals30Days: number;
  avgContractValue: number;
}

type ReportType = 'contracts' | 'obligations' | 'risks' | 'financial' | 'audit';

interface ReportConfig {
  label: string;
  endpoint: string;
  icon: React.ReactNode;
  description: string;
  roleHint: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REPORT_TYPES: Record<ReportType, ReportConfig> = {
  contracts: {
    label: 'Contracts',
    endpoint: '/reports/contracts',
    icon: <FileText size={16} />,
    description: 'Full contract list with counterparty, value, dates, and risk data.',
    roleHint: 'Auditor+',
  },
  obligations: {
    label: 'Obligations',
    endpoint: '/reports/obligations',
    icon: <CheckSquare size={16} />,
    description: 'All obligations with due dates, status, and contract linkage.',
    roleHint: 'Auditor+',
  },
  risks: {
    label: 'Risks',
    endpoint: '/reports/risks',
    icon: <AlertTriangle size={16} />,
    description: 'Risk findings with severity, recommendations, and contract context.',
    roleHint: 'Auditor+',
  },
  financial: {
    label: 'Financial',
    endpoint: '/reports/financial',
    icon: <DollarSign size={16} />,
    description: 'Contract values, penalty clauses, and financial analysis summary.',
    roleHint: 'Legal Admin+',
  },
  audit: {
    label: 'Audit Trail',
    endpoint: '/reports/audit',
    icon: <Activity size={16} />,
    description: 'Full audit log of user actions with timestamps and IP addresses.',
    roleHint: 'Legal Admin+',
  },
};

const STATUS_BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE:           { bg: '#DCFCE7', color: '#166534' },
  DRAFT:            { bg: '#FEF9C3', color: '#854D0E' },
  UNDER_REVIEW:     { bg: '#DBEAFE', color: '#1E40AF' },
  EXPIRED:          { bg: '#FEE2E2', color: '#991B1B' },
  TERMINATED:       { bg: '#F3F4F6', color: '#6B7280' },
  ARCHIVED:         { bg: '#F3F4F6', color: '#6B7280' },
  PENDING_SIGNATURE:{ bg: '#EDE9FE', color: '#6D28D9' },
  OPEN:             { bg: '#DBEAFE', color: '#1E40AF' },
  IN_PROGRESS:      { bg: '#FEF9C3', color: '#854D0E' },
  COMPLETED:        { bg: '#DCFCE7', color: '#166534' },
  OVERDUE:          { bg: '#FEE2E2', color: '#991B1B' },
  WAIVED:           { bg: '#F3F4F6', color: '#6B7280' },
  CANCELLED:        { bg: '#F3F4F6', color: '#6B7280' },
  CRITICAL:         { bg: '#FEF2F2', color: '#991B1B' },
  HIGH:             { bg: '#FFF7ED', color: '#C2410C' },
  MEDIUM:           { bg: '#FEFCE8', color: '#854D0E' },
  LOW:              { bg: '#F0FDF4', color: '#166534' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(val: number | null, currency = 'USD'): string {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1,
  }).format(val);
}

function StatusBadge({ value }: { value: string }) {
  const style = STATUS_BADGE_COLORS[value] ?? { bg: '#F0EDE4', color: '#1B2A4A' };
  return (
    <span
      style={{
        fontSize: 11, fontWeight: 600, borderRadius: 5,
        padding: '2px 7px', background: style.bg, color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </span>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: '10px 14px', fontSize: 13, color: '#444', borderBottom: '1px solid #F0EDE4', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {children}
    </td>
  );
}

const PAGE_SIZE = 20;

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon, color = '#1B2A4A', sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: '#fff', borderRadius: 12, border: '1px solid #E8E4DA',
        padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{label}</span>
        <div
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#F0EDE4', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color,
          }}
        >
          {icon}
        </div>
      </div>
      <div>
        <span style={{ fontSize: 24, fontWeight: 800, color }}>{value}</span>
        {sub && <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Report Table ─────────────────────────────────────────────────────────────

function renderTable(type: ReportType, data: Record<string, unknown>[]) {
  if (type === 'contracts') {
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#F8F7F4' }}>
            {['Title', 'Counterparty', 'Status', 'Type', 'Value', 'Risk', 'Expiry', 'Clauses'].map((h) => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#888', fontWeight: 700, borderBottom: '2px solid #E8E4DA' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id as string} style={{ transition: 'background 0.1s' }}>
              <Cell><span style={{ fontWeight: 600, color: '#1B2A4A' }}>{String(row.title ?? '')}</span></Cell>
              <Cell>{String(row.counterpartyName ?? '')}</Cell>
              <Cell><StatusBadge value={String(row.status ?? '')} /></Cell>
              <Cell>{String(row.type ?? '')}</Cell>
              <Cell>{row.value ? formatCurrency(Number(row.value), String(row.currency ?? 'USD')) : '—'}</Cell>
              <Cell>{row.riskLevel ? <StatusBadge value={String(row.riskLevel)} /> : '—'}</Cell>
              <Cell>{row.expiryDate ? new Date(String(row.expiryDate)).toLocaleDateString() : '—'}</Cell>
              <Cell>{String(row.clauseCount ?? 0)}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (type === 'obligations') {
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#F8F7F4' }}>
            {['Title', 'Contract', 'Counterparty', 'Due Date', 'Status', 'Priority', 'Escalated'].map((h) => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#888', fontWeight: 700, borderBottom: '2px solid #E8E4DA' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id as string}>
              <Cell><span style={{ fontWeight: 600, color: '#1B2A4A' }}>{String(row.title ?? '')}</span></Cell>
              <Cell>{String(row.contractTitle ?? '')}</Cell>
              <Cell>{String(row.counterpartyName ?? '')}</Cell>
              <Cell>{row.dueDate ? new Date(String(row.dueDate)).toLocaleDateString() : '—'}</Cell>
              <Cell><StatusBadge value={String(row.status ?? '')} /></Cell>
              <Cell><StatusBadge value={String(row.priority ?? '')} /></Cell>
              <Cell>{row.isEscalated ? <span style={{ color: '#DC2626', fontWeight: 700 }}>Yes</span> : 'No'}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (type === 'risks') {
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#F8F7F4' }}>
            {['Title', 'Contract', 'Severity', 'Category', 'Status', 'Confidence', 'Recommendation'].map((h) => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#888', fontWeight: 700, borderBottom: '2px solid #E8E4DA' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id as string}>
              <Cell><span style={{ fontWeight: 600, color: '#1B2A4A' }}>{String(row.title ?? '')}</span></Cell>
              <Cell>{String(row.contractTitle ?? '')}</Cell>
              <Cell><StatusBadge value={String(row.severity ?? '')} /></Cell>
              <Cell>{String(row.category ?? '')}</Cell>
              <Cell><StatusBadge value={String(row.status ?? '')} /></Cell>
              <Cell>{row.confidence ? `${Math.round(Number(row.confidence) * 100)}%` : '—'}</Cell>
              <Cell>{String(row.recommendation ?? '')}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (type === 'financial') {
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#F8F7F4' }}>
            {['Title', 'Counterparty', 'Status', 'Contract Value', 'Currency', 'Penalty Clauses', 'Expiry', 'AI Analyzed'].map((h) => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#888', fontWeight: 700, borderBottom: '2px solid #E8E4DA' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id as string}>
              <Cell><span style={{ fontWeight: 600, color: '#1B2A4A' }}>{String(row.title ?? '')}</span></Cell>
              <Cell>{String(row.counterpartyName ?? '')}</Cell>
              <Cell><StatusBadge value={String(row.status ?? '')} /></Cell>
              <Cell style={{ fontWeight: 700, color: '#1B2A4A' }}>{formatCurrency(Number(row.totalContractValue), String(row.currency ?? 'USD'))}</Cell>
              <Cell>{String(row.currency ?? 'USD')}</Cell>
              <Cell>{String(row.penaltyClausesCount ?? 0)}</Cell>
              <Cell>{row.expiryDate ? new Date(String(row.expiryDate)).toLocaleDateString() : '—'}</Cell>
              <Cell>{row.hasAiSummary ? <span style={{ color: '#16A34A', fontWeight: 700 }}>Yes</span> : 'No'}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (type === 'audit') {
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#F8F7F4' }}>
            {['Timestamp', 'User', 'Email', 'Role', 'Action', 'Entity', 'IP'].map((h) => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#888', fontWeight: 700, borderBottom: '2px solid #E8E4DA' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id as string}>
              <Cell>{new Date(String(row.timestamp)).toLocaleString()}</Cell>
              <Cell>{String(row.userName ?? '—')}</Cell>
              <Cell>{String(row.userEmail ?? '—')}</Cell>
              <Cell>{row.userRole ? <StatusBadge value={String(row.userRole)} /> : '—'}</Cell>
              <Cell><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#1B2A4A' }}>{String(row.action ?? '')}</span></Cell>
              <Cell>{String(row.entityType ?? '')}</Cell>
              <Cell>{String(row.ipAddress ?? '—')}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<ReportType>('contracts');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<Record<string, unknown>[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Fetch summary on mount
  useEffect(() => {
    apiClient
      .get('/reports/summary')
      .then((r) => setSummary(r.data))
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, []);

  const buildParams = useCallback(() => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return params;
  }, [startDate, endDate]);

  async function handleGenerateReport() {
    setReportLoading(true);
    setReportError('');
    setCurrentPage(1);
    setHasGenerated(true);
    try {
      const endpoint = REPORT_TYPES[selectedType].endpoint;
      const res = await apiClient.get(endpoint, { params: buildParams() });
      setReportData(res.data);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setReportError(msg ?? 'Failed to generate report. You may not have sufficient permissions.');
      setReportData([]);
    } finally {
      setReportLoading(false);
    }
  }

  function handleExportCsv() {
    const endpoint = REPORT_TYPES[selectedType].endpoint;
    const params = new URLSearchParams({ ...buildParams(), format: 'csv' });
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const token = typeof window !== 'undefined' ? localStorage.getItem('mithaqyn_token') : null;
    const url = `${API_URL}${endpoint}?${params.toString()}`;

    // Create a temporary anchor with Authorization header via fetch-blob download
    fetch(url, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${selectedType}-report.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => alert('Export failed. Check permissions.'));
  }

  // Pagination
  const totalPages = Math.ceil(reportData.length / PAGE_SIZE);
  const pageData = reportData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F4', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#1B2A4A', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <BarChart2 size={22} color="#C5A55A" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1B2A4A', margin: 0 }}>
              Enterprise Reports
            </h1>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
              Generate, filter, and export business intelligence reports
            </p>
          </div>
        </div>

        {/* Summary KPI Cards */}
        {summaryLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E4DA', padding: '16px 20px', height: 90, opacity: 0.4 }} />
            ))}
          </div>
        ) : summary ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14, marginBottom: 28 }}>
            <KpiCard
              label="Total Contracts"
              value={summary.totalContracts}
              icon={<FileText size={16} />}
              color="#1B2A4A"
            />
            <KpiCard
              label="Active"
              value={summary.byStatus?.ACTIVE ?? 0}
              icon={<CheckSquare size={16} />}
              color="#16A34A"
            />
            <KpiCard
              label="Under Review"
              value={summary.byStatus?.UNDER_REVIEW ?? 0}
              icon={<RefreshCw size={16} />}
              color="#2563EB"
            />
            <KpiCard
              label="Expired"
              value={summary.byStatus?.EXPIRED ?? 0}
              icon={<Clock size={16} />}
              color="#DC2626"
            />
            <KpiCard
              label="Open Risks"
              value={summary.openRisks}
              icon={<AlertTriangle size={16} />}
              color="#EA580C"
            />
            <KpiCard
              label="Critical Risks"
              value={summary.criticalRisks}
              icon={<Shield size={16} />}
              color="#DC2626"
            />
            <KpiCard
              label="Overdue Obligations"
              value={summary.overdueObligations}
              icon={<Clock size={16} />}
              color="#C5A55A"
            />
            <KpiCard
              label="Renewals Due (30d)"
              value={summary.upcomingRenewals30Days}
              icon={<TrendingUp size={16} />}
              color="#7C3AED"
              sub={summary.avgContractValue ? `Avg value: ${formatCurrency(summary.avgContractValue)}` : undefined}
            />
          </div>
        ) : null}

        {/* Report Builder */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8E4DA', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #F0EDE4', background: '#FAFAF8' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1B2A4A' }}>
              Report Builder
            </h2>
          </div>

          <div style={{ padding: '20px 24px' }}>
            {/* Report Type Selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Report Type
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(Object.entries(REPORT_TYPES) as [ReportType, ReportConfig][]).map(([type, cfg]) => (
                  <button
                    key={type}
                    onClick={() => { setSelectedType(type); setReportData([]); setHasGenerated(false); setReportError(''); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '8px 16px', borderRadius: 9,
                      border: `1.5px solid ${selectedType === type ? '#1B2A4A' : '#E8E4DA'}`,
                      background: selectedType === type ? '#1B2A4A' : '#fff',
                      color: selectedType === type ? '#C5A55A' : '#555',
                      cursor: 'pointer', fontWeight: 600, fontSize: 13,
                      transition: 'all 0.15s',
                    }}
                  >
                    {cfg.icon}
                    {cfg.label}
                    <span
                      style={{
                        fontSize: 10, padding: '1px 5px', borderRadius: 4,
                        background: selectedType === type ? 'rgba(197,165,90,0.2)' : '#F0EDE4',
                        color: selectedType === type ? '#C5A55A' : '#888',
                        fontWeight: 600,
                      }}
                    >
                      {cfg.roleHint}
                    </span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>
                {REPORT_TYPES[selectedType].description}
              </p>
            </div>

            {/* Date Range */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: 8,
                    border: '1px solid #E8E4DA', fontSize: 14, color: '#1B2A4A', outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: 8,
                    border: '1px solid #E8E4DA', fontSize: 14, color: '#1B2A4A', outline: 'none',
                  }}
                />
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={reportLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 20px', borderRadius: 9,
                  background: '#1B2A4A', color: '#C5A55A',
                  border: 'none', cursor: reportLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: 14, opacity: reportLoading ? 0.7 : 1,
                }}
              >
                <RefreshCw size={15} style={{ animation: reportLoading ? 'spin 0.8s linear infinite' : 'none' }} />
                {reportLoading ? 'Generating...' : 'Generate Report'}
              </button>

              {hasGenerated && reportData.length > 0 && (
                <button
                  onClick={handleExportCsv}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 20px', borderRadius: 9,
                    background: '#C5A55A', color: '#1B2A4A',
                    border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 14,
                  }}
                >
                  <Download size={15} />
                  Export CSV
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {reportError && (
          <div
            style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 12, padding: '14px 20px',
              color: '#DC2626', fontSize: 14, marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <AlertTriangle size={16} />
            {reportError}
          </div>
        )}

        {/* Results Table */}
        {hasGenerated && !reportLoading && !reportError && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8E4DA', overflow: 'hidden' }}>
            {/* Table header */}
            <div
              style={{
                padding: '14px 20px', borderBottom: '1px solid #F0EDE4',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FAFAF8',
              }}
            >
              <div style={{ display: 'flex', align: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1B2A4A' }}>
                  {REPORT_TYPES[selectedType].label} Report
                </span>
                <span
                  style={{
                    fontSize: 12, padding: '2px 10px', borderRadius: 99,
                    background: '#F0EDE4', color: '#888', fontWeight: 600,
                  }}
                >
                  {reportData.length} rows
                </span>
              </div>
              {reportData.length > 0 && (
                <span style={{ fontSize: 12, color: '#aaa' }}>
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </div>

            {reportData.length === 0 ? (
              <div style={{ padding: '64px 0', textAlign: 'center', color: '#aaa' }}>
                <BarChart2 size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontWeight: 600, fontSize: 15 }}>No data found</p>
                <p style={{ fontSize: 13, margin: '4px 0 0' }}>
                  Try adjusting your filters or date range.
                </p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  {renderTable(selectedType, pageData)}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div
                    style={{
                      padding: '12px 20px', borderTop: '1px solid #F0EDE4',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 12px', borderRadius: 7,
                        border: '1px solid #E8E4DA', background: currentPage === 1 ? '#F8F7F4' : '#fff',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        color: currentPage === 1 ? '#ccc' : '#1B2A4A', fontWeight: 600, fontSize: 13,
                      }}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>

                    {Array.from({ length: Math.min(7, totalPages) }).map((_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          style={{
                            width: 32, height: 32, borderRadius: 7, border: '1px solid #E8E4DA',
                            background: currentPage === page ? '#1B2A4A' : '#fff',
                            color: currentPage === page ? '#C5A55A' : '#666',
                            cursor: 'pointer', fontWeight: 700, fontSize: 13,
                          }}
                        >
                          {page}
                        </button>
                      );
                    })}

                    {totalPages > 7 && (
                      <span style={{ fontSize: 13, color: '#aaa' }}>… {totalPages}</span>
                    )}

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 12px', borderRadius: 7,
                        border: '1px solid #E8E4DA', background: currentPage === totalPages ? '#F8F7F4' : '#fff',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        color: currentPage === totalPages ? '#ccc' : '#1B2A4A', fontWeight: 600, fontSize: 13,
                      }}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
