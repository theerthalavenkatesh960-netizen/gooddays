import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Settings as SettingsIcon, Leaf, TrendingUp, Check,
  Pencil, X, Scale,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as api from '../lib/api';

type Tab = 'Workout' | 'Diet' | 'Progress';

type Exercise = {
  id: number;
  name: string;
  muscleGroup?: string;
  category?: string;
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

type MealIngredient = {
  id: number;
  name: string;
  caloriesKcal: number;
  proteinG?: number;
  carbsG?: number;
  fatsG?: number;
};
type MealTemplate = {
  id: number;
  name: string;
  timing: string;
  ingredientsJson: string;
  recipe: string;
  imageUrl?: string;
};

type MealAssignment = {
  mealTemplateId?: number;
  timeOfDay?: string;
};

type WeeklyMealPlan = { planJson?: string; plan_json?: string } | null;
type DailyMealLog = { date: string; mealIds: number[] };

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
  const [loggedSets, setLoggedSets] = useState<WorkoutSet[]>([]);
  const [busyExerciseId, setBusyExerciseId] = useState<number | null>(null);

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
        const normalizedPlan = plan || null;
        setTodayPlan(normalizedPlan);
        setLoggedSets(Array.isArray(normalizedPlan?.sets) ? normalizedPlan.sets : []);

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
        setLoggedSets([]);
        setRoutine({});
      })
      .finally(() => setLoading(false));
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
        const sets = loggedSets
          .filter(s => s.exerciseId === planned.exerciseId)
          .sort((a, b) => a.setNumber - b.setNumber);
        return {
          exercise,
          sets,
          targetSets: planned.targetSets || 0,
        };
      })
      .filter(Boolean) as Array<{ exercise: Exercise; sets: WorkoutSet[]; targetSets: number }>;
  }, [plannedExercises, exercises, loggedSets]);

  const cardData = useMemo(() => {
    const merged = new Map<number, { exercise: Exercise; sets: WorkoutSet[]; targetSets: number }>();

    routineCards.forEach((item) => {
      merged.set(item.exercise.id, item);
    });

    apiExerciseCards.forEach((item) => {
      const existing = merged.get(item.exercise.id);
      if (existing) {
        merged.set(item.exercise.id, {
          exercise: existing.exercise,
          sets: item.sets,
          targetSets: item.targetSets || existing.targetSets,
        });
        return;
      }

      merged.set(item.exercise.id, item);
    });

    return Array.from(merged.values());
  }, [routineCards, apiExerciseCards]);

  async function ensureTodayPlan(seedExerciseId: number, seedTargetSets: number) {
    if (todayPlan?.id) return todayPlan;

    const plannedSource = cardData.length > 0 ? cardData : [{ exercise: exercises.find(e => e.id === seedExerciseId), sets: [], targetSets: seedTargetSets }]
      .filter(x => x.exercise) as Array<{ exercise: Exercise; sets: WorkoutSet[]; targetSets: number }>;

    const planned = plannedSource.map(item => ({
      exerciseId: item.exercise.id,
      targetSets: item.targetSets || 3,
      targetReps: 10,
      targetWeightKg: null,
    }));

    const created = await api.createWorkoutPlan({
      date: new Date().toISOString(),
      dayLabel: format(new Date(), 'EEEE'),
      plannedExercises: JSON.stringify(planned),
      isCompleted: false,
    });
    setTodayPlan(created);
    setLoggedSets([]);
    return created;
  }

  async function addSet(exerciseId: number, targetSets: number) {
    setBusyExerciseId(exerciseId);
    try {
      const plan = await ensureTodayPlan(exerciseId, targetSets);
      const existingSets = loggedSets.filter(s => s.exerciseId === exerciseId).sort((a, b) => a.setNumber - b.setNumber);
      const prevSet = existingSets[existingSets.length - 1];
      const created = await api.logWorkoutSet(plan.id!, {
        exerciseId,
        setNumber: existingSets.length + 1,
        reps: prevSet?.reps ?? 10,
        weightKg: prevSet?.weightKg ?? 0,
        isCompleted: true,
      });
      setLoggedSets(prev => [...prev, created]);
    } finally {
      setBusyExerciseId(null);
    }
  }

  function patchSetLocal(setId: number | undefined, patch: Partial<WorkoutSet>) {
    if (!setId) return;
    setLoggedSets(prev => prev.map(s => s.id === setId ? { ...s, ...patch } : s));
  }

  async function saveSet(setId: number | undefined, patch: Partial<WorkoutSet>) {
    if (!setId) return;
    setLoggedSets(prev => prev.map(s => s.id === setId ? { ...s, ...patch } : s));
    try {
      await api.updateWorkoutSet(setId, patch);
    } catch {
      // no-op; optimistic state already applied
    }
  }

  async function toggleDone(s: WorkoutSet) {
    const next = !s.isCompleted;
    await saveSet(s.id, { reps: s.reps, weightKg: s.weightKg, isCompleted: next });
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
          {cardData.length > 0 ? `${cardData.length} exercises for today` : 'No workout routine configured for today'}
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
            Set up your weekly workout routine in Settings.
          </p>
          <button onClick={() => navigate('/settings/workout-library')} className="mt-2 h-10 px-4 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent)' }}>
            Configure Workout
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
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{exercise.muscleGroup || exercise.category || 'General'}</p>
                </div>
                <button
                  onClick={() => addSet(exercise.id, targetSets || 3)}
                  className="h-7 px-2 rounded-lg text-[11px] font-semibold"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent)' }}
                  disabled={busyExerciseId === exercise.id}
                >
                  {busyExerciseId === exercise.id ? '...' : '+ Set'}
                </button>
                <div className="text-right">
                  <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>{completed}/{targetSets || sets.length || 0}</span>
                </div>
              </div>

              <div className="px-3 pb-3 pt-2 space-y-3">
                {sets.map((s, idx) => (
                  <div key={`${exercise.id}-${s.id ?? idx}`} className="rounded-lg px-2 py-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                    <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Set #{s.setNumber}</p>
                    <div className="grid grid-cols-[1fr_1fr_52px] gap-2 items-end">
                      <div>
                        <label className="text-[9px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Reps</label>
                        <input
                          type="number"
                          value={s.reps ?? 0}
                          onChange={e => patchSetLocal(s.id, { reps: Number(e.target.value || 0) })}
                          className="w-full h-7 px-2 rounded-md text-xs num outline-none"
                          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Weight (kg)</label>
                        <input
                          type="number"
                          value={s.weightKg ?? 0}
                          onChange={e => patchSetLocal(s.id, { weightKg: Number(e.target.value || 0) })}
                          className="w-full h-7 px-2 rounded-md text-xs num outline-none"
                          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <button
                        onClick={() => toggleDone(s)}
                        className="h-7 rounded-md text-[10px] font-semibold"
                        style={{ backgroundColor: s.isCompleted ? 'var(--accent-green)' : 'var(--surface)', color: s.isCompleted ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)' }}
                      >
                        {s.isCompleted ? 'Done' : 'Log'}
                      </button>
                    </div>
                  </div>
                ))}
                {sets.length === 0 && (
                  <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
                    No sets logged yet. Tap + Set to log directly here.
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

function parseMealIngredients(json: string): MealIngredient[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizePlannedMealIdsForDay(dayValue: unknown): number[] {
  if (!Array.isArray(dayValue)) return [];

  return dayValue
    .map(item => {
      if (typeof item === 'number') return item;
      if (item && typeof item === 'object' && 'mealTemplateId' in item) {
        const id = Number((item as MealAssignment).mealTemplateId);
        return Number.isFinite(id) ? id : null;
      }
      return null;
    })
    .filter((id): id is number => Number.isFinite(id));
}

function getUtcDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function DietTab() {
  const [plannedMeals, setPlannedMeals] = useState<MealTemplate[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [goal, setGoal] = useState(2400);
  const [waterMl, setWaterMl] = useState(0);
  const [waterGoalMl, setWaterGoalMl] = useState(2000);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayKey = format(new Date(), 'EEEE').toLowerCase();
  const utcToday = getUtcDateKey();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [templates, weeklyPlan, todayLog, waterLog, settings] = await Promise.all([
          api.getMealTemplates(),
          api.getWeeklyMealPlan() as Promise<WeeklyMealPlan>,
          (api as any).getDailyMealLog(today) as Promise<DailyMealLog | null>,
          (api as any).getDailyWaterLog(today),
          api.getUserSettings(),
        ]);

        const list = Array.isArray(templates) ? templates : [];

        let plannedIds: number[] = [];
        try {
          const rawPlanJson = weeklyPlan?.planJson ?? weeklyPlan?.plan_json;
          const map = rawPlanJson ? JSON.parse(rawPlanJson) : {};
          const byLocalDate = normalizePlannedMealIdsForDay(map?.[today]);
          const byUtcDate = byLocalDate.length > 0 ? byLocalDate : normalizePlannedMealIdsForDay(map?.[utcToday]);
          plannedIds = byUtcDate.length > 0 ? byUtcDate : normalizePlannedMealIdsForDay(map?.[todayKey]);
        } catch {
          plannedIds = [];
        }

        const planned = plannedIds
          .map(id => list.find(m => m.id === id))
          .filter((m): m is MealTemplate => !!m);
        setPlannedMeals(planned);
        setSelected(Array.isArray(todayLog?.mealIds) ? todayLog!.mealIds : []);
        
        if (waterLog) {
          setWaterMl(waterLog.mlConsumed || 0);
          setWaterGoalMl(waterLog.goalMl || 2000);
        }
        if (Number.isFinite(settings?.calorieGoal)) {
          setGoal(Number(settings.calorieGoal));
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [today, todayKey, utcToday]);

  async function toggleMeal(id: number) {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
    setSelected(next);
    try {
      await (api as any).upsertDailyMealLog(today, next);
    } catch {
      // Keep optimistic UI in dummy-first flow
    }
  }

  async function addWater(ml: number = 250) {
    const next = waterMl + ml;
    setWaterMl(next);
    try {
      await (api as any).incrementWaterIntake(today, ml);
    } catch {
      // Optimistic update
    }
  }

  async function removeWater(ml: number = 250) {
    const next = Math.max(0, waterMl - ml);
    setWaterMl(next);
    try {
      await (api as any).incrementWaterIntake(today, -ml);
    } catch {
      // Optimistic update
    }
  }

  const consumedCalories = useMemo(() => {
    return plannedMeals
      .filter(m => selected.includes(m.id))
      .reduce((sum, meal) => {
        const ingredients = parseMealIngredients(meal.ingredientsJson);
        return sum + ingredients.reduce((s, i) => s + Number(i.caloriesKcal || 0), 0);
      }, 0);
  }, [selected, plannedMeals]);

  const consumedMacros = useMemo(() => {
    return plannedMeals
      .filter(m => selected.includes(m.id))
      .reduce(
        (acc, meal) => {
          const ingredients = parseMealIngredients(meal.ingredientsJson);
          for (const ing of ingredients) {
            acc.protein += Number(ing.proteinG || 0);
            acc.carbs += Number(ing.carbsG || 0);
            acc.fats += Number(ing.fatsG || 0);
          }
          return acc;
        },
        { protein: 0, carbs: 0, fats: 0 },
      );
  }, [selected, plannedMeals]);

  const macroTargets = useMemo(() => {
    const caloriesTarget = Math.max(800, Number(goal || 0));
    return {
      calories: caloriesTarget,
      protein: Math.round((caloriesTarget * 0.3) / 4),
      carbs: Math.round((caloriesTarget * 0.4) / 4),
      fats: Math.round((caloriesTarget * 0.3) / 9),
    };
  }, [goal]);

  const caloriePercentage = goal > 0 ? Math.min(100, Math.round((consumedCalories / goal) * 100)) : 0;
  const waterPercentage = waterGoalMl > 0 ? Math.min(100, Math.round((waterMl / waterGoalMl) * 100)) : 0;

  return (
    <div className="px-4 space-y-4">
      <div
        className="sticky top-2 z-20 p-3 rounded-2xl"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Today's Macros</p>
          <button
            onClick={() => navigate('/settings/meals/pick', { state: { dayKey: today, source: 'diet' } })}
            className="h-7 px-3 rounded-lg text-[11px] font-semibold"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            Log Meal
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Kcal</p>
            <p className="text-xs font-bold num" style={{ color: 'var(--text-primary)' }}>{Math.round(consumedCalories)}/{macroTargets.calories}</p>
          </div>
          <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Protein</p>
            <p className="text-xs font-bold num" style={{ color: 'var(--accent-green)' }}>{Math.round(consumedMacros.protein)}/{macroTargets.protein}g</p>
          </div>
          <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Carbs</p>
            <p className="text-xs font-bold num" style={{ color: 'var(--accent-gold)' }}>{Math.round(consumedMacros.carbs)}/{macroTargets.carbs}g</p>
          </div>
          <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Fats</p>
            <p className="text-xs font-bold num" style={{ color: 'var(--accent)' }}>{Math.round(consumedMacros.fats)}/{macroTargets.fats}g</p>
          </div>
        </div>
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
          Targets are auto-derived from your daily calorie goal.
        </p>
      </div>

      {/* Calorie Progress */}
      <div className="p-5 rounded-2xl flex items-center gap-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="relative flex-shrink-0">
          <svg width="88" height="88" className="-rotate-90">
            <circle cx="44" cy="44" r="36" stroke="var(--surface-elevated)" strokeWidth="8" fill="none" />
            <circle
              cx="44" cy="44" r="36"
              stroke="var(--accent-warm)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - caloriePercentage / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold num" style={{ color: 'var(--text-primary)' }}>{caloriePercentage}%</span>
          </div>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Consumed</p>
          <p className="text-2xl font-bold num" style={{ color: 'var(--text-primary)' }}>{Math.round(consumedCalories)}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>of {goal} kcal</p>
        </div>
      </div>

      {/* Water Intake */}
      <div className="p-4 rounded-2xl space-y-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-5">
          {/* Mini ring */}
          <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
            <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="48" cy="48" r="38" stroke="var(--surface-elevated)" strokeWidth="9" fill="none" />
              <circle cx="48" cy="48" r="38"
                stroke={waterPercentage >= 100 ? '#f59e0b' : 'var(--accent)'}
                strokeWidth="9" fill="none" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 38}
                strokeDashoffset={2 * Math.PI * 38 * (1 - Math.min(1, waterPercentage / 100))}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black leading-none" style={{ color: 'var(--text-primary)' }}>
                {waterMl >= 1000 ? `${(waterMl/1000).toFixed(1)}L` : `${waterMl}`}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>ml</span>
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>💧 Water Intake</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{waterMl} / {waterGoalMl} ml</p>
            <div className="h-1.5 rounded-full overflow-hidden mt-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, waterPercentage)}%`, backgroundColor: waterPercentage >= 100 ? '#f59e0b' : 'var(--accent)' }} />
            </div>
            <p className="text-xs font-bold" style={{ color: waterPercentage >= 100 ? '#f59e0b' : 'var(--accent)' }}>
              {waterPercentage >= 100 ? `Goal smashed! 🔥` : `${waterGoalMl - waterMl}ml remaining`}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Add</p>
          <div className="grid grid-cols-4 gap-2">
            {[{ label: '💧 100', ml: 100 }, { label: '🥛 250', ml: 250 }, { label: '🍶 500', ml: 500 }, { label: '🫙 1L', ml: 1000 }].map(p => (
              <button key={p.ml} onClick={() => addWater(p.ml)}
                className="py-2 rounded-xl text-xs font-bold transition-all"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent)' }}>
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Remove</p>
          <div className="grid grid-cols-4 gap-2">
            {[{ label: '−100', ml: 100 }, { label: '−250', ml: 250 }, { label: '−500', ml: 500 }, { label: '−1L', ml: 1000 }].map(p => (
              <button key={p.ml} onClick={() => removeWater(p.ml)}
                disabled={waterMl === 0}
                className="py-2 rounded-xl text-xs font-bold transition-all"
                style={{ backgroundColor: 'var(--surface-elevated)', color: '#f87171', opacity: waterMl === 0 ? 0.4 : 1 }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="section-label">Planned Meals Today</span>
        <button onClick={() => navigate('/settings/meals')} className="text-xs" style={{ color: 'var(--accent)' }}>Manage</button>
      </div>

      {loading ? (
        [1, 2].map(i => <div key={i} className="h-16 rounded-xl mb-2" style={{ backgroundColor: 'var(--surface)' }} />)
      ) : plannedMeals.length === 0 ? (
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>No meals planned for today.</p>
          <button onClick={() => navigate('/settings/meals')} className="mt-2 h-9 px-3 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent)' }}>
            Configure Weekly Meals
          </button>
        </div>
      ) : (
        plannedMeals.map(meal => {
          const total = parseMealIngredients(meal.ingredientsJson).reduce((s, i) => s + Number(i.caloriesKcal || 0), 0);
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
                <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{meal.timing} · Planned · tap to {on ? 'unlog' : 'log'}</p>
                {meal.recipe && <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{meal.recipe}</p>}
              </div>
              <span className="text-xs font-bold num" style={{ color: 'var(--accent-warm)' }}>{Math.round(total)}</span>
            </button>
          );
        })
      )}
    </div>
  );
}

// ─── Body Weight Progress Chart (SVG) ────────────────────────────────────────
function WeightChart({ logs, targetWeight }: { logs: api.BodyWeightLog[]; targetWeight: number | null }) {
  if (logs.length === 0) return (
    <div className="flex items-center justify-center h-32 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No weight entries yet. Log your first entry below!</p>
    </div>
  );

  const W = 320, H = 130, padX = 28, padY = 12;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const weights = logs.map(l => l.weightKg);
  const allVals = targetWeight !== null ? [...weights, targetWeight] : weights;
  const minW = Math.min(...allVals) - 1;
  const maxW = Math.max(...allVals) + 1;

  const toX = (i: number) => padX + (i / Math.max(logs.length - 1, 1)) * innerW;
  const toY = (w: number) => padY + innerH - ((w - minW) / (maxW - minW)) * innerH;

  const points = logs.map((l, i) => `${toX(i)},${toY(l.weightKg)}`).join(' ');
  const areaPoints = `${toX(0)},${H} ` + logs.map((l, i) => `${toX(i)},${toY(l.weightKg)}`).join(' ') + ` ${toX(logs.length - 1)},${H}`;

  const labelIndexes = logs.length <= 7
    ? logs.map((_, i) => i)
    : [0, Math.floor(logs.length / 2), logs.length - 1];

  const targetY = targetWeight !== null ? toY(targetWeight) : null;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {/* Area fill */}
      <polygon points={areaPoints} fill="var(--accent-blue, #3b82f6)" fillOpacity="0.08" />
      {/* Target weight dashed line */}
      {targetY !== null && (
        <>
          <line x1={padX} y1={targetY} x2={W - padX} y2={targetY}
            stroke="var(--accent-gold, #f59e0b)" strokeWidth="1.5" strokeDasharray="5,3" />
          <text x={W - padX + 3} y={targetY + 4} fontSize="9" fill="var(--accent-gold, #f59e0b)">goal</text>
        </>
      )}
      {/* Line */}
      <polyline points={points}
        fill="none" stroke="var(--accent-blue, #3b82f6)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots */}
      {logs.map((l, i) => (
        <circle key={i} cx={toX(i)} cy={toY(l.weightKg)} r={logs.length > 15 ? 2 : 3}
          fill="var(--accent-blue, #3b82f6)" />
      ))}
      {/* X-axis date labels */}
      {labelIndexes.map(i => (
        <text key={i} x={toX(i)} y={H + 12} textAnchor="middle" fontSize="8" fill="var(--text-muted, #888)">
          {logs[i].date.slice(5)}
        </text>
      ))}
    </svg>
  );
}

// ─── Body Metrics Section ─────────────────────────────────────────────────────
function BodyMetricsSection() {
  const [profile, setProfile] = useState<api.BodyMetricsProfile | null>(null);
  const [logs, setLogs] = useState<api.BodyWeightLog[]>([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [heightInput, setHeightInput] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [dateInput, setDateInput] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  async function load() {
    const [p, l] = await Promise.all([
      api.getBodyMetricsProfile().catch(() => null),
      api.getBodyWeightLogs().catch(() => [] as api.BodyWeightLog[]),
    ]);
    setProfile(p);
    setLogs(l);
  }

  useEffect(() => { load(); }, []);

  const currentWeight = logs.length > 0 ? logs[logs.length - 1].weightKg : null;

  function openEditProfile() {
    setHeightInput(profile?.heightCm != null ? String(profile.heightCm) : '');
    setTargetInput(profile?.targetWeightKg != null ? String(profile.targetWeightKg) : '');
    setEditingProfile(true);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const updated = await api.updateBodyMetricsProfile({
        heightCm: heightInput ? parseFloat(heightInput) : null,
        targetWeightKg: targetInput ? parseFloat(targetInput) : null,
      });
      setProfile(updated);
      setEditingProfile(false);
    } finally {
      setSaving(false);
    }
  }

  async function saveWeight() {
    if (!weightInput) return;
    setSaving(true);
    try {
      await api.logBodyWeight(parseFloat(weightInput), dateInput);
      setWeightInput('');
      await load();
    } finally {
      setSaving(false);
    }
  }

  const bmi = profile?.heightCm && currentWeight
    ? Math.round(currentWeight / Math.pow(profile.heightCm / 100, 2) * 10) / 10
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-0">
        <span className="section-label flex items-center gap-1.5"><Scale size={14} /> Body Metrics</span>
        <button onClick={openEditProfile} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
          style={{ color: 'var(--text-muted)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Pencil size={11} /> Edit
        </button>
      </div>

      {/* Edit profile modal */}
      {editingProfile && (
        <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Body Profile</p>
            <button onClick={() => setEditingProfile(false)}><X size={16} style={{ color: 'var(--text-muted)' }} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Height (cm)</label>
              <input type="number" value={heightInput} onChange={e => setHeightInput(e.target.value)}
                placeholder="e.g. 175" className="w-full px-3 py-2 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Target Weight (kg)</label>
              <input type="number" step="0.1" value={targetInput} onChange={e => setTargetInput(e.target.value)}
                placeholder="e.g. 72.0" className="w-full px-3 py-2 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving}
            className="w-full py-2 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: 'var(--accent-blue, #3b82f6)', color: '#fff' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Height</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {profile?.heightCm != null ? profile.heightCm : '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>cm</p>
        </div>
        <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Current</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {currentWeight != null ? currentWeight : '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>kg</p>
        </div>
        <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Target</p>
          <p className="text-xl font-bold" style={{ color: 'var(--accent-gold, #f59e0b)' }}>
            {profile?.targetWeightKg != null ? profile.targetWeightKg : '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>kg</p>
        </div>
      </div>

      {/* BMI badge */}
      {bmi !== null && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>BMI</span>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{bmi}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {bmi < 18.5 ? '· Underweight' : bmi < 25 ? '· Normal' : bmi < 30 ? '· Overweight' : '· Obese'}
          </span>
        </div>
      )}

      {/* Progress chart */}
      <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Weight Progress</p>
        <WeightChart logs={logs} targetWeight={profile?.targetWeightKg ?? null} />
      </div>

      {/* Log weight */}
      <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Log Today's Weight</p>
        <div className="flex gap-2">
          <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          <input type="number" step="0.1" value={weightInput} onChange={e => setWeightInput(e.target.value)}
            placeholder="kg" className="w-24 px-3 py-2 rounded-xl text-sm text-center"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          <button onClick={saveWeight} disabled={saving || !weightInput}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: 'var(--accent-blue, #3b82f6)', color: '#fff', opacity: !weightInput ? 0.5 : 1 }}>
            {saving ? '…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressTab() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [prs, setPrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [analyticsData, prsData] = await Promise.all([
          api.getWorkoutAnalytics().catch(() => null),
          api.getPersonalRecords().catch(() => []),
        ]);
        setAnalytics(analyticsData);
        setPrs(Array.isArray(prsData) ? prsData : []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="px-4 space-y-4">
      {/* Body Metrics (height, weight, chart) */}
      <BodyMetricsSection />

      <div className="border-t" style={{ borderColor: 'var(--border)' }} />

      {/* Workout Stats */}
      {/* Workout Stats */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Days Logged</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{analytics.daysLogged || 0}</p>
          </div>
          <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Sets</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{analytics.totalSets || 0}</p>
          </div>
          <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Volume</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{Math.round(analytics.totalVolume || 0)}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>kg</p>
          </div>
          <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last 12w</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{analytics.weeks || 12}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>weeks</p>
          </div>
        </div>
      )}

      <div className="section-header px-0 mb-2">
        <span className="section-label">Personal Records</span>
      </div>
      
      {loading ? (
        <div className="py-8 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        </div>
      ) : prs.length === 0 ? (
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>No personal records yet.</p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Log your first workout to see your PRs here!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {prs.slice(0, 10).map((pr, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-gold)22' }}>
                🏆
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Exercise #{pr.exerciseId}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {pr.weightKg} kg x {pr.reps} reps
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Body() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: Tab = tabParam === 'Diet' || tabParam === 'Progress' || tabParam === 'Workout' ? tabParam : 'Workout';
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (nextTab === 'Diet' || nextTab === 'Progress' || nextTab === 'Workout') {
      setTab(nextTab);
    }
  }, [searchParams]);

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
