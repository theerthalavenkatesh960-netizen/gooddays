type User = { id: string; email: string; name?: string };
type Session = { access_token: string; user: User } | null;
type Task = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  dueDate?: string;
  recurring?: boolean;
  recurrenceInterval?: number;
  recurrenceUnit?: string;
  recurrenceId?: string;
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
  recurrenceDays?: string[]; // array of weekday names or values
  status?: string;
  isCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
};
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

export interface CreateTaskParams {
  userId: string;
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

export async function updateTask(id: string, params: UpdateTaskParams) {
  const body: any = { ...params };
  if (body.dueDate) body.dueDate = (body.dueDate as Date).toISOString();
  if (body.recurrenceStartDate) body.recurrenceStartDate = (body.recurrenceStartDate as Date).toISOString();
  if (body.recurrenceEndDate) body.recurrenceEndDate = (body.recurrenceEndDate as Date).toISOString();
  if (body.completedAt) body.completedAt = (body.completedAt as Date).toISOString();
  return request(`tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteTask(id: string, deleteMode: 'this' | 'series' = 'this') {
  const queryParam = deleteMode === 'series' ? '?deleteMode=series' : '';
  return request(`tasks/${id}${queryParam}`, { method: 'DELETE' });
}

// Expenses
export async function getExpenses(userId: string) {
  return request(`expenses/user/${userId}`);
}

export async function getExpense(id: string) {
  return request(`expenses/${id}`);
}

export async function createExpense(userId: string, description: string, amount: number, category: string, date?: Date) {
  const body: any = { userId, description, amount, category };
  if (date) body.date = date.toISOString();
  return request('expenses', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateExpense(id: string, description?: string, amount?: number, category?: string, date?: Date) {
  const body: any = { description, amount, category };
  if (date) body.date = date.toISOString();
  return request(`expenses/${id}`, { method: 'PUT', body: JSON.stringify(body) });
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
  const body: any = { userId, templateId, completed };
  if (date) body.date = date.toISOString();
  return request('selfcare', { method: 'POST', body: JSON.stringify(body) });
}

// Self care templates
export type SelfCareTemplate = {
  id: string;
  userId: string;
  category: string;
  item: string;
  order_index: number;
  createdAt: string;
};

export async function getSelfCareTemplates(userId: string) {
  return request(`selfcaretemplate/user/${userId}`);
}

export async function createSelfCareTemplate(userId: string, category: string, item: string, order_index: number) {
  return request('selfcaretemplate', {
    method: 'POST',
    body: JSON.stringify({ userId, category, item, order_index }),
  });
}

export async function deleteSelfCareTemplate(id: string) {
  return request(`selfcaretemplate/${id}`, { method: 'DELETE' });
}

export async function updateSelfCareActivity(id: string, date?: Date, templateId?: string, completed?: boolean) {
  const body: any = { templateId, completed };
  if (date) body.date = date.toISOString();
  return request(`selfcare/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteSelfCareActivity(id: string) {
  return request(`selfcare/${id}`, { method: 'DELETE' });
}

// Daily tracking (sleep/workout/phone/sunlight/mood)
export type DailyTracking = {
  id: string;
  userId: string;
  date: string;
  sleep_hours: number;
  workout_minutes: number;
  phone_minutes: number;
  sunlight: boolean;
  mood: number;
  createdAt: string;
};

export async function getDailyTracking(userId: string, date: string) {
  // fetch record for given date
  return request(`dailytracking/user/${userId}?date=${date}`);
}

export async function saveDailyTracking(
  userId: string,
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

// Thesis
export async function getThesisEntries(userId: string) {
  return request(`thesis/user/${userId}`);
}

export async function getThesisEntry(id: string) {
  return request(`thesis/${id}`);
}

export async function createThesisEntry(userId: string, title: string, content?: string, status?: string, date?: Date) {
  const body: any = { userId, title, content, status };
  if (date) body.date = date.toISOString();
  return request('thesis', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateThesisEntry(id: string, title?: string, content?: string, status?: string, date?: Date) {
  const body: any = { title, content, status };
  if (date) body.date = date.toISOString();
  return request(`thesis/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteThesisEntry(id: string) {
  return request(`thesis/${id}`, { method: 'DELETE' });
}

// Advanced Thesis API (protocol, patients, followups, documents, deadlines)
export async function getThesisProtocol(userId: string) {
  return request(`thesis/protocol/user/${userId}`);
}

export async function createProtocol(body: any) {
  return request('thesis/protocol', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateProtocol(id: string, body: any) {
  return request(`thesis/protocol/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function getPatients(userId: string) {
  return request(`thesis/patients/user/${userId}`);
}

export async function createPatient(body: any) {
  return request('thesis/patients', { method: 'POST', body: JSON.stringify(body) });
}

export async function updatePatient(id: string, body: any) {
  return request(`thesis/patients/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deletePatient(id: string) {
  return request(`thesis/patients/${id}`, { method: 'DELETE' });
}

export async function getFollowups(patientId: string) {
  return request(`thesis/followups/patient/${patientId}`);
}

export async function createFollowup(body: any) {
  return request('thesis/followups', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateFollowup(id: string, body: any) {
  return request(`thesis/followups/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteFollowup(id: string) {
  return request(`thesis/followups/${id}`, { method: 'DELETE' });
}

// multipart helper for file uploads
async function requestMultipart(path: string, form: FormData, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/${path}`, { method: opts.method || 'POST', body: form, headers: { ...(getAuthHeader() || {}), ...(opts.headers || {}) } });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

export async function uploadDocument(userId: string, file: File, category: string) {
  const form = new FormData();
  form.append('userId', userId);
  form.append('category', category);
  form.append('file', file);
  return requestMultipart('thesis/documents/upload', form);
}

export async function getDocuments(userId: string) {
  return request(`thesis/documents/user/${userId}`);
}

export async function getDeadlines(userId: string) {
  return request(`thesis/deadlines/user/${userId}`);
}

export async function createDeadline(body: any) {
  return request('thesis/deadlines', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateDeadline(id: string, body: any) {
  return request(`thesis/deadlines/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteDeadline(id: string) {
  return request(`thesis/deadlines/${id}`, { method: 'DELETE' });
}

export async function getThesisStats(userId: string) {
  return request(`thesis/stats/user/${userId}`);
}

export async function exportPatientsCsv(userId: string) {
  return request(`thesis/export/patients/${userId}`);
}

export async function exportStatsCsv(userId: string) {
  return request(`thesis/export/stats/${userId}`);
}

// Study Sessions
export async function getStudySessions(userId: string) {
  return request(`study/user/${userId}`);
}

export async function getStudySession(id: string) {
  return request(`study/${id}`);
}

export async function createStudySession(userId: string, durationMinutes: number, notes?: string, date?: Date) {
  const body: any = { userId, durationMinutes, notes };
  if (date) body.date = date.toISOString();
  return request('study', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateStudySession(id: string, durationMinutes?: number, notes?: string, date?: Date) {
  const body: any = { durationMinutes, notes };
  if (date) body.date = date.toISOString();
  return request(`study/${id}`, { method: 'PUT', body: JSON.stringify(body) });
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
export type { DailyTracking };
export type { SelfCareTemplate };
