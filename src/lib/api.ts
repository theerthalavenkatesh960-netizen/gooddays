type User = { id: number; email: string; name?: string };
type Session = { access_token: string; user: User } | null;
type Task = {
  id: number;
  userId: number;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  dueDate?: string;
  recurring?: boolean;
  recurrenceInterval?: number;
  recurrenceUnit?: string;
  recurrenceId?: number;
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
  recurrenceDays?: string[]; // array of weekday names or values
  status?: string;
  isCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
};
type Expense = { id: number; userId: number; description: string; amount: number; category: string; date: string; createdAt: string };
// stored as logs referencing a template
type SelfCareActivity = { id: number; userId: number; date: string; templateId: number; completed: boolean; createdAt: string };
type StudySession = { id: number; userId: number; durationMinutes: number; notes?: string; date: string; createdAt: string };

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

export async function getProfile(id: number) {
  return request(`userprofiles/${id}`);
}

// Tasks
export async function getTasks(userId: number) {
  return request(`tasks/user/${userId}`);
}

export async function getTask(id: number) {
  return request(`tasks/${id}`);
}

export interface CreateTaskParams {
  userId: number;
  title: string;
  category?: string;
  priority?: string;
  dueDate?: Date;
  recurring?: boolean;
  recurrenceInterval?: number;
  recurrenceUnit?: 'days' | 'weeks' | 'months' | 'years';
  recurrenceStartDate?: Date;
  recurrenceEndDate?: Date;
  recurrenceDays?: string[];
  status?: string;
}

export async function createTask(params: CreateTaskParams) {
  // recurrenceDays is already an array, backend expects string[]
  const body: any = { ...params };
  if (body.dueDate) body.dueDate = (body.dueDate as Date).toISOString();
  if (body.recurrenceStartDate) body.recurrenceStartDate = (body.recurrenceStartDate as Date).toISOString();
  if (body.recurrenceEndDate) body.recurrenceEndDate = (body.recurrenceEndDate as Date).toISOString();
  return request('tasks', { method: 'POST', body: JSON.stringify(body) });
}

export interface UpdateTaskParams {
  title?: string;
  category?: string;
  priority?: string;
  dueDate?: Date;
  recurring?: boolean;
  recurrenceInterval?: number;
  recurrenceUnit?: 'days' | 'weeks' | 'months' | 'years';
  recurrenceStartDate?: Date;
  recurrenceEndDate?: Date;
  recurrenceDays?: string[];
  status?: string;
  completedAt?: Date;
  isCompleted?: boolean;
}

export async function updateTask(id: number, params: UpdateTaskParams) {
  const body: any = { ...params };
  if (body.dueDate) body.dueDate = (body.dueDate as Date).toISOString();
  if (body.recurrenceStartDate) body.recurrenceStartDate = (body.recurrenceStartDate as Date).toISOString();
  if (body.recurrenceEndDate) body.recurrenceEndDate = (body.recurrenceEndDate as Date).toISOString();
  if (body.completedAt) body.completedAt = (body.completedAt as Date).toISOString();
  return request(`tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteTask(id: number, deleteMode: 'this' | 'series' = 'this') {
  const queryParam = deleteMode === 'series' ? '?deleteMode=series' : '';
  return request(`tasks/${id}${queryParam}`, { method: 'DELETE' });
}

// Expenses
export async function getExpenses(userId: number) {
  return request(`expenses/user/${userId}`);
}

export async function getExpense(id: number) {
  return request(`expenses/${id}`);
}

export async function createExpense(userId: number, description: string, amount: number, category: string, date?: Date) {
  const body: any = { userId, description, amount, category };
  if (date) body.date = date.toISOString();
  return request('expenses', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateExpense(id: number, description?: string, amount?: number, category?: string, date?: Date) {
  const body: any = { description, amount, category };
  if (date) body.date = date.toISOString();
  return request(`expenses/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteExpense(id: number) {
  return request(`expenses/${id}`, { method: 'DELETE' });
}

// Self Care
export async function getSelfCareActivities(userId: number) {
  return request(`selfcare/user/${userId}`);
}

export async function getSelfCareActivity(id: number) {
  return request(`selfcare/${id}`);
}

// create a log entry; templateId should refer to a SelfCareTemplate record
export async function createSelfCareActivity(userId: number, date: Date, templateId: number, completed = false) {
  const body: any = { userId, templateId, completed };
  if (date) body.date = date.toISOString();
  return request('selfcare', { method: 'POST', body: JSON.stringify(body) });
}

// Self care templates
export type SelfCareTemplate = {
  id: number;
  userId: number;
  category: string;
  item: string;
  order_index: number;
  createdAt: string;
};

export async function getSelfCareTemplates(userId: number) {
  return request(`selfcaretemplate/user/${userId}`);
}

export async function createSelfCareTemplate(userId: number, category: string, item: string, order_index: number) {
  return request('selfcaretemplate', {
    method: 'POST',
    body: JSON.stringify({ userId, category, item, order_index }),
  });
}

export async function deleteSelfCareTemplate(id: number) {
  return request(`selfcaretemplate/${id}`, { method: 'DELETE' });
}

export async function updateSelfCareActivity(id: number, date?: Date, templateId?: number, completed?: boolean) {
  const body: any = { templateId, completed };
  if (date) body.date = date.toISOString();
  return request(`selfcare/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteSelfCareActivity(id: number) {
  return request(`selfcare/${id}`, { method: 'DELETE' });
}

// Daily tracking (sleep/workout/phone/sunlight/mood)
export type DailyTracking = {
  id: number;
  userId: number;
  date: string;
  sleep_hours: number;
  workout_minutes: number;
  phone_minutes: number;
  sunlight: boolean;
  mood: number;
  createdAt: string;
};

export async function getDailyTracking(userId: number, date: string) {
  // fetch record for given date
  return request(`dailytracking/user/${userId}?date=${date}`);
}

export async function saveDailyTracking(
  userId: number,
  date: string,
  sleep_hours: number,
  workout_minutes: number,
  phone_minutes: number,
  sunlight: boolean,
  mood: number
) {
  return request(`dailytracking`, {
    method: 'POST',
    body: JSON.stringify({ userId, date, sleep_hours, workout_minutes, phone_minutes, sunlight, mood }),
  });
}

// we no longer use the simple "ThesisEntry" concept; all operations go through
// the patients/protocols API. helpers below (getPatients, etc.) are the
// canonical functions. the old helpers have been removed to avoid confusion.

// Advanced Thesis API (protocol, patients, followups, documents, deadlines)
export async function getThesisProtocol(userId: number) {
  return request(`thesis/protocol/user/${userId}`);
}

export async function createProtocol(body: any) {
  return request('thesis/protocol', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateProtocol(id: number, body: any) {
  return request(`thesis/protocol/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function getPatients(userId: number) {
  return request(`thesis/patients/user/${userId}`);
}

export async function createPatient(body: any) {
  return request('thesis/patients', { method: 'POST', body: JSON.stringify(body) });
}

export async function updatePatient(id: number, body: any) {
  return request(`thesis/patients/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deletePatient(id: number) {
  return request(`thesis/patients/${id}`, { method: 'DELETE' });
}

export async function getFollowups(patientId: number) {
  return request(`thesis/followups/patient/${patientId}`);
}

export async function createFollowup(body: any) {
  return request('thesis/followups', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateFollowup(id: number, body: any) {
  return request(`thesis/followups/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteFollowup(id: number) {
  return request(`thesis/followups/${id}`, { method: 'DELETE' });
}

// multipart helper for file uploads
async function requestMultipart(path: string, form: FormData, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/${path}`, { method: opts.method || 'POST', body: form, headers: { ...(getAuthHeader() || {}), ...(opts.headers || {}) } });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

export async function uploadDocument(userId: number, file: File, category: string) {
  const form = new FormData();
  form.append('userId', userId.toString());
  form.append('category', category);
  form.append('file', file);
  return requestMultipart('thesis/documents/upload', form);
}

export async function getDocuments(userId: number) {
  return request(`thesis/documents/user/${userId}`);
}

export async function getDeadlines(userId: number) {
  return request(`thesis/deadlines/user/${userId}`);
}

export async function createDeadline(body: any) {
  return request('thesis/deadlines', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateDeadline(id: number, body: any) {
  return request(`thesis/deadlines/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteDeadline(id: number) {
  return request(`thesis/deadlines/${id}`, { method: 'DELETE' });
}

export async function getThesisStats(userId: number) {
  return request(`thesis/stats/${userId}`);
}

export async function exportPatientsCsv(userId: number) {
  return request(`thesis/stats/export/patients/${userId}`);
}

export async function exportStatsCsv(userId: number) {
  return request(`thesis/stats/export/stats/${userId}`);
}

// Study Sessions
export async function getStudySessions(userId: number) {
  return request(`study/user/${userId}`);
}

export async function getStudySession(id: number) {
  return request(`study/${id}`);
}

export async function createStudySession(userId: number, durationMinutes: number, notes?: string, date?: Date) {
  const body: any = { userId, durationMinutes, notes };
  if (date) body.date = date.toISOString();
  return request('study', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateStudySession(id: number, durationMinutes?: number, notes?: string, date?: Date) {
  const body: any = { durationMinutes, notes };
  if (date) body.date = date.toISOString();
  return request(`study/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteStudySession(id: number) {
  return request(`study/${id}`, { method: 'DELETE' });
}

// Gamification
export async function getGamification(userId: number) {
  return request(`gamification/user/${userId}`);
}

export async function getUserPoints(userId: number) {
  return request(`gamification/points/${userId}`);
}

export async function addPoints(userId: number, activityType: string, points: number) {
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
  getStudySessions,
  getStudySession,
  createStudySession,
  updateStudySession,
  deleteStudySession,
  getGamification,
  getUserPoints,
  addPoints,
};
export type { User, Session, Task, Expense, SelfCareActivity, StudySession };
export type { DailyTracking };
export type { SelfCareTemplate };
