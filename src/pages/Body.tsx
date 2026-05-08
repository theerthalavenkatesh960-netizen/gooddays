import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Trophy, Settings as SettingsIcon, Leaf, TrendingUp, Check,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';

type Tab = 'Workout' | 'Diet' | 'Progress';

type Exercise = {
  id: number;
  name: string;
  muscleGroup?: string;
  imageUrl?: string;
};

type WorkoutSet = {
  id?: number;
  exerciseId: number;
  setNumber: number;
  weightKg?: number;
  reps?: number;
  isCompleted?: boolean;
};

type MealIngredient = { id: string; name: string; calories: number };
type MealTemplate = {
  id: string;
  name: string;
  timing: 'pre-workout' | 'post-workout' | 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: MealIngredient[];
  recipe: string;
};

type WorkoutLog = {
  date: string;
  exercises: Array<{ exerciseId: number; name: string; sets: Array<{ setNumber: number; weight: number; reps: number; isCompleted?: boolean }> }>;
};

type PlannedExercise = {
  exerciseId: number;
  targetSets?: number;
};

type RoutineEntry = {
  exerciseId: number;
  sets: number;
  reps: number;
};

type RoutineMap = Record<string, RoutineEntry[]>;

type SplitPreset = {
  id: number;
  name: string;
  dayConfigs: string | RoutineMap;
  isActive: boolean;
};

type WorkoutPlan = {
  id?: number;
  plannedExercises: string;
  sets?: WorkoutSet[];
};

const MEALS_KEY = 'gd.mealTemplates';
const CALORIE_KEY = 'calorieGoal';
const WORKOUT_LOGS_KEY = 'gd.workoutLogs';
const DIET_LOGS_KEY = 'gd.dietLogs';

const BODY_TABS: { id: string; label: string; icon: React.ComponentType<{ size?: string | number }> }[] = [
  { id: 'Workout', label: 'Workout', icon: Dumbbell },
  { id: 'Diet', label: 'Diet', icon: Leaf },
  { id: 'Progress', label: 'Progress', icon: TrendingUp },
];

function PillTabs({ active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1 mx-4 mb-2 p-1 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }}>
      {BODY_TABS.map(t => {
        const Icon = t.icon;
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all press"
            style={{ backgroundColor: active === t.id ? 'var(--accent)' : 'transparent', color: active === t.id ? '#fff' : 'var(--text-muted)' }}>
            <Icon size={14} />{t.label}
          </button>
        );
      })}
    </div>
  );
}

function WorkoutTab() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routine, setRoutine] = useState<RoutineMap>({});
  const [loading, setLoading] = useState(true);
  const [todayPlan, setTodayPlan] = useState<WorkoutPlan | null>(null);
  const [legacyLog, setLegacyLog] = useState<WorkoutLog | null>(null);

  const dayKey = format(new Date(), 'EEEE').toLowerCase();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    Promise.all([
      api.getExercises(),
      api.getWorkoutPlanByDate(today),
      api.getActiveSplit(),
    ])
      .then(([exData, plan, activeSplit]) => {
        setExercises(Array.isArray(exData) ? exData : []);
        setTodayPlan(plan || null);
        const split = activeSplit as SplitPreset | null;
        if (!split?.dayConfigs) {
          setRoutine({});
          return;
        }

        if (typeof split.dayConfigs === 'string') {
          try {
            const parsed = JSON.parse(split.dayConfigs);
            setRoutine(parsed && typeof parsed === 'object' ? parsed : {});
          } catch {
            setRoutine({});
          }
          return;
        }

        setRoutine(split.dayConfigs);
      })
      .catch(() => {
        setExercises([]);
        setTodayPlan(null);
        setRoutine({});
      })
      .finally(() => setLoading(false));

    const logsRaw = localStorage.getItem('gd.workoutLogs');
    if (!logsRaw) return;
    try {
      const logs: WorkoutLog[] = JSON.parse(logsRaw);
      const existing = logs.find(l => l.date === today) || null;
      setLegacyLog(existing);
    } catch {
      setLegacyLog(null);
    }
  }, [today]);

  const routineCards = useMemo(() => {
    const entries = routine[dayKey] || [];
    return entries
      .map((entry) => {
        const exercise = exercises.find(e => e.id === entry.exerciseId);
        if (!exercise) return null;
        return {
          exercise,
          sets: [] as WorkoutSet[],
          targetSets: entry.sets || 0,
        };
      })
      .filter(Boolean) as Array<{ exercise: Exercise; sets: WorkoutSet[]; targetSets: number }>;
  }, [routine, dayKey, exercises]);

  const plannedExercises = useMemo<PlannedExercise[]>(() => {
    if (!todayPlan?.plannedExercises) return [];
    try {
      const parsed = JSON.parse(todayPlan.plannedExercises);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [todayPlan?.plannedExercises]);

  const apiExerciseCards = useMemo(() => {
    return plannedExercises
      .map((planned) => {
        const exercise = exercises.find(ex => ex.id === planned.exerciseId);
        if (!exercise) return null;
        const sets = (todayPlan?.sets || [])
          .filter(s => s.exerciseId === planned.exerciseId)
          .sort((a, b) => a.setNumber - b.setNumber);
        return {
          exercise,
          sets,
          targetSets: planned.targetSets || 0,
        };
      })
      .filter(Boolean) as Array<{ exercise: Exercise; sets: WorkoutSet[]; targetSets: number }>;
  }, [plannedExercises, exercises, todayPlan?.sets]);

  const legacyCards = useMemo(() => {
    if (!legacyLog) return [];
    return legacyLog.exercises
      .map((item) => {
        const exercise = exercises.find(ex => ex.id === item.exerciseId);
        if (!exercise) return null;
        const sets = item.sets.map(s => ({
          exerciseId: item.exerciseId,
          setNumber: s.setNumber,
          reps: s.reps,
          weightKg: s.weight,
          isCompleted: s.isCompleted,
        }));
        return {
          exercise,
          sets,
          targetSets: item.sets.length,
        };
      })
      .filter(Boolean) as Array<{ exercise: Exercise; sets: WorkoutSet[]; targetSets: number }>;
  }, [legacyLog, exercises]);

  const cardData = apiExerciseCards.length > 0 ? apiExerciseCards : (routineCards.length > 0 ? routineCards : legacyCards);
  const noTodayPlan = !loading && !todayPlan?.id;

  function openExerciseLogger(exerciseId: number) {
    const search = new URLSearchParams({
      tab: 'today',
      exerciseId: String(exerciseId),
      return: '/body',
    });
    navigate(`/body/workout-log?${search.toString()}`);
  }

  return (
    <div className="px-4">
      <div className="p-4 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, var(--accent)22, var(--surface))', border: '1px solid var(--accent)33' }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
            Suggested by {dayKey}
          </span>
          <button onClick={() => navigate('/settings/workout-library')} className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
            <SettingsIcon size={12} /> Configure
          </button>
        </div>
        <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          {cardData.length > 0 ? `${cardData.length} exercises for today` : noTodayPlan ? 'No workout plan for today' : 'No routine configured'}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{format(new Date(), 'EEEE, d MMM')}</p>
      </div>

      {loading ? (
        [1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl mb-3 p-4" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="skeleton h-4 w-40 rounded mb-2" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
        ))
      ) : cardData.length === 0 ? (
        <div className="py-10 text-center">
          <Dumbbell size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            {noTodayPlan ? 'No workout planned for today' : 'No workout library configured'}
          </p>
          <button onClick={() => navigate('/body/workout-log')} className="mt-2 h-10 px-4 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent)' }}>
            Open Workout Log
          </button>
        </div>
      ) : (
        cardData.map(({ exercise, sets, targetSets }) => {
          const completed = sets.filter(s => s.isCompleted).length;
          return (
            <div key={exercise.id} className="rounded-2xl overflow-hidden mb-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
                {exercise.imageUrl ? (
                  <img src={exercise.imageUrl} alt={exercise.name} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                    <Dumbbell size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{exercise.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{exercise.muscleGroup || 'General'}</p>
                </div>
                <button
                  onClick={() => openExerciseLogger(exercise.id)}
                  className="h-7 px-2 rounded-lg text-[11px] font-semibold"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent)' }}
                >
                  Log
                </button>
                <div className="text-right">
                  <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>{completed}/{targetSets || sets.length}</span>
                </div>
              </div>

              <div className="px-3 pb-3 pt-2 space-y-2">
                {sets.map((s, idx) => (
                  <div key={`${exercise.id}-${s.id ?? idx}`} className="grid grid-cols-4 gap-2 items-center rounded-lg px-2 py-1.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Set #{s.setNumber}</span>
                    <span className="text-xs num" style={{ color: 'var(--text-primary)' }}>{s.reps ?? 0} reps</span>
                    <span className="text-xs num" style={{ color: 'var(--text-primary)' }}>{s.weightKg ?? 0} kg</span>
                    <span className="text-[11px] text-right" style={{ color: s.isCompleted ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      {s.isCompleted ? 'done' : 'pending'}
                    </span>
                  </div>
                ))}
                {sets.length === 0 && (
                  <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
                    No sets logged yet. Tap Log to start.
                  </p>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function DietTab() {
  const [meals, setMeals] = useState<MealTemplate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [goal, setGoal] = useState(2400);
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const rawMeals = localStorage.getItem(MEALS_KEY);
    if (rawMeals) {
      try { setMeals(JSON.parse(rawMeals)); } catch { setMeals([]); }
    }
    const rawGoal = localStorage.getItem(CALORIE_KEY);
    if (rawGoal) setGoal(Number(rawGoal) || 2400);

    const rawLogs = localStorage.getItem(DIET_LOGS_KEY);
    if (rawLogs) {
      try {
        const logs = JSON.parse(rawLogs) as Record<string, string[]>;
        setSelected(logs[today] || []);
      } catch {
        setSelected([]);
      }
    }
  }, [today]);

  const consumedCalories = useMemo(() => {
    return meals
      .filter(m => selected.includes(m.id))
      .reduce((sum, meal) => sum + meal.ingredients.reduce((s, i) => s + i.calories, 0), 0);
  }, [selected, meals]);

  const pct = goal > 0 ? Math.min(100, Math.round((consumedCalories / goal) * 100)) : 0;

  function toggleMeal(id: string) {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
    setSelected(next);
    const raw = localStorage.getItem(DIET_LOGS_KEY);
    let logs: Record<string, string[]> = {};
    if (raw) {
      try { logs = JSON.parse(raw); } catch { logs = {}; }
    }
    logs[today] = next;
    localStorage.setItem(DIET_LOGS_KEY, JSON.stringify(logs));
  }

  return (
    <div className="px-4">
      <div className="p-5 rounded-2xl mb-4 flex items-center gap-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="relative flex-shrink-0">
          <svg width="88" height="88" className="-rotate-90">
            <circle cx="44" cy="44" r="36" stroke="var(--surface-elevated)" strokeWidth="8" fill="none" />
            <circle
              cx="44" cy="44" r="36"
              stroke="var(--accent-warm)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - pct / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold num" style={{ color: 'var(--text-primary)' }}>{pct}%</span>
          </div>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Consumed</p>
          <p className="text-2xl font-bold num" style={{ color: 'var(--text-primary)' }}>{consumedCalories}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>of {goal} kcal</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="section-label">Configured Meals</span>
        <button onClick={() => navigate('/settings/meals')} className="text-xs" style={{ color: 'var(--accent)' }}>Manage</button>
      </div>

      {meals.length === 0 ? (
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>No meals configured yet.</p>
          <button onClick={() => navigate('/settings/meals')} className="mt-2 h-9 px-3 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent)' }}>
            Configure Meals
          </button>
        </div>
      ) : (
        meals.map(meal => {
          const total = meal.ingredients.reduce((s, i) => s + i.calories, 0);
          const on = selected.includes(meal.id);
          return (
            <button
              key={meal.id}
              onClick={() => toggleMeal(meal.id)}
              className="w-full text-left flex items-center gap-3 p-3 rounded-xl mb-2"
              style={{
                backgroundColor: on ? 'var(--accent)11' : 'var(--surface)',
                border: `1px solid ${on ? 'var(--accent)55' : 'var(--border)'}`,
              }}
            >
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: on ? 'var(--accent)' : 'var(--surface-elevated)' }}>
                {on && <Check size={12} color="#fff" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{meal.name}</p>
                <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{meal.timing} - {meal.ingredients.map(i => i.name).join(' - ')}</p>
                {meal.recipe && <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{meal.recipe}</p>}
              </div>
              <span className="text-xs font-bold num" style={{ color: 'var(--accent-warm)' }}>{total}</span>
            </button>
          );
        })
      )}
    </div>
  );
}

function ProgressTab() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(WORKOUT_LOGS_KEY);
    if (raw) {
      try { setLogs(JSON.parse(raw)); } catch { setLogs([]); }
    }
  }, []);

  const prs = useMemo(() => {
    const map = new Map<string, { exerciseName: string; bestWeight: number; bestReps: number; achievedAt: string }>();
    for (const log of logs) {
      for (const ex of log.exercises) {
        for (const set of ex.sets) {
          const existing = map.get(ex.name);
          if (!existing || (set.weight > existing.bestWeight || (set.weight === existing.bestWeight && set.reps > existing.bestReps))) {
            map.set(ex.name, {
              exerciseName: ex.name,
              bestWeight: set.weight || 0,
              bestReps: set.reps || 0,
              achievedAt: log.date,
            });
          }
        }
      }
    }
    return Array.from(map.values()).slice(0, 8);
  }, [logs]);

  return (
    <div className="px-4">
      <div className="section-header px-0 mb-2">
        <span className="section-label">Personal Records</span>
      </div>
      {prs.length === 0 ? (
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>No workout logs yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {prs.map(pr => (
            <div key={pr.exerciseName} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-gold)22' }}>
                <Trophy size={16} style={{ color: 'var(--accent-gold)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{pr.exerciseName}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {pr.bestWeight} kg x {pr.bestReps} reps
                </p>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(new Date(pr.achievedAt), 'd MMM')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Body() {
  const [tab, setTab] = useState<Tab>('Workout');

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="px-4 mb-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Body</h1>
      </div>

      <PillTabs tabs={['Workout', 'Diet', 'Progress']} active={tab} onChange={t => setTab(t as Tab)} />

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.15 }}
          className="mt-2"
        >
          {tab === 'Workout' && <WorkoutTab />}
          {tab === 'Diet' && <DietTab />}
          {tab === 'Progress' && <ProgressTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
