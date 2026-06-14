'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { CheckCircle, XCircle, Clock, ChevronRight, Inbox } from 'lucide-react';

interface ApprovalStepContract {
  id: string;
  title: string;
  type: string;
  status: string;
}

interface ApprovalStepWorkflow {
  id: string;
  contractId: string;
  status: string;
  contract: ApprovalStepContract;
}

interface ApprovalStep {
  id: string;
  workflowId: string;
  stepOrder: number;
  role: string;
  assigneeId: string | null;
  status: string;
  comment: string | null;
  rejectionReason: string | null;
  decidedAt: string | null;
  createdAt: string;
  workflow: ApprovalStepWorkflow;
}

interface DecideModalState {
  stepId: string;
  contractTitle: string;
  decision: 'APPROVED' | 'REJECTED';
}

const ROLE_LABELS: Record<string, string> = {
  LEGAL_ADMIN: 'Legal Admin',
  FINANCE: 'Finance',
  PROCUREMENT: 'Procurement',
  MANAGEMENT: 'Management',
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  LEGAL_ADMIN: { bg: '#EFF6FF', text: '#1D4ED8' },
  FINANCE: { bg: '#F0FDF4', text: '#15803D' },
  PROCUREMENT: { bg: '#FFF7ED', text: '#C2410C' },
  MANAGEMENT: { bg: '#FAF5FF', text: '#7E22CE' },
};

function RoleBadge({ role }: { role: string }) {
  const colors = ROLE_COLORS[role] ?? { bg: '#F3F4F6', text: '#374151' };
  return (
    <span
      className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: colors.bg, color: colors.text }}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function StepOrderBadge({ order }: { order: number }) {
  return (
    <div
      className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
      style={{ background: '#1B2A4A', color: '#C5A55A' }}
    >
      {order}
    </div>
  );
}

function Spinner() {
  return (
    <div className="py-16 text-center">
      <div
        className="inline-block w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: '#C5A55A', borderTopColor: 'transparent' }}
      />
      <p className="text-sm mt-3" style={{ color: '#888' }}>
        Loading approvals inbox...
      </p>
    </div>
  );
}

export default function ApprovalsPage() {
  const [steps, setSteps] = useState<ApprovalStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal] = useState<DecideModalState | null>(null);
  const [comment, setComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = roleFilter ? { role: roleFilter } : {};
      const res = await apiClient.get('/approvals/inbox', { params });
      setSteps(res.data);
    } catch {
      setError('Failed to load approvals inbox. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  function openModal(step: ApprovalStep, decision: 'APPROVED' | 'REJECTED') {
    setModal({
      stepId: step.id,
      contractTitle: step.workflow.contract.title,
      decision,
    });
    setComment('');
    setRejectionReason('');
  }

  function closeModal() {
    setModal(null);
    setComment('');
    setRejectionReason('');
  }

  async function submitDecision() {
    if (!modal) return;
    if (modal.decision === 'REJECTED' && !rejectionReason.trim()) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/approvals/steps/${modal.stepId}/decide`, {
        decision: modal.decision,
        comment: comment.trim() || undefined,
        rejectionReason: rejectionReason.trim() || undefined,
      });
      setSuccessMsg(
        modal.decision === 'APPROVED'
          ? 'Step approved successfully.'
          : 'Step rejected successfully.',
      );
      closeModal();
      fetchInbox();
    } catch {
      setError('Failed to submit decision. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3500);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  const roleOptions = ['', 'LEGAL_ADMIN', 'FINANCE', 'PROCUREMENT', 'MANAGEMENT'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>
            Approvals Inbox
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#888' }}>
            Pending contract approval steps assigned to you or your role
          </p>
        </div>

        {/* Role filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#888' }}>
            Filter by Role
          </label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2"
            style={{
              borderColor: '#E8E4DC',
              color: '#1B2A4A',
              background: '#fff',
            }}
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r ? ROLE_LABELS[r] ?? r : 'All Roles'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium"
          style={{ background: '#F0FDF4', borderColor: '#BBF7D0', color: '#15803D' }}
        >
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium"
          style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}
        >
          <XCircle size={16} />
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <Spinner />
      ) : steps.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-xl border"
          style={{ borderColor: '#E8E4DC', background: '#FAFAF8' }}
        >
          <Inbox size={40} style={{ color: '#C5A55A' }} />
          <p className="text-base font-semibold mt-4" style={{ color: '#1B2A4A' }}>
            No pending approvals
          </p>
          <p className="text-sm mt-1" style={{ color: '#888' }}>
            You are all caught up. Check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className="bg-white rounded-xl border shadow-sm overflow-hidden"
              style={{ borderColor: '#E8E4DC' }}
            >
              <div className="flex items-center gap-4 px-5 py-4">
                <StepOrderBadge order={step.stepOrder} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1B2A4A' }}>
                      {step.workflow.contract.title}
                    </p>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: '#F7F5F0', color: '#888' }}
                    >
                      {step.workflow.contract.type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <RoleBadge role={step.role} />
                    <span className="flex items-center gap-1 text-xs" style={{ color: '#AAA' }}>
                      <Clock size={12} />
                      Step {step.stepOrder} of workflow
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: '#AAA' }}>
                      <ChevronRight size={12} />
                      Workflow:{' '}
                      <span
                        className="font-semibold"
                        style={{
                          color:
                            step.workflow.status === 'IN_PROGRESS'
                              ? '#2563EB'
                              : step.workflow.status === 'PENDING'
                              ? '#D97706'
                              : '#888',
                        }}
                      >
                        {step.workflow.status.replace(/_/g, ' ')}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openModal(step, 'APPROVED')}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}
                  >
                    <CheckCircle size={13} />
                    Approve
                  </button>
                  <button
                    onClick={() => openModal(step, 'REJECTED')}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                  >
                    <XCircle size={13} />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decision Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            style={{ border: '1px solid #E8E4DC' }}
          >
            {/* Modal header */}
            <div
              className="px-6 py-4 border-b flex items-center gap-3"
              style={{
                borderColor: '#F0EDE8',
                background: modal.decision === 'APPROVED' ? '#F0FDF4' : '#FEF2F2',
              }}
            >
              {modal.decision === 'APPROVED' ? (
                <CheckCircle size={20} style={{ color: '#15803D' }} />
              ) : (
                <XCircle size={20} style={{ color: '#DC2626' }} />
              )}
              <div>
                <h2
                  className="text-base font-bold"
                  style={{ color: modal.decision === 'APPROVED' ? '#15803D' : '#DC2626' }}
                >
                  {modal.decision === 'APPROVED' ? 'Approve Step' : 'Reject Step'}
                </h2>
                <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: '#888' }}>
                  {modal.contractTitle}
                </p>
              </div>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
                  style={{ color: '#888' }}
                >
                  Comment (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Add a comment..."
                  className="w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2"
                  style={{
                    borderColor: '#E8E4DC',
                    color: '#1B2A4A',
                  }}
                />
              </div>

              {modal.decision === 'REJECTED' && (
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
                    style={{ color: '#DC2626' }}
                  >
                    Rejection Reason <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Please explain why this step is being rejected..."
                    className="w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2"
                    style={{
                      borderColor: rejectionReason.trim() ? '#E8E4DC' : '#FECACA',
                      color: '#1B2A4A',
                    }}
                  />
                  {!rejectionReason.trim() && (
                    <p className="text-xs mt-1" style={{ color: '#DC2626' }}>
                      A rejection reason is required.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div
              className="px-6 py-4 border-t flex justify-end gap-3"
              style={{ borderColor: '#F0EDE8', background: '#FAFAF8' }}
            >
              <button
                onClick={closeModal}
                disabled={submitting}
                className="text-sm font-medium px-4 py-2 rounded-lg border transition-colors"
                style={{ borderColor: '#E8E4DC', color: '#888' }}
              >
                Cancel
              </button>
              <button
                onClick={submitDecision}
                disabled={
                  submitting ||
                  (modal.decision === 'REJECTED' && !rejectionReason.trim())
                }
                className="flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: modal.decision === 'APPROVED' ? '#15803D' : '#DC2626',
                  color: '#fff',
                }}
              >
                {submitting && (
                  <span
                    className="inline-block w-4 h-4 rounded-full border-2 animate-spin"
                    style={{ borderColor: '#fff', borderTopColor: 'transparent' }}
                  />
                )}
                {modal.decision === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
