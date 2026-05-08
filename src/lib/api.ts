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

const API_BASE = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// ─── Dummy Data Flag (Toggle between dummy and real API) ────────────────────
export const USE_DUMMY_DATA = true; // Set to false to use real API endpoints
// ───────────────────────────────────────────────────────────────────────────

function getAuthHeader(): Record<string, string> {
  const session = getSession();
  return session ? { 'Authorization': `Bearer ${session.access_token}` } : {};
}

// Loading bridge — components subscribe via setLoadingHandler
let _loadingCount = 0;
let _onLoadingChange: ((active: boolean) => void) | null = null;
export function setLoadingHandler(fn: (active: boolean) => void) { _onLoadingChange = fn; }
function pushLoad() { _loadingCount++; if (_loadingCount === 1) _onLoadingChange?.(true); }
function popLoad() { _loadingCount = Math.max(0, _loadingCount - 1); if (_loadingCount === 0) _onLoadingChange?.(false); }

async function request(path: string, opts: RequestInit = {}) {
  pushLoad();
  try {
    const res = await fetch(`${API_BASE}/api/${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...(opts.headers || {}) } });
    const text = await res.text();
    let payload: any = text;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    if (!res.ok) throw new Error(resolveErrorMessage(payload, `Request failed (${res.status})`));
    return payload;
  } finally {
    popLoad();
  }
}

function resolveErrorMessage(payload: any, fallback: string): string {
  if (typeof payload === 'string' && payload.trim().length > 0) return payload;
  if (payload && typeof payload.message === 'string' && payload.message.trim().length > 0) return payload.message;
  if (payload && typeof payload.error === 'string' && payload.error.trim().length > 0) return payload.error;
  return fallback;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const json = await request('auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (!json?.token || !json?.user) {
    throw new Error(resolveErrorMessage(json, 'Invalid email or password'));
  }
  const session = { access_token: json.token, user: json.user } as Session;
  localStorage.setItem('gd_session', JSON.stringify(session));
  return session;
}

export async function signUp(email: string, password: string, name?: string): Promise<Session> {
  const json = await request('auth/signup', { method: 'POST', body: JSON.stringify({ email, password, name }) });
  if (!json?.token || !json?.user) {
    throw new Error(resolveErrorMessage(json, 'Failed to sign up'));
  }
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
  sleepHours: number;
  workoutMinutes: number;
  phoneMinutes: number;
  sunlight: boolean;
  mood: number;
  note?: string;
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
  mood: number,
  note?: string,
  waterCups?: number,
  waterGoalCups?: number
) {
  // Convert date string (yyyy-MM-dd) to ISO DateTime
  const dateObj = new Date(date);
  const payload: any = {
    userId,
    date: dateObj.toISOString(),
    sleepHours: sleep_hours,
    workoutMinutes: workout_minutes,
    phoneMinutes: phone_minutes,
    sunlight,
    mood,
  };
  if (note !== undefined) payload.note = note;
  if (waterCups !== undefined) payload.waterCups = waterCups;
  if (waterGoalCups !== undefined) payload.waterGoalCups = waterGoalCups;
  return request(`dailytracking`, {
    method: 'POST',
    body: JSON.stringify(payload),
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

// ─── Workout API ──────────────────────────────────────────────────────────────

export async function getExercises() {
  if (USE_DUMMY_DATA) return Promise.resolve(DUMMY_EXERCISES);
  return request('exercises');
}

export async function createExercise(body: any) {
  if (USE_DUMMY_DATA) {
    const newExercise = { id: Math.max(...DUMMY_EXERCISES.map(e => e.id), 0) + 1, ...body };
    DUMMY_EXERCISES.push(newExercise);
    return Promise.resolve(newExercise);
  }
  return request('exercises', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateExercise(id: number, body: any) {
  if (USE_DUMMY_DATA) {
    const ex = DUMMY_EXERCISES.find(e => e.id === id);
    if (ex) Object.assign(ex, body);
    return Promise.resolve(ex);
  }
  return request(`exercises/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteExercise(id: number) {
  if (USE_DUMMY_DATA) {
    const idx = DUMMY_EXERCISES.findIndex(e => e.id === id);
    if (idx >= 0) DUMMY_EXERCISES.splice(idx, 1);
    return Promise.resolve({ success: true });
  }
  return request(`exercises/${id}`, { method: 'DELETE' });
}

export async function getSplits() {
  if (USE_DUMMY_DATA) return Promise.resolve([DUMMY_SPLIT]);
  return request('workout/splits');
}

export async function createSplit(body: any) {
  if (USE_DUMMY_DATA) {
    return Promise.resolve({ ...DUMMY_SPLIT, ...body });
  }
  return request('workout/splits', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateSplit(id: number, body: any) {
  if (USE_DUMMY_DATA) {
    Object.assign(DUMMY_SPLIT, body);
    return Promise.resolve(DUMMY_SPLIT);
  }
  return request(`workout/splits/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteSplit(id: number) {
  if (USE_DUMMY_DATA) {
    return Promise.resolve({ success: true });
  }
  return request(`workout/splits/${id}`, { method: 'DELETE' });
}

export async function getWorkoutPlans(from?: string, to?: string) {
  if (USE_DUMMY_DATA) return Promise.resolve([]);
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return request(`workout/plans?${params}`);
}

export async function getWorkoutPlanByDate(date: string) {
  if (USE_DUMMY_DATA) return Promise.resolve(null);
  return request(`workout/plans/date/${date}`);
}

export async function createWorkoutPlan(body: any) {
  if (USE_DUMMY_DATA) return Promise.resolve({ id: 1, ...body });
  return request('workout/plans', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateWorkoutPlan(id: number, body: any) {
  if (USE_DUMMY_DATA) return Promise.resolve({ id, ...body });
  return request(`workout/plans/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteWorkoutPlan(id: number) {
  if (USE_DUMMY_DATA) return Promise.resolve({ success: true });
  return request(`workout/plans/${id}`, { method: 'DELETE' });
}

export async function logWorkoutSet(planId: number, body: any) {
  if (USE_DUMMY_DATA) return Promise.resolve({ id: 1, ...body });
  return request(`workout/plans/${planId}/sets`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateWorkoutSet(id: number, body: any) {
  if (USE_DUMMY_DATA) return Promise.resolve({ id, ...body });
  return request(`workout/sets/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteWorkoutSet(id: number) {
  if (USE_DUMMY_DATA) return Promise.resolve({ success: true });
  return request(`workout/sets/${id}`, { method: 'DELETE' });
}

export async function getPersonalRecords() {
  if (USE_DUMMY_DATA) return Promise.resolve([]);
  return request('workout/prs');
}

export async function getWorkoutAnalytics(weeks?: number) {
  if (USE_DUMMY_DATA) return Promise.resolve({});
  return request(`workout/analytics/volume${weeks ? `?weeks=${weeks}` : ''}`);
}

export async function addWorkoutImage(planId: number, body: any) {
  if (USE_DUMMY_DATA) return Promise.resolve({ id: 1, ...body });
  return request(`workout/plans/${planId}/images`, { method: 'POST', body: JSON.stringify(body) });
}

export async function deleteWorkoutImage(id: number) {
  if (USE_DUMMY_DATA) return Promise.resolve({ success: true });
  return request(`workout/images/${id}`, { method: 'DELETE' });
}

// ─── Goals API ────────────────────────────────────────────────────────────────

export async function getGoals() { return request('goals'); }
export async function createGoal(body: any) { return request('goals', { method: 'POST', body: JSON.stringify(body) }); }
export async function updateGoal(id: number, body: any) { return request(`goals/${id}`, { method: 'PUT', body: JSON.stringify(body) }); }
export async function deleteGoal(id: number) { return request(`goals/${id}`, { method: 'DELETE' }); }

export async function getGoalNotes(goalId: number) { return request(`goals/${goalId}/notes`); }
export async function createGoalNote(goalId: number, body: any) { return request(`goals/${goalId}/notes`, { method: 'POST', body: JSON.stringify(body) }); }
export async function updateGoalNote(id: number, body: any) { return request(`goals/notes/${id}`, { method: 'PUT', body: JSON.stringify(body) }); }
export async function deleteGoalNote(id: number) { return request(`goals/notes/${id}`, { method: 'DELETE' }); }

export async function getGoalLogs(goalId: number) { return request(`goals/${goalId}/logs`); }
export async function addGoalLog(goalId: number, body: any) { return request(`goals/${goalId}/logs`, { method: 'POST', body: JSON.stringify(body) }); }
export async function updateGoalLog(id: number, body: any) { return request(`goals/logs/${id}`, { method: 'PUT', body: JSON.stringify(body) }); }

export async function getFlashcards(goalId: number) { return request(`goals/${goalId}/flashcards`); }
export async function getFlashcardReviewQueue(goalId: number) { return request(`goals/${goalId}/flashcards/review`); }
export async function createFlashcard(goalId: number, body: any) { return request(`goals/${goalId}/flashcards`, { method: 'POST', body: JSON.stringify(body) }); }
export async function updateFlashcard(id: number, body: any) { return request(`goals/flashcards/${id}`, { method: 'PUT', body: JSON.stringify(body) }); }
export async function deleteFlashcard(id: number) { return request(`goals/flashcards/${id}`, { method: 'DELETE' }); }

// ─── Reminders API ────────────────────────────────────────────────────────────

export async function getReminders() { return request('reminders'); }
export async function createReminder(body: any) { return request('reminders', { method: 'POST', body: JSON.stringify(body) }); }
export async function updateReminder(id: number, body: any) { return request(`reminders/${id}`, { method: 'PUT', body: JSON.stringify(body) }); }
export async function deleteReminder(id: number) { return request(`reminders/${id}`, { method: 'DELETE' }); }
export async function getTodayReminderLogs() { return request('reminders/logs/today'); }
export async function toggleReminderDone(id: number) { return request(`reminders/${id}/log`, { method: 'POST' }); }
export async function getReminderHistory(days?: number) { return request(`reminders/history${days ? `?days=${days}` : ''}`); }

// ─── Journal API ──────────────────────────────────────────────────────────────

export async function getJournalEntries(page?: number) { return request(`journal${page ? `?page=${page}` : ''}`); }
export async function getMemoryWall() { return request('journal/memory-wall'); }
export async function getJournalEntry(id: number) { return request(`journal/${id}`); }
export async function createJournalEntry(body: any) { return request('journal', { method: 'POST', body: JSON.stringify(body) }); }
export async function updateJournalEntry(id: number, body: any) { return request(`journal/${id}`, { method: 'PUT', body: JSON.stringify(body) }); }
export async function deleteJournalEntry(id: number) { return request(`journal/${id}`, { method: 'DELETE' }); }

// ─── Weekly Review API ────────────────────────────────────────────────────────

export async function getWeeklyReviews() { return request('weeklyreviews'); }
export async function getCurrentWeekReview() { return request('weeklyreviews/current'); }
export async function getWeekSummary(weekStart: string) { return request(`weeklyreviews/summary/${weekStart}`); }
export async function upsertWeeklyReview(body: any) { return request('weeklyreviews', { method: 'POST', body: JSON.stringify(body) }); }
export async function generateWeeklyReview(weekStart?: string) {
  const qs = weekStart ? `?weekStart=${weekStart}` : '';
  return request(`weeklyreviews/generate${qs}`, { method: 'POST' });
}

// ─── DUMMY DATA (for development/testing without backend) ──────────────────

const DUMMY_EXERCISES = [
  { id: 1, name: 'Bench Press', description: 'Chest compound movement', category: 'chest', imageUrl: 'https://via.placeholder.com/300x200?text=Bench+Press' },
  { id: 2, name: 'Squats', description: 'Leg compound movement', category: 'legs', imageUrl: 'https://via.placeholder.com/300x200?text=Squats' },
  { id: 3, name: 'Deadlifts', description: 'Full body compound', category: 'back', imageUrl: 'https://via.placeholder.com/300x200?text=Deadlifts' },
  { id: 4, name: 'Pull-ups', description: 'Back and arms', category: 'back', imageUrl: 'https://via.placeholder.com/300x200?text=Pull-ups' },
  { id: 5, name: 'Shoulder Press', description: 'Shoulder compound', category: 'shoulders', imageUrl: 'https://via.placeholder.com/300x200?text=Shoulder+Press' },
  { id: 6, name: 'Barbell Rows', description: 'Back strength', category: 'back', imageUrl: 'https://via.placeholder.com/300x200?text=Barbell+Rows' },
  { id: 7, name: 'Bicep Curls', description: 'Arm isolation', category: 'arms', imageUrl: 'https://via.placeholder.com/300x200?text=Bicep+Curls' },
  { id: 8, name: 'Tricep Dips', description: 'Arm isolation', category: 'arms', imageUrl: 'https://via.placeholder.com/300x200?text=Tricep+Dips' }
];

const DUMMY_SPLIT = {
  id: 1,
  name: 'PPL Split',
  dayConfigs: {
    monday: [{ exerciseId: 1, sets: 4, reps: 8 }, { exerciseId: 7, sets: 3, reps: 10 }],
    tuesday: [{ exerciseId: 3, sets: 4, reps: 6 }, { exerciseId: 4, sets: 3, reps: 8 }],
    wednesday: [{ exerciseId: 5, sets: 3, reps: 8 }, { exerciseId: 8, sets: 3, reps: 10 }],
    thursday: [{ exerciseId: 1, sets: 4, reps: 10 }],
    friday: [{ exerciseId: 3, sets: 3, reps: 8 }, { exerciseId: 6, sets: 3, reps: 8 }],
    saturday: [],
    sunday: []
  }
};

const DUMMY_MEAL_INGREDIENTS = [
  { id: 1, name: 'Chicken Breast', caloriesKcal: 165, proteinG: 31, carbsG: 0, fatsG: 3.6, createdAt: new Date().toISOString() },
  { id: 2, name: 'Brown Rice', caloriesKcal: 111, proteinG: 2.6, carbsG: 23, fatsG: 0.9, createdAt: new Date().toISOString() },
  { id: 3, name: 'Broccoli', caloriesKcal: 34, proteinG: 3.7, carbsG: 7, fatsG: 0.4, createdAt: new Date().toISOString() },
  { id: 4, name: 'Sweet Potato', caloriesKcal: 86, proteinG: 1.6, carbsG: 20, fatsG: 0.1, createdAt: new Date().toISOString() },
  { id: 5, name: 'Salmon', caloriesKcal: 208, proteinG: 20, carbsG: 0, fatsG: 13, createdAt: new Date().toISOString() },
  { id: 6, name: 'Eggs', caloriesKcal: 155, proteinG: 13, carbsG: 1.1, fatsG: 11, createdAt: new Date().toISOString() },
  { id: 7, name: 'Oatmeal', caloriesKcal: 389, proteinG: 17, carbsG: 66, fatsG: 6.9, createdAt: new Date().toISOString() },
  { id: 8, name: 'Banana', caloriesKcal: 89, proteinG: 1.1, carbsG: 23, fatsG: 0.3, createdAt: new Date().toISOString() }
];

const DUMMY_MEAL_TEMPLATES = [
  {
    id: 1,
    name: 'Grilled Chicken & Broccoli',
    timing: 'lunch',
    ingredientsJson: JSON.stringify([DUMMY_MEAL_INGREDIENTS[0], DUMMY_MEAL_INGREDIENTS[1], DUMMY_MEAL_INGREDIENTS[2]]),
    recipe: 'Grill chicken breast, serve with steamed broccoli and brown rice',
    imageUrl: 'https://via.placeholder.com/300x200?text=Chicken+Bowl',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Salmon & Sweet Potato',
    timing: 'dinner',
    ingredientsJson: JSON.stringify([DUMMY_MEAL_INGREDIENTS[4], DUMMY_MEAL_INGREDIENTS[3], DUMMY_MEAL_INGREDIENTS[2]]),
    recipe: 'Bake salmon, serve with roasted sweet potato and steamed broccoli',
    imageUrl: 'https://via.placeholder.com/300x200?text=Salmon+Plate',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Oatmeal with Banana',
    timing: 'breakfast',
    ingredientsJson: JSON.stringify([DUMMY_MEAL_INGREDIENTS[6], DUMMY_MEAL_INGREDIENTS[7]]),
    recipe: 'Cook oatmeal with water, top with sliced banana',
    imageUrl: 'https://via.placeholder.com/300x200?text=Oatmeal',
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    name: 'Scrambled Eggs & Toast',
    timing: 'breakfast',
    ingredientsJson: JSON.stringify([DUMMY_MEAL_INGREDIENTS[5]]),
    recipe: 'Scramble 2 eggs, serve with whole grain toast',
    imageUrl: 'https://via.placeholder.com/300x200?text=Eggs+Toast',
    createdAt: new Date().toISOString()
  },
  {
    id: 5,
    name: 'Post-Workout Protein',
    timing: 'post-workout',
    ingredientsJson: JSON.stringify([DUMMY_MEAL_INGREDIENTS[0], DUMMY_MEAL_INGREDIENTS[1]]),
    recipe: 'Lean chicken with quick carbs from rice or pasta',
    imageUrl: 'https://via.placeholder.com/300x200?text=Post-Workout',
    createdAt: new Date().toISOString()
  }
];

const DUMMY_WEEKLY_MEAL_PLAN = {
  planJson: JSON.stringify({
    monday: [1, 2],
    tuesday: [2, 3],
    wednesday: [1, 4],
    thursday: [3, 2],
    friday: [2, 5],
    saturday: [1],
    sunday: [4, 2]
  })
};

// ─── Meal Planner API ─────────────────────────────────────────────────────────

export async function getMealIngredients() {
  if (USE_DUMMY_DATA) return Promise.resolve(DUMMY_MEAL_INGREDIENTS);
  return request('meal/ingredients');
}

export async function createMealIngredient(body: any) {
  if (USE_DUMMY_DATA) {
    const newIngredient = { id: Math.max(...DUMMY_MEAL_INGREDIENTS.map(i => i.id), 0) + 1, ...body, createdAt: new Date().toISOString() };
    DUMMY_MEAL_INGREDIENTS.push(newIngredient);
    return Promise.resolve(newIngredient);
  }
  return request('meal/ingredients', { method: 'POST', body: JSON.stringify(body) });
}

export async function deleteMealIngredient(id: number) {
  if (USE_DUMMY_DATA) {
    const idx = DUMMY_MEAL_INGREDIENTS.findIndex(i => i.id === id);
    if (idx >= 0) DUMMY_MEAL_INGREDIENTS.splice(idx, 1);
    return Promise.resolve({ success: true });
  }
  return request(`meal/ingredients/${id}`, { method: 'DELETE' });
}

export async function getMealTemplates() {
  if (USE_DUMMY_DATA) return Promise.resolve(DUMMY_MEAL_TEMPLATES);
  return request('meal/templates');
}

export async function createMealTemplate(body: any) {
  if (USE_DUMMY_DATA) {
    const newTemplate = { id: Math.max(...DUMMY_MEAL_TEMPLATES.map(m => m.id), 0) + 1, ...body, createdAt: new Date().toISOString() };
    DUMMY_MEAL_TEMPLATES.push(newTemplate);
    return Promise.resolve(newTemplate);
  }
  return request('meal/templates', { method: 'POST', body: JSON.stringify(body) });
}

export async function deleteMealTemplate(id: number) {
  if (USE_DUMMY_DATA) {
    const idx = DUMMY_MEAL_TEMPLATES.findIndex(m => m.id === id);
    if (idx >= 0) DUMMY_MEAL_TEMPLATES.splice(idx, 1);
    return Promise.resolve({ success: true });
  }
  return request(`meal/templates/${id}`, { method: 'DELETE' });
}

export async function getWeeklyMealPlan() {
  if (USE_DUMMY_DATA) return Promise.resolve(DUMMY_WEEKLY_MEAL_PLAN);
  return request('meal/plan');
}

export async function upsertWeeklyMealPlan(planJson: string) {
  if (USE_DUMMY_DATA) {
    DUMMY_WEEKLY_MEAL_PLAN.planJson = planJson;
    return Promise.resolve(DUMMY_WEEKLY_MEAL_PLAN);
  }
  return request('meal/plan', { method: 'PUT', body: JSON.stringify({ planJson }) });
}

