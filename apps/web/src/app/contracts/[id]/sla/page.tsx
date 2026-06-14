'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const BRAND_NAVY = '#1B2A4A';
const BRAND_GOLD = '#C5A55A';

type SlaStatus = 'MET' | 'BREACHED' | 'AT_RISK' | 'PENDING';

interface SlaRecord {
  id: string;
  actualValue: number;
  recordedAt: string;
  status: SlaStatus;
  notes?: string;
}

interface SlaMetric {
  id: string;
  metricName: string;
  targetValue: number;
  unit: string;
  measurementPeriod: string;
  penaltyPerBreach?: number | null;
  obligationTitle: string;
  totalRecords: number;
  breachedCount: number;
  atRiskCount: number;
  breachRate: number;
  penaltyExposure: number;
  latestRecord: SlaRecord | null;
  latestStatus: SlaStatus;
}

interface SlaReport {
  contractId: string;
  metrics: SlaMetric[];
  summary: {
    totalMetrics: number;
    totalObligations: number;
    totalPenaltyExposure: number;
    overallBreachRate: number;
  };
}

const STATUS_CONFIG: Record<SlaStatus, { label: string; bg: string; color: string; border: string }> = {
  MET:      { label: 'Met',      bg: '#F0FDF4', color: '#16A34A', border: '#86EFAC' },
  BREACHED: { label: 'Breached', bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' },
  AT_RISK:  { label: 'At Risk',  bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  PENDING:  { label: 'Pending',  bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
};

function StatusBadge({ status }: { status: SlaStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {cfg.label}
    </span>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

interface AddMetricFormData {
  metricName: string;
  targetValue: string;
  unit: string;
  measurementPeriod: string;
  penaltyPerBreach: string;
}

interface RecordModalState {
  open: boolean;
  metricId: string;
  metricName: string;
  actualValue: string;
  notes: string;
}

export default function ContractSlaPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<SlaReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedObligationId, setSelectedObligationId] = useState('');
  const [obligations, setObligations] = useState<Array<{ id: string; title: string }>>([]);
  const [addForm, setAddForm] = useState<AddMetricFormData>({
    metricName: '',
    targetValue: '',
    unit: '',
    measurementPeriod: 'MONTHLY',
    penaltyPerBreach: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const [recordModal, setRecordModal] = useState<RecordModalState>({
    open: false,
    metricId: '',
    metricName: '',
    actualValue: '',
    notes: '',
  });
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState('');

  function getToken() {
    return localStorage.getItem('token') ?? '';
  }

  async function loadReport() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/contracts/${id}/sla-report`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!r.ok) throw new Error('Failed to load SLA report');
      const data: SlaReport = await r.json();
      setReport(data);
    } catch {
      setError('Failed to load SLA report');
    } finally {
      setLoading(false);
    }
  }

  async function loadObligations() {
    try {
      const r = await fetch(`/api/contracts/${id}/obligations`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (r.ok) {
        const data: Array<{ id: string; title: string }> = await r.json();
        setObligations(data);
        if (data.length > 0) setSelectedObligationId(data[0].id);
      }
    } catch {
      // silent
    }
  }

  useEffect(() => {
    loadReport();
    loadObligations();
  }, [id]);

  async function handleAddMetric(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedObligationId) return;
    setAddLoading(true);
    setAddError('');
    try {
      const r = await fetch(`/api/obligations/${selectedObligationId}/sla-metrics`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metricName: addForm.metricName,
          targetValue: parseFloat(addForm.targetValue),
          unit: addForm.unit,
          measurementPeriod: addForm.measurementPeriod,
          penaltyPerBreach: addForm.penaltyPerBreach ? parseFloat(addForm.penaltyPerBreach) : undefined,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({})) as { message?: string };
        setAddError(body.message ?? 'Failed to create metric');
        return;
      }
      setAddForm({ metricName: '', targetValue: '', unit: '', measurementPeriod: 'MONTHLY', penaltyPerBreach: '' });
      setShowAddForm(false);
      await loadReport();
    } catch {
      setAddError('Network error');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRecordPerformance(e: React.FormEvent) {
    e.preventDefault();
    setRecordLoading(true);
    setRecordError('');
    try {
      const r = await fetch(`/api/sla-metrics/${recordModal.metricId}/records`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actualValue: parseFloat(recordModal.actualValue),
          notes: recordModal.notes || undefined,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({})) as { message?: string };
        setRecordError(body.message ?? 'Failed to record performance');
        return;
      }
      setRecordModal({ open: false, metricId: '', metricName: '', actualValue: '', notes: '' });
      await loadReport();
    } catch {
      setRecordError('Network error');
    } finally {
      setRecordLoading(false);
    }
  }

  const summary = report?.summary;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Link href="/contracts" style={{ color: BRAND_NAVY, textDecoration: 'none', fontSize: 14, opacity: 0.7 }}>
            Contracts
          </Link>
          <span style={{ color: '#9CA3AF', fontSize: 14 }}>/</span>
          <Link href={`/contracts/${id}`} style={{ color: BRAND_NAVY, textDecoration: 'none', fontSize: 14, opacity: 0.7 }}>
            Contract
          </Link>
          <span style={{ color: '#9CA3AF', fontSize: 14 }}>/</span>
          <span style={{ color: BRAND_NAVY, fontSize: 14, fontWeight: 600 }}>SLA Monitoring</span>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: BRAND_NAVY, margin: 0 }}>
              SLA & Performance Monitoring
            </h1>
            <p style={{ color: '#6B7280', marginTop: 4, fontSize: 15 }}>
              Track service level agreements, breach rates, and penalty exposure.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            style={{
              background: BRAND_NAVY,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 22px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showAddForm ? 'Cancel' : '+ Add Metric'}
          </button>
        </div>

        {/* Add Metric Form */}
        {showAddForm && (
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: `1px solid ${BRAND_GOLD}`,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, color: BRAND_NAVY, marginBottom: 16 }}>
              Add SLA Metric
            </h2>
            <form onSubmit={handleAddMetric}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Obligation</label>
                  <select
                    value={selectedObligationId}
                    onChange={(e) => setSelectedObligationId(e.target.value)}
                    style={inputStyle}
                    required
                  >
                    {obligations.length === 0 && <option value="">No obligations found</option>}
                    {obligations.map((o) => (
                      <option key={o.id} value={o.id}>{o.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Metric Name</label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. Uptime, Response Time"
                    value={addForm.metricName}
                    onChange={(e) => setAddForm((f) => ({ ...f, metricName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Target Value</label>
                  <input
                    type="number"
                    step="any"
                    style={inputStyle}
                    placeholder="e.g. 99.9"
                    value={addForm.targetValue}
                    onChange={(e) => setAddForm((f) => ({ ...f, targetValue: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Unit</label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. %, hours, days"
                    value={addForm.unit}
                    onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Measurement Period</label>
                  <select
                    style={inputStyle}
                    value={addForm.measurementPeriod}
                    onChange={(e) => setAddForm((f) => ({ ...f, measurementPeriod: e.target.value }))}
                  >
                    {['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'].map((p) => (
                      <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Penalty per Breach ($)</label>
                  <input
                    type="number"
                    step="any"
                    style={inputStyle}
                    placeholder="Optional"
                    value={addForm.penaltyPerBreach}
                    onChange={(e) => setAddForm((f) => ({ ...f, penaltyPerBreach: e.target.value }))}
                  />
                </div>
              </div>
              {addError && (
                <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{addError}</div>
              )}
              <button
                type="submit"
                disabled={addLoading}
                style={{
                  background: addLoading ? '#9CA3AF' : BRAND_GOLD,
                  color: BRAND_NAVY,
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: addLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {addLoading ? 'Creating...' : 'Create Metric'}
              </button>
            </form>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: 14, color: '#DC2626', marginBottom: 20, fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: '#6B7280' }}>
            Loading SLA report...
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Summary KPIs */}
            {summary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                <KpiCard label="Total Metrics" value={String(summary.totalMetrics)} accent={BRAND_NAVY} />
                <KpiCard label="Overall Breach Rate" value={`${summary.overallBreachRate}%`} accent="#DC2626" />
                <KpiCard label="Obligations Tracked" value={String(summary.totalObligations)} accent={BRAND_GOLD} />
                <KpiCard
                  label="Total Penalty Exposure"
                  value={formatCurrency(summary.totalPenaltyExposure)}
                  accent="#7C3AED"
                />
              </div>
            )}

            {/* Metrics Table */}
            {(!report?.metrics || report.metrics.length === 0) ? (
              <div
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 48,
                  textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: '1px solid #E5E7EB',
                }}
              >
                <p style={{ color: '#6B7280', fontSize: 16, margin: '0 0 8px' }}>No SLA metrics configured.</p>
                <p style={{ color: '#9CA3AF', fontSize: 14, margin: 0 }}>
                  Click <strong>+ Add Metric</strong> to start tracking performance obligations.
                </p>
              </div>
            ) : (
              <div
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: '1px solid #E5E7EB',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '18px 24px', borderBottom: `2px solid ${BRAND_GOLD}` }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: BRAND_NAVY, margin: 0 }}>
                    SLA Metrics
                  </h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB' }}>
                        {['Metric', 'Obligation', 'Target', 'Period', 'Status', 'Breach Rate', 'Penalty Exposure', 'Actions'].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: '10px 16px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: BRAND_NAVY,
                              whiteSpace: 'nowrap',
                              borderBottom: '1px solid #E5E7EB',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.metrics.map((m, i) => (
                        <tr
                          key={m.id}
                          style={{
                            backgroundColor: i % 2 === 0 ? '#fff' : '#F9FAFB',
                            borderBottom: '1px solid #E5E7EB',
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: BRAND_NAVY }}>
                            {m.metricName}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: 13 }}>
                            {m.obligationTitle}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 500 }}>
                            {m.targetValue} {m.unit}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: 12 }}>
                            {m.measurementPeriod.charAt(0) + m.measurementPeriod.slice(1).toLowerCase()}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <StatusBadge status={m.latestStatus} />
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div
                                style={{
                                  flex: 1,
                                  height: 6,
                                  background: '#E5E7EB',
                                  borderRadius: 3,
                                  minWidth: 60,
                                }}
                              >
                                <div
                                  style={{
                                    width: `${Math.min(m.breachRate, 100)}%`,
                                    height: '100%',
                                    background: m.breachRate > 50 ? '#DC2626' : m.breachRate > 20 ? '#D97706' : '#16A34A',
                                    borderRadius: 3,
                                    transition: 'width 0.3s',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: m.breachRate > 50 ? '#DC2626' : '#374151', minWidth: 36 }}>
                                {m.breachRate}%
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                              {m.breachedCount}/{m.totalRecords} records
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: m.penaltyExposure > 0 ? '#DC2626' : '#6B7280' }}>
                            {m.penaltyPerBreach != null ? formatCurrency(m.penaltyExposure) : '—'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <button
                              onClick={() =>
                                setRecordModal({
                                  open: true,
                                  metricId: m.id,
                                  metricName: m.metricName,
                                  actualValue: '',
                                  notes: '',
                                })
                              }
                              style={{
                                background: BRAND_NAVY,
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '5px 12px',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Record
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Record Performance Modal */}
      {recordModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 32,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: BRAND_NAVY, margin: '0 0 6px' }}>
              Record Performance
            </h2>
            <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 24px' }}>
              Metric: <strong>{recordModal.metricName}</strong>
            </p>
            <form onSubmit={handleRecordPerformance}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Actual Value *</label>
                <input
                  type="number"
                  step="any"
                  style={inputStyle}
                  placeholder="Enter the measured value"
                  value={recordModal.actualValue}
                  onChange={(e) => setRecordModal((m) => ({ ...m, actualValue: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Notes (optional)</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
                  placeholder="Add context or comments"
                  value={recordModal.notes}
                  onChange={(e) => setRecordModal((m) => ({ ...m, notes: e.target.value }))}
                />
              </div>
              {recordError && (
                <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 16 }}>{recordError}</div>
              )}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setRecordModal({ open: false, metricId: '', metricName: '', actualValue: '', notes: '' })}
                  style={{
                    background: '#F3F4F6',
                    color: BRAND_NAVY,
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordLoading}
                  style={{
                    background: recordLoading ? '#9CA3AF' : BRAND_NAVY,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 24px',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: recordLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {recordLoading ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '18px 22px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #E5E7EB',
        borderTop: `4px solid ${accent}`,
      }}
    >
      <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 700, color: accent, margin: 0 }}>{value}</p>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: BRAND_NAVY,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #D1D5DB',
  borderRadius: 8,
  fontSize: 14,
  color: '#111827',
  outline: 'none',
  background: '#fff',
  boxSizing: 'border-box',
};
