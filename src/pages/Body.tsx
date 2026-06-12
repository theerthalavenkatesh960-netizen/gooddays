import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Settings as SettingsIcon, Leaf, TrendingUp, Check,
  Pencil, X, Scale,
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
  qty?: number;
  unit?: string;
  baseUnit?: string;
};
type MealTemplate = {
  id: number;
  name: string;
  timing: string;
  ingredientsJson: string;
  recipe: string;
  imageUrl?: string;
};

type WeeklyMealPlan = { planJson?: string; PlanJson?: string; plan_json?: string } | null;
type DailyMealLog = { date: string; mealIds: number[] };

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
  date?: string;
  plannedExercises: string;
  sets?: WorkoutSet[];
};

type ExerciseAverages = Record<number, { avgWeight: number; avgReps: number; totalSets: number }>;

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
  const [loggedSets, setLoggedSets] = useState<WorkoutSet[]>([]);
  const [exerciseAverages, setExerciseAverages] = useState<ExerciseAverages>({});

  const dayKey = format(new Date(), 'EEEE').toLowerCase();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const fromDate = format(subDays(new Date(), 365), 'yyyy-MM-dd');

    Promise.all([
      api.getExercises(),
      api.getWorkoutPlanByDate(today),
      api.getActiveSplit(),
      api.getWorkoutPlans(fromDate),
    ])
      .then(([exData, plan, activeSplit, plans]) => {
        setExercises(Array.isArray(exData) ? exData : []);
        const normalizedPlan = plan || null;
        setLoggedSets(Array.isArray(normalizedPlan?.sets) ? normalizedPlan.sets : []);

        const avgMap: ExerciseAverages = {};
        const planList = Array.isArray(plans) ? plans : [];
        for (const p of planList as WorkoutPlan[]) {
          const sets = Array.isArray(p?.sets) ? p.sets : [];
          for (const s of sets) {
            const exId = Number(s.exerciseId);
            if (!Number.isFinite(exId) || exId <= 0 || !s.isCompleted) continue;
            const weight = Number(s.weightKg || 0);
            const reps = Number(s.reps || 0);
            if (!avgMap[exId]) avgMap[exId] = { avgWeight: 0, avgReps: 0, totalSets: 0 };
            avgMap[exId].avgWeight += weight;
            avgMap[exId].avgReps += reps;
            avgMap[exId].totalSets += 1;
          }
        }
        for (const exIdText of Object.keys(avgMap)) {
          const exId = Number(exIdText);
          const row = avgMap[exId];
          const denom = Math.max(1, row.totalSets);
          row.avgWeight = row.avgWeight / denom;
          row.avgReps = row.avgReps / denom;
        }
        setExerciseAverages(avgMap);

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
        setLoggedSets([]);
        setRoutine({});
        setExerciseAverages({});
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

  const cardData = useMemo(() => {
    return routineCards.map((routineCard) => {
      const loggedForExercise = loggedSets.filter(s => s.exerciseId === routineCard.exercise.id)
        .sort((a, b) => a.setNumber - b.setNumber);
      return {
        ...routineCard,
        sets: loggedForExercise,
      };
    });
  }, [routineCards, loggedSets]);

  const targetedMusclesToday = useMemo(() => {
    const groups = cardData
      .map(c => String(c.exercise.muscleGroup || c.exercise.category || '').trim())
      .filter(Boolean)
      .map(g => g.toLowerCase());

    const unique = Array.from(new Set(groups));
    const pretty = unique.map(g => g.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '));
    return pretty.slice(0, 2);
  }, [cardData]);

  function openExerciseLogger(exerciseId: number) {
    navigate(`/body/workout/exercise/${exerciseId}/log`);
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
        <>
        <div className="rounded-2xl px-3 py-2.5 mb-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] uppercase font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Targeted Muscles Today</p>
          <div className="flex flex-wrap gap-1.5">
            {targetedMusclesToday.length > 0 ? targetedMusclesToday.map((muscle) => (
              <span key={muscle} className="px-2 py-1 rounded-lg text-[11px] font-semibold" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent)' }}>
                {muscle}
              </span>
            )) : (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No muscle target found</span>
            )}
          </div>
        </div>

        {cardData.map(({ exercise, sets, targetSets }) => {
          const completed = sets.filter(s => s.isCompleted).length;
          const avg = exerciseAverages[exercise.id];
          const recentSets = sets.slice(-3).reverse();
          return (
            <div key={exercise.id} className="rounded-2xl overflow-hidden mb-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-full flex items-center gap-3 p-4">
                {exercise.imageUrl ? (
                  <img src={exercise.imageUrl} alt={exercise.name} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                    <Dumbbell size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{exercise.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{exercise.muscleGroup || exercise.category || 'General'}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--accent)' }}>
                    Avg: {avg ? `${avg.avgWeight.toFixed(1)}kg · ${avg.avgReps.toFixed(1)} reps` : 'No history yet'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>{completed}/{targetSets || sets.length || 0}</span>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-3">
                {recentSets.length > 0 ? (
                  <div className="rounded-lg px-2 py-2 mb-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                    <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Recent Sets</p>
                    <div className="flex flex-wrap gap-1.5">
                      {recentSets.map((s, idx) => (
                        <span key={`${exercise.id}-recent-${s.id ?? idx}`} className="px-2 py-1 rounded text-[10px] num" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                          {Number(s.weightKg || 0)}kg x {Number(s.reps || 0)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                    No sets logged yet. Tap Open Logger to start tracking.
                  </p>
                )}
                <button
                  onClick={() => openExerciseLogger(exercise.id)}
                  className="w-full h-8 rounded-lg text-[11px] font-semibold"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent)' }}
                >
                  Open Logger
                </button>
              </div>
            </div>
          );
        })}
        </>
      )}
    </div>
  );
}

function normalizePlannedMealIdsForDay(dayValue: unknown): number[] {
  if (Array.isArray(dayValue)) {
    return dayValue
      .map(item => {
        if (typeof item === 'number') return item;
        if (!item || typeof item !== 'object') return null;

        const entry = item as Record<string, unknown>;
        const id = Number(
          entry.mealTemplateId
          ?? entry.MealTemplateId
          ?? entry.meal_template_id
          ?? entry.mealId
          ?? entry.meal_id,
        );

        return Number.isFinite(id) && id > 0 ? id : null;
      })
        .filter((id): id is number => id !== null && Number.isFinite(id) && id > 0);
  }

  if (dayValue && typeof dayValue === 'object' && Array.isArray((dayValue as any).mealIds)) {
    return normalizePlannedMealIdsForDay((dayValue as any).mealIds);
  }

  return [];
}

function normalizePlanKey(rawKey: string): string {
  const key = String(rawKey || '').trim();
  if (!key) return key;

  const maybeDate = new Date(key);
  if (!Number.isNaN(maybeDate.getTime())) {
    return format(maybeDate, 'yyyy-MM-dd');
  }

  return key.toLowerCase();
}

function resolvePlannedMealIds(map: unknown, today: string, utcToday: string, todayKey: string): number[] {
  if (!map || typeof map !== 'object') return [];

  const planMap = map as Record<string, unknown>;
  const byExact = [
    ...normalizePlannedMealIdsForDay(planMap[today]),
    ...normalizePlannedMealIdsForDay(planMap[utcToday]),
    ...normalizePlannedMealIdsForDay(planMap[todayKey]),
  ];
  if (byExact.length > 0) {
    return Array.from(new Set(byExact));
  }

  const normalizedTargets = new Set([today, utcToday, todayKey].map(normalizePlanKey));
  const merged: number[] = [];

  for (const key of Object.keys(planMap)) {
    const normalizedKey = normalizePlanKey(key);
    if (!normalizedTargets.has(normalizedKey)) continue;
    merged.push(...normalizePlannedMealIdsForDay(planMap[key]));
  }

  return Array.from(new Set(merged));
}

function getUtcDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseMealIngredients(rawJson: string): MealIngredient[] {
  if (!rawJson) return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: any) => {
        if (!item || typeof item !== 'object') return null;
        const id = Number(item.id ?? 0);
        if (!Number.isFinite(id) || id <= 0) return null;
        return {
          id,
          name: String(item.name ?? ''),
          caloriesKcal: Number(item.caloriesKcal ?? 0),
          proteinG: Number(item.proteinG ?? 0),
          carbsG: Number(item.carbsG ?? 0),
          fatsG: Number(item.fatsG ?? 0),
          qty: Number(item.qty ?? 0),
          unit: item.unit ? String(item.unit) : undefined,
          baseUnit: item.baseUnit ? String(item.baseUnit) : undefined,
        } as MealIngredient;
      })
      .filter((item): item is MealIngredient => item !== null);
  } catch {
    return [];
  }
}

function DietTab() {
  const [plannedMeals, setPlannedMeals] = useState<MealTemplate[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [goal, setGoal] = useState(2400);
  const [waterConsumedMl, setWaterConsumedMl] = useState(0);
  const [waterGoalMl, setWaterGoalMl] = useState(2000);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingMealId, setEditingMealId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState('1');
  const [editUnit, setEditUnit] = useState('serving');
  const navigate = useNavigate();
  const location = useLocation();
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayKey = format(new Date(), 'EEEE').toLowerCase();
  const utcToday = getUtcDateKey();

  // Listen for location changes that indicate meals were added
  useEffect(() => {
    // If we're coming back to this tab and there was a meal pick, refresh
    if ((location.state as any)?.mealPick || (location.state as any)?.mealAdded) {
      setRefreshTrigger(prev => prev + 1);
    }
  }, [location.pathname]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [templates, weeklyPlan, todayLog, settings, waterLog] = await Promise.all([
          api.getMealTemplates(),
          api.getWeeklyMealPlan() as Promise<WeeklyMealPlan>,
          (api as any).getDailyMealLog(today) as Promise<DailyMealLog | null>,
          api.getUserSettings(),
          api.getDailyWaterLog(today) as Promise<any>,
        ]);

        const list = Array.isArray(templates) ? templates : [];

        let plannedIds: number[] = [];
        try {
          const rawPlanJson = weeklyPlan?.planJson ?? weeklyPlan?.PlanJson ?? weeklyPlan?.plan_json;
          const map = rawPlanJson ? JSON.parse(rawPlanJson) : {};
          plannedIds = resolvePlannedMealIds(map, today, utcToday, todayKey);
        } catch {
          plannedIds = [];
        }

        // Combine weekly planned meals with daily logged meals
        const loggedIds = Array.isArray(todayLog?.mealIds) ? todayLog!.mealIds : [];
        const allMealIds = Array.from(new Set([...plannedIds, ...loggedIds]));
        const planned = allMealIds
          .map(id => list.find(m => m.id === id))
          .filter((m): m is MealTemplate => !!m);
        setPlannedMeals(planned);
        setSelected(loggedIds);
        
        if (Number.isFinite(settings?.calorieGoal)) {
          setGoal(Number(settings.calorieGoal));
        }

        setWaterConsumedMl(Number(waterLog?.mlConsumed || 0));
        setWaterGoalMl(Math.max(500, Number(waterLog?.goalMl || 2000)));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [today, todayKey, utcToday, refreshTrigger]);
  
  function isIngredientMeal(meal: MealTemplate): boolean {
    const ingredients = parseMealIngredients(meal.ingredientsJson);
    return ingredients.length === 1 && !meal.recipe?.trim();
  }

  function getIngredientInfo(meal: MealTemplate) {
    const ingredients = parseMealIngredients(meal.ingredientsJson);
    if (ingredients.length !== 1) return null;
    const ing = ingredients[0];
    return {
      qty: ing.qty || 1,
      unit: ing.unit || ing.baseUnit || 'serving',
      name: ing.name || '',
      id: ing.id || 0,
    };
  }

  async function deleteIngredientMeal(mealId: number) {
    if (!window.confirm('Delete this ingredient log?')) return;
    try {
      await api.deleteMealTemplate(mealId);
      setPlannedMeals(prev => prev.filter(m => m.id !== mealId));
      const nextSelected = selected.filter(id => id !== mealId);
      setSelected(nextSelected);
      await (api as any).upsertDailyMealLog(today, nextSelected);
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  }

  async function saveIngredientEdit(mealId: number) {
    const meal = plannedMeals.find(m => m.id === mealId);
    if (!meal) return;
    const ingInfo = getIngredientInfo(meal);
    if (!ingInfo) return;

    try {
      const newQty = Number(editQty) || 1;
      const macroFactor = newQty / (ingInfo.qty || 1);

      const updated = {
        ...meal,
        name: `${newQty} ${editUnit} ${ingInfo.name}`,
        ingredientsJson: JSON.stringify([
          {
            ...getIngredientInfo(meal),
            qty: newQty,
            unit: editUnit,
            caloriesKcal: Number(parseMealIngredients(meal.ingredientsJson)[0].caloriesKcal || 0) * macroFactor,
            proteinG: Number(parseMealIngredients(meal.ingredientsJson)[0].proteinG || 0) * macroFactor,
            carbsG: Number(parseMealIngredients(meal.ingredientsJson)[0].carbsG || 0) * macroFactor,
            fatsG: Number(parseMealIngredients(meal.ingredientsJson)[0].fatsG || 0) * macroFactor,
          }
        ]),
      };

      await api.updateMealTemplate(mealId, updated);
      setPlannedMeals(prev => prev.map(m => m.id === mealId ? { ...m, ...updated } : m));
      setEditingMealId(null);
    } catch (e) {
      console.error('Failed to save:', e);
    }
  }

  async function toggleMeal(id: number) {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
    setSelected(next);
    try {
      await (api as any).upsertDailyMealLog(today, next);
    } catch {
      // Keep optimistic UI in dummy-first flow
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
  const waterPercentage = waterGoalMl > 0 ? Math.min(100, Math.round((waterConsumedMl / waterGoalMl) * 100)) : 0;

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

        <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Meal Consumption</p>
            <p className="text-[10px] font-bold num" style={{ color: 'var(--accent-warm)' }}>{caloriePercentage}%</p>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, caloriePercentage)}%`, backgroundColor: 'var(--accent-warm)' }} />
          </div>
          <p className="text-[10px] mt-1 mb-2" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold num" style={{ color: 'var(--text-primary)' }}>{Math.round(consumedCalories)}</span> / {goal} kcal
          </p>

          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Water Consumption</p>
            <p className="text-[10px] font-bold num" style={{ color: 'var(--accent)' }}>{waterPercentage}%</p>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, waterPercentage)}%`, backgroundColor: '#06B6D4' }} />
          </div>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold num" style={{ color: 'var(--text-primary)' }}>{Math.round(waterConsumedMl)}</span> / {Math.round(waterGoalMl)} ml
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="section-label">Today's Meals</span>
        <div className="flex gap-2">
          <button onClick={() => navigate('/meals/add-ingredient')} className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent)' }}>Add Item</button>
          <button onClick={() => navigate('/settings/meals')} className="text-xs" style={{ color: 'var(--accent)' }}>Manage</button>
        </div>
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
        <>
        {plannedMeals.map(meal => {
          const total = parseMealIngredients(meal.ingredientsJson).reduce((s, i) => s + Number(i.caloriesKcal || 0), 0);
          const on = selected.includes(meal.id);
          const isIngMeal = isIngredientMeal(meal);
          const ingInfo = isIngMeal ? getIngredientInfo(meal) : null;

          return (
            <div key={meal.id}>
              <button
                onClick={() => {
                  if (isIngMeal && ingInfo) {
                    // For ingredient meals, open qty popup
                    setEditingMealId(meal.id);
                    setEditQty(String(ingInfo.qty || 1));
                    setEditUnit(ingInfo.unit || 'serving');
                  } else {
                    // For recipe meals, toggle logged state
                    toggleMeal(meal.id);
                  }
                }}
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
                  <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{meal.timing} · {isIngMeal ? 'Logged' : 'Planned'} · tap to {on ? 'unlog' : 'log'}</p>
                  {meal.recipe && <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{meal.recipe}</p>}
                </div>
                <span className="text-xs font-bold num" style={{ color: 'var(--accent-warm)' }}>{Math.round(total)}</span>
              </button>

              {isIngMeal && ingInfo && (
                <div className="flex gap-1 mb-2 px-1">
                  <button
                    onClick={() => deleteIngredientMeal(meal.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent-warm)' }}
                    title="Delete ingredient"
                  >
                    🗑️
                  </button>
                </div>
              )}

              {editingMealId === meal.id && isIngMeal && ingInfo && (
                <div className="mb-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--accent)11', border: '1px solid var(--accent)33', backdropFilter: 'blur(10px)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Edit {ingInfo.name}</p>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="number"
                      value={editQty}
                      onChange={e => setEditQty(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-sm rounded-lg outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      placeholder="Qty"
                    />
                    <select
                      value={editUnit}
                      onChange={e => setEditUnit(e.target.value)}
                      className="px-2 py-1.5 text-sm rounded-lg outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    >
                      <option>serving</option>
                      <option>g</option>
                      <option>ml</option>
                      <option>oz</option>
                      <option>cup</option>
                      <option>tbsp</option>
                      <option>tsp</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingMealId(null)}
                      className="flex-1 text-xs px-2 py-1 rounded-lg font-medium"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveIngredientEdit(meal.id)}
                      className="flex-1 text-xs px-2 py-1 rounded-lg font-medium text-white"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </>
      )}


    </div>
  );
}

// ─── Advanced Body Weight Progress Chart ────────────────────────────────────
function WeightChart({ logs, targetWeight }: { logs: api.BodyWeightLog[]; targetWeight: number | null }) {
  const [hovered, setHovered] = useState<number | null>(null);

  function formatChartDate(dateText: string): string {
    try {
      return format(parseISO(dateText), 'MMM do, yyyy');
    } catch {
      return dateText;
    }
  }

  if (logs.length === 0) return (
    <div className="flex flex-col items-center justify-center h-36 rounded-2xl gap-2"
      style={{ backgroundColor: 'var(--surface-elevated)', border: '2px dashed var(--border)' }}>
      <span className="text-2xl">📊</span>
      <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No weight entries yet</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Log your weight below to start tracking</p>
    </div>
  );

  const W = 340, H = 160, padX = 36, padY = 20, padBottom = 24;
  const innerW = W - padX * 2;
  const innerH = H - padY - padBottom;

  const weights = logs.map(l => l.weightKg);
  const allVals = targetWeight !== null ? [...weights, targetWeight] : weights;
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const spread = Math.max(rawMax - rawMin, 1);
  const minW = rawMin - spread * 0.15;
  const maxW = rawMax + spread * 0.15;

  const toX = (i: number) => padX + (i / Math.max(logs.length - 1, 1)) * innerW;
  const toY = (w: number) => padY + innerH - ((w - minW) / (maxW - minW)) * innerH;

  // Smooth cubic bezier path
  function smoothPath(pts: [number, number][]): string {
    if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const cpx = (x0 + x1) / 2;
      d += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  }

  const pts: [number, number][] = logs.map((l, i) => [toX(i), toY(l.weightKg)]);
  const linePath = smoothPath(pts);
  const areaPath = `${linePath} L ${toX(logs.length - 1)} ${H - padBottom} L ${toX(0)} ${H - padBottom} Z`;

  const labelIndexes = logs.length <= 6
    ? logs.map((_, i) => i)
    : [0, Math.round((logs.length - 1) / 3), Math.round((logs.length - 1) * 2 / 3), logs.length - 1];

  const targetY = targetWeight !== null ? toY(targetWeight) : null;
  const first = weights[0];
  const last = weights[weights.length - 1];
  const delta = last - first;
  const isLosing = delta < 0;

  // Y-axis grid lines
  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const val = minW + ((maxW - minW) * i) / gridCount;
    const y = toY(val);
    return { y, label: val.toFixed(1) };
  });

  const gradientId = `wg-${Math.abs(Math.round(first * 10))}`;

  return (
    <div style={{ position: 'relative' }}>
      {/* Delta badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: isLosing ? '#10b98122' : '#f59e0b22',
            color: isLosing ? '#10b981' : '#f59e0b',
          }}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg since start
        </span>
        {targetWeight !== null && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--accent)22', color: 'var(--accent)' }}>
            {(last - targetWeight).toFixed(1)} kg to goal
          </span>
        )}
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}
        onMouseLeave={() => setHovered(null)}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-blue, #3b82f6)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent-blue, #3b82f6)" stopOpacity="0.0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padX} y1={g.y} x2={W - 12} y2={g.y}
              stroke="var(--border)" strokeWidth="0.75" strokeDasharray="3,4" />
            <text x={padX - 4} y={g.y + 3.5} textAnchor="end" fontSize="8.5"
              fill="var(--text-muted)">{g.label}</text>
          </g>
        ))}

        {/* Target line */}
        {targetY !== null && (
          <g>
            <line x1={padX} y1={targetY} x2={W - 12} y2={targetY}
              stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.7" />
            <rect x={W - 36} y={targetY - 9} width={32} height={12} rx="4"
              fill="#f59e0b22" />
            <text x={W - 20} y={targetY + 0.5} textAnchor="middle" fontSize="8" fill="#f59e0b" fontWeight="600">
              goal
            </text>
          </g>
        )}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--accent-blue, #3b82f6)"
          strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" filter="url(#glow)" />

        {/* Dots */}
        {logs.map((l, i) => {
          const isHov = hovered === i;
          return (
            <g key={i}>
              <circle
                cx={toX(i)} cy={toY(l.weightKg)}
                r={10}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(i)}
              />
              <circle cx={toX(i)} cy={toY(l.weightKg)}
                r={isHov ? 6.5 : 3.2}
                fill={isHov ? '#fff' : 'var(--accent-blue, #3b82f6)'}
                stroke={isHov ? 'var(--accent-blue, #3b82f6)' : 'var(--surface)'}
                strokeWidth={isHov ? 2 : 1.5}
                style={{ cursor: 'pointer', transition: 'r 0.15s' }}
                onMouseEnter={() => setHovered(i)}
              />
              {/* Hover tooltip */}
              {isHov && (
                <g>
                  <rect
                    x={Math.min(toX(i) - 30, W - 70)} y={toY(l.weightKg) - 34}
                    width={60} height={22} rx={6}
                    fill="var(--surface-elevated)" stroke="var(--border)" strokeWidth="1"
                  />
                  <text x={Math.min(toX(i), W - 40)} y={toY(l.weightKg) - 19}
                    textAnchor="middle" fontSize="9.5" fontWeight="700"
                    fill="var(--text-primary)">{l.weightKg} kg</text>
                  <text x={Math.min(toX(i), W - 40)} y={toY(l.weightKg) - 9}
                    textAnchor="middle" fontSize="8"
                    fill="var(--text-muted)">{formatChartDate(l.date)}</text>
                </g>
              )}
            </g>
          );
        })}

        {/* X-axis labels */}
        {labelIndexes.map(i => (
          <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="8.5" fill="var(--text-muted)">
            {logs[i].date.slice(5)}
          </text>
        ))}

        {/* Current weight dot accent */}
        <circle cx={toX(logs.length - 1)} cy={toY(last)} r="5"
          fill="var(--accent-blue, #3b82f6)" opacity="0.3" />
        <circle cx={toX(logs.length - 1)} cy={toY(last)} r="3"
          fill="var(--accent-blue, #3b82f6)" />
      </svg>
    </div>
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
            {saving ? 'SavingGǪ' : 'Save'}
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Height</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {profile?.heightCm != null ? profile.heightCm : 'G��'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>cm</p>
        </div>
        <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Current</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {currentWeight != null ? currentWeight : 'G��'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>kg</p>
        </div>
        <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Target</p>
          <p className="text-xl font-bold" style={{ color: 'var(--accent-gold, #f59e0b)' }}>
            {profile?.targetWeightKg != null ? profile.targetWeightKg : 'G��'}
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
            {bmi < 18.5 ? '-+ Underweight' : bmi < 25 ? '-+ Normal' : bmi < 30 ? '-+ Overweight' : '-+ Obese'}
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
            {saving ? 'GǪ' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressTab() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<any>(null);
  const [prs, setPrs] = useState<any[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([]);
  const [mealLogs, setMealLogs] = useState<DailyMealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), 'yyyy-MM-dd');

  function toNumber(value: unknown, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeAnalyticsShape(data: any) {
    if (!data || typeof data !== 'object') return null;
    return {
      weeks: toNumber(data.weeks ?? data.Weeks, 12),
      daysLogged: toNumber(data.daysLogged ?? data.days_logged ?? data.DaysLogged, 0),
      totalSets: toNumber(data.totalSets ?? data.total_sets ?? data.TotalSets, 0),
      totalVolume: toNumber(data.totalVolume ?? data.total_volume ?? data.TotalVolume, 0),
    };
  }

  function normalizePrShape(list: any[]) {
    return list
      .map((pr) => ({
        ...pr,
        exerciseId: toNumber(pr?.exerciseId ?? pr?.exercise_id ?? pr?.ExerciseId, 0),
        weightKg: toNumber(pr?.weightKg ?? pr?.maxWeightKg ?? pr?.max_weight_kg ?? pr?.MaxWeightKg, 0),
        reps: toNumber(pr?.reps ?? pr?.Reps, 0),
      }))
      .filter((pr) => pr.exerciseId > 0);
  }

  function deriveFallbackAnalytics(plans: any[]) {
    const planList = Array.isArray(plans) ? plans : [];
    const sets = planList.flatMap((p) => (Array.isArray(p?.sets) ? p.sets : []));
    const completedSets = sets.filter((s) => Boolean(s?.isCompleted ?? s?.IsCompleted ?? true));
    const daysFromPlans = new Set(
      planList
        .filter((p) => Boolean(p?.isCompleted) || (Array.isArray(p?.sets) && p.sets.length > 0))
        .map((p) => String(p?.date || '').slice(0, 10))
        .filter(Boolean),
    );

    return {
      weeks: 12,
      daysLogged: daysFromPlans.size,
      totalSets: completedSets.length,
      totalVolume: completedSets.reduce(
        (sum, s) => sum + toNumber(s?.weightKg ?? s?.WeightKg, 0) * toNumber(s?.reps ?? s?.Reps, 0),
        0,
      ),
    };
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const fromDate = format(subDays(new Date(), 365), 'yyyy-MM-dd');
        const [analyticsData, prsData, exData, plansData, mealsData, mealLogsData] = await Promise.all([
          api.getWorkoutAnalytics(12).catch(() => null),
          api.getPersonalRecords().catch(() => []),
          api.getExercises().catch(() => []),
          api.getWorkoutPlans(fromDate).catch(() => []),
          api.getMealTemplates().catch(() => []),
          (api as any).getDailyMealLogs('1970-01-01', today).catch(() => []),
        ]);

        const normalizedAnalytics = normalizeAnalyticsShape(analyticsData);
        const fallbackAnalytics = deriveFallbackAnalytics(Array.isArray(plansData) ? plansData : []);

        const finalAnalytics = normalizedAnalytics && (normalizedAnalytics.daysLogged > 0 || normalizedAnalytics.totalSets > 0 || normalizedAnalytics.totalVolume > 0)
          ? normalizedAnalytics
          : {
              ...fallbackAnalytics,
              weeks: normalizedAnalytics?.weeks ?? fallbackAnalytics.weeks,
            };

        setAnalytics(finalAnalytics);
        setPrs(normalizePrShape(Array.isArray(prsData) ? prsData : []));
        setExercises(Array.isArray(exData) ? exData : []);
        setMealTemplates(Array.isArray(mealsData) ? mealsData : []);
        setMealLogs(Array.isArray(mealLogsData) ? mealLogsData : []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [today]);

  const resolveExerciseName = (exerciseId: number) =>
    exercises.find(e => e.id === exerciseId)?.name ?? `Exercise #${exerciseId}`;

  const resolveExerciseMuscle = (exerciseId: number) => {
    const ex = exercises.find(e => e.id === exerciseId);
    return ex?.muscleGroup ?? ex?.category ?? 'Strength';
  };

  const mealRecords = useMemo(() => {
    const byMeal = new Map<number, { count: number; lastDate: string }>();
    const logs = Array.isArray(mealLogs) ? mealLogs : [];

    for (const log of logs) {
      const date = String(log?.date || '').slice(0, 10);
      const ids = Array.isArray(log?.mealIds) ? log.mealIds : [];
      for (const rawId of ids) {
        const id = Number(rawId);
        if (!Number.isFinite(id) || id <= 0) continue;
        const prev = byMeal.get(id);
        if (!prev) {
          byMeal.set(id, { count: 1, lastDate: date });
        } else {
          byMeal.set(id, {
            count: prev.count + 1,
            lastDate: prev.lastDate && prev.lastDate > date ? prev.lastDate : date,
          });
        }
      }
    }

    return Array.from(byMeal.entries())
      .map(([id, stats]) => {
        const meal = mealTemplates.find((m) => m.id === id);
        if (!meal) return null;
        const ingredients = parseMealIngredients(meal.ingredientsJson);
        const calories = ingredients.reduce((sum, ing) => sum + Number(ing.caloriesKcal || 0), 0);
        const protein = ingredients.reduce((sum, ing) => sum + Number(ing.proteinG || 0), 0);
        const carbs = ingredients.reduce((sum, ing) => sum + Number(ing.carbsG || 0), 0);
        const fats = ingredients.reduce((sum, ing) => sum + Number(ing.fatsG || 0), 0);
        return {
          id: meal.id,
          name: meal.name,
          timing: meal.timing,
          calories,
          protein,
          carbs,
          fats,
          count: stats.count,
          lastDate: stats.lastDate,
        };
      })
      .filter((m): m is { id: number; name: string; timing: string; calories: number; protein: number; carbs: number; fats: number; count: number; lastDate: string } => !!m)
      .sort((a, b) => b.count - a.count || b.protein - a.protein || b.calories - a.calories);
  }, [mealTemplates, mealLogs]);

  // Stats cards with live analytics
  const statCards = [
    {
      label: 'Days Logged',
      value: analytics?.daysLogged ?? 0,
      unit: 'days',
      icon: '=���n+�',
      color: 'var(--accent)',
    },
    {
      label: 'Total Sets',
      value: analytics?.totalSets ?? 0,
      unit: 'sets',
      icon: '=�Ƭ',
      color: 'var(--accent-green)',
    },
    {
      label: 'Volume Lifted',
      value: analytics?.totalVolume ? `${(analytics.totalVolume / 1000).toFixed(1)}k` : '0',
      unit: 'kg total',
      icon: '=���n+�',
      color: 'var(--accent-warm)',
    },
    {
      label: 'This Period',
      value: analytics?.weeks ?? 0,
      unit: 'weeks',
      icon: '=���',
      color: 'var(--accent-blue, #3b82f6)',
    },
  ];

  return (
    <div className="px-4 space-y-5 pb-6">
      {/* Body Metrics */}
      <BodyMetricsSection />

      <div className="border-t" style={{ borderColor: 'var(--border)' }} />

      {/* G��G�� Workout Stats G��G�� */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Workout Stats</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: 'var(--accent)22', color: 'var(--accent)' }}>Last {analytics?.weeks ?? 0} weeks</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {statCards.map(card => (
            <div key={card.label} className="p-4 rounded-2xl flex items-center gap-3"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: `${card.color}22` }}>
                {card.icon}
              </div>
              <div>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
                <p className="text-2xl font-black leading-tight num" style={{ color: card.color }}>
                  {loading ? 'G��' : card.value}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{card.unit}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* G��G�� Personal Records G��G�� */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Personal Records</span>
            <span className="text-xs">=���</span>
          </div>
          {prs.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#f59e0b22', color: '#f59e0b' }}>
              {prs.length} PRs set!
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-2xl skeleton" style={{ backgroundColor: 'var(--surface)' }} />
            ))}
          </div>
        ) : prs.length === 0 ? (
          <div className="p-5 rounded-2xl text-center"
            style={{ backgroundColor: 'var(--surface)', border: '2px dashed var(--border)' }}>
            <p className="text-3xl mb-2">=�Ļ</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No PRs yet G�� crush your first workout!</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Complete sets in the Workout tab to set records</p>
          </div>
        ) : (
          <div className="space-y-2">
            {prs.slice(0, 5).map((pr, idx) => {
              const name = resolveExerciseName(pr.exerciseId);
              const muscle = resolveExerciseMuscle(pr.exerciseId);
              const weight = toNumber(pr.weightKg, 0);
              const reps = toNumber(pr.reps, 0);
              const oneRm = weight > 0 && reps > 0
                ? Math.round(weight * (1 + reps / 30))
                : null;
              const medals = ['=���', '=���', '=���'];
              const medal = medals[idx] ?? '=���';
              return (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: idx === 0 ? '1px solid #f59e0b66' : '1px solid var(--border)',
                    background: idx === 0 ? 'linear-gradient(135deg, #f59e0b11, var(--surface))' : undefined,
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: idx === 0 ? '#f59e0b22' : 'var(--surface-elevated)' }}>
                    {medal}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{muscle}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black num" style={{ color: 'var(--accent-warm)' }}>
                      {weight} kg +� {reps}
                    </p>
                    {oneRm !== null && (
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>~{oneRm} kg 1RM</p>
                    )}
                  </div>
                </div>
              );
            })}
            {prs.length > 5 && (
              <button
                onClick={() => navigate('/body/progress/prs')}
                className="w-full h-10 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent)', border: '1px solid var(--border)' }}
              >
                Show More ({prs.length - 5} more)
              </button>
            )}
          </div>
        )}
      </div>

      {/* G��G�� Meal Records G��G�� */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Meal Records</span>
            <span className="text-xs">=��+n+�</span>
          </div>
          {mealRecords.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)22', color: 'var(--accent)' }}>
              {mealRecords.length} all-time meals
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-2xl skeleton" style={{ backgroundColor: 'var(--surface)' }} />
            ))}
          </div>
        ) : mealRecords.length === 0 ? (
          <div className="p-5 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '2px dashed var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No meal records yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Log meals in Diet to build all-time meal records</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mealRecords.slice(0, 5).map((meal, idx) => (
              <div key={`${meal.id}-${idx}`} className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  =��+n+�
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{meal.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{meal.timing || 'Meal'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black num" style={{ color: 'var(--accent-warm)' }}>{Math.round(meal.calories)} kcal</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {meal.count} logs -+ last {meal.lastDate || '--'}
                  </p>
                  <p className="text-[10px] num" style={{ color: 'var(--text-muted)' }}>
                    P{Math.round(meal.protein)} C{Math.round(meal.carbs)} F{Math.round(meal.fats)}
                  </p>
                </div>
              </div>
            ))}
            {mealRecords.length > 5 && (
              <button
                onClick={() => navigate('/body/diet/meals')}
                className="w-full h-10 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent)', border: '1px solid var(--border)' }}
              >
                Show More ({mealRecords.length - 5} more)
              </button>
            )}
          </div>
        )}
      </div>

      {/* G��G�� Motivational Banner G��G�� */}
      <div className="p-4 rounded-2xl text-center"
        style={{ background: 'linear-gradient(135deg, var(--accent)22, var(--accent-green)11)', border: '1px solid var(--accent)33' }}>
        <p className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
          {(analytics?.daysLogged ?? 0) === 0
            ? '=��� Start your journey G�� log day 1 today!'
            : (analytics?.daysLogged ?? 0) < 7
              ? `=��� ${analytics.daysLogged} days logged G�� you're just getting started!`
              : (analytics?.daysLogged ?? 0) < 30
                ? `=�Ƭ ${analytics.daysLogged} days logged G�� building real momentum!`
                : `=��� ${analytics.daysLogged} days logged G�� you're unstoppable!`}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Keep going G�� every rep counts.
        </p>
      </div>
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
