import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Dumbbell, Flame, Leaf, ListFilter, Loader2, PiggyBank, Sparkles, UtensilsCrossed } from 'lucide-react';
import {
  completeOnboarding,
  createMealIngredient,
  createWorkoutPlan,
  generateAiMealPlan,
  generateAiWorkoutPlan,
  getExercises,
  getMealIngredients,
  getMealTemplates,
  getWorkoutPlanByDate,
  type OnboardingData,
  updateWorkoutPlan,
  upsertWeeklyMealPlan,
} from '../lib/api';
import {
  ACTIVITY_LEVELS,
  BUDGET_PRESETS,
  CALORIE_PRESETS,
  DIET_PREFERENCES,
  MEAL_PREFERENCES,
  ONBOARDING_FEATURES,
  WORKOUT_TYPES,
} from '../lib/config';

type Ingredient = { id: number; name: string; ingredientsJson?: string; timeOfDay?: string; timing?: string };

type RoutineMap = Record<string, Array<{ exerciseId: number; sets: number; reps: number }>>;

const WEEK_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function dateKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function parseTemplateIngredientIds(ingredientsJson?: string): number[] {
  if (!ingredientsJson) return [];
  try {
    const arr = JSON.parse(ingredientsJson);
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => Number(x?.id)).filter((x) => Number.isFinite(x) && x > 0);
  } catch {
    return [];
  }
}

function templateScore(template: any, preferred: Set<number>, excluded: Set<number>): { score: number; hasExcluded: boolean } {
  const ids = parseTemplateIngredientIds(template?.ingredientsJson);
  const hasExcluded = ids.some((id) => excluded.has(id));
  const score = ids.reduce((acc, id) => acc + (preferred.has(id) ? 1 : 0), 0);
  return { score, hasExcluded };
}

function buildNormalMealPlan(
  templates: any[],
  preferred: Set<number>,
  excluded: Set<number>,
  maxMealsPerDay: number
): Record<string, Array<{ mealTemplateId: number; timeOfDay?: string }>> {
  const ranked = [...templates]
    .map((t) => ({ t, ...templateScore(t, preferred, excluded) }))
    .sort((a, b) => {
      if (a.hasExcluded !== b.hasExcluded) return a.hasExcluded ? 1 : -1;
      return b.score - a.score;
    })
    .map((x) => x.t);

  const byTiming = (timing: string) => ranked.filter((t) => String(t.timing || '').toLowerCase() === timing);
  const defaults = [
    byTiming('breakfast')[0],
    byTiming('lunch')[0],
    byTiming('dinner')[0],
  ].filter(Boolean);

  const fallback = ranked.slice(0, 3);
  const picks = (defaults.length > 0 ? defaults : fallback).slice(0, Math.max(1, maxMealsPerDay));
  const result: Record<string, Array<{ mealTemplateId: number; timeOfDay?: string }>> = {};

  for (let i = 0; i < 7; i += 1) {
    result[dateKey(i)] = picks.map((t: any) => ({
      mealTemplateId: t.id,
      timeOfDay: t.timeOfDay || undefined,
    }));
  }
  return result;
}

function sanitizeAiMealPlan(
  plan: Record<string, Array<{ mealTemplateId: number; timeOfDay?: string }>>,
  templates: any[],
  preferred: Set<number>,
  excluded: Set<number>,
  maxMealsPerDay: number
): Record<string, Array<{ mealTemplateId: number; timeOfDay?: string }>> {
  const templateMap = new Map<number, any>(templates.map((t) => [Number(t.id), t]));
  const rankedFallback = [...templates]
    .map((t) => ({ t, ...templateScore(t, preferred, excluded) }))
    .sort((a, b) => {
      if (a.hasExcluded !== b.hasExcluded) return a.hasExcluded ? 1 : -1;
      return b.score - a.score;
    })
    .map((x) => x.t);

  const next: Record<string, Array<{ mealTemplateId: number; timeOfDay?: string }>> = {};
  Object.entries(plan || {}).forEach(([day, items]) => {
    const normalized = (Array.isArray(items) ? items : [])
      .map((x) => ({ mealTemplateId: Number((x as any)?.mealTemplateId), timeOfDay: (x as any)?.timeOfDay }))
      .filter((x) => templateMap.has(x.mealTemplateId));

    const scored = normalized
      .map((entry) => {
        const t = templateMap.get(entry.mealTemplateId);
        const s = templateScore(t, preferred, excluded);
        return { entry, score: s.score, hasExcluded: s.hasExcluded };
      })
      .sort((a, b) => {
        if (a.hasExcluded !== b.hasExcluded) return a.hasExcluded ? 1 : -1;
        return b.score - a.score;
      });

    let chosen = scored.filter((x) => !x.hasExcluded).map((x) => x.entry);
    if (chosen.length === 0) {
      chosen = scored.map((x) => x.entry);
    }
    if (chosen.length === 0 && rankedFallback.length > 0) {
      chosen = rankedFallback.slice(0, 3).map((t) => ({ mealTemplateId: Number(t.id), timeOfDay: t.timeOfDay || undefined }));
    }

    if (chosen.length > 0) next[day] = chosen.slice(0, Math.max(1, maxMealsPerDay));
  });

  return next;
}

function getAdherenceAdjustedParams(score?: number, fallbackDays?: number, fallbackMinutes?: number) {
  // Adherence scale: 1-10
  // 1-3: Beginner/Inconsistent
  // 4-5: Building/Trying
  // 6-7: Moderate/Disciplined
  // 8-10: Advanced/Athlete
  const clamped = Math.max(1, Math.min(10, Number(score || 5)));
  const base = clamped <= 3
    ? { daysPerWeek: 2, minutesPerSession: 25, maxMealsPerDay: 3 }
    : clamped <= 5
      ? { daysPerWeek: 3, minutesPerSession: 35, maxMealsPerDay: 3 }
      : clamped <= 7
        ? { daysPerWeek: 4, minutesPerSession: 45, maxMealsPerDay: 3 }
        : { daysPerWeek: 5, minutesPerSession: 60, maxMealsPerDay: 3 };

  const daysPerWeek = fallbackDays
    ? Math.max(1, Math.min(6, Math.round((fallbackDays + base.daysPerWeek) / 2)))
    : base.daysPerWeek;

  const minutesPerSession = fallbackMinutes
    ? Math.max(20, Math.min(90, Math.round((fallbackMinutes + base.minutesPerSession) / 2)))
    : base.minutesPerSession;

  return {
    daysPerWeek,
    minutesPerSession,
    maxMealsPerDay: base.maxMealsPerDay,
  };
}

function buildNormalWorkoutRoutine(exercises: any[], workoutsPerWeek: number): RoutineMap {
  const safeDays = Math.max(1, Math.min(6, workoutsPerWeek || 4));
  const workoutDays = ['monday', 'tuesday', 'thursday', 'friday', 'saturday', 'wednesday'].slice(0, safeDays);

  const pool = exercises
    .map((e) => Number(e?.id))
    .filter((id) => Number.isFinite(id) && id > 0)
    .slice(0, 24);

  const routine: RoutineMap = {
    sunday: [],
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
  };

  if (pool.length === 0) return routine;

  let cursor = 0;
  workoutDays.forEach((day) => {
    const block = Array.from({ length: Math.min(5, pool.length) }).map(() => {
      const id = pool[cursor % pool.length];
      cursor += 1;
      return { exerciseId: id, sets: 3, reps: 10 };
    });
    routine[day] = block;
  });

  return routine;
}

async function persistWorkoutRoutine(routine: RoutineMap) {
  for (let i = 0; i < 7; i += 1) {
    const key = dateKey(i);
    const dayName = WEEK_DAYS[new Date(`${key}T00:00:00`).getDay()];
    const entries = routine[dayName] || [];
    if (entries.length === 0) continue;

    const body = {
      date: `${key}T00:00:00Z`,
      dayLabel: dayName,
      plannedExercises: JSON.stringify(entries),
      isCompleted: false,
      notes: '',
    };

    const existing = await getWorkoutPlanByDate(key);
    if (existing?.id) {
      await updateWorkoutPlan(existing.id, body);
    } else {
      await createWorkoutPlan(body);
    }
  }
}

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 px-6 pb-4">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-full transition-all duration-300"
          style={{
            height: 3,
            background: i < current ? 'var(--accent)' : i === current ? 'var(--accent)88' : 'var(--border)',
          }}
        />
      ))}
    </div>
  );
}

function StepHeading({ step, title, subtitle }: { step: string; title: string; subtitle: string }) {
  return (
    <div className="px-6 mb-5">
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--accent)' }}>{step}</p>
      <p className="text-xl font-black leading-tight" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
    </div>
  );
}

function ToggleCard({
  emoji, title, desc, selected, onToggle,
}: { emoji: string; title: string; desc: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center gap-3"
      style={{
        background: selected ? 'var(--accent)18' : 'var(--surface-elevated)',
        border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
        boxShadow: selected ? '0 4px 14px var(--accent)22' : 'none',
      }}
    >
      <span className="text-xl flex-shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: selected ? 'var(--accent)' : 'var(--text-primary)' }}>{title}</p>
        {desc && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{desc}</p>}
      </div>
      {selected && <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}><Check size={11} color="#fff" strokeWidth={3} /></div>}
    </button>
  );
}

function OptionPill({
  emoji, label, desc, selected, onClick,
}: { emoji?: string; label: string; desc?: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl transition-all text-center"
      style={{
        background: selected ? 'var(--accent)18' : 'var(--surface-elevated)',
        border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
        minWidth: 0,
      }}
    >
      {emoji && <span className="text-lg">{emoji}</span>}
      <p className="text-[11px] font-bold leading-tight" style={{ color: selected ? 'var(--accent)' : 'var(--text-primary)' }}>{label}</p>
      {desc && <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>}
    </button>
  );
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 12,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface-elevated)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
};

function Field({ label, unit, children }: { label: string; unit?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        {unit && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{unit}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Enhanced Options for Step 4 (Health Preferences) ───────────────────────────
const CALORIE_OPTIONS = [
  { value: '1500', title: '1500 kcal', subtitle: 'Cut aggressive', caption: 'Fast fat loss', accent: '#FF6B6B' },
  { value: '1800', title: '1800 kcal', subtitle: 'Cut moderate', caption: 'Sustainable', accent: '#F59E0B' },
  { value: '2000', title: '2000 kcal', subtitle: 'Balanced', caption: 'Recomposition', accent: '#10B981' },
  { value: '2400', title: '2400 kcal', subtitle: 'Performance', caption: 'Training fuel', accent: '#3B82F6' },
  { value: '3000', title: '3000+ kcal', subtitle: 'Bulk mode', caption: 'Gain phase', accent: '#8B5CF6' },
] as const;

const BUDGET_OPTIONS = [
  { value: '1000', title: 'Low', subtitle: '₹1000 / week', caption: 'Essentials only', accent: '#FF6B6B' },
  { value: '2000', title: 'Moderate', subtitle: '₹2000 / week', caption: 'Balanced groceries', accent: '#F59E0B' },
  { value: '4000', title: 'Medium', subtitle: '₹4000 / week', caption: 'More variety', accent: '#10B981' },
  { value: '6000', title: 'High', subtitle: '₹6000 / week', caption: 'Quality + convenience', accent: '#3B82F6' },
  { value: '10000', title: 'Unlimited', subtitle: 'No strict cap', caption: 'Best fit recommendations', accent: '#8B5CF6' },
] as const;

const ACTIVITY_OPTIONS_ENHANCED = [
  { value: 'Sedentary', title: 'Sedentary', subtitle: 'Desk heavy lifestyle', caption: '<4k steps / day', accent: '#FF6B6B' },
  { value: 'Light', title: 'Light', subtitle: 'Some movement', caption: '4-7k steps / day', accent: '#F59E0B' },
  { value: 'Moderate', title: 'Moderate', subtitle: 'Regular workouts', caption: '8-10k steps / day', accent: '#10B981' },
  { value: 'Active', title: 'Active', subtitle: 'Training focused', caption: '1-2 sessions / day', accent: '#3B82F6' },
  { value: 'Very Active', title: 'Very Active', subtitle: 'Athlete mode', caption: 'High output routine', accent: '#8B5CF6' },
] as const;

const DIET_OPTIONS_ENHANCED = [
  { value: 'Vegetarian', title: 'Vegetarian', subtitle: 'Plant-based meals', caption: 'Paneer, lentils, tofu', accent: '#FF6B6B' },
  { value: 'Non-Veg', title: 'Non-Veg', subtitle: 'Mixed protein sources', caption: 'Chicken, fish, eggs', accent: '#F59E0B' },
  { value: 'High-Protein', title: 'High-Protein', subtitle: 'Protein priority', caption: 'Lean body goals', accent: '#10B981' },
  { value: 'Low-Carb', title: 'Low-Carb', subtitle: 'Carb restricted', caption: 'Glycemic control', accent: '#3B82F6' },
  { value: 'Balanced', title: 'Balanced', subtitle: 'Flexible nutrition', caption: 'Most adaptable', accent: '#8B5CF6' },
] as const;

type OptionCardProps = {
  selected: boolean;
  title: string;
  subtitle: string;
  caption?: string;
  onClick: () => void;
  accent?: string;
};

function OptionCard({ selected, title, subtitle, caption, onClick, accent = 'var(--accent)' }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className="text-left p-2.5 rounded-xl transition-all press relative overflow-hidden group"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${accent}33 0%, ${accent}11 100%)`
          : 'var(--surface-elevated)',
        border: selected ? `2px solid ${accent}` : '1px solid var(--border)',
        boxShadow: selected ? `0 12px 32px ${accent}35, inset 0 1px 0 ${accent}33` : 'none',
        transform: selected ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {selected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: accent }}>
          <CheckCircle2 size={14} color="#fff" strokeWidth={3} />
        </div>
      )}
      <p
        className="text-xs font-bold pr-3"
        style={{ color: selected ? accent : 'var(--text-primary)' }}
      >
        {title}
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: selected ? accent + 'cc' : 'var(--text-secondary)' }}>
        {subtitle}
      </p>
      {caption && (
        <p className="text-[9px] mt-1.5" style={{ color: selected ? accent : 'var(--text-muted)' }}>
          {caption}
        </p>
      )}
    </button>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [progressText, setProgressText] = useState('');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [customIngredientInput, setCustomIngredientInput] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    selectedFeatures: [],
    preferredWorkouts: [],
    preferredMeals: [],
    preferredIngredientIds: [],
    excludedIngredientIds: [],
    customPreferredIngredients: [],
    generationMode: 'ai',
  });

  const totalSteps = 6;

  useEffect(() => {
    let mounted = true;
    getMealIngredients()
      .then((rows) => {
        if (!mounted) return;
        setIngredients(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!mounted) return;
        setIngredients([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredIngredients = useMemo(() => {
    const q = ingredientSearch.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter((i) => String(i.name || '').toLowerCase().includes(q));
  }, [ingredients, ingredientSearch]);

  const setPatch = (patch: Partial<OnboardingData>) => setData((d) => ({ ...d, ...patch }));

  function toggleArr(field: 'selectedFeatures' | 'preferredWorkouts' | 'preferredMeals', value: string) {
    const curr = (data[field] || []) as string[];
    setPatch({ [field]: curr.includes(value) ? curr.filter((x) => x !== value) : [...curr, value] });
  }

  function cycleIngredientSelection(id: number) {
    const preferred = data.preferredIngredientIds || [];
    const excluded = data.excludedIngredientIds || [];

    if (preferred.includes(id)) {
      setPatch({
        preferredIngredientIds: preferred.filter((x) => x !== id),
        excludedIngredientIds: [...excluded, id],
      });
      return;
    }

    if (excluded.includes(id)) {
      setPatch({ excludedIngredientIds: excluded.filter((x) => x !== id) });
      return;
    }

    setPatch({ preferredIngredientIds: [...preferred, id] });
  }

  function addCustomIngredient() {
    const value = customIngredientInput.trim();
    if (!value) return;
    const next = Array.from(new Set([...(data.customPreferredIngredients || []), value]));
    setPatch({ customPreferredIngredients: next });
    setCustomIngredientInput('');
  }

  async function ensureCustomIngredientsCreated(): Promise<number[]> {
    const names = data.customPreferredIngredients || [];
    if (names.length === 0) return data.preferredIngredientIds || [];

    const createdIds: number[] = [];
    for (const name of names) {
      const existing = ingredients.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        createdIds.push(existing.id);
        continue;
      }
      const created = await createMealIngredient({
        name,
        caloriesKcal: 0,
        proteinG: 0,
        carbsG: 0,
        fatsG: 0,
      });
      if (created?.id) createdIds.push(Number(created.id));
    }

    const allPreferred = Array.from(new Set([...(data.preferredIngredientIds || []), ...createdIds]));
    setPatch({ preferredIngredientIds: allPreferred });
    return allPreferred;
  }

  async function generatePlans(payload: OnboardingData) {
    const startDate = dateKey(0);
    const templates = await getMealTemplates();
    const adherence = getAdherenceAdjustedParams(payload.planAdherenceScore, payload.workoutsPerWeek, payload.minutesPerSession);

    const preferred = new Set(payload.preferredIngredientIds || []);
    const excluded = new Set(payload.excludedIngredientIds || []);

    if ((payload.generationMode || 'ai') === 'ai') {
      const mealResult = await generateAiMealPlan({
        startDate,
        mode: 'profile',
        budgetPerWeek: payload.budgetPerWeek,
        dietPreference: payload.dietPreference,
      });

      const aiMealPlan = sanitizeAiMealPlan((mealResult?.plan || {}) as any, templates || [], preferred, excluded, adherence.maxMealsPerDay);
      if (Object.keys(aiMealPlan).length > 0) {
        await upsertWeeklyMealPlan(JSON.stringify(aiMealPlan));
      }

      const workoutResult = await generateAiWorkoutPlan({
        mode: 'profile',
        daysPerWeek: adherence.daysPerWeek,
        minutesPerSession: adherence.minutesPerSession,
        setsDefault: 3,
        repsDefault: 10,
      });

      const routine = (workoutResult?.routine || {}) as RoutineMap;
      await persistWorkoutRoutine(routine);
      return;
    }

    const normalMeals = buildNormalMealPlan(templates || [], preferred, excluded, adherence.maxMealsPerDay);
    if (Object.keys(normalMeals).length > 0) {
      await upsertWeeklyMealPlan(JSON.stringify(normalMeals));
    }

    const exercises = await getExercises();
    const normalRoutine = buildNormalWorkoutRoutine(exercises || [], adherence.daysPerWeek);
    await persistWorkoutRoutine(normalRoutine);
  }

  async function skipAllOnboarding() {
    setSaving(true);
    setError('');
    setShowSkipWarning(false);

    try {
      // Auto-select first 5 ingredients to meet minimum requirement
      const preferredIds = new Set<number>();
      for (const item of ingredients) {
        preferredIds.add(item.id);
        if (preferredIds.size >= 5) break;
      }

      // Minimal defaults to allow user to skip entire onboarding
      const payload: OnboardingData = {
        selectedFeatures: ['health'],
        age: 30,
        heightCm: 170,
        currentWeightKg: 70,
        targetWeightKg: 70,
        gender: 'other',
        activityLevel: 'moderate',
        dietPreference: 'balanced',
        planAdherenceScore: 3,
        workoutsPerWeek: 3,
        minutesPerSession: 45,
        preferredIngredientIds: Array.from(preferredIds),
      };

      setProgressText('Skipping onboarding...');
      await completeOnboarding(payload);
      // No plan generation when skipping
      setSaving(false);
      navigate('/', { replace: true });
    } catch (e: any) {
      setError(e?.message || 'Failed to skip onboarding. Please try again.');
      setSaving(false);
      setProgressText('');
      setShowSkipWarning(false);
    }
  }

  async function handleFinish() {
    setSaving(true);
    setError('');

    try {
      setProgressText('Preparing ingredients...');
      const preferredIngredientIds = await ensureCustomIngredientsCreated();

      const selectedFeatures = (data.selectedFeatures && data.selectedFeatures.length > 0)
        ? data.selectedFeatures
        : ['health'];

      const excludedSet = new Set(data.excludedIngredientIds || []);
      const preferredSet = new Set(
        (preferredIngredientIds || []).filter((id) => Number.isFinite(id) && id > 0 && !excludedSet.has(id))
      );

      if (preferredSet.size < 5) {
        for (const item of ingredients) {
          if (excludedSet.has(item.id)) continue;
          preferredSet.add(item.id);
          if (preferredSet.size >= 5) break;
        }
      }

      const payload: OnboardingData = {
        ...data,
        selectedFeatures,
        preferredIngredientIds: Array.from(preferredSet),
      };

      setProgressText('Saving onboarding profile...');
      const completion = await completeOnboarding(payload);

      // If backend queue is unavailable, kick off generation without blocking navigation.
      if (!completion?.generationQueued) {
        void generatePlans(payload).catch((generationError: any) => {
          console.error('Background onboarding plan generation failed:', generationError);
        });
      }

      navigate('/', { replace: true });
    } catch (e: any) {
      setError(e?.message || 'Failed to complete onboarding. Please try again.');
      setSaving(false);
      setProgressText('');
    }
  }

  const preferredCount = (data.preferredIngredientIds?.length || 0) + (data.customPreferredIngredients?.length || 0);
  const adherenceOptions = [
    { score: 1, title: 'Rarely follows', hint: 'Just getting started' },
    { score: 2, title: 'Inconsistent', hint: 'Beginner, needs low friction' },
    { score: 3, title: 'Sometimes tries', hint: 'Struggling with consistency' },
    { score: 4, title: 'Building habits', hint: 'Growing stronger each week' },
    { score: 5, title: 'Fairly consistent', hint: 'Can handle good structure' },
    { score: 6, title: 'Disciplined', hint: 'Moderate commitment' },
    { score: 7, title: 'Very disciplined', hint: 'Strong routine established' },
    { score: 8, title: 'Advanced', hint: 'High commitment, optimized' },
    { score: 9, title: 'Athlete level', hint: 'Very serious, elite goals' },
    { score: 10, title: 'Elite performer', hint: 'Maximum dedication & discipline' },
  ];
  const canNext = [
    true,
    true,
    (data.heightCm ?? 0) > 0 && (data.currentWeightKg ?? 0) > 0 && (data.age ?? 0) > 0,
    true,
    true,
    true,
  ];

  return (
    <div className="min-h-screen app-bg">
      <div className="page flex flex-col">
      <div className="sticky top-0 z-10" style={{ background: 'linear-gradient(to bottom, var(--bg) 80%, transparent)' }}>
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        {step > 0 ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            <ArrowLeft size={15} style={{ color: 'var(--text-primary)' }} />
          </button>
        ) : <div className="w-8 h-8" />}
        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{step + 1} of {totalSteps}</p>
        <button
          onClick={() => {
            if (step === 2) return;
            if (step < totalSteps - 1) {
              setStep((s) => s + 1);
              return;
            }
            void handleFinish();
          }}
          disabled={step === 2 || saving}
          className="text-xs font-semibold"
          style={{
            background: 'none',
            border: 'none',
            cursor: step === 2 || saving ? 'not-allowed' : 'pointer',
            color: step === 2 || saving ? 'var(--text-muted)' : 'var(--text-secondary)',
            opacity: step === 2 || saving ? 0.55 : 1,
          }}
        >
          {step === totalSteps - 1 ? 'Skip to finish' : 'Skip step'}
        </button>
      </div>

      <StepBar current={step + 1} total={totalSteps} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="card rounded-3xl p-3 md:p-4">
        {step === 0 && (
          <>
            <StepHeading step="Step 1 of 6" title="What are you here for?" subtitle="Pick your focus areas. You can change this later." />
            <div className="px-6 space-y-2.5">
              {ONBOARDING_FEATURES.map((f) => (
                <ToggleCard
                  key={f.id}
                  emoji={f.emoji}
                  title={f.title}
                  desc={f.desc}
                  selected={(data.selectedFeatures || []).includes(f.id)}
                  onToggle={() => toggleArr('selectedFeatures', f.id)}
                />
              ))}
            </div>
            <div className="px-6 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Want to create plans yourself?
              </p>
              <button
                onClick={() => setShowSkipWarning(true)}
                disabled={saving}
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="inline mr-1.5 animate-spin" />
                    Skipping...
                  </>
                ) : (
                  'Skip Onboarding'
                )}
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <StepHeading step="Step 2 of 6" title="How likely are you to follow a plan?" subtitle="Choose a score from 1 to 5. We tune your plan intensity from this." />
            <div className="px-6 space-y-4">
              <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="space-y-2">
                  {adherenceOptions.map((opt) => {
                    const selected = Number(data.planAdherenceScore) === opt.score;
                    return (
                      <button
                        key={opt.score}
                        onClick={() => setPatch({ planAdherenceScore: opt.score })}
                        className="w-full text-left rounded-xl p-3 transition-all"
                        style={{
                          background: selected ? 'var(--accent)18' : 'var(--surface-elevated)',
                          border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold" style={{ color: selected ? 'var(--accent)' : 'var(--text-primary)' }}>
                            {opt.score} - {opt.title}
                          </p>
                          {selected && <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />}
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{opt.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                1 means rarely follows and needs simpler plans. 5 means strictly follows and can handle more structured plans.
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <StepHeading step="Step 3 of 6" title="Tell us about yourself" subtitle="This helps personalize your targets." />
            <div className="px-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Height" unit="cm"><input type="number" value={data.heightCm ?? ''} onChange={(e) => setPatch({ heightCm: e.target.value ? Number(e.target.value) : undefined })} style={fieldStyle} /></Field>
                <Field label="Current Weight" unit="kg"><input type="number" step="0.1" value={data.currentWeightKg ?? ''} onChange={(e) => setPatch({ currentWeightKg: e.target.value ? Number(e.target.value) : undefined })} style={fieldStyle} /></Field>
                <Field label="Target Weight" unit="kg"><input type="number" step="0.1" value={data.targetWeightKg ?? ''} onChange={(e) => setPatch({ targetWeightKg: e.target.value ? Number(e.target.value) : undefined })} style={fieldStyle} /></Field>
                <Field label="Target Date"><input type="date" value={data.targetDate ?? ''} onChange={(e) => setPatch({ targetDate: e.target.value || undefined })} style={fieldStyle} /></Field>
                <Field label="Age" unit="years"><input type="number" value={data.age ?? ''} onChange={(e) => setPatch({ age: e.target.value ? Number(e.target.value) : undefined })} style={fieldStyle} /></Field>
                <Field label="Gender">
                  <select value={data.gender ?? ''} onChange={(e) => setPatch({ gender: e.target.value || undefined })} style={{ ...fieldStyle, appearance: 'none' }}>
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </Field>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <StepHeading step="Step 4 of 6" title="Your health preferences" subtitle="Set food, activity, and budget preferences." />
            <div className="px-6 space-y-4">
              <div className="rounded-2xl p-3" style={{ background: 'var(--accent)14', border: '1px solid var(--accent)33' }}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  These choices shape your first week plan. You can fine-tune everything later in Settings.
                </p>
              </div>

              {/* Daily Calorie Target */}
              <div className="rounded-3xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F59E0B22' }}>
                    <Flame size={15} style={{ color: '#F59E0B' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Calorie Target</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Pick intensity based on body-composition goal</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CALORIE_OPTIONS.map((opt) => (
                    <OptionCard
                      key={opt.value}
                      selected={String(data.dailyCaloriesTarget) === opt.value}
                      title={opt.title}
                      subtitle={opt.subtitle}
                      caption={opt.caption}
                      accent={opt.accent}
                      onClick={() => setPatch({ dailyCaloriesTarget: Number(opt.value) })}
                    />
                  ))}
                </div>
              </div>

              {/* Weekly Food Budget */}
              <div className="rounded-3xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#10B98122' }}>
                    <PiggyBank size={15} style={{ color: '#10B981' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Weekly Food Budget</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Determines grocery recommendations and meal variety</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {BUDGET_OPTIONS.map((opt) => (
                    <OptionCard
                      key={opt.value}
                      selected={String(data.budgetPerWeek) === opt.value}
                      title={opt.title}
                      subtitle={opt.subtitle}
                      caption={opt.caption}
                      accent={opt.accent}
                      onClick={() => setPatch({ budgetPerWeek: Number(opt.value) })}
                    />
                  ))}
                </div>
              </div>

              {/* Activity Level */}
              <div className="rounded-3xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent)22' }}>
                    <Activity size={15} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Activity Level</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Used for calorie and recovery adjustments</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ACTIVITY_OPTIONS_ENHANCED.map((opt) => (
                    <OptionCard
                      key={opt.value}
                      selected={data.activityLevel === opt.value}
                      title={opt.title}
                      subtitle={opt.subtitle}
                      caption={opt.caption}
                      accent={opt.accent}
                      onClick={() => setPatch({ activityLevel: opt.value })}
                    />
                  ))}
                </div>
              </div>

              {/* Diet Preference */}
              <div className="rounded-3xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F59E0B22' }}>
                    <Leaf size={15} style={{ color: '#F59E0B' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Diet Preference</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Shapes meal source and macro distribution</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DIET_OPTIONS_ENHANCED.map((opt) => (
                    <OptionCard
                      key={opt.value}
                      selected={data.dietPreference === opt.value}
                      title={opt.title}
                      subtitle={opt.subtitle}
                      caption={opt.caption}
                      accent={opt.accent}
                      onClick={() => setPatch({ dietPreference: opt.value })}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <StepHeading step="Step 5 of 6" title="Customize your routine" subtitle="Choose workout styles and meal preferences." />
            <div className="px-6 space-y-4">
              <div className="rounded-2xl p-3" style={{ background: 'var(--accent)14', border: '1px solid var(--accent)33' }}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Pick styles you actually enjoy. This directly influences plan variety and sustainability.
                </p>
              </div>

              <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)22' }}>
                    <Dumbbell size={14} style={{ color: 'var(--accent)' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Workout styles</p>
                </div>
                <div className="space-y-2">
                  {WORKOUT_TYPES.map((w) => (
                    <ToggleCard
                      key={w.id}
                      emoji={w.emoji}
                      title={w.name}
                      desc={w.desc}
                      selected={(data.preferredWorkouts || []).includes(w.id)}
                      onToggle={() => toggleArr('preferredWorkouts', w.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-green)22' }}>
                    <Clock3 size={14} style={{ color: 'var(--accent-green)' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Weekly structure</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Workouts / week"><input type="number" min={1} max={7} value={data.workoutsPerWeek ?? ''} onChange={(e) => setPatch({ workoutsPerWeek: e.target.value ? Number(e.target.value) : undefined })} style={fieldStyle} /></Field>
                  <Field label="Minutes / session"><input type="number" min={10} max={180} value={data.minutesPerSession ?? ''} onChange={(e) => setPatch({ minutesPerSession: e.target.value ? Number(e.target.value) : undefined })} style={fieldStyle} /></Field>
                </div>
              </div>

              <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-gold)22' }}>
                    <UtensilsCrossed size={14} style={{ color: 'var(--accent-gold)' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Meal style</p>
                </div>
                <div className="space-y-2">
                  {MEAL_PREFERENCES.map((m) => (
                    <ToggleCard
                      key={m.id}
                      emoji={m.emoji}
                      title={m.name}
                      desc={m.desc}
                      selected={(data.preferredMeals || []).includes(m.id)}
                      onToggle={() => toggleArr('preferredMeals', m.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <StepHeading step="Step 6 of 6" title="Ingredients and generation" subtitle="Pick preferred ingredients (minimum 5), exclusions, and your plan generation mode." />
            <div className="px-6 space-y-4">
              <div className="rounded-2xl p-3" style={{ background: 'var(--accent)14', border: '1px solid var(--accent)33' }}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Choose at least 5 preferred ingredients. Tap ingredients to cycle preferred, excluded, and neutral.
                </p>
              </div>

              <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)22' }}>
                    <ListFilter size={14} style={{ color: 'var(--accent)' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Ingredients</p>
                </div>
                <input
                  type="text"
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  placeholder="Paneer, chicken, tofu, bell peppers..."
                  style={fieldStyle}
                />
                <div className="grid grid-cols-2 gap-2 mt-3 max-h-56 overflow-y-auto pr-1">
                  {filteredIngredients.slice(0, 80).map((item) => {
                    const preferred = (data.preferredIngredientIds || []).includes(item.id);
                    const excluded = (data.excludedIngredientIds || []).includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => cycleIngredientSelection(item.id)}
                        className="text-left px-3 py-2 rounded-xl"
                        style={{
                          background: preferred ? 'var(--accent)18' : excluded ? 'var(--accent-warm)18' : 'var(--surface-elevated)',
                          border: preferred ? '2px solid var(--accent)' : excluded ? '2px solid var(--accent-warm)' : '1px solid var(--border)',
                        }}
                        title="Tap cycles: preferred -> excluded -> neutral"
                      >
                        <p className="text-xs font-semibold" style={{ color: preferred ? 'var(--accent)' : excluded ? 'var(--accent-warm)' : 'var(--text-primary)' }}>{item.name}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  Preferred selected: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{preferredCount}</span> (minimum 5)
                </p>
              </div>

              <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-green)22' }}>
                    <UtensilsCrossed size={14} style={{ color: 'var(--accent-green)' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Custom ingredients</p>
                </div>
                <div className="flex gap-2">
                  <input type="text" value={customIngredientInput} onChange={(e) => setCustomIngredientInput(e.target.value)} placeholder="e.g. Greek yogurt" style={fieldStyle} />
                  <button onClick={addCustomIngredient} className="px-3 rounded-xl text-xs font-semibold" style={{ border: '1px solid var(--border)', background: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>Add</button>
                </div>
                {(data.customPreferredIngredients || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(data.customPreferredIngredients || []).map((name) => (
                      <button key={name} onClick={() => setPatch({ customPreferredIngredients: (data.customPreferredIngredients || []).filter((x) => x !== name) })} className="px-2 py-1 rounded-lg text-[11px]" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        {name} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-gold)22' }}>
                    <Sparkles size={14} style={{ color: 'var(--accent-gold)' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Plan generation mode</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPatch({ generationMode: 'ai' })}
                    className="p-3 rounded-xl text-left"
                    style={{ background: data.generationMode === 'ai' ? 'var(--accent)18' : 'var(--surface-elevated)', border: data.generationMode === 'ai' ? '2px solid var(--accent)' : '1px solid var(--border)' }}
                  >
                    <p className="text-xs font-bold flex items-center gap-1" style={{ color: data.generationMode === 'ai' ? 'var(--accent)' : 'var(--text-primary)' }}><Sparkles size={13} /> AI Generate</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Uses AI planner with your profile.</p>
                  </button>
                  <button
                    onClick={() => setPatch({ generationMode: 'normal' })}
                    className="p-3 rounded-xl text-left"
                    style={{ background: data.generationMode === 'normal' ? 'var(--accent)18' : 'var(--surface-elevated)', border: data.generationMode === 'normal' ? '2px solid var(--accent)' : '1px solid var(--border)' }}
                  >
                    <p className="text-xs font-bold" style={{ color: data.generationMode === 'normal' ? 'var(--accent)' : 'var(--text-primary)' }}>Normal Auto Generate</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Rule-based auto plan (easy to improve later).</p>
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--accent-warm)18', border: '1px solid var(--accent-warm)44', color: 'var(--accent-warm)' }}>
                  {error}
                </div>
              )}
            </div>
          </>
        )}
        </div>
      </div>

      <div className="mx-3 mb-4 p-3 rounded-2xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        {step < totalSteps - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext[step]}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{ background: canNext[step] ? 'var(--accent)' : 'var(--accent)44', color: canNext[step] ? '#fff' : 'var(--text-muted)', border: 'none', cursor: canNext[step] ? 'pointer' : 'not-allowed' }}
          >
            Continue <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={saving || !canNext[step]}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.8 : 1 }}
          >
            {saving ? (<><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {progressText || 'Generating plans...'}</>) : (<><CheckCircle2 size={16} /> Generate and enter dashboard</>)}
          </button>
        )}
      </div>

      {/* Skip Confirmation Modal */}
      {showSkipWarning && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => !saving && setShowSkipWarning(false)}
        >
          <div
            className="card rounded-2xl p-5 max-w-sm mx-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Skip Onboarding?</p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                You're about to skip guided setup. Here's what you'll be missing:
              </p>
            </div>

            <div className="space-y-2.5 mb-5">
              <div className="flex gap-2 items-start p-2.5 rounded-lg" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                <Sparkles size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>AI-Powered Plans</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>No personalized meal & workout generation</p>
                </div>
              </div>

              <div className="flex gap-2 items-start p-2.5 rounded-lg" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                <Dumbbell size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Smart Suggestions</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>No tailored recommendations based on your goals</p>
                </div>
              </div>

              <div className="flex gap-2 items-start p-2.5 rounded-lg" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                <Flame size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Default Settings</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Starting with moderate intensity & generic preferences</p>
                </div>
              </div>
            </div>

            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              You can always update your profile later in Settings to get personalized recommendations.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSkipWarning(false)}
                disabled={saving}
                className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                Go Back
              </button>
              <button
                onClick={() => void skipAllOnboarding()}
                disabled={saving}
                className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                style={{
                  background: saving ? 'var(--accent)60' : 'var(--accent)',
                  border: 'none',
                  color: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={12} className="inline mr-1.5 animate-spin" />
                    Skipping...
                  </>
                ) : (
                  'Skip Anyway'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
