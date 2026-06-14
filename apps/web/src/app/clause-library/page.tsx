'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Star,
  ChevronDown,
  ChevronUp,
  FileText,
  X,
  BookMarked,
  Eye,
  Tag,
} from 'lucide-react';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClauseTemplate {
  id: string;
  title: string;
  clauseType: string;
  jurisdiction?: string;
  contractType?: string;
  version: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  usageCount: number;
  createdAt: string;
  createdBy?: { firstName: string; lastName: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLAUSE_TYPES = [
  'Liability Cap',
  'Indemnification',
  'Confidentiality',
  'Governing Law',
  'Termination',
  'Payment Terms',
  'Intellectual Property',
  'Data Protection',
  'Force Majeure',
  'Dispute Resolution',
  'Assignment',
  'Non-Compete',
  'Insurance',
  'Warranties',
  'Audit Rights',
  'Other',
];

const CONTRACT_TYPES = ['MSA', 'NDA', 'SLA', 'EMPLOYMENT', 'VENDOR', 'OTHER'];

const CLAUSE_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  'Liability Cap':        { bg: '#FEF2F2', text: '#991B1B' },
  Indemnification:        { bg: '#FFF7ED', text: '#9A3412' },
  Confidentiality:        { bg: '#FDF4FF', text: '#7E22CE' },
  'Governing Law':        { bg: '#EFF6FF', text: '#1E40AF' },
  Termination:            { bg: '#F0FDF4', text: '#166534' },
  'Payment Terms':        { bg: '#FFFBEB', text: '#92400E' },
  'Intellectual Property':{ bg: '#F0F9FF', text: '#0C4A6E' },
  'Data Protection':      { bg: '#FFF0F6', text: '#9D174D' },
  'Force Majeure':        { bg: '#F7FEE7', text: '#365314' },
  'Dispute Resolution':   { bg: '#F5F3FF', text: '#4C1D95' },
};

function ClauseTypeBadge({ type }: { type: string }) {
  const colors = CLAUSE_TYPE_COLORS[type] ?? { bg: '#F1F5F9', text: '#475569' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
      style={{ background: colors.bg, color: colors.text }}
    >
      {type}
    </span>
  );
}

// ─── Create Template Modal ────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreate: () => void;
}

function CreateTemplateModal({ onClose, onCreate }: CreateModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    clauseType: '',
    content: '',
    jurisdiction: '',
    contractType: '',
    tags: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.clauseType.trim() || !form.content.trim()) return;
    setSubmitting(true);
    try {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await api.post('/clause-library', {
        title: form.title.trim(),
        clauseType: form.clauseType.trim(),
        content: form.content.trim(),
        jurisdiction: form.jurisdiction.trim() || undefined,
        contractType: form.contractType || undefined,
        tags,
      });
      onCreate();
    } catch {
      // handled
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10"
          style={{ borderColor: '#E8E4DC' }}
        >
          <h2 className="text-base font-semibold" style={{ color: '#1B2A4A' }}>
            Create Clause Template
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X size={18} style={{ color: '#888' }} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>
              Title *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Standard Liability Cap – UAE Contracts"
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
              style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>
                Clause Type *
              </label>
              <input
                type="text"
                required
                list="clause-type-list"
                value={form.clauseType}
                onChange={(e) => setForm({ ...form, clauseType: e.target.value })}
                placeholder="Select or type..."
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
              />
              <datalist id="clause-type-list">
                {CLAUSE_TYPES.map((ct) => (
                  <option key={ct} value={ct} />
                ))}
              </datalist>
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
                <option value="">Any</option>
                {CONTRACT_TYPES.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>
                Jurisdiction
              </label>
              <input
                type="text"
                value={form.jurisdiction}
                onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
                placeholder="e.g. UAE, UK, US"
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="e.g. finance, high-risk, template"
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>
              Clause Content *
            </label>
            <textarea
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Enter the full clause text..."
              rows={8}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none font-mono leading-relaxed"
              style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
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
              {submitting ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: ClauseTemplate;
  onToggleFavorite: (id: string) => void;
}

function TemplateCard({ template, onToggleFavorite }: TemplateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    if (toggling) return;
    setToggling(true);
    await onToggleFavorite(template.id);
    setToggling(false);
  }

  return (
    <div
      className="bg-white rounded-xl border hover:shadow-sm transition-shadow"
      style={{ borderColor: '#E8E4DC' }}
    >
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: '#F0EAD8' }}
          >
            <FileText size={16} style={{ color: '#C5A55A' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-tight" style={{ color: '#1B2A4A' }}>
                {template.title}
              </h3>
              <button
                onClick={handleFavorite}
                disabled={toggling}
                className="flex-shrink-0 p-1 rounded hover:bg-amber-50 transition-colors"
                title={template.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star
                  size={16}
                  fill={template.isFavorite ? '#C5A55A' : 'none'}
                  style={{ color: template.isFavorite ? '#C5A55A' : '#CCC' }}
                />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <ClauseTypeBadge type={template.clauseType} />
              {template.contractType && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: '#F0EAD8', color: '#C5A55A' }}
                >
                  {template.contractType}
                </span>
              )}
              {template.jurisdiction && (
                <span className="text-xs" style={{ color: '#888' }}>
                  {template.jurisdiction}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: '#AAA' }}>
              <span>v{template.version}</span>
              <span className="flex items-center gap-1">
                <Eye size={11} />
                {template.usageCount} use{template.usageCount !== 1 ? 's' : ''}
              </span>
            </div>

            {template.tags.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Tag size={11} style={{ color: '#BBB' }} />
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: '#F5F5F5', color: '#777' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expand/collapse content */}
      <div className="border-t" style={{ borderColor: '#F0EDE8' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium hover:bg-gray-50 transition-colors"
          style={{ color: '#888' }}
        >
          <span>{expanded ? 'Hide' : 'View'} Clause Content</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expanded && (
          <div className="px-4 pb-4">
            <div
              className="rounded-lg p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap"
              style={{
                background: '#F7F5F0',
                color: '#333',
                border: '1px solid #E8E4DC',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {template.content}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClauseLibraryPage() {
  const [templates, setTemplates] = useState<ClauseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClauseType, setFilterClauseType] = useState('');
  const [filterContractType, setFilterContractType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const loadTemplates = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      let res;
      if (q && q.trim()) {
        res = await api.get('/clause-library/search', { params: { q: q.trim() } });
      } else {
        const params: Record<string, string> = {};
        if (filterClauseType) params.clauseType = filterClauseType;
        if (filterContractType) params.contractType = filterContractType;
        res = await api.get('/clause-library', { params });
      }
      setTemplates(res.data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [filterClauseType, filterContractType]);

  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    if (search.trim()) {
      const t = setTimeout(() => loadTemplates(search), 400);
      setSearchTimeout(t);
    } else {
      loadTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterClauseType, filterContractType]);

  async function handleToggleFavorite(id: string) {
    try {
      const res = await api.patch(`/clause-library/${id}/favorite`);
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isFavorite: res.data.isFavorite } : t)),
      );
    } catch {
      // handled
    }
  }

  function handleCreateSuccess() {
    setShowCreate(false);
    loadTemplates(search);
  }

  const favCount = templates.filter((t) => t.isFavorite).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>
            Clause Library
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#888' }}>
            {templates.length} template{templates.length !== 1 ? 's' : ''}
            {favCount > 0 ? ` · ${favCount} starred` : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: '#1B2A4A' }}
        >
          <Plus size={16} />
          New Template
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#AAA' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, type, or content..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ borderColor: '#D4C8A8', background: '#FAFAF8' }}
          />
        </div>

        <select
          value={filterClauseType}
          onChange={(e) => { setFilterClauseType(e.target.value); setSearch(''); }}
          className="px-3 py-2 rounded-lg border text-sm focus:outline-none"
          style={{ borderColor: '#D4C8A8', background: '#FAFAF8', color: '#3A3A3A' }}
        >
          <option value="">All Clause Types</option>
          {CLAUSE_TYPES.map((ct) => (
            <option key={ct} value={ct}>{ct}</option>
          ))}
        </select>

        <select
          value={filterContractType}
          onChange={(e) => { setFilterContractType(e.target.value); setSearch(''); }}
          className="px-3 py-2 rounded-lg border text-sm focus:outline-none"
          style={{ borderColor: '#D4C8A8', background: '#FAFAF8', color: '#3A3A3A' }}
        >
          <option value="">All Contract Types</option>
          {CONTRACT_TYPES.map((ct) => (
            <option key={ct} value={ct}>{ct}</option>
          ))}
        </select>

        {(filterClauseType || filterContractType) && (
          <button
            onClick={() => { setFilterClauseType(''); setFilterContractType(''); }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: '#FECACA', color: '#991B1B', background: '#FEF2F2' }}
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {(filterClauseType || filterContractType) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: '#888' }}>Filters:</span>
          {filterClauseType && (
            <button
              onClick={() => setFilterClauseType('')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: '#F0EAD8', color: '#C5A55A' }}
            >
              {filterClauseType}
              <X size={11} />
            </button>
          )}
          {filterContractType && (
            <button
              onClick={() => setFilterContractType('')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: '#F0EAD8', color: '#C5A55A' }}
            >
              {filterContractType}
              <X size={11} />
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-xl animate-pulse"
              style={{ background: '#F0EDE8' }}
            />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div
          className="bg-white rounded-xl border p-16 flex flex-col items-center text-center"
          style={{ borderColor: '#E8E4DC' }}
        >
          <BookMarked size={48} className="mb-4" style={{ color: '#D4C8A8' }} />
          <h3 className="font-semibold mb-1" style={{ color: '#1B2A4A' }}>
            {search || filterClauseType || filterContractType
              ? 'No templates match your filters'
              : 'No clause templates yet'}
          </h3>
          <p className="text-sm max-w-xs" style={{ color: '#888' }}>
            {search || filterClauseType || filterContractType
              ? 'Try adjusting your search or clearing filters.'
              : 'Build your clause library to standardize contract language across your organization.'}
          </p>
          {!search && !filterClauseType && !filterContractType && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: '#C5A55A' }}
            >
              <Plus size={16} />
              Create First Template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateTemplateModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateSuccess}
        />
      )}
    </div>
  );
}
