'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, FileText } from 'lucide-react';
import { contractsApi } from '@/lib/contracts.api';
import { StatusBadge, RiskBadge } from '@/components/contracts/StatusBadge';

interface ContractDetail {
  id: string;
  title: string;
  contractNumber?: string;
  type: string;
  status: string;
  description?: string;
  riskLevel?: string;
  riskScore?: number;
  counterparty?: { id: string; name: string; type: string; country?: string };
  effectiveDate?: string;
  expiryDate?: string;
  renewalDate?: string;
  autoRenewal: boolean;
  noticePeriodDays?: number;
  value?: number;
  currency?: string;
  tags: string[];
  documents: Array<{ id: string; originalName: string; sizeBytes: number; uploadedAt: string }>;
  _count: { clauses: number; riskFindings: number; obligations: number };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    contractsApi
      .getById(id)
      .then((r) => setContract(r.data))
      .catch(() => router.push('/contracts'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !contract) return;
    setUploading(true);
    try {
      await contractsApi.upload(id, file);
      const r = await contractsApi.getById(id);
      setContract(r.data);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: '#AAA' }}>Loading contract...</p>
      </div>
    );
  }

  if (!contract) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start gap-4">
        <Link href="/contracts" className="mt-1 p-1.5 rounded hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} style={{ color: '#666' }} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>{contract.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={contract.status} />
            {contract.riskLevel && <RiskBadge level={contract.riskLevel} />}
            <span className="text-xs" style={{ color: '#AAA' }}>
              {contract.type.replace(/_/g, ' ')}
            </span>
            {contract.contractNumber && (
              <span className="text-xs font-mono" style={{ color: '#AAA' }}>
                {contract.contractNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Clauses', value: contract._count.clauses },
          { label: 'Risk Findings', value: contract._count.riskFindings },
          { label: 'Obligations', value: contract._count.obligations },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border shadow-sm" style={{ borderColor: '#E8E4DC' }}>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888' }}>{s.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: '#1B2A4A' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: '#E8E4DC' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#1B2A4A' }}>Contract Details</h2>
          <dl className="space-y-3">
            {[
              ['Counterparty', contract.counterparty?.name],
              ['Effective Date', contract.effectiveDate ? new Date(contract.effectiveDate).toLocaleDateString() : '—'],
              ['Expiry Date', contract.expiryDate ? new Date(contract.expiryDate).toLocaleDateString() : '—'],
              ['Renewal Date', contract.renewalDate ? new Date(contract.renewalDate).toLocaleDateString() : '—'],
              ['Auto-Renewal', contract.autoRenewal ? 'Yes' : 'No'],
              ['Notice Period', contract.noticePeriodDays ? `${contract.noticePeriodDays} days` : '—'],
              ['Value', contract.value ? `${contract.currency} ${contract.value.toLocaleString()}` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <dt style={{ color: '#888' }}>{label}</dt>
                <dd className="font-medium" style={{ color: '#1B2A4A' }}>{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: '#E8E4DC' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#1B2A4A' }}>Documents</h2>
            <label className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#1B2A4A' }}>
              <Upload size={13} />
              {uploading ? 'Uploading...' : 'Upload'}
              <input type="file" accept=".pdf,.doc,.docx,.txt,.rtf" onChange={handleUpload} className="hidden" />
            </label>
          </div>
          {contract.documents.length === 0 ? (
            <div className="py-6 text-center">
              <FileText size={28} className="mx-auto mb-2" style={{ color: '#CCC' }} />
              <p className="text-xs" style={{ color: '#AAA' }}>No documents uploaded</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {contract.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: '#F0EDE8' }}>
                  <div className="flex items-center gap-2">
                    <FileText size={14} style={{ color: '#C5A55A' }} />
                    <span className="text-xs font-medium" style={{ color: '#1B2A4A' }}>{doc.originalName}</span>
                  </div>
                  <span className="text-xs" style={{ color: '#AAA' }}>{formatBytes(doc.sizeBytes)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {contract.description && (
        <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: '#E8E4DC' }}>
          <h2 className="text-sm font-semibold mb-2" style={{ color: '#1B2A4A' }}>Description</h2>
          <p className="text-sm" style={{ color: '#555' }}>{contract.description}</p>
        </div>
      )}

      {contract.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {contract.tags.map((tag) => (
            <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: '#1B2A4A', color: '#C5A55A' }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
