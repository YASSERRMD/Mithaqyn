'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const BRAND_NAVY = '#1B2A4A';
const BRAND_GOLD = '#C5A55A';

interface PaymentScheduleItem {
  milestone: string;
  amount: number | null;
  dueDate: string | null;
  description: string;
}

interface PenaltyClause {
  type: string;
  amount: number | null;
  percentage: number | null;
  triggerCondition: string;
}

interface LatePaymentTerms {
  interestRate: number | null;
  gracePeriodDays: number | null;
  description: string | null;
}

interface PriceEscalationClause {
  hasEscalation: boolean;
  escalationRate: number | null;
  indexLinked: boolean;
  description: string | null;
}

interface FinancialAnalysisResult {
  paymentSchedule: PaymentScheduleItem[];
  penaltyClauses: PenaltyClause[];
  latePaymentTerms: LatePaymentTerms;
  priceEscalationClause: PriceEscalationClause;
  totalContractValue: number | null;
  currency: string | null;
  paymentTermsDays: number | null;
  invoicingFrequency: string | null;
}

interface FinancialSummaryResponse {
  jobId: string;
  result: FinancialAnalysisResult;
}

function formatCurrency(amount: number | null, currency: string | null) {
  if (amount == null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string | null) {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

export default function ContractFinancialPage() {
  const { id } = useParams<{ id: string }>();
  const [summary, setSummary] = useState<FinancialSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [analyzeError, setAnalyzeError] = useState('');

  function getToken() {
    return localStorage.getItem('token') ?? '';
  }

  async function loadSummary() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/contracts/${id}/financial-summary`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (r.ok) {
        const data: FinancialSummaryResponse | null = await r.json();
        setSummary(data);
      } else if (r.status !== 404) {
        setError('Failed to load financial summary');
      }
    } catch {
      setError('Network error loading financial summary');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, [id]);

  async function handleRunAnalysis() {
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      const r = await fetch(`/api/contracts/${id}/financial-analysis`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setAnalyzeError(body.message ?? 'Analysis failed');
        return;
      }
      const data: FinancialSummaryResponse = await r.json();
      setSummary(data);
    } catch {
      setAnalyzeError('Network error running analysis');
    } finally {
      setAnalyzing(false);
    }
  }

  const result = summary?.result;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Link
            href="/contracts"
            style={{ color: BRAND_NAVY, textDecoration: 'none', fontSize: 14, opacity: 0.7 }}
          >
            Contracts
          </Link>
          <span style={{ color: '#9CA3AF', fontSize: 14 }}>/</span>
          <Link
            href={`/contracts/${id}`}
            style={{ color: BRAND_NAVY, textDecoration: 'none', fontSize: 14, opacity: 0.7 }}
          >
            Contract
          </Link>
          <span style={{ color: '#9CA3AF', fontSize: 14 }}>/</span>
          <span style={{ color: BRAND_NAVY, fontSize: 14, fontWeight: 600 }}>
            Financial Terms
          </span>
        </div>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 32,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: BRAND_NAVY, margin: 0 }}>
              Financial Terms Intelligence
            </h1>
            <p style={{ color: '#6B7280', marginTop: 4, fontSize: 15 }}>
              AI-extracted payment schedules, penalties, escalation clauses, and financial terms.
            </p>
          </div>
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            style={{
              background: analyzing ? '#9CA3AF' : BRAND_NAVY,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 22px',
              fontSize: 14,
              fontWeight: 600,
              cursor: analyzing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.2s',
            }}
          >
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>

        {analyzeError && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 8,
              padding: 14,
              color: '#DC2626',
              marginBottom: 20,
              fontSize: 14,
            }}
          >
            {analyzeError}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: '#6B7280' }}>
            Loading financial analysis...
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 8,
              padding: 14,
              color: '#DC2626',
              marginBottom: 20,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {!loading && !result && !error && (
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
            <p style={{ color: '#6B7280', fontSize: 16, margin: '0 0 16px' }}>
              No financial analysis found for this contract.
            </p>
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>
              Click <strong>Run Analysis</strong> to extract financial terms using AI.
            </p>
          </div>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Overview KPIs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
              }}
            >
              <FinKPI
                label="Total Contract Value"
                value={formatCurrency(result.totalContractValue, result.currency)}
                accent={BRAND_GOLD}
              />
              <FinKPI
                label="Currency"
                value={result.currency ?? 'N/A'}
                accent={BRAND_NAVY}
              />
              <FinKPI
                label="Payment Terms"
                value={result.paymentTermsDays != null ? `Net ${result.paymentTermsDays}` : 'N/A'}
                accent="#2563EB"
              />
              <FinKPI
                label="Invoicing Frequency"
                value={result.invoicingFrequency ?? 'N/A'}
                accent="#16A34A"
              />
            </div>

            {/* Payment Schedule */}
            <Section title="Payment Schedule">
              {result.paymentSchedule && result.paymentSchedule.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${BRAND_NAVY}` }}>
                        {['Milestone', 'Amount', 'Due Date', 'Description'].map((h) => (
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
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.paymentSchedule.map((item, i) => (
                        <tr
                          key={i}
                          style={{
                            backgroundColor: i % 2 === 0 ? '#F9FAFB' : '#fff',
                            borderBottom: '1px solid #E5E7EB',
                          }}
                        >
                          <td style={{ padding: '12px 14px', fontWeight: 500, color: BRAND_NAVY }}>
                            {item.milestone}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#374151', fontWeight: 600 }}>
                            {formatCurrency(item.amount, result.currency)}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#374151' }}>
                            {formatDate(item.dueDate)}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#6B7280', maxWidth: 300 }}>
                            {item.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState message="No payment schedule found in contract" />
              )}
            </Section>

            {/* Penalty Clauses */}
            <Section title="Penalty Clauses">
              {result.penaltyClauses && result.penaltyClauses.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {result.penaltyClauses.map((clause, i) => (
                    <div
                      key={i}
                      style={{
                        background: '#FFF7ED',
                        border: '1px solid #FED7AA',
                        borderLeft: `4px solid #F97316`,
                        borderRadius: 8,
                        padding: '14px 16px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#9A3412', fontSize: 14 }}>
                          {clause.type}
                        </span>
                        <span style={{ fontWeight: 700, color: '#DC2626', fontSize: 14 }}>
                          {clause.amount != null
                            ? formatCurrency(clause.amount, result.currency)
                            : clause.percentage != null
                            ? `${clause.percentage}%`
                            : 'N/A'}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: '#7C2D12', fontSize: 13 }}>
                        <strong>Trigger:</strong> {clause.triggerCondition}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No penalty clauses found in contract" />
              )}
            </Section>

            {/* Late Payment Terms & Price Escalation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Late Payment Terms */}
              <Section title="Late Payment Terms">
                {result.latePaymentTerms ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <InfoRow
                      label="Interest Rate"
                      value={
                        result.latePaymentTerms.interestRate != null
                          ? `${result.latePaymentTerms.interestRate}% p.a.`
                          : 'N/A'
                      }
                    />
                    <InfoRow
                      label="Grace Period"
                      value={
                        result.latePaymentTerms.gracePeriodDays != null
                          ? `${result.latePaymentTerms.gracePeriodDays} days`
                          : 'N/A'
                      }
                    />
                    {result.latePaymentTerms.description && (
                      <div style={{ marginTop: 8 }}>
                        <p style={{ margin: 0, color: '#374151', fontSize: 14, lineHeight: 1.6 }}>
                          {result.latePaymentTerms.description}
                        </p>
                      </div>
                    )}
                    {!result.latePaymentTerms.description &&
                      result.latePaymentTerms.interestRate == null &&
                      result.latePaymentTerms.gracePeriodDays == null && (
                        <EmptyState message="No late payment terms found" />
                      )}
                  </div>
                ) : (
                  <EmptyState message="No late payment terms found" />
                )}
              </Section>

              {/* Price Escalation */}
              <Section title="Price Escalation Clause">
                {result.priceEscalationClause ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <InfoRow
                      label="Has Escalation"
                      value={result.priceEscalationClause.hasEscalation ? 'Yes' : 'No'}
                      valueColor={result.priceEscalationClause.hasEscalation ? '#D97706' : '#16A34A'}
                    />
                    {result.priceEscalationClause.hasEscalation && (
                      <>
                        <InfoRow
                          label="Escalation Rate"
                          value={
                            result.priceEscalationClause.escalationRate != null
                              ? `${result.priceEscalationClause.escalationRate}%`
                              : 'N/A'
                          }
                        />
                        <InfoRow
                          label="Index Linked"
                          value={result.priceEscalationClause.indexLinked ? 'Yes' : 'No'}
                        />
                      </>
                    )}
                    {result.priceEscalationClause.description && (
                      <div style={{ marginTop: 8 }}>
                        <p style={{ margin: 0, color: '#374151', fontSize: 14, lineHeight: 1.6 }}>
                          {result.priceEscalationClause.description}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState message="No price escalation clause found" />
                )}
              </Section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
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
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: BRAND_NAVY,
          marginBottom: 16,
          borderBottom: `2px solid ${BRAND_GOLD}`,
          paddingBottom: 10,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function FinKPI({ label, value, accent }: { label: string; value: string; accent: string }) {
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
      <p style={{ fontSize: 20, fontWeight: 700, color: accent, margin: 0 }}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid #F3F4F6',
      }}
    >
      <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: valueColor ?? BRAND_NAVY }}>{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p style={{ color: '#9CA3AF', fontSize: 14, margin: 0, padding: '12px 0' }}>{message}</p>
  );
}
