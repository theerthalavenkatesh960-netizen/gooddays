import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, UtensilsCrossed } from 'lucide-react';
import * as api from '../lib/api';
import MacroVisualization from '../components/MacroVisualization';

type MasterMealTemplate = {
  id: number;
  name: string;
  totalCaloriesKcal: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatsG: number;
  estimatedTotalCost: number;
  plannerNotes?: string | null;
};

type MealTemplate = {
  id: number;
  name: string;
  timing: string;
  timeOfDay?: string;
  ingredientsJson: string;
  recipe: string;
  imageUrl?: string;
  totalCaloriesKcal?: number;
  totalProteinG?: number;
  totalCarbsG?: number;
  totalFatsG?: number;
  masterMealTemplateId?: number | null;
  masterMealTemplate?: MasterMealTemplate | null;
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

function parseIngredients(json: string): IngSnap[] {
  try {
    const parsed = JSON.parse(json) || [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => ({
      id: Number(item.id || item.ingredientId || 0),
      name: String(item.name || ''),
      qty: Number(item.qty ?? 1),
      baseQty: Number(item.baseQty ?? item.qty ?? 1),
      baseUnit: String(item.unit || item.baseUnit || 'serving'),
      caloriesKcal: Number(item.caloriesKcal || 0),
      proteinG: Number(item.proteinG || 0),
      carbsG: Number(item.carbsG || 0),
      fatsG: Number(item.fatsG || 0),
    }));
  } catch {
    return [];
  }
}

export default function MealTemplateDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [meal, setMeal] = useState<MealTemplate | null>(null);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('');
  const [ingredientOptions, setIngredientOptions] = useState<Array<{ id: number; name: string; caloriesKcal: number; proteinG: number; carbsG: number; fatsG: number; defaultQty?: number; defaultUnit?: string }>>([]);
  const [editableIngredients, setEditableIngredients] = useState<IngSnap[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState<number>(0);
  const [pendingQty, setPendingQty] = useState<string>('');
  const [qtyInputValues, setQtyInputValues] = useState<Record<number, string>>({});
  const [form, setForm] = useState({
    name: '',
    timing: 'breakfast',
    timeOfDay: '',
    ingredientsJson: '[]',
    recipe: '',
    imageUrl: '',
  });

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    async function loadIngredients() {
      try {
        const data = await api.getMealIngredients();
        const list = (Array.isArray(data) ? data : []).map((i: any) => ({
          ...i,
          defaultQty: Number(i.defaultQty ?? 1),
          defaultUnit: String(i.defaultUnit || 'unit'),
        }));
        setIngredientOptions(list);
      } catch {
        setIngredientOptions([]);
      }
    }
    loadIngredients();
  }, []);

  useEffect(() => {
    if (!editing) return;
    setForm((prev) => ({ ...prev, ingredientsJson: JSON.stringify(editableIngredients) }));
  }, [editableIngredients, editing]);

  useEffect(() => {
    setQtyInputValues(
      Object.fromEntries(editableIngredients.map(i => [i.id, String(i.qty)]))
    );
  }, [editableIngredients]);

  async function load() {
    const mealId = Number(id);
    if (!mealId) return;

    const templates = await api.getMealTemplates();
    const list: MealTemplate[] = Array.isArray(templates) ? templates : [];
    const found = list.find(m => m.id === mealId) || null;
    setMeal(found);
    if (found) {
      const parsedIngredients = parseIngredients(found.ingredientsJson || '[]');
      setForm({
        name: found.name || '',
        timing: found.timing || 'breakfast',
        timeOfDay: found.timeOfDay || '',
        ingredientsJson: found.ingredientsJson || '[]',
        recipe: found.recipe || '',
        imageUrl: found.imageUrl || '',
      });
      setEditableIngredients(parsedIngredients);
      setSelectedIngredientId(0);
    }
  }

  async function save() {
    if (!meal || !form.name.trim()) return;
    try {
      JSON.parse(form.ingredientsJson || '[]');
    } catch {
      setStatus('Ingredients JSON is invalid');
      return;
    }

    try {
      const updated = await (api as any).updateMealTemplate(meal.id, {
        name: form.name.trim(),
        timing: form.timing,
        timeOfDay: form.timeOfDay.trim() || null,
        ingredientsJson: form.ingredientsJson,
        recipe: form.recipe,
        imageUrl: form.imageUrl.trim() || null,
      });
      setMeal(updated);
      setEditableIngredients(parseIngredients(updated.ingredientsJson || '[]'));
      setEditing(false);
      setStatus('Meal updated');
      setTimeout(() => setStatus(''), 1200);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to update meal');
    }
  }

  const ingredients = useMemo(() => (meal ? parseIngredients(meal.ingredientsJson) : []), [meal]);
  const displayIngredients = useMemo(() => {
    if (ingredients.length === 0) return ingredients;

    const byId = new Map(ingredientOptions.map((i) => [i.id, i]));
    return ingredients.map((ing) => {
      const hasInlineMacros = (ing.caloriesKcal > 0) || (ing.proteinG > 0) || (ing.carbsG > 0) || (ing.fatsG > 0);
      if (hasInlineMacros) return ing;

      const lib = byId.get(ing.id);
      if (!lib) return ing;

      const defaultQty = Math.max(0.01, Number(lib.defaultQty ?? ing.baseQty ?? 1));
      const qty = Math.max(0.01, Number(ing.qty ?? defaultQty));
      const factor = qty / defaultQty;

      return {
        ...ing,
        baseUnit: ing.baseUnit || lib.defaultUnit || 'unit',
        caloriesKcal: Number((Number(lib.caloriesKcal || 0) * factor).toFixed(2)),
        proteinG: Number((Number(lib.proteinG || 0) * factor).toFixed(2)),
        carbsG: Number((Number(lib.carbsG || 0) * factor).toFixed(2)),
        fatsG: Number((Number(lib.fatsG || 0) * factor).toFixed(2)),
      };
    });
  }, [ingredients, ingredientOptions]);

  const totals = useMemo(() => ({
    calories: meal?.totalCaloriesKcal ?? displayIngredients.reduce((s, i) => s + i.caloriesKcal, 0),
    protein: meal?.totalProteinG ?? displayIngredients.reduce((s, i) => s + i.proteinG, 0),
    carbs: meal?.totalCarbsG ?? displayIngredients.reduce((s, i) => s + i.carbsG, 0),
    fats: meal?.totalFatsG ?? displayIngredients.reduce((s, i) => s + i.fatsG, 0),
  }), [displayIngredients, meal]);

  const addIngredient = () => {
    if (!selectedIngredientId) return;
    const chosen = ingredientOptions.find((i) => i.id === selectedIngredientId);
    if (!chosen) return;
    if (editableIngredients.some((i) => i.id === chosen.id)) return;

    const qty = Math.max(0.1, Number(pendingQty) || Number(chosen.defaultQty) || 1);
    setEditableIngredients((prev) => [
      ...prev,
      {
        id: chosen.id,
        name: chosen.name,
        qty,
        baseQty: Number(chosen.defaultQty || 1),
        baseUnit: chosen.defaultUnit || 'unit',
        caloriesKcal: Number(chosen.caloriesKcal || 0),
        proteinG: Number(chosen.proteinG || 0),
        carbsG: Number(chosen.carbsG || 0),
        fatsG: Number(chosen.fatsG || 0),
      },
    ]);
    setSelectedIngredientId(0);
    setPendingQty('');
  };

  const updateIngredientQty = (idToUpdate: number, nextQty: number) => {
    const safeQty = Math.max(0.1, Number(nextQty) || 1);
    setEditableIngredients((prev) => prev.map((i) => (i.id === idToUpdate ? { ...i, qty: safeQty } : i)));
  };

  const removeIngredient = (idToRemove: number) => {
    setEditableIngredients((prev) => prev.filter((i) => i.id !== idToRemove));
  };

  if (!meal) {
    return (
      <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <button onClick={() => navigate('/settings/meals')} className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Meal not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/settings/meals')} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Meal Detail</h1>
          {meal?.masterMealTemplateId && !editing && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
              From catalog
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}>
                Cancel
              </button>
              <button onClick={save} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent-green)' }}>
                Save
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => alert('Publish to master catalog — coming soon!')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}
              >
                Publish
              </button>
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      {editing && meal?.masterMealTemplateId && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
          This meal came from the shared catalog. Saving your changes will detach it — your version will be independent from the original.
        </div>
      )}

      {status && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs font-semibold" style={{ backgroundColor: 'rgba(78,205,196,0.1)', color: 'var(--accent-green)' }}>
          {status}
        </div>
      )}

      <div className="rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="h-48 flex items-center justify-center" style={{ backgroundColor: 'rgba(78, 205, 196, 0.08)' }}>
          {(editing ? form.imageUrl : meal.imageUrl) ? (
            <img src={editing ? form.imageUrl : meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" />
          ) : (
            <UtensilsCrossed size={42} style={{ color: 'var(--accent-green)' }} />
          )}
        </div>
        <div className="p-4">
          {editing ? (
            <div className="space-y-2">
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.timing} onChange={e => setForm(p => ({ ...p, timing: e.target.value }))}
                  className="px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="pre-workout">Pre-workout</option>
                  <option value="post-workout">Post-workout</option>
                  <option value="snack">Snack</option>
                </select>
                <input value={form.timeOfDay} onChange={e => setForm(p => ({ ...p, timeOfDay: e.target.value }))}
                  placeholder="HH:MM" className="px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
              </div>
              <input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
                placeholder="Image URL" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
            </div>
          ) : (
            <>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{meal.name}</p>
              <p className="text-sm mt-1 capitalize" style={{ color: 'var(--text-secondary)' }}>{meal.timing}{meal.timeOfDay ? ` • ${meal.timeOfDay}` : ''}</p>
            </>
          )}
          <p className="text-xs mt-3" style={{ color: 'var(--accent-gold)' }}>{Math.round(totals.calories)} kcal total</p>
          {(totals.protein + totals.carbs + totals.fats) > 0 && (
            <div className="mt-2"><MacroVisualization macros={{ protein: totals.protein, carbs: totals.carbs, fats: totals.fats }} /></div>
          )}
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs uppercase font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Ingredients</p>
        {editing ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedIngredientId || ''}
                onChange={(e) => {
                  const newId = Number(e.target.value || 0);
                  setSelectedIngredientId(newId);
                  const chosen = ingredientOptions.find(i => i.id === newId);
                  setPendingQty(chosen ? String(chosen.defaultQty ?? 1) : '');
                }}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
              >
                <option value="">Select ingredient to add</option>
                {ingredientOptions
                  .filter((opt) => !editableIngredients.some((ing) => ing.id === opt.id))
                  .map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
              </select>
              {selectedIngredientId > 0 && (
                <>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={pendingQty}
                    onChange={(e) => setPendingQty(e.target.value)}
                    placeholder="Qty"
                    className="w-20 px-2.5 py-1.5 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                  />
                  <span className="text-xs flex items-center whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    {ingredientOptions.find(i => i.id === selectedIngredientId)?.defaultUnit || 'unit'}
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={addIngredient}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Add
              </button>
            </div>

            {editableIngredients.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No ingredients added yet.</p>
            ) : (
              editableIngredients.map((ing) => (
                <div key={`${ing.id}-${ing.name}`} className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ing.name}</p>
                    <button
                      type="button"
                      onClick={() => removeIngredient(ing.id)}
                      className="px-2 py-1 rounded-lg text-xs"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--accent-warm)' }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={qtyInputValues[ing.id] ?? String(ing.qty)}
                      onChange={(e) => setQtyInputValues(prev => ({ ...prev, [ing.id]: e.target.value }))}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (val > 0) updateIngredientQty(ing.id, val);
                        else setQtyInputValues(prev => ({ ...prev, [ing.id]: String(ing.qty) }));
                      }}
                      className="w-28 px-2.5 py-1.5 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                    />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{ing.baseUnit}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : ingredients.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No ingredients listed.</p>
        ) : (
          <div className="space-y-2">
            {displayIngredients.map(ing => (
              <div key={`${ing.id}-${ing.name}`} className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ing.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{ing.qty} {ing.baseUnit}</p>
                </div>
                <div className="text-xs flex items-center gap-2 flex-wrap">
                  <span style={{ color: 'var(--accent-gold)' }}>{Math.round(ing.caloriesKcal)} kcal</span>
                  <span style={{ color: '#f87171' }}>{ing.proteinG.toFixed(1)}g P</span>
                  <span style={{ color: '#fbbf24' }}>{ing.carbsG.toFixed(1)}g C</span>
                  <span style={{ color: '#60a5fa' }}>{ing.fatsG.toFixed(1)}g F</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {meal?.masterMealTemplate && (
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs uppercase font-semibold" style={{ color: '#818cf8' }}>From Catalog</p>
            {meal.masterMealTemplate.estimatedTotalCost > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                ₹{meal.masterMealTemplate.estimatedTotalCost.toFixed(0)}
              </span>
            )}
          </div>
          
          {meal.masterMealTemplate.totalCaloriesKcal > 0 && (
            <div className="mb-3 text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <p><span style={{ color: '#fbbf24' }}>Catalog macros:</span> {meal.masterMealTemplate.totalCaloriesKcal} kcal • {meal.masterMealTemplate.totalProteinG.toFixed(1)}g protein • {meal.masterMealTemplate.totalCarbsG.toFixed(1)}g carbs • {meal.masterMealTemplate.totalFatsG.toFixed(1)}g fat</p>
              {totals.calories > 0 && (
                <p style={{ color: 'var(--text-muted)' }}><span style={{ color: 'var(--accent-gold)' }}>Your version:</span> {totals.calories} kcal • {totals.protein.toFixed(1)}g protein • {totals.carbs.toFixed(1)}g carbs • {totals.fats.toFixed(1)}g fat</p>
              )}
            </div>
          )}
          
          {meal.masterMealTemplate.plannerNotes && (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              "{meal.masterMealTemplate.plannerNotes}"
            </p>
          )}
        </div>
      )}

      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs uppercase font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Recipe</p>
        {editing ? (
          <textarea
            value={form.recipe}
            onChange={e => setForm(p => ({ ...p, recipe: e.target.value }))}
            rows={6}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
            {meal.recipe?.trim() || 'Recipe not added yet.'}
          </p>
        )}
      </div>
    </div>
  );
}
