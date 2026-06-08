import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Calendar, BookOpen, UtensilsCrossed, Loader2, Filter, Search, Layers, ChefHat, Sparkles } from 'lucide-react';
import { addDays, format } from 'date-fns';
import * as api from '../lib/api';
import MacroVisualization from '../components/MacroVisualization';
import MealCard from '../components/MealCard';
import WeeklyCalendar from '../components/WeeklyCalendar';

type MealTemplate = {
  id: number;
  name: string;
  timing: string;
  timeOfDay?: string;
  ingredientsJson: string;
  recipe: string;
  imageUrl?: string;
  // Server-calculated totals (from MealTemplateWithMacrosDto)
  totalCaloriesKcal?: number;
  totalProteinG?: number;
  totalCarbsG?: number;
  totalFatsG?: number;
};

type IngredientOption = {
  id: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  defaultQty?: number;
  defaultUnit?: string;
};

type IngSnap = {
  id: number;
  name: string;
  qty: number;
  baseQty: number;
  baseUnit: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  description?: string;
};

type MealAssignment = {
  mealTemplateId: number;
  timeOfDay?: string;
};

type MealPlanMap = Record<string, MealAssignment[]>;

const TIMING_COLORS: Record<string, string> = {
  breakfast: 'var(--accent-gold)',
  lunch: 'var(--accent-green)',
  dinner: 'var(--accent)',
  'pre-workout': 'var(--accent-warm)',
  'post-workout': '#4ECDC4',
  snack: 'var(--text-muted)',
};

function normalizeTimingTag(value?: string): string {
  return String(value || '').trim().toLowerCase();
}

function toDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function toLegacyDayKey(date: Date) {
  return format(date, 'EEEE').toLowerCase();
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

function parseTimeOfDayToMinutes(timeText?: string): number {
  if (!timeText?.trim()) return Number.MAX_SAFE_INTEGER;
  const t = timeText.trim().toLowerCase();
  let match = t.match(/^(\d{1,2})[:.](\.?\d{2})\s*(am|pm)?$/);
  if (!match) match = t.match(/^(\d{1,2})[:](\d{2})\s*(am|pm)?$/);
  if (match) {
    let h = Number(match[1]);
    const m = Number(match[2]);
    const ap = match[3];
    if (ap) {
      if (h < 1 || h > 12 || m < 0 || m > 59) return Number.MAX_SAFE_INTEGER;
      if (ap === 'pm' && h !== 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
    } else {
      if (h < 0 || h > 23 || m < 0 || m > 59) return Number.MAX_SAFE_INTEGER;
    }
    return h * 60 + m;
  }
  const hourOnly = t.match(/^(\d{1,2})\s*(am|pm)$/);
  if (hourOnly) {
    let h = Number(hourOnly[1]);
    const ap = hourOnly[2];
    if (h < 1 || h > 12) return Number.MAX_SAFE_INTEGER;
    if (ap === 'pm' && h !== 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    return h * 60;
  }
  const hhmm = t.match(/^(\d{2})(\d{2})$/);
  if (hhmm) {
    const h = Number(hhmm[1]), m = Number(hhmm[2]);
    if (h > 23 || m > 59) return Number.MAX_SAFE_INTEGER;
    return h * 60 + m;
  }
  return Number.MAX_SAFE_INTEGER;
}

function parseIngredients(json: string): IngSnap[] {
  try {
    const parsed = JSON.parse(json) || [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item: any) => item && typeof item === 'object' && item.name)
      .map((item: any) => ({
        id: Number(item.id || item.ingredientId || 0),
        name: String(item.name || ''),
        qty: Number(item.qty ?? 1),
        baseQty: Number(item.baseQty ?? item.qty ?? 1),
        baseUnit: String(item.unit || item.baseUnit || 'unit'),
        caloriesKcal: Number(item.caloriesKcal || 0),
        proteinG: Number(item.proteinG || 0),
        carbsG: Number(item.carbsG || 0),
        fatsG: Number(item.fatsG || 0),
        description: item.description ? String(item.description) : undefined,
      }));
  } catch {
    return [];
  }
}

function normalizeDayMealAssignments(value: any): MealAssignment[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        // Handle new format: { mealTemplateId: int, timeOfDay: string }
        if (item && typeof item === 'object') {
          const mealTemplateIdRaw =
            (item as any).mealTemplateId ??
            (item as any).MealTemplateId ??
            (item as any).meal_template_id;

          const timeOfDayRaw =
            (item as any).timeOfDay ??
            (item as any).TimeOfDay ??
            (item as any).time_of_day;

          if (mealTemplateIdRaw !== undefined && mealTemplateIdRaw !== null) {
            const id = Number(mealTemplateIdRaw);
            if (Number.isFinite(id)) {
              return {
                mealTemplateId: id,
                timeOfDay: timeOfDayRaw ? String(timeOfDayRaw).trim() : undefined,
              } as MealAssignment;
            }
          }

          return {
            mealTemplateId: Number.NaN,
            timeOfDay: undefined,
          } as MealAssignment;
        }
        // Fallback: handle old format (plain ID)
        const id = Number(item);
        if (Number.isFinite(id)) {
          return { mealTemplateId: id, timeOfDay: undefined } as MealAssignment;
        }
        return null;
      })
      .filter((a): a is MealAssignment => !!a && Number.isFinite(a.mealTemplateId) && a.mealTemplateId > 0);
  }
  if (value && typeof value === 'object' && Array.isArray(value.mealIds)) {
    return normalizeDayMealAssignments(value.mealIds);
  }
  return [];
}

function normalizeMealPlan(raw: any): MealPlanMap {
  if (!raw || typeof raw !== 'object') return {};
  const next: MealPlanMap = {};
  for (const key of Object.keys(raw)) {
    const normalizedKey = normalizePlanKey(key);
    const assignments = normalizeDayMealAssignments(raw[key]);
    next[normalizedKey] = [...(next[normalizedKey] || []), ...assignments];
  }
  return next;
}

export default function MealPlannerSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<'weekly' | 'library'>((location.state as any)?.tab ?? 'weekly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [meals, setMeals] = useState<MealTemplate[]>([]);
  const [ingredientLookup, setIngredientLookup] = useState<Record<number, IngredientOption>>({});
  const [mealPlan, setMealPlan] = useState<MealPlanMap>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const lastAppliedPickRef = useRef<string>('');

  const [showMealFilters, setShowMealFilters] = useState(false);
  const [mealSearch, setMealSearch] = useState('');
  const [mealTimingFilter, setMealTimingFilter] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'pre-workout' | 'post-workout' | 'snack'>('all');
  const [showAiGenerateModal, setShowAiGenerateModal] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);

  const selectedDayKey = toDateKey(selectedDate);
  const selectedDayLabel = format(selectedDate, 'EEEE').toLowerCase();

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    setTab((location.state as any)?.tab ?? 'weekly');
  }, [location.state]);

  async function openGenerateModal() {
    setCheckingProfile(true);
    try {
      const profile = await api.getHealthProfile();
      const missing: string[] = [];
      if (!profile.heightCm)       missing.push('height');
      if (!profile.weightKg)       missing.push('current weight');
      if (!profile.targetWeightKg) missing.push('target weight');
      if (!profile.age)            missing.push('age');
      if (!profile.gender)         missing.push('gender');
      if (!profile.activityLevel)  missing.push('activity level');
      if (!profile.dietPreference) missing.push('diet preference');
      if (!profile.budgetPerWeek)  missing.push('weekly budget');
      if (missing.length > 0) {
        flash(`Complete your health profile first (missing: ${missing.join(', ')})`);
        navigate('/settings/ai-planner');
        return;
      }
      setShowAiGenerateModal(true);
    } catch {
      flash('Could not load health profile. Please try again.');
    } finally {
      setCheckingProfile(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [mealData, planData, ingredientsData] = await Promise.all([
        api.getMealTemplates(),
        api.getWeeklyMealPlan(),
        api.getMealIngredients(),
      ]);

      setMeals(Array.isArray(mealData) ? mealData : []);
      const ingredientsRaw = Array.isArray(ingredientsData) ? ingredientsData : [];
      const lookup = (Array.isArray(ingredientsRaw) ? ingredientsRaw : []).reduce((acc: Record<number, IngredientOption>, item: any) => {
        const id = Number(item?.id || 0);
        if (!id) return acc;
        acc[id] = {
          id,
          caloriesKcal: Number(item?.caloriesKcal || 0),
          proteinG: Number(item?.proteinG || 0),
          carbsG: Number(item?.carbsG || 0),
          fatsG: Number(item?.fatsG || 0),
          defaultQty: Number(item?.defaultQty || 1),
          defaultUnit: String(item?.defaultUnit || 'unit'),
        };
        return acc;
      }, {});
      setIngredientLookup(lookup);
      if (planData?.planJson) {
        try {
          const parsed = typeof planData.planJson === 'string' ? JSON.parse(planData.planJson) : planData.planJson;
          setMealPlan(normalizeMealPlan(parsed));
        } catch {
          setMealPlan({});
        }
      } else if (planData?.plan_json) {
        try {
          const parsed = typeof planData.plan_json === 'string' ? JSON.parse(planData.plan_json) : planData.plan_json;
          setMealPlan(normalizeMealPlan(parsed));
        } catch {
          setMealPlan({});
        }
      } else if (planData && typeof planData === 'object') {
        setMealPlan(normalizeMealPlan(planData));
      }
    } catch (e: any) {
      setStatus(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  function flash(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(''), 2000);
  }

  async function deleteMeal(id: number) {
    try {
      await api.deleteMealTemplate(id);
      setMeals(prev => prev.filter(m => m.id !== id));

      const nextPlan: MealPlanMap = {};
      for (const key of Object.keys(mealPlan)) {
        nextPlan[key] = (mealPlan[key] || []).filter(assignment => assignment.mealTemplateId !== id);
      }
      await savePlan(nextPlan);
    } catch (e: any) {
      flash(e?.message || 'Failed to delete');
    }
  }

  async function savePlan(plan: MealPlanMap) {
    try {
      // Remove stale/invalid template IDs to avoid backend "invalid template id: 0" rejects.
      const sanitized: MealPlanMap = {};
      const validTemplateIds = new Set(meals.map(m => m.id));
      for (const key of Object.keys(plan)) {
        sanitized[key] = (plan[key] || []).filter((a) => Number.isFinite(a.mealTemplateId) && a.mealTemplateId > 0 && validTemplateIds.has(a.mealTemplateId));
      }

      await api.upsertWeeklyMealPlan(JSON.stringify(sanitized));
      setMealPlan(sanitized);
    } catch (e: any) {
      flash(e?.message || 'Failed to save plan');
    }
  }

  async function copyLastWeekPlan() {
    const sourceDate = format(addDays(selectedDate, -7), 'yyyy-MM-dd');
    const targetDate = format(selectedDate, 'yyyy-MM-dd');
    try {
      await api.copyLastWeekMealPlan(sourceDate, targetDate);
      await loadAll();
      flash('Copied last week ✓');
    } catch (e: any) {
      flash(e?.message || 'Last week has no meals to copy');
    }
  }

  async function addMealToDay(dayKey: string, mealTemplateId: number, timeOfDay?: string, slotTiming?: string) {
    if (!Number.isFinite(mealTemplateId) || mealTemplateId <= 0) {
      flash('Invalid meal template selected');
      return;
    }

    const pickedMeal = meals.find(m => m.id === mealTemplateId);
    if (!pickedMeal) {
      flash('Meal template not found');
      return;
    }

    const existing = mealPlan[dayKey] || [];
    if (existing.some(a => a.mealTemplateId === mealTemplateId)) {
      flash('Meal already exists for this day');
      return;
    }

    const timingKey = normalizeTimingTag(slotTiming || pickedMeal.timing);
    const nextExisting = timingKey
      ? existing.filter((a) => {
        const assignedMeal = meals.find(m => m.id === a.mealTemplateId);
        return normalizeTimingTag(assignedMeal?.timing) !== timingKey;
      })
      : existing;

    const newAssignment: MealAssignment = {
      mealTemplateId,
      timeOfDay: timeOfDay?.trim() || undefined,
    };
    await savePlan({ ...mealPlan, [dayKey]: [...nextExisting, newAssignment] });
  }

  useEffect(() => {
    const state: any = location.state || {};
    const pick = state.mealPick;
    if (loading) return;
    const pickedId = Number(pick?.mealTemplateId);
    if (!pick?.dayKey || !Number.isFinite(pickedId) || pickedId <= 0) return;
    const signature = `${pick.dayKey}-${pickedId}-${pick.timeOfDay || ''}-${pick.slotTiming || ''}`;
    if (lastAppliedPickRef.current === signature) return;
    lastAppliedPickRef.current = signature;
    addMealToDay(pick.dayKey, pickedId, pick.timeOfDay, pick.slotTiming);
  }, [location.state, loading]);

  function openMealPicker(dayKey: string) {
    navigate('/settings/meals/pick', { state: { dayKey } });
  }

  async function removeMealFromDay(dayKey: string, mealId: number) {
    await savePlan({ ...mealPlan, [dayKey]: (mealPlan[dayKey] || []).filter(a => a.mealTemplateId !== mealId) });
  }

  async function generateMealsWithAi() {
    try {
      setGeneratingAi(true);
      const result = await api.generateAiMealPlan({
        startDate: selectedDayKey,
        mode: 'profile',
      });

      const generatedPlan = normalizeMealPlan(result?.plan || {});
      const generatedKeys = Object.keys(generatedPlan);
      if (generatedKeys.length === 0) {
        flash('AI did not return a plan');
        return;
      }

      const merged = { ...mealPlan, ...generatedPlan };
      await savePlan(merged);
      setShowAiGenerateModal(false);
      flash('AI meal plan generated and applied');
    } catch (e: any) {
      flash(e?.message || 'Failed to generate AI meal plan');
    } finally {
      setGeneratingAi(false);
    }
  }

  const selectedMeals = useMemo(() => {
    const assignments = mealPlan[selectedDayKey] || [];
    const fallbackAssignments = (assignments.length > 0) ? assignments : (mealPlan[toLegacyDayKey(selectedDate)] || []);
    return fallbackAssignments
      .map(assignment => {
        const meal = meals.find(m => m.id === assignment.mealTemplateId);
        return meal ? { meal, overrideTime: assignment.timeOfDay as string | undefined } : null;
      })
      .filter((item): item is { meal: MealTemplate; overrideTime: string | undefined } => item !== null && item !== undefined)
      .sort((a, b) => {
        if (!a || !b) return 0;
        // Sort by override time if present, otherwise by template's default time
        const timeA = a.overrideTime || a.meal.timeOfDay;
        const timeB = b.overrideTime || b.meal.timeOfDay;
        const ta = parseTimeOfDayToMinutes(timeA);
        const tb = parseTimeOfDayToMinutes(timeB);
        return ta !== tb ? ta - tb : a.meal.id - b.meal.id;
      })
      .map(item => ({ ...item.meal, timeOfDay: item.overrideTime || item.meal.timeOfDay })) as MealTemplate[];
  }, [mealPlan, meals, selectedDayKey, selectedDate]);

  function getMealMacros(meal: MealTemplate) {
    if (
      meal.totalCaloriesKcal !== undefined ||
      meal.totalProteinG !== undefined ||
      meal.totalCarbsG !== undefined ||
      meal.totalFatsG !== undefined
    ) {
      return {
        calories: Number(meal.totalCaloriesKcal || 0),
        protein: Number(meal.totalProteinG || 0),
        carbs: Number(meal.totalCarbsG || 0),
        fats: Number(meal.totalFatsG || 0),
      };
    }

    const ing = parseIngredients(meal.ingredientsJson);
    return ing.reduce(
      (acc, item) => {
        const hasInline = Number(item.caloriesKcal || 0) > 0 || Number(item.proteinG || 0) > 0 || Number(item.carbsG || 0) > 0 || Number(item.fatsG || 0) > 0;
        if (hasInline) {
          acc.calories += Number(item.caloriesKcal || 0);
          acc.protein += Number(item.proteinG || 0);
          acc.carbs += Number(item.carbsG || 0);
          acc.fats += Number(item.fatsG || 0);
          return acc;
        }

        const lib = ingredientLookup[item.id];
        if (!lib) return acc;
        const baseQty = Math.max(0.01, Number(lib.defaultQty || item.baseQty || 1));
        const qty = Math.max(0.01, Number(item.qty || 1));
        const factor = qty / baseQty;
        acc.calories += Number(lib.caloriesKcal || 0) * factor;
        acc.protein += Number(lib.proteinG || 0) * factor;
        acc.carbs += Number(lib.carbsG || 0) * factor;
        acc.fats += Number(lib.fatsG || 0) * factor;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }

  const selectedDayCalories = selectedMeals.reduce((sum, meal) => {
    const macros = getMealMacros(meal);
    return sum + macros.calories;
  }, 0);

  const filteredMeals = useMemo(() => {
    let list = meals;
    if (mealSearch.trim()) {
      const q = mealSearch.trim().toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q));
    }
    if (mealTimingFilter !== 'all') list = list.filter(m => m.timing === mealTimingFilter);
    return list;
  }, [meals, mealSearch, mealTimingFilter]);

  if (loading) {
    return (
      <div className="pt-20 flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-green)' }} />
      </div>
    );
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Meals & Nutrition</h1>
      </div>

      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
        <button
          onClick={() => setTab('weekly')}
          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all"
          style={{ backgroundColor: tab === 'weekly' ? 'var(--accent)' : 'transparent', color: tab === 'weekly' ? '#fff' : 'var(--text-muted)' }}
        >
          <Calendar size={14} /> Weekly Meals
        </button>
        <button
          onClick={() => setTab('library')}
          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all"
          style={{ backgroundColor: tab === 'library' ? 'var(--accent)' : 'transparent', color: tab === 'library' ? '#fff' : 'var(--text-muted)' }}
        >
          <BookOpen size={14} /> Meal Library
        </button>
      </div>

      {status && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ backgroundColor: status.toLowerCase().includes('fail') || status.toLowerCase().includes('error') ? 'rgba(255,107,107,0.1)' : 'rgba(78, 205, 196, 0.1)', color: status.toLowerCase().includes('fail') || status.toLowerCase().includes('error') ? 'var(--accent-warm)' : 'var(--accent-green)' }}>
          {status}
        </div>
      )}

      {tab === 'weekly' && (
        <div className="space-y-2.5">
          <div className="mb-4">
            <WeeklyCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              renderDayExtra={(d) => {
                const dateKey = toDateKey(d);
                const legacyKey = toLegacyDayKey(d);
                const dayCount = (mealPlan[dateKey]?.length || 0) || (mealPlan[legacyKey]?.length || 0);
                return dayCount > 0 ? <div className="text-[10px] opacity-70">{dayCount}</div> : null;
              }}
              headerRight={
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                    className="px-2 py-1 rounded-lg text-[11px] press"
                    style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="px-2 py-1 rounded-lg text-[11px] font-semibold press"
                    style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)' }}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                    className="px-2 py-1 rounded-lg text-[11px] press"
                    style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}
                  >
                    ▶
                  </button>
                </div>
              }
            />
            <div className="flex justify-end gap-1.5 mt-2">
              <button onClick={openGenerateModal} disabled={checkingProfile}
                className="px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 press disabled:opacity-60"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent)' }}>
                <Sparkles size={13} /> {checkingProfile ? 'Checking…' : 'Generate with AI'}
              </button>
              <button onClick={copyLastWeekPlan}
                className="px-2 py-1 rounded-lg text-[11px] press"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>
                Copy Last Week
              </button>
              <button onClick={() => openMealPicker(selectedDayKey)}
                className="px-2.5 py-1 rounded-lg font-semibold text-[11px] flex items-center gap-1.5 press"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                <Plus size={14} /> Add Meal
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {selectedMeals.length} meal{selectedMeals.length !== 1 ? 's' : ''}
              {selectedDayCalories > 0 && <span style={{ color: 'var(--accent-gold)' }}> · {Math.round(selectedDayCalories)} kcal</span>}
            </p>
          </div>

          {selectedMeals.length > 0 ? (
            <div className="space-y-3">
              {selectedMeals.map(meal => (
                <MealCard
                  key={meal.id}
                  id={meal.id}
                  name={meal.name}
                  timing={meal.timing}
                  timeOfDay={meal.timeOfDay}
                  imageUrl={meal.imageUrl}
                  ingredients={parseIngredients(meal.ingredientsJson)}
                  totalCaloriesKcal={meal.totalCaloriesKcal}
                  totalProteinG={meal.totalProteinG}
                  totalCarbsG={meal.totalCarbsG}
                  totalFatsG={meal.totalFatsG}
                  onRemove={() => removeMealFromDay(selectedDayKey, meal.id)}
                />
              ))}
            </div>
          ) : (
            <button onClick={() => openMealPicker(selectedDayKey)} className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-sm press"
              style={{ border: '1.5px dashed var(--border)', color: 'var(--text-muted)' }}>
              <Plus size={14} /> Add meals for {selectedDayLabel}
            </button>
          )}
        </div>
      )}

      {tab === 'library' && (
        <>
          <div className="flex gap-2 mb-4">
            <button onClick={() => navigate('/settings/meals/ingredients')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all press"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
              <Layers size={13} /> Ingredient Library
            </button>
            <button onClick={() => navigate('/settings/meals/new-template')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all press"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent-green)', border: '1px solid var(--border)' }}>
              <ChefHat size={13} /> Create Template
            </button>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="section-label">Meal Templates</p>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/settings/meals/catalog')} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent-green)' }} title="Browse master catalog and add meals">
                  Browse Catalog
                </button>
                <button onClick={() => setShowMealFilters(v => !v)} className="w-8 h-8 rounded-lg flex items-center justify-center press"
                  style={{ backgroundColor: showMealFilters ? 'var(--accent-green)' : 'var(--surface-elevated)', color: showMealFilters ? '#fff' : 'var(--text-secondary)' }} title="Toggle meal filters">
                  <Filter size={14} />
                </button>
              </div>
            </div>

            {showMealFilters && (
              <div className="mb-3 space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <Search size={16} style={{ color: 'var(--text-muted)' }} />
                  <input value={mealSearch} onChange={e => setMealSearch(e.target.value)} placeholder="Search meals..."
                    className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
                </div>
                <select value={mealTimingFilter} onChange={e => setMealTimingFilter(e.target.value as any)} className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
                  <option value="all">All timings</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="pre-workout">Pre-workout</option>
                  <option value="post-workout">Post-workout</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
            )}

            {filteredMeals.length === 0 ? (
              <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                {meals.length === 0 ? 'No meal templates yet.' : 'No meals match the current filters.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredMeals.map(meal => {
                  const computed = getMealMacros(meal);
                  const total = computed.calories;
                  const macros = {
                    protein: computed.protein,
                    carbs: computed.carbs,
                    fats: computed.fats,
                  };
                  return (
                    <div key={meal.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                      <button onClick={() => navigate(`/settings/meals/template/${meal.id}`)} className="w-full text-left">
                        <div className="w-full h-24 flex items-center justify-center relative" style={{ backgroundColor: 'rgba(78, 205, 196, 0.07)' }}>
                          {meal.imageUrl ? <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" /> : <UtensilsCrossed size={28} style={{ color: 'var(--accent-green)', opacity: 0.5 }} />}
                          <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: TIMING_COLORS[meal.timing] || '#fff' }}>{meal.timing}</span>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold line-clamp-1 mb-0.5" style={{ color: 'var(--text-primary)' }}>{meal.name}</p>
                          <p className="text-[10px] mb-1.5" style={{ color: 'var(--accent-gold)' }}>{Math.round(total)} kcal</p>
                          {(macros.protein + macros.carbs + macros.fats) > 0 && <div className="mb-1.5"><MacroVisualization macros={macros} compact /></div>}
                        </div>
                      </button>
                      <div className="px-2.5 pb-2.5">
                        <button onClick={() => deleteMeal(meal.id)} className="w-full py-1 rounded-lg text-[10px] font-medium press flex items-center justify-center gap-1" style={{ color: 'var(--accent-warm)', backgroundColor: 'var(--surface)' }}>
                          <Trash2 size={10} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {showAiGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div className="w-full max-w-md rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Generate Meals with AI</p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>AI will generate a meal plan using your saved health profile.</p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAiGenerateModal(false)}
                disabled={generatingAi}
                className="px-3 py-1.5 rounded-lg text-sm press"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={generateMealsWithAi}
                disabled={generatingAi}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold press disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                {generatingAi ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
