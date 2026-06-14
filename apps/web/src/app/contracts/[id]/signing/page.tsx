'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileSignature,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  ExternalLink,
  Ban,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type SigningStatus =
  | 'PENDING'
  | 'SENT'
  | 'SIGNED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'CANCELLED';

type Provider = 'DOCUSIGN' | 'ADOBE_SIGN' | 'UAE_PASS';

interface SigningRequest {
  id: string;
  contractId: string;
  provider: Provider;
  status: SigningStatus;
  externalId: string | null;
  signerEmail: string;
  signerName: string;
  redirectUrl: string | null;
  callbackData: { signingUrl?: string } | null;
  sentAt: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SigningStatus,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: 'Pending',
    color: '#92601A',
    bg: '#FFF8EC',
    border: '#C5A55A',
    icon: <Clock size={11} />,
  },
  SENT: {
    label: 'Sent',
    color: '#1B5E8A',
    bg: '#EEF5FF',
    border: '#90CAF9',
    icon: <Send size={11} />,
  },
  SIGNED: {
    label: 'Signed',
    color: '#1A6637',
    bg: '#EAFAF1',
    border: '#A9DFBF',
    icon: <CheckCircle size={11} />,
  },
  DECLINED: {
    label: 'Declined',
    color: '#922B21',
    bg: '#FDECEA',
    border: '#F1948A',
    icon: <XCircle size={11} />,
  },
  EXPIRED: {
    label: 'Expired',
    color: '#666',
    bg: '#F5F5F5',
    border: '#CCCCCC',
    icon: <AlertTriangle size={11} />,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#666',
    bg: '#F5F5F5',
    border: '#CCCCCC',
    icon: <Ban size={11} />,
  },
};

const PROVIDER_LABELS: Record<Provider, string> = {
  DOCUSIGN: 'DocuSign',
  ADOBE_SIGN: 'Adobe Sign',
  UAE_PASS: 'UAE Pass',
};

const PROVIDER_COLORS: Record<Provider, { accent: string; bg: string }> = {
  DOCUSIGN: { accent: '#FFB800', bg: '#FFFBF0' },
  ADOBE_SIGN: { accent: '#FA0F00', bg: '#FFF0EF' },
  UAE_PASS: { accent: '#006C35', bg: '#EDFAF3' },
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SigningStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Provider Badge ───────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: Provider }) {
  const cfg = PROVIDER_COLORS[provider] ?? { accent: '#888', bg: '#F5F5F5' };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide"
      style={{ color: cfg.accent, background: cfg.bg, border: `1px solid ${cfg.accent}33` }}
    >
      {PROVIDER_LABELS[provider] ?? provider}
    </span>
  );
}

// ─── Signing Request Card ─────────────────────────────────────────────────────

interface RequestCardProps {
  request: SigningRequest;
  onCancel: (id: string) => void;
  cancelling: string | null;
}

function RequestCard({ request, onCancel, cancelling }: RequestCardProps) {
  const signingUrl = request.callbackData?.signingUrl;
  const canCancel =
    request.status === 'PENDING' || request.status === 'SENT';

  return (
    <div
      className="bg-white rounded-xl border shadow-sm p-5 space-y-3"
      style={{ borderColor: '#E8E4DC' }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <ProviderBadge provider={request.provider} />
          <StatusBadge status={request.status} />
        </div>
        <span className="text-xs shrink-0" style={{ color: '#AAA' }}>
          {new Date(request.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {/* Signer info */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <p className="text-xs font-medium" style={{ color: '#888' }}>Signer</p>
          <p className="text-sm font-semibold" style={{ color: '#1B2A4A' }}>
            {request.signerName}
          </p>
          <p className="text-xs" style={{ color: '#666' }}>{request.signerEmail}</p>
        </div>
        {request.expiresAt && (
          <div>
            <p className="text-xs font-medium" style={{ color: '#888' }}>Expires</p>
            <p className="text-sm" style={{ color: '#1B2A4A' }}>
              {new Date(request.expiresAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        )}
        {request.signedAt && (
          <div>
            <p className="text-xs font-medium" style={{ color: '#888' }}>Signed At</p>
            <p className="text-sm font-semibold" style={{ color: '#1A6637' }}>
              {new Date(request.signedAt).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {signingUrl && request.status !== 'SIGNED' && request.status !== 'CANCELLED' && (
          <a
            href={signingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ background: '#1B2A4A', color: '#C5A55A' }}
          >
            <ExternalLink size={11} />
            Open Signing Link
          </a>
        )}
        {canCancel && (
          <button
            onClick={() => onCancel(request.id)}
            disabled={cancelling === request.id}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50"
            style={{ borderColor: '#F1948A', color: '#922B21', background: '#FDECEA' }}
          >
            <Ban size={11} />
            {cancelling === request.id ? 'Cancelling...' : 'Cancel Request'}
          </button>
        )}
      </div>

      {/* External ID (small, for debugging) */}
      {request.externalId && (
        <p className="text-[10px] font-mono truncate" style={{ color: '#BBB' }}>
          ID: {request.externalId}
        </p>
      )}
    </div>
  );
}

// ─── Create Request Form ──────────────────────────────────────────────────────

interface CreateFormProps {
  contractId: string;
  onCreated: () => void;
  onCancel: () => void;
}

const PROVIDERS: Array<{ value: Provider; label: string }> = [
  { value: 'DOCUSIGN', label: 'DocuSign' },
  { value: 'ADOBE_SIGN', label: 'Adobe Sign' },
  { value: 'UAE_PASS', label: 'UAE Pass' },
];

function CreateRequestForm({ contractId, onCreated, onCancel }: CreateFormProps) {
  const [provider, setProvider] = useState<Provider>('DOCUSIGN');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerName, setSignerName] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signerEmail.trim() || !signerName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/contracts/${contractId}/signing-requests`, {
        provider,
        signerEmail: signerEmail.trim(),
        signerName: signerName.trim(),
        redirectUrl: redirectUrl.trim() || undefined,
      });
      onCreated();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to create signing request. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border shadow-sm p-5 space-y-4"
      style={{ borderColor: '#C5A55A' }}
    >
      <h3 className="text-sm font-bold" style={{ color: '#1B2A4A' }}>
        New Signing Request
      </h3>

      {error && (
        <div
          className="rounded-lg px-3 py-2 text-xs font-medium"
          style={{ background: '#FDECEA', color: '#922B21' }}
        >
          {error}
        </div>
      )}

      {/* Provider selector */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>
          Provider
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PROVIDERS.map((p) => {
            const colors = PROVIDER_COLORS[p.value];
            const selected = provider === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setProvider(p.value)}
                className="py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all"
                style={{
                  borderColor: selected ? colors.accent : '#E8E4DC',
                  background: selected ? colors.bg : '#FAFAFA',
                  color: selected ? colors.accent : '#666',
                  boxShadow: selected ? `0 0 0 2px ${colors.accent}33` : 'none',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Signer name + email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>
            Signer Name
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="e.g. John Smith"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-offset-1"
            style={{ borderColor: '#E8E4DC', color: '#1B2A4A' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>
            Signer Email
          </label>
          <input
            type="email"
            value={signerEmail}
            onChange={(e) => setSignerEmail(e.target.value)}
            placeholder="signer@example.com"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-offset-1"
            style={{ borderColor: '#E8E4DC', color: '#1B2A4A' }}
          />
        </div>
      </div>

      {/* Redirect URL */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>
          Redirect URL{' '}
          <span className="font-normal" style={{ color: '#AAA' }}>
            (optional — sent to provider after signing)
          </span>
        </label>
        <input
          type="url"
          value={redirectUrl}
          onChange={(e) => setRedirectUrl(e.target.value)}
          placeholder="https://yourapp.com/signing/complete"
          className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-offset-1"
          style={{ borderColor: '#E8E4DC', color: '#1B2A4A' }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
          style={{ borderColor: '#E8E4DC', color: '#888' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !signerEmail.trim() || !signerName.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: '#1B2A4A' }}
        >
          <Send size={13} />
          {submitting ? 'Sending...' : 'Send for Signature'}
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SigningPage() {
  const { id } = useParams<{ id: string }>();
  const [requests, setRequests] = useState<SigningRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchRequests() {
    setError(null);
    try {
      const res = await apiClient.get(`/contracts/${id}/signing-requests`);
      setRequests(res.data);
    } catch {
      setError('Failed to load signing requests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequests();
  }, [id]);

  async function handleCancel(requestId: string) {
    setCancelling(requestId);
    try {
      await apiClient.patch(`/signing-requests/${requestId}/cancel`);
      await fetchRequests();
    } catch {
      setError('Failed to cancel the signing request. Please try again.');
    } finally {
      setCancelling(null);
    }
  }

  const activeCount = requests.filter(
    (r) => r.status === 'PENDING' || r.status === 'SENT',
  ).length;
  const signedCount = requests.filter((r) => r.status === 'SIGNED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: '#AAA' }}>
          Loading signing requests...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/contracts/${id}`}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} style={{ color: '#666' }} />
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1B2A4A' }}>
              E-Signature
            </h1>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>
              Send, track, and manage signing requests for this contract
            </p>
          </div>
        </div>

        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: '#1B2A4A' }}
          >
            <Plus size={14} />
            New Request
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium"
          style={{ background: '#FDECEA', color: '#922B21' }}
        >
          {error}
        </div>
      )}

      {/* Stats row */}
      {requests.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Requests', value: requests.length },
            { label: 'Active', value: activeCount, accent: '#1B5E8A' },
            { label: 'Signed', value: signedCount, accent: '#1A6637' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-4 border flex flex-col gap-1"
              style={{ borderColor: '#E8E4DC', background: '#FAFAFA' }}
            >
              <span className="text-xs font-medium" style={{ color: '#888' }}>
                {s.label}
              </span>
              <span
                className="text-2xl font-bold"
                style={{ color: s.accent ?? '#1B2A4A' }}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <CreateRequestForm
          contractId={id}
          onCreated={() => {
            setShowCreateForm(false);
            setLoading(true);
            fetchRequests();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Requests list */}
      {requests.length === 0 && !showCreateForm ? (
        <div
          className="rounded-xl p-12 border text-center"
          style={{ borderColor: '#E8E4DC', background: '#FAFAFA' }}
        >
          <FileSignature
            size={36}
            className="mx-auto mb-3"
            style={{ color: '#C5A55A' }}
          />
          <p className="text-sm font-medium" style={{ color: '#888' }}>
            No signing requests yet
          </p>
          <p className="text-xs mt-1" style={{ color: '#AAA' }}>
            Send this contract to DocuSign, Adobe Sign, or UAE Pass for e-signature.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white mx-auto transition-opacity hover:opacity-90"
            style={{ background: '#1B2A4A' }}
          >
            <Plus size={14} />
            Send for Signature
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onCancel={handleCancel}
              cancelling={cancelling}
            />
          ))}
        </div>
      )}
    </div>
  );
}
