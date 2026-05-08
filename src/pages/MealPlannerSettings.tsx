import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Zap, Calendar, BookOpen, X, UtensilsCrossed, Loader2, ChevronDown, ChevronUp, Filter, Search } from 'lucide-react';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import * as api from '../lib/api';
import MacroVisualization from '../components/MacroVisualization';

type Ingredient = {
  id: number;
  name: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  baseQty?: number;
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
};

type MealPlanMap = Record<string, number[]>;

type MealSelection = { ingredientId: number; qty: number };

const TIMING_COLORS: Record<string, string> = {
  breakfast: 'var(--accent-gold)',
  lunch: 'var(--accent-green)',
  dinner: 'var(--accent)',
  'pre-workout': 'var(--accent-warm)',
  'post-workout': '#4ECDC4',
  snack: 'var(--text-muted)',
};

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
    }));
  } catch {
    return [];
  }
}

function toDayKey(date: Date) {
  return format(date, 'EEEE').toLowerCase();
}

function calcScaled(ing: Ingredient, qty: number) {
  const baseQty = Math.max(1, Number(ing.baseQty || 100));
  const factor = qty / baseQty;
  return {
    caloriesKcal: Number((ing.caloriesKcal * factor).toFixed(2)),
    proteinG: Number((ing.proteinG * factor).toFixed(2)),
    carbsG: Number((ing.carbsG * factor).toFixed(2)),
    fatsG: Number((ing.fatsG * factor).toFixed(2)),
  };
}

export default function MealPlannerSettings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'weekly' | 'library'>('weekly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [meals, setMeals] = useState<MealTemplate[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanMap>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [addingToDay, setAddingToDay] = useState<string | null>(null);
  const [pickMealId, setPickMealId] = useState<number | null>(null);
  const [showIngredients, setShowIngredients] = useState(false);
  const [showIngredientFilters, setShowIngredientFilters] = useState(false);
  const [showMealFilters, setShowMealFilters] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [ingredientMacroFocus, setIngredientMacroFocus] = useState<'all' | 'protein' | 'carbs' | 'fats'>('all');
  const [mealSearch, setMealSearch] = useState('');
  const [mealTimingFilter, setMealTimingFilter] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'pre-workout' | 'post-workout' | 'snack'>('all');

  const [newIngredient, setNewIngredient] = useState({
    name: '', calories: '', protein: '', carbs: '', fats: '', baseQty: '100', baseUnit: 'g',
  });

  const [newMeal, setNewMeal] = useState({
    name: '',
    timing: 'breakfast',
    recipe: '',
    imageUrl: '',
    selectedIngredientId: '',
    selectedQty: '100',
    selectedIngredients: [] as MealSelection[],
  });

  const selectedDay = toDayKey(selectedDate);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [ingData, mealData, planData] = await Promise.all([
        api.getMealIngredients(),
        api.getMealTemplates(),
        api.getWeeklyMealPlan(),
      ]);

      const ingList: Ingredient[] = (Array.isArray(ingData) ? ingData : []).map((i: any) => ({
        ...i,
        baseQty: Number(i.baseQty || 100),
        baseUnit: i.baseUnit || 'g',
      }));

      setIngredients(ingList);
      setMeals(Array.isArray(mealData) ? mealData : []);
      if (planData?.planJson) {
        try { setMealPlan(JSON.parse(planData.planJson) || {}); } catch { setMealPlan({}); }
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

  async function addIngredient() {
    if (!newIngredient.name.trim()) return;
    try {
      const item = await api.createMealIngredient({
        name: newIngredient.name.trim(),
        caloriesKcal: Math.max(0, Number(newIngredient.calories) || 0),
        proteinG: Math.max(0, Number(newIngredient.protein) || 0),
        carbsG: Math.max(0, Number(newIngredient.carbs) || 0),
        fatsG: Math.max(0, Number(newIngredient.fats) || 0),
      });

      setIngredients(prev => [
        ...prev,
        {
          ...item,
          baseQty: Math.max(1, Number(newIngredient.baseQty) || 100),
          baseUnit: newIngredient.baseUnit || 'g',
        },
      ]);

      setNewIngredient({ name: '', calories: '', protein: '', carbs: '', fats: '', baseQty: '100', baseUnit: 'g' });
      flash('Ingredient added');
    } catch (e: any) {
      flash(e?.message || 'Failed to add');
    }
  }

  async function deleteIngredient(id: number) {
    try {
      await api.deleteMealIngredient(id);
      setIngredients(prev => prev.filter(i => i.id !== id));
    } catch (e: any) {
      flash(e?.message || 'Failed to delete');
    }
  }

  function addIngredientToMeal() {
    const ingredientId = Number(newMeal.selectedIngredientId);
    const qty = Math.max(1, Number(newMeal.selectedQty) || 1);
    if (!ingredientId) return;

    setNewMeal(prev => {
      const existing = prev.selectedIngredients.find(x => x.ingredientId === ingredientId);
      if (existing) {
        return {
          ...prev,
          selectedIngredients: prev.selectedIngredients.map(x =>
            x.ingredientId === ingredientId ? { ...x, qty: x.qty + qty } : x
          ),
        };
      }

      return {
        ...prev,
        selectedIngredients: [...prev.selectedIngredients, { ingredientId, qty }],
      };
    });
  }

  async function addMealTemplate() {
    if (!newMeal.name.trim()) return;

    try {
      const snapshots: IngSnap[] = newMeal.selectedIngredients
        .map(sel => {
          const ing = ingredients.find(i => i.id === sel.ingredientId);
          if (!ing) return null;
          const scaled = calcScaled(ing, sel.qty);
          return {
            id: ing.id,
            name: ing.name,
            qty: sel.qty,
            baseQty: Number(ing.baseQty || 100),
            baseUnit: ing.baseUnit || 'g',
            ...scaled,
          };
        })
        .filter((x): x is IngSnap => !!x);

      const item = await api.createMealTemplate({
        name: newMeal.name.trim(),
        timing: newMeal.timing,
        recipe: newMeal.recipe.trim(),
        imageUrl: newMeal.imageUrl.trim() || null,
        ingredientsJson: JSON.stringify(snapshots),
      });

      setMeals(prev => [...prev, item]);
      setNewMeal({
        name: '', timing: 'breakfast', recipe: '', imageUrl: '', selectedIngredientId: '', selectedQty: '100', selectedIngredients: [],
      });
      flash('Meal saved');
    } catch (e: any) {
      flash(e?.message || 'Failed to save');
    }
  }

  async function deleteMeal(id: number) {
    try {
      await api.deleteMealTemplate(id);
      setMeals(prev => prev.filter(m => m.id !== id));

      const nextPlan: MealPlanMap = {};
      for (const key of Object.keys(mealPlan)) {
        nextPlan[key] = (mealPlan[key] || []).filter(mid => mid !== id);
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

  async function addMealToDay(day: string) {
    if (!pickMealId) return;
    const existing = mealPlan[day] || [];
    if (existing.includes(pickMealId)) {
      setAddingToDay(null);
      return;
    }
    await savePlan({ ...mealPlan, [day]: [...existing, pickMealId] });
    setAddingToDay(null);
  }

  async function removeMealFromDay(day: string, mealId: number) {
    await savePlan({ ...mealPlan, [day]: (mealPlan[day] || []).filter(id => id !== mealId) });
  }

  const selectedMeals = useMemo(() => {
    const ids = mealPlan[selectedDay] || [];
    return ids.map(id => meals.find(m => m.id === id)).filter((m): m is MealTemplate => !!m);
  }, [mealPlan, meals, selectedDay]);

  const filteredIngredients = useMemo(() => {
    let list = ingredients;
    if (ingredientSearch.trim()) {
      const q = ingredientSearch.trim().toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q));
    }
    if (ingredientMacroFocus === 'protein') {
      list = list.filter(i => i.proteinG >= i.carbsG && i.proteinG >= i.fatsG);
    } else if (ingredientMacroFocus === 'carbs') {
      list = list.filter(i => i.carbsG >= i.proteinG && i.carbsG >= i.fatsG);
    } else if (ingredientMacroFocus === 'fats') {
      list = list.filter(i => i.fatsG >= i.proteinG && i.fatsG >= i.carbsG);
    }
    return list;
  }, [ingredients, ingredientSearch, ingredientMacroFocus]);

  const filteredMeals = useMemo(() => {
    let list = meals;
    if (mealSearch.trim()) {
      const q = mealSearch.trim().toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q));
    }
    if (mealTimingFilter !== 'all') {
      list = list.filter(m => m.timing === mealTimingFilter);
    }
    return list;
  }, [meals, mealSearch, mealTimingFilter]);

  const selectedDayCalories = selectedMeals.reduce((sum, meal) => {
    const ingredientsForMeal = parseIngredients(meal.ingredientsJson);
    return sum + ingredientsForMeal.reduce((a, i) => a + i.caloriesKcal, 0);
  }, 0);

  const selectedMealDraftMacros = useMemo(() => {
    return newMeal.selectedIngredients.reduce(
      (acc, row) => {
        const ing = ingredients.find(x => x.id === row.ingredientId);
        if (!ing) return acc;
        const scaled = calcScaled(ing, row.qty);
        return {
          protein: acc.protein + scaled.proteinG,
          carbs: acc.carbs + scaled.carbsG,
          fats: acc.fats + scaled.fatsG,
          calories: acc.calories + scaled.caloriesKcal,
        };
      },
      { protein: 0, carbs: 0, fats: 0, calories: 0 }
    );
  }, [newMeal.selectedIngredients, ingredients]);

  const pickedMeal = meals.find(m => m.id === pickMealId) ?? null;

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

      <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }}>
        <button
          onClick={() => setTab('weekly')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all press"
          style={{ backgroundColor: tab === 'weekly' ? 'var(--accent-green)' : 'transparent', color: tab === 'weekly' ? '#fff' : 'var(--text-muted)' }}
        >
          <Calendar size={15} /> Weekly Meals
        </button>
        <button
          onClick={() => setTab('library')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all press"
          style={{ backgroundColor: tab === 'library' ? 'var(--accent-green)' : 'transparent', color: tab === 'library' ? '#fff' : 'var(--text-muted)' }}
        >
          <BookOpen size={15} /> Meal Library
        </button>
      </div>

      {status && (
        <div
          className="mb-3 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{
            backgroundColor: status.toLowerCase().includes('fail') || status.toLowerCase().includes('error')
              ? 'rgba(255,107,107,0.1)' : 'rgba(78, 205, 196, 0.1)',
            color: status.toLowerCase().includes('fail') || status.toLowerCase().includes('error')
              ? 'var(--accent-warm)' : 'var(--accent-green)',
          }}
        >
          {status}
        </div>
      )}

      {tab === 'weekly' && (
        <div className="space-y-3">
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{format(selectedDate, 'EEEE, MMM d')}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>◀ Week</button>
                <button onClick={() => setSelectedDate(new Date())} className="px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Today</button>
                <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Week ▶</button>
              </div>
            </div>

            <div className="overflow-x-auto mb-4">
              <div className="flex gap-1.5 pb-1.5">
                {Array.from({ length: 7 }).map((_, i) => {
                  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
                  const d = addDays(weekStart, i);
                  const active = isSameDay(d, selectedDate);
                  const key = toDayKey(d);
                  return (
                    <button
                      key={d.toISOString()}
                      onClick={() => setSelectedDate(d)}
                      className="min-w-[64px] px-2 py-2 rounded-lg text-center border"
                      style={{
                        backgroundColor: active ? 'var(--accent-green)' : 'var(--surface-elevated)',
                        color: active ? '#fff' : 'var(--text-secondary)',
                        borderColor: active ? 'var(--accent-green)' : 'var(--border)',
                      }}
                    >
                      <div className="text-[11px]">{format(d, 'EEE')}</div>
                      <div className="font-semibold text-sm">{format(d, 'd')}</div>
                      <div className="text-[10px] opacity-80">{(mealPlan[key] || []).length}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{selectedDay}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {selectedMeals.length} meal{selectedMeals.length !== 1 ? 's' : ''}
                  {selectedDayCalories > 0 && <span style={{ color: 'var(--accent-gold)' }}> · {Math.round(selectedDayCalories)} kcal</span>}
                </p>
              </div>
              <button
                onClick={() => { setAddingToDay(selectedDay); setPickMealId(meals[0]?.id ?? null); }}
                className="w-8 h-8 rounded-xl flex items-center justify-center press"
                style={{ backgroundColor: 'rgba(78, 205, 196, 0.15)', color: 'var(--accent-green)' }}
              >
                <Plus size={16} />
              </button>
            </div>

            {selectedMeals.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {selectedMeals.map(meal => {
                  const ings = parseIngredients(meal.ingredientsJson);
                  const total = ings.reduce((s, i) => s + i.caloriesKcal, 0);
                  const macros = {
                    protein: ings.reduce((s, i) => s + i.proteinG, 0),
                    carbs: ings.reduce((s, i) => s + i.carbsG, 0),
                    fats: ings.reduce((s, i) => s + i.fatsG, 0),
                  };
                  return (
                    <div key={meal.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                      <button onClick={() => navigate(`/settings/meals/template/${meal.id}`)} className="w-full text-left">
                        <div className="w-full h-24 flex items-center justify-center relative" style={{ backgroundColor: 'rgba(78, 205, 196, 0.07)' }}>
                          {meal.imageUrl
                            ? <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" />
                            : <UtensilsCrossed size={28} style={{ color: 'var(--accent-green)', opacity: 0.5 }} />
                          }
                          <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: TIMING_COLORS[meal.timing] || '#fff' }}>
                            {meal.timing}
                          </span>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold line-clamp-1 mb-0.5" style={{ color: 'var(--text-primary)' }}>{meal.name}</p>
                          <p className="text-[10px] mb-1.5" style={{ color: 'var(--accent-gold)' }}>{Math.round(total)} kcal</p>
                          {(macros.protein + macros.carbs + macros.fats) > 0 && (
                            <div className="mb-1.5"><MacroVisualization macros={macros} compact /></div>
                          )}
                        </div>
                      </button>
                      <div className="px-2.5 pb-2.5">
                        <button onClick={() => removeMealFromDay(selectedDay, meal.id)} className="w-full py-1 rounded-lg text-[10px] font-medium press flex items-center justify-center gap-1" style={{ color: 'var(--accent-warm)', backgroundColor: 'var(--surface)' }}>
                          <X size={10} /> Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <button
                onClick={() => { setAddingToDay(selectedDay); setPickMealId(meals[0]?.id ?? null); }}
                className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-sm press"
                style={{ border: '1.5px dashed var(--border)', color: 'var(--text-muted)' }}
              >
                <Plus size={14} /> Add meals for {selectedDay}
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'library' && (
        <>
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setShowIngredients(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            >
              <span className="text-sm font-semibold">Ingredient Library</span>
              {showIngredients ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showIngredients && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Ingredient List</p>
                  <button
                    onClick={() => setShowIngredientFilters(v => !v)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center press"
                    style={{
                      backgroundColor: showIngredientFilters ? 'var(--accent)' : 'var(--surface-elevated)',
                      color: showIngredientFilters ? '#fff' : 'var(--text-secondary)',
                    }}
                    title="Toggle ingredient filters"
                  >
                    <Filter size={14} />
                  </button>
                </div>

                {showIngredientFilters && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                      <Search size={16} style={{ color: 'var(--text-muted)' }} />
                      <input
                        value={ingredientSearch}
                        onChange={e => setIngredientSearch(e.target.value)}
                        placeholder="Search ingredients..."
                        className="flex-1 bg-transparent text-sm outline-none"
                        style={{ color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: 'all', label: 'All' },
                        { key: 'protein', label: 'Protein+' },
                        { key: 'carbs', label: 'Carbs+' },
                        { key: 'fats', label: 'Fats+' },
                      ].map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setIngredientMacroFocus(opt.key as any)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium press"
                          style={{
                            backgroundColor: ingredientMacroFocus === opt.key ? 'var(--accent)' : 'var(--surface-elevated)',
                            color: ingredientMacroFocus === opt.key ? '#fff' : 'var(--text-muted)',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <input
                    value={newIngredient.name}
                    onChange={e => setNewIngredient(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ingredient name"
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    {[{ key: 'calories', ph: 'Calories (kcal)' }, { key: 'protein', ph: 'Protein (g)' }, { key: 'carbs', ph: 'Carbs (g)' }, { key: 'fats', ph: 'Fats (g)' }].map(({ key, ph }) => (
                      <input
                        key={key}
                        type="number"
                        value={newIngredient[key as keyof typeof newIngredient]}
                        placeholder={ph}
                        onChange={e => setNewIngredient(p => ({ ...p, [key]: e.target.value }))}
                        className="px-3 py-2 text-sm rounded-xl outline-none"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={newIngredient.baseQty}
                      onChange={e => setNewIngredient(p => ({ ...p, baseQty: e.target.value }))}
                      placeholder="Base qty"
                      className="px-3 py-2 text-sm rounded-xl outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                    <input
                      value={newIngredient.baseUnit}
                      onChange={e => setNewIngredient(p => ({ ...p, baseUnit: e.target.value }))}
                      placeholder="Unit (g, ml, serving)"
                      className="px-3 py-2 text-sm rounded-xl outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <button onClick={addIngredient} className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--accent)' }}>
                    <Plus size={14} /> Add Ingredient
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredIngredients.map(i => (
                    <div key={i.id} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{i.name}</span>
                        <button onClick={() => deleteIngredient(i.id)} className="p-1 rounded-lg press" style={{ color: 'var(--accent-warm)' }}><Trash2 size={14} /></button>
                      </div>
                      <p className="text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                        per {Number(i.baseQty || 100)} {i.baseUnit || 'g'}
                      </p>
                      <div className="flex items-center gap-3 mb-1.5 text-[10px]">
                        <span style={{ color: 'var(--accent-gold)' }}>{i.caloriesKcal} kcal</span>
                        <span style={{ color: '#FF6B6B' }}>{i.proteinG}g P</span>
                        <span style={{ color: '#FFD93D' }}>{i.carbsG}g C</span>
                        <span style={{ color: '#4ECDC4' }}>{i.fatsG}g F</span>
                      </div>
                    </div>
                  ))}
                  {filteredIngredients.length === 0 && <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>No ingredients match the current filters.</p>}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="section-label mb-3">Create Meal Template</p>
            <div className="space-y-3">
              <input
                value={newMeal.name}
                onChange={e => setNewMeal(p => ({ ...p, name: e.target.value }))}
                placeholder="Meal name"
                className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
              />

              <div className="grid grid-cols-2 gap-2">
                <select value={newMeal.timing} onChange={e => setNewMeal(p => ({ ...p, timing: e.target.value }))}
                  className="px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="pre-workout">Pre-workout</option>
                  <option value="post-workout">Post-workout</option>
                  <option value="snack">Snack</option>
                </select>
                <input value={newMeal.imageUrl} onChange={e => setNewMeal(p => ({ ...p, imageUrl: e.target.value }))} placeholder="Image URL"
                  className="px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
              </div>

              <div className="grid grid-cols-12 gap-2">
                <select
                  value={newMeal.selectedIngredientId}
                  onChange={e => setNewMeal(p => ({ ...p, selectedIngredientId: e.target.value }))}
                  className="col-span-7 px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                >
                  <option value="">Pick ingredient</option>
                  {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>

                <input
                  type="number"
                  value={newMeal.selectedQty}
                  onChange={e => setNewMeal(p => ({ ...p, selectedQty: e.target.value }))}
                  className="col-span-3 px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                  placeholder="Qty"
                />

                <button onClick={addIngredientToMeal} className="col-span-2 h-10 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: 'var(--accent)' }}>Add</button>
              </div>

              <div className="flex flex-wrap gap-2">
                {newMeal.selectedIngredients.map(row => {
                  const ing = ingredients.find(i => i.id === row.ingredientId);
                  if (!ing) return null;
                  return (
                    <button
                      key={row.ingredientId}
                      onClick={() => setNewMeal(p => ({ ...p, selectedIngredients: p.selectedIngredients.filter(x => x.ingredientId !== row.ingredientId) }))}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium press"
                      style={{ backgroundColor: 'rgba(108, 99, 255, 0.15)', color: 'var(--accent)' }}
                    >
                      {ing.name} ({row.qty}{ing.baseUnit || 'g'}) ×
                    </button>
                  );
                })}
              </div>

              {newMeal.selectedIngredients.length > 0 && (
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(108, 99, 255, 0.08)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Nutrition Breakdown (qty-based)</p>
                  <MacroVisualization macros={{ protein: selectedMealDraftMacros.protein, carbs: selectedMealDraftMacros.carbs, fats: selectedMealDraftMacros.fats }} />
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    Total: {Math.round(selectedMealDraftMacros.calories)} kcal
                  </p>
                </div>
              )}

              <textarea value={newMeal.recipe} onChange={e => setNewMeal(p => ({ ...p, recipe: e.target.value }))} placeholder="Recipe / steps (optional)"
                className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} rows={3} />

              <button onClick={addMealTemplate} className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--accent-green)' }}>
                <Plus size={14} /> Save Meal Template
              </button>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="section-label">Meal Templates</p>
              <button
                onClick={() => setShowMealFilters(v => !v)}
                className="w-8 h-8 rounded-lg flex items-center justify-center press"
                style={{
                  backgroundColor: showMealFilters ? 'var(--accent-green)' : 'var(--surface-elevated)',
                  color: showMealFilters ? '#fff' : 'var(--text-secondary)',
                }}
                title="Toggle meal filters"
              >
                <Filter size={14} />
              </button>
            </div>

            {showMealFilters && (
              <div className="mb-3 space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <Search size={16} style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={mealSearch}
                    onChange={e => setMealSearch(e.target.value)}
                    placeholder="Search meals..."
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
                <select
                  value={mealTimingFilter}
                  onChange={e => setMealTimingFilter(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                >
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
                          <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: TIMING_COLORS[meal.timing] || '#fff' }}>
                            {meal.timing}
                          </span>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold line-clamp-1 mb-0.5" style={{ color: 'var(--text-primary)' }}>{meal.name}</p>
                          <p className="text-[10px] mb-1.5" style={{ color: 'var(--accent-gold)' }}>{Math.round(total)} kcal</p>
                          {(macros.protein + macros.carbs + macros.fats) > 0 && <div className="mb-1.5"><MacroVisualization macros={macros} compact /></div>}
                          {ings.length > 0 && <p className="text-[9px] line-clamp-1 mb-1.5" style={{ color: 'var(--text-muted)' }}>{ings.map(i => `${i.name} (${i.qty}${i.baseUnit})`).join(', ')}</p>}
                          {meal.recipe && <p className="text-[9px] line-clamp-1 mb-1.5" style={{ color: 'var(--text-secondary)' }}><Zap size={8} className="inline" /> {meal.recipe}</p>}
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

      {addingToDay && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setAddingToDay(null); }}
        >
          <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
                Add meal to <span style={{ color: 'var(--accent-green)' }}>{addingToDay}</span>
              </p>
              <button onClick={() => setAddingToDay(null)} className="w-8 h-8 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <X size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            <div className="space-y-3">
              <select value={pickMealId ?? ''} onChange={e => setPickMealId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
                <option value="">Select meal</option>
                {meals.map(m => <option key={m.id} value={m.id}>{m.name} ({m.timing})</option>)}
              </select>

              {pickedMeal && (() => {
                const ings = parseIngredients(pickedMeal.ingredientsJson);
                const total = ings.reduce((s, i) => s + i.caloriesKcal, 0);
                return (
                  <button
                    onClick={() => navigate(`/settings/meals/template/${pickedMeal.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
                    style={{ backgroundColor: 'var(--surface-elevated)' }}
                  >
                    <div className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'rgba(78, 205, 196, 0.1)' }}>
                      {pickedMeal.imageUrl ? <img src={pickedMeal.imageUrl} alt={pickedMeal.name} className="w-full h-full object-cover" /> : <UtensilsCrossed size={22} style={{ color: 'var(--accent-green)' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{pickedMeal.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{pickedMeal.timing} · {Math.round(total)} kcal</p>
                      {ings.length > 0 && <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{ings.map(i => `${i.name} (${i.qty}${i.baseUnit})`).join(', ')}</p>}
                    </div>
                  </button>
                );
              })()}

              <button
                onClick={() => addingToDay && addMealToDay(addingToDay)}
                disabled={!pickMealId}
                className="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: pickMealId ? 'var(--accent-green)' : 'var(--border)', opacity: pickMealId ? 1 : 0.6 }}
              >
                <Plus size={14} /> Add to {addingToDay}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
