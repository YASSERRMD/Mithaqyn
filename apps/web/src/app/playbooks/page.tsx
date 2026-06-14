'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  BookOpen,
  ChevronRight,
  Shield,
  FileText,
  X,
} from 'lucide-react';
import api from '@/lib/api';

interface Playbook {
  id: string;
  name: string;
  description?: string;
  contractType?: string;
  ruleCount: number;
  createdAt: string;
  createdBy?: { firstName: string; lastName: string };
}

const CONTRACT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  MSA:        { bg: '#EBF3FB', text: '#1B5C9B' },
  NDA:        { bg: '#FEF3C7', text: '#92400E' },
  SLA:        { bg: '#F0FDF4', text: '#166534' },
  EMPLOYMENT: { bg: '#FDF4FF', text: '#7E22CE' },
  VENDOR:     { bg: '#FFF7ED', text: '#9A3412' },
  OTHER:      { bg: '#F1F5F9', text: '#475569' },
};

function ContractTypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  const colors = CONTRACT_TYPE_COLORS[type] ?? CONTRACT_TYPE_COLORS.OTHER;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
      style={{ background: colors.bg, color: colors.text }}
    >
      {type}
    </span>
  );
}

interface CreatePlaybookForm {
  name: string;
  description: string;
  contractType: string;
}

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreatePlaybookForm>({
    name: '',
    description: '',
    contractType: '',
  });

  async function loadPlaybooks() {
    setLoading(true);
    try {
      const res = await api.get('/playbooks');
      setPlaybooks(res.data);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlaybooks();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/playbooks', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        contractType: form.contractType || undefined,
      });
      setForm({ name: '', description: '', contractType: '' });
      setShowCreate(false);
      await loadPlaybooks();
    } catch {
      // handled
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>
            Legal Playbooks
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#888' }}>
            Define contract standards and check compliance automatically
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: '#1B2A4A' }}
        >
          <Plus size={16} />
          New Playbook
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: '#E8E4DC' }}
            >
              <h2 className="text-base font-semibold" style={{ color: '#1B2A4A' }}>
                Create Legal Playbook
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X size={18} style={{ color: '#888' }} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>
                  Playbook Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Standard MSA Playbook"
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{
                    borderColor: '#D4C8A8',
                    background: '#FAFAF8',
                    focusRingColor: '#C5A55A',
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the purpose and scope of this playbook..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none"
                  style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>
                  Contract Type
                </label>
                <select
                  value={form.contractType}
                  onChange={(e) => setForm({ ...form, contractType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                  style={{ borderColor: '#D4C8A8', background: '#FAFAF8', color: '#3A3A3A' }}
                >
                  <option value="">All Types</option>
                  <option value="MSA">MSA</option>
                  <option value="NDA">NDA</option>
                  <option value="SLA">SLA</option>
                  <option value="EMPLOYMENT">Employment</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium"
                  style={{ borderColor: '#D4C8A8', color: '#555' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
                  style={{ background: '#1B2A4A' }}
                >
                  {submitting ? 'Creating...' : 'Create Playbook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-xl animate-pulse"
              style={{ background: '#F0EDE8' }}
            />
          ))}
        </div>
      ) : playbooks.length === 0 ? (
        <div
          className="bg-white rounded-xl border p-16 flex flex-col items-center text-center"
          style={{ borderColor: '#E8E4DC' }}
        >
          <Shield size={48} className="mb-4" style={{ color: '#D4C8A8' }} />
          <h3 className="font-semibold mb-1" style={{ color: '#1B2A4A' }}>
            No playbooks yet
          </h3>
          <p className="text-sm max-w-xs" style={{ color: '#888' }}>
            Create your first legal playbook to define contract standards and automate compliance
            checks.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: '#C5A55A' }}
          >
            <Plus size={16} />
            Create First Playbook
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {playbooks.map((pb) => (
            <Link
              key={pb.id}
              href={`/playbooks/${pb.id}`}
              className="block bg-white rounded-xl border hover:shadow-md transition-shadow group"
              style={{ borderColor: '#E8E4DC' }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: '#F0EAD8' }}
                  >
                    <BookOpen size={20} style={{ color: '#C5A55A' }} />
                  </div>
                  <ChevronRight
                    size={18}
                    className="opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                    style={{ color: '#C5A55A' }}
                  />
                </div>

                <h3 className="font-semibold mb-1 leading-tight" style={{ color: '#1B2A4A' }}>
                  {pb.name}
                </h3>

                {pb.description && (
                  <p
                    className="text-xs mb-3 line-clamp-2 leading-relaxed"
                    style={{ color: '#777' }}
                  >
                    {pb.description}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap mt-auto">
                  <ContractTypeBadge type={pb.contractType} />
                  <span
                    className="inline-flex items-center gap-1 text-xs"
                    style={{ color: '#888' }}
                  >
                    <FileText size={12} />
                    {pb.ruleCount} rule{pb.ruleCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div
                className="px-5 py-3 border-t text-xs"
                style={{ borderColor: '#F0EDE8', color: '#AAA' }}
              >
                Created {new Date(pb.createdAt).toLocaleDateString()}
                {pb.createdBy
                  ? ` · ${pb.createdBy.firstName} ${pb.createdBy.lastName}`
                  : ''}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
