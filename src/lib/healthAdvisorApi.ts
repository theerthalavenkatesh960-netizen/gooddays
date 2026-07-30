/**
 * Health Advisor API client
 * Talks directly to the Python FastAPI AI service (not the C# backend).
 * Base URL is configured via VITE_AI_SERVICE_URL env var.
 */

const AI_BASE = ((import.meta as any).env?.VITE_AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DataCitation {
  date?: string;
  metric: string;
  value: string | number;
  note?: string;
}

export interface ReasoningStep {
  step: number;
  description: string;
  confidence?: number;
}

export interface NextAction {
  action: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface QueryResponse {
  conversation_id: string;
  answer: string;
  reasoning_steps: ReasoningStep[];
  data_citations: DataCitation[];
  next_actions: NextAction[];
  confidence: number;
  query_type: 'analytical' | 'prescriptive' | 'predictive';
}

export interface ProactiveInsight {
  type: string;
  title: string;
  description: string;
  supporting_data: DataCitation[];
  recommended_action?: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface WeeklyInsightsResponse {
  user_id: number;
  week_start: string;
  insights: ProactiveInsight[];
  auto_recommendations: Record<string, unknown>;
}

// ── Requests ──────────────────────────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${AI_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `AI service error ${res.status}`);
  }
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${AI_BASE}${path}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `AI service error ${res.status}`);
  }
  return res.json();
}

// ── API ───────────────────────────────────────────────────────────────────────

export function askHealthAdvisor(
  userId: number,
  question: string,
  conversationId?: string,
): Promise<QueryResponse> {
  return post('/api/advisor/query', { user_id: userId, question, conversation_id: conversationId });
}

export function getWeeklyInsights(userId: number): Promise<WeeklyInsightsResponse> {
  return get(`/api/advisor/insights/weekly?user_id=${userId}`);
}

export function sendFeedback(
  conversationId: string,
  messageIndex: number,
  satisfied: boolean,
  comment?: string,
): Promise<void> {
  return post('/api/advisor/feedback', { conversation_id: conversationId, message_index: messageIndex, satisfied, comment });
}

export function checkAiServiceHealth(): Promise<{ status: string; provider: string }> {
  return get('/health');
}
