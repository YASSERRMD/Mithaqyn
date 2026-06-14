'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Upload,
  Link2,
  History,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  FileText,
  AlertTriangle,
  CloudUpload,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportSource =
  | 'EMAIL_ATTACHMENT'
  | 'GOOGLE_DRIVE'
  | 'ONEDRIVE'
  | 'DROPBOX'
  | 'URL'
  | 'LOCAL_UPLOAD';

type ImportStatus = 'PENDING' | 'DOWNLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface ImportJob {
  id: string;
  source: ImportSource;
  sourceRef: string | null;
  status: ImportStatus;
  fileName: string | null;
  mimeType: string | null;
  contractId: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ImportStatus, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  PENDING:     { color: '#B7660A', bg: '#FFF3CD', border: '#FFEAA7', icon: <Clock size={11} />,          label: 'Pending' },
  DOWNLOADING: { color: '#1558B0', bg: '#E3F0FF', border: '#BDD7FF', icon: <Download size={11} />,        label: 'Downloading' },
  PROCESSING:  { color: '#5B2D8E', bg: '#F3E8FF', border: '#D8B5FF', icon: <RefreshCw size={11} />,       label: 'Processing' },
  COMPLETED:   { color: '#1D6A39', bg: '#D4EDDA', border: '#C3E6CB', icon: <CheckCircle size={11} />,     label: 'Completed' },
  FAILED:      { color: '#C0392B', bg: '#FDECEA', border: '#F5C6CB', icon: <XCircle size={11} />,         label: 'Failed' },
};

const SOURCE_LABELS: Record<ImportSource, string> = {
  EMAIL_ATTACHMENT: 'Email',
  GOOGLE_DRIVE: 'Google Drive',
  ONEDRIVE: 'OneDrive',
  DROPBOX: 'Dropbox',
  URL: 'URL',
  LOCAL_UPLOAD: 'Upload',
};

const IN_PROGRESS_STATUSES: ImportStatus[] = ['PENDING', 'DOWNLOADING', 'PROCESSING'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ImportStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function SourceBadge({ source }: { source: ImportSource }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
      style={{ background: '#EEF1F7', color: '#1B2A4A' }}
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}

// ─── URL Import Tab ───────────────────────────────────────────────────────────

function UrlImportTab({ onJobCreated }: { onJobCreated: () => void }) {
  const [url, setUrl] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ jobId: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiClient.post('/import/url', {
        url: url.trim(),
        counterpartyName: counterpartyName.trim() || undefined,
      });
      setSuccess({ jobId: res.data.jobId });
      setUrl('');
      setCounterpartyName('');
      onJobCreated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start URL import.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-base font-bold mb-1" style={{ color: '#1B2A4A' }}>Import from URL</h2>
        <p className="text-xs" style={{ color: '#888' }}>
          Provide a direct link to a contract file (PDF, DOCX, etc.). The system will download and import it.
        </p>
      </div>

      {success && (
        <div
          className="rounded-xl border px-4 py-3 flex items-center gap-3"
          style={{ background: '#D4EDDA', borderColor: '#C3E6CB' }}
        >
          <CheckCircle size={16} style={{ color: '#1D6A39', flexShrink: 0 }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: '#1D6A39' }}>
              Import job queued successfully!
            </p>
            <p className="text-[10px] mt-0.5 font-mono" style={{ color: '#2D8A4A' }}>
              Job ID: {success.jobId}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: '#2D8A4A' }}>
              Check the Import History tab to track progress.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg px-4 py-3 text-xs font-medium" style={{ background: '#FDECEA', color: '#C0392B', border: '1px solid #F5C6CB' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#444' }}>
            File URL <span style={{ color: '#C0392B' }}>*</span>
          </label>
          <div className="flex items-center gap-2 border rounded-xl px-3 py-2.5" style={{ borderColor: '#E8E4DC', background: '#FAFAFA' }}>
            <Link2 size={14} style={{ color: '#AAA', flexShrink: 0 }} />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/contract.pdf"
              required
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: '#1B2A4A' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#444' }}>
            Counterparty Name <span className="font-normal" style={{ color: '#AAA' }}>(optional)</span>
          </label>
          <input
            type="text"
            value={counterpartyName}
            onChange={(e) => setCounterpartyName(e.target.value)}
            placeholder="e.g. Acme Corporation"
            className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: '#E8E4DC', background: '#FAFAFA', color: '#1B2A4A' }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !url.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: '#1B2A4A' }}
        >
          <Download size={14} />
          {submitting ? 'Queuing...' : 'Import from URL'}
        </button>
      </form>
    </div>
  );
}

// ─── Upload File Tab ──────────────────────────────────────────────────────────

function UploadFileTab({ onJobCreated }: { onJobCreated: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [counterpartyName, setCounterpartyName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ jobId: string; fileName: string } | null>(null);

  function handleFileChange(file: File) {
    setSelectedFile(file);
    setError(null);
    setSuccess(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (counterpartyName.trim()) {
        formData.append('counterpartyName', counterpartyName.trim());
      }

      const res = await apiClient.post('/import/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess({ jobId: res.data.jobId, fileName: selectedFile.name });
      setSelectedFile(null);
      setCounterpartyName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onJobCreated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload file.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const ACCEPTED = '.pdf,.docx,.doc,.txt,.rtf';

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-base font-bold mb-1" style={{ color: '#1B2A4A' }}>Upload Contract File</h2>
        <p className="text-xs" style={{ color: '#888' }}>
          Upload a contract file directly. Supported formats: PDF, DOCX, DOC, TXT, RTF.
        </p>
      </div>

      {success && (
        <div
          className="rounded-xl border px-4 py-3 flex items-center gap-3"
          style={{ background: '#D4EDDA', borderColor: '#C3E6CB' }}
        >
          <CheckCircle size={16} style={{ color: '#1D6A39', flexShrink: 0 }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: '#1D6A39' }}>
              {success.fileName} uploaded successfully!
            </p>
            <p className="text-[10px] mt-0.5 font-mono" style={{ color: '#2D8A4A' }}>
              Job ID: {success.jobId}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: '#2D8A4A' }}>
              Check the Import History tab to track progress.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg px-4 py-3 text-xs font-medium" style={{ background: '#FDECEA', color: '#C0392B', border: '1px solid #F5C6CB' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className="cursor-pointer rounded-xl transition-all"
          style={{
            border: `2px dashed ${dragOver ? '#1B2A4A' : selectedFile ? '#C5A55A' : '#CCC'}`,
            background: dragOver ? '#EEF1F7' : selectedFile ? '#FFF8EC' : '#FAFAFA',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            onChange={(e) => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }}
            className="hidden"
          />
          {selectedFile ? (
            <div className="flex flex-col items-center gap-2">
              <FileText size={28} style={{ color: '#C5A55A' }} />
              <p className="text-sm font-semibold" style={{ color: '#1B2A4A' }}>
                {selectedFile.name}
              </p>
              <p className="text-xs" style={{ color: '#888' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB &bull; {selectedFile.type || 'unknown type'}
              </p>
              <p className="text-[10px]" style={{ color: '#AAA' }}>Click to change file</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: '#E8E4DC' }}
              >
                <CloudUpload size={22} style={{ color: '#666' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#1B2A4A' }}>
                  Drop a file here or click to browse
                </p>
                <p className="text-xs mt-1" style={{ color: '#AAA' }}>
                  PDF, DOCX, DOC, TXT, RTF — max 50 MB
                </p>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#444' }}>
            Counterparty Name <span className="font-normal" style={{ color: '#AAA' }}>(optional)</span>
          </label>
          <input
            type="text"
            value={counterpartyName}
            onChange={(e) => setCounterpartyName(e.target.value)}
            placeholder="e.g. Acme Corporation"
            className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: '#E8E4DC', background: '#FAFAFA', color: '#1B2A4A' }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedFile}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: '#1B2A4A' }}
        >
          <Upload size={14} />
          {submitting ? 'Uploading...' : 'Upload & Import'}
        </button>
      </form>
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({
  jobs,
  loading,
  onRetry,
  retrying,
}: {
  jobs: ImportJob[];
  loading: boolean;
  onRetry: (id: string) => void;
  retrying: string | null;
}) {
  if (loading) {
    return (
      <div className="py-12 text-center">
        <Clock size={24} className="mx-auto mb-2 animate-pulse" style={{ color: '#CCC' }} />
        <p className="text-sm" style={{ color: '#AAA' }}>Loading import history...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div
        className="rounded-xl border py-12 text-center"
        style={{ borderColor: '#E8E4DC', background: '#FAFAFA' }}
      >
        <History size={32} className="mx-auto mb-3" style={{ color: '#DDD' }} />
        <p className="text-sm font-medium" style={{ color: '#888' }}>No import jobs yet</p>
        <p className="text-xs mt-1" style={{ color: '#AAA' }}>
          Use the URL or Upload tabs to import your first contract.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#E8E4DC' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#F5F3EE', borderBottom: '1px solid #E8E4DC' }}>
              {['Source', 'File Name', 'Status', 'Reference', 'Created', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: '#888' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: '#E8E4DC' }}>
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <SourceBadge source={job.source} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText size={13} style={{ color: '#AAA', flexShrink: 0 }} />
                    <span className="text-xs truncate max-w-[160px]" style={{ color: '#333' }}>
                      {job.fileName || '—'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <StatusBadge status={job.status} />
                    {job.status === 'FAILED' && job.errorMessage && (
                      <p className="text-[10px] flex items-center gap-1" style={{ color: '#C0392B' }}>
                        <AlertTriangle size={9} />
                        {job.errorMessage.slice(0, 50)}
                        {job.errorMessage.length > 50 ? '...' : ''}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-mono truncate max-w-[120px] block" style={{ color: '#888' }}>
                    {job.sourceRef ? job.sourceRef.slice(0, 30) + (job.sourceRef.length > 30 ? '...' : '') : '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px]" style={{ color: '#888' }}>
                    {new Date(job.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {job.status === 'COMPLETED' && job.contractId && (
                      <Link
                        href={`/contracts/${job.contractId}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold transition-colors"
                        style={{ background: '#EEF1F7', color: '#1B2A4A' }}
                      >
                        <ExternalLink size={9} />
                        View Contract
                      </Link>
                    )}
                    {job.status === 'FAILED' && (
                      <button
                        onClick={() => onRetry(job.id)}
                        disabled={retrying === job.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold transition-colors disabled:opacity-50"
                        style={{ background: '#FFF3CD', color: '#B7660A' }}
                      >
                        <RefreshCw size={9} />
                        {retrying === job.id ? 'Retrying...' : 'Retry'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'url' | 'upload' | 'history';

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<Tab>('url');
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await apiClient.get<ImportJob[]>('/import/jobs');
      setJobs(res.data);
    } catch {
      // silently fail — user can refresh
    }
  }, []);

  // Poll every 3s if any job is in progress
  useEffect(() => {
    const hasInProgress = jobs.some((j) =>
      IN_PROGRESS_STATUSES.includes(j.status),
    );

    if (hasInProgress && !pollingRef.current) {
      pollingRef.current = setInterval(() => {
        fetchJobs();
      }, 3000);
    } else if (!hasInProgress && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [jobs, fetchJobs]);

  // Initial load when history tab is shown
  useEffect(() => {
    if (activeTab === 'history') {
      setJobsLoading(true);
      fetchJobs().finally(() => setJobsLoading(false));
    }
  }, [activeTab, fetchJobs]);

  function handleJobCreated() {
    // Switch to history tab and load
    setActiveTab('history');
    setJobsLoading(true);
    fetchJobs().finally(() => setJobsLoading(false));
  }

  async function handleRetry(id: string) {
    setRetrying(id);
    try {
      await apiClient.post(`/import/jobs/${id}/retry`);
      await fetchJobs();
    } catch {
      // fail silently
    } finally {
      setRetrying(null);
    }
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'url',     label: 'From URL',       icon: <Link2 size={14} /> },
    { key: 'upload',  label: 'Upload File',     icon: <Upload size={14} /> },
    { key: 'history', label: 'Import History',  icon: <History size={14} /> },
  ];

  const inProgressCount = jobs.filter((j) => IN_PROGRESS_STATUSES.includes(j.status)).length;

  return (
    <div className="min-h-screen" style={{ background: '#F7F6F3' }}>
      {/* Header */}
      <div
        className="px-8 py-5 border-b"
        style={{ background: '#1B2A4A', borderColor: '#263F6A' }}
      >
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <CloudUpload size={20} style={{ color: '#C5A55A' }} />
          Contract Import
        </h1>
        <p className="text-xs mt-0.5" style={{ color: '#8DA4C8' }}>
          Import contracts from URLs, file uploads, or shared drives
        </p>
      </div>

      <div className="px-8 py-6 max-w-5xl">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b" style={{ borderColor: '#E8E4DC' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors relative"
              style={{
                color: activeTab === tab.key ? '#1B2A4A' : '#888',
                borderBottom: activeTab === tab.key ? '2px solid #C5A55A' : '2px solid transparent',
                marginBottom: '-1px',
                background: 'transparent',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'history' && inProgressCount > 0 && (
                <span
                  className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
                  style={{ background: '#B7660A' }}
                >
                  {inProgressCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'url' && (
          <UrlImportTab onJobCreated={handleJobCreated} />
        )}
        {activeTab === 'upload' && (
          <UploadFileTab onJobCreated={handleJobCreated} />
        )}
        {activeTab === 'history' && (
          <HistoryTab
            jobs={jobs}
            loading={jobsLoading}
            onRetry={handleRetry}
            retrying={retrying}
          />
        )}
      </div>
    </div>
  );
}
