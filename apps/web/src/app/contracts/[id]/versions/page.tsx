'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const BRAND_NAVY = '#1B2A4A';
const BRAND_GOLD = '#C5A55A';

interface ContractVersion {
  id: string;
  versionNum: number;
  changedById: string | null;
  changedAt: string;
  action: string | null;
  notes: string | null;
  snapshot: Record<string, unknown>;
}

interface DiffResult {
  added: string[];
  removed: string[];
  modified: string[];
  v1: { id: string; versionNum: number; changedAt: string; action: string | null };
  v2: { id: string; versionNum: number; changedAt: string; action: string | null };
}

type Mode = 'timeline' | 'compare';

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractTag(notes: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/^\[TAG:\s*([^\]]+)\]/);
  return m ? m[1].trim() : null;
}

export default function ContractVersionsPage() {
  const { id } = useParams<{ id: string }>();
  const [versions, setVersions] = useState<ContractVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('timeline');

  const [compareV1, setCompareV1] = useState('');
  const [compareV2, setCompareV2] = useState('');
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState('');

  const [restoreTarget, setRestoreTarget] = useState<ContractVersion | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

  const [tagTarget, setTagTarget] = useState<ContractVersion | null>(null);
  const [tagValue, setTagValue] = useState('');
  const [tagLoading, setTagLoading] = useState(false);
  const [tagError, setTagError] = useState('');

  function getToken() {
    return localStorage.getItem('token') ?? '';
  }

  async function loadVersions() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/contracts/${id}/versions`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!r.ok) throw new Error('Failed to load versions');
      const data: ContractVersion[] = await r.json();
      setVersions(data);
    } catch {
      setError('Failed to load version history');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVersions();
  }, [id]);

  async function handleCompare() {
    if (!compareV1 || !compareV2) return;
    setCompareLoading(true);
    setCompareError('');
    setDiff(null);
    try {
      const r = await fetch(
        `/api/versions/compare?v1=${encodeURIComponent(compareV1)}&v2=${encodeURIComponent(compareV2)}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      if (!r.ok) throw new Error('Compare failed');
      const data: DiffResult = await r.json();
      setDiff(data);
    } catch {
      setCompareError('Failed to compare versions');
    } finally {
      setCompareLoading(false);
    }
  }

  async function handleRestore() {
    if (!restoreTarget) return;
    setRestoreLoading(true);
    setRestoreError('');
    setRestoreSuccess('');
    try {
      const r = await fetch(`/api/contracts/${id}/versions/${restoreTarget.id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({})) as { message?: string };
        setRestoreError(body.message ?? 'Restore failed');
        return;
      }
      setRestoreTarget(null);
      setRestoreSuccess(`Contract restored to v${restoreTarget.versionNum} successfully.`);
      await loadVersions();
    } catch {
      setRestoreError('Network error during restore');
    } finally {
      setRestoreLoading(false);
    }
  }

  async function handleTag(e: React.FormEvent) {
    e.preventDefault();
    if (!tagTarget || !tagValue.trim()) return;
    setTagLoading(true);
    setTagError('');
    try {
      const r = await fetch(`/api/versions/${tagTarget.id}/tag`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tag: tagValue.trim() }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({})) as { message?: string };
        setTagError(body.message ?? 'Tag failed');
        return;
      }
      setTagTarget(null);
      setTagValue('');
      await loadVersions();
    } catch {
      setTagError('Network error');
    } finally {
      setTagLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
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
          <span style={{ color: BRAND_NAVY, fontSize: 14, fontWeight: 600 }}>Version History</span>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: BRAND_NAVY, margin: 0 }}>
              Version History
            </h1>
            <p style={{ color: '#6B7280', marginTop: 4, fontSize: 15 }}>
              Browse, compare, restore, and tag contract versions.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['timeline', 'compare'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setDiff(null); setCompareError(''); }}
                style={{
                  background: mode === m ? BRAND_NAVY : '#F3F4F6',
                  color: mode === m ? '#fff' : BRAND_NAVY,
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {m === 'timeline' ? 'Timeline' : 'Compare Versions'}
              </button>
            ))}
          </div>
        </div>

        {/* Success / Error banners */}
        {restoreSuccess && (
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, padding: 14, color: '#16A34A', marginBottom: 20, fontSize: 14 }}>
            {restoreSuccess}
          </div>
        )}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: 14, color: '#DC2626', marginBottom: 20, fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: '#6B7280' }}>
            Loading version history...
          </div>
        )}

        {!loading && !error && (
          <>
            {/* TIMELINE MODE */}
            {mode === 'timeline' && (
              <>
                {versions.length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB' }}>
                    <p style={{ color: '#6B7280', fontSize: 16, margin: 0 }}>No versions recorded yet.</p>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    {/* Vertical line */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 20,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        background: '#E5E7EB',
                        zIndex: 0,
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {versions.map((v, i) => {
                        const tag = extractTag(v.notes);
                        return (
                          <div key={v.id} style={{ display: 'flex', gap: 20, paddingBottom: 24, position: 'relative', zIndex: 1 }}>
                            {/* Timeline dot */}
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                minWidth: 40,
                                borderRadius: '50%',
                                background: i === 0 ? BRAND_NAVY : '#fff',
                                border: `2px solid ${i === 0 ? BRAND_NAVY : BRAND_GOLD}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 700,
                                color: i === 0 ? '#fff' : BRAND_NAVY,
                                flexShrink: 0,
                                zIndex: 2,
                              }}
                            >
                              v{v.versionNum}
                            </div>

                            {/* Version card */}
                            <div
                              style={{
                                flex: 1,
                                background: '#fff',
                                borderRadius: 10,
                                padding: '14px 18px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                                border: `1px solid ${i === 0 ? BRAND_GOLD : '#E5E7EB'}`,
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 15, fontWeight: 700, color: BRAND_NAVY }}>
                                      Version {v.versionNum}
                                    </span>
                                    {i === 0 && (
                                      <span style={{ fontSize: 11, fontWeight: 600, background: BRAND_NAVY, color: BRAND_GOLD, padding: '2px 8px', borderRadius: 20 }}>
                                        LATEST
                                      </span>
                                    )}
                                    {tag && (
                                      <span style={{ fontSize: 11, fontWeight: 600, background: '#EDE9FE', color: '#7C3AED', padding: '2px 8px', borderRadius: 20, border: '1px solid #C4B5FD' }}>
                                        {tag}
                                      </span>
                                    )}
                                  </div>
                                  {v.action && (
                                    <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0', fontFamily: 'monospace' }}>
                                      {v.action}
                                    </p>
                                  )}
                                  {v.notes && !tag && (
                                    <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>{v.notes}</p>
                                  )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{formatDate(v.changedAt)}</p>
                                  {v.changedById && (
                                    <p style={{ fontSize: 11, color: '#CBD5E1', margin: '2px 0 0' }}>
                                      by {v.changedById.slice(0, 8)}…
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => { setRestoreTarget(v); setRestoreError(''); }}
                                  disabled={i === 0}
                                  style={{
                                    background: i === 0 ? '#F3F4F6' : '#FFF7ED',
                                    color: i === 0 ? '#9CA3AF' : '#C2410C',
                                    border: `1px solid ${i === 0 ? '#E5E7EB' : '#FED7AA'}`,
                                    borderRadius: 6,
                                    padding: '4px 12px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: i === 0 ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  Restore
                                </button>
                                <button
                                  onClick={() => { setTagTarget(v); setTagValue(tag ?? ''); setTagError(''); }}
                                  style={{
                                    background: '#F5F3FF',
                                    color: '#7C3AED',
                                    border: '1px solid #C4B5FD',
                                    borderRadius: 6,
                                    padding: '4px 12px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {tag ? 'Edit Tag' : 'Tag'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* COMPARE MODE */}
            {mode === 'compare' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Version selectors */}
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: BRAND_NAVY, marginBottom: 16, borderBottom: `2px solid ${BRAND_GOLD}`, paddingBottom: 10 }}>
                    Select Versions to Compare
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>Version A (Base)</label>
                      <select
                        style={inputStyle}
                        value={compareV1}
                        onChange={(e) => { setCompareV1(e.target.value); setDiff(null); }}
                      >
                        <option value="">Select version...</option>
                        {versions.map((v) => (
                          <option key={v.id} value={v.id}>
                            v{v.versionNum} — {formatDate(v.changedAt)}{v.action ? ` (${v.action})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Version B (Compare)</label>
                      <select
                        style={inputStyle}
                        value={compareV2}
                        onChange={(e) => { setCompareV2(e.target.value); setDiff(null); }}
                      >
                        <option value="">Select version...</option>
                        {versions.map((v) => (
                          <option key={v.id} value={v.id}>
                            v{v.versionNum} — {formatDate(v.changedAt)}{v.action ? ` (${v.action})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {compareError && (
                    <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{compareError}</div>
                  )}
                  <button
                    onClick={handleCompare}
                    disabled={!compareV1 || !compareV2 || compareLoading}
                    style={{
                      background: (!compareV1 || !compareV2 || compareLoading) ? '#9CA3AF' : BRAND_NAVY,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 24px',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: (!compareV1 || !compareV2 || compareLoading) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {compareLoading ? 'Comparing...' : 'Compare'}
                  </button>
                </div>

                {/* Diff result */}
                {diff && (
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: 12,
                      padding: 24,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: BRAND_NAVY, marginBottom: 4, borderBottom: `2px solid ${BRAND_GOLD}`, paddingBottom: 10 }}>
                      Diff: v{diff.v1.versionNum} → v{diff.v2.versionNum}
                    </h2>
                    <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 20px' }}>
                      {formatDate(diff.v1.changedAt)} → {formatDate(diff.v2.changedAt)}
                    </p>

                    {diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0 ? (
                      <p style={{ color: '#6B7280', fontSize: 14 }}>No differences found between these versions.</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F9FAFB' }}>
                            {['Type', 'Field'].map((h) => (
                              <th
                                key={h}
                                style={{
                                  padding: '10px 16px',
                                  textAlign: 'left',
                                  fontWeight: 600,
                                  color: BRAND_NAVY,
                                  borderBottom: '2px solid #E5E7EB',
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {diff.added.map((f) => (
                            <DiffRow key={`add-${f}`} type="Added" field={f} color="#16A34A" bg="#F0FDF4" />
                          ))}
                          {diff.removed.map((f) => (
                            <DiffRow key={`rem-${f}`} type="Removed" field={f} color="#DC2626" bg="#FEF2F2" />
                          ))}
                          {diff.modified.map((f) => (
                            <DiffRow key={`mod-${f}`} type="Modified" field={f} color="#D97706" bg="#FFFBEB" />
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {restoreTarget && (
        <Modal onClose={() => setRestoreTarget(null)}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: BRAND_NAVY, margin: '0 0 12px' }}>
            Restore to Version {restoreTarget.versionNum}?
          </h2>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 8px' }}>
            This will update the contract to its state at v{restoreTarget.versionNum} and create a new restore version entry.
          </p>
          <p style={{ color: '#9CA3AF', fontSize: 13, margin: '0 0 24px' }}>
            Recorded: {formatDate(restoreTarget.changedAt)}
          </p>
          {restoreError && (
            <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 16 }}>{restoreError}</div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setRestoreTarget(null)}
              style={{ background: '#F3F4F6', color: BRAND_NAVY, border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleRestore}
              disabled={restoreLoading}
              style={{
                background: restoreLoading ? '#9CA3AF' : '#C2410C',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 24px',
                fontWeight: 700,
                fontSize: 14,
                cursor: restoreLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {restoreLoading ? 'Restoring...' : 'Confirm Restore'}
            </button>
          </div>
        </Modal>
      )}

      {/* Tag Modal */}
      {tagTarget && (
        <Modal onClose={() => setTagTarget(null)}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: BRAND_NAVY, margin: '0 0 12px' }}>
            Tag Version {tagTarget.versionNum}
          </h2>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 20px' }}>
            Add a human-readable tag to this version for easy reference.
          </p>
          <form onSubmit={handleTag}>
            <label style={labelStyle}>Tag Label</label>
            <input
              style={{ ...inputStyle, marginBottom: 16 }}
              placeholder="e.g. Approved, Final, Pre-Negotiation"
              value={tagValue}
              onChange={(e) => setTagValue(e.target.value)}
              autoFocus
              required
            />
            {tagError && (
              <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 16 }}>{tagError}</div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setTagTarget(null)}
                style={{ background: '#F3F4F6', color: BRAND_NAVY, border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={tagLoading}
                style={{
                  background: tagLoading ? '#9CA3AF' : '#7C3AED',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: tagLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {tagLoading ? 'Saving...' : 'Save Tag'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function DiffRow({ type, field, color, bg }: { type: string; field: string; color: string; bg: string }) {
  return (
    <tr style={{ backgroundColor: bg, borderBottom: '1px solid #E5E7EB' }}>
      <td style={{ padding: '10px 16px' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {type}
        </span>
      </td>
      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 13, color: '#374151' }}>
        {field}
      </td>
    </tr>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
        {children}
      </div>
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
