'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Citation {
  contractId: string;
  contractTitle: string;
  chunkText: string;
  score: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[] | null;
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string;
  scope: string;
  contractId?: string | null;
  contract?: { id: string; title: string } | null;
  messages?: ChatMessage[];
  updatedAt: string;
  _count?: { messages: number };
}

// ─── Brand constants ──────────────────────────────────────────────────────────

const NAVY = '#1B2A4A';
const GOLD = '#C5A55A';
const BG = '#F7F5F0';
const LIGHT_GOLD = '#EDE5CC';
const BORDER = '#D4C8A8';

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CitationChip({ citation, idx }: { citation: Citation; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round(citation.score * 100);

  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        background: BG,
        marginBottom: 6,
        overflow: 'hidden',
        fontSize: 12,
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Source badge */}
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: NAVY,
            background: LIGHT_GOLD,
            borderRadius: 4,
            padding: '2px 6px',
            whiteSpace: 'nowrap',
          }}
        >
          [{idx + 1}]
        </span>
        <span style={{ flex: 1, color: NAVY, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {citation.contractTitle}
        </span>
        {/* Score bar */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: pct >= 70 ? '#1e7e34' : pct >= 40 ? '#b07a00' : '#666',
            fontWeight: 600,
            fontSize: 11,
            whiteSpace: 'nowrap',
          }}
        >
          {pct}% match
        </span>
        <span style={{ color: '#888', fontSize: 11 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div
          style={{
            borderTop: `1px solid ${BORDER}`,
            padding: '8px 10px',
            color: '#444',
            lineHeight: 1.5,
            fontSize: 12,
            background: '#FEFDFB',
            whiteSpace: 'pre-wrap',
          }}
        >
          {citation.chunkText}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const citations: Citation[] = Array.isArray(message.citations) ? message.citations : [];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 20,
      }}
    >
      {/* Role label */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: isUser ? GOLD : NAVY,
          marginBottom: 4,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {isUser ? 'You' : 'Legal Assistant'}
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: '78%',
          padding: '12px 16px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
          background: isUser ? NAVY : '#FFFFFF',
          color: isUser ? '#FFFFFF' : '#222',
          fontSize: 14,
          lineHeight: 1.65,
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.content}
      </div>

      {/* Timestamp */}
      <div style={{ fontSize: 11, color: '#AAA', marginTop: 4 }}>
        {formatTime(message.createdAt)}
      </div>

      {/* Citations */}
      {!isUser && citations.length > 0 && (
        <div style={{ maxWidth: '78%', width: '100%', marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4, letterSpacing: '0.04em' }}>
            SOURCES ({citations.length})
          </div>
          {citations.map((c, i) => (
            <CitationChip key={`${c.contractId}-${c.chunkText.slice(0, 20)}-${i}`} citation={c} idx={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load sessions on mount
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await apiClient.get('/chat/sessions');
      setSessions(res.data);
    } catch {
      // handled by interceptor
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  // Load session messages when active session changes
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const res = await apiClient.get(`/chat/sessions/${sessionId}`);
      setActiveSession(res.data);
      setMessages(res.data.messages ?? []);
    } catch {
      setError('Failed to load session.');
    }
  }, []);

  const handleSelectSession = (session: ChatSession) => {
    setError(null);
    setQuestion('');
    void loadSession(session.id);
  };

  const handleNewChat = async () => {
    setError(null);
    try {
      const res = await apiClient.post('/chat/sessions', {
        title: 'New Chat',
        scope: 'REPOSITORY',
      });
      const newSession: ChatSession = res.data;
      setSessions((prev) => [newSession, ...prev]);
      setActiveSession(newSession);
      setMessages([]);
      setQuestion('');
      inputRef.current?.focus();
    } catch {
      setError('Failed to create a new chat session.');
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/chat/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch {
      setError('Failed to delete session.');
    }
  };

  const handleSend = async () => {
    const q = question.trim();
    if (!q || !activeSession || loading) return;

    setError(null);
    setLoading(true);
    setQuestion('');

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: q,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await apiClient.post(`/chat/sessions/${activeSession.id}/message`, {
        question: q,
      });

      const { answer, citations } = res.data as { answer: string; citations: Citation[] };

      // Replace the optimistic message with confirmed messages
      const confirmedUserMsg: ChatMessage = {
        ...tempUserMsg,
        id: `user-confirmed-${Date.now()}`,
      };

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: answer,
        citations: citations,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        confirmedUserMsg,
        assistantMsg,
      ]);

      // Update session in sidebar with latest timestamp
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, updatedAt: new Date().toISOString(), _count: { messages: (s._count?.messages ?? 0) + 2 } }
            : s,
        ),
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      setError('Failed to get a response. Please try again.');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: BG,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: 260,
          minWidth: 220,
          background: NAVY,
          display: 'flex',
          flexDirection: 'column',
          borderRight: `1px solid rgba(255,255,255,0.08)`,
          flexShrink: 0,
        }}
      >
        {/* Sidebar header */}
        <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: GOLD,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                fontWeight: 700,
                color: NAVY,
                flexShrink: 0,
              }}
            >
              M
            </div>
            <div>
              <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Legal RAG</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Contract AI Assistant</div>
            </div>
          </div>

          <button
            onClick={() => void handleNewChat()}
            style={{
              width: '100%',
              padding: '9px 14px',
              background: GOLD,
              border: 'none',
              borderRadius: 8,
              color: NAVY,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              letterSpacing: '0.02em',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            New Chat
          </button>
        </div>

        {/* Session list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          {sessionsLoading ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
              No conversations yet.
              <br />
              Click &ldquo;New Chat&rdquo; to start.
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = activeSession?.id === session.id;
              return (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '10px 10px',
                    marginBottom: 4,
                    borderRadius: 8,
                    background: isActive ? 'rgba(197,165,90,0.18)' : 'transparent',
                    border: isActive ? `1px solid rgba(197,165,90,0.35)` : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div
                      style={{
                        color: isActive ? GOLD : 'rgba(255,255,255,0.85)',
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: 3,
                      }}
                    >
                      {session.title}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: 10,
                          color: 'rgba(255,255,255,0.35)',
                          background: 'rgba(255,255,255,0.07)',
                          borderRadius: 4,
                          padding: '1px 5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {session.scope}
                      </span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                        {formatDate(session.updatedAt)}
                      </span>
                    </div>
                    {session.contract && (
                      <div
                        style={{
                          fontSize: 10,
                          color: 'rgba(197,165,90,0.7)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: 2,
                        }}
                      >
                        {session.contract.title}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => void handleDeleteSession(e, session.id)}
                    title="Delete session"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.25)',
                      padding: '2px 4px',
                      borderRadius: 4,
                      fontSize: 14,
                      lineHeight: 1,
                      flexShrink: 0,
                      marginLeft: 4,
                    }}
                    onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ff6b6b'; }}
                    onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)'; }}
                  >
                    ×
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.3)',
            fontSize: 11,
            textAlign: 'center',
          }}
        >
          Mithaqyn RAG v15 &middot; Answers from your contracts
        </div>
      </aside>

      {/* ── Main Chat Area ────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeSession ? (
          <>
            {/* Chat header */}
            <header
              style={{
                padding: '16px 24px',
                background: '#FFFFFF',
                borderBottom: `1px solid ${BORDER}`,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#22c55e',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeSession.title}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>
                  {activeSession.scope === 'CONTRACT' && activeSession.contract
                    ? `Scoped to: ${activeSession.contract.title}`
                    : 'Searching across all contracts'}
                </div>
              </div>

              {/* Scope badge */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  background: activeSession.scope === 'CONTRACT' ? LIGHT_GOLD : '#E8F4E8',
                  color: activeSession.scope === 'CONTRACT' ? '#7a5f1a' : '#1a5c1a',
                  borderRadius: 6,
                  padding: '3px 10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  flexShrink: 0,
                }}
              >
                {activeSession.scope}
              </span>
            </header>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                background: BG,
              }}
            >
              {messages.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: 16,
                    color: '#AAA',
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: LIGHT_GOLD,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                    }}
                  >
                    ⚖️
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                      Ask anything about your contracts
                    </div>
                    <div style={{ fontSize: 13 }}>
                      Try: &ldquo;What are the payment terms?&rdquo; or &ldquo;Summarize the termination clauses&rdquo;
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}

                  {/* Loading indicator */}
                  {loading && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: NAVY, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Legal Assistant
                      </div>
                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: '4px 16px 16px 16px',
                          background: '#FFFFFF',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                          display: 'flex',
                          gap: 6,
                          alignItems: 'center',
                        }}
                      >
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: GOLD,
                              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div
                style={{
                  padding: '10px 24px',
                  background: '#FFF0F0',
                  borderTop: '1px solid #FFCDD2',
                  color: '#c62828',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c62828', fontSize: 16, padding: '0 4px' }}
                >
                  ×
                </button>
              </div>
            )}

            {/* Input area */}
            <div
              style={{
                padding: '16px 24px',
                background: '#FFFFFF',
                borderTop: `1px solid ${BORDER}`,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-end',
                  background: BG,
                  border: `2px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: '10px 14px',
                  transition: 'border-color 0.15s',
                }}
                onFocus={() => {}}
              >
                <textarea
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your contracts… (Enter to send, Shift+Enter for new line)"
                  rows={1}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: '#222',
                    maxHeight: 150,
                    overflowY: 'auto',
                  }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
                  }}
                  disabled={loading}
                />

                <button
                  onClick={() => void handleSend()}
                  disabled={!question.trim() || loading}
                  style={{
                    flexShrink: 0,
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: !question.trim() || loading ? '#DDD' : NAVY,
                    border: 'none',
                    cursor: !question.trim() || loading ? 'not-allowed' : 'pointer',
                    color: '#FFFFFF',
                    fontSize: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                  title="Send (Enter)"
                >
                  &#8593;
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: '#AAA' }}>
                  Powered by semantic search + AI
                </span>
                <span style={{ fontSize: 11, color: '#AAA' }}>
                  Enter to send &middot; Shift+Enter for new line
                </span>
              </div>
            </div>
          </>
        ) : (
          /* Empty state — no session selected */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: BG,
              gap: 24,
              padding: 40,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: NAVY,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
              }}
            >
              ⚖️
            </div>

            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: NAVY, marginBottom: 10 }}>
                Legal RAG Assistant
              </h1>
              <p style={{ fontSize: 14, color: '#666', maxWidth: 420, lineHeight: 1.7, margin: '0 auto 24px' }}>
                Ask natural-language questions about your contracts. The assistant searches semantically
                across your contract repository and answers using only verified contract text.
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  marginBottom: 32,
                }}
              >
                {[
                  'What are the payment terms?',
                  'Summarize termination clauses',
                  'Which contracts expire this year?',
                  'Are there any auto-renewal clauses?',
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => void (async () => {
                      await handleNewChat();
                      setQuestion(example);
                    })()}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 20,
                      border: `1px solid ${BORDER}`,
                      background: '#FFFFFF',
                      color: NAVY,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = GOLD;
                      (e.currentTarget as HTMLButtonElement).style.background = LIGHT_GOLD;
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER;
                      (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF';
                    }}
                  >
                    {example}
                  </button>
                ))}
              </div>

              <button
                onClick={() => void handleNewChat()}
                style={{
                  padding: '12px 28px',
                  background: NAVY,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>+</span>
                Start a New Chat
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Pulse animation keyframes injected inline */}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
