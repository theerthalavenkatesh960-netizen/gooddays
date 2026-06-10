import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UtensilsCrossed } from 'lucide-react';
import * as api from '../lib/api';

type MealTemplate = {
  id: number;
  name: string;
  timing: string;
  timeOfDay?: string;
  ingredientsJson: string;
  imageUrl?: string;
};

type PickerState = {
  dayKey?: string;
  slotTiming?: string;
  source?: string;
  [key: string]: unknown;
};

type WeeklyMealPlan = { planJson?: string; plan_json?: string } | null;
type MealAssignment = { mealTemplateId?: number; timeOfDay?: string };

const TIMING_OPTIONS = ['breakfast', 'lunch', 'dinner', 'pre-workout', 'post-workout', 'snack'] as const;

function normalizeTiming(value?: string): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeAssignments(dayValue: unknown): MealAssignment[] {
  if (!Array.isArray(dayValue)) return [];
  return dayValue
    .map((item) => {
      if (item && typeof item === 'object') {
        const entry = item as Record<string, any>;
        const id = Number(
          entry.mealTemplateId ?? entry.MealTemplateId ?? entry.meal_template_id
        );
        const timeOfDay = entry.timeOfDay ?? entry.TimeOfDay ?? entry.time_of_day;
        return Number.isFinite(id) && id > 0
          ? { mealTemplateId: id, timeOfDay: timeOfDay ? String(timeOfDay) : undefined }
          : null;
      }
      const id = Number(item);
      return Number.isFinite(id) && id > 0 ? { mealTemplateId: id } : null;
    })
    .filter((x): x is MealAssignment => !!x);
}

function parseIngredients(json: string) {
  try {
    const parsed = JSON.parse(json) || [];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export default function MealDayPickerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dayKey } = ((location.state || {}) as PickerState);
  const [meals, setMeals] = useState<MealTemplate[]>([]);
  const [dayAssignments, setDayAssignments] = useState<MealAssignment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [slotTiming, setSlotTiming] = useState<string>(((location.state || {}) as PickerState).slotTiming || '');
  const [pickTime, setPickTime] = useState('');
  const [status, setStatus] = useState('');

  const resolvedDayKey = dayKey || new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (loaded) return;
    setLoaded(true);
    Promise.all([
      api.getMealTemplates(),
      api.getWeeklyMealPlan() as Promise<WeeklyMealPlan>,
    ]).then(([data, plan]) => {
      const nextMeals = Array.isArray(data) ? data : [];
      setMeals(nextMeals);

      let map: Record<string, unknown> = {};
      try {
        const raw = plan?.planJson ?? plan?.plan_json;
        map = raw ? JSON.parse(raw) : {};
      } catch {
        map = {};
      }

      setDayAssignments(normalizeAssignments(map?.[resolvedDayKey]));
    });
  }, [loaded]);

  const filtered = useMemo(() => {
    if (!slotTiming) return [];
    let list = meals;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q));
    }
    list = list.filter(m => normalizeTiming(m.timing) === normalizeTiming(slotTiming));
    return list;
  }, [meals, search, slotTiming]);

  const currentSlotMeal = useMemo(() => {
    if (!slotTiming) return null;
    const normalized = normalizeTiming(slotTiming);
    for (const assignment of dayAssignments) {
      const meal = meals.find(m => m.id === Number(assignment.mealTemplateId));
      if (meal && normalizeTiming(meal.timing) === normalized) {
        return meal;
      }
    }
    return null;
  }, [slotTiming, dayAssignments, meals]);

  function pickMeal(meal: MealTemplate) {
    if (!slotTiming) {
      setStatus('Select a timing slot first');
      return;
    }

    const pickedId = Number((meal as any).id ?? (meal as any).mealTemplateId ?? (meal as any).templateId);
    if (!Number.isFinite(pickedId) || pickedId <= 0) {
      setStatus('Invalid meal template selected');
      return;
    }

    if (currentSlotMeal && currentSlotMeal.id !== pickedId) {
      const ok = window.confirm(`Replace ${currentSlotMeal.name} (${slotTiming}) with ${meal.name}?`);
      if (!ok) return;
    }

    const { source } = (location.state || {}) as PickerState;
    navigate('/settings/meals', {
      state: {
        tab: 'weekly',
        source,
        mealPick: {
          dayKey: resolvedDayKey,
          mealTemplateId: pickedId,
          timeOfDay: pickTime.trim() || meal.timeOfDay || undefined,
          slotTiming,
        },
        reloadAt: Date.now(),
      },
    });
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/settings/meals', { state: { tab: 'weekly' } })} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Pick Meal for {resolvedDayKey}</h1>
      </div>

      {status && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ backgroundColor: 'rgba(255,107,107,0.1)', color: 'var(--accent-warm)' }}>
          {status}
        </div>
      )}

      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search meals..."
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        </div>

        <select value={slotTiming} onChange={e => setSlotTiming(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl outline-none mb-2"
          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
          <option value="">Select timing slot...</option>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="pre-workout">Pre-workout</option>
          <option value="post-workout">Post-workout</option>
          <option value="snack">Snack</option>
        </select>

        <input value={pickTime} onChange={e => setPickTime(e.target.value)} placeholder="Override time HH:MM (optional)"
          className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
      </div>

      {slotTiming && (
        <div className="rounded-xl px-3 py-2 mb-3 text-xs"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          {currentSlotMeal
            ? `Current ${slotTiming}: ${currentSlotMeal.name}`
            : `No ${slotTiming} planned yet. Pick one below.`}
        </div>
      )}

      {slotTiming && !TIMING_OPTIONS.includes(slotTiming as typeof TIMING_OPTIONS[number]) && (
        <div className="rounded-xl px-3 py-2 mb-3 text-xs"
          style={{ backgroundColor: 'rgba(255,107,107,0.1)', color: 'var(--accent-warm)' }}>
          Please choose a valid timing slot.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {filtered.map(meal => {
          const totalCalories = parseIngredients(meal.ingredientsJson).reduce((sum, i) => sum + Number(i.caloriesKcal || 0), 0);
          return (
            <button key={meal.id} onClick={() => pickMeal(meal)} className="rounded-xl overflow-hidden text-left" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-full h-24 flex items-center justify-center" style={{ backgroundColor: 'rgba(78, 205, 196, 0.08)' }}>
                {meal.imageUrl ? (
                  <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" />
                ) : (
                  <UtensilsCrossed size={28} style={{ color: 'var(--accent-green)', opacity: 0.65 }} />
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)', whiteSpace: 'normal', wordBreak: 'break-word' }}>{meal.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{meal.timing}{meal.timeOfDay ? ` • ${meal.timeOfDay}` : ''}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--accent-gold)' }}>{Math.round(totalCalories)} kcal</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
