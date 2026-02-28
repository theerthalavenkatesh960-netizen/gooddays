type User = { id: string; email: string; name?: string };
type Session = { access_token: string; user: User } | null;

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

async function request(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/${path}`, opts);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

export async function signIn(email: string, password: string): Promise<Session> {
  const json = await request('auth/signin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const session = { access_token: json.token, user: json.user } as Session;
  localStorage.setItem('gd_session', JSON.stringify(session));
  return session;
}

export async function signUp(email: string, password: string, name?: string): Promise<Session> {
  const json = await request('auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name }) });
  const session = { access_token: json.token, user: json.user } as Session;
  localStorage.setItem('gd_session', JSON.stringify(session));
  return session;
}

export function signOut(): Promise<void> {
  localStorage.removeItem('gd_session');
  return Promise.resolve();
}

export function getSession(): Session {
  const raw = localStorage.getItem('gd_session');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function getProfile(id: string) {
  const json = await request(`userprofiles/${id}`);
  return json;
}

export type { User, Session };
