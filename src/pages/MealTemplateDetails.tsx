import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, UtensilsCrossed } from 'lucide-react';
import * as api from '../lib/api';
import MacroVisualization from '../components/MacroVisualization';

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

export default function MealTemplateDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [meal, setMeal] = useState<MealTemplate | null>(null);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const mealId = Number(id);
    if (!mealId) return;

    const templates = await api.getMealTemplates();
    const list: MealTemplate[] = Array.isArray(templates) ? templates : [];
    setMeal(list.find(m => m.id === mealId) || null);
  }

  const ingredients = useMemo(() => (meal ? parseIngredients(meal.ingredientsJson) : []), [meal]);
  const totals = useMemo(() => ({
    calories: ingredients.reduce((s, i) => s + i.caloriesKcal, 0),
    protein: ingredients.reduce((s, i) => s + i.proteinG, 0),
    carbs: ingredients.reduce((s, i) => s + i.carbsG, 0),
    fats: ingredients.reduce((s, i) => s + i.fatsG, 0),
  }), [ingredients]);

  if (!meal) {
    return (
      <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--surface)' }}>
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
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Meal Detail</h1>
      </div>

      <div className="rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="h-48 flex items-center justify-center" style={{ backgroundColor: 'rgba(78, 205, 196, 0.08)' }}>
          {meal.imageUrl ? (
            <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" />
          ) : (
            <UtensilsCrossed size={42} style={{ color: 'var(--accent-green)' }} />
          )}
        </div>
        <div className="p-4">
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{meal.name}</p>
          <p className="text-sm mt-1 capitalize" style={{ color: 'var(--text-secondary)' }}>{meal.timing}</p>
          <p className="text-xs mt-3" style={{ color: 'var(--accent-gold)' }}>{Math.round(totals.calories)} kcal total</p>
          {(totals.protein + totals.carbs + totals.fats) > 0 && (
            <div className="mt-2"><MacroVisualization macros={{ protein: totals.protein, carbs: totals.carbs, fats: totals.fats }} /></div>
          )}
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs uppercase font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Ingredients</p>
        {ingredients.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No ingredients listed.</p>
        ) : (
          <div className="space-y-2">
            {ingredients.map(ing => (
              <div key={`${ing.id}-${ing.name}`} className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ing.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{ing.qty} {ing.baseUnit}</p>
                </div>
                <p className="text-xs" style={{ color: 'var(--accent-gold)' }}>
                  {Math.round(ing.caloriesKcal)} kcal · {ing.proteinG.toFixed(1)}g P · {ing.carbsG.toFixed(1)}g C · {ing.fatsG.toFixed(1)}g F
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs uppercase font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Recipe</p>
        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
          {meal.recipe?.trim() || 'Recipe not added yet.'}
        </p>
      </div>
    </div>
  );
}
