'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { contractsApi, counterpartiesApi } from '@/lib/contracts.api';

const CONTRACT_TYPES = [
  'MASTER_AGREEMENT', 'AMENDMENT', 'PROCUREMENT_AGREEMENT', 'VENDOR_AGREEMENT',
  'NDA', 'SLA', 'MOU', 'LEASE', 'EMPLOYMENT_CONTRACT', 'CUSTOM',
];

interface Counterparty { id: string; name: string; }

export default function NewContractPage() {
  const router = useRouter();
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    contractNumber: '',
    type: 'NDA',
    counterpartyId: '',
    effectiveDate: '',
    expiryDate: '',
    value: '',
    currency: 'USD',
    description: '',
    autoRenewal: false,
    noticePeriodDays: '',
    tags: '',
  });

  useEffect(() => {
    counterpartiesApi.list().then((r) => setCounterparties(r.data));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.counterpartyId) { setError('Please select a counterparty'); return; }
    setLoading(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        contractNumber: form.contractNumber || undefined,
        type: form.type,
        counterpartyId: form.counterpartyId,
        effectiveDate: form.effectiveDate || undefined,
        expiryDate: form.expiryDate || undefined,
        value: form.value ? parseFloat(form.value) : undefined,
        currency: form.currency,
        description: form.description || undefined,
        autoRenewal: form.autoRenewal,
        noticePeriodDays: form.noticePeriodDays ? parseInt(form.noticePeriodDays) : undefined,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      const res = await contractsApi.create(payload);
      router.push(`/contracts/${res.data.id}`);
    } catch {
      setError('Failed to create contract. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const field = (key: string, label: string, type = 'text', required = false) => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>
        {label}{required && ' *'}
      </label>
      <input
        type={type}
        value={form[key as keyof typeof form] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required={required}
        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
        style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/contracts" className="p-1.5 rounded hover:bg-gray-100">
          <ArrowLeft size={18} style={{ color: '#666' }} />
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>New Contract</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border shadow-sm space-y-5" style={{ borderColor: '#E8E4DC' }}>
        {field('title', 'Contract Title', 'text', true)}

        <div className="grid grid-cols-2 gap-4">
          {field('contractNumber', 'Contract Number')}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Type *</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
              style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
            >
              {CONTRACT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Counterparty *</label>
          <select
            value={form.counterpartyId}
            onChange={(e) => setForm({ ...form, counterpartyId: e.target.value })}
            required
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
          >
            <option value="">Select counterparty...</option>
            {counterparties.map((cp) => (
              <option key={cp.id} value={cp.id}>{cp.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {field('effectiveDate', 'Effective Date', 'date')}
          {field('expiryDate', 'Expiry Date', 'date')}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {field('value', 'Contract Value', 'number')}
          {field('currency', 'Currency')}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none"
            style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
          />
        </div>

        {field('tags', 'Tags (comma-separated)')}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoRenewal"
            checked={form.autoRenewal}
            onChange={(e) => setForm({ ...form, autoRenewal: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="autoRenewal" className="text-sm" style={{ color: '#555' }}>Auto-renewal</label>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60"
            style={{ background: '#1B2A4A' }}
          >
            {loading ? 'Creating...' : 'Create Contract'}
          </button>
          <Link
            href="/contracts"
            className="px-6 py-2.5 rounded-lg text-sm font-medium border"
            style={{ borderColor: '#D4C8A8', color: '#555' }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
