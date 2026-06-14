'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import {
  Bell, CheckCheck, Clock, AlertTriangle, FileText,
  RefreshCw, Trash2, Plus, X, Calendar, CheckCircle,
  AlertCircle, Info, Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

interface Reminder {
  id: string;
  title: string;
  message?: string;
  reminderType: string;
  scheduledAt: string;
  recurrence?: string;
  isTriggered: boolean;
  contract?: { id: string; title: string };
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  CONTRACT_EXPIRING:  <AlertTriangle size={16} color="#EA580C" />,
  OBLIGATION_DUE:     <Clock size={16} color="#D97706" />,
  APPROVAL_REQUIRED:  <AlertCircle size={16} color="#2563EB" />,
  APPROVAL_COMPLETED: <CheckCircle size={16} color="#16A34A" />,
  RENEWAL_UPCOMING:   <RefreshCw size={16} color="#7C3AED" />,
  SLA_BREACH:         <Zap size={16} color="#DC2626" />,
  IMPORT_COMPLETED:   <FileText size={16} color="#0891B2" />,
  SYSTEM:             <Info size={16} color="#6B7280" />,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  CONTRACT_EXPIRING:  '#FFF7ED',
  OBLIGATION_DUE:     '#FEFCE8',
  APPROVAL_REQUIRED:  '#EFF6FF',
  APPROVAL_COMPLETED: '#F0FDF4',
  RENEWAL_UPCOMING:   '#F5F3FF',
  SLA_BREACH:         '#FEF2F2',
  IMPORT_COMPLETED:   '#ECFEFF',
  SYSTEM:             '#F9FAFB',
};

const REMINDER_TYPE_LABELS: Record<string, string> = {
  CONTRACT_EXPIRY:      'Contract Expiry',
  OBLIGATION_DEADLINE:  'Obligation Deadline',
  RENEWAL_NOTICE:       'Renewal Notice',
  CUSTOM:               'Custom',
};

const REMINDER_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  CONTRACT_EXPIRY:     { bg: '#FFF7ED', color: '#C2410C' },
  OBLIGATION_DEADLINE: { bg: '#FEFCE8', color: '#854D0E' },
  RENEWAL_NOTICE:      { bg: '#F5F3FF', color: '#6D28D9' },
  CUSTOM:              { bg: '#F0FDF4', color: '#166534' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'reminders'>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    title: '',
    message: '',
    reminderType: 'CUSTOM',
    scheduledAt: '',
    contractId: '',
    recurrence: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        apiClient.get(`/notifications${showUnreadOnly ? '?unreadOnly=true' : ''}`),
        apiClient.get('/notifications/count'),
      ]);
      setNotifications(notifRes.data);
      setUnreadCount(countRes.data.count);
    } catch {
      // ignore
    }
  }, [showUnreadOnly]);

  const fetchReminders = useCallback(async () => {
    try {
      const res = await apiClient.get('/reminders');
      setReminders(res.data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchNotifications(), fetchReminders()]).finally(() =>
      setLoading(false),
    );
  }, [fetchNotifications, fetchReminders]);

  async function handleMarkRead(id: string) {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }

  async function handleMarkAllRead() {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  async function handleDeleteReminder(id: string) {
    try {
      await apiClient.delete(`/reminders/${id}`);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // ignore
    }
  }

  async function handleAddReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!reminderForm.title || !reminderForm.scheduledAt) {
      setError('Title and scheduled date are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload: Record<string, string> = {
        title: reminderForm.title,
        reminderType: reminderForm.reminderType,
        scheduledAt: reminderForm.scheduledAt,
      };
      if (reminderForm.message) payload.message = reminderForm.message;
      if (reminderForm.contractId) payload.contractId = reminderForm.contractId;
      if (reminderForm.recurrence) payload.recurrence = reminderForm.recurrence;

      const res = await apiClient.post('/reminders', payload);
      setReminders((prev) => [...prev, res.data]);
      setShowAddReminder(false);
      setReminderForm({
        title: '', message: '', reminderType: 'CUSTOM',
        scheduledAt: '', contractId: '', recurrence: '',
      });
    } catch {
      setError('Failed to create reminder. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const displayedNotifications = showUnreadOnly
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F4', padding: '32px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#1B2A4A', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Bell size={22} color="#C5A55A" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1B2A4A', margin: 0 }}>
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span
                    style={{
                      background: '#DC2626', color: '#fff',
                      borderRadius: 99, fontSize: 12, fontWeight: 700,
                      padding: '1px 8px', minWidth: 22, textAlign: 'center',
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
                Alerts, updates, and reminders
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#E8E4DA', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
          {(['notifications', 'reminders'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
                background: activeTab === tab ? '#1B2A4A' : 'transparent',
                color: activeTab === tab ? '#C5A55A' : '#666',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {tab === 'notifications' ? (
                <>
                  <Bell size={14} />
                  Notifications
                  {unreadCount > 0 && tab === 'notifications' && (
                    <span
                      style={{
                        background: '#DC2626', color: '#fff',
                        borderRadius: 99, fontSize: 10, fontWeight: 700,
                        padding: '0 5px',
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Clock size={14} />
                  Reminders
                </>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#888' }}>
            <div style={{
              width: 36, height: 36, border: '3px solid #E8E4DA',
              borderTopColor: '#C5A55A', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            Loading...
          </div>
        ) : activeTab === 'notifications' ? (
          /* ── Notifications Tab ── */
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8E4DA', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div
              style={{
                padding: '14px 20px', borderBottom: '1px solid #F0EDE4',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowUnreadOnly(false)}
                  style={{
                    padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: !showUnreadOnly ? '#1B2A4A' : '#F0EDE4',
                    color: !showUnreadOnly ? '#C5A55A' : '#666',
                    fontWeight: 600, fontSize: 13,
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => setShowUnreadOnly(true)}
                  style={{
                    padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: showUnreadOnly ? '#1B2A4A' : '#F0EDE4',
                    color: showUnreadOnly ? '#C5A55A' : '#666',
                    fontWeight: 600, fontSize: 13,
                  }}
                >
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 8, border: '1px solid #E8E4DA',
                    background: '#fff', color: '#1B2A4A', cursor: 'pointer',
                    fontWeight: 600, fontSize: 13,
                  }}
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            {displayedNotifications.length === 0 ? (
              <div style={{ padding: '64px 0', textAlign: 'center', color: '#aaa' }}>
                <Bell size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontWeight: 600, fontSize: 15 }}>
                  {showUnreadOnly ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p style={{ fontSize: 13, margin: '4px 0 0' }}>
                  You're all caught up!
                </p>
              </div>
            ) : (
              displayedNotifications.map((n, idx) => (
                <div
                  key={n.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: idx < displayedNotifications.length - 1 ? '1px solid #F9F8F5' : 'none',
                    background: n.isRead ? '#fff' : NOTIFICATION_COLORS[n.type] ?? '#F9FAFB',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Unread dot */}
                  <div style={{ display: 'flex', alignItems: 'center', paddingTop: 3 }}>
                    {!n.isRead && (
                      <div
                        style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: '#C5A55A', marginRight: 8, flexShrink: 0,
                        }}
                      />
                    )}
                    {n.isRead && <div style={{ width: 8, marginRight: 8 }} />}
                    <div
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: '#F0EDE4', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}
                    >
                      {NOTIFICATION_ICONS[n.type] ?? <Info size={16} color="#888" />}
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <p
                        style={{
                          margin: 0, fontWeight: n.isRead ? 500 : 700,
                          fontSize: 14, color: '#1B2A4A',
                        }}
                      >
                        {n.title}
                      </p>
                      <span style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                      {n.message}
                    </p>
                    {n.entityType && (
                      <span
                        style={{
                          display: 'inline-block', marginTop: 6,
                          fontSize: 11, color: '#888', background: '#F0EDE4',
                          borderRadius: 5, padding: '1px 7px',
                        }}
                      >
                        {n.entityType}
                      </span>
                    )}
                  </div>

                  {/* Mark read button */}
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      title="Mark as read"
                      style={{
                        flexShrink: 0, background: 'none', border: 'none',
                        cursor: 'pointer', padding: 4, borderRadius: 6,
                        color: '#C5A55A',
                      }}
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* ── Reminders Tab ── */
          <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button
                onClick={() => setShowAddReminder(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px', borderRadius: 10,
                  background: '#1B2A4A', color: '#C5A55A',
                  border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 14,
                }}
              >
                <Plus size={16} />
                Add Reminder
              </button>
            </div>

            {/* Add Reminder Form */}
            {showAddReminder && (
              <div
                style={{
                  background: '#fff', borderRadius: 16, border: '1px solid #E8E4DA',
                  padding: 24, marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <h3 style={{ margin: 0, color: '#1B2A4A', fontWeight: 700, fontSize: 16 }}>
                    New Reminder
                  </h3>
                  <button
                    onClick={() => { setShowAddReminder(false); setError(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {error && (
                  <div
                    style={{
                      background: '#FEF2F2', border: '1px solid #FECACA',
                      borderRadius: 8, padding: '10px 14px',
                      color: '#DC2626', fontSize: 13, marginBottom: 14,
                    }}
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handleAddReminder}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>
                        Title *
                      </label>
                      <input
                        type="text"
                        value={reminderForm.title}
                        onChange={(e) => setReminderForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="e.g. Review renewal clause before deadline"
                        required
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #E8E4DA', fontSize: 14, boxSizing: 'border-box',
                          outline: 'none', color: '#1B2A4A',
                        }}
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>
                        Message (optional)
                      </label>
                      <textarea
                        value={reminderForm.message}
                        onChange={(e) => setReminderForm((f) => ({ ...f, message: e.target.value }))}
                        placeholder="Additional details..."
                        rows={2}
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #E8E4DA', fontSize: 14, boxSizing: 'border-box',
                          resize: 'vertical', outline: 'none', color: '#1B2A4A',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>
                        Type *
                      </label>
                      <select
                        value={reminderForm.reminderType}
                        onChange={(e) => setReminderForm((f) => ({ ...f, reminderType: e.target.value }))}
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #E8E4DA', fontSize: 14, boxSizing: 'border-box',
                          outline: 'none', color: '#1B2A4A', background: '#fff',
                        }}
                      >
                        <option value="CUSTOM">Custom</option>
                        <option value="CONTRACT_EXPIRY">Contract Expiry</option>
                        <option value="OBLIGATION_DEADLINE">Obligation Deadline</option>
                        <option value="RENEWAL_NOTICE">Renewal Notice</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>
                        Schedule Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={reminderForm.scheduledAt}
                        onChange={(e) => setReminderForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                        required
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #E8E4DA', fontSize: 14, boxSizing: 'border-box',
                          outline: 'none', color: '#1B2A4A',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>
                        Contract ID (optional)
                      </label>
                      <input
                        type="text"
                        value={reminderForm.contractId}
                        onChange={(e) => setReminderForm((f) => ({ ...f, contractId: e.target.value }))}
                        placeholder="Paste contract UUID..."
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #E8E4DA', fontSize: 14, boxSizing: 'border-box',
                          outline: 'none', color: '#1B2A4A',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>
                        Recurrence
                      </label>
                      <select
                        value={reminderForm.recurrence}
                        onChange={(e) => setReminderForm((f) => ({ ...f, recurrence: e.target.value }))}
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #E8E4DA', fontSize: 14, boxSizing: 'border-box',
                          outline: 'none', color: '#1B2A4A', background: '#fff',
                        }}
                      >
                        <option value="">One time</option>
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => { setShowAddReminder(false); setError(''); }}
                      style={{
                        padding: '9px 18px', borderRadius: 9,
                        border: '1px solid #E8E4DA', background: '#fff',
                        color: '#555', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        padding: '9px 22px', borderRadius: 9,
                        background: '#1B2A4A', color: '#C5A55A',
                        border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                        fontWeight: 700, fontSize: 14, opacity: submitting ? 0.7 : 1,
                      }}
                    >
                      {submitting ? 'Creating...' : 'Create Reminder'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Reminders List */}
            {reminders.length === 0 ? (
              <div
                style={{
                  background: '#fff', borderRadius: 16, border: '1px solid #E8E4DA',
                  padding: '64px 0', textAlign: 'center', color: '#aaa',
                }}
              >
                <Clock size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontWeight: 600, fontSize: 15 }}>No upcoming reminders</p>
                <p style={{ fontSize: 13, margin: '4px 0 0' }}>
                  Click "Add Reminder" to create one.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reminders.map((r) => {
                  const typeStyle = REMINDER_TYPE_COLORS[r.reminderType] ?? { bg: '#F0EDE4', color: '#1B2A4A' };
                  const isOverdue = new Date(r.scheduledAt) < new Date();
                  return (
                    <div
                      key={r.id}
                      style={{
                        background: '#fff', borderRadius: 12,
                        border: `1px solid ${isOverdue ? '#FECACA' : '#E8E4DA'}`,
                        padding: '16px 20px',
                        display: 'flex', alignItems: 'flex-start', gap: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: typeStyle.bg, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}
                      >
                        <Calendar size={18} color={typeStyle.color} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#1B2A4A' }}>
                            {r.title}
                          </p>
                          <span
                            style={{
                              fontSize: 11, fontWeight: 600, borderRadius: 5,
                              padding: '1px 7px', background: typeStyle.bg, color: typeStyle.color,
                            }}
                          >
                            {REMINDER_TYPE_LABELS[r.reminderType] ?? r.reminderType}
                          </span>
                          {isOverdue && (
                            <span
                              style={{
                                fontSize: 11, fontWeight: 600, borderRadius: 5,
                                padding: '1px 7px', background: '#FEF2F2', color: '#DC2626',
                              }}
                            >
                              Overdue
                            </span>
                          )}
                          {r.recurrence && r.recurrence !== 'ONCE' && (
                            <span
                              style={{
                                fontSize: 11, fontWeight: 600, borderRadius: 5,
                                padding: '1px 7px', background: '#EFF6FF', color: '#1D4ED8',
                              }}
                            >
                              {r.recurrence}
                            </span>
                          )}
                        </div>

                        {r.message && (
                          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>
                            {r.message}
                          </p>
                        )}

                        <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} />
                            {formatDateTime(r.scheduledAt)}
                          </span>
                          {r.contract && (
                            <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <FileText size={12} />
                              {r.contract.title}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteReminder(r.id)}
                        title="Delete reminder"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 6, borderRadius: 8, color: '#DC2626', flexShrink: 0,
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
