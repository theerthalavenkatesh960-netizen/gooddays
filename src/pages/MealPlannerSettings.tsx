import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Zap, Calendar, BookOpen, X, UtensilsCrossed, Loader2 } from 'lucide-react';
import * as api from '../lib/api';
import MacroVisualization from '../components/MacroVisualization';

type Ingredient = {
  id: number;
  name: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
};

type MealTemplate = {
  id: number;
  name: string;
  timing: string;
  ingredientsJson: string; // JSON array of Ingredient snapshots
  recipe: string;
  imageUrl?: string;
};

// Parsed ingredient snapshot stored inside MealTemplate.ingredientsJson
type IngSnap = { id: number; name: string; caloriesKcal: number; proteinG: number; carbsG: number; fatsG: number };

type MealPlanMap = Record<string, number[]>; // day → meal template IDs

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const TIMING_COLORS: Record<string, string> = {
  'breakfast': 'var(--accent-gold)',
  'lunch': 'var(--accent-green)',
  'dinner': 'var(--accent)',
  'pre-workout': 'var(--accent-warm)',
  'post-workout': '#4ECDC4',
  'snack': 'var(--text-muted)',
};

function parseIngredients(json: string): IngSnap[] {
  try { return JSON.parse(json) || []; } catch { return []; }
}

export default function MealPlannerSettings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'weekly' | 'library'>('weekly');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [meals, setMeals] = useState<MealTemplate[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanMap>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [addingToDay, setAddingToDay] = useState<string | null>(null);
  const [pickMealId, setPickMealId] = useState<number | null>(null);

  const [newIngredient, setNewIngredient] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '' });
  const [newMeal, setNewMeal] = useState({
    name: '',
    timing: 'breakfast',
    recipe: '',
    imageUrl: '',
    selectedIngredientId: '',
    selectedIngredients: [] as Ingredient[],
  });

  const mealMacros = useMemo(() => newMeal.selectedIngredients.reduce(
    (acc, ing) => ({ protein: acc.protein + ing.proteinG, carbs: acc.carbs + ing.carbsG, fats: acc.fats + ing.fatsG }),
    { protein: 0, carbs: 0, fats: 0 }
  ), [newMeal.selectedIngredients]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [ingData, mealData, planData] = await Promise.all([
        api.getMealIngredients(),
        api.getMealTemplates(),
        api.getWeeklyMealPlan(),
      ]);
      setIngredients(Array.isArray(ingData) ? ingData : []);
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

  function flash(msg: string) { setStatus(msg); setTimeout(() => setStatus(''), 2000); }

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
      setIngredients(prev => [...prev, item]);
      setNewIngredient({ name: '', calories: '', protein: '', carbs: '', fats: '' });
      flash('Ingredient added');
    } catch (e: any) { flash(e?.message || 'Failed to add'); }
  }

  async function deleteIngredient(id: number) {
    try {
      await api.deleteMealIngredient(id);
      setIngredients(prev => prev.filter(i => i.id !== id));
    } catch (e: any) { flash(e?.message || 'Failed to delete'); }
  }

  async function addMealTemplate() {
    if (!newMeal.name.trim()) return;
    try {
      const ingredientsJson = JSON.stringify(newMeal.selectedIngredients.map(i => ({
        id: i.id, name: i.name,
        caloriesKcal: i.caloriesKcal, proteinG: i.proteinG, carbsG: i.carbsG, fatsG: i.fatsG,
      })));
      const item = await api.createMealTemplate({
        name: newMeal.name.trim(),
        timing: newMeal.timing,
        recipe: newMeal.recipe.trim(),
        imageUrl: newMeal.imageUrl.trim() || null,
        ingredientsJson,
      });
      setMeals(prev => [...prev, item]);
      setNewMeal({ name: '', timing: 'breakfast', recipe: '', imageUrl: '', selectedIngredientId: '', selectedIngredients: [] });
      flash('Meal saved');
    } catch (e: any) { flash(e?.message || 'Failed to save'); }
  }

  async function deleteMeal(id: number) {
    try {
      await api.deleteMealTemplate(id);
      setMeals(prev => prev.filter(m => m.id !== id));
      // Remove from plan
      const nextPlan: MealPlanMap = {};
      for (const day of DAYS) nextPlan[day] = (mealPlan[day] || []).filter(mid => mid !== id);
      await savePlan(nextPlan);
    } catch (e: any) { flash(e?.message || 'Failed to delete'); }
  }

  async function savePlan(plan: MealPlanMap) {
    try {
      await api.upsertWeeklyMealPlan(JSON.stringify(plan));
      setMealPlan(plan);
    } catch (e: any) { flash(e?.message || 'Failed to save plan'); }
  }

  async function addMealToDay(day: string) {
    if (!pickMealId) return;
    const existing = mealPlan[day] || [];
    if (existing.includes(pickMealId)) { setAddingToDay(null); return; }
    await savePlan({ ...mealPlan, [day]: [...existing, pickMealId] });
    setAddingToDay(null);
  }

  async function removeMealFromDay(day: string, mealId: number) {
    await savePlan({ ...mealPlan, [day]: (mealPlan[day] || []).filter(id => id !== mealId) });
  }

  function addIngredientToMeal() {
    const picked = ingredients.find(i => i.id === Number(newMeal.selectedIngredientId));
    if (!picked || newMeal.selectedIngredients.some(i => i.id === picked.id)) return;
    setNewMeal(p => ({ ...p, selectedIngredients: [...p.selectedIngredients, picked] }));
  }

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
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Meals & Nutrition</h1>
      </div>

      {/* Tabs */}
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

      {/* ── WEEKLY MEAL PLAN TAB ── */}
      {tab === 'weekly' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Weekly Meal Plan</p>

          {DAYS.map(day => {
            const mealIds = mealPlan[day] || [];
            const dayMeals = mealIds.map(id => meals.find(m => m.id === id)).filter((m): m is MealTemplate => !!m);
            const totalCals = dayMeals.reduce((s, m) => s + parseIngredients(m.ingredientsJson).reduce((c, i) => c + i.caloriesKcal, 0), 0);

            return (
              <div key={day} className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{day}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {mealIds.length} meal{mealIds.length !== 1 ? 's' : ''}
                      {totalCals > 0 && <span style={{ color: 'var(--accent-gold)' }}> · {totalCals} kcal</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => { setAddingToDay(day); setPickMealId(meals[0]?.id ?? null); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center press"
                    style={{ backgroundColor: 'rgba(78, 205, 196, 0.15)', color: 'var(--accent-green)' }}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {dayMeals.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {dayMeals.map(meal => {
                      const ings = parseIngredients(meal.ingredientsJson);
                      const total = ings.reduce((s, i) => s + i.caloriesKcal, 0);
                      const macros = { protein: ings.reduce((s, i) => s + i.proteinG, 0), carbs: ings.reduce((s, i) => s + i.carbsG, 0), fats: ings.reduce((s, i) => s + i.fatsG, 0) };
                      return (
                        <div key={meal.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
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
                            <p className="text-[10px] mb-1.5" style={{ color: 'var(--accent-gold)' }}>{total} kcal</p>
                            {(macros.protein + macros.carbs + macros.fats) > 0 && (
                              <div className="mb-1.5"><MacroVisualization macros={macros} compact /></div>
                            )}
                            {ings.length > 0 && <p className="text-[9px] line-clamp-1 mb-1.5" style={{ color: 'var(--text-muted)' }}>{ings.map(i => i.name).join(', ')}</p>}
                            <button onClick={() => removeMealFromDay(day, meal.id)} className="w-full py-1 rounded-lg text-[10px] font-medium press flex items-center justify-center gap-1" style={{ color: 'var(--accent-warm)', backgroundColor: 'var(--surface)' }}>
                              <X size={10} /> Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingToDay(day); setPickMealId(meals[0]?.id ?? null); }}
                    className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-sm press"
                    style={{ border: '1.5px dashed var(--border)', color: 'var(--text-muted)' }}
                  >
                    <Plus size={14} /> Add meals
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MEAL LIBRARY TAB ── */}
      {tab === 'library' && (
        <>
          {/* Ingredient Form */}
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="section-label mb-3">Ingredient Library</p>
            <div className="space-y-2 mb-3">
              <input
                value={newIngredient.name}
                onChange={e => setNewIngredient(p => ({ ...p, name: e.target.value }))}
                placeholder="Ingredient name"
                className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
              />
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'calories', ph: 'Calories (kcal)' },
                  { key: 'protein', ph: 'Protein (g)' },
                  { key: 'carbs', ph: 'Carbs (g)' },
                  { key: 'fats', ph: 'Fats (g)' },
                ].map(({ key, ph }) => (
                  <input key={key} type="number" value={newIngredient[key as keyof typeof newIngredient]} placeholder={ph}
                    onChange={e => setNewIngredient(p => ({ ...p, [key]: e.target.value }))}
                    className="px-3 py-2 text-sm rounded-xl outline-none"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                  />
                ))}
              </div>
              <button onClick={addIngredient} className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--accent)' }}>
                <Plus size={14} /> Add Ingredient
              </button>
            </div>

            <div className="space-y-2">
              {ingredients.map(i => (
                <div key={i.id} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{i.name}</span>
                    <button onClick={() => deleteIngredient(i.id)} className="p-1 rounded-lg press" style={{ color: 'var(--accent-warm)' }}><Trash2 size={14} /></button>
                  </div>
                  <div className="flex items-center gap-3 mb-1.5 text-[10px]">
                    <span style={{ color: 'var(--accent-gold)' }}>{i.caloriesKcal} kcal</span>
                    <span style={{ color: '#FF6B6B' }}>{i.proteinG}g P</span>
                    <span style={{ color: '#FFD93D' }}>{i.carbsG}g C</span>
                    <span style={{ color: '#4ECDC4' }}>{i.fatsG}g F</span>
                  </div>
                  {(i.proteinG + i.carbsG + i.fatsG) > 0 && (
                    <MacroVisualization macros={{ protein: i.proteinG, carbs: i.carbsG, fats: i.fatsG }} compact />
                  )}
                </div>
              ))}
              {ingredients.length === 0 && <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>No ingredients yet.</p>}
            </div>
          </div>

          {/* Meal Template Form */}
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="section-label mb-3">Create Meal Template</p>
            <div className="space-y-3">
              <input value={newMeal.name} onChange={e => setNewMeal(p => ({ ...p, name: e.target.value }))} placeholder="Meal name"
                className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
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

              <div className="flex gap-2">
                <select value={newMeal.selectedIngredientId} onChange={e => setNewMeal(p => ({ ...p, selectedIngredientId: e.target.value }))}
                  className="flex-1 px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
                  <option value="">Pick ingredient</option>
                  {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.caloriesKcal} kcal)</option>)}
                </select>
                <button onClick={addIngredientToMeal} className="h-10 px-3 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: 'var(--accent)' }}>Add</button>
              </div>

              <div className="flex flex-wrap gap-2">
                {newMeal.selectedIngredients.map(i => (
                  <button key={i.id} onClick={() => setNewMeal(p => ({ ...p, selectedIngredients: p.selectedIngredients.filter(x => x.id !== i.id) }))}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium press" style={{ backgroundColor: 'rgba(108, 99, 255, 0.15)', color: 'var(--accent)' }}>
                    {i.name} ×
                  </button>
                ))}
              </div>

              {newMeal.selectedIngredients.length > 0 && (
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(108, 99, 255, 0.08)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Nutrition Breakdown</p>
                  <MacroVisualization macros={mealMacros} />
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    Total: {newMeal.selectedIngredients.reduce((s, i) => s + i.caloriesKcal, 0)} kcal
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

          {/* Saved templates — 2-column cards */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="section-label mb-3">Meal Templates</p>
            {meals.length === 0 ? (
              <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>No meal templates yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {meals.map(meal => {
                  const ings = parseIngredients(meal.ingredientsJson);
                  const total = ings.reduce((s, i) => s + i.caloriesKcal, 0);
                  const macros = { protein: ings.reduce((s, i) => s + i.proteinG, 0), carbs: ings.reduce((s, i) => s + i.carbsG, 0), fats: ings.reduce((s, i) => s + i.fatsG, 0) };
                  return (
                    <div key={meal.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                      <div className="w-full h-24 flex items-center justify-center relative" style={{ backgroundColor: 'rgba(78, 205, 196, 0.07)' }}>
                        {meal.imageUrl ? <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" /> : <UtensilsCrossed size={28} style={{ color: 'var(--accent-green)', opacity: 0.5 }} />}
                        <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: TIMING_COLORS[meal.timing] || '#fff' }}>
                          {meal.timing}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold line-clamp-1 mb-0.5" style={{ color: 'var(--text-primary)' }}>{meal.name}</p>
                        <p className="text-[10px] mb-1.5" style={{ color: 'var(--accent-gold)' }}>{total} kcal</p>
                        {(macros.protein + macros.carbs + macros.fats) > 0 && <div className="mb-1.5"><MacroVisualization macros={macros} compact /></div>}
                        {ings.length > 0 && <p className="text-[9px] line-clamp-1 mb-1.5" style={{ color: 'var(--text-muted)' }}>{ings.map(i => i.name).join(', ')}</p>}
                        {meal.recipe && <p className="text-[9px] line-clamp-1 mb-1.5" style={{ color: 'var(--text-secondary)' }}><Zap size={8} className="inline" /> {meal.recipe}</p>}
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

      {/* ── ADD MEAL TO DAY BOTTOM SHEET ── */}
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
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                    <div className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'rgba(78, 205, 196, 0.1)' }}>
                      {pickedMeal.imageUrl ? <img src={pickedMeal.imageUrl} alt={pickedMeal.name} className="w-full h-full object-cover" /> : <UtensilsCrossed size={22} style={{ color: 'var(--accent-green)' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{pickedMeal.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{pickedMeal.timing} · {total} kcal</p>
                      {ings.length > 0 && <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{ings.map(i => i.name).join(', ')}</p>}
                    </div>
                  </div>
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
