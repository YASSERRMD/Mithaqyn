'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const BRAND_NAVY = '#1B2A4A';
const BRAND_GOLD = '#C5A55A';

interface DataSubjectRights {
  hasRightToAccess: boolean;
  hasRightToErasure: boolean;
  hasRightToPortability: boolean;
}

interface CrossBorderTransfers {
  hasTransfer: boolean;
  destinations: string[];
  safeguards: string[];
}

interface RetentionPeriod {
  dataType: string;
  period: string;
  legalBasis: string;
}

interface ComplianceGap {
  regulation: string;
  gap: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface PrivacyAnalysisResult {
  regulatoryFrameworks: string[];
  dataCategories: string[];
  dataProcessingPurposes: string[];
  dataSubjectRights: DataSubjectRights;
  crossBorderTransfers: CrossBorderTransfers;
  retentionPeriods: RetentionPeriod[];
  dpoRequired: boolean;
  dpiaRequired: boolean;
  complianceGaps: ComplianceGap[];
  overallRiskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';
}

interface PrivacySummaryResponse {
  jobId: string;
  result: PrivacyAnalysisResult;
}

function getRiskLevelColor(level: string): { bg: string; text: string; border: string } {
  switch (level) {
    case 'HIGH':
      return { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' };
    case 'MEDIUM':
      return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
    case 'LOW':
      return { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' };
    case 'MINIMAL':
      return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
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

export default function ContractPrivacyPage() {
  const { id } = useParams<{ id: string }>();
  const [summary, setSummary] = useState<PrivacySummaryResponse | null>(null);
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
      const r = await fetch(`/api/contracts/${id}/privacy-summary`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (r.ok) {
        const data: PrivacySummaryResponse | null = await r.json();
        setSummary(data);
      } else if (r.status !== 404) {
        setError('Failed to load privacy analysis');
      }
    } catch {
      setError('Network error loading privacy analysis');
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
      const r = await fetch(`/api/contracts/${id}/privacy-analysis`, {
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
      const data: PrivacySummaryResponse = await r.json();
      setSummary(data);
    } catch {
      setAnalyzeError('Network error running analysis');
    } finally {
      setAnalyzing(false);
    }
  }

  const result = summary?.result;
  const riskColors = result ? getRiskLevelColor(result.overallRiskLevel) : null;

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
          <span style={{ color: BRAND_NAVY, fontSize: 14, fontWeight: 600 }}>Data Privacy &amp; Compliance</span>
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
              Data Privacy &amp; Compliance Analysis
            </h1>
            <p style={{ color: '#6B7280', marginTop: 4, fontSize: 15 }}>
              AI-extracted regulatory frameworks, data categories, compliance gaps, and privacy risk assessment.
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
            Loading privacy analysis...
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
              No privacy analysis found for this contract.
            </p>
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>
              Click <strong>Run Analysis</strong> to assess data privacy and compliance using AI.
            </p>
          </div>
        )}

        {result && riskColors && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Overall Risk Level Banner */}
            <div
              style={{
                background: riskColors.bg,
                border: `1px solid ${riskColors.border}`,
                borderLeft: `6px solid ${riskColors.text}`,
                borderRadius: 12,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#6B7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Overall Privacy Risk Level
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 800, color: riskColors.text }}>
                  {result.overallRiskLevel}
                </p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                <InfoPill label="DPO Required" value={result.dpoRequired ? 'Yes' : 'No'} valueColor={result.dpoRequired ? '#DC2626' : '#16A34A'} />
                <InfoPill label="DPIA Required" value={result.dpiaRequired ? 'Yes' : 'No'} valueColor={result.dpiaRequired ? '#D97706' : '#16A34A'} />
              </div>
            </div>

            {/* Regulatory Frameworks + Data Categories */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <Section title="Regulatory Frameworks">
                {result.regulatoryFrameworks && result.regulatoryFrameworks.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {result.regulatoryFrameworks.map((fw) => (
                      <span
                        key={fw}
                        style={{
                          background: BRAND_NAVY,
                          color: '#fff',
                          borderRadius: 20,
                          padding: '4px 14px',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {fw}
                      </span>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No regulatory frameworks identified" />
                )}
              </Section>

              <Section title="Data Categories">
                {result.dataCategories && result.dataCategories.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {result.dataCategories.map((cat) => (
                      <span
                        key={cat}
                        style={{
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px solid #BFDBFE',
                          borderRadius: 20,
                          padding: '4px 14px',
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No data categories identified" />
                )}
              </Section>
            </div>

            {/* Data Processing Purposes */}
            <Section title="Data Processing Purposes">
              {result.dataProcessingPurposes && result.dataProcessingPurposes.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {result.dataProcessingPurposes.map((purpose) => (
                    <span
                      key={purpose}
                      style={{
                        background: '#F5F3FF',
                        color: '#7C3AED',
                        border: '1px solid #DDD6FE',
                        borderRadius: 20,
                        padding: '4px 14px',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {purpose}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyState message="No data processing purposes identified" />
              )}
            </Section>

            {/* Data Subject Rights */}
            <Section title="Data Subject Rights">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <RightCard
                  label="Right to Access"
                  granted={result.dataSubjectRights?.hasRightToAccess ?? false}
                />
                <RightCard
                  label="Right to Erasure"
                  granted={result.dataSubjectRights?.hasRightToErasure ?? false}
                />
                <RightCard
                  label="Right to Portability"
                  granted={result.dataSubjectRights?.hasRightToPortability ?? false}
                />
              </div>
            </Section>

            {/* Cross-Border Transfers */}
            <Section title="Cross-Border Data Transfers">
              {result.crossBorderTransfers ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: result.crossBorderTransfers.hasTransfer ? '#FEF2F2' : '#F0FDF4',
                      border: `1px solid ${result.crossBorderTransfers.hasTransfer ? '#FCA5A5' : '#BBF7D0'}`,
                      borderRadius: 8,
                      padding: '8px 14px',
                      width: 'fit-content',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{result.crossBorderTransfers.hasTransfer ? '⚠' : '✓'}</span>
                    <span style={{ fontWeight: 600, color: result.crossBorderTransfers.hasTransfer ? '#DC2626' : '#16A34A', fontSize: 14 }}>
                      {result.crossBorderTransfers.hasTransfer ? 'Cross-border transfers present' : 'No cross-border transfers identified'}
                    </span>
                  </div>

                  {result.crossBorderTransfers.hasTransfer && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                          Destinations
                        </p>
                        {result.crossBorderTransfers.destinations && result.crossBorderTransfers.destinations.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {result.crossBorderTransfers.destinations.map((dest) => (
                              <span key={dest} style={{ background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA', borderRadius: 6, padding: '3px 10px', fontSize: 13 }}>
                                {dest}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <EmptyState message="No destinations specified" />
                        )}
                      </div>
                      <div>
                        <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                          Safeguards
                        </p>
                        {result.crossBorderTransfers.safeguards && result.crossBorderTransfers.safeguards.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {result.crossBorderTransfers.safeguards.map((sg) => (
                              <span key={sg} style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', borderRadius: 6, padding: '3px 10px', fontSize: 13 }}>
                                {sg}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#DC2626', fontSize: 13, fontWeight: 500 }}>No safeguards specified — potential compliance gap</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState message="No cross-border transfer information found" />
              )}
            </Section>

            {/* Retention Periods */}
            <Section title="Data Retention Periods">
              {result.retentionPeriods && result.retentionPeriods.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${BRAND_NAVY}` }}>
                        {['Data Type', 'Retention Period', 'Legal Basis'].map((h) => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: BRAND_NAVY, whiteSpace: 'nowrap' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.retentionPeriods.map((rp, i) => (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#F9FAFB' : '#fff', borderBottom: '1px solid #E5E7EB' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 500, color: BRAND_NAVY }}>{rp.dataType}</td>
                          <td style={{ padding: '12px 14px', color: '#374151' }}>{rp.period}</td>
                          <td style={{ padding: '12px 14px', color: '#6B7280' }}>{rp.legalBasis}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState message="No data retention periods found in contract" />
              )}
            </Section>

            {/* Compliance Gaps */}
            <Section title="Compliance Gaps">
              {result.complianceGaps && result.complianceGaps.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${BRAND_NAVY}` }}>
                        {['Regulation', 'Compliance Gap', 'Severity'].map((h) => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: BRAND_NAVY, whiteSpace: 'nowrap' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.complianceGaps.map((gap, i) => {
                        const sc = getSeverityColor(gap.severity);
                        return (
                          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#F9FAFB' : '#fff', borderBottom: '1px solid #E5E7EB' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: BRAND_NAVY }}>{gap.regulation}</td>
                            <td style={{ padding: '12px 14px', color: '#374151', maxWidth: 400 }}>{gap.gap}</td>
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
                                {gap.severity}
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
                  No compliance gaps identified — contract appears to meet regulatory requirements.
                </div>
              )}
            </Section>
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

function RightCard({ label, granted }: { label: string; granted: boolean }) {
  return (
    <div
      style={{
        background: granted ? '#F0FDF4' : '#F9FAFB',
        border: `1px solid ${granted ? '#BBF7D0' : '#E5E7EB'}`,
        borderRadius: 10,
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ fontSize: 20, color: granted ? '#16A34A' : '#9CA3AF' }}>
        {granted ? '✓' : '✗'}
      </span>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: granted ? '#15803D' : '#6B7280' }}>
          {label}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: granted ? '#16A34A' : '#9CA3AF' }}>
          {granted ? 'Granted' : 'Not mentioned'}
        </p>
      </div>
    </div>
  );
}

function InfoPill({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        padding: '10px 16px',
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: 11, color: '#6B7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: valueColor }}>{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p style={{ color: '#9CA3AF', fontSize: 14, margin: 0, padding: '12px 0' }}>{message}</p>
  );
}
