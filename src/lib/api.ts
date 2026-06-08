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
type Expense = {
  id: number;
  userId: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  createdAt: string;
  gmailMessageId?: string;
  externalReference?: string;
  sourceType?: string;
  isReviewed?: boolean;
  reviewedAt?: string;
};
export type UserSettings = {
  theme: 'light' | 'dark' | 'blue' | 'green' | 'ocean' | 'futuristic';
  calorieGoal: number;
  trackingOptions: string[];
  dashboardPreset: 'balanced' | 'discipline' | 'health-first' | 'wealth-first' | 'custom';
  dashboardWeights: {
    tasks: number;
    routine: number;
    body: number;
    workout: number;
    finance: number;
    journal: number;
  };
};

export type AiProvider = 'local-llama' | 'claude';

export type AiPlannerSettings = {
  provider: AiProvider;
  localEndpoint: string;
  localModel?: string;
  claudeApiKey?: string;
  claudeModel?: string;
};

export type MedicalCondition = {
  condition_name: string;
  status: 'active' | 'controlled' | 'history';
  severity: 'mild' | 'moderate' | 'severe';
  notes?: string;
  diet_restrictions: string[];
  exercise_limits: string[];
  medications_affecting_plan: string[];
};

export type HealthProfile = {
  age?: number;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  targetWeightKg?: number;
  dailyCaloriesTarget?: number;
  dietPreference?: string;
  budgetPerWeek?: number;
  activityLevel?: string;
  medicalConditions?: MedicalCondition[];
  targetDate?: string;
};

export type HealthRecommendation = {
  dailyCaloriesTarget?: number;
  budgetPerWeek?: number;
  activityLevel?: string;
  dietPreference?: string;
  rationale?: string;
  feasible?: boolean;
  goalType?: 'bulk' | 'cut' | 'maintain' | string;
  analysis?: HealthRecommendationAnalysis;
};

export type HealthRecommendationAnalysis = {
  feasible?: boolean;
  goal_type?: 'bulk' | 'cut' | 'maintain' | string;
  bmi?: number;
  bmr?: number;
  tdee?: number;
  days_remaining?: number;
  weekly_change_needed_kg?: number;
  feasibility_check?: {
    passed?: boolean;
    failed_rule?: string | null;
    reason?: string | null;
  };
  recommendation?: {
    daily_calories?: number;
    activity_level?: string;
    macros?: {
      protein_g?: number;
      carbs_g?: number;
      fat_g?: number;
    };
    warnings?: string[];
    milestones?: Array<{
      date?: string;
      expected_weight_kg?: number;
    }>;
  } | null;
  alternative_plan?: {
    safe_target_date?: string;
    safe_weekly_rate_kg?: number;
    interim_focus?: string;
  } | null;
};

const API_BASE = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');

// ─── Dummy Data Configuration ───────────────────────────────────────────────
// Per-feature flags. Set to false to use live API for that page/domain.
function envBool(name: string, fallback: boolean): boolean {
  const raw = (import.meta as any).env?.[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  const value = String(raw).trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

export const DUMMY_FLAGS = {
  settings: envBool('VITE_USE_DUMMY_SETTINGS', false),
  workout: envBool('VITE_USE_DUMMY_WORKOUT', false),
  dailyRoutine: envBool('VITE_USE_DUMMY_DAILY_ROUTINE', false),
  goals: envBool('VITE_USE_DUMMY_GOALS', false),
  finance: envBool('VITE_USE_DUMMY_FINANCE', false),
  vehicles: envBool('VITE_USE_DUMMY_VEHICLES', false),
  meals: envBool('VITE_USE_DUMMY_MEALS', false),
  water: envBool('VITE_USE_DUMMY_WATER', false),
  bodyMetrics: envBool('VITE_USE_DUMMY_BODY_METRICS', false),
  quickLog: envBool('VITE_USE_DUMMY_QUICK_LOG', false ),
};

// ─── Onboarding Types ─────────────────────────────────────────────────────────
export type OnboardingData = {
  selectedFeatures: string[];       // e.g. ['health','finance']
  // Step 2 – profile
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  targetDate?: string;
  age?: number;
  gender?: string;
  // Step 3 – health prefs
  dailyCaloriesTarget?: number;
  budgetPerWeek?: number;
  activityLevel?: string;
  dietPreference?: string;
  // Step 4 – fitness/meal
  preferredWorkouts?: string[];     // e.g. ['strength','cardio']
  preferredMeals?: string[];       // e.g. ['home-cooked','meal-prep']
  workoutsPerWeek?: number;
  minutesPerSession?: number;
  // Step 5 - ingredient preferences and generation mode
  preferredIngredientIds?: number[];
  excludedIngredientIds?: number[];
  customPreferredIngredients?: string[];
  generationMode?: 'ai' | 'normal';
  // Step 6 - consistency/adherence signal
  planAdherenceScore?: number;
};

export type OnboardingStatus = {
  completed: boolean;
  data: OnboardingData | null;
};

// Legacy compatibility exports
export const USE_DUMMY_DATA = DUMMY_FLAGS.settings;
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
  const raw =
    (typeof payload === 'string' && payload.trim().length > 0 ? payload : '') ||
    (payload && typeof payload.message === 'string' && payload.message.trim().length > 0 ? payload.message : '') ||
    (payload && typeof payload.error === 'string' && payload.error.trim().length > 0 ? payload.error : '');

  if (raw) {
    const lower = raw.toLowerCase();
    if (lower.includes('ux_meal_ingredients_name_ci') || lower.includes('duplicate key') || lower.includes('already exists')) {
      return 'Ingredient already exists.';
    }
    return raw;
  }

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

function getSessionUserId(): number | null {
  const session = getSession();
  const id = session?.user?.id;
  return Number.isFinite(id) ? Number(id) : null;
}

export async function getProfile(id: number) {
  return request(`userprofiles/${id}`);
}

let DUMMY_USER_SETTINGS: UserSettings = {
  theme: 'light',
  calorieGoal: 2400,
  trackingOptions: ['sleep_hours', 'workout_minutes', 'phone_minutes'],
  dashboardPreset: 'balanced',
  dashboardWeights: { tasks: 35, routine: 20, body: 15, workout: 15, finance: 10, journal: 5 },
};

export async function getUserSettings(): Promise<UserSettings> {
  if (DUMMY_FLAGS.settings) {
    return Promise.resolve({
      ...DUMMY_USER_SETTINGS,
      trackingOptions: [...DUMMY_USER_SETTINGS.trackingOptions],
      dashboardWeights: { ...DUMMY_USER_SETTINGS.dashboardWeights },
    });
  }
  return request('userprofiles/me/settings');
}

export async function updateUserSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  if (DUMMY_FLAGS.settings) {
    DUMMY_USER_SETTINGS = {
      ...DUMMY_USER_SETTINGS,
      ...patch,
      trackingOptions: patch.trackingOptions ? [...patch.trackingOptions] : DUMMY_USER_SETTINGS.trackingOptions,
      dashboardWeights: patch.dashboardWeights ? { ...patch.dashboardWeights } : DUMMY_USER_SETTINGS.dashboardWeights,
    };
    return Promise.resolve({
      ...DUMMY_USER_SETTINGS,
      trackingOptions: [...DUMMY_USER_SETTINGS.trackingOptions],
      dashboardWeights: { ...DUMMY_USER_SETTINGS.dashboardWeights },
    });
  }
  return request('userprofiles/me/settings', { method: 'PUT', body: JSON.stringify(patch) });
}

export async function deleteMyAccount(): Promise<{ success: boolean }> {
  return request('userprofiles/me', { method: 'DELETE' });
}

export async function getAiPlannerSettings(): Promise<AiPlannerSettings> {
  return request('ai-planner/settings');
}

export async function updateAiPlannerSettings(patch: Partial<AiPlannerSettings>): Promise<AiPlannerSettings> {
  return request('ai-planner/settings', { method: 'PUT', body: JSON.stringify(patch) });
}

export async function getHealthProfile(): Promise<HealthProfile> {
  return request('ai-planner/profile');
}

export async function updateHealthProfile(patch: Partial<HealthProfile>): Promise<HealthProfile> {
  return request('ai-planner/profile', { method: 'PUT', body: JSON.stringify(patch) });
}

export async function getHealthRecommendations(body: {
  heightCm?: number;
  weightKg?: number;
  targetWeightKg?: number;
  targetDate?: string;
  age?: number;
  gender?: string;
  activityLevel?: string;
  medicalConditions?: MedicalCondition[];
  dietPreference?: string;
}): Promise<HealthRecommendation> {
  return request('ai-planner/recommend-health', { method: 'POST', body: JSON.stringify(body) });
}

export async function generateAiMealPlan(body: {
  startDate: string;
  mode: 'profile' | 'custom';
  budgetPerWeek?: number;
  dietPreference?: string;
}) {
  return request('ai-planner/generate/meals', { method: 'POST', body: JSON.stringify(body) });
}

export async function generateAiWorkoutPlan(body: {
  mode: 'profile' | 'custom';
  daysPerWeek?: number;
  minutesPerSession?: number;
  setsDefault?: number;
  repsDefault?: number;
}) {
  return request('ai-planner/generate/workouts', { method: 'POST', body: JSON.stringify(body) });
}

// ─── Onboarding API ───────────────────────────────────────────────────────────
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  return request('onboarding/status');
}

export async function completeOnboarding(data: OnboardingData): Promise<{ completed: boolean; generationQueued?: boolean }> {
  return request('onboarding/complete', { method: 'POST', body: JSON.stringify(data) });
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

// Gmail finance sync
export async function getFinanceGmailStatus() {
  return request('finance/gmail/status');
}

export async function getFinanceGmailConnectUrl() {
  return request('finance/gmail/connect');
}

export async function triggerFinanceGmailSync() {
  return request('finance/gmail/sync', { method: 'POST' });
}

export async function disconnectFinanceGmail() {
  return request('finance/gmail/disconnect', { method: 'DELETE' });
}

export async function getFinanceGmailTransactions(reviewed?: boolean) {
  const query = reviewed === undefined ? '' : `?reviewed=${reviewed}`;
  return request(`finance/gmail/transactions${query}`);
}

export async function bulkReviewFinanceGmailTransactions(expenseIds: number[], isReviewed: boolean) {
  return request('finance/gmail/review', { method: 'POST', body: JSON.stringify({ expenseIds, isReviewed }) });
}

export async function bulkSetCategoryFinanceGmailTransactions(expenseIds: number[], category: string, markReviewedOnCategoryChange = true) {
  return request('finance/gmail/category', {
    method: 'POST',
    body: JSON.stringify({ expenseIds, category, markReviewedOnCategoryChange }),
  });
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
  getGamification,
  getUserPoints,
  addPoints,
};
export type { User, Session, Task, Expense };

// ─── Workout API ──────────────────────────────────────────────────────────────

export async function getExercises() {
  if (DUMMY_FLAGS.workout) return Promise.resolve(DUMMY_EXERCISES);
  return request('exercises');
}

export async function createExercise(body: any) {
  if (DUMMY_FLAGS.workout) {
    const newExercise = { id: Math.max(...DUMMY_EXERCISES.map(e => e.id), 0) + 1, ...body };
    DUMMY_EXERCISES.push(newExercise);
    return Promise.resolve(newExercise);
  }
  return request('exercises', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateExercise(id: number, body: any) {
  if (DUMMY_FLAGS.workout) {
    const ex = DUMMY_EXERCISES.find(e => e.id === id);
    if (ex) Object.assign(ex, body);
    return Promise.resolve(ex);
  }
  return request(`exercises/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteExercise(id: number) {
  if (DUMMY_FLAGS.workout) {
    const idx = DUMMY_EXERCISES.findIndex(e => e.id === id);
    if (idx >= 0) DUMMY_EXERCISES.splice(idx, 1);
    return Promise.resolve({ success: true });
  }
  return request(`exercises/${id}`, { method: 'DELETE' });
}

export async function getSplits() {
  if (DUMMY_FLAGS.workout) return Promise.resolve([DUMMY_SPLIT]);
  return request('workout/splits');
}

export async function getActiveSplit() {
  if (DUMMY_FLAGS.workout) return Promise.resolve(DUMMY_SPLIT);
  return request('workout/splits/active');
}

export async function createSplit(body: any) {
  if (DUMMY_FLAGS.workout) {
    return Promise.resolve({ ...DUMMY_SPLIT, ...body });
  }
  return request('workout/splits', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateSplit(id: number, body: any) {
  if (DUMMY_FLAGS.workout) {
    Object.assign(DUMMY_SPLIT, body);
    return Promise.resolve(DUMMY_SPLIT);
  }
  return request(`workout/splits/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteSplit(id: number) {
  if (DUMMY_FLAGS.workout) {
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
  if (DUMMY_FLAGS.workout) {
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
  if (DUMMY_FLAGS.workout) {
    const store = getDummyWorkoutStore();
    const found = store.plansByDate[asDateKey(date)] || null;
    return Promise.resolve(cloneAny(found));
  }
  return request(`workout/plans/date/${date}`);
}

export async function createWorkoutPlan(body: any) {
  if (DUMMY_FLAGS.workout) {
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
  if (DUMMY_FLAGS.workout) {
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
  if (DUMMY_FLAGS.workout) {
    const store = getDummyWorkoutStore();
    Object.keys(store.plansByDate).forEach(k => {
      if (store.plansByDate[k]?.id === id) delete store.plansByDate[k];
    });
    return Promise.resolve({ success: true });
  }
  return request(`workout/plans/${id}`, { method: 'DELETE' });
}

export async function logWorkoutSet(planId: number, body: any) {
  if (DUMMY_FLAGS.workout) {
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
  if (DUMMY_FLAGS.workout) {
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
  if (DUMMY_FLAGS.workout) {
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
  if (DUMMY_FLAGS.workout) {
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
  if (DUMMY_FLAGS.workout) {
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
  if (DUMMY_FLAGS.workout) return Promise.resolve({ id: 1, ...body });
  return request(`workout/plans/${planId}/images`, { method: 'POST', body: JSON.stringify(body) });
}

export async function deleteWorkoutImage(id: number) {
  if (DUMMY_FLAGS.workout) return Promise.resolve({ success: true });
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
  linkedWorkoutPlanId?: number | null;
  linkedWorkoutLabel?: string | null;
  mealType?: string | null;
};

type DummyRoutine = {
  id: number;
  name: string;
  description?: string;
  color: string;
  blocks: DummyRoutineBlock[];
};


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
        { id: 2, routineId: 1, title: 'Workout', startTime: '05:30', endTime: '06:30', sortOrder: 2, linkedWorkoutPlanId: 1, linkedWorkoutLabel: 'Today Workout' },
        { id: 3, routineId: 1, title: 'Breakfast', startTime: '06:30', endTime: '07:00', sortOrder: 3, mealType: 'Breakfast' },
        { id: 4, routineId: 1, title: 'Deep Work Sprint', startTime: '09:00', endTime: '11:00', sortOrder: 4 },
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
  if (DUMMY_FLAGS.dailyRoutine) return Promise.resolve(clone(_dummyDailyRoutineStore.routines));
  return request('dailyroutine');
}

export async function createDailyRoutine(body: { name: string; description?: string; color?: string }) {
  if (DUMMY_FLAGS.dailyRoutine) {
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
  if (DUMMY_FLAGS.dailyRoutine) {
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
  if (DUMMY_FLAGS.dailyRoutine) {
    _dummyDailyRoutineStore.routines = _dummyDailyRoutineStore.routines.filter(r => r.id !== id);
    _dummyDailyRoutineStore.schedule = _dummyDailyRoutineStore.schedule.map(e => e.routineId === id ? { ...e, routineId: null } : e);
    return Promise.resolve({ success: true });
  }
  return request(`dailyroutine/${id}`, { method: 'DELETE' });
}

export async function copyDailyRoutine(id: number) {
  if (DUMMY_FLAGS.dailyRoutine) {
    const source = _dummyDailyRoutineStore.routines.find(r => r.id === id);
    if (!source) return Promise.reject(new Error('Routine not found'));
    const newId = _dummyDailyRoutineStore.nextRoutineId++;
    const copy: DummyRoutine = {
      id: newId,
      name: `${source.name} (Copy)`,
      description: source.description,
      color: source.color,
      blocks: source.blocks.map(b => ({
        ...b,
        id: _dummyDailyRoutineStore.nextBlockId++,
        routineId: newId,
      })),
    };
    _dummyDailyRoutineStore.routines.push(copy);
    return Promise.resolve(clone(copy));
  }
  return request(`dailyroutine/${id}/copy`, { method: 'POST' });
}

export async function addRoutineBlock(routineId: number, body: {
  title: string;
  startTime: string;
  endTime: string;
  category?: string;
  color?: string;
  sortOrder?: number;
  linkedWorkoutPlanId?: number | null;
  mealType?: string | null;
}) {
  if (DUMMY_FLAGS.dailyRoutine) {
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
      linkedWorkoutPlanId: body.linkedWorkoutPlanId ?? null,
      mealType: body.mealType ?? null,
    };
    routine.blocks.push(block);
    return Promise.resolve(clone(block));
  }
  return request(`dailyroutine/${routineId}/blocks`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateRoutineBlock(id: number, body: {
  title: string;
  startTime: string;
  endTime: string;
  category?: string;
  color?: string;
  sortOrder?: number;
  linkedWorkoutPlanId?: number | null;
  mealType?: string | null;
}) {
  if (DUMMY_FLAGS.dailyRoutine) {
    for (const routine of _dummyDailyRoutineStore.routines) {
      const block = routine.blocks.find(b => b.id === id);
      if (!block) continue;
      block.title = body.title ?? block.title;
      block.startTime = body.startTime ?? block.startTime;
      block.endTime = body.endTime ?? block.endTime;
      block.category = body.category;
      block.color = body.color;
      if (typeof body.sortOrder === 'number') block.sortOrder = body.sortOrder;
      if (Object.prototype.hasOwnProperty.call(body, 'linkedWorkoutPlanId')) {
        block.linkedWorkoutPlanId = body.linkedWorkoutPlanId ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'mealType')) {
        block.mealType = body.mealType ?? null;
      }
      return Promise.resolve(clone(block));
    }
    return Promise.reject(new Error('Block not found'));
  }
  return request(`dailyroutine/blocks/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function addTodayRoutineOverrideBlock(body: {
  date: string;
  routineId: number;
  title: string;
  startTime: string;
  endTime: string;
  category?: string;
  color?: string;
  sortOrder?: number;
  linkedWorkoutPlanId?: number | null;
  mealType?: string | null;
}) {
  return request('dailyroutine/today/overrides/add', { method: 'POST', body: JSON.stringify(body) });
}

export async function upsertTodayRoutineBaseOverride(body: {
  date: string;
  baseBlockId: number;
  title?: string;
  startTime?: string;
  endTime?: string;
  category?: string;
  color?: string;
  sortOrder?: number;
  linkedWorkoutPlanId?: number | null;
  mealType?: string | null;
  isDeleted?: boolean;
}) {
  return request('dailyroutine/today/overrides/base', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateTodayRoutineOverride(id: number, body: {
  title?: string;
  startTime?: string;
  endTime?: string;
  category?: string;
  color?: string;
  sortOrder?: number;
  linkedWorkoutPlanId?: number | null;
  mealType?: string | null;
  isDeleted?: boolean;
}) {
  return request(`dailyroutine/today/overrides/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteTodayRoutineOverride(id: number) {
  return request(`dailyroutine/today/overrides/${id}`, { method: 'DELETE' });
}

export async function reorderTodayRoutineOverrides(body: {
  date: string;
  items: Array<{ overrideId?: number; baseBlockId?: number; sortOrder: number }>;
}) {
  return request('dailyroutine/today/overrides/reorder', { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteRoutineBlock(id: number) {
  if (DUMMY_FLAGS.dailyRoutine) {
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
  if (DUMMY_FLAGS.dailyRoutine) {
    const rows = _dummyDailyRoutineStore.schedule.map(e => ({
      ...e,
      routineName: _dummyDailyRoutineStore.routines.find(r => r.id === e.routineId)?.name,
    }));
    return Promise.resolve(clone(rows));
  }
  return request('dailyroutine/schedule');
}

export async function updateWeeklyRoutineSchedule(entries: Array<{ dayOfWeek: number; routineId: number | null }>) {
  if (DUMMY_FLAGS.dailyRoutine) {
    _dummyDailyRoutineStore.schedule = Array.from({ length: 7 }, (_, i) => {
      const found = entries.find(e => e.dayOfWeek === i);
      return { dayOfWeek: i, routineId: found ? found.routineId : null };
    });
    return Promise.resolve({ success: true });
  }
  return request('dailyroutine/schedule', { method: 'PUT', body: JSON.stringify(entries) });
}

export async function getTodayRoutine() {
  if (DUMMY_FLAGS.dailyRoutine) {
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
          linkedWorkoutPlanId: block.linkedWorkoutPlanId ?? null,
          linkedWorkoutLabel: block.linkedWorkoutLabel ?? null,
          mealType: block.mealType ?? null,
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

export async function logRoutineBlock(body: { routineBlockId?: number; overrideBlockId?: number; date: string; status: 'completed' | 'skipped' | 'missed'; actualStartTime?: string; actualEndTime?: string }) {
  if (DUMMY_FLAGS.dailyRoutine) {
    if (!_dummyDailyRoutineStore.logsByDate[body.date]) _dummyDailyRoutineStore.logsByDate[body.date] = {};
    const key = body.routineBlockId ?? body.overrideBlockId;
    if (typeof key === 'number') {
      _dummyDailyRoutineStore.logsByDate[body.date][key] = body.status;
    }
    return Promise.resolve({ id: Date.now(), ...body });
  }
  return request('dailyroutine/logs', { method: 'POST', body: JSON.stringify(body) });
}

export async function skipTodayRoutine(date: string, reason?: string) {
  if (DUMMY_FLAGS.dailyRoutine) {
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
  if (DUMMY_FLAGS.dailyRoutine) {
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

// ─── Routine Block Templates API ──────────────────────────────────────────────

export async function getBlockTemplates() {
  return request('routineblocktemplate');
}

export async function createBlockTemplate(body: {
  title: string;
  category?: string | null;
  color?: string | null;
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
}) {
  return request('routineblocktemplate', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateBlockTemplate(id: number, body: {
  title: string;
  category?: string | null;
  color?: string | null;
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
}) {
  return request(`routineblocktemplate/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteBlockTemplate(id: number) {
  return request(`routineblocktemplate/${id}`, { method: 'DELETE' });
}

export async function getBlockTemplateStats(id: number, days = 90) {
  return request(`routineblocktemplate/${id}/stats?days=${days}`);
}

// ─── Goals API ────────────────────────────────────────────────────────────────

let DUMMY_GOALS = [
  {
    id: 1,
    title: 'Learn TypeScript',
    category: 'Learning',
    color: '#3b82f6',
    icon: '📚',
    goalType: 'milestone' as const,
    targetValue: 100,
    currentValue: 45,
    unit: 'lessons',
    deadlineDate: '2026-12-31',
    status: 'in_progress',
    progressPercent: 45,
    daysRemaining: 237,
  },
  {
    id: 2,
    title: 'Morning Routine',
    category: 'Health',
    color: '#10b981',
    icon: '🌅',
    goalType: 'checklist' as const,
    deadlineDate: null,
    status: 'in_progress',
    checklistTotal: 5,
    checklistCompleted: 3,
    progressPercent: 60,
    daysRemaining: null,
  },
  {
    id: 3,
    title: 'Save for Emergency Fund',
    category: 'Finance',
    color: '#f59e0b',
    icon: '💰',
    goalType: 'milestone' as const,
    targetValue: 50000,
    currentValue: 15000,
    unit: 'INR',
    deadlineDate: '2026-11-30',
    status: 'in_progress',
    progressPercent: 30,
    daysRemaining: 176,
  },
];

let DUMMY_CHECKLIST_ITEMS: Record<number, any[]> = {
  2: [
    { id: 1, goalId: 2, title: 'Meditate', isCompleted: true, position: 1 },
    { id: 2, goalId: 2, title: 'Exercise', isCompleted: true, position: 2 },
    { id: 3, goalId: 2, title: 'Journal', isCompleted: false, position: 3 },
    { id: 4, goalId: 2, title: 'Hydrate', isCompleted: true, position: 4 },
    { id: 5, goalId: 2, title: 'Read', isCompleted: false, position: 5 },
  ],
};

export async function getGoals() {
  if (DUMMY_FLAGS.goals) return Promise.resolve(DUMMY_GOALS);
  return request('goals');
}

export async function createGoal(body: any) {
  if (DUMMY_FLAGS.goals) {
    const newGoal = {
      id: Math.max(...DUMMY_GOALS.map(g => g.id), 0) + 1,
      ...body,
      progressPercent: body.goalType === 'milestone' ? 0 : 0,
      daysRemaining: body.deadlineDate ? Math.ceil((new Date(body.deadlineDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
      checklistTotal: body.goalType === 'checklist' ? 0 : undefined,
      checklistCompleted: body.goalType === 'checklist' ? 0 : undefined,
      currentValue: body.goalType === 'milestone' ? 0 : undefined,
    };
    DUMMY_GOALS.push(newGoal);
    if (body.goalType === 'checklist') DUMMY_CHECKLIST_ITEMS[newGoal.id] = [];
    return Promise.resolve(newGoal);
  }
  return request('goals', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateGoal(id: number, body: any) {
  if (DUMMY_FLAGS.goals) {
    const goal = DUMMY_GOALS.find(g => g.id === id);
    if (goal) Object.assign(goal, body);
    return Promise.resolve(goal);
  }
  return request(`goals/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteGoal(id: number) {
  if (DUMMY_FLAGS.goals) {
    const idx = DUMMY_GOALS.findIndex(g => g.id === id);
    if (idx >= 0) DUMMY_GOALS.splice(idx, 1);
    delete DUMMY_CHECKLIST_ITEMS[id];
    return Promise.resolve({ success: true });
  }
  return request(`goals/${id}`, { method: 'DELETE' });
}

export async function getGoalChecklistItems(goalId: number) {
  if (DUMMY_FLAGS.goals) return Promise.resolve(DUMMY_CHECKLIST_ITEMS[goalId] || []);
  return request(`goals/${goalId}/checklist-items`);
}

export async function createGoalChecklistItem(goalId: number, body: any) {
  if (DUMMY_FLAGS.goals) {
    if (!DUMMY_CHECKLIST_ITEMS[goalId]) DUMMY_CHECKLIST_ITEMS[goalId] = [];
    const items = DUMMY_CHECKLIST_ITEMS[goalId];
    const newItem = {
      id: Math.max(...items.map(i => i.id), 0) + 1,
      goalId,
      ...body,
      isCompleted: false,
      position: items.length,
    };
    items.push(newItem);
    const goal = DUMMY_GOALS.find(g => g.id === goalId);
    if (goal) {
      goal.checklistTotal = (goal.checklistTotal || 0) + 1;
      goal.progressPercent = goal.checklistTotal ? Math.round((goal.checklistCompleted || 0) * 100 / goal.checklistTotal) : 0;
    }
    return Promise.resolve(newItem);
  }
  return request(`goals/${goalId}/checklist-items`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateGoalChecklistItem(id: number, body: any) {
  if (DUMMY_FLAGS.goals) {
    for (const items of Object.values(DUMMY_CHECKLIST_ITEMS)) {
      const item = items.find(i => i.id === id);
      if (item) {
        Object.assign(item, body);
        const goal = DUMMY_GOALS.find(g => g.id === item.goalId);
        if (goal && body.isCompleted !== undefined) {
          const change = body.isCompleted ? 1 : -1;
          goal.checklistCompleted = Math.max(0, (goal.checklistCompleted || 0) + change);
          goal.progressPercent = goal.checklistTotal ? Math.round((goal.checklistCompleted) * 100 / goal.checklistTotal) : 0;
        }
        return Promise.resolve(item);
      }
    }
    return Promise.resolve(null);
  }
  return request(`goals/checklist-items/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteGoalChecklistItem(id: number) {
  if (DUMMY_FLAGS.goals) {
    for (const items of Object.values(DUMMY_CHECKLIST_ITEMS)) {
      const idx = items.findIndex(i => i.id === id);
      if (idx >= 0) {
        const item = items[idx];
        const goal = DUMMY_GOALS.find(g => g.id === item.goalId);
        if (goal) {
          goal.checklistTotal = Math.max(0, (goal.checklistTotal || 0) - 1);
          if (item.isCompleted) goal.checklistCompleted = Math.max(0, (goal.checklistCompleted || 0) - 1);
          goal.progressPercent = goal.checklistTotal ? Math.round((goal.checklistCompleted || 0) * 100 / goal.checklistTotal) : 0;
        }
        items.splice(idx, 1);
        return Promise.resolve({ success: true });
      }
    }
    return Promise.resolve({ success: true });
  }
  return request(`goals/checklist-items/${id}`, { method: 'DELETE' });
}

export async function updateGoalProgress(goalId: number, body: any) {
  if (DUMMY_FLAGS.goals) {
    const goal = DUMMY_GOALS.find(g => g.id === goalId);
    if (goal && body.valueDelta) {
      goal.currentValue = (goal.currentValue || 0) + body.valueDelta;
      goal.progressPercent = goal.targetValue ? Math.round((goal.currentValue) * 100 / goal.targetValue) : 0;
      if (goal.progressPercent >= 100) goal.status = 'completed';
    }
    return Promise.resolve(goal);
  }
  return request(`goals/${goalId}/progress`, { method: 'POST', body: JSON.stringify(body) });
}

export async function getGoalNotes(goalId: number) {
  if (DUMMY_FLAGS.goals) return Promise.resolve([]);
  return request(`goals/${goalId}/notes`);
}

export async function createGoalNote(goalId: number, body: any) {
  if (DUMMY_FLAGS.goals) return Promise.resolve({ id: 1, goalId, ...body });
  return request(`goals/${goalId}/notes`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateGoalNote(id: number, body: any) {
  if (DUMMY_FLAGS.goals) return Promise.resolve({ id, ...body });
  return request(`goals/notes/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteGoalNote(id: number) {
  if (DUMMY_FLAGS.goals) return Promise.resolve({ success: true });
  return request(`goals/notes/${id}`, { method: 'DELETE' });
}

export async function getGoalLogs(goalId: number) {
  if (DUMMY_FLAGS.goals) return Promise.resolve([]);
  return request(`goals/${goalId}/logs`);
}

export async function addGoalLog(goalId: number, body: any) {
  if (DUMMY_FLAGS.goals) return Promise.resolve({ id: 1, goalId, ...body });
  return request(`goals/${goalId}/logs`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateGoalLog(id: number, body: any) {
  if (DUMMY_FLAGS.goals) return Promise.resolve({ id, ...body });
  return request(`goals/logs/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function getFlashcards(goalId: number) {
  if (DUMMY_FLAGS.goals) return Promise.resolve([]);
  return request(`goals/${goalId}/flashcards`);
}

export async function getFlashcardReviewQueue(goalId: number) {
  if (DUMMY_FLAGS.goals) return Promise.resolve([]);
  return request(`goals/${goalId}/flashcards/review`);
}

export async function createFlashcard(goalId: number, body: any) {
  if (DUMMY_FLAGS.goals) return Promise.resolve({ id: 1, goalId, ...body });
  return request(`goals/${goalId}/flashcards`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateFlashcard(id: number, body: any) {
  if (DUMMY_FLAGS.goals) return Promise.resolve({ id, ...body });
  return request(`goals/flashcards/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteFlashcard(id: number) {
  if (DUMMY_FLAGS.goals) return Promise.resolve({ success: true });
  return request(`goals/flashcards/${id}`, { method: 'DELETE' });
}

// ─── Finance: Budget Setup API ────────────────────────────────────────────────

type FinanceFixedExpense = {
  id: string;
  name: string;
  amount: number;
  defaultAmount?: number;
  effectiveAmount?: number;
  isOverridden?: boolean;
  overrideAmount?: number | null;
};

export type FinanceBudgetProfile = {
  id: string;
  monthlyIncome: number;
  month?: number;
  year?: number;
  effectiveMonthlyIncome?: number;
  isMonthlyIncomeOverridden?: boolean;
  monthlyIncomeOverrideAmount?: number | null;
  fixedExpenses: FinanceFixedExpense[];
};

let DUMMY_FINANCE_BUDGET: FinanceBudgetProfile = {
  id: 'budget-1',
  monthlyIncome: 85000,
  fixedExpenses: [
    { id: 'fx-1', name: 'Rent', amount: 18000 },
    { id: 'fx-2', name: 'Car EMI', amount: 9000 },
    { id: 'fx-3', name: 'Education EMI', amount: 7000 },
  ],
};

let DUMMY_MONTHLY_INCOME_OVERRIDES: Array<{ month: number; year: number; amount: number }> = [];
let DUMMY_FIXED_EXPENSE_OVERRIDES: Array<{ fixedExpenseId: string; month: number; year: number; amount: number }> = [];

function withBudgetOverrides(profile: FinanceBudgetProfile, month?: number, year?: number): FinanceBudgetProfile {
  if (!month || !year) {
    return {
      ...profile,
      month,
      year,
      effectiveMonthlyIncome: profile.monthlyIncome,
      isMonthlyIncomeOverridden: false,
      monthlyIncomeOverrideAmount: null,
      fixedExpenses: profile.fixedExpenses.map((expense) => ({
        ...expense,
        amount: expense.amount,
        defaultAmount: expense.amount,
        effectiveAmount: expense.amount,
        isOverridden: false,
        overrideAmount: null,
      })),
    };
  }

  const incomeOverride = DUMMY_MONTHLY_INCOME_OVERRIDES.find((x) => x.month === month && x.year === year);
  return {
    ...profile,
    month,
    year,
    effectiveMonthlyIncome: incomeOverride?.amount ?? profile.monthlyIncome,
    isMonthlyIncomeOverridden: Boolean(incomeOverride),
    monthlyIncomeOverrideAmount: incomeOverride?.amount ?? null,
    fixedExpenses: profile.fixedExpenses.map((expense) => {
      const fxOverride = DUMMY_FIXED_EXPENSE_OVERRIDES.find(
        (x) => x.fixedExpenseId === expense.id && x.month === month && x.year === year
      );
      const effectiveAmount = fxOverride?.amount ?? expense.amount;
      return {
        ...expense,
        amount: effectiveAmount,
        defaultAmount: expense.amount,
        effectiveAmount,
        isOverridden: Boolean(fxOverride),
        overrideAmount: fxOverride?.amount ?? null,
      };
    }),
  };
}

export async function getFinanceBudgetProfile(month?: number, year?: number) {
  if (DUMMY_FLAGS.finance) return Promise.resolve(withBudgetOverrides(DUMMY_FINANCE_BUDGET, month, year));

  const userId = getSessionUserId();
  const params = new URLSearchParams();
  if (userId) params.set('userId', String(userId));
  if (typeof month === 'number' && typeof year === 'number') {
    params.set('month', String(month));
    params.set('year', String(year));
  }
  const query = params.toString();
  return request(`financialbudget${query ? `?${query}` : ''}`);
}

export async function updateFinanceMonthlyIncome(monthlyIncome: number) {
  if (DUMMY_FLAGS.finance) {
    DUMMY_FINANCE_BUDGET = { ...DUMMY_FINANCE_BUDGET, monthlyIncome };
    return Promise.resolve(withBudgetOverrides(DUMMY_FINANCE_BUDGET));
  }
  const userId = getSessionUserId();
  return request(`financialbudget${userId ? `?userId=${userId}` : ''}`, { method: 'PUT', body: JSON.stringify({ monthlyIncome }) });
}

export async function addFinanceFixedExpense(name: string, amount: number) {
  if (DUMMY_FLAGS.finance) {
    const entry = { id: `fx-${Date.now()}`, name, amount };
    DUMMY_FINANCE_BUDGET = {
      ...DUMMY_FINANCE_BUDGET,
      fixedExpenses: [...DUMMY_FINANCE_BUDGET.fixedExpenses, entry],
    };
    return Promise.resolve(withBudgetOverrides(DUMMY_FINANCE_BUDGET));
  }
  const userId = getSessionUserId();
  return request(`financialbudget/fixed-expenses${userId ? `?userId=${userId}` : ''}`, {
    method: 'POST',
    body: JSON.stringify({ name, amount }),
  });
}

export async function deleteFinanceFixedExpense(id: string) {
  if (DUMMY_FLAGS.finance) {
    DUMMY_FINANCE_BUDGET = {
      ...DUMMY_FINANCE_BUDGET,
      fixedExpenses: DUMMY_FINANCE_BUDGET.fixedExpenses.filter(f => f.id !== id),
    };
    DUMMY_FIXED_EXPENSE_OVERRIDES = DUMMY_FIXED_EXPENSE_OVERRIDES.filter((x) => x.fixedExpenseId !== id);
    return Promise.resolve(withBudgetOverrides(DUMMY_FINANCE_BUDGET));
  }
  const userId = getSessionUserId();
  return request(`financialbudget/fixed-expenses/${id}${userId ? `?userId=${userId}` : ''}`, { method: 'DELETE' });
}

export async function upsertFinanceMonthlyIncomeOverride(month: number, year: number, amount: number) {
  if (DUMMY_FLAGS.finance) {
    const existing = DUMMY_MONTHLY_INCOME_OVERRIDES.find((x) => x.month === month && x.year === year);
    if (existing) {
      existing.amount = amount;
    } else {
      DUMMY_MONTHLY_INCOME_OVERRIDES.push({ month, year, amount });
    }
    return Promise.resolve(withBudgetOverrides(DUMMY_FINANCE_BUDGET, month, year));
  }
  const userId = getSessionUserId();
  return request(`financialbudget/monthly-income-override${userId ? `?userId=${userId}` : ''}`, {
    method: 'PUT',
    body: JSON.stringify({ month, year, amount }),
  });
}

export async function deleteFinanceMonthlyIncomeOverride(month: number, year: number) {
  if (DUMMY_FLAGS.finance) {
    DUMMY_MONTHLY_INCOME_OVERRIDES = DUMMY_MONTHLY_INCOME_OVERRIDES.filter((x) => !(x.month === month && x.year === year));
    return Promise.resolve(withBudgetOverrides(DUMMY_FINANCE_BUDGET, month, year));
  }
  const userId = getSessionUserId();
  return request(`financialbudget/monthly-income-override?month=${month}&year=${year}${userId ? `&userId=${userId}` : ''}`, {
    method: 'DELETE',
  });
}

export async function upsertFinanceFixedExpenseOverride(fixedExpenseId: string, month: number, year: number, amount: number) {
  if (DUMMY_FLAGS.finance) {
    const existing = DUMMY_FIXED_EXPENSE_OVERRIDES.find(
      (x) => x.fixedExpenseId === fixedExpenseId && x.month === month && x.year === year
    );
    if (existing) {
      existing.amount = amount;
    } else {
      DUMMY_FIXED_EXPENSE_OVERRIDES.push({ fixedExpenseId, month, year, amount });
    }
    return Promise.resolve(withBudgetOverrides(DUMMY_FINANCE_BUDGET, month, year));
  }
  const userId = getSessionUserId();
  return request(`financialbudget/fixed-expenses/${fixedExpenseId}/override${userId ? `?userId=${userId}` : ''}`, {
    method: 'PUT',
    body: JSON.stringify({ month, year, amount }),
  });
}

export async function deleteFinanceFixedExpenseOverride(fixedExpenseId: string, month: number, year: number) {
  if (DUMMY_FLAGS.finance) {
    DUMMY_FIXED_EXPENSE_OVERRIDES = DUMMY_FIXED_EXPENSE_OVERRIDES.filter(
      (x) => !(x.fixedExpenseId === fixedExpenseId && x.month === month && x.year === year)
    );
    return Promise.resolve(withBudgetOverrides(DUMMY_FINANCE_BUDGET, month, year));
  }
  const userId = getSessionUserId();
  return request(`financialbudget/fixed-expenses/${fixedExpenseId}/override?month=${month}&year=${year}${userId ? `&userId=${userId}` : ''}`, {
    method: 'DELETE',
  });
}

// ─── Finance: Buckets API ──────────────────────────────────────────────────────

export interface BucketContribution {
  id: string | number;
  date: string;
  amount: number;
  note?: string;
}

export interface Bucket {
  id: string | number;
  name: string;
  icon: string;
  target: number;
  current: number;
  color: string;
  frequency: 'monthly' | 'weekly' | 'quarterly';
  periodMonths: number;
  investedIn: string;
  contributions: BucketContribution[];
}

function normalizeBucket(raw: any): Bucket {
  return {
    id: raw.id,
    name: raw.name || 'Bucket',
    icon: raw.icon || '🪣',
    target: Number(raw.target ?? raw.targetAmount ?? 0),
    current: Number(raw.current ?? raw.currentAmount ?? 0),
    color: raw.color || raw.colorHex || '#4ECDC4',
    frequency: (raw.frequency || 'monthly') as Bucket['frequency'],
    periodMonths: Number(raw.periodMonths || 0),
    investedIn: raw.investedIn || '',
    contributions: Array.isArray(raw.contributions)
      ? raw.contributions.map((c: any) => ({
          id: c.id,
          date: c.date || c.contributionDate || new Date().toISOString().split('T')[0],
          amount: Number(c.amount || 0),
          note: c.note || '',
        }))
      : [],
  };
}

let DUMMY_BUCKETS: Bucket[] = [
  {
    id: 1, name: 'Emergency Fund', icon: '🛡️', target: 200000, current: 148000, color: '#4ECDC4',
    frequency: 'monthly', periodMonths: 20, investedIn: 'Liquid Fund - HDFC',
    contributions: [
      { id: 1, date: '2026-03-01', amount: 10000, note: 'March SIP' },
      { id: 2, date: '2026-04-01', amount: 8000, note: 'April - partial' },
      { id: 3, date: '2026-05-01', amount: 10000, note: 'May SIP' },
    ],
  },
  {
    id: 2, name: 'Vacation — Goa', icon: '🏖️', target: 50000, current: 22500, color: '#FFD93D',
    frequency: 'monthly', periodMonths: 10, investedIn: 'Savings Account',
    contributions: [
      { id: 4, date: '2026-03-15', amount: 5000, note: '' },
      { id: 5, date: '2026-04-15', amount: 5000, note: '' },
    ],
  },
  {
    id: 3, name: 'New Phone', icon: '📱', target: 80000, current: 40000, color: '#6C63FF',
    frequency: 'monthly', periodMonths: 10, investedIn: 'Nifty BeES ETF',
    contributions: [
      { id: 6, date: '2026-02-01', amount: 8000, note: '' },
      { id: 7, date: '2026-03-01', amount: 7000, note: 'Less this month' },
      { id: 8, date: '2026-04-01', amount: 8000, note: '' },
    ],
  },
  {
    id: 4, name: 'Car Service', icon: '🔧', target: 15000, current: 9200, color: '#FF6B6B',
    frequency: 'monthly', periodMonths: 5, investedIn: 'Savings Account',
    contributions: [
      { id: 9, date: '2026-03-01', amount: 3000, note: '' },
      { id: 10, date: '2026-04-01', amount: 3000, note: '' },
    ],
  },
];

export async function getBuckets() {
  if (DUMMY_FLAGS.finance) return Promise.resolve(DUMMY_BUCKETS);
  const userId = getSessionUserId();
  const rows = await request(`financialbuckets${userId ? `?userId=${userId}` : ''}`);
  return Array.isArray(rows) ? rows.map(normalizeBucket) : [];
}

export async function getBucketById(id: string | number) {
  if (DUMMY_FLAGS.finance) return Promise.resolve(DUMMY_BUCKETS.find(b => b.id === id) ?? null);
  const userId = getSessionUserId();
  const row = await request(`financialbuckets/${id}${userId ? `?userId=${userId}` : ''}`);
  return row ? normalizeBucket(row) : null;
}

export async function createBucket(body: any) {
  if (DUMMY_FLAGS.finance) {
    const nextId = Math.max(...DUMMY_BUCKETS.map(b => Number(b.id) || 0), 0) + 1;
    const b: Bucket = { id: nextId, contributions: [], ...body };
    DUMMY_BUCKETS.push(b);
    return Promise.resolve(b);
  }
  const userId = getSessionUserId();
  const payload = {
    name: body.name,
    category: body.category || 'MISCELLANEOUS',
    monthlyTarget: Number(body.monthlyTarget ?? body.target ?? 0),
    targetAmount: Number(body.targetAmount ?? body.target ?? 0),
    currentAmount: Number(body.currentAmount ?? body.current ?? 0),
    frequency: body.frequency || 'monthly',
    periodMonths: Number(body.periodMonths || 0),
    investedIn: body.investedIn || null,
    colorHex: body.colorHex || body.color || null,
    icon: body.icon || null,
    sortOrder: Number(body.sortOrder || 0),
  };
  const created = await request(`financialbuckets${userId ? `?userId=${userId}` : ''}`, { method: 'POST', body: JSON.stringify(payload) });
  return normalizeBucket(created);
}

export async function updateBucket(id: string | number, body: any) {
  if (DUMMY_FLAGS.finance) {
    const b = DUMMY_BUCKETS.find(b => b.id === id);
    if (b) Object.assign(b, body);
    return Promise.resolve(b);
  }
  const userId = getSessionUserId();
  const payload = {
    name: body.name,
    category: body.category,
    monthlyTarget: body.monthlyTarget ?? body.target,
    targetAmount: body.targetAmount ?? body.target,
    currentAmount: body.currentAmount ?? body.current,
    frequency: body.frequency,
    periodMonths: body.periodMonths,
    investedIn: body.investedIn,
    colorHex: body.colorHex ?? body.color,
    icon: body.icon,
    sortOrder: body.sortOrder,
  };
  const updated = await request(`financialbuckets/${id}${userId ? `?userId=${userId}` : ''}`, { method: 'PUT', body: JSON.stringify(payload) });
  return updated ? normalizeBucket(updated) : null;
}

export async function deleteBucket(id: string | number) {
  if (DUMMY_FLAGS.finance) {
    const idx = DUMMY_BUCKETS.findIndex(b => b.id === id);
    if (idx >= 0) DUMMY_BUCKETS.splice(idx, 1);
    return Promise.resolve({ success: true });
  }
  const userId = getSessionUserId();
  return request(`financialbuckets/${id}${userId ? `?userId=${userId}` : ''}`, { method: 'DELETE' });
}

export async function addToBucket(id: string | number, amount: number) {
  return addContribution(id, amount);
}

export async function addContribution(bucketId: string | number, amount: number, note?: string) {
  if (DUMMY_FLAGS.finance) {
    const b = DUMMY_BUCKETS.find(b => b.id === bucketId);
    if (!b) return null;
    const allIds = DUMMY_BUCKETS.flatMap(bk => bk.contributions.map(c => Number(c.id) || 0));
    const newId = allIds.length ? Math.max(...allIds) + 1 : 1;
    const contrib: BucketContribution = { id: newId, date: new Date().toISOString().split('T')[0], amount, note: note || '' };
    b.contributions.push(contrib);
    b.current = b.contributions.reduce((s, c) => s + c.amount, 0);
    return Promise.resolve({ bucket: b, contribution: contrib });
  }
  const userId = getSessionUserId();
  const updated = await request(`financialbuckets/${bucketId}/contributions${userId ? `?userId=${userId}` : ''}`, { method: 'POST', body: JSON.stringify({ amount, note }) });
  return updated ? normalizeBucket(updated) : null;
}

export async function deleteContribution(bucketId: string | number, contributionId: string | number) {
  if (DUMMY_FLAGS.finance) {
    const b = DUMMY_BUCKETS.find(b => b.id === bucketId);
    if (!b) return null;
    b.contributions = b.contributions.filter(c => c.id !== contributionId);
    b.current = b.contributions.reduce((s, c) => s + c.amount, 0);
    return Promise.resolve({ bucket: b });
  }
  const userId = getSessionUserId();
  const updated = await request(`financialbuckets/${bucketId}/contributions/${contributionId}${userId ? `?userId=${userId}` : ''}`, { method: 'DELETE' });
  return updated ? normalizeBucket(updated) : null;
}

export async function withdrawFromBucket(id: number, amount: number) {
  if (DUMMY_FLAGS.finance) {
    const b = DUMMY_BUCKETS.find(b => b.id === id);
    if (b) b.current = Math.max(0, b.current - amount);
    return Promise.resolve(b);
  }
  return request(`financialbuckets/${id}/withdraw`, { method: 'POST', body: JSON.stringify({ amount }) });
}

// ─── Finance: Investments API ──────────────────────────────────────────────────

let DUMMY_INVESTMENTS = [
  { id: 1, name: 'Nifty BeES', type: 'ETF', invested: 50000, current: 62800, change: 25.6 },
  { id: 2, name: 'ICICI Bank', type: 'Stock', invested: 30000, current: 34200, change: 14.0 },
  { id: 3, name: 'Parag Parikh FoF', type: 'MF', invested: 80000, current: 96400, change: 20.5 },
  { id: 4, name: 'Gold BeES', type: 'ETF', invested: 20000, current: 23100, change: 15.5 },
];

export async function getInvestments() {
  if (DUMMY_FLAGS.finance) return Promise.resolve(DUMMY_INVESTMENTS);
  const buckets = await getBuckets();
  return (buckets || []).map((b: any) => {
    const invested = Number(b.target || 0);
    const current = Number(b.current || 0);
    const change = invested > 0 ? Number((((current - invested) / invested) * 100).toFixed(1)) : 0;
    return {
      id: b.id,
      name: b.name,
      type: b.investedIn || 'Investment',
      invested,
      current,
      change,
    };
  });
}

export async function createInvestment(body: any) {
  if (DUMMY_FLAGS.finance) {
    const inv = { id: Math.max(...DUMMY_INVESTMENTS.map(i => i.id), 0) + 1, change: 0, ...body };
    DUMMY_INVESTMENTS.push(inv);
    return Promise.resolve(inv);
  }
  const created = await createBucket({
    name: body.name,
    category: 'WEALTH',
    target: Number(body.invested || 0),
    current: Number(body.current || 0),
    frequency: 'monthly',
    periodMonths: 12,
    investedIn: body.type || 'Investment',
    icon: '📈',
    color: '#4ECDC4',
  });
  const invested = Number(body.invested || 0);
  const current = Number(body.current || 0);
  return {
    id: created.id,
    name: created.name,
    type: body.type || 'Investment',
    invested,
    current,
    change: invested > 0 ? Number((((current - invested) / invested) * 100).toFixed(1)) : 0,
  };
}

export async function updateInvestment(id: string | number, body: any) {
  if (DUMMY_FLAGS.finance) {
    const inv = DUMMY_INVESTMENTS.find(i => i.id === id);
    if (inv) {
      Object.assign(inv, body);
      const newChange = ((inv.current - inv.invested) / inv.invested) * 100;
      inv.change = parseFloat(newChange.toFixed(1));
    }
    return Promise.resolve(inv);
  }
  await updateBucket(id, {
    name: body.name,
    category: 'WEALTH',
    target: Number(body.invested || 0),
    current: Number(body.current || 0),
    investedIn: body.type || 'Investment',
  });
  const invested = Number(body.invested || 0);
  const current = Number(body.current || 0);
  return {
    id,
    name: body.name,
    type: body.type || 'Investment',
    invested,
    current,
    change: invested > 0 ? Number((((current - invested) / invested) * 100).toFixed(1)) : 0,
  };
}

export async function deleteInvestment(id: string | number) {
  if (DUMMY_FLAGS.finance) {
    const idx = DUMMY_INVESTMENTS.findIndex(i => i.id === id);
    if (idx >= 0) DUMMY_INVESTMENTS.splice(idx, 1);
    return Promise.resolve({ success: true });
  }
  return deleteBucket(id);
}

// ─── Vehicles API ──────────────────────────────────────────────────────────────

export type Refill = { id: number; date: string; litres: number; amount: number; odometer: number; mileage?: number };
export type ServiceLog = { id: number; date: string; items: string[]; cost: number; nextDue?: string; odometer?: number };
export type IssueLog = { id: number; date: string; description: string; resolved: boolean };
export type Vehicle = { id: number; name: string; make: string; model: string; year: number; regNo: string; fuelType: string; color: string; odometer: number; refills: Refill[]; services: ServiceLog[]; issues: IssueLog[] };

let DUMMY_VEHICLES: Vehicle[] = [
  {
    id: 1, name: 'Daily Driver', make: 'Maruti', model: 'Baleno', year: 2022,
    regNo: 'KA-01-AB-1234', fuelType: 'Petrol', color: '#6C63FF', odometer: 28450,
    refills: [
      { id: 1, date: '2026-05-05', litres: 35.2, amount: 3450, odometer: 28450, mileage: 16.2 },
      { id: 2, date: '2026-04-20', litres: 33.8, amount: 3310, odometer: 27880, mileage: 15.9 },
      { id: 3, date: '2026-04-08', litres: 36.0, amount: 3528, odometer: 27340, mileage: 16.4 },
      { id: 4, date: '2026-03-22', litres: 34.5, amount: 3381, odometer: 26750, mileage: 15.7 },
    ],
    services: [
      { id: 1, date: '2026-03-15', items: ['Engine Oil', 'Oil Filter', 'Air Filter', 'AC Service'], cost: 8500, nextDue: '2026-09-15', odometer: 26000 },
      { id: 2, date: '2025-09-10', items: ['Engine Oil', 'Oil Filter'], cost: 3800, nextDue: '2026-03-10', odometer: 20000 },
    ],
    issues: [
      { id: 1, date: '2026-04-28', description: 'Unusual noise from front left wheel at low speed', resolved: false },
      { id: 2, date: '2026-03-05', description: 'AC not cooling properly', resolved: true },
      { id: 3, date: '2026-02-10', description: 'Rear wiper not working', resolved: true },
    ],
  },
];

function findVehicle(id: number) { return DUMMY_VEHICLES.find(v => v.id === id); }

export async function getVehicles() {
  if (DUMMY_FLAGS.vehicles) return Promise.resolve(DUMMY_VEHICLES);
  return request('vehicles');
}

export async function createVehicle(body: any) {
  if (DUMMY_FLAGS.vehicles) {
    const v: Vehicle = { id: Math.max(...DUMMY_VEHICLES.map(v => v.id), 0) + 1, refills: [], services: [], issues: [], ...body };
    DUMMY_VEHICLES.push(v);
    return Promise.resolve(v);
  }
  return request('vehicles', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateVehicle(id: number, body: any) {
  if (DUMMY_FLAGS.vehicles) {
    const v = findVehicle(id);
    if (v) Object.assign(v, body);
    return Promise.resolve(v);
  }
  return request(`vehicles/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteVehicle(id: number) {
  if (DUMMY_FLAGS.vehicles) {
    DUMMY_VEHICLES = DUMMY_VEHICLES.filter(v => v.id !== id);
    return Promise.resolve({ success: true });
  }
  return request(`vehicles/${id}`, { method: 'DELETE' });
}

export async function addRefill(vehicleId: number, body: Omit<Refill, 'id'>) {
  if (DUMMY_FLAGS.vehicles) {
    const v = findVehicle(vehicleId);
    if (!v) throw new Error('Vehicle not found');
    const prev = v.refills[0];
    const mileage = prev ? parseFloat(((v.odometer - prev.odometer) / (body.litres || 1)).toFixed(1)) : undefined;
    const r: Refill = { id: Math.max(...v.refills.map(r => r.id), 0) + 1, mileage, ...body };
    v.refills.unshift(r);
    v.odometer = Math.max(v.odometer, body.odometer);
    return Promise.resolve(r);
  }
  return request(`vehicles/${vehicleId}/refills`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateRefill(vehicleId: number, refillId: number, body: Partial<Refill>) {
  if (DUMMY_FLAGS.vehicles) {
    const v = findVehicle(vehicleId);
    const r = v?.refills.find(r => r.id === refillId);
    if (r) Object.assign(r, body);
    return Promise.resolve(r);
  }
  return request(`vehicles/${vehicleId}/refills/${refillId}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteRefill(vehicleId: number, refillId: number) {
  if (DUMMY_FLAGS.vehicles) {
    const v = findVehicle(vehicleId);
    if (v) v.refills = v.refills.filter(r => r.id !== refillId);
    return Promise.resolve({ success: true });
  }
  return request(`vehicles/${vehicleId}/refills/${refillId}`, { method: 'DELETE' });
}

export async function addService(vehicleId: number, body: Omit<ServiceLog, 'id'>) {
  if (DUMMY_FLAGS.vehicles) {
    const v = findVehicle(vehicleId);
    if (!v) throw new Error('Vehicle not found');
    const s: ServiceLog = { id: Math.max(...v.services.map(s => s.id), 0) + 1, ...body };
    v.services.unshift(s);
    return Promise.resolve(s);
  }
  return request(`vehicles/${vehicleId}/services`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateService(vehicleId: number, serviceId: number, body: Partial<ServiceLog>) {
  if (DUMMY_FLAGS.vehicles) {
    const v = findVehicle(vehicleId);
    const s = v?.services.find(s => s.id === serviceId);
    if (s) Object.assign(s, body);
    return Promise.resolve(s);
  }
  return request(`vehicles/${vehicleId}/services/${serviceId}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteService(vehicleId: number, serviceId: number) {
  if (DUMMY_FLAGS.vehicles) {
    const v = findVehicle(vehicleId);
    if (v) v.services = v.services.filter(s => s.id !== serviceId);
    return Promise.resolve({ success: true });
  }
  return request(`vehicles/${vehicleId}/services/${serviceId}`, { method: 'DELETE' });
}

// Backward-compatible aliases used by SettingsVehicles
export async function addServiceLog(vehicleId: number, body: Partial<ServiceLog> & { type?: string; notes?: string; cost?: number; date?: string }) {
  const items = body.items && body.items.length > 0
    ? body.items
    : body.type
      ? [body.type]
      : [];
  return addService(vehicleId, {
    date: body.date || new Date().toISOString(),
    items,
    cost: Number(body.cost || 0),
    nextDue: body.nextDue,
    odometer: body.odometer,
  });
}

export async function deleteServiceLog(vehicleId: number, serviceId: number) {
  return deleteService(vehicleId, serviceId);
}

export async function addIssue(vehicleId: number, body: Omit<IssueLog, 'id'>) {
  if (DUMMY_FLAGS.vehicles) {
    const v = findVehicle(vehicleId);
    if (!v) throw new Error('Vehicle not found');
    const issue: IssueLog = { id: Math.max(...v.issues.map(i => i.id), 0) + 1, ...body };
    v.issues.unshift(issue);
    return Promise.resolve(issue);
  }
  return request(`vehicles/${vehicleId}/issues`, { method: 'POST', body: JSON.stringify(body) });
}

export async function resolveIssue(vehicleId: number, issueId: number, resolved: boolean) {
  if (DUMMY_FLAGS.vehicles) {
    const v = findVehicle(vehicleId);
    const issue = v?.issues.find(i => i.id === issueId);
    if (issue) issue.resolved = resolved;
    return Promise.resolve(issue);
  }
  return request(`vehicles/${vehicleId}/issues/${issueId}/resolve`, { method: 'POST', body: JSON.stringify({ resolved }) });
}

export async function deleteIssue(vehicleId: number, issueId: number) {
  if (DUMMY_FLAGS.vehicles) {
    const v = findVehicle(vehicleId);
    if (v) v.issues = v.issues.filter(i => i.id !== issueId);
    return Promise.resolve({ success: true });
  }
  return request(`vehicles/${vehicleId}/issues/${issueId}`, { method: 'DELETE' });
}

// Backward-compatible aliases used by SettingsVehicles
export async function addIssueLog(vehicleId: number, body: Partial<IssueLog> & { description: string; severity?: string; date?: string }) {
  return addIssue(vehicleId, {
    date: body.date || new Date().toISOString(),
    description: body.description,
    resolved: false,
  });
}

export async function deleteIssueLog(vehicleId: number, issueId: number) {
  return deleteIssue(vehicleId, issueId);
}

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
export async function createJournalEntry(body: any) {
  return request('journal', { method: 'POST', body: JSON.stringify(body) });
}
export async function updateJournalEntry(id: number, body: any) {
  return request(`journal/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}
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
  if (DUMMY_FLAGS.meals) return Promise.resolve(DUMMY_MEAL_INGREDIENTS);
  return request('meal/ingredients');
}

export async function createMealIngredient(body: any) {
  if (DUMMY_FLAGS.meals) {
    const newIngredient = { id: Math.max(...DUMMY_MEAL_INGREDIENTS.map(i => i.id), 0) + 1, ...body, createdAt: new Date().toISOString() };
    DUMMY_MEAL_INGREDIENTS.push(newIngredient);
    return Promise.resolve(newIngredient);
  }
  return request('meal/ingredients', { method: 'POST', body: JSON.stringify(body) });
}

export async function deleteMealIngredient(id: number) {
  if (DUMMY_FLAGS.meals) {
    const idx = DUMMY_MEAL_INGREDIENTS.findIndex(i => i.id === id);
    if (idx >= 0) DUMMY_MEAL_INGREDIENTS.splice(idx, 1);
    return Promise.resolve({ success: true });
  }
  return request(`meal/ingredients/${id}`, { method: 'DELETE' });
}

export async function updateMealIngredient(id: number, body: any) {
  if (DUMMY_FLAGS.meals) {
    const item = DUMMY_MEAL_INGREDIENTS.find(i => i.id === id);
    if (item) Object.assign(item, body);
    return Promise.resolve(item);
  }
  return request(`meal/ingredients/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

/**
 * Meal API Functions
 * 
 * Weekly Plan JSON Format:
 * {
 *   "2026-05-13": [
 *     { "mealTemplateId": 1, "timeOfDay": "06:30" },
 *     { "mealTemplateId": 3, "timeOfDay": "08:00" }
 *   ]
 * }
 * - mealTemplateId (int): Reference to MealTemplate.id
 * - timeOfDay (string, optional): Override time in HH:MM format. If omitted, uses template's default.
 */

export async function getMealTemplates() {
  if (DUMMY_FLAGS.meals) return Promise.resolve(DUMMY_MEAL_TEMPLATES);
  return request('meal/templates');
}

export async function createMealTemplate(body: any) {
  if (DUMMY_FLAGS.meals) {
    const newTemplate = { id: Math.max(...DUMMY_MEAL_TEMPLATES.map(m => m.id), 0) + 1, ...body, createdAt: new Date().toISOString() };
    DUMMY_MEAL_TEMPLATES.push(newTemplate);
    return Promise.resolve(newTemplate);
  }
  return request('meal/templates', { method: 'POST', body: JSON.stringify(body) });
}

export async function deleteMealTemplate(id: number) {
  if (DUMMY_FLAGS.meals) {
    const idx = DUMMY_MEAL_TEMPLATES.findIndex(m => m.id === id);
    if (idx >= 0) DUMMY_MEAL_TEMPLATES.splice(idx, 1);
    return Promise.resolve({ success: true });
  }
  return request(`meal/templates/${id}`, { method: 'DELETE' });
}

export async function updateMealTemplate(id: number, body: any) {
  if (DUMMY_FLAGS.meals) {
    const item = DUMMY_MEAL_TEMPLATES.find(m => m.id === id);
    if (item) Object.assign(item, body);
    return Promise.resolve(item);
  }
  return request(`meal/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function getMealCatalog(filters?: {
  search?: string;
  timing?: string;
  minCost?: number;
  maxCost?: number;
  minCalories?: number;
  maxCalories?: number;
  minProtein?: number;
  maxProtein?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.timing) params.append('timing', filters.timing);
  if (filters?.minCost !== undefined) params.append('minCost', filters.minCost.toString());
  if (filters?.maxCost !== undefined) params.append('maxCost', filters.maxCost.toString());
  if (filters?.minCalories !== undefined) params.append('minCalories', filters.minCalories.toString());
  if (filters?.maxCalories !== undefined) params.append('maxCalories', filters.maxCalories.toString());
  if (filters?.minProtein !== undefined) params.append('minProtein', filters.minProtein.toString());
  if (filters?.maxProtein !== undefined) params.append('maxProtein', filters.maxProtein.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`meal/catalog${query}`);
}

export async function addMealFromCatalog(masterMealTemplateId: number) {
  return request('meal/templates/add-from-catalog', {
    method: 'POST',
    body: JSON.stringify({ masterMealTemplateId }),
  });
}

export async function getWeeklyMealPlan() {
  if (DUMMY_FLAGS.meals) return Promise.resolve(DUMMY_WEEKLY_MEAL_PLAN);
  return request('meal/plan');
}

export async function upsertWeeklyMealPlan(planJson: string) {
  if (DUMMY_FLAGS.meals) {
    DUMMY_WEEKLY_MEAL_PLAN.planJson = planJson;
    return Promise.resolve(DUMMY_WEEKLY_MEAL_PLAN);
  }
  return request('meal/plan', {
    method: 'PUT',
    body: JSON.stringify({
      planJson,
      PlanJson: planJson,
      plan_json: planJson,
    }),
  });
}

export async function copyLastWeekMealPlan(sourceDate: string, targetDate?: string) {
  if (DUMMY_FLAGS.meals) {
    return Promise.resolve(DUMMY_WEEKLY_MEAL_PLAN);
  }
  return request('meal/plan/copy-last-week', {
    method: 'POST',
    body: JSON.stringify({
      sourceDate,
      targetDate,
      SourceDate: sourceDate,
      TargetDate: targetDate,
    }),
  });
}

const DUMMY_DAILY_MEAL_LOGS: Record<string, number[]> = {};

export async function getDailyMealLog(date: string) {
  if (DUMMY_FLAGS.meals) {
    return Promise.resolve({ date, mealIds: [...(DUMMY_DAILY_MEAL_LOGS[date] || [])] });
  }
  return request(`meal/logs/${date}`);
}

export async function upsertDailyMealLog(date: string, mealIds: number[]) {
  if (DUMMY_FLAGS.meals) {
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
  if (DUMMY_FLAGS.water) {
    const log = DUMMY_DAILY_WATER_LOGS[key];
    return Promise.resolve(log || { date: key, mlConsumed: 0, goalMl: 2000, unit: 'ml' as const });
  }
  return request(`water/logs?date=${encodeURIComponent(key)}`);
}

export async function logWaterIntake(date: string, ml: number, goalMl: number = 2000) {
  const key = asDateKey(date);
  if (DUMMY_FLAGS.water) {
    DUMMY_DAILY_WATER_LOGS[key] = { date: key, mlConsumed: Math.max(0, ml), goalMl, unit: 'ml' as const };
    return Promise.resolve(DUMMY_DAILY_WATER_LOGS[key]);
  }
  return request('water/logs', { method: 'POST', body: JSON.stringify({ date: key, mlConsumed: ml, goalMl }) });
}

export async function incrementWaterIntake(date: string, incrementMl: number = 250) {
  const key = asDateKey(date);
  if (DUMMY_FLAGS.water) {
    const current = DUMMY_DAILY_WATER_LOGS[key] || { date: key, mlConsumed: 0, goalMl: 2000, unit: 'ml' as const };
    const next = { ...current, mlConsumed: Math.max(0, current.mlConsumed + incrementMl) };
    DUMMY_DAILY_WATER_LOGS[key] = next;
    return Promise.resolve(next);
  }
  return request('water/logs/increment', { method: 'POST', body: JSON.stringify({ date: key, incrementMl }) });
}

// ─── Task Logging for Quick Log ────────────────────────────────────────────
// Tasks logged via Quick Log are stored as quick log entries, not as full task records

// ─── Body Metrics API ─────────────────────────────────────────────────────────

export type BodyWeightLog = { date: string; weightKg: number; note?: string };
export type BodyMetricsProfile = { heightCm: number | null; targetWeightKg: number | null };

// Seed dummy weight logs for the last 30 days to show a nice chart
function buildDummyWeightLogs(): Record<string, BodyWeightLog> {
  const logs: Record<string, BodyWeightLog> = {};
  const today = new Date();
  let w = 78.5;
  for (let i = 30; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Skip a few days randomly to make it realistic
    if (i % 4 === 3) continue;
    w = Math.round((w + (Math.random() - 0.52) * 0.4) * 10) / 10;
    const key = asDateKey(d.toISOString());
    logs[key] = { date: key, weightKg: w };
  }
  return logs;
}

let _dummyWeightLogs: Record<string, BodyWeightLog> | null = null;
function getDummyWeightLogs() {
  if (!_dummyWeightLogs) _dummyWeightLogs = buildDummyWeightLogs();
  return _dummyWeightLogs;
}

let _dummyBodyProfile: BodyMetricsProfile = { heightCm: 175, targetWeightKg: 74.0 };

export async function getBodyMetricsProfile(): Promise<BodyMetricsProfile> {
  if (DUMMY_FLAGS.bodyMetrics) return Promise.resolve({ ..._dummyBodyProfile });
  return request('bodymetrics/profile');
}

export async function updateBodyMetricsProfile(data: Partial<BodyMetricsProfile>): Promise<BodyMetricsProfile> {
  if (DUMMY_FLAGS.bodyMetrics) {
    _dummyBodyProfile = { ..._dummyBodyProfile, ...data };
    return Promise.resolve({ ..._dummyBodyProfile });
  }
  return request('bodymetrics/profile', { method: 'PUT', body: JSON.stringify(data) });
}

export async function getBodyWeightLogs(from?: string, to?: string): Promise<BodyWeightLog[]> {
  if (DUMMY_FLAGS.bodyMetrics) {
    const logs = getDummyWeightLogs();
    return Promise.resolve(
      Object.values(logs)
        .filter(l => (!from || l.date >= from) && (!to || l.date <= to))
        .sort((a, b) => a.date.localeCompare(b.date))
    );
  }
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return request(`bodymetrics/weight-logs?${params.toString()}`);
}

export async function logBodyWeight(weightKg: number, date?: string, note?: string): Promise<BodyWeightLog> {
  const key = date ? asDateKey(date) : asDateKey(new Date().toISOString());
  if (DUMMY_FLAGS.bodyMetrics) {
    const logs = getDummyWeightLogs();
    logs[key] = { date: key, weightKg, note };
    return Promise.resolve(logs[key]);
  }
  return request('bodymetrics/weight-logs', {
    method: 'POST',
    body: JSON.stringify({ weightKg, date: key, note }),
  });
}

export async function deleteBodyWeightLog(date: string): Promise<void> {
  const key = asDateKey(date);
  if (DUMMY_FLAGS.bodyMetrics) {
    const logs = getDummyWeightLogs();
    delete logs[key];
    return Promise.resolve();
  }
  return request(`bodymetrics/weight-logs/${key}`, { method: 'DELETE' });
}

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
  if (DUMMY_FLAGS.quickLog) {
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
  if (DUMMY_FLAGS.quickLog) {
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
  if (DUMMY_FLAGS.quickLog) {
    const idx = DUMMY_QUICK_LOG_ENTRIES.findIndex(e => e.id === id);
    if (idx >= 0) DUMMY_QUICK_LOG_ENTRIES.splice(idx, 1);
    return Promise.resolve({ success: true });
  }
  return request(`quicklog/${id}`, { method: 'DELETE' });
}

export async function getTodayQuickLogs() {
  if (DUMMY_FLAGS.quickLog) {
    const today = asDateKey();
    return Promise.resolve(cloneAny(DUMMY_QUICK_LOG_ENTRIES.filter(e => e.date === today)));
  }
  return request('quicklog/today');
}

