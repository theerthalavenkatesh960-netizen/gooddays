import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Settings, CheckCircle2, Dumbbell, Droplets, Target, Flame, ChevronRight, Zap, TrendingUp, Plus, RotateCcw, Trash2, Filter, CreditCard as Edit, Home, Briefcase, BookOpen, User, Heart, DollarSign, ShoppingCart, Users, Film, HeartPulse, Plane, Music, GripVertical, LayoutDashboard, CheckSquare, Repeat, X, ListChecks, ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { format, isToday, parseISO, subDays, addDays, startOfWeek } from 'date-fns';
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting(name?: string) {
  const h = new Date().getHours();
  const base = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${base}${name ? `, ${name.split(' ')[0]}` : ''}`;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function currentMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function minutesToTime(minutes: number) {
  const normalized = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

type MomentumWeights = {
  tasks: number;
  routine: number;
  body: number;
  workout: number;
  finance: number;
  journal: number;
};

const DEFAULT_MOMENTUM_WEIGHTS: MomentumWeights = {
  tasks: 35,
  routine: 20,
  body: 15,
  workout: 15,
  finance: 10,
  journal: 5,
};

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
  weights: MomentumWeights;
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
  const [water, setWater] = useState(0);
  const [waterGoal] = useState(8);
  const [workoutStreak, setWorkoutStreak] = useState(0);
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
        const readWeight = (value: unknown, fallback: number) => {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : fallback;
        };
        const normalized = {
          tasks: clamp(readWeight(settingsWeights.tasks, DEFAULT_MOMENTUM_WEIGHTS.tasks), 0, 100),
          routine: clamp(readWeight(settingsWeights.routine, DEFAULT_MOMENTUM_WEIGHTS.routine), 0, 100),
          body: clamp(readWeight(settingsWeights.body, DEFAULT_MOMENTUM_WEIGHTS.body), 0, 100),
          workout: clamp(readWeight(settingsWeights.workout, DEFAULT_MOMENTUM_WEIGHTS.workout), 0, 100),
          finance: clamp(readWeight(settingsWeights.finance, DEFAULT_MOMENTUM_WEIGHTS.finance), 0, 100),
          journal: clamp(readWeight(settingsWeights.journal, DEFAULT_MOMENTUM_WEIGHTS.journal), 0, 100),
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
      setWater(waterCups);

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

      {/* AI Health Advisor banner */}
      <button
        onClick={() => navigate('/health-advisor')}
        className="w-full mb-4 rounded-2xl p-4 flex items-center gap-3 press"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-green, var(--accent)))', border: 'none' }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
          <Brain size={20} className="text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-white">AI Health Advisor</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>Ask anything about your workouts, diet & progress</p>
        </div>
        <ChevronRight size={18} className="text-white opacity-70" />
      </button>

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
  const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const [tasks, setTasks] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [todayReminderDoneIds, setTodayReminderDoneIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [itemType, setItemType] = useState<'task' | 'reminder' | 'list'>('task');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'recurring'>('all');
  const [filterType, setFilterType] = useState<'all' | 'task' | 'reminder'>('all');
  const [expandedListIds, setExpandedListIds] = useState<Set<string>>(new Set());

  const [listForm, setListForm] = useState({
    title: '',
    items: [{ text: '', done: false }],
  });

  const addListFormItem = () =>
    setListForm(prev => ({ ...prev, items: [...prev.items, { text: '', done: false }] }));
  const removeListFormItem = (idx: number) =>
    setListForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  const updateListFormItem = (idx: number, text: string) =>
    setListForm(prev => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, text } : it) }));

  const parseListItems = (task: any): { id: string; text: string; done: boolean }[] => {
    try {
      const raw = task.notesJson ?? task.notes_json ?? task.NotesJson;
      if (!raw) return [];
      return JSON.parse(raw);
    } catch { return []; }
  };

  const toggleListItem = async (task: any, itemId: string) => {
    const items = parseListItems(task).map((it: any, idx: number) => {
      const currentId = it.id ?? String(idx);
      return currentId === itemId ? { ...it, done: !it.done } : it;
    });
    const allDone = items.length > 0 && items.every((i: any) => i.done);
    await api.updateTask(Number(task.id), {
      notesJson: JSON.stringify(items),
      isCompleted: allDone,
    });
    await loadAll();
  };

  const [taskForm, setTaskForm] = useState({
    title: '',
    category: CATEGORY_OPTIONS[0].name,
    priority: 'medium',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    recurring: false,
    recurrenceInterval: 1,
    recurrenceUnit: 'days' as 'days' | 'weeks' | 'months' | 'years',
    recurrenceDays: [] as string[],
    monthlyDay: 1,
    recurrenceStart: '',
    recurrenceEnd: '',
  });

  const [reminderForm, setReminderForm] = useState({
    title: '',
    time: '09:00',
    frequency: 'daily' as 'daily' | 'weekly' | 'custom',
    weeklyDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    customInterval: 1,
    customUnit: 'days' as 'days' | 'weeks' | 'months' | 'yearly',
    isEnabled: true,
  });

  useEffect(() => {
    if (user) {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const normalizeTodayReminderDone = (todayLogsPayload: any): Set<number> => {
    const rawLogs = Array.isArray(todayLogsPayload)
      ? todayLogsPayload
      : Array.isArray(todayLogsPayload?.logs)
      ? todayLogsPayload.logs
      : [];

    const doneIds = rawLogs
      .filter((log: any) => Boolean(log?.markedDone ?? log?.MarkedDone))
      .map((log: any) => Number(log?.reminderId ?? log?.ReminderId))
      .filter((id: number) => Number.isFinite(id));

    return new Set(doneIds);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [taskData, reminderData, todayLogs] = await Promise.all([
        api.getTasks(user.id).catch(() => []),
        api.getReminders().catch(() => []),
        api.getTodayReminderLogs().catch(() => []),
      ]);

      setTasks(Array.isArray(taskData) ? taskData : []);
      setReminders(Array.isArray(reminderData) ? reminderData : []);
      setTodayReminderDoneIds(normalizeTodayReminderDone(todayLogs));
    } finally {
      setLoading(false);
    }
  };

  const isTaskDone = (task: any) => Boolean(task.isCompleted ?? task.status === 'completed');
  const isReminderDone = (reminder: any) => todayReminderDoneIds.has(Number(reminder.id));

  const formatReminderFrequency = (reminder: any) => {
    if (reminder.frequency !== 'custom') return reminder.frequency ?? 'daily';
    const activeDays = String(reminder.activeDays || '');
    const match = activeDays.match(/^interval:(\d+);unit:(days|weeks|months|yearly)$/);
    if (!match) return 'custom';
    return `every ${Math.max(1, parseInt(match[1], 10) || 1)} ${match[2]}`;
  };

  const formatTaskRecurring = (task: any) => {
    if (!task.recurring) return null;
    const interval = Number(task.recurrenceInterval || 1);
    const unit = String(task.recurrenceUnit || 'days');
    return `every ${interval} ${unit}`;
  };

  const renderTaskHistory = (task: any) => {
    if (!task.recurrenceId) return null;
    const todayCutoff = new Date();
    todayCutoff.setHours(0, 0, 0, 0);
    const seriesHistory = tasks.filter((t: any) => {
      if (t.recurrenceId !== task.recurrenceId) return false;
      const dueValue = t.dueDate || t.due_date;
      if (!dueValue) return false;
      const due = new Date(dueValue);
      due.setHours(0, 0, 0, 0);
      return due <= todayCutoff;
    });
    const completed = seriesHistory
      .filter((t: any) => isTaskDone(t))
      .sort((a: any, b: any) => new Date(b.dueDate || b.due_date).getTime() - new Date(a.dueDate || a.due_date).getTime())
      .slice(0, 5);
    const missed = seriesHistory.filter((t: any) => !isTaskDone(t)).length;
    if (completed.length === 0 && missed === 0) return null;
    return (
      <div className="flex items-center gap-1.5 mt-1">
        {completed.map((t: any, i: number) => (
          <span
            key={t.id || i}
            title={new Date(t.dueDate || t.due_date).toLocaleDateString()}
            className="w-4 h-4 rounded-sm flex items-center justify-center text-white text-[9px]"
            style={{ backgroundColor: 'var(--accent-green)' }}
          >
            ✓
          </span>
        ))}
        {missed > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
            -{missed}
          </span>
        )}
      </div>
    );
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  const isReminderAppliedToday = (reminder: any): boolean => {
    if (!reminder.isEnabled) return false;
    if (reminder.frequency === 'daily') return true;
    if (reminder.frequency === 'weekly') {
      const activeDays = String(reminder.activeDays || '').split(',');
      const todayName = format(new Date(), 'EEE');
      return activeDays.includes(todayName);
    }
    if (reminder.frequency === 'custom') {
      return true; // Show custom reminders
    }
    return false;
  };

  const actionItems = useMemo(() => {
    // For recurring tasks: deduplicate by recurrenceId — show only one entry per series
    // Pick priority: today's instance > next upcoming > most recent
    const recurringGroups = new Map<string, any[]>();
    const nonRecurringTasks: any[] = [];

    for (const task of tasks) {
      if (task.recurring && task.recurrenceId) {
        const group = recurringGroups.get(task.recurrenceId) || [];
        group.push(task);
        recurringGroups.set(task.recurrenceId, group);
      } else {
        nonRecurringTasks.push(task);
      }
    }

    // Pick the best representative from each recurring group
    const representativeTasks: any[] = [];
    for (const [, group] of recurringGroups) {
      const todayInstance = group.find((t: any) => {
        const d = t.dueDate || t.due_date;
        return d && format(parseISO(d), 'yyyy-MM-dd') === today;
      });
      const nextUpcoming = group
        .filter((t: any) => {
          const d = t.dueDate || t.due_date;
          return d && format(parseISO(d), 'yyyy-MM-dd') > today && !isTaskDone(t);
        })
        .sort((a: any, b: any) => {
          const da = a.dueDate || a.due_date;
          const db = b.dueDate || b.due_date;
          return String(da).localeCompare(String(db));
        })[0];
      const pendingOverdue = group
        .filter((t: any) => {
          const d = t.dueDate || t.due_date;
          return d && format(parseISO(d), 'yyyy-MM-dd') < today && !isTaskDone(t);
        })
        .sort((a: any, b: any) => String(b.dueDate || b.due_date).localeCompare(String(a.dueDate || a.due_date)))[0];
      representativeTasks.push(todayInstance || pendingOverdue || nextUpcoming || group[0]);
    }

    const allTasksToShow = [...nonRecurringTasks, ...representativeTasks];

    const taskItems = allTasksToShow
      .filter((task: any) => {
        const dueDate = task.dueDate || task.due_date;
        // No due date → always show
        if (!dueDate) return true;
        const dueDateStr = format(parseISO(dueDate), 'yyyy-MM-dd');
        // Hide old completed non-recurring tasks
        if (!task.recurring && dueDateStr < today && isTaskDone(task)) return false;
        return true;
      })
      .map((task: any) => {
        const dueDate = task.dueDate || task.due_date;
        const dueDateStr = dueDate ? format(parseISO(dueDate), 'yyyy-MM-dd') : null;
        const isOverdue = dueDateStr && dueDateStr < today && !isTaskDone(task);
        const isFuture = dueDateStr && dueDateStr > today;
        const recurrLabel = formatTaskRecurring(task);
        const subtitle = recurrLabel
          || (isOverdue ? `Overdue · ${format(parseISO(dueDate), 'EEE, MMM d')}` : null)
          || (isFuture ? format(parseISO(dueDate), 'EEE, MMM d') : null)
          || (dueDateStr === today ? 'Today' : null)
          || 'No due date';
        return {
          id: `task-${task.id}`,
          type: 'task' as const,
          title: task.title,
          done: isTaskDone(task),
          recurring: Boolean(task.recurring),
          isOverdue: Boolean(isOverdue),
          raw: task,
          category: task.category,
          subtitle,
        };
      });

    const reminderItems = reminders
      .filter((r: any) => isReminderAppliedToday(r))
      .map((reminder: any) => ({
        id: `reminder-${reminder.id}`,
        type: 'reminder' as const,
        title: reminder.title,
        done: isReminderDone(reminder),
        recurring: true,
        raw: reminder,
        category: 'Reminder',
        subtitle: `${reminder.time || '--:--'} • ${formatReminderFrequency(reminder)}`,
      }));

    return [...taskItems, ...reminderItems]
      .sort((a, b) => {
        // Done tasks always last
        if (a.done !== b.done) return Number(a.done) - Number(b.done);
        // Overdue first among pending
        const aOver = (a as any).isOverdue ? 0 : 1;
        const bOver = (b as any).isOverdue ? 0 : 1;
        if (aOver !== bOver) return aOver - bOver;
        return 0;
      });
  }, [tasks, reminders, todayReminderDoneIds, today]);

  const filteredItems = actionItems.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterStatus === 'pending' && item.done) return false;
    if (filterStatus === 'completed' && !item.done) return false;
    if (filterStatus === 'recurring' && !item.recurring) return false;
    return true;
  });

  const completedCount = actionItems.filter(i => i.done).length;
  const totalCount = actionItems.length;

  const toggleItem = async (item: (typeof actionItems)[number]) => {
    if (item.type === 'task') {
      await api.updateTask(Number(item.raw.id), { isCompleted: !item.done });
      if (!item.done && user) await api.addPoints(user.id, 'task_completed', 1);
      await loadAll();
      return;
    }
    await api.toggleReminderDone(Number(item.raw.id));
    await loadAll();
  };

  const deleteItem = async (item: (typeof actionItems)[number]) => {
    if (item.type === 'task') {
      await api.deleteTask(Number(item.raw.id), 'this');
    } else {
      await api.deleteReminder(Number(item.raw.id));
    }
    await loadAll();
  };

  const resetForm = () => {
    setTaskForm({
      title: '',
      category: CATEGORY_OPTIONS[0].name,
      priority: 'medium',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      recurring: false,
      recurrenceInterval: 1,
      recurrenceUnit: 'days',
      recurrenceDays: [],
      monthlyDay: 1,
      recurrenceStart: '',
      recurrenceEnd: '',
    });
    setReminderForm({
      title: '',
      time: '09:00',
      frequency: 'daily',
      weeklyDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      customInterval: 1,
      customUnit: 'days',
      isEnabled: true,
    });
    setItemType('task');
    setShowAddSheet(false);
    setListForm({ title: '', items: [{ text: '', done: false }] });
  };

  const createItem = async () => {
    if (itemType === 'task') {
      if (!taskForm.title.trim()) return;
      const body: any = {
        userId: user.id,
        title: taskForm.title,
        category: taskForm.category,
        priority: taskForm.priority,
        recurring: taskForm.recurring,
        recurrenceInterval: taskForm.recurrenceInterval,
        recurrenceUnit: taskForm.recurrenceUnit,
        recurrenceStartDate: taskForm.recurrenceStart ? new Date(taskForm.recurrenceStart) : undefined,
        recurrenceEndDate: taskForm.recurrenceEnd ? new Date(taskForm.recurrenceEnd) : undefined,
        recurrenceDays: taskForm.recurrenceUnit === 'weeks'
          ? taskForm.recurrenceDays
          : taskForm.recurrenceUnit === 'months'
          ? [String(taskForm.monthlyDay)]
          : undefined,
      };
      if (!taskForm.recurring && taskForm.dueDate) body.dueDate = new Date(taskForm.dueDate);
      await api.createTask(body);
      resetForm();
      await loadAll();
      return;
    }

    if (itemType === 'list') {
      if (!listForm.title.trim()) return;
      const items = listForm.items
        .filter(it => it.text.trim())
        .map(it => ({ id: crypto.randomUUID(), text: it.text.trim(), done: false }));
      await api.createTask({
        userId: user.id,
        title: listForm.title.trim(),
        category: 'Shopping',
        notesJson: JSON.stringify(items),
      });
      resetForm();
      await loadAll();
      return;
    }

    if (!reminderForm.title.trim()) return;
    const customSchedule = `interval:${Math.max(1, Number(reminderForm.customInterval) || 1)};unit:${reminderForm.customUnit}`;
    const activeDays = reminderForm.frequency === 'daily'
      ? 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'
      : reminderForm.frequency === 'weekly'
      ? reminderForm.weeklyDays.join(',')
      : customSchedule;

    await api.createReminder({
      title: reminderForm.title,
      time: reminderForm.time,
      frequency: reminderForm.frequency,
      activeDays,
      isEnabled: reminderForm.isEnabled,
    });
    resetForm();
    await loadAll();
  };

  return (
    <div>
      <div className="mb-4 p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Actions Progress</p>
            <p className="text-2xl font-extrabold num" style={{ color: 'var(--text-primary)' }}>
              {completedCount}/{totalCount}
            </p>
          </div>
          <button
            onClick={() => setShowAddSheet(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white press"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3">
        {(['all', 'pending', 'completed', 'recurring'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold press"
            style={{
              backgroundColor: filterStatus === s ? 'var(--accent)' : 'var(--surface)',
              color: filterStatus === s ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'var(--surface)' }}>
          <Filter size={12} style={{ color: 'var(--text-muted)' }} />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="text-xs outline-none bg-transparent"
            style={{ color: 'var(--text-secondary)' }}
          >
            <option value="all">All Types</option>
            <option value="task">Tasks</option>
            <option value="reminder">Reminders</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl skeleton" style={{ backgroundColor: 'var(--surface)' }} />)
        ) : filteredItems.length === 0 ? (
          <div className="py-10 text-center">
            <Target size={30} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No actions in this view</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const listItems = item.type === 'task' ? parseListItems(item.raw) : [];
            const isList = listItems.length > 0;
            const isExpanded = expandedListIds.has(item.id);
            const doneCount = listItems.filter((it: any) => it.done).length;

            if (isList) {
              return (
                <div key={item.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', opacity: item.done ? 0.7 : 1 }}>
                  <button
                    className="w-full flex items-center gap-2.5 p-3 press"
                    onClick={() => setExpandedListIds(prev => {
                      const next = new Set(prev);
                      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                      return next;
                    })}
                  >
                    <ListChecks size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate" style={{ color: item.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.done ? 'line-through' : 'none' }}>
                        {item.title}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                          List
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)22', color: 'var(--accent)' }}>
                          {doneCount}/{listItems.length} done
                        </span>
                        {(item as any).isOverdue && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                            Overdue
                          </span>
                        )}
                        {item.recurring && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-green)22', color: 'var(--accent-green)' }}>
                            recurring
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteItem(item);
                      }}
                      className="p-1 press"
                      style={{ color: '#ef4444' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
                      {listItems.map((it: any, idx: number) => {
                        const itemId = it.id ?? String(idx);
                        return (
                          <button
                            key={itemId}
                            className="w-full flex items-center gap-2.5 py-1.5 press"
                            onClick={() => toggleListItem(item.raw, itemId)}
                          >
                            {it.done
                              ? <CheckCircle2 size={16} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                              : <div className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: 'var(--border)' }} />}
                            <span className="text-sm text-left" style={{ color: it.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: it.done ? 'line-through' : 'none' }}>
                              {it.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={item.id} className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', opacity: item.done ? 0.6 : 1 }}>
                <div className="flex items-center gap-2.5">
                  <button onClick={() => toggleItem(item)} className="flex-shrink-0 press">
                    {item.done
                      ? <CheckCircle2 size={20} style={{ color: 'var(--accent)' }} />
                      : <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'var(--border)' }} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: item.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.done ? 'line-through' : 'none' }}>
                      {item.title}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                        {item.type === 'task' ? 'Task' : 'Reminder'}
                      </span>
                      {(item as any).isOverdue && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                          Overdue
                        </span>
                      )}
                      {item.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: item.type === 'reminder' ? 'var(--accent)22' : 'var(--surface-elevated)', color: item.type === 'reminder' ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {item.category}
                        </span>
                      )}
                      {item.recurring && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-green)22', color: 'var(--accent-green)' }}>
                          recurring
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: (item as any).isOverdue ? '#ef4444' : 'var(--text-muted)' }}>
                      {item.subtitle}
                    </p>
                    {item.type === 'task' && item.raw.recurring && renderTaskHistory(item.raw)}
                  </div>
                  <button onClick={() => deleteItem(item)} className="p-1.5 rounded-lg press" style={{ color: '#ef4444' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {showAddSheet && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetForm} />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden flex flex-col"
              style={{ backgroundColor: 'var(--surface)', maxHeight: '90dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
              </div>
              <div className="flex items-center justify-between px-5 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>New Action</h3>
                <button onClick={resetForm} className="text-xl leading-none press" style={{ color: 'var(--text-muted)' }}>&times;</button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div className="flex gap-2">
                  {(['task', 'reminder', 'list'] as const).map(kind => (
                    <button
                      key={kind}
                      onClick={() => setItemType(kind)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold press"
                      style={{ backgroundColor: itemType === kind ? 'var(--accent)' : 'var(--surface-elevated)', color: itemType === kind ? '#fff' : 'var(--text-secondary)' }}
                    >
                      {kind === 'task' ? 'Task' : kind === 'reminder' ? 'Reminder' : 'List'}
                    </button>
                  ))}
                </div>

                {itemType === 'list' ? (
                  <>
                    <input
                      type="text"
                      value={listForm.title}
                      onChange={e => setListForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="List name (e.g. Grocery list)"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                    <div className="space-y-2">
                      {listForm.items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={it.text}
                            onChange={e => updateListFormItem(idx, e.target.value)}
                            placeholder={`Item ${idx + 1}`}
                            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addListFormItem(); } }}
                          />
                          <button onClick={() => removeListFormItem(idx)} className="p-1.5" style={{ color: 'var(--text-muted)' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={addListFormItem}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg press"
                        style={{ color: 'var(--accent)', backgroundColor: 'var(--surface-elevated)' }}
                      >
                        <Plus size={12} /> Add item
                      </button>
                    </div>
                  </>
                ) : itemType === 'task' ? (
                  <>
                    <input
                      type="text"
                      value={taskForm.title}
                      onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Task title"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                    <div className="flex items-center gap-2">
                      <select value={taskForm.category} onChange={e => setTaskForm(prev => ({ ...prev, category: e.target.value }))}
                        className="px-3 py-2 rounded-xl text-xs outline-none"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                        {CATEGORY_OPTIONS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                      <select value={taskForm.priority} onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                        className="px-3 py-2 rounded-xl text-xs outline-none"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={taskForm.recurring}
                        onChange={e => setTaskForm(prev => ({ ...prev, recurring: e.target.checked }))}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Recurring</span>
                    </label>
                    {!taskForm.recurring ? (
                      <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="px-3 py-2 rounded-xl text-xs outline-none"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                    ) : (
                      <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Every</span>
                          <input type="number" min={1} value={taskForm.recurrenceInterval}
                            onChange={e => setTaskForm(prev => ({ ...prev, recurrenceInterval: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                            className="w-14 px-2 py-1.5 rounded-lg text-xs text-center outline-none"
                            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                          <select value={taskForm.recurrenceUnit} onChange={e => setTaskForm(prev => ({ ...prev, recurrenceUnit: e.target.value as any }))}
                            className="px-2 py-1.5 rounded-lg text-xs outline-none"
                            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                            <option value="days">days</option>
                            <option value="weeks">weeks</option>
                            <option value="months">months</option>
                            <option value="years">years</option>
                          </select>
                        </div>

                        {taskForm.recurrenceUnit === 'weeks' && (
                          <div className="flex gap-1.5 flex-wrap">
                            {WEEKDAY_SHORT.map((day, i) => {
                              const fullDay = WEEKDAY_FULL[i];
                              const active = taskForm.recurrenceDays.includes(fullDay);
                              return (
                                <button
                                  key={day}
                                  onClick={() => setTaskForm(prev => ({
                                    ...prev,
                                    recurrenceDays: active
                                      ? prev.recurrenceDays.filter(d => d !== fullDay)
                                      : [...prev.recurrenceDays, fullDay],
                                  }))}
                                  className="w-8 h-8 rounded-full text-[10px] font-semibold press"
                                  style={{ backgroundColor: active ? 'var(--accent)' : 'var(--surface)', color: active ? '#fff' : 'var(--text-muted)' }}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {taskForm.recurrenceUnit === 'months' && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>on day</span>
                            <input
                              type="number"
                              min={1}
                              max={31}
                              value={taskForm.monthlyDay}
                              onChange={e => setTaskForm(prev => ({ ...prev, monthlyDay: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                              className="w-14 px-2 py-1.5 rounded-lg text-xs text-center outline-none"
                              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={reminderForm.title}
                      onChange={e => setReminderForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Reminder title"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                    <input
                      type="time"
                      value={reminderForm.time}
                      onChange={e => setReminderForm(prev => ({ ...prev, time: e.target.value }))}
                      className="px-3 py-2 rounded-xl text-xs outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                    <select
                      value={reminderForm.frequency}
                      onChange={e => setReminderForm(prev => ({ ...prev, frequency: e.target.value as any }))}
                      className="px-3 py-2 rounded-xl text-xs outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="custom">Custom</option>
                    </select>

                    {reminderForm.frequency === 'weekly' && (
                      <div className="flex gap-1.5 flex-wrap">
                        {WEEKDAY_SHORT.map(day => {
                          const active = reminderForm.weeklyDays.includes(day);
                          return (
                            <button
                              key={day}
                              onClick={() => setReminderForm(prev => ({
                                ...prev,
                                weeklyDays: active ? prev.weeklyDays.filter(d => d !== day) : [...prev.weeklyDays, day],
                              }))}
                              className="w-8 h-8 rounded-full text-[10px] font-semibold press"
                              style={{ backgroundColor: active ? 'var(--accent)' : 'var(--surface)', color: active ? '#fff' : 'var(--text-muted)' }}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {reminderForm.frequency === 'custom' && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={1}
                          value={reminderForm.customInterval}
                          onChange={e => setReminderForm(prev => ({ ...prev, customInterval: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                          className="px-3 py-2 rounded-xl text-xs outline-none"
                          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                        <select
                          value={reminderForm.customUnit}
                          onChange={e => setReminderForm(prev => ({ ...prev, customUnit: e.target.value as any }))}
                          className="px-3 py-2 rounded-xl text-xs outline-none"
                          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        >
                          <option value="days">days</option>
                          <option value="weeks">weeks</option>
                          <option value="months">months</option>
                          <option value="yearly">yearly</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-2 px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button onClick={resetForm} className="px-4 py-2.5 rounded-xl text-sm font-semibold press" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button onClick={createItem} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white press" style={{ backgroundColor: 'var(--accent)' }}>
                  Create
                </button>
              </div>
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
  const [newBlockForm, setNewBlockForm] = useState({ title: '', startTime: '06:00', endTime: '06:30', mealType: '', blockKind: 'general' as BlockKind });
  const [savingBlock, setSavingBlock] = useState(false);
  const [syncWithRoutine, setSyncWithRoutine] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [editingBlockModal, setEditingBlockModal] = useState<{ blockId: number; isOpen: boolean } | null>(null);
  const [editBlockForm, setEditBlockForm] = useState({ title: '', startTime: '09:00', endTime: '10:00', mealType: '', blockKind: 'general' as BlockKind });
  const [savingEditBlock, setSavingEditBlock] = useState(false);
  const [deletingEditBlock, setDeletingEditBlock] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const now = useMemo(() => currentMinutes(), [clockTick]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(t => t + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

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

  function getDefaultNewBlockWindow() {
    const timeline = [...(data?.blocks ?? [])].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    const previous = timeline[timeline.length - 1];
    if (!previous) return { startTime: '06:00', endTime: '06:30' };
    const start = previous.endTime;
    const end = minutesToTime(timeToMinutes(start) + 30);
    return { startTime: start, endTime: end };
  }

  function openAddBlockModal() {
    const { startTime, endTime } = getDefaultNewBlockWindow();
    setNewBlockForm({ title: '', startTime, endTime, mealType: '', blockKind: 'general' });
    setAddingBlock(true);
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
      const { startTime, endTime } = getDefaultNewBlockWindow();
      setNewBlockForm({ title: '', startTime, endTime, mealType: '', blockKind: 'general' });
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
            onClick={() => (addingBlock ? setAddingBlock(false) : openAddBlockModal())}
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
            <div className="space-y-0">
              {blocks.map((block, idx) => {
          const start = timeToMinutes(block.startTime);
          const end = timeToMinutes(block.endTime);
          const isActive = now >= start && now < end;
          const isDone = block.status === 'completed';
          const isBlockSkipped = block.status === 'skipped';
          const isCurrentBlock = isActive && !isDone && !isBlockSkipped;
          const isMissedBlock = now >= end && !isDone && !isBlockSkipped;
          const isLast = idx === blocks.length - 1;
          const blockKindMeta = getBlockKindMeta(block);

          return (
            <SortableRoutineBlockRow key={block.id} id={block.id}>
              {({ attributes, listeners }) => (
                <div className="relative flex items-start gap-1.5 pb-2">
              {/* Timeline column — holds dot, horizontal connector, and vertical rail */}
              <div className="relative self-stretch flex-shrink-0" style={{ width: 26 }}>
                {/* Vertical connector line ABOVE the dot (from top of row to center) */}
                {idx > 0 && (
                  <div
                    className="absolute"
                    style={{
                      left: 9,
                      top: 0,
                      bottom: 'calc(50% + 7px)',
                      width: 2,
                      borderRadius: 999,
                      background: isDone
                        ? (routine.color || 'var(--accent)')
                        : isBlockSkipped
                        ? 'var(--status-skipped)'
                        : isActive
                        ? (routine.color || 'var(--accent)')
                        : 'var(--status-pending)',
                    }}
                  />
                )}
                {/* Vertical connector line BELOW the dot to next block */}
                {!isLast && (
                  <div
                    className="absolute"
                    style={{
                      left: 9,
                      top: 'calc(50% + 7px)',
                      bottom: 0,
                      width: 2,
                      borderRadius: 999,
                      background: isDone
                        ? (routine.color || 'var(--accent)')
                        : isBlockSkipped
                        ? 'var(--status-skipped)'
                        : isActive
                        ? `linear-gradient(to bottom, ${routine.color || 'var(--accent)'}, var(--status-pending))`
                        : 'var(--status-pending)',
                    }}
                  />
                )}
                {/* Dot — centered vertically in the block row */}
                <div
                  className="absolute w-3.5 h-3.5 rounded-full z-10"
                  style={{
                    left: 3.5,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: isDone
                      ? (routine.color || 'var(--accent)')
                      : isBlockSkipped
                      ? 'rgba(217,119,6,0.3)'
                      : isActive
                      ? 'var(--surface)'
                      : 'var(--surface-elevated)',
                    border: `2.5px solid ${
                      isDone
                        ? (routine.color || 'var(--accent)')
                        : isBlockSkipped
                        ? 'rgba(217,119,6,0.8)'
                        : isActive
                        ? (routine.color || 'var(--accent)')
                        : 'var(--border)'
                    }`,
                    boxShadow: isActive && !isDone ? `0 0 0 5px ${routine.color || 'var(--accent)'}32` : undefined,
                  }}
                />
                {/* Horizontal connector to card */}
                <div
                  className="absolute h-px"
                  style={{
                    left: 13,
                    top: '50%',
                    width: 13,
                    backgroundColor: isDone
                      ? (routine.color || 'var(--accent)')
                      : isBlockSkipped
                      ? 'var(--status-skipped)'
                      : isActive
                      ? (routine.color || 'var(--accent)')
                      : 'var(--status-pending)',
                    opacity: 1,
                  }}
                />
              </div>

              {/* Card with status background */}
              <motion.div layout
                className="relative flex-1 rounded-xl overflow-hidden mb-0.5"
                style={{
                  border: isActive ? `1px solid ${routine.color || 'var(--accent)'}` : '1px solid var(--border)',
                  backgroundColor: isDone ? 'var(--status-completed-bg)' : isBlockSkipped ? 'rgba(217,119,6,0.08)' : 'var(--surface)',
                }}>
                {isCurrentBlock ? (
                  <span
                    className="absolute right-0 top-0 h-6 w-16 rounded-bl-lg text-[10px] font-semibold z-10 flex items-center justify-center"
                    style={{ backgroundColor: routine.color || 'var(--accent)', color: '#fff' }}
                  >
                    Now
                  </span>
                ) : isMissedBlock ? (
                  <span
                    className="absolute right-0 top-0 h-6 w-16 rounded-bl-lg text-[10px] font-semibold z-10 flex items-center justify-center"
                    style={{ backgroundColor: 'var(--accent-warm)', color: '#fff' }}
                  >
                    Missed
                  </span>
                ) : null}
                <div className="relative pl-3 pr-16 py-5">
                  <div className="flex items-center justify-center gap-3 min-w-0">
                    {/* Time */}
                    <div className="text-center flex-shrink-0 w-12">
                      <p className="text-[10px] num font-semibold" style={{ color: 'var(--text-muted)' }}>{block.startTime}</p>
                      {!isSkipped ? (
                        <button
                          type="button"
                          className="mx-auto my-0.5 h-4 w-4 rounded-sm press cursor-grab active:cursor-grabbing flex items-center justify-center"
                          style={{ color: 'var(--text-muted)', backgroundColor: 'var(--surface-elevated)' }}
                          title="Drag to reorder"
                          {...attributes}
                          {...listeners}
                        >
                          <GripVertical size={10} />
                        </button>
                      ) : (
                        <div className="w-px h-2 mx-auto my-0.5" style={{ backgroundColor: 'var(--border)' }} />
                      )}
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
                  </div>

                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center gap-2">
                    {/* Edit block */}
                    {!isSkipped && (
                      <button
                        onClick={() => openEditBlock(block)}
                        className="p-1.5 rounded-lg press flex items-center justify-center"
                        style={{ color: 'var(--text-muted)' }}
                        title={syncWithRoutine ? 'Edit block for all routine days' : 'Edit block only for today'}
                      >
                        <Edit size={13} />
                      </button>
                    )}

                    {/* Check toggle */}
                    {!isSkipped && (
                      <button onClick={() => toggleBlock(block)} className="press flex items-center justify-center">
                        {isDone
                          ? <CheckCircle2 size={20} style={{ color: routine.color || 'var(--accent)' }} />
                          : <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'var(--border)' }} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Skip / Unskip strip attached to block corner */}
                {!isDone && !isSkipped && (
                  isBlockSkipped ? (
                    <button
                      onClick={() => unskipBlock(block)}
                      className="absolute right-0 bottom-0 h-6 w-16 rounded-tl-lg press flex items-center justify-center gap-1 text-[10px] font-medium"
                      style={{
                        color: 'var(--status-skipped-icon)',
                        backgroundColor: 'color-mix(in srgb, var(--status-skipped-light) 60%, transparent)',
                        borderLeft: '1px solid color-mix(in srgb, var(--status-skipped) 45%, transparent)',
                        borderTop: '1px solid color-mix(in srgb, var(--status-skipped) 45%, transparent)',
                      }}
                      title="Undo skip"
                    >
                      <RotateCcw size={12} />
                      <span>Undo</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => skipBlock(block)}
                      className="absolute right-0 bottom-0 h-6 w-16 rounded-tl-lg press flex items-center justify-center gap-1 text-[10px] font-medium"
                      style={{
                        color: 'var(--text-secondary)',
                        backgroundColor: 'color-mix(in srgb, var(--surface-elevated) 55%, transparent)',
                        borderLeft: '1px solid color-mix(in srgb, var(--border) 80%, transparent)',
                        borderTop: '1px solid color-mix(in srgb, var(--border) 80%, transparent)',
                      }}
                      title="Skip this block"
                    >
                      <X size={12} />
                      <span>Skip</span>
                    </button>
                  )
                )}

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
  const [showRoutineTab, setShowRoutineTab] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadRoutineTabPreference() {
      try {
        const settings = await api.getUserSettings();
        const trackingOptions = settings?.trackingOptions ?? [];
        if (!mounted) return;
        setShowRoutineTab(!trackingOptions.includes(api.DASHBOARD_ROUTINE_TAB_HIDDEN_OPTION));
      } catch {
        // Keep current default if settings are unavailable.
      }
    }

    loadRoutineTabPreference();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!showRoutineTab && activeTab === 'routine') {
      setActiveTab('dashboard');
    }
  }, [showRoutineTab, activeTab]);

  const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: string | number }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'routine', label: 'Daily Routine', icon: Repeat },
    { id: 'tasks', label: 'Actions', icon: CheckSquare },
  ];
  const visibleTabs = showRoutineTab ? TABS : TABS.filter(tab => tab.id !== 'routine');

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
          <button onClick={() => navigate('/ai-chat')} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
            <MessageCircle size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
            <Settings size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }}>
        {visibleTabs.map(tab => {
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
              onOpenRoutine={() => setActiveTab(showRoutineTab ? 'routine' : 'dashboard')}
            />
          )}
          {activeTab === 'tasks' && <TasksTab user={user} />}
          {activeTab === 'routine' && showRoutineTab && user && <DailyRoutineTab userId={user.id} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
