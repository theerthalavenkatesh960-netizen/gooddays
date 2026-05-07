const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

function getAuthHeader(): Record<string, string> {
  const session = localStorage.getItem('gd_session');
  if (!session) return {};
  try {
    const parsed = JSON.parse(session);
    return { Authorization: `Bearer ${parsed.access_token}` };
  } catch {
    return {};
  }
}

async function request(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Types
export interface BucketDto {
  id: string;
  name: string;
  category: string;
  monthlyTarget: number;
  colorHex?: string;
  icon?: string;
  sortOrder: number;
  completionPercent: number;
  tasksTotal: number;
  tasksCompleted: number;
  tasks?: TaskDto[];
}

export interface TaskDto {
  id: string;
  bucketId: string;
  title: string;
  description?: string;
  taskType: string;
  amount: number;
  isRecurring: boolean;
  recurrenceDay?: number;
  isCompleted: boolean;
  completedAt?: string;
  actualAmount?: number;
  notes?: string;
}

export interface RuleDto {
  id: string;
  title: string;
  description?: string;
  category: string;
  displayStyle: string;
  isActive: boolean;
  sortOrder: number;
}

export interface GroupedRulesDto {
  investment: RuleDto[];
  trading: RuleDto[];
  mindset: RuleDto[];
  lifestyle: RuleDto[];
}

export interface MonthlySnapshotDto {
  id: string;
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  totalInvested: number;
  emergencyFundBalance: number;
  travelFundBalance: number;
  portfolioEstimatedValue: number;
  notes?: string;
  savingsRate: number;
}

export interface DashboardDto {
  currentMonth: string;
  overallCompletionPercent: number;
  streak: number;
  buckets: BucketDto[];
  monthlySnapshot?: MonthlySnapshotDto;
  rules: RuleDto[];
  upcomingTasks: TaskDto[];
  missedTasks: TaskDto[];
}

export interface MonthlyHistoryDto {
  month: string;
  year: number;
  monthNumber: number;
  completionPercent: number;
  totalInvested: number;
}

// API Functions

// Buckets
export async function getBuckets() {
  return request('buckets');
}

export async function getBucket(id: string) {
  return request(`buckets/${id}`);
}

export async function createBucket(data: {
  name: string;
  category: string;
  monthlyTarget: number;
  colorHex?: string;
  icon?: string;
  sortOrder: number;
}) {
  return request('buckets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBucket(
  id: string,
  data: {
    name?: string;
    category?: string;
    monthlyTarget?: number;
    colorHex?: string;
    icon?: string;
    sortOrder?: number;
  }
) {
  return request(`buckets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBucket(id: string) {
  return request(`buckets/${id}`, { method: 'DELETE' });
}

// Tasks
export async function getTasks() {
  return request('financial-tasks');
}

export async function getTasksByMonth(month: number, year: number) {
  return request(`financial-tasks/monthly/${month}/${year}`);
}

export async function createTask(data: {
  bucketId: string;
  title: string;
  description?: string;
  taskType: string;
  amount: number;
  isRecurring: boolean;
  recurrenceDay?: number;
}) {
  return request('financial-tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    taskType?: string;
    amount?: number;
    isRecurring?: boolean;
    recurrenceDay?: number;
  }
) {
  return request(`financial-tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function completeTask(
  id: string,
  data: { actualAmount?: number; notes?: string }
) {
  return request(`financial-tasks/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function uncompleteTask(id: string) {
  return request(`financial-tasks/${id}/uncomplete`, { method: 'POST' });
}

export async function deleteTask(id: string) {
  return request(`financial-tasks/${id}`, { method: 'DELETE' });
}

// Dashboard
export async function getDashboard(): Promise<DashboardDto> {
  return request('dashboard/current');
}

export async function getHistory(): Promise<MonthlyHistoryDto[]> {
  return request('dashboard/history');
}

// Rules
export async function getRules(): Promise<GroupedRulesDto> {
  return request('rules');
}

export async function createRule(data: {
  title: string;
  description?: string;
  category: string;
  displayStyle: string;
  sortOrder: number;
}) {
  return request('rules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRule(
  id: string,
  data: {
    title?: string;
    description?: string;
    category?: string;
    displayStyle?: string;
    isActive?: boolean;
    sortOrder?: number;
  }
) {
  return request(`rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRule(id: string) {
  return request(`rules/${id}`, { method: 'DELETE' });
}

// Snapshots
export async function getSnapshots(): Promise<MonthlySnapshotDto[]> {
  return request('snapshots');
}

export async function getSnapshot(
  month: number,
  year: number
): Promise<MonthlySnapshotDto> {
  return request(`snapshots/${month}/${year}`);
}

export async function upsertSnapshot(data: {
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  totalInvested: number;
  emergencyFundBalance: number;
  travelFundBalance: number;
  portfolioEstimatedValue: number;
  notes?: string;
}): Promise<MonthlySnapshotDto> {
  return request('snapshots', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
