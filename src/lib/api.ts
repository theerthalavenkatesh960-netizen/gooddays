type User = { id: string; email: string; name?: string };
type Session = { access_token: string; user: User } | null;
type Task = { id: string; userId: string; title: string; description?: string; isCompleted: boolean; dueDate: string; createdAt: string; updatedAt: string };
type Expense = { id: string; userId: string; description: string; amount: number; category: string; date: string; createdAt: string };
// stored as logs referencing a template
type SelfCareActivity = { id: string; userId: string; date: string; templateId: string; completed: boolean; createdAt: string };
type ThesisEntry = { id: string; userId: string; title: string; content?: string; status?: string; date: string; createdAt: string; updatedAt: string };
type StudySession = { id: string; userId: string; durationMinutes: number; notes?: string; date: string; createdAt: string };

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

function getAuthHeader(): Record<string, string> {
  const session = getSession();
  return session ? { 'Authorization': `Bearer ${session.access_token}` } : {};
}

async function request(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...(opts.headers || {}) } });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

export async function signIn(email: string, password: string): Promise<Session> {
  const json = await request('auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) });
  const session = { access_token: json.token, user: json.user } as Session;
  localStorage.setItem('gd_session', JSON.stringify(session));
  return session;
}

export async function signUp(email: string, password: string, name?: string): Promise<Session> {
  const json = await request('auth/signup', { method: 'POST', body: JSON.stringify({ email, password, name }) });
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
  return request(`userprofiles/${id}`);
}

// Tasks
export async function getTasks(userId: string) {
  return request(`tasks/user/${userId}`);
}

export async function getTask(id: string) {
  return request(`tasks/${id}`);
}

export async function createTask(userId: string, title: string, description?: string, dueDate?: Date) {
  return request('tasks', { method: 'POST', body: JSON.stringify({ userId, title, description, dueDate }) });
}

export async function updateTask(id: string, title?: string, description?: string, isCompleted?: boolean, dueDate?: Date) {
  return request(`tasks/${id}`, { method: 'PUT', body: JSON.stringify({ title, description, isCompleted, dueDate }) });
}

export async function deleteTask(id: string) {
  return request(`tasks/${id}`, { method: 'DELETE' });
}

// Expenses
export async function getExpenses(userId: string) {
  return request(`expenses/user/${userId}`);
}

export async function getExpense(id: string) {
  return request(`expenses/${id}`);
}

export async function createExpense(userId: string, description: string, amount: number, category: string, date: Date) {
  return request('expenses', { method: 'POST', body: JSON.stringify({ userId, description, amount, category, date }) });
}

export async function updateExpense(id: string, description?: string, amount?: number, category?: string, date?: Date) {
  return request(`expenses/${id}`, { method: 'PUT', body: JSON.stringify({ description, amount, category, date }) });
}

export async function deleteExpense(id: string) {
  return request(`expenses/${id}`, { method: 'DELETE' });
}

// Self Care
export async function getSelfCareActivities(userId: string) {
  return request(`selfcare/user/${userId}`);
}

export async function getSelfCareActivity(id: string) {
  return request(`selfcare/${id}`);
}

// create a log entry; templateId should refer to a SelfCareTemplate record
export async function createSelfCareActivity(userId: string, date: Date, templateId: string, completed = false) {
  return request('selfcare', { method: 'POST', body: JSON.stringify({ userId, date, templateId, completed }) });
}

export async function updateSelfCareActivity(id: string, date?: Date, templateId?: string, completed?: boolean) {
  return request(`selfcare/${id}`, { method: 'PUT', body: JSON.stringify({ date, templateId, completed }) });
}

export async function deleteSelfCareActivity(id: string) {
  return request(`selfcare/${id}`, { method: 'DELETE' });
}

// Thesis
export async function getThesisEntries(userId: string) {
  return request(`thesis/user/${userId}`);
}

export async function getThesisEntry(id: string) {
  return request(`thesis/${id}`);
}

export async function createThesisEntry(userId: string, title: string, content?: string, status?: string, date?: Date) {
  return request('thesis', { method: 'POST', body: JSON.stringify({ userId, title, content, status, date }) });
}

export async function updateThesisEntry(id: string, title?: string, content?: string, status?: string, date?: Date) {
  return request(`thesis/${id}`, { method: 'PUT', body: JSON.stringify({ title, content, status, date }) });
}

export async function deleteThesisEntry(id: string) {
  return request(`thesis/${id}`, { method: 'DELETE' });
}

// Study Sessions
export async function getStudySessions(userId: string) {
  return request(`study/user/${userId}`);
}

export async function getStudySession(id: string) {
  return request(`study/${id}`);
}

export async function createStudySession(userId: string, durationMinutes: number, notes?: string, date?: Date) {
  return request('study', { method: 'POST', body: JSON.stringify({ userId, durationMinutes, notes, date }) });
}

export async function updateStudySession(id: string, durationMinutes?: number, notes?: string, date?: Date) {
  return request(`study/${id}`, { method: 'PUT', body: JSON.stringify({ durationMinutes, notes, date }) });
}

export async function deleteStudySession(id: string) {
  return request(`study/${id}`, { method: 'DELETE' });
}

// Gamification
export async function getGamification(userId: string) {
  return request(`gamification/user/${userId}`);
}

export async function getUserPoints(userId: string) {
  return request(`gamification/points/${userId}`);
}

export async function addPoints(userId: string, activityType: string, points: number) {
  return request('gamification', { method: 'POST', body: JSON.stringify({ userId, activityType, points }) });
}

// Backward-compatible named `api` wrapper
export const api = {
  signIn,
  signUp,
  signOut,
  getSession,
  getProfile,
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getSelfCareActivities,
  getSelfCareActivity,
  createSelfCareActivity,
  updateSelfCareActivity,
  deleteSelfCareActivity,
  getThesisEntries,
  getThesisEntry,
  createThesisEntry,
  updateThesisEntry,
  deleteThesisEntry,
  getStudySessions,
  getStudySession,
  createStudySession,
  updateStudySession,
  deleteStudySession,
  getGamification,
  getUserPoints,
  addPoints,
};
export type { User, Session, Task, Expense, SelfCareActivity, ThesisEntry, StudySession };
