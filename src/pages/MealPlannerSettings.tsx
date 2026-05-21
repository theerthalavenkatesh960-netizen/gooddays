import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Calendar, BookOpen, UtensilsCrossed, Loader2, Filter, Search, Layers, ChefHat } from 'lucide-react';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
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

function toDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function toLegacyDayKey(date: Date) {
  return format(date, 'EEEE').toLowerCase();
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
    return parsed.map((item: any) => ({
      id: Number(item.id || 0),
      name: String(item.name || ''),
      qty: Number(item.qty ?? 1),
      baseQty: Number(item.baseQty ?? 1),
      baseUnit: String(item.baseUnit || 'serving'),
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
        if (item && typeof item === 'object' && 'mealTemplateId' in item) {
          return {
            mealTemplateId: Number(item.mealTemplateId),
            timeOfDay: item.timeOfDay ? String(item.timeOfDay).trim() : undefined,
          } as MealAssignment;
        }
        // Fallback: handle old format (plain ID)
        const id = Number(item);
        if (Number.isFinite(id)) {
          return { mealTemplateId: id, timeOfDay: undefined } as MealAssignment;
        }
        return null;
      })
      .filter((a): a is MealAssignment => !!a);
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
    next[key] = normalizeDayMealAssignments(raw[key]);
  }
  return next;
}

export default function MealPlannerSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<'weekly' | 'library'>((location.state as any)?.tab ?? 'weekly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [meals, setMeals] = useState<MealTemplate[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanMap>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const lastAppliedPickRef = useRef<string>('');

  const [showMealFilters, setShowMealFilters] = useState(false);
  const [mealSearch, setMealSearch] = useState('');
  const [mealTimingFilter, setMealTimingFilter] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'pre-workout' | 'post-workout' | 'snack'>('all');

  const selectedDayKey = toDateKey(selectedDate);
  const selectedDayLabel = format(selectedDate, 'EEEE').toLowerCase();

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    setTab((location.state as any)?.tab ?? 'weekly');
  }, [location.state]);

  async function loadAll() {
    setLoading(true);
    try {
      const [mealData, planData] = await Promise.all([
        api.getMealTemplates(),
        api.getWeeklyMealPlan(),
      ]);

      setMeals(Array.isArray(mealData) ? mealData : []);
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
      await api.upsertWeeklyMealPlan(JSON.stringify(plan));
      setMealPlan(plan);
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

  async function addMealToDay(dayKey: string, mealTemplateId: number, timeOfDay?: string) {
    const existing = mealPlan[dayKey] || [];
    if (existing.some(a => a.mealTemplateId === mealTemplateId)) {
      flash('Meal already exists for this day');
      return;
    }
    const newAssignment: MealAssignment = {
      mealTemplateId,
      timeOfDay: timeOfDay?.trim() || undefined,
    };
    await savePlan({ ...mealPlan, [dayKey]: [...existing, newAssignment] });
  }

  useEffect(() => {
    const state: any = location.state || {};
    const pick = state.mealPick;
    if (loading) return;
    if (!pick?.dayKey || !pick?.mealTemplateId) return;
    const signature = `${pick.dayKey}-${pick.mealTemplateId}-${pick.timeOfDay || ''}`;
    if (lastAppliedPickRef.current === signature) return;
    lastAppliedPickRef.current = signature;
    addMealToDay(pick.dayKey, Number(pick.mealTemplateId), pick.timeOfDay);
  }, [location.state, loading]);

  function openMealPicker(dayKey: string) {
    navigate('/settings/meals/pick', { state: { dayKey } });
  }

  async function removeMealFromDay(dayKey: string, mealId: number) {
    await savePlan({ ...mealPlan, [dayKey]: (mealPlan[dayKey] || []).filter(a => a.mealTemplateId !== mealId) });
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
      .map(item => item?.meal)
      .filter((meal): meal is MealTemplate => meal !== null && meal !== undefined);
  }, [mealPlan, meals, selectedDayKey, selectedDate]);

  const selectedDayCalories = selectedMeals.reduce((sum, meal) => {
    const ingredientsForMeal = parseIngredients(meal.ingredientsJson);
    return sum + ingredientsForMeal.reduce((a, i) => a + i.caloriesKcal, 0);
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
        <button onClick={() => setTab('weekly')} className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${tab === 'weekly' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:text-gray-800'}`}>
          <Calendar size={14} /> Weekly Meals
        </button>
        <button onClick={() => setTab('library')} className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${tab === 'library' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:text-gray-800'}`}>
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
                <div className="flex items-center gap-2">
                  <button onClick={copyLastWeekPlan}
                    className="px-2.5 py-1 rounded-lg text-xs sm:text-sm font-medium"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                    Copy Last Week
                  </button>
                  <button onClick={() => openMealPicker(selectedDayKey)}
                    className="px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 press"
                    style={{ backgroundColor: 'var(--accent-green)', color: '#fff' }}>
                    <Plus size={14} /> Add Meal
                  </button>
                </div>
              }
            />
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
              <button onClick={() => setShowMealFilters(v => !v)} className="w-8 h-8 rounded-lg flex items-center justify-center press"
                style={{ backgroundColor: showMealFilters ? 'var(--accent-green)' : 'var(--surface-elevated)', color: showMealFilters ? '#fff' : 'var(--text-secondary)' }} title="Toggle meal filters">
                <Filter size={14} />
              </button>
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
                  const ings = parseIngredients(meal.ingredientsJson);
                  const total = ings.reduce((s, i) => s + i.caloriesKcal, 0);
                  const macros = { protein: ings.reduce((s, i) => s + i.proteinG, 0), carbs: ings.reduce((s, i) => s + i.carbsG, 0), fats: ings.reduce((s, i) => s + i.fatsG, 0) };
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

    </div>
  );
}
