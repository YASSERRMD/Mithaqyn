'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { FileText, CheckCircle, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface OcrJob {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  engine: string;
  confidence: number | null;
  pageCount: number | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  _count?: { pages: number };
}

interface DocumentPage {
  id: string;
  pageNumber: number;
  text: string;
  confidence: number | null;
  wordCount: number | null;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING: <Clock size={16} className="text-yellow-500" />,
  PROCESSING: <RefreshCw size={16} className="text-blue-500 animate-spin" />,
  COMPLETED: <CheckCircle size={16} className="text-green-500" />,
  FAILED: <XCircle size={16} className="text-red-500" />,
  SKIPPED: <Clock size={16} className="text-gray-400" />,
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#D97706',
  PROCESSING: '#2563EB',
  COMPLETED: '#16A34A',
  FAILED: '#DC2626',
  SKIPPED: '#6B7280',
};

export default function DocumentOcrPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [jobs, setJobs] = useState<OcrJob[]>([]);
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [expandedPage, setExpandedPage] = useState<number | null>(null);
  const [polling, setPolling] = useState(false);

  const fetchData = async () => {
    const [jobsRes, pagesRes] = await Promise.all([
      apiClient.get(`/documents/${documentId}/ocr-jobs`),
      apiClient.get(`/documents/${documentId}/pages`),
    ]);
    setJobs(jobsRes.data);
    setPages(pagesRes.data);
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [documentId]);

  // Poll while a job is processing
  useEffect(() => {
    const hasProcessing = jobs.some((j) => j.status === 'PROCESSING' || j.status === 'PENDING');
    if (!hasProcessing || polling) return;
    setPolling(true);
    const interval = setInterval(async () => {
      const r = await apiClient.get(`/documents/${documentId}/ocr-jobs`);
      setJobs(r.data);
      const stillProcessing = (r.data as OcrJob[]).some((j) => j.status === 'PROCESSING' || j.status === 'PENDING');
      if (!stillProcessing) {
        clearInterval(interval);
        setPolling(false);
        const pagesRes = await apiClient.get(`/documents/${documentId}/pages`);
        setPages(pagesRes.data);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobs, documentId, polling]);

  const handleExtract = async () => {
    setExtracting(true);
    try {
      await apiClient.post(`/documents/${documentId}/extract`);
      const r = await apiClient.get(`/documents/${documentId}/ocr-jobs`);
      setJobs(r.data);
    } finally {
      setExtracting(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-sm" style={{ color: '#888' }}>Loading...</div>;
  }

  const latestJob = jobs[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>Document Extraction</h1>
          <p className="text-sm mt-0.5" style={{ color: '#888' }}>OCR and text extraction status</p>
        </div>
        <button
          onClick={handleExtract}
          disabled={extracting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: '#1B2A4A' }}
        >
          <FileText size={15} />
          {extracting ? 'Starting...' : 'Run Extraction'}
        </button>
      </div>

      {/* Latest job status card */}
      {latestJob && (
        <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: '#E8E4DC' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#1B2A4A' }}>Latest Job</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Status', value: latestJob.status, icon: STATUS_ICON[latestJob.status] },
              { label: 'Engine', value: latestJob.engine || '—' },
              { label: 'Pages', value: latestJob.pageCount ?? pages.length ?? '—' },
              { label: 'Confidence', value: latestJob.confidence ? `${(latestJob.confidence * 100).toFixed(1)}%` : '—' },
            ].map((s) => (
              <div key={s.label} className="text-center p-3 rounded-lg" style={{ background: '#FAFAF8' }}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  {s.icon}
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#888' }}>{s.label}</span>
                </div>
                <p className="text-lg font-bold" style={{ color: STATUS_COLOR[latestJob.status] ?? '#1B2A4A' }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
          {latestJob.error && (
            <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              Error: {latestJob.error}
            </div>
          )}
        </div>
      )}

      {/* Extracted pages */}
      {pages.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: '#E8E4DC' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: '#F0EDE8', background: '#FAFAF8' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#1B2A4A' }}>
              Extracted Text — {pages.length} page{pages.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: '#F0EDE8' }}>
            {pages.map((page) => (
              <div key={page.id}>
                <button
                  className="w-full text-left px-5 py-3 hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => setExpandedPage(expandedPage === page.pageNumber ? null : page.pageNumber)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: '#F0EDE8', color: '#1B2A4A' }}>
                      Page {page.pageNumber}
                    </span>
                    <span className="text-xs" style={{ color: '#888' }}>
                      {page.wordCount ?? 0} words
                      {page.confidence && ` · ${(page.confidence * 100).toFixed(0)}% confidence`}
                    </span>
                  </div>
                  {expandedPage === page.pageNumber ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedPage === page.pageNumber && (
                  <div className="px-5 pb-4">
                    <pre className="text-xs rounded-lg p-3 whitespace-pre-wrap leading-relaxed"
                      style={{ background: '#FAFAF8', color: '#3A3A3A', fontFamily: 'monospace', maxHeight: 400, overflowY: 'auto' }}>
                      {page.text || '(empty page)'}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job history */}
      {jobs.length > 1 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: '#E8E4DC' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: '#F0EDE8', background: '#FAFAF8' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#1B2A4A' }}>Job History</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#FAFAF8' }}>
                {['Job ID', 'Status', 'Engine', 'Pages', 'Created'].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: '#888' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-t" style={{ borderColor: '#F0EDE8' }}>
                  <td className="px-4 py-2 text-xs" style={{ color: '#AAA' }}>{j.id.slice(0, 8)}…</td>
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-1 text-xs font-semibold"
                      style={{ color: STATUS_COLOR[j.status] }}>
                      {STATUS_ICON[j.status]} {j.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs" style={{ color: '#666' }}>{j.engine}</td>
                  <td className="px-4 py-2 text-xs" style={{ color: '#666' }}>{j.pageCount ?? '—'}</td>
                  <td className="px-4 py-2 text-xs" style={{ color: '#666' }}>{new Date(j.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {jobs.length === 0 && pages.length === 0 && (
        <div className="bg-white rounded-xl border shadow-sm py-12 text-center" style={{ borderColor: '#E8E4DC' }}>
          <FileText size={36} className="mx-auto mb-3" style={{ color: '#DDD' }} />
          <p className="text-sm" style={{ color: '#888' }}>No extraction jobs yet. Click "Run Extraction" to start.</p>
        </div>
      )}
    </div>
  );
}
