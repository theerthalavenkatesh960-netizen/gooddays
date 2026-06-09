import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import * as api from '../lib/api';
import MacroVisualization from '../components/MacroVisualization';

type Ingredient = {
  id: number;
  name: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  defaultQty?: number;
  defaultUnit?: string;
};

type MealSelection = { ingredientId: number; qty: number; unit: string };

function calcScaled(ing: Ingredient, qty: number) {
  const baseQty = Math.max(0.01, Number(ing.defaultQty || 1));
  const factor = qty / baseQty;
  return {
    caloriesKcal: Number((ing.caloriesKcal * factor).toFixed(2)),
    proteinG: Number((ing.proteinG * factor).toFixed(2)),
    carbsG: Number((ing.carbsG * factor).toFixed(2)),
    fatsG: Number((ing.fatsG * factor).toFixed(2)),
  };
}

export default function MealCreateTemplatePage() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    timing: 'breakfast',
    timeOfDay: '',
    recipe: '',
    imageUrl: '',
    selectedIngredientId: '',
    selectedQty: '',
    selectedIngredients: [] as MealSelection[],
  });

  useEffect(() => { loadIngredients(); }, []);

  async function loadIngredients() {
    const data = await api.getMealIngredients();
    const list: Ingredient[] = (Array.isArray(data) ? data : []).map((i: any) => ({
      ...i,
      defaultQty: Number(i.defaultQty || 1),
      defaultUnit: i.defaultUnit || 'unit',
    }));
    setIngredients(list);
  }

  function addIngredientToMeal() {
    const ingredientId = Number(form.selectedIngredientId);
    const ing = ingredients.find(i => i.id === ingredientId);
    if (!ingredientId || !ing) return;
    const qty = Math.max(0.01, Number(form.selectedQty) || ing.defaultQty || 1);
    const unit = ing.defaultUnit || 'unit';

    setForm(prev => {
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
        selectedIngredients: [...prev.selectedIngredients, { ingredientId, qty, unit }],
      };
    });
  }

  async function saveTemplate() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const snapshots = form.selectedIngredients
        .map(sel => {
          const ing = ingredients.find(i => i.id === sel.ingredientId);
          if (!ing) return null;
          // New format: ingredientId + qty/unit for server-side macro calculation
          // Also store name so MealCard can display ingredient names without extra lookups
          return {
            ingredientId: ing.id,
            name: ing.name,
            qty: sel.qty,
            unit: sel.unit || ing.defaultUnit || 'unit',
          };
        })
        .filter(Boolean);

      await api.createMealTemplate({
        name: form.name.trim(),
        timing: form.timing,
        timeOfDay: form.timeOfDay.trim() || null,
        recipe: form.recipe.trim(),
        imageUrl: form.imageUrl.trim() || null,
        ingredientsJson: JSON.stringify(snapshots),
      });

      navigate('/settings/meals');
    } catch (e: any) {
      setStatus(e?.message || 'Failed to create meal template');
    } finally {
      setSaving(false);
    }
  }

  const nutrition = useMemo(() => {
    return form.selectedIngredients.reduce(
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
  }, [form.selectedIngredients, ingredients]);

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/settings/meals', { state: { tab: 'library' } })} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Create Meal Template</h1>
      </div>

      {status && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs font-semibold" style={{ backgroundColor: 'rgba(255,107,107,0.1)', color: 'var(--accent-warm)' }}>
          {status}
        </div>
      )}

      <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Meal name"
          className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />

        <div className="grid grid-cols-2 gap-2">
          <select value={form.timing} onChange={e => setForm(p => ({ ...p, timing: e.target.value }))}
            className="px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="pre-workout">Pre-workout</option>
            <option value="post-workout">Post-workout</option>
            <option value="snack">Snack</option>
          </select>
          <input type="time" value={form.timeOfDay} onChange={e => setForm(p => ({ ...p, timeOfDay: e.target.value }))}
            className="px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
        </div>

        <input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="Image URL"
            className="px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />

        <div className="grid grid-cols-12 gap-2">
          <select value={form.selectedIngredientId} onChange={e => {
              const id = e.target.value;
              const ing = ingredients.find(i => String(i.id) === id);
              setForm(p => ({ ...p, selectedIngredientId: id, selectedQty: ing ? String(ing.defaultQty ?? 1) : '' }));
            }}
            className="col-span-7 px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
            <option value="">Pick ingredient</option>
            {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.defaultQty} {i.defaultUnit})</option>)}
          </select>

          <input type="number" value={form.selectedQty}
            onChange={e => setForm(p => ({ ...p, selectedQty: e.target.value }))}
            className="col-span-3 px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            placeholder={(() => {
              const ing = ingredients.find(i => String(i.id) === form.selectedIngredientId);
              return ing ? `${ing.defaultQty} ${ing.defaultUnit}` : 'Qty';
            })()} />

          <button onClick={addIngredientToMeal} className="col-span-2 h-10 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: 'var(--accent)' }}>Add</button>
        </div>

        <div className="flex flex-wrap gap-2">
          {form.selectedIngredients.map(row => {
            const ing = ingredients.find(i => i.id === row.ingredientId);
            if (!ing) return null;
            return (
              <button key={row.ingredientId}
                onClick={() => setForm(p => ({ ...p, selectedIngredients: p.selectedIngredients.filter(x => x.ingredientId !== row.ingredientId) }))}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'rgba(108, 99, 255, 0.15)', color: 'var(--accent)' }}>
                {ing.name} ({row.qty} {row.unit}) ×
              </button>
            );
          })}
        </div>

        {form.selectedIngredients.length > 0 && (
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(108, 99, 255, 0.08)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Nutrition Breakdown (qty-based)</p>
            <MacroVisualization macros={{ protein: nutrition.protein, carbs: nutrition.carbs, fats: nutrition.fats }} />
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Total: {Math.round(nutrition.calories)} kcal</p>
          </div>
        )}

        <textarea value={form.recipe} onChange={e => setForm(p => ({ ...p, recipe: e.target.value }))} placeholder="Recipe / steps (optional)"
          rows={4} className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none"
          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />

        <button onClick={saveTemplate} disabled={saving || !form.name.trim()}
          className="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--accent-green)', opacity: saving ? 0.7 : 1 }}>
          <Plus size={14} /> {saving ? 'Saving...' : 'Create Template'}
        </button>
      </div>
    </div>
  );
}
