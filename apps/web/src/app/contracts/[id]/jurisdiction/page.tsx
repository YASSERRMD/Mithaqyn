'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const BRAND_NAVY = '#1B2A4A';
const BRAND_GOLD = '#C5A55A';

interface ArbitrationDetails {
  hasArbitration: boolean;
  institution: string;
  seat: string;
  rules: string;
  language: string;
}

interface DisputeResolution {
  mechanism: 'LITIGATION' | 'ARBITRATION' | 'MEDIATION' | 'HYBRID';
  escalationSteps: string[];
}

interface EnforcementRisk {
  risk: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface JurisdictionAnalysisResult {
  governingLaw: string;
  jurisdiction: string;
  arbitration: ArbitrationDetails;
  disputeResolution: DisputeResolution;
  enforcementRisks: EnforcementRisk[];
  jurisdictionConflicts: boolean;
  keyLegalConsiderations: string[];
  conflictOfLawsClauses: string[];
}

interface JurisdictionSummaryResponse {
  jobId: string;
  result: JurisdictionAnalysisResult;
}

function getMechanismColor(mechanism: string): { bg: string; text: string; border: string } {
  switch (mechanism) {
    case 'ARBITRATION':
      return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
    case 'LITIGATION':
      return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' };
    case 'MEDIATION':
      return { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' };
    case 'HYBRID':
      return { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' };
    default:
      return { bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' };
  }
}

function getSeverityColor(severity: string): { bg: string; text: string } {
  switch (severity) {
    case 'HIGH':
      return { bg: '#DC2626', text: '#fff' };
    case 'MEDIUM':
      return { bg: '#D97706', text: '#fff' };
    case 'LOW':
      return { bg: '#16A34A', text: '#fff' };
    default:
      return { bg: '#6B7280', text: '#fff' };
  }
}

export default function ContractJurisdictionPage() {
  const { id } = useParams<{ id: string }>();
  const [summary, setSummary] = useState<JurisdictionSummaryResponse | null>(null);
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
      const r = await fetch(`/api/contracts/${id}/jurisdiction-summary`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (r.ok) {
        const data: JurisdictionSummaryResponse | null = await r.json();
        setSummary(data);
      } else if (r.status !== 404) {
        setError('Failed to load jurisdiction analysis');
      }
    } catch {
      setError('Network error loading jurisdiction analysis');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRunAnalysis() {
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      const r = await fetch(`/api/contracts/${id}/jurisdiction-analysis`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setAnalyzeError((body as { message?: string }).message ?? 'Analysis failed');
        return;
      }
      const data: JurisdictionSummaryResponse = await r.json();
      setSummary(data);
    } catch {
      setAnalyzeError('Network error running analysis');
    } finally {
      setAnalyzing(false);
    }
  }

  const result = summary?.result;
  const mechanismColors = result?.disputeResolution ? getMechanismColor(result.disputeResolution.mechanism) : null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Link href="/contracts" style={{ color: BRAND_NAVY, textDecoration: 'none', fontSize: 14, opacity: 0.7 }}>
            Contracts
          </Link>
          <span style={{ color: '#9CA3AF', fontSize: 14 }}>/</span>
          <Link href={`/contracts/${id}`} style={{ color: BRAND_NAVY, textDecoration: 'none', fontSize: 14, opacity: 0.7 }}>
            Contract
          </Link>
          <span style={{ color: '#9CA3AF', fontSize: 14 }}>/</span>
          <span style={{ color: BRAND_NAVY, fontSize: 14, fontWeight: 600 }}>Jurisdiction &amp; Governing Law</span>
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
              Jurisdiction &amp; Governing Law Intelligence
            </h1>
            <p style={{ color: '#6B7280', marginTop: 4, fontSize: 15 }}>
              AI-extracted governing law, jurisdiction, dispute resolution mechanisms, and enforcement risk assessment.
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
              transition: 'background 0.2s',
            }}
          >
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>

        {analyzeError && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: 14, color: '#DC2626', marginBottom: 20, fontSize: 14 }}>
            {analyzeError}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: '#6B7280' }}>
            Loading jurisdiction analysis...
          </div>
        )}

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: 14, color: '#DC2626', marginBottom: 20, fontSize: 14 }}>
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
              No jurisdiction analysis found for this contract.
            </p>
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>
              Click <strong>Run Analysis</strong> to extract governing law and jurisdiction information using AI.
            </p>
          </div>
        )}

        {result && mechanismColors && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Governing Law + Jurisdiction Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '20px 24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: '1px solid #E5E7EB',
                  borderTop: `4px solid ${BRAND_GOLD}`,
                }}
              >
                <p style={{ margin: 0, fontSize: 12, color: '#6B7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Governing Law
                </p>
                <p style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 700, color: BRAND_NAVY }}>
                  {result.governingLaw || 'Not specified'}
                </p>
                {result.jurisdictionConflicts && (
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 10,
                      background: '#FEF2F2',
                      color: '#DC2626',
                      border: '1px solid #FCA5A5',
                      borderRadius: 6,
                      padding: '3px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Jurisdiction Conflicts Detected
                  </span>
                )}
              </div>

              <div
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '20px 24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: '1px solid #E5E7EB',
                  borderTop: `4px solid ${BRAND_NAVY}`,
                }}
              >
                <p style={{ margin: 0, fontSize: 12, color: '#6B7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Chosen Jurisdiction
                </p>
                <p style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 700, color: BRAND_NAVY }}>
                  {result.jurisdiction || 'Not specified'}
                </p>
              </div>
            </div>

            {/* Dispute Resolution Mechanism */}
            <Section title="Dispute Resolution Mechanism">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      background: mechanismColors.bg,
                      color: mechanismColors.text,
                      border: `2px solid ${mechanismColors.border}`,
                      borderRadius: 10,
                      padding: '6px 18px',
                      fontSize: 16,
                      fontWeight: 700,
                      letterSpacing: '0.03em',
                    }}
                  >
                    {result.disputeResolution?.mechanism || 'Not specified'}
                  </span>
                </div>

                {result.disputeResolution?.escalationSteps && result.disputeResolution.escalationSteps.length > 0 && (
                  <div>
                    <p style={{ margin: '0 0 10px', fontSize: 13, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Escalation Steps
                    </p>
                    <ol style={{ margin: 0, paddingLeft: 24 }}>
                      {result.disputeResolution.escalationSteps.map((step, i) => (
                        <li
                          key={i}
                          style={{
                            color: '#374151',
                            fontSize: 14,
                            padding: '6px 0',
                            borderBottom: i < result.disputeResolution.escalationSteps.length - 1 ? '1px solid #F3F4F6' : 'none',
                          }}
                        >
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </Section>

            {/* Arbitration Details (conditional) */}
            {result.arbitration?.hasArbitration && (
              <Section title="Arbitration Details">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  <InfoRow label="Institution" value={result.arbitration.institution || 'Not specified'} />
                  <InfoRow label="Seat" value={result.arbitration.seat || 'Not specified'} />
                  <InfoRow label="Rules" value={result.arbitration.rules || 'Not specified'} />
                  <InfoRow label="Language" value={result.arbitration.language || 'Not specified'} />
                </div>
              </Section>
            )}

            {!result.arbitration?.hasArbitration && (
              <div
                style={{
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  padding: '16px 20px',
                  color: '#9CA3AF',
                  fontSize: 14,
                  fontStyle: 'italic',
                }}
              >
                No arbitration clause detected in this contract.
              </div>
            )}

            {/* Enforcement Risks */}
            <Section title="Enforcement Risks">
              {result.enforcementRisks && result.enforcementRisks.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${BRAND_NAVY}` }}>
                        {['Risk', 'Description', 'Severity'].map((h) => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: BRAND_NAVY, whiteSpace: 'nowrap' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.enforcementRisks.map((risk, i) => {
                        const sc = getSeverityColor(risk.severity);
                        return (
                          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#F9FAFB' : '#fff', borderBottom: '1px solid #E5E7EB' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: BRAND_NAVY, whiteSpace: 'nowrap' }}>{risk.risk}</td>
                            <td style={{ padding: '12px 14px', color: '#374151', maxWidth: 400 }}>{risk.description}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span
                                style={{
                                  background: sc.bg,
                                  color: sc.text,
                                  borderRadius: 6,
                                  padding: '3px 10px',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  letterSpacing: '0.03em',
                                }}
                              >
                                {risk.severity}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: 8,
                    padding: '16px 20px',
                    color: '#15803D',
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  No significant enforcement risks identified for this jurisdiction.
                </div>
              )}
            </Section>

            {/* Key Legal Considerations */}
            {result.keyLegalConsiderations && result.keyLegalConsiderations.length > 0 && (
              <Section title="Key Legal Considerations">
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {result.keyLegalConsiderations.map((consideration, i) => (
                    <li
                      key={i}
                      style={{
                        color: '#374151',
                        fontSize: 14,
                        padding: '6px 0',
                        borderBottom: i < result.keyLegalConsiderations.length - 1 ? '1px solid #F3F4F6' : 'none',
                        lineHeight: 1.6,
                      }}
                    >
                      {consideration}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Conflict of Laws Clauses */}
            {result.conflictOfLawsClauses && result.conflictOfLawsClauses.length > 0 && (
              <Section title="Conflict of Laws Clauses">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {result.conflictOfLawsClauses.map((clause, i) => (
                    <div
                      key={i}
                      style={{
                        background: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        borderLeft: '4px solid #D97706',
                        borderRadius: 8,
                        padding: '12px 16px',
                        color: '#92400E',
                        fontSize: 14,
                        lineHeight: 1.6,
                      }}
                    >
                      {clause}
                    </div>
                  ))}
                </div>
              </Section>
            )}
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
          marginTop: 0,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        padding: '12px 16px',
      }}
    >
      <p style={{ margin: 0, fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 600, color: BRAND_NAVY }}>{value}</p>
    </div>
  );
}
