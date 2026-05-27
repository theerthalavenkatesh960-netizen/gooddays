import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Settings, CheckCircle2, Moon, Dumbbell, Droplets, Target, Flame, ChevronRight, Zap, TrendingUp, Plus, RotateCcw, Trash2, Filter, CreditCard as Edit, Home, Briefcase, BookOpen, User, Heart, DollarSign, ShoppingCart, Users, Film, HeartPulse, Plane, Music, Clock, ChevronDown, GripVertical, LayoutDashboard, CheckSquare, Repeat, X } from 'lucide-react';
import { format, isToday, parseISO, subDays, addDays, startOfWeek, isSameDay, isPast } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  isCompleted?: boolean;
  status?: string;
  dueDate?: string;
  due_date?: string;
  category?: string;
  priority?: string;
  recurring?: boolean;
  recurrenceId?: string;
  recurrenceInterval?: number;
  recurrenceUnit?: string;
  recurrenceDays?: string[];
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
  updatedAt?: string;
}

interface RoutineBlock {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  done: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { name: 'Home', icon: Home },
  { name: 'Work', icon: Briefcase },
  { name: 'Study', icon: BookOpen },
  { name: 'Personal', icon: User },
  { name: 'Wellness', icon: Heart },
  { name: 'Fitness', icon: Dumbbell },
  { name: 'Travel', icon: Plane },
  { name: 'Finance', icon: DollarSign },
  { name: 'Shopping', icon: ShoppingCart },
  { name: 'Social', icon: Users },
  { name: 'Entertainment', icon: Film },
  { name: 'Health', icon: HeartPulse },
  { name: 'Music', icon: Music },
];

const PRIORITIES = ['low', 'medium', 'high'];

const DEFAULT_ROUTINE: RoutineBlock[] = [
  { id: '1', startTime: '06:00', endTime: '07:00', label: 'Morning routine', done: false },
  { id: '2', startTime: '07:00', endTime: '08:00', label: 'Exercise', done: false },
  { id: '3', startTime: '08:00', endTime: '09:00', label: 'Breakfast & prep', done: false },
  { id: '4', startTime: '09:00', endTime: '12:00', label: 'Deep work', done: false },
  { id: '5', startTime: '12:00', endTime: '13:00', label: 'Lunch break', done: false },
  { id: '6', startTime: '13:00', endTime: '17:00', label: 'Work / Study', done: false },
  { id: '7', startTime: '17:00', endTime: '18:00', label: 'Wind down', done: false },
  { id: '8', startTime: '18:00', endTime: '19:00', label: 'Dinner', done: false },
  { id: '9', startTime: '20:00', endTime: '22:00', label: 'Evening leisure', done: false },
  { id: '10', startTime: '22:00', endTime: '23:00', label: 'Sleep prep', done: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting(name?: string) {
  const h = new Date().getHours();
  const base = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${base}${name ? `, ${name.split(' ')[0]}` : ''}`;
}

function getPriorityColor(priority: string) {
  if (priority === 'high') return 'bg-red-100 text-red-700 border-red-200';
  if (priority === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function currentMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

const DEFAULT_MOMENTUM_WEIGHTS = {
  tasks: 35,
  routine: 20,
  body: 15,
  workout: 15,
  finance: 10,
  journal: 5,
} as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function momentumBand(score: number) {
  if (score < 30) return 'Recover';
  if (score < 60) return 'Build';
  if (score < 85) return 'Strong';
  return 'Legendary';
}

function pickVariant(options: string[], seed: number) {
  if (!options.length) return '';
  return options[Math.abs(seed) % options.length];
}

function getHeroMessage(params: {
  score: number;
  delta: number;
  dayKey: string;
  routinePendingCount: number;
  tasksPendingCount: number;
}) {
  const band = momentumBand(params.score);
  const scoreSeed = [...params.dayKey].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + params.score;

  const byBand: Record<string, string[]> = {
    Recover: [
      'Reset mode: one intentional action can flip this day.',
      'Low momentum is not failure. It is your launch point.',
      'Start tiny, finish strong. First action wins today.',
    ],
    Build: [
      'You are building momentum. Protect it with the next step.',
      'Solid base today. One focused push lifts the whole score.',
      'Consistency is forming. Keep stacking clean wins.',
    ],
    Strong: [
      'You are in strong form. Convert this into a streak day.',
      'Great pace. Stay disciplined for one more high-value action.',
      'You are close to elite mode. Keep the chain unbroken.',
    ],
    Legendary: [
      'Legendary pace. Lock it in and make this your new normal.',
      'You are operating at peak consistency today.',
      'Top-tier day. Use this energy to pull tomorrow forward.',
    ],
  };

  let suffix = '';
  if (params.delta > 0) suffix = ` (+${params.delta} vs yesterday)`;
  if (params.delta < 0) suffix = ` (${params.delta} vs yesterday, recover now)`;
  if (params.routinePendingCount > 0) suffix += ` · ${params.routinePendingCount} routine block${params.routinePendingCount > 1 ? 's' : ''} pending`;
  if (!suffix && params.tasksPendingCount > 0) suffix = ` · ${params.tasksPendingCount} task${params.tasksPendingCount > 1 ? 's' : ''} to close`;

  return `${pickVariant(byBand[band] ?? byBand.Build, scoreSeed)}${suffix}`;
}

function calculateMomentumScore(input: {
  taskCompletionRatio: number;
  routineRatio: number;
  sleepHours: number;
  waterCups: number;
  waterGoal: number;
  calories: number;
  workoutDone: boolean;
  financeTouched: boolean;
  journalDone: boolean;
  weights: typeof DEFAULT_MOMENTUM_WEIGHTS;
}) {
  const bodyScore =
    (input.sleepHours > 0 ? input.weights.body / 3 : 0) +
    clamp((input.waterCups / Math.max(1, input.waterGoal)) * (input.weights.body / 3), 0, input.weights.body / 3) +
    (input.calories > 0 ? input.weights.body / 3 : 0);

  return Math.round(
    clamp(input.taskCompletionRatio, 0, 1) * input.weights.tasks +
    clamp(input.routineRatio, 0, 1) * input.weights.routine +
    bodyScore +
    (input.workoutDone ? input.weights.workout : 0) +
    (input.financeTouched ? input.weights.finance : 0) +
    (input.journalDone ? input.weights.journal : 0)
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatChip({ icon: Icon, label, value, color, empty }: {
  icon: React.ElementType; label: string; value: string; color: string; empty?: boolean;
}) {
  return (
    <div className="stat-chip flex-1" style={{ borderColor: empty ? 'dashed' : 'var(--border)', borderStyle: empty ? 'dashed' : 'solid' }}>
      <Icon size={16} style={{ color }} />
      <div className="min-w-0">
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-semibold num" style={{ color: empty ? 'var(--text-muted)' : 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({
  user,
  navigate,
  onOpenTasks,
  onOpenRoutine,
}: {
  user: any;
  navigate: (p: string) => void;
  onOpenTasks: () => void;
  onOpenRoutine: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sleep, setSleep] = useState('');
  const [water, setWater] = useState(0);
  const [waterGoal] = useState(8);
  const [workoutStreak, setWorkoutStreak] = useState(0);
  const [calToday, setCalToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<any[]>([]);
  const [momentumScore, setMomentumScore] = useState(0);
  const [momentumDelta, setMomentumDelta] = useState(0);
  const [weeklyTaskDays, setWeeklyTaskDays] = useState(0);
  const [weeklyWorkoutDays, setWeeklyWorkoutDays] = useState(0);
  const [weeklyJournalDays, setWeeklyJournalDays] = useState(0);
  const [weeklySpend, setWeeklySpend] = useState(0);
  const [goalsInProgress, setGoalsInProgress] = useState(0);
  const [nearestGoalDays, setNearestGoalDays] = useState<number | null>(null);
  const [monthlyNet, setMonthlyNet] = useState<number | null>(null);
  const [journalToday, setJournalToday] = useState(false);
  const [workoutToday, setWorkoutToday] = useState(false);
  const [financeTouchedToday, setFinanceTouchedToday] = useState(false);
  const [routinePendingCount, setRoutinePendingCount] = useState(0);
  const [routineCompletionText, setRoutineCompletionText] = useState('No routine');
  const [momentumWeights, setMomentumWeights] = useState(DEFAULT_MOMENTUM_WEIGHTS);
  const [upcomingMeal, setUpcomingMeal] = useState<any>(null);
  const [upcomingWorkout, setUpcomingWorkout] = useState<any>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const completedTaskCount = tasks.filter(t => t.isCompleted ?? t.status === 'completed').length;
  const pendingTaskCount = tasks.filter(t => !(t.isCompleted ?? t.status === 'completed')).length;
  const scoreBand = momentumBand(momentumScore);

  const nextActionRules: Array<() => {
    title: string;
    subtitle: string;
    points: number;
    cta: string;
    onPress: () => void;
    icon: React.ElementType;
  } | null> = [
    () => tasks.length === 0 ? {
      title: 'Create your first task for today',
      subtitle: 'Start small to trigger momentum.',
      points: Math.max(5, Math.round(momentumWeights.tasks / 4)),
      cta: 'Add Task',
      onPress: onOpenTasks,
      icon: Plus,
    } : null,
    () => {
      const incompleteTask = tasks.find(t => !(t.isCompleted ?? t.status === 'completed'));
      if (!incompleteTask) return null;
      return {
        title: 'Complete one pending task',
        subtitle: incompleteTask.title,
        points: Math.max(5, Math.round(momentumWeights.tasks / 4)),
        cta: 'Open Tasks',
        onPress: onOpenTasks,
        icon: CheckCircle2,
      };
    },
    () => routinePendingCount > 0 ? {
      title: 'Finish your next routine block',
      subtitle: `${routinePendingCount} block${routinePendingCount > 1 ? 's' : ''} pending today`,
      points: Math.max(4, Math.round(momentumWeights.routine / 4)),
      cta: 'Open Routine',
      onPress: onOpenRoutine,
      icon: Repeat,
    } : null,
    () => !workoutToday ? {
      title: 'Log your workout',
      subtitle: 'Keep your training chain alive.',
      points: Math.max(4, Math.round(momentumWeights.workout / 2)),
      cta: 'Open Workout',
      onPress: () => navigate('/body/workout-log'),
      icon: Dumbbell,
    } : null,
    () => water < waterGoal ? {
      title: 'Hydration check',
      subtitle: `Drink ${waterGoal - water} more cup${waterGoal - water > 1 ? 's' : ''}.`,
      points: Math.max(3, Math.round((momentumWeights.body / 3) * 0.7)),
      cta: 'Open Body',
      onPress: () => navigate('/body'),
      icon: Droplets,
    } : null,
    () => !journalToday ? {
      title: 'Write today\'s journal entry',
      subtitle: 'Capture your momentum while it is fresh.',
      points: Math.max(3, momentumWeights.journal),
      cta: 'Open Journal',
      onPress: () => navigate('/journal/new'),
      icon: BookOpen,
    } : null,
    () => !financeTouchedToday ? {
      title: 'Log a finance entry',
      subtitle: 'One money log keeps your month honest.',
      points: Math.max(3, Math.round(momentumWeights.finance / 2)),
      cta: 'Open Finance',
      onPress: () => navigate('/finance'),
      icon: DollarSign,
    } : null,
  ];

  const nextAction = nextActionRules.map((rule) => rule()).find(Boolean) ?? {
    title: 'You\'re in flow. Keep the streak alive.',
    subtitle: 'Pick any meaningful action and compound the day.',
    points: 3,
    cta: 'Go to Life',
    onPress: () => navigate('/life'),
    icon: Flame,
  };

  const heroMessage = getHeroMessage({
    score: momentumScore,
    delta: momentumDelta,
    dayKey: today,
    routinePendingCount,
    tasksPendingCount: pendingTaskCount,
  });

  const wins = [
    completedTaskCount > 0
      ? `${completedTaskCount} tasks done today`
      : null,
    workoutToday ? 'Workout logged today' : null,
    journalToday ? 'Journal written today' : null,
    financeTouchedToday ? 'Finance tracked today' : null,
    workoutStreak > 0 ? `${workoutStreak} day workout streak` : null,
  ].filter(Boolean).slice(0, 4) as string[];

  useEffect(() => {
    if (!user) return;
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDashboard = async () => {
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const currentMonthKey = format(new Date(), 'yyyy-MM');

    setLoading(true);
    try {
      const [
        settingsData,
        taskData,
        trackingData,
        yesterdayTrackingData,
        reminderData,
        workoutData,
        journalData,
        routineData,
        expenseData,
        budgetData,
        goalsData,
        weeklyMealPlanData,
        todayWorkoutPlan,
        tomorrowWorkoutPlan,
      ] = await Promise.all([
        api.getUserSettings().catch(() => null),
        api.getTasks(user.id).catch(() => []),
        api.getDailyTracking(user.id, today).catch(() => null),
        api.getDailyTracking(user.id, yesterday).catch(() => null),
        api.getReminders().catch(() => []),
        api.getWorkoutAnalytics().catch(() => ({ trainedDates: [] })),
        api.getJournalEntries(1).catch(() => []),
        (api as any).getTodayRoutine().catch(() => null),
        api.getExpenses(user.id).catch(() => []),
        (api as any).getFinanceBudgetProfile(new Date().getMonth() + 1, new Date().getFullYear()).catch(() => null),
        api.getGoals().catch(() => []),
        api.getWeeklyMealPlan().catch(() => null),
        api.getWorkoutPlanByDate(today).catch(() => null),
        api.getWorkoutPlanByDate(format(addDays(new Date(), 1), 'yyyy-MM-dd')).catch(() => null),
      ]);

      const settingsWeights = (settingsData as any)?.dashboardWeights;
      if (settingsWeights) {
        const normalized = {
          tasks: clamp(Number(settingsWeights.tasks || DEFAULT_MOMENTUM_WEIGHTS.tasks), 0, 100),
          routine: clamp(Number(settingsWeights.routine || DEFAULT_MOMENTUM_WEIGHTS.routine), 0, 100),
          body: clamp(Number(settingsWeights.body || DEFAULT_MOMENTUM_WEIGHTS.body), 0, 100),
          workout: clamp(Number(settingsWeights.workout || DEFAULT_MOMENTUM_WEIGHTS.workout), 0, 100),
          finance: clamp(Number(settingsWeights.finance || DEFAULT_MOMENTUM_WEIGHTS.finance), 0, 100),
          journal: clamp(Number(settingsWeights.journal || DEFAULT_MOMENTUM_WEIGHTS.journal), 0, 100),
        };
        const total = normalized.tasks + normalized.routine + normalized.body + normalized.workout + normalized.finance + normalized.journal;
        if (total > 0) {
          const scale = 100 / total;
          const scaled = {
            tasks: Math.round(normalized.tasks * scale),
            routine: Math.round(normalized.routine * scale),
            body: Math.round(normalized.body * scale),
            workout: Math.round(normalized.workout * scale),
            finance: Math.round(normalized.finance * scale),
            journal: 0,
          };
          scaled.journal = Math.max(0, 100 - scaled.tasks - scaled.routine - scaled.body - scaled.workout - scaled.finance);
          setMomentumWeights(scaled);
        }
      }

      const allTasks = Array.isArray(taskData) ? taskData : [];
      const todayTasks = allTasks.filter((t: Task) => {
        const due = t.dueDate ?? t.due_date;
        if (!due) return false;
        try {
          return isToday(parseISO(due));
        } catch {
          return false;
        }
      }).slice(0, 5);
      setTasks(todayTasks);

      const completedToday = allTasks.filter((t: any) => {
        const done = t.isCompleted ?? t.status === 'completed';
        if (!done) return false;
        const updated = t.updatedAt ? format(new Date(t.updatedAt), 'yyyy-MM-dd') : null;
        return updated === today;
      }).length;

      const completedYesterday = allTasks.filter((t: any) => {
        const done = t.isCompleted ?? t.status === 'completed';
        if (!done) return false;
        const updated = t.updatedAt ? format(new Date(t.updatedAt), 'yyyy-MM-dd') : null;
        return updated === yesterday;
      }).length;

      const tracking: any = trackingData ?? {};
      const yesterdayTracking: any = yesterdayTrackingData ?? {};
      const sleepHours = Number((tracking.sleepHours ?? tracking.sleep_hours) || 0);
      const waterCups = Number(tracking.waterCups ?? 0);
      const calories = Number(tracking.calories ?? 0);
      const ySleepHours = Number((yesterdayTracking.sleepHours ?? yesterdayTracking.sleep_hours) || 0);
      const yWaterCups = Number(yesterdayTracking.waterCups ?? 0);
      const yCalories = Number(yesterdayTracking.calories ?? 0);
      setSleep(sleepHours > 0 ? sleepHours.toString() : '');
      setWater(waterCups);
      setCalToday(calories);

      const remindersList = Array.isArray(reminderData) ? reminderData.filter((r: any) => r.isEnabled).slice(0, 3) : [];
      setReminders(remindersList);

      const trainedDates: string[] = Array.isArray((workoutData as any)?.trainedDates) ? (workoutData as any).trainedDates : [];
      const workoutDoneToday = trainedDates.includes(today);
      setWorkoutToday(workoutDoneToday);

      let streak = 0;
      for (let i = 0; i < 14; i++) {
        const key = format(subDays(new Date(), i), 'yyyy-MM-dd');
        if (trainedDates.includes(key)) streak += 1;
        else break;
      }
      setWorkoutStreak(streak);

      const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));
      const weeklyTaskHitCount = last7.filter(d =>
        allTasks.some((t: any) => {
          const done = t.isCompleted ?? t.status === 'completed';
          if (!done || !t.updatedAt) return false;
          return format(new Date(t.updatedAt), 'yyyy-MM-dd') === d;
        })
      ).length;
      setWeeklyTaskDays(weeklyTaskHitCount);
      setWeeklyWorkoutDays(last7.filter(d => trainedDates.includes(d)).length);

      const journalEntries = Array.isArray(journalData) ? journalData : Array.isArray((journalData as any)?.entries) ? (journalData as any).entries : [];
      const hasJournalToday = journalEntries.some((j: any) => {
        const raw = j.date ?? j.createdAt ?? j.created_at;
        if (!raw) return false;
        return format(new Date(raw), 'yyyy-MM-dd') === today;
      });
      setJournalToday(hasJournalToday);
      setWeeklyJournalDays(last7.filter(d =>
        journalEntries.some((j: any) => {
          const raw = j.date ?? j.createdAt ?? j.created_at;
          if (!raw) return false;
          return format(new Date(raw), 'yyyy-MM-dd') === d;
        })
      ).length);

      const routineBlocks = Array.isArray((routineData as any)?.blocks) ? (routineData as any).blocks : [];
      const routineCompleted = Number((routineData as any)?.stats?.completed ?? 0);
      const routineTotal = Number((routineData as any)?.stats?.total ?? 0);
      const pendingRoutine = routineBlocks.filter((b: any) => b.status === 'pending').length;
      setRoutinePendingCount(pendingRoutine);
      setRoutineCompletionText(routineTotal > 0 ? `${routineCompleted}/${routineTotal} completed` : 'No routine today');

      const expenses = Array.isArray(expenseData) ? expenseData : [];
      const touchedFinanceToday = expenses.some((e: any) => {
        const raw = e.date ?? e.createdAt ?? e.created_at;
        if (!raw) return false;
        return format(new Date(raw), 'yyyy-MM-dd') === today;
      });
      setFinanceTouchedToday(touchedFinanceToday);

      const weeklyExpenseTotal = expenses
        .filter((e: any) => {
          const raw = e.date ?? e.createdAt ?? e.created_at;
          if (!raw) return false;
          const dt = new Date(raw);
          return dt >= weekStart;
        })
        .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
      setWeeklySpend(weeklyExpenseTotal);

      const monthExpenseTotal = expenses
        .filter((e: any) => {
          const raw = e.date ?? e.createdAt ?? e.created_at;
          if (!raw) return false;
          return format(new Date(raw), 'yyyy-MM') === currentMonthKey;
        })
        .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

      if (budgetData) {
        const fixed = (budgetData.fixedExpenses ?? []).reduce((sum: number, f: any) => sum + Number(f.effectiveAmount ?? f.amount ?? 0), 0);
        const income = Number(budgetData.effectiveMonthlyIncome ?? budgetData.monthlyIncome ?? 0);
        setMonthlyNet(income - fixed - monthExpenseTotal);
      } else {
        setMonthlyNet(null);
      }

      const goals = Array.isArray(goalsData) ? goalsData : [];
      const activeGoals = goals.filter((g: any) => (g.status ?? '').toLowerCase() !== 'completed');
      setGoalsInProgress(activeGoals.length);
      const deadlines = activeGoals
        .map((g: any) => g.deadlineDate ?? g.deadline_date)
        .filter(Boolean)
        .map((d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        .filter((n: number) => n >= 0)
        .sort((a: number, b: number) => a - b);
      setNearestGoalDays(deadlines.length > 0 ? deadlines[0] : null);

      // Daily momentum model (0..100)
      const taskCompletionRatio = todayTasks.length > 0 ? todayTasks.filter(t => t.isCompleted ?? t.status === 'completed').length / todayTasks.length : 0.4;
      const routineRatio = routineTotal > 0 ? routineCompleted / routineTotal : 0.5;
      const score = calculateMomentumScore({
        taskCompletionRatio,
        routineRatio,
        sleepHours,
        waterCups,
        waterGoal,
        calories,
        workoutDone: workoutDoneToday,
        financeTouched: touchedFinanceToday,
        journalDone: hasJournalToday,
        weights: settingsWeights ? {
          tasks: Number(settingsWeights.tasks ?? momentumWeights.tasks),
          routine: Number(settingsWeights.routine ?? momentumWeights.routine),
          body: Number(settingsWeights.body ?? momentumWeights.body),
          workout: Number(settingsWeights.workout ?? momentumWeights.workout),
          finance: Number(settingsWeights.finance ?? momentumWeights.finance),
          journal: Number(settingsWeights.journal ?? momentumWeights.journal),
        } : momentumWeights,
      });

      const yesterdayScore = calculateMomentumScore({
        taskCompletionRatio: completedYesterday > 0 ? 0.6 : 0.25,
        routineRatio: 0.5,
        sleepHours: ySleepHours,
        waterCups: yWaterCups,
        waterGoal,
        calories: yCalories,
        workoutDone: trainedDates.includes(yesterday),
        financeTouched: false,
        journalDone: false,
        weights: settingsWeights ? {
          tasks: Number(settingsWeights.tasks ?? momentumWeights.tasks),
          routine: Number(settingsWeights.routine ?? momentumWeights.routine),
          body: Number(settingsWeights.body ?? momentumWeights.body),
          workout: Number(settingsWeights.workout ?? momentumWeights.workout),
          finance: Number(settingsWeights.finance ?? momentumWeights.finance),
          journal: Number(settingsWeights.journal ?? momentumWeights.journal),
        } : momentumWeights,
      });

      setMomentumScore(clamp(score, 0, 100));
      setMomentumDelta(clamp(score - yesterdayScore, -100, 100));

      // Set upcoming meal and workout
      if (weeklyMealPlanData?.planJson || weeklyMealPlanData?.plan_json) {
        try {
          const planJson = JSON.parse(weeklyMealPlanData.planJson || weeklyMealPlanData.plan_json);
          const todayMeals = planJson[today] || [];
          if (todayMeals.length > 0) {
            setUpcomingMeal(todayMeals[0]);
          }
        } catch (e) {
          console.error('Failed to parse meal plan:', e);
        }
      }

      if (todayWorkoutPlan) {
        setUpcomingWorkout(todayWorkoutPlan);
      } else if (tomorrowWorkoutPlan) {
        setUpcomingWorkout(tomorrowWorkoutPlan);
      }
    } catch {
      // Keep prior values for resilience.
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task: Task) => {
    const done = !(task.isCompleted ?? task.status === 'completed');
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: done } : t));
    try {
      await api.updateTask(Number(task.id), { isCompleted: done });
      await loadDashboard();
    } catch {
      await loadDashboard();
    }
  };

  const NextIcon = nextAction.icon;

  return (
    <div>
      {/* Momentum hero */}
      <div className="mb-4 p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, var(--accent)26, var(--surface))', border: '1px solid var(--accent)33' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Daily Momentum</p>
            <p className="text-3xl font-extrabold num mt-0.5" style={{ color: 'var(--text-primary)' }}>{momentumScore}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {scoreBand} mode {momentumDelta !== 0 ? `· ${momentumDelta > 0 ? '+' : ''}${momentumDelta} vs yesterday` : '· same as yesterday'}
            </p>
          </div>
          <div className="px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
            <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
          </div>
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>{heroMessage}</p>
      </div>

      {/* Next best action */}
      <div className="mb-4 rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Next Best Action</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)22', color: 'var(--accent)' }}>+{nextAction.points}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent)22' }}>
            <NextIcon size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{nextAction.title}</p>
            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{nextAction.subtitle}</p>
          </div>
          <button onClick={nextAction.onPress} className="h-8 px-3 rounded-lg text-xs font-semibold text-white press" style={{ backgroundColor: 'var(--accent)' }}>
            {nextAction.cta}
          </button>
        </div>
      </div>

      {/* Snapshot */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatChip icon={Target} label="Tasks Today" value={`${completedTaskCount}/${tasks.length || 0}`} color="var(--accent)" empty={tasks.length === 0} />
        <StatChip icon={Repeat} label="Routine" value={routineCompletionText} color="var(--accent-green)" empty={routineCompletionText === 'No routine'} />
        <StatChip icon={Flame} label="Workout" value={workoutToday ? 'Logged' : `${workoutStreak}d streak`} color="var(--accent-warm)" empty={!workoutToday && workoutStreak === 0} />
        <StatChip icon={DollarSign} label="Monthly Net" value={monthlyNet === null ? '--' : `${monthlyNet >= 0 ? '+' : '-'}₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(monthlyNet))}`} color={monthlyNet !== null && monthlyNet >= 0 ? 'var(--accent-green)' : 'var(--accent-warm)'} empty={monthlyNet === null} />
      </div>

      {/* Quick add row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Task', icon: Plus, onPress: onOpenTasks },
          { label: 'Quick Log', icon: Zap, onPress: () => navigate('/life') },
          { label: 'Journal', icon: BookOpen, onPress: () => navigate('/journal/new') },
          { label: 'Expense', icon: DollarSign, onPress: () => navigate('/finance') },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.onPress}
              className="rounded-xl py-2.5 flex flex-col items-center gap-1.5 press"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <Icon size={14} style={{ color: 'var(--accent)' }} />
              <span className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Upcoming meal & workout */}
      {(upcomingMeal || upcomingWorkout) && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {upcomingMeal && (
            <div className="rounded-xl p-3 flex flex-col" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Next Meal</p>
              <p className="text-xs font-bold mt-1.5 truncate" style={{ color: 'var(--text-primary)' }}>
                {upcomingMeal.mealTemplateId ? `Meal ${upcomingMeal.mealTemplateId}` : 'Planned'}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {upcomingMeal.timeOfDay || 'No specific time'}
              </p>
              <button onClick={() => navigate('/body?tab=Diet')} className="mt-2 text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--accent)22', color: 'var(--accent)' }}>
                View →
              </button>
            </div>
          )}
          {upcomingWorkout && (
            <div className="rounded-xl p-3 flex flex-col" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Next Workout</p>
              <p className="text-xs font-bold mt-1.5 truncate" style={{ color: 'var(--text-primary)' }}>
                {upcomingWorkout.dayLabel || format(parseISO(upcomingWorkout.date || today), 'EEE')}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {upcomingWorkout.plannedExercises?.split(',').length || 0} exercises
              </p>
              <button onClick={() => navigate('/body?tab=Workout')} className="mt-2 text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--accent)22', color: 'var(--accent)' }}>
                Start →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Wins board */}
      <div className="mb-4 rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="section-header px-0 mb-2">
          <span className="section-label">Wins Board</span>
        </div>
        {wins.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your wins will show here as soon as you complete actions today.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {wins.map((win) => (
              <span key={win} className="text-[11px] px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--accent-green)22', color: 'var(--accent-green)' }}>
                {win}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Weekly trend mini cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Task consistency</p>
          <p className="text-sm font-bold num mt-1" style={{ color: 'var(--text-primary)' }}>{weeklyTaskDays}/7 days</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Workout consistency</p>
          <p className="text-sm font-bold num mt-1" style={{ color: 'var(--text-primary)' }}>{weeklyWorkoutDays}/7 days</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Journal days</p>
          <p className="text-sm font-bold num mt-1" style={{ color: 'var(--text-primary)' }}>{weeklyJournalDays}/7 days</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Week spend</p>
          <p className="text-sm font-bold num mt-1" style={{ color: 'var(--text-primary)' }}>₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.round(weeklySpend))}</p>
        </div>
      </div>

      {/* Today tasks quick list */}
      <div className="mb-4">
        <div className="section-header px-0 mb-2">
          <span className="section-label">Today's Tasks</span>
          <button onClick={onOpenTasks} className="flex items-center gap-0.5 text-xs press" style={{ color: 'var(--accent)' }}>
            Open <ChevronRight size={14} />
          </button>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="task-row">
                <div className="skeleton w-5 h-5 rounded-md" />
                <div className="skeleton h-3 flex-1 rounded" />
              </div>
            ))
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center">
              <Target size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks for today</p>
            </div>
          ) : (
            tasks.map(task => {
              const done = task.isCompleted ?? task.status === 'completed';
              return (
                <div key={task.id} className="task-row" onClick={() => toggleTask(task)}>
                  <div className={`checkbox-custom ${done ? 'checked' : ''}`}>
                    {done && <CheckCircle2 size={13} color="#fff" />}
                  </div>
                  <p className="flex-1 text-sm" style={{ color: done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none' }}>
                    {task.title}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reminders + goals snapshot */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Active reminders</p>
          <p className="text-base font-bold num" style={{ color: 'var(--text-primary)' }}>{reminders.length}</p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>today</p>
        </div>
        <div className="rounded-xl p-3 cursor-pointer" onClick={() => navigate('/life?tab=Goals')} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Goals in progress</p>
          <p className="text-base font-bold num" style={{ color: 'var(--text-primary)' }}>{goalsInProgress}</p>
          {nearestGoalDays !== null ? (
            <p className="text-[10px] mt-1" style={{ color: 'var(--accent)' }}>⏳ {nearestGoalDays}d to next deadline</p>
          ) : (
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>keep compounding</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab({ user }: { user: any }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_OPTIONS[0].name);
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [recurring, setRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days');
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [recurrenceStart, setRecurrenceStart] = useState('');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [filterView, setFilterView] = useState('today');
  const [filterCategory, setFilterCategory] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ taskId: number; isRecurring: boolean } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (recurring) {
      const today = format(new Date(), 'yyyy-MM-dd');
      setRecurrenceStart(today);
      const d = new Date(); d.setDate(d.getDate() + 30);
      setRecurrenceEnd(format(d, 'yyyy-MM-dd'));
    } else {
      setRecurrenceStart('');
      setRecurrenceEnd('');
    }
  }, [recurring]);

  useEffect(() => {
    if (user) loadTasks();
  }, [user]);

  const loadTasks = async () => {
    try {
      const data = await api.getTasks(user.id);
      setTasks(Array.isArray(data) ? data : []);
    } catch {}
  };

  const addTask = async () => {
    if (!user || !newTask.trim()) return;
    const body: any = {
      userId: user.id,
      title: newTask,
      category: selectedCategory,
      priority: selectedPriority,
      recurring,
      recurrenceInterval,
      recurrenceUnit,
      recurrenceStartDate: recurrenceStart ? new Date(recurrenceStart) : undefined,
      recurrenceEndDate: recurrenceEnd ? new Date(recurrenceEnd) : undefined,
      recurrenceDays: recurrenceUnit === 'weeks' ? recurrenceDays : recurrenceUnit === 'months' ? [monthlyDay.toString()] : undefined,
    };
    if (!recurring && scheduledDate) body.dueDate = new Date(scheduledDate);
    if (recurring) {
      if (!body.recurrenceStartDate) body.recurrenceStartDate = new Date();
      if (!body.recurrenceEndDate) {
        const d = new Date(); d.setDate(d.getDate() + 30);
        body.recurrenceEndDate = d;
      }
    }
    if (editingTask) await api.updateTask(editingTask.id, body);
    else await api.createTask(body);
    resetForm();
    loadTasks();
  };

  const resetForm = () => {
    setNewTask(''); setScheduledDate(''); setRecurring(false);
    setRecurrenceInterval(1); setRecurrenceUnit('days');
    setRecurrenceDays([]); setRecurrenceStart(''); setRecurrenceEnd('');
    setShowAddSheet(false); setEditingTask(null);
  };

  const openEditSheet = (task: any) => {
    setEditingTask(task);
    setNewTask(task.title || '');
    setSelectedCategory(task.category || 'Personal');
    setSelectedPriority(task.priority || 'medium');
    setRecurring(!!task.recurring);
    setRecurrenceInterval(task.recurrenceInterval || 1);
    setRecurrenceUnit(task.recurrenceUnit || 'days');
    setRecurrenceDays(task.recurrenceDays || []);
    setMonthlyDay(task.recurrenceUnit === 'months' && task.recurrenceDays?.[0] ? parseInt(task.recurrenceDays[0], 10) : 1);
    setRecurrenceStart(task.recurrenceStartDate ? format(parseISO(task.recurrenceStartDate), 'yyyy-MM-dd') : '');
    setRecurrenceEnd(task.recurrenceEndDate ? format(parseISO(task.recurrenceEndDate), 'yyyy-MM-dd') : '');
    setScheduledDate(task.dueDate ? format(parseISO(task.dueDate), 'yyyy-MM-dd') : '');
    setShowAddSheet(true);
  };

  const toggleTask = async (task: any) => {
    const isCompleted = !task.isCompleted;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted } : t));
    await api.updateTask(task.id, { isCompleted });
    if (isCompleted && user) await api.addPoints(user.id, 'task_completed', 1);
    loadTasks();
  };

  const deleteTask = async (id: number, deleteMode: 'this' | 'series' = 'this') => {
    await api.deleteTask(id, deleteMode);
    setDeleteConfirm(null);
    loadTasks();
  };

  const getFilteredTasks = () => {
    let filtered = tasks;
    if (selectedDate) {
      filtered = filtered.filter(t => {
        const due = t.dueDate ?? t.due_date;
        if (!due) return false;
        try { return isSameDay(parseISO(due), selectedDate); } catch { return false; }
      });
    } else if (filterView === 'today') {
      filtered = filtered.filter(t => {
        const due = t.dueDate ?? t.due_date;
        return !due || isToday(parseISO(due));
      });
    } else if (filterView === 'overdue') {
      filtered = filtered.filter(t => {
        const due = t.dueDate ?? t.due_date;
        return due && isPast(parseISO(due)) && !isToday(parseISO(due)) && t.status !== 'completed';
      });
    }
    if (filterCategory !== 'all') filtered = filtered.filter(t => t.category === filterCategory);
    return filtered;
  };

  const renderOccurrences = (task: any) => {
    if (!task.recurrenceId) return null;
    const selected = new Date(selectedDate); selected.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const cutoff = selected > today ? today : selected;
    const seriesHistory = tasks.filter(t => {
      if (t.recurrenceId !== task.recurrenceId) return false;
      const dueValue = t.dueDate || t.due_date;
      if (!dueValue) return false;
      const due = new Date(dueValue); due.setHours(0, 0, 0, 0);
      return due <= cutoff;
    });
    const completed = seriesHistory.filter(t => t.isCompleted || t.status === 'completed')
      .sort((a, b) => new Date(b.dueDate || b.due_date).getTime() - new Date(a.dueDate || a.due_date).getTime())
      .slice(0, 5);
    const missed = seriesHistory.filter(t => !(t.isCompleted || t.status === 'completed')).length;
    if (completed.length === 0 && missed === 0) return null;
    return (
      <div className="flex items-center gap-1.5 mr-1">
        {completed.map((t, i) => (
          <span key={t.id || i} title={new Date(t.dueDate || t.due_date).toLocaleDateString()}
            className="w-4 h-4 rounded-sm flex items-center justify-center text-white text-[9px]"
            style={{ backgroundColor: 'var(--accent-green)' }}>✓</span>
        ))}
        {missed > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
            -{missed}
          </span>
        )}
      </div>
    );
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div>
      {/* Week date strip */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {format(selectedDate, 'EEEE, MMM d')}
          </h2>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              className="px-2 py-1 rounded-lg text-[11px] press" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>
              ◀
            </button>
            <button onClick={() => setSelectedDate(new Date())}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold press" style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)' }}>
              Today
            </button>
            <button onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              className="px-2 py-1 rounded-lg text-[11px] press" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>
              ▶
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {Array.from({ length: 7 }).map((_, i) => {
            const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
            const d = addDays(weekStart, i);
            const isSelected = isSameDay(d, selectedDate);
            const isNow = isToday(d);
            return (
              <button key={d.toISOString()} onClick={() => setSelectedDate(d)}
                className="flex-1 min-w-[38px] py-2 rounded-xl text-center press transition-all"
                style={{
                  backgroundColor: isSelected ? 'var(--accent)' : isNow ? 'var(--surface-elevated)' : 'var(--surface)',
                  border: isNow && !isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                }}>
                <div className="text-[10px]" style={{ color: isSelected ? '#fff' : 'var(--text-muted)' }}>{format(d, 'EEE')}</div>
                <div className="font-bold text-sm" style={{ color: isSelected ? '#fff' : 'var(--text-primary)' }}>{format(d, 'd')}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 mb-3">
        {(['today', 'overdue'] as const).map(v => (
          <button key={v} onClick={() => setFilterView(v)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 press transition-all"
            style={{
              backgroundColor: filterView === v ? (v === 'overdue' ? '#ef4444' : 'var(--accent)') : 'var(--surface)',
              color: filterView === v ? '#fff' : 'var(--text-secondary)',
            }}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
        <div className="flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'var(--surface)' }}>
          <Filter size={12} style={{ color: 'var(--text-muted)' }} />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="text-xs outline-none bg-transparent" style={{ color: 'var(--text-secondary)' }}>
            <option value="all">All Categories</option>
            {CATEGORY_OPTIONS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <button onClick={() => { setEditingTask(null); setShowAddSheet(true); }}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold press text-white"
          style={{ backgroundColor: 'var(--accent)' }}>
          <Plus size={13} /> New
        </button>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        <AnimatePresence>
          {filteredTasks.map(task => (
            <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
              className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', opacity: task.isCompleted ? 0.6 : 1 }}>
              <div className="flex items-center gap-2.5">
                <button onClick={() => toggleTask(task)} className="flex-shrink-0 press">
                  {task.isCompleted
                    ? <CheckCircle2 size={20} style={{ color: 'var(--accent)' }} />
                    : <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'var(--border)' }} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: task.isCompleted ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.isCompleted ? 'line-through' : 'none' }}>
                    {task.title}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                        {task.category}
                      </span>
                    )}
                    {task.priority && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    )}
                    {(task.dueDate ?? task.due_date) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                        {format(parseISO(task.dueDate ?? task.due_date), 'EEE, MMM d')}
                      </span>
                    )}
                    {task.recurring && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent-green)' }}>
                        recurring
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {renderOccurrences(task)}
                  {task.isCompleted ? (
                    <button onClick={() => toggleTask(task)} className="p-1.5 rounded-lg press" style={{ color: 'var(--text-muted)' }}>
                      <RotateCcw size={13} />
                    </button>
                  ) : (
                    <button onClick={() => openEditSheet(task)} className="p-1.5 rounded-lg press" style={{ color: 'var(--text-muted)' }}>
                      <Edit size={13} />
                    </button>
                  )}
                  <button onClick={() => setDeleteConfirm({ taskId: task.id, isRecurring: task.recurring })}
                    className="p-1.5 rounded-lg press" style={{ color: '#ef4444' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredTasks.length === 0 && (
          <div className="py-12 text-center">
            <Target size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks found</p>
            <button onClick={() => setShowAddSheet(true)} className="mt-2 text-xs font-semibold press" style={{ color: 'var(--accent)' }}>
              + Add a task
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Bottom Sheet */}
      <AnimatePresence>
        {showAddSheet && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={resetForm} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden flex flex-col"
              style={{ backgroundColor: 'var(--surface)', maxHeight: '90dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 350 }}>
              {/* handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
              </div>
              <div className="flex items-center justify-between px-5 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {editingTask ? 'Edit Task' : 'New Task'}
                </h3>
                <button onClick={resetForm} className="text-xl leading-none press" style={{ color: 'var(--text-muted)' }}>&times;</button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Title */}
                <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)}
                  placeholder="Task title" autoFocus
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />

                {/* Category */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Category</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_OPTIONS.map(c => {
                      const Icon = c.icon;
                      const active = selectedCategory === c.name;
                      return (
                        <button key={c.name} onClick={() => setSelectedCategory(c.name)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium press transition-all"
                          style={{
                            backgroundColor: active ? 'var(--accent)' : 'var(--surface-elevated)',
                            color: active ? '#fff' : 'var(--text-secondary)',
                          }}>
                          <Icon size={10} />{c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority + Recurring */}
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Priority</p>
                    <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <div onClick={() => setRecurring(!recurring)}
                      className="w-9 h-5 rounded-full relative transition-all"
                      style={{ backgroundColor: recurring ? 'var(--accent)' : 'var(--surface-elevated)' }}>
                      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                        style={{ left: recurring ? '18px' : '2px' }} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Recurring</span>
                  </label>
                </div>

                {/* Schedule date */}
                {!recurring && (
                  <div>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Schedule for</p>
                    <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                  </div>
                )}

                {/* Recurrence options */}
                {recurring && (
                  <div className="rounded-xl p-3 space-y-3" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Every</span>
                      <input type="number" value={recurrenceInterval} onChange={e => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                        className="w-14 px-2 py-1.5 rounded-lg text-xs text-center outline-none"
                        style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                      <select value={recurrenceUnit} onChange={e => setRecurrenceUnit(e.target.value as any)}
                        className="px-2 py-1.5 rounded-lg text-xs outline-none"
                        style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                        <option value="days">day(s)</option>
                        <option value="weeks">week(s)</option>
                        <option value="months">month(s)</option>
                        <option value="years">year(s)</option>
                      </select>
                    </div>
                    {recurrenceUnit === 'weeks' && (
                      <div className="flex gap-2 flex-wrap">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => {
                          const full = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i];
                          const active = recurrenceDays.includes(full);
                          return (
                            <button key={d} onClick={() => setRecurrenceDays(active ? recurrenceDays.filter(x => x !== full) : [...recurrenceDays, full])}
                              className="w-9 h-9 rounded-full text-xs font-semibold press"
                              style={{ backgroundColor: active ? 'var(--accent)' : 'var(--surface)', color: active ? '#fff' : 'var(--text-muted)' }}>
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {recurrenceUnit === 'months' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>on day</span>
                        <input type="number" min={1} max={31} value={monthlyDay} onChange={e => setMonthlyDay(parseInt(e.target.value) || 1)}
                          className="w-14 px-2 py-1.5 rounded-lg text-xs text-center outline-none"
                          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Start</p>
                        <input type="date" value={recurrenceStart} onChange={e => setRecurrenceStart(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>End</p>
                        <input type="date" value={recurrenceEnd} onChange={e => setRecurrenceEnd(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button onClick={resetForm} className="px-4 py-2.5 rounded-xl text-sm font-semibold press"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button onClick={addTask} disabled={!newTask.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white press disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirm sheet */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-5"
              style={{ backgroundColor: 'var(--surface)', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 350 }}>
              <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Delete Task</h3>
              {deleteConfirm.isRecurring ? (
                <div className="space-y-2 mt-3">
                  <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>This is a recurring task. What would you like to delete?</p>
                  <button onClick={() => deleteTask(deleteConfirm.taskId, 'this')}
                    className="w-full py-3 rounded-xl text-sm font-semibold press"
                    style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#ca8a04' }}>
                    Delete Only This Occurrence
                  </button>
                  <button onClick={() => deleteTask(deleteConfirm.taskId, 'series')}
                    className="w-full py-3 rounded-xl text-sm font-semibold press"
                    style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    Delete Entire Series
                  </button>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Are you sure you want to delete this task?</p>
                  <button onClick={() => deleteTask(deleteConfirm.taskId, 'this')}
                    className="w-full py-3 rounded-xl text-sm font-semibold press mb-2"
                    style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    Delete Task
                  </button>
                </div>
              )}
              <button onClick={() => setDeleteConfirm(null)}
                className="w-full py-3 rounded-xl text-sm font-semibold press mt-1"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Daily Routine Tab ────────────────────────────────────────────────────────

function SortableRoutineBlockRow({
  id,
  children,
}: {
  id: number;
  children: (drag: { attributes: Record<string, any>; listeners: Record<string, any> }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.75 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      {children({
        attributes: (attributes ?? {}) as Record<string, any>,
        listeners: (listeners ?? {}) as Record<string, any>,
      })}
    </div>
  );
}

type TodayRoutineBlock = {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  category?: string;
  color?: string;
  status: 'pending' | 'completed' | 'skipped' | 'missed';
  logId?: number;
  mealType?: string | null;
  linkedWorkoutPlanId?: number | null;
  linkedWorkoutLabel?: string | null;
  isOverride?: boolean;
  overrideId?: number | null;
  baseBlockId?: number | null;
};

type TodayRoutine = {
  date: string;
  dayOfWeek: number;
  routine: { id: number; name: string; color: string } | null;
  isSkipped: boolean;
  blocks: TodayRoutineBlock[];
  stats: { completed: number; skipped: number; total: number };
};

type BlockKind = 'general' | 'meal' | 'workout';

function DailyRoutineTab({ userId: _userId }: { userId: string | number }) {
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const syncPrefKey = `gd:routine-sync:${String(_userId)}`;
  const [data, setData] = useState<TodayRoutine | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipping, setSkipping] = useState(false);
  const [completionTimeModal, setCompletionTimeModal] = useState<{ blockId: number; isOpen: boolean } | null>(null);
  const [completionTime, setCompletionTime] = useState<{ start: string; end: string }>({ start: '00:00', end: '01:00' });
  const [addingBlock, setAddingBlock] = useState(false);
  const [newBlockForm, setNewBlockForm] = useState({ title: '', startTime: '09:00', endTime: '10:00', mealType: '', blockKind: 'general' as BlockKind });
  const [savingBlock, setSavingBlock] = useState(false);
  const [syncWithRoutine, setSyncWithRoutine] = useState(false);
  const [editingBlockModal, setEditingBlockModal] = useState<{ blockId: number; isOpen: boolean } | null>(null);
  const [editBlockForm, setEditBlockForm] = useState({ title: '', startTime: '09:00', endTime: '10:00', mealType: '', blockKind: 'general' as BlockKind });
  const [savingEditBlock, setSavingEditBlock] = useState(false);
  const [deletingEditBlock, setDeletingEditBlock] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const now = currentMinutes();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(syncPrefKey);
      if (raw === '0') setSyncWithRoutine(false);
      if (raw === '1') setSyncWithRoutine(true);
    } catch {
      // ignore localStorage read issues
    }
  }, [syncPrefKey]);

  useEffect(() => {
    try {
      localStorage.setItem(syncPrefKey, syncWithRoutine ? '1' : '0');
    } catch {
      // ignore localStorage write issues
    }
  }, [syncPrefKey, syncWithRoutine]);

  async function load() {
    setLoading(true);
    try {
      const res = await (api as any).getTodayRoutine().catch(() => null);
      setData(res || null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function normalizeRoutineOrderByTime(routineId: number) {
    const routines = await (api as any).getDailyRoutines().catch(() => []);
    const routine = Array.isArray(routines) ? routines.find((r: any) => Number(r.id) === Number(routineId)) : null;
    if (!routine || !Array.isArray(routine.blocks)) return;
    const ordered = [...routine.blocks].sort((a: any, b: any) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    await Promise.all(
      ordered.map((block: any, index: number) => (api as any).updateRoutineBlock(block.id, {
        title: block.title,
        startTime: block.startTime,
        endTime: block.endTime,
        sortOrder: index + 1,
        mealType: block.mealType ?? null,
        linkedWorkoutPlanId: block.linkedWorkoutPlanId ?? null,
      })),
    );
  }

  async function reorderTodayByTime() {
    const latest = await (api as any).getTodayRoutine().catch(() => null);
    if (!latest || !Array.isArray(latest.blocks) || latest.blocks.length === 0) return;
    const items = [...latest.blocks]
      .sort((a: TodayRoutineBlock, b: TodayRoutineBlock) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
      .map((b: TodayRoutineBlock, idx: number) => ({
        overrideId: b.overrideId ?? undefined,
        baseBlockId: b.baseBlockId ?? (b.isOverride ? undefined : b.id),
        sortOrder: idx + 1,
      }));
    await (api as any).reorderTodayRoutineOverrides({ date: latest.date, items });
  }

  async function onDragEnd(event: DragEndEvent) {
    if (!data || isSkipped) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = data.blocks.findIndex(b => b.id === active.id);
    const newIndex = data.blocks.findIndex(b => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(data.blocks, oldIndex, newIndex);
    setData(prev => prev ? { ...prev, blocks: reordered } : prev);

    const items = reordered.map((b, idx) => ({
      overrideId: b.overrideId ?? undefined,
      baseBlockId: b.baseBlockId ?? (b.isOverride ? undefined : b.id),
      sortOrder: idx + 1,
    }));

    try {
      await (api as any).reorderTodayRoutineOverrides({ date: today, items });
      await load();
    } catch {
      await load();
    }
  }

  useEffect(() => { load(); }, []);

  function getLogPayload(block: TodayRoutineBlock): { routineBlockId?: number; overrideBlockId?: number } {
    if (block.baseBlockId) return { routineBlockId: block.baseBlockId };
    if (block.isOverride && block.overrideId) return { overrideBlockId: block.overrideId };
    return { routineBlockId: block.id };
  }

  function findBlockById(blockId: number): TodayRoutineBlock | undefined {
    return data?.blocks.find(b => b.id === blockId);
  }

  function getSuggestedWorkoutLinkId(excludeBlockId?: number): number | null {
    const found = data?.blocks.find(b => b.id !== excludeBlockId && b.linkedWorkoutPlanId)?.linkedWorkoutPlanId;
    return found ?? null;
  }

  function getPayloadByBlockKind(form: { blockKind: BlockKind; mealType?: string }, fallbackWorkoutLinkId?: number | null) {
    const mealType = form.blockKind === 'meal' ? (form.mealType || null) : null;
    const linkedWorkoutPlanId = form.blockKind === 'workout' ? (fallbackWorkoutLinkId ?? null) : null;
    return { mealType, linkedWorkoutPlanId };
  }

  function getBlockKindMeta(block: TodayRoutineBlock): { kind: BlockKind; label: string; style: React.CSSProperties } {
    if (block.linkedWorkoutPlanId) {
      return {
        kind: 'workout',
        label: 'Workout',
        style: {
          backgroundColor: 'rgba(108,99,255,0.16)',
          color: 'var(--accent)',
          border: '1px solid rgba(108,99,255,0.3)',
        },
      };
    }

    if (block.mealType) {
      return {
        kind: 'meal',
        label: 'Meal',
        style: {
          backgroundColor: 'rgba(34,197,94,0.14)',
          color: 'var(--accent-green)',
          border: '1px solid rgba(34,197,94,0.28)',
        },
      };
    }

    return {
      kind: 'general',
      label: 'General',
      style: {
        backgroundColor: 'var(--surface-elevated)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border)',
      },
    };
  }

  async function toggleBlock(block: TodayRoutineBlock) {
    if (block.status === 'completed') {
      setData(prev => prev ? {
        ...prev,
        blocks: prev.blocks.map(b => b.id === block.id ? { ...b, status: 'pending' as any } : b),
        stats: { ...prev.stats, completed: prev.stats.completed - 1 },
      } : prev);
      try {
        await (api as any).logRoutineBlock({ ...getLogPayload(block), date: today, status: 'missed' });
      } catch {
        load();
      }
    } else {
      // Check if marking done within the scheduled time window
      const start = timeToMinutes(block.startTime);
      const end = timeToMinutes(block.endTime);
      const isWithinScheduledTime = now >= start && now <= end;

      if (isWithinScheduledTime) {
        // Mark complete immediately without time picker
        setData(prev => prev ? {
          ...prev,
          blocks: prev.blocks.map(b => b.id === block.id ? { ...b, status: 'completed' as any } : b),
          stats: { ...prev.stats, completed: prev.stats.completed + 1 },
        } : prev);
        try {
          await (api as any).logRoutineBlock({
            ...getLogPayload(block),
            date: today,
            status: 'completed',
          });
        } catch {
          load();
        }
      } else {
        // Show time picker for marking done at different time
        setCompletionTime({ start: block.startTime, end: block.endTime });
        setCompletionTimeModal({ blockId: block.id, isOpen: true });
      }
    }
  }

  async function confirmCompletion() {
    if (!completionTimeModal) return;
    const targetBlock = findBlockById(completionTimeModal.blockId);
    if (!targetBlock) {
      setCompletionTimeModal(null);
      return;
    }
    setData(prev => prev ? {
      ...prev,
      blocks: prev.blocks.map(b => b.id === completionTimeModal.blockId ? { ...b, status: 'completed' as any } : b),
      stats: { ...prev.stats, completed: prev.stats.completed + 1 },
    } : prev);
    try {
      await (api as any).logRoutineBlock({
        ...getLogPayload(targetBlock),
        date: today,
        status: 'completed',
        actualStartTime: completionTime.start,
        actualEndTime: completionTime.end,
      });
    } catch {
      load();
    }
    setCompletionTimeModal(null);
  }

  async function addBlockToday() {
    if (!newBlockForm.title.trim() || !data) return;
    const payloadByKind = getPayloadByBlockKind(newBlockForm, getSuggestedWorkoutLinkId());
    setSavingBlock(true);
    try {
      if (syncWithRoutine) {
        await (api as any).addRoutineBlock(data.routine!.id, {
          title: newBlockForm.title,
          startTime: newBlockForm.startTime,
          endTime: newBlockForm.endTime,
          mealType: payloadByKind.mealType,
          linkedWorkoutPlanId: payloadByKind.linkedWorkoutPlanId,
        });
        await normalizeRoutineOrderByTime(data.routine!.id);
      } else {
        await (api as any).addTodayRoutineOverrideBlock({
          date: today,
          routineId: data.routine!.id,
          title: newBlockForm.title,
          startTime: newBlockForm.startTime,
          endTime: newBlockForm.endTime,
          mealType: payloadByKind.mealType,
          linkedWorkoutPlanId: payloadByKind.linkedWorkoutPlanId,
          sortOrder: (data.blocks?.length ?? 0) + 1,
        });
        await reorderTodayByTime();
      }
      setNewBlockForm({ title: '', startTime: '09:00', endTime: '10:00', mealType: '', blockKind: 'general' });
      setAddingBlock(false);
      await load();
    } finally {
      setSavingBlock(false);
    }
  }

  function openEditBlock(block: TodayRoutineBlock) {
    const blockKind: BlockKind = block.linkedWorkoutPlanId ? 'workout' : (block.mealType ? 'meal' : 'general');
    setEditBlockForm({
      title: block.title,
      startTime: block.startTime,
      endTime: block.endTime,
      mealType: block.mealType ?? '',
      blockKind,
    });
    setEditingBlockModal({ blockId: block.id, isOpen: true });
  }

  async function saveEditedBlock() {
    if (!editingBlockModal || !editBlockForm.title.trim()) return;
    const targetBlock = findBlockById(editingBlockModal.blockId);
    if (!targetBlock) return;
    const payloadByKind = getPayloadByBlockKind(editBlockForm, targetBlock.linkedWorkoutPlanId ?? getSuggestedWorkoutLinkId(targetBlock.id));
    setSavingEditBlock(true);
    try {
      if (syncWithRoutine) {
        await (api as any).updateRoutineBlock(targetBlock.baseBlockId ?? targetBlock.id, {
          title: editBlockForm.title,
          startTime: editBlockForm.startTime,
          endTime: editBlockForm.endTime,
          mealType: payloadByKind.mealType,
          linkedWorkoutPlanId: payloadByKind.linkedWorkoutPlanId,
        });
        if (data?.routine?.id) {
          await normalizeRoutineOrderByTime(data.routine.id);
        }
      } else if (targetBlock.baseBlockId) {
        await (api as any).upsertTodayRoutineBaseOverride({
          date: today,
          baseBlockId: targetBlock.baseBlockId,
          title: editBlockForm.title,
          startTime: editBlockForm.startTime,
          endTime: editBlockForm.endTime,
          mealType: payloadByKind.mealType,
          linkedWorkoutPlanId: payloadByKind.linkedWorkoutPlanId,
        });
      } else if (targetBlock.overrideId) {
        await (api as any).updateTodayRoutineOverride(targetBlock.overrideId, {
          title: editBlockForm.title,
          startTime: editBlockForm.startTime,
          endTime: editBlockForm.endTime,
          mealType: payloadByKind.mealType,
          linkedWorkoutPlanId: payloadByKind.linkedWorkoutPlanId,
        });
      }
      if (!syncWithRoutine) {
        await reorderTodayByTime();
      }
      setEditingBlockModal(null);
      await load();
    } finally {
      setSavingEditBlock(false);
    }
  }

  async function deleteEditedBlock() {
    if (!editingBlockModal) return;
    const targetBlock = findBlockById(editingBlockModal.blockId);
    if (!targetBlock) return;
    setDeletingEditBlock(true);
    try {
      if (syncWithRoutine) {
        await (api as any).deleteRoutineBlock(targetBlock.baseBlockId ?? targetBlock.id);
      } else if (targetBlock.baseBlockId) {
        await (api as any).upsertTodayRoutineBaseOverride({
          date: today,
          baseBlockId: targetBlock.baseBlockId,
          isDeleted: true,
        });
      } else if (targetBlock.overrideId) {
        await (api as any).deleteTodayRoutineOverride(targetBlock.overrideId);
      }
      setEditingBlockModal(null);
      await load();
    } finally {
      setDeletingEditBlock(false);
    }
  }

  async function skipBlock(block: TodayRoutineBlock) {
    setData(prev => prev ? {
      ...prev,
      blocks: prev.blocks.map(b => b.id === block.id ? { ...b, status: 'skipped' as any } : b),
    } : prev);
    try {
      await (api as any).logRoutineBlock({ ...getLogPayload(block), date: today, status: 'skipped' });
    } catch {
      load();
    }
  }

  async function unskipBlock(block: TodayRoutineBlock) {
    setData(prev => prev ? {
      ...prev,
      blocks: prev.blocks.map(b => b.id === block.id ? { ...b, status: 'pending' as any } : b),
    } : prev);
    try {
      await (api as any).logRoutineBlock({ ...getLogPayload(block), date: today, status: 'pending' });
    } catch {
      load();
    }
  }

  async function handleSkipDay() {
    setSkipping(true);
    try {
      await (api as any).skipTodayRoutine(today);
      await load();
    } finally {
      setSkipping(false);
    }
  }


  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl p-3 animate-pulse" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', height: 64 }} />
        ))}
      </div>
    );
  }

  if (!data || !data.routine) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No routine for today</p>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Assign a routine to this day to start tracking.</p>
        <button onClick={() => navigate('/settings/routines')}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white press"
          style={{ backgroundColor: 'var(--accent)' }}>
          Configure Routines →
        </button>
      </div>
    );
  }

  const { routine, blocks, stats, isSkipped } = data;
  const pct = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return (
    <div>
      {/* Skipped banner */}
      {isSkipped && (
        <div className="rounded-xl px-4 py-3 mb-3 flex items-center justify-between"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)', opacity: 0.9 }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Day skipped</p>
          <button onClick={handleSkipDay} disabled={skipping}
            className="text-xs underline press" style={{ color: 'var(--text-muted)' }}>
            Undo
          </button>
        </div>
      )}

      {/* Progress header */}
      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: routine.color || 'var(--accent)' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{routine.name}</p>
            </div>
            <p className="text-xl font-bold num" style={{ color: 'var(--text-primary)' }}>
              {stats.completed}/{stats.total}
            </p>
          </div>
          {!isSkipped && (
            <button onClick={handleSkipDay} disabled={skipping}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold press"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
              Skip Day
            </button>
          )}
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
          <motion.div className="h-full rounded-full"
            style={{ backgroundColor: routine.color || 'var(--accent)', width: `${pct}%` }}
            transition={{ duration: 0.5 }} />
        </div>
      </div>

      {/* Top controls (compact) */}
      <div className="mb-3 flex items-center justify-end gap-2 flex-wrap">
        {!isSkipped && data && data.routine && (
          <button
            onClick={() => setAddingBlock(b => !b)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold press"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            + Add Block
          </button>
        )}

        {!isSkipped && data && data.routine && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Sync</span>
            <button
              type="button"
              onClick={() => setSyncWithRoutine(v => !v)}
              className="w-9 h-5 rounded-full p-0.5 transition-colors"
              style={{ backgroundColor: syncWithRoutine ? (routine.color || 'var(--accent)') : 'var(--surface-elevated)' }}
              aria-label="Toggle sync with routine"
              title={syncWithRoutine ? 'Sync ON: all assigned days' : 'Sync OFF: today only'}
            >
              <span
                className="block w-4 h-4 rounded-full transition-transform"
                style={{
                  backgroundColor: '#fff',
                  transform: syncWithRoutine ? 'translateX(16px)' : 'translateX(0px)',
                }}
              />
            </button>
          </div>
        )}

        <button
          onClick={() => navigate('/settings/routines')}
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold press"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          Configure
        </button>
      </div>

      {/* Time blocks — vertical timeline */}
      <div className="relative">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {blocks.map((block, idx) => {
          const start = timeToMinutes(block.startTime);
          const end = timeToMinutes(block.endTime);
          const isActive = now >= start && now < end;
          const isDone = block.status === 'completed';
          const isBlockSkipped = block.status === 'skipped';
          const isLast = idx === blocks.length - 1;
          const blockKindMeta = getBlockKindMeta(block);

          return (
            <SortableRoutineBlockRow key={block.id} id={block.id}>
              {({ attributes, listeners }) => (
                <div className="relative flex items-start gap-1.5">
              {/* Timeline rail + dot + horizontal connector */}
              <div className="relative flex-shrink-0" style={{ width: 26 }}>
                {!isLast && (
                  <div
                    className="absolute"
                    style={{
                      left: 8,
                      top: 22,
                      bottom: -10,
                      width: 2,
                      borderRadius: 999,
                      backgroundColor: isDone ? (routine.color || 'var(--accent)') : 'var(--border)',
                      opacity: isDone ? 0.95 : 0.5,
                    }}
                  />
                )}
                <div
                  className="absolute w-3 h-3 rounded-full z-10"
                  style={{
                    left: 4.5,
                    top: 17,
                    backgroundColor: isDone ? (routine.color || 'var(--accent)') : 'var(--surface-elevated)',
                    border: `2px solid ${isDone || isActive ? (routine.color || 'var(--accent)') : 'var(--border)'}`,
                    boxShadow: isActive && !isDone ? `0 0 0 5px ${routine.color || 'var(--accent)'}32` : undefined,
                  }}
                />
                <div
                  className="absolute h-px"
                  style={{
                    left: 9.5,
                    top: 21.5,
                    width: 16,
                    backgroundColor: isDone ? (routine.color || 'var(--accent)') : 'var(--border)',
                    opacity: isDone || isActive ? 0.95 : 0.5,
                  }}
                />
              </div>

              {/* Card with status background */}
              <motion.div layout
                className="flex-1 rounded-xl overflow-hidden mb-0.5"
                style={{
                  border: isActive ? `1px solid ${routine.color || 'var(--accent)'}` : '1px solid var(--border)',
                  backgroundColor: isDone ? 'rgba(34,197,94,0.05)' : isBlockSkipped ? 'rgba(217,119,6,0.08)' : 'var(--surface)',
                }}>
                <div className="flex items-center gap-3 p-3">
                  {/* Time */}
                  <div className="text-center flex-shrink-0 w-12">
                    <p className="text-[10px] num font-semibold" style={{ color: 'var(--text-muted)' }}>{block.startTime}</p>
                    <div className="w-px h-2 mx-auto my-0.5" style={{ backgroundColor: 'var(--border)' }} />
                    <p className="text-[10px] num" style={{ color: 'var(--text-muted)' }}>{block.endTime}</p>
                  </div>

                  {/* Active pulse dot */}
                  {isActive && !isDone && !isBlockSkipped && (
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot flex-shrink-0" style={{ backgroundColor: routine.color || 'var(--accent)' }} />
                  )}

                  {/* Label + linked chips */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{
                      color: isDone || isBlockSkipped ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: isDone ? 'line-through' : isBlockSkipped ? 'line-through' : 'none',
                    }}>
                      {block.title}
                      {isBlockSkipped && (
                        <span className="ml-2 text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>skipped</span>
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span
                        className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                        style={blockKindMeta.style}
                      >
                        {blockKindMeta.label}
                      </span>
                    </div>
                    {(block.mealType || block.linkedWorkoutPlanId) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {block.mealType && (
                          <span
                            className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                            style={{ backgroundColor: 'rgba(34,197,94,0.14)', color: 'var(--accent-green)', border: '1px solid rgba(34,197,94,0.28)' }}
                          >
                            🍽 {block.mealType}
                          </span>
                        )}
                        {block.linkedWorkoutPlanId ? (
                          <button
                            type="button"
                            onClick={() => navigate('/body?tab=Workout')}
                            className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold press"
                            style={{ backgroundColor: 'rgba(108,99,255,0.16)', color: 'var(--accent)', border: '1px solid rgba(108,99,255,0.3)' }}
                          >
                            {block.linkedWorkoutLabel ?? 'Today Workout'}
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Now badge */}
                  {isActive && !isDone && !isBlockSkipped && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: routine.color || 'var(--accent)', color: '#fff' }}>
                      Now
                    </span>
                  )}

                  {/* Skip / Unskip button */}
                  {!isDone && !isSkipped && (
                    isBlockSkipped ? (
                      <button onClick={() => unskipBlock(block)}
                        className="p-1.5 rounded-lg press" style={{ color: 'rgba(217,119,6,0.7)' }}
                        title="Undo skip">
                        <RotateCcw size={13} />
                      </button>
                    ) : (
                      <button onClick={() => skipBlock(block)}
                        className="p-1.5 rounded-lg press" style={{ color: 'var(--text-muted)' }}
                        title="Skip this block">
                        <X size={13} />
                      </button>
                    )
                  )}

                  {/* Drag handle */}
                  {!isSkipped && (
                    <button
                      type="button"
                      className="p-1.5 rounded-lg press cursor-grab active:cursor-grabbing"
                      style={{ color: 'var(--text-muted)' }}
                      title="Drag to reorder"
                      {...attributes}
                      {...listeners}
                    >
                      <GripVertical size={13} />
                    </button>
                  )}

                  {/* Edit block */}
                  {!isSkipped && (
                    <button
                      onClick={() => openEditBlock(block)}
                      className="p-1.5 rounded-lg press"
                      style={{ color: 'var(--text-muted)' }}
                      title={syncWithRoutine ? 'Edit block for all routine days' : 'Edit block only for today'}
                    >
                      <Edit size={13} />
                    </button>
                  )}

                  {/* Check toggle */}
                  {!isSkipped && (
                    <button onClick={() => toggleBlock(block)} className="press ml-0.5">
                      {isDone
                        ? <CheckCircle2 size={20} style={{ color: routine.color || 'var(--accent)' }} />
                        : <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'var(--border)' }} />}
                    </button>
                  )}
                </div>

                {/* Active progress bar */}
                {isActive && !isDone && !isBlockSkipped && (
                  <div className="h-0.5 w-full" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                    <div className="h-full" style={{
                      backgroundColor: routine.color || 'var(--accent)',
                      width: `${Math.min(100, ((now - start) / (end - start)) * 100)}%`,
                      transition: 'width 60s linear',
                    }} />
                  </div>
                )}
              </motion.div>
                </div>
              )}
            </SortableRoutineBlockRow>
          );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Add block modal */}
      <AnimatePresence>
        {addingBlock && !isSkipped && data && data.routine && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 flex items-end z-50">
            <motion.div
              initial={{ y: 64 }}
              animate={{ y: 0 }}
              exit={{ y: 64 }}
              className="w-full rounded-t-2xl p-4 overflow-y-auto"
              style={{ backgroundColor: 'var(--surface)', maxHeight: 'min(88dvh, calc(var(--app-height, 100dvh) - 12px))' }}
            >
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Add block</p>
              <div className="space-y-2 mb-4">
                <input type="text" value={newBlockForm.title} onChange={e => setNewBlockForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Block title" autoFocus
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />

                <div>
                  <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Block Type</p>
                  <div className="flex gap-1.5">
                    {([
                      { key: 'general', label: 'General' },
                      { key: 'meal', label: 'Meal' },
                      { key: 'workout', label: 'Workout' },
                    ] as const).map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setNewBlockForm(prev => ({ ...prev, blockKind: opt.key }))}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold press"
                        style={{
                          backgroundColor: newBlockForm.blockKind === opt.key ? 'var(--accent)' : 'var(--surface-elevated)',
                          color: newBlockForm.blockKind === opt.key ? '#fff' : 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input type="time" value={newBlockForm.startTime} onChange={e => setNewBlockForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                  <input type="time" value={newBlockForm.endTime} onChange={e => setNewBlockForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                </div>

                {newBlockForm.blockKind === 'meal' && (
                  <select value={newBlockForm.mealType} onChange={e => setNewBlockForm(prev => ({ ...prev, mealType: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                    <option value="">Select meal type</option>
                    {['Breakfast', 'Pre-Workout', 'Post-Workout', 'Lunch', 'Snack', 'Dinner', 'Evening Snack'].map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setAddingBlock(false)} className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold press"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  Cancel
                </button>
                <button onClick={addBlockToday} disabled={!newBlockForm.title.trim() || savingBlock} className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold text-white press disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  {savingBlock ? 'Adding...' : 'Add'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit block modal */}
      <AnimatePresence>
        {editingBlockModal?.isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 flex items-end z-50">
            <motion.div initial={{ y: 64 }} animate={{ y: 0 }} exit={{ y: 64 }} className="w-full rounded-t-2xl p-4" style={{ backgroundColor: 'var(--surface)' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Edit block</p>
              <div className="space-y-2 mb-4">
                <input type="text" value={editBlockForm.title} onChange={e => setEditBlockForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Block title"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                <div className="flex gap-2">
                  <input type="time" value={editBlockForm.startTime} onChange={e => setEditBlockForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                  <input type="time" value={editBlockForm.endTime} onChange={e => setEditBlockForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                </div>
                <select value={editBlockForm.mealType} onChange={e => setEditBlockForm(prev => ({ ...prev, mealType: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                  <option value="">No meal type</option>
                  {['Breakfast', 'Pre-Workout', 'Post-Workout', 'Lunch', 'Snack', 'Dinner', 'Evening Snack'].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={deleteEditedBlock} disabled={deletingEditBlock} className="px-4 py-2.5 rounded-lg text-xs font-semibold press disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                  {deletingEditBlock ? 'Deleting...' : 'Delete'}
                </button>
                <button onClick={() => setEditingBlockModal(null)} className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold press"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  Cancel
                </button>
                <button onClick={saveEditedBlock} disabled={!editBlockForm.title.trim() || savingEditBlock} className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold text-white press disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  {savingEditBlock ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion time modal */}
      <AnimatePresence>
        {completionTimeModal?.isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 flex items-end z-50">
            <motion.div initial={{ y: 64 }} animate={{ y: 0 }} exit={{ y: 64 }} className="w-full rounded-t-2xl p-4" style={{ backgroundColor: 'var(--surface)' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Mark as completed at</p>
              <div className="space-y-2 mb-4">
                <div>
                  <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Start time</p>
                  <input type="time" value={completionTime.start} onChange={e => setCompletionTime(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>End time</p>
                  <input type="time" value={completionTime.end} onChange={e => setCompletionTime(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCompletionTimeModal(null)} className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold press"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  Cancel
                </button>
                <button onClick={confirmCompletion} className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold text-white press"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type TabId = 'dashboard' | 'tasks' | 'routine';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'routine', label: 'Daily Routine', icon: Repeat },
  ];

  return (
    <div className="px-4 pt-4 pb-nav">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {greeting(user?.name)}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {format(new Date(), 'EEEE, d MMMM')}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
            <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
            <Settings size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all press"
              style={{ backgroundColor: activeTab === tab.id ? 'var(--accent)' : 'transparent', color: activeTab === tab.id ? '#fff' : 'var(--text-muted)' }}>
              <Icon size={14} />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}>
          {activeTab === 'dashboard' && (
            <DashboardTab
              user={user}
              navigate={navigate}
              onOpenTasks={() => setActiveTab('tasks')}
              onOpenRoutine={() => setActiveTab('routine')}
            />
          )}
          {activeTab === 'tasks' && <TasksTab user={user} />}
          {activeTab === 'routine' && user && <DailyRoutineTab userId={user.id} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
