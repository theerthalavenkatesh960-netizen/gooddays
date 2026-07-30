import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Brain, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Zap, AlertTriangle, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContextApi';
import * as advisor from '../lib/healthAdvisorApi';
import type { QueryResponse, ProactiveInsight, ReasoningStep, NextAction } from '../lib/healthAdvisorApi';

// ── Local types ───────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  response?: QueryResponse;       // full structured response for assistant turns
  timestamp: Date;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReasoningPanel({ steps }: { steps: ReasoningStep[] }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  return (
    <div className="mt-2 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium press"
        style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
      >
        <Brain size={12} />
        Reasoning steps
        {open ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1" style={{ backgroundColor: 'var(--bg)' }}>
          {steps.map(s => (
            <div key={s.step} className="flex gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {s.step}
              </span>
              <span className="pt-0.5">{s.description}
                {s.confidence !== undefined && (
                  <span className="ml-1 opacity-60">({Math.round(s.confidence * 100)}%)</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NextActionsPanel({ actions }: { actions: NextAction[] }) {
  if (!actions.length) return null;
  const urgencyColor = (u: string) =>
    u === 'high' ? '#ef4444' : u === 'medium' ? '#f59e0b' : '#10b981';
  return (
    <div className="mt-2 space-y-1">
      {actions.map((a, i) => (
        <div
          key={i}
          className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ backgroundColor: 'var(--bg)', borderLeft: `3px solid ${urgencyColor(a.urgency)}` }}
        >
          <Zap size={11} className="mt-0.5 flex-shrink-0" style={{ color: urgencyColor(a.urgency) }} />
          <div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{a.action}</p>
            <p style={{ color: 'var(--text-muted)' }}>{a.reason}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedbackBar({
  conversationId,
  messageIndex,
}: {
  conversationId: string;
  messageIndex: number;
}) {
  const [voted, setVoted] = useState<boolean | null>(null);

  const vote = async (satisfied: boolean) => {
    setVoted(satisfied);
    try {
      await advisor.sendFeedback(conversationId, messageIndex, satisfied);
    } catch {
      // feedback is best-effort
    }
  };

  if (voted !== null) {
    return <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Thanks for the feedback!</p>;
  }

  return (
    <div className="flex gap-2 mt-2">
      <button onClick={() => vote(true)} className="p-1 rounded press" title="Helpful">
        <ThumbsUp size={13} style={{ color: 'var(--text-muted)' }} />
      </button>
      <button onClick={() => vote(false)} className="p-1 rounded press" title="Not helpful">
        <ThumbsDown size={13} style={{ color: 'var(--text-muted)' }} />
      </button>
    </div>
  );
}

function InsightCard({ insight }: { insight: ProactiveInsight }) {
  const urgencyColor = insight.urgency === 'high' ? '#ef4444' : insight.urgency === 'medium' ? '#f59e0b' : '#10b981';
  const Icon = insight.urgency === 'high' ? AlertTriangle : TrendingUp;
  return (
    <div
      className="p-3 rounded-xl border"
      style={{ borderColor: urgencyColor, backgroundColor: `${urgencyColor}10` }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color: urgencyColor }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{insight.title}</span>
      </div>
      <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{insight.description}</p>
      {insight.recommended_action && (
        <p className="text-xs font-medium" style={{ color: urgencyColor }}>→ {insight.recommended_action}</p>
      )}
    </div>
  );
}

// ── Suggestion chips ──────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Why haven\'t I lost weight this week?',
  'Should I work out today?',
  'What\'s affecting my energy levels?',
  'Am I on track with my goals?',
  'What should I eat today?',
  'How is my sleep impacting my progress?',
];

// ── Main component ────────────────────────────────────────────────────────────

export default function HealthAdvisor() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [insights, setInsights] = useState<ProactiveInsight[]>([]);
  const [insightsLoaded, setInsightsLoaded] = useState(false);
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Check service health on mount
  useEffect(() => {
    advisor.checkAiServiceHealth()
      .then(() => setServiceOnline(true))
      .catch(() => setServiceOnline(false));
  }, []);

  // Load proactive weekly insights
  useEffect(() => {
    if (!user || insightsLoaded) return;
    setInsightsLoaded(true);
    advisor.getWeeklyInsights(user.id)
      .then(res => setInsights(res.insights))
      .catch(() => {/* non-critical */});
  }, [user, insightsLoaded]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = useCallback(async (question: string) => {
    if (!user || !question.trim() || sending) return;
    setError('');
    setInput('');
    setSending(true);

    // Optimistic user bubble
    setMessages(prev => [...prev, { role: 'user', content: question, timestamp: new Date() }]);

    try {
      const res = await advisor.askHealthAdvisor(user.id, question, conversationId);
      setConversationId(res.conversation_id);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: res.answer, response: res, timestamp: new Date() },
      ]);
    } catch (e: any) {
      setError('Could not reach the AI service. Make sure it is running on port 8000.');
      // Remove optimistic bubble on failure
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  }, [user, conversationId, sending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="flex flex-col h-full max-h-screen" style={{ backgroundColor: 'var(--bg)' }}>

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Brain size={18} className="text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Health Advisor</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {serviceOnline === null && 'Connecting…'}
            {serviceOnline === true && 'AI service online · reads your logs'}
            {serviceOnline === false && '⚠ AI service offline — start it on port 8000'}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Proactive insights */}
        {insights.length > 0 && messages.length === 0 && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>THIS WEEK'S INSIGHTS</p>
            <div className="space-y-2">
              {insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
            </div>
          </div>
        )}

        {/* Empty state / suggestions */}
        {messages.length === 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>ASK ME ABOUT YOUR HEALTH</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-3 py-1.5 rounded-full text-xs border press"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--surface)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl w-full ${msg.role === 'user' ? 'ml-8' : 'mr-8'}`}>
              <div
                className="px-4 py-3 rounded-2xl"
                style={{
                  backgroundColor: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                  color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                }}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className="text-xs mt-1" style={{ color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.response && (
                    <span className="ml-2 capitalize opacity-70">· {msg.response.query_type}</span>
                  )}
                  {msg.response && (
                    <span className="ml-1 opacity-70">· {Math.round(msg.response.confidence * 100)}% confident</span>
                  )}
                </p>
              </div>

              {/* Reasoning + actions for assistant messages */}
              {msg.role === 'assistant' && msg.response && (
                <>
                  <ReasoningPanel steps={msg.response.reasoning_steps} />
                  <NextActionsPanel actions={msg.response.next_actions} />
                  {conversationId && (
                    <FeedbackBar conversationId={conversationId} messageIndex={idx} />
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }}>
              <div className="flex gap-1.5 items-center">
                {[0, 150, 300].map(delay => (
                  <div
                    key={delay}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: 'var(--accent)', animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t px-4 py-3 flex-shrink-0"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask anything about your health…"
            disabled={sending || serviceOnline === false}
            className="flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
              '--tw-ring-color': 'var(--accent)',
            } as React.CSSProperties}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending || serviceOnline === false}
            className="px-4 py-2.5 rounded-xl text-white press disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
