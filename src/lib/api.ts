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
export type UserSettings = {
  theme: 'light' | 'dark' | 'blue' | 'green' | 'ocean' | 'futuristic';
  calorieGoal: number;
  trackingOptions: string[];
};

const API_BASE = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// ─── Dummy Data Flag (Toggle between dummy and real API) ────────────────────
export const USE_DUMMY_DATA = true; // Set to false to use real API endpoints
// Daily routine can be toggled independently from global API dummy mode.
export const USE_DUMMY_DAILY_ROUTINE_DATA = true;
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

let DUMMY_USER_SETTINGS: UserSettings = {
  theme: 'light',
  calorieGoal: 2400,
  trackingOptions: ['sleep_hours', 'workout_minutes', 'phone_minutes'],
};

export async function getUserSettings(): Promise<UserSettings> {
  if (USE_DUMMY_DATA) return Promise.resolve({ ...DUMMY_USER_SETTINGS, trackingOptions: [...DUMMY_USER_SETTINGS.trackingOptions] });
  return request('userprofiles/me/settings');
}

export async function updateUserSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  if (USE_DUMMY_DATA) {
    DUMMY_USER_SETTINGS = {
      ...DUMMY_USER_SETTINGS,
      ...patch,
      trackingOptions: patch.trackingOptions ? [...patch.trackingOptions] : DUMMY_USER_SETTINGS.trackingOptions,
    };
    return Promise.resolve({ ...DUMMY_USER_SETTINGS, trackingOptions: [...DUMMY_USER_SETTINGS.trackingOptions] });
  }
  return request('userprofiles/me/settings', { method: 'PUT', body: JSON.stringify(patch) });
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

export async function getActiveSplit() {
  if (USE_DUMMY_DATA) return Promise.resolve(DUMMY_SPLIT);
  return request('workout/splits/active');
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

function asDateKey(input?: string) {
  if (!input) return new Date().toISOString().slice(0, 10);
  return String(input).slice(0, 10);
}

let _dummyWorkoutStore: {
  nextPlanId: number;
  nextSetId: number;
  plansByDate: Record<string, any>;
} | null = null;

function getDummyWorkoutStore() {
  if (_dummyWorkoutStore) return _dummyWorkoutStore;
  const today = asDateKey(new Date().toISOString());
  const dayKey = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const entries = (DUMMY_SPLIT.dayConfigs as any)?.[dayKey] || [];
  const plannedExercises = entries.map((e: any) => ({
    exerciseId: e.exerciseId,
    targetSets: e.sets || 3,
    targetReps: e.reps || 10,
    targetWeightKg: null,
  }));

  _dummyWorkoutStore = {
    nextPlanId: 2,
    nextSetId: 1,
    plansByDate: {
      [today]: {
        id: 1,
        date: `${today}T00:00:00.000Z`,
        dayLabel: dayKey,
        plannedExercises: JSON.stringify(plannedExercises),
        isCompleted: false,
        sets: [],
        images: [],
      },
    },
  };
  return _dummyWorkoutStore;
}

function cloneAny<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function findWorkoutPlanById(id: number) {
  const store = getDummyWorkoutStore();
  const values = Object.values(store.plansByDate);
  return values.find((p: any) => p.id === id) || null;
}

export async function getWorkoutPlans(from?: string, to?: string) {
  if (USE_DUMMY_DATA) {
    const store = getDummyWorkoutStore();
    const list = Object.values(store.plansByDate)
      .filter((p: any) => {
        const dateKey = asDateKey(p.date);
        if (from && dateKey < asDateKey(from)) return false;
        if (to && dateKey > asDateKey(to)) return false;
        return true;
      })
      .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
    return Promise.resolve(cloneAny(list));
  }
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return request(`workout/plans?${params}`);
}

export async function getWorkoutPlanByDate(date: string) {
  if (USE_DUMMY_DATA) {
    const store = getDummyWorkoutStore();
    const found = store.plansByDate[asDateKey(date)] || null;
    return Promise.resolve(cloneAny(found));
  }
  return request(`workout/plans/date/${date}`);
}

export async function createWorkoutPlan(body: any) {
  if (USE_DUMMY_DATA) {
    const store = getDummyWorkoutStore();
    const dateKey = asDateKey(body.date);
    const plan = {
      id: store.nextPlanId++,
      date: body.date,
      dayLabel: body.dayLabel,
      plannedExercises: body.plannedExercises || '[]',
      isCompleted: Boolean(body.isCompleted),
      sets: [],
      images: [],
    };
    store.plansByDate[dateKey] = plan;
    return Promise.resolve(cloneAny(plan));
  }
  return request('workout/plans', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateWorkoutPlan(id: number, body: any) {
  if (USE_DUMMY_DATA) {
    const store = getDummyWorkoutStore();
    const current = findWorkoutPlanById(id);
    if (!current) return Promise.resolve({ id, ...body });
    const next = { ...current, ...body, id };
    store.plansByDate[asDateKey(next.date)] = next;
    return Promise.resolve(cloneAny(next));
  }
  return request(`workout/plans/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteWorkoutPlan(id: number) {
  if (USE_DUMMY_DATA) {
    const store = getDummyWorkoutStore();
    Object.keys(store.plansByDate).forEach(k => {
      if (store.plansByDate[k]?.id === id) delete store.plansByDate[k];
    });
    return Promise.resolve({ success: true });
  }
  return request(`workout/plans/${id}`, { method: 'DELETE' });
}

export async function logWorkoutSet(planId: number, body: any) {
  if (USE_DUMMY_DATA) {
    const store = getDummyWorkoutStore();
    const plan = findWorkoutPlanById(planId);
    if (!plan) return Promise.reject(new Error('Workout plan not found'));
    const created = { id: store.nextSetId++, ...body };
    plan.sets = [...(plan.sets || []), created];
    store.plansByDate[asDateKey(plan.date)] = plan;
    return Promise.resolve(cloneAny(created));
  }
  return request(`workout/plans/${planId}/sets`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateWorkoutSet(id: number, body: any) {
  if (USE_DUMMY_DATA) {
    const store = getDummyWorkoutStore();
    for (const key of Object.keys(store.plansByDate)) {
      const plan = store.plansByDate[key];
      const idx = (plan.sets || []).findIndex((s: any) => s.id === id);
      if (idx >= 0) {
        plan.sets[idx] = { ...plan.sets[idx], ...body, id };
        return Promise.resolve(cloneAny(plan.sets[idx]));
      }
    }
    return Promise.resolve({ id, ...body });
  }
  return request(`workout/sets/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteWorkoutSet(id: number) {
  if (USE_DUMMY_DATA) {
    const store = getDummyWorkoutStore();
    for (const key of Object.keys(store.plansByDate)) {
      const plan = store.plansByDate[key];
      plan.sets = (plan.sets || []).filter((s: any) => s.id !== id);
    }
    return Promise.resolve({ success: true });
  }
  return request(`workout/sets/${id}`, { method: 'DELETE' });
}

export async function getPersonalRecords() {
  if (USE_DUMMY_DATA) {
    const store = getDummyWorkoutStore();
    const byExercise = new Map<number, any>();
    Object.values(store.plansByDate).forEach((plan: any) => {
      (plan.sets || []).forEach((set: any) => {
        if (!set.isCompleted) return;
        const prev = byExercise.get(set.exerciseId);
        if (!prev || Number(set.weightKg || 0) > Number(prev.weightKg || 0)) {
          byExercise.set(set.exerciseId, set);
        }
      });
    });
    return Promise.resolve(Array.from(byExercise.values()).map((s: any) => ({ exerciseId: s.exerciseId, weightKg: s.weightKg, reps: s.reps })));
  }
  return request('workout/prs');
}

export async function getWorkoutAnalytics(weeks?: number) {
  if (USE_DUMMY_DATA) {
    const store = getDummyWorkoutStore();
    const plans = Object.values(store.plansByDate);
    const sets = plans.flatMap((p: any) => p.sets || []);
    return Promise.resolve({
      weeks: weeks || 12,
      daysLogged: plans.length,
      totalSets: sets.length,
      totalVolume: sets.reduce((sum: number, s: any) => sum + Number(s.weightKg || 0) * Number(s.reps || 0), 0),
    });
  }
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

// ─── Daily Routine API ────────────────────────────────────────────────────────

type DummyRoutineBlock = {
  id: number;
  routineId: number;
  title: string;
  startTime: string;
  endTime: string;
  category?: string;
  color?: string;
  sortOrder: number;
};

type DummyRoutine = {
  id: number;
  name: string;
  description?: string;
  color: string;
  blocks: DummyRoutineBlock[];
};

const DAILY_ROUTINE_MOCK_ENABLED = USE_DUMMY_DAILY_ROUTINE_DATA || USE_DUMMY_DATA;

const _dummyDailyRoutineStore: {
  nextRoutineId: number;
  nextBlockId: number;
  routines: DummyRoutine[];
  schedule: Array<{ dayOfWeek: number; routineId: number | null }>;
  logsByDate: Record<string, Record<number, 'completed' | 'skipped' | 'missed'>>;
  skippedDates: Record<string, string | null>;
} = {
  nextRoutineId: 3,
  nextBlockId: 9,
  routines: [
    {
      id: 1,
      name: 'Weekday Prime',
      color: '#6C63FF',
      blocks: [
        { id: 1, routineId: 1, title: 'Study DSA', startTime: '04:30', endTime: '05:30', sortOrder: 1 },
        { id: 2, routineId: 1, title: 'Workout', startTime: '05:30', endTime: '06:30', sortOrder: 2 },
        { id: 3, routineId: 1, title: 'Deep Work Sprint', startTime: '09:00', endTime: '11:00', sortOrder: 3 },
      ],
    },
    {
      id: 2,
      name: 'Weekend Reset',
      color: '#43CBFF',
      blocks: [
        { id: 4, routineId: 2, title: 'Long Walk', startTime: '07:00', endTime: '08:00', sortOrder: 1 },
        { id: 5, routineId: 2, title: 'Meal Prep', startTime: '10:00', endTime: '11:30', sortOrder: 2 },
        { id: 6, routineId: 2, title: 'Weekly Review', startTime: '19:00', endTime: '20:00', sortOrder: 3 },
      ],
    },
  ],
  schedule: [
    { dayOfWeek: 0, routineId: 2 },
    { dayOfWeek: 1, routineId: 1 },
    { dayOfWeek: 2, routineId: 1 },
    { dayOfWeek: 3, routineId: 1 },
    { dayOfWeek: 4, routineId: 1 },
    { dayOfWeek: 5, routineId: 1 },
    { dayOfWeek: 6, routineId: 2 },
  ],
  logsByDate: {},
  skippedDates: {},
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getDayOfWeek(date: string): number {
  const d = new Date(`${date}T00:00:00`);
  return d.getDay();
}

export async function getDailyRoutines() {
  if (DAILY_ROUTINE_MOCK_ENABLED) return Promise.resolve(clone(_dummyDailyRoutineStore.routines));
  return request('dailyroutine');
}

export async function createDailyRoutine(body: { name: string; description?: string; color?: string }) {
  if (DAILY_ROUTINE_MOCK_ENABLED) {
    const routine: DummyRoutine = {
      id: _dummyDailyRoutineStore.nextRoutineId++,
      name: body.name,
      description: body.description,
      color: body.color || '#6C63FF',
      blocks: [],
    };
    _dummyDailyRoutineStore.routines.push(routine);
    return Promise.resolve(clone(routine));
  }
  return request('dailyroutine', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateDailyRoutine(id: number, body: { name: string; description?: string; color?: string }) {
  if (DAILY_ROUTINE_MOCK_ENABLED) {
    const routine = _dummyDailyRoutineStore.routines.find(r => r.id === id);
    if (!routine) return Promise.reject(new Error('Routine not found'));
    routine.name = body.name ?? routine.name;
    routine.description = body.description;
    routine.color = body.color || routine.color;
    return Promise.resolve(clone(routine));
  }
  return request(`dailyroutine/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteDailyRoutine(id: number) {
  if (DAILY_ROUTINE_MOCK_ENABLED) {
    _dummyDailyRoutineStore.routines = _dummyDailyRoutineStore.routines.filter(r => r.id !== id);
    _dummyDailyRoutineStore.schedule = _dummyDailyRoutineStore.schedule.map(e => e.routineId === id ? { ...e, routineId: null } : e);
    return Promise.resolve({ success: true });
  }
  return request(`dailyroutine/${id}`, { method: 'DELETE' });
}

export async function addRoutineBlock(routineId: number, body: { title: string; startTime: string; endTime: string; category?: string; color?: string; sortOrder?: number }) {
  if (DAILY_ROUTINE_MOCK_ENABLED) {
    const routine = _dummyDailyRoutineStore.routines.find(r => r.id === routineId);
    if (!routine) return Promise.reject(new Error('Routine not found'));
    const block: DummyRoutineBlock = {
      id: _dummyDailyRoutineStore.nextBlockId++,
      routineId,
      title: body.title,
      startTime: body.startTime,
      endTime: body.endTime,
      category: body.category,
      color: body.color,
      sortOrder: body.sortOrder ?? (routine.blocks.length + 1),
    };
    routine.blocks.push(block);
    return Promise.resolve(clone(block));
  }
  return request(`dailyroutine/${routineId}/blocks`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateRoutineBlock(id: number, body: { title: string; startTime: string; endTime: string; category?: string; color?: string; sortOrder?: number }) {
  if (DAILY_ROUTINE_MOCK_ENABLED) {
    for (const routine of _dummyDailyRoutineStore.routines) {
      const block = routine.blocks.find(b => b.id === id);
      if (!block) continue;
      block.title = body.title ?? block.title;
      block.startTime = body.startTime ?? block.startTime;
      block.endTime = body.endTime ?? block.endTime;
      block.category = body.category;
      block.color = body.color;
      if (typeof body.sortOrder === 'number') block.sortOrder = body.sortOrder;
      return Promise.resolve(clone(block));
    }
    return Promise.reject(new Error('Block not found'));
  }
  return request(`dailyroutine/blocks/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteRoutineBlock(id: number) {
  if (DAILY_ROUTINE_MOCK_ENABLED) {
    for (const routine of _dummyDailyRoutineStore.routines) {
      const before = routine.blocks.length;
      routine.blocks = routine.blocks.filter(b => b.id !== id);
      if (before !== routine.blocks.length) break;
    }
    Object.keys(_dummyDailyRoutineStore.logsByDate).forEach(date => {
      delete _dummyDailyRoutineStore.logsByDate[date][id];
    });
    return Promise.resolve({ success: true });
  }
  return request(`dailyroutine/blocks/${id}`, { method: 'DELETE' });
}

export async function getWeeklyRoutineSchedule() {
  if (DAILY_ROUTINE_MOCK_ENABLED) {
    const rows = _dummyDailyRoutineStore.schedule.map(e => ({
      ...e,
      routineName: _dummyDailyRoutineStore.routines.find(r => r.id === e.routineId)?.name,
    }));
    return Promise.resolve(clone(rows));
  }
  return request('dailyroutine/schedule');
}

export async function updateWeeklyRoutineSchedule(entries: Array<{ dayOfWeek: number; routineId: number | null }>) {
  if (DAILY_ROUTINE_MOCK_ENABLED) {
    _dummyDailyRoutineStore.schedule = Array.from({ length: 7 }, (_, i) => {
      const found = entries.find(e => e.dayOfWeek === i);
      return { dayOfWeek: i, routineId: found ? found.routineId : null };
    });
    return Promise.resolve({ success: true });
  }
  return request('dailyroutine/schedule', { method: 'PUT', body: JSON.stringify(entries) });
}

export async function getTodayRoutine() {
  if (DAILY_ROUTINE_MOCK_ENABLED) {
    const date = new Date();
    const dateKey = date.toISOString().slice(0, 10);
    const dayOfWeek = getDayOfWeek(dateKey);
    const assigned = _dummyDailyRoutineStore.schedule.find(s => s.dayOfWeek === dayOfWeek);
    const routine = _dummyDailyRoutineStore.routines.find(r => r.id === assigned?.routineId);
    const isSkipped = Boolean(_dummyDailyRoutineStore.skippedDates[dateKey]);

    if (!routine) {
      return Promise.resolve({
        date: dateKey,
        dayOfWeek,
        routine: null,
        isSkipped,
        blocks: [],
        stats: { completed: 0, skipped: 0, total: 0 },
      });
    }

    const nowMinutes = date.getHours() * 60 + date.getMinutes();
    const dailyLogs = _dummyDailyRoutineStore.logsByDate[dateKey] || {};
    const blocks = [...routine.blocks]
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
      .map(block => {
        const logged = dailyLogs[block.id];
        const missed = !logged && !isSkipped && nowMinutes >= toMinutes(block.endTime);
        const status = (logged || (missed ? 'missed' : 'pending')) as 'pending' | 'completed' | 'skipped' | 'missed';
        return {
          id: block.id,
          title: block.title,
          startTime: block.startTime,
          endTime: block.endTime,
          category: block.category,
          color: block.color,
          status,
          logId: status === 'pending' ? undefined : Number(`${dateKey.replace(/-/g, '')}${block.id}`),
        };
      });

    return Promise.resolve({
      date: dateKey,
      dayOfWeek,
      routine: { id: routine.id, name: routine.name, color: routine.color },
      isSkipped,
      blocks,
      stats: {
        completed: blocks.filter(b => b.status === 'completed').length,
        skipped: blocks.filter(b => b.status === 'skipped').length,
        total: blocks.length,
      },
    });
  }
  return request('dailyroutine/today');
}

export async function logRoutineBlock(body: { routineBlockId: number; date: string; status: 'completed' | 'skipped' | 'missed' }) {
  if (DAILY_ROUTINE_MOCK_ENABLED) {
    if (!_dummyDailyRoutineStore.logsByDate[body.date]) _dummyDailyRoutineStore.logsByDate[body.date] = {};
    _dummyDailyRoutineStore.logsByDate[body.date][body.routineBlockId] = body.status;
    return Promise.resolve({ id: Date.now(), ...body });
  }
  return request('dailyroutine/logs', { method: 'POST', body: JSON.stringify(body) });
}

export async function skipTodayRoutine(date: string, reason?: string) {
  if (DAILY_ROUTINE_MOCK_ENABLED) {
    if (_dummyDailyRoutineStore.skippedDates[date]) {
      delete _dummyDailyRoutineStore.skippedDates[date];
    } else {
      _dummyDailyRoutineStore.skippedDates[date] = reason || null;
    }
    return Promise.resolve({ success: true });
  }
  return request('dailyroutine/skip', { method: 'POST', body: JSON.stringify({ date, reason }) });
}

export async function getRoutineHistory(from: string, to: string) {
  if (DAILY_ROUTINE_MOCK_ENABLED) {
    const logs: Array<{ date: string; routineBlockId: number; status: 'completed' | 'skipped' | 'missed' }> = [];
    const skips: Array<{ date: string; reason?: string | null }> = [];

    Object.entries(_dummyDailyRoutineStore.logsByDate).forEach(([date, byBlock]) => {
      if (date < from || date > to) return;
      Object.entries(byBlock).forEach(([routineBlockId, status]) => {
        logs.push({ date, routineBlockId: Number(routineBlockId), status });
      });
    });

    Object.entries(_dummyDailyRoutineStore.skippedDates).forEach(([date, reason]) => {
      if (date < from || date > to) return;
      skips.push({ date, reason });
    });

    return Promise.resolve({ logs, skips });
  }
  return request(`dailyroutine/history?from=${from}&to=${to}`);
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

const DUMMY_DAILY_MEAL_LOGS: Record<string, number[]> = {};

export async function getDailyMealLog(date: string) {
  if (USE_DUMMY_DATA) {
    return Promise.resolve({ date, mealIds: [...(DUMMY_DAILY_MEAL_LOGS[date] || [])] });
  }
  return request(`meal/logs/${date}`);
}

export async function upsertDailyMealLog(date: string, mealIds: number[]) {
  if (USE_DUMMY_DATA) {
    DUMMY_DAILY_MEAL_LOGS[date] = [...mealIds];
    return Promise.resolve({ date, mealIds: [...mealIds] });
  }
  return request('meal/logs', { method: 'PUT', body: JSON.stringify({ date, mealIds }) });
}

// ─── Water Intake API ─────────────────────────────────────────────────────────

type DailyWaterLog = {
  date: string;
  mlConsumed: number;
  goalMl: number;
  unit: 'ml' | 'l';
};

const DUMMY_DAILY_WATER_LOGS: Record<string, DailyWaterLog> = {};

export async function getDailyWaterLog(date: string) {
  const key = asDateKey(date);
  if (USE_DUMMY_DATA) {
    const log = DUMMY_DAILY_WATER_LOGS[key];
    return Promise.resolve(log || { date: key, mlConsumed: 0, goalMl: 2000, unit: 'ml' as const });
  }
  return request(`water/logs?date=${encodeURIComponent(key)}`);
}

export async function logWaterIntake(date: string, ml: number, goalMl: number = 2000) {
  const key = asDateKey(date);
  if (USE_DUMMY_DATA) {
    DUMMY_DAILY_WATER_LOGS[key] = { date: key, mlConsumed: Math.max(0, ml), goalMl, unit: 'ml' as const };
    return Promise.resolve(DUMMY_DAILY_WATER_LOGS[key]);
  }
  return request('water/logs', { method: 'POST', body: JSON.stringify({ date: key, mlConsumed: ml, goalMl }) });
}

export async function incrementWaterIntake(date: string, incrementMl: number = 250) {
  const key = asDateKey(date);
  if (USE_DUMMY_DATA) {
    const current = DUMMY_DAILY_WATER_LOGS[key] || { date: key, mlConsumed: 0, goalMl: 2000, unit: 'ml' as const };
    const next = { ...current, mlConsumed: Math.max(0, current.mlConsumed + incrementMl) };
    DUMMY_DAILY_WATER_LOGS[key] = next;
    return Promise.resolve(next);
  }
  return request('water/logs/increment', { method: 'POST', body: JSON.stringify({ date: key, incrementMl }) });
}

// ─── Task Logging for Quick Log ────────────────────────────────────────────
// Tasks logged via Quick Log are stored as quick log entries, not as full task records

// ─── Unified Quick Log API ────────────────────────────────────────────────────

export type QuickLogEntry = {
  id: number;
  date: string;
  type: 'workout' | 'meal' | 'expense' | 'water' | 'task';
  payload: Record<string, any>;
  createdAt: string;
};

const DUMMY_QUICK_LOG_ENTRIES: QuickLogEntry[] = [];

export async function logQuickEntry(type: 'workout' | 'meal' | 'expense' | 'water' | 'task', payload: Record<string, any>, date?: string) {
  if (USE_DUMMY_DATA) {
    const entry: QuickLogEntry = {
      id: DUMMY_QUICK_LOG_ENTRIES.length + 1,
      date: asDateKey(date),
      type,
      payload,
      createdAt: new Date().toISOString(),
    };
    DUMMY_QUICK_LOG_ENTRIES.push(entry);

    // Also update the appropriate domain store based on type
    if (type === 'workout' && payload.exerciseId) {
      // Create/update workout set in dummy store
      const store = getDummyWorkoutStore();
      const plan = findWorkoutPlanById(payload.planId) || await createWorkoutPlan({ date: entry.date, dayLabel: 'quick-log' });
      if (plan) {
        await logWorkoutSet(plan.id, {
          exerciseId: payload.exerciseId,
          reps: payload.reps || 10,
          weightKg: payload.weightKg || 0,
          isCompleted: true,
        });
      }
    } else if (type === 'meal' && payload.mealIds) {
      // Log meal in meal log store
      const current = DUMMY_DAILY_MEAL_LOGS[entry.date] || [];
      const mealIds = Array.isArray(payload.mealIds) ? payload.mealIds : [payload.mealIds];
      DUMMY_DAILY_MEAL_LOGS[entry.date] = [...new Set([...current, ...mealIds])];
    } else if (type === 'water' && payload.ml) {
      // Log water in ml
      const key = entry.date;
      const current = DUMMY_DAILY_WATER_LOGS[key] || { date: key, mlConsumed: 0, goalMl: 2000, unit: 'ml' as const };
      current.mlConsumed += payload.ml;
      DUMMY_DAILY_WATER_LOGS[key] = current;
    }
    // Tasks are logged as quick log entries, no additional processing needed

    return Promise.resolve(cloneAny(entry));
  }
  return request('quicklog', { method: 'POST', body: JSON.stringify({ type, payload, date: date || asDateKey() }) });
}

export async function getQuickLogHistory(from: string, to: string, type?: 'workout' | 'meal' | 'expense' | 'water' | 'task') {
  const fromKey = asDateKey(from);
  const toKey = asDateKey(to);
  if (USE_DUMMY_DATA) {
    let filtered = DUMMY_QUICK_LOG_ENTRIES.filter(e => e.date >= fromKey && e.date <= toKey);
    if (type) filtered = filtered.filter(e => e.type === type);
    return Promise.resolve(cloneAny(filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())));
  }
  const params = new URLSearchParams();
  params.set('from', fromKey);
  params.set('to', toKey);
  if (type) params.set('type', type);
  return request(`quicklog/history?${params}`);
}

export async function deleteQuickLogEntry(id: number) {
  if (USE_DUMMY_DATA) {
    const idx = DUMMY_QUICK_LOG_ENTRIES.findIndex(e => e.id === id);
    if (idx >= 0) DUMMY_QUICK_LOG_ENTRIES.splice(idx, 1);
    return Promise.resolve({ success: true });
  }
  return request(`quicklog/${id}`, { method: 'DELETE' });
}

export async function getTodayQuickLogs() {
  if (USE_DUMMY_DATA) {
    const today = asDateKey();
    return Promise.resolve(cloneAny(DUMMY_QUICK_LOG_ENTRIES.filter(e => e.date === today)));
  }
  return request('quicklog/today');
}

