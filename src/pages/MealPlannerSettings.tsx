import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Zap } from 'lucide-react';
import MacroVisualization from '../components/MacroVisualization';

type Ingredient = { id: string; name: string; calories: number; protein?: number; carbs?: number; fats?: number };
type Meal = {
  id: string;
  name: string;
  timing: 'pre-workout' | 'post-workout' | 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: Ingredient[];
  recipe: string;
};

const INGREDIENTS_KEY = 'gd.ingredients';
const MEALS_KEY = 'gd.mealTemplates';

export default function MealPlannerSettings() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);

  const [newIngredient, setNewIngredient] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '' });
  const [newMeal, setNewMeal] = useState({
    name: '',
    timing: 'pre-workout' as Meal['timing'],
    recipe: '',
    selectedIngredientId: '',
    selectedIngredients: [] as Ingredient[],
  });

  const mealMacros = useMemo(() => {
    return newMeal.selectedIngredients.reduce(
      (acc, ing) => ({
        protein: acc.protein + (ing.protein || 0),
        carbs: acc.carbs + (ing.carbs || 0),
        fats: acc.fats + (ing.fats || 0),
      }),
      { protein: 0, carbs: 0, fats: 0 }
    );
  }, [newMeal.selectedIngredients]);

  useEffect(() => {
    const rawIng = localStorage.getItem(INGREDIENTS_KEY);
    const rawMeals = localStorage.getItem(MEALS_KEY);
    if (rawIng) {
      try { setIngredients(JSON.parse(rawIng)); } catch {}
    }
    if (rawMeals) {
      try { setMeals(JSON.parse(rawMeals)); } catch {}
    }
  }, []);

  function persist(nextIng: Ingredient[], nextMeals: Meal[]) {
    setIngredients(nextIng);
    setMeals(nextMeals);
    localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(nextIng));
    localStorage.setItem(MEALS_KEY, JSON.stringify(nextMeals));
  }

  function addIngredient() {
    if (!newIngredient.name.trim()) return;
    const item: Ingredient = {
      id: Date.now().toString(),
      name: newIngredient.name.trim(),
      calories: Math.max(0, Number(newIngredient.calories) || 0),
      protein: Math.max(0, Number(newIngredient.protein) || 0),
      carbs: Math.max(0, Number(newIngredient.carbs) || 0),
      fats: Math.max(0, Number(newIngredient.fats) || 0),
    };
    const next = [...ingredients, item];
    persist(next, meals);
    setNewIngredient({ name: '', calories: '', protein: '', carbs: '', fats: '' });
  }

  function deleteIngredient(id: string) {
    const nextIng = ingredients.filter(i => i.id !== id);
    const nextMeals = meals.map(m => ({ ...m, ingredients: m.ingredients.filter(i => i.id !== id) }));
    persist(nextIng, nextMeals);
  }

  function addIngredientToMeal() {
    const picked = ingredients.find(i => i.id === newMeal.selectedIngredientId);
    if (!picked) return;
    if (newMeal.selectedIngredients.some(i => i.id === picked.id)) return;
    setNewMeal(p => ({ ...p, selectedIngredients: [...p.selectedIngredients, picked] }));
  }

  function removeSelectedIngredient(id: string) {
    setNewMeal(p => ({ ...p, selectedIngredients: p.selectedIngredients.filter(i => i.id !== id) }));
  }

  function addMealTemplate() {
    if (!newMeal.name.trim()) return;
    const item: Meal = {
      id: Date.now().toString(),
      name: newMeal.name.trim(),
      timing: newMeal.timing,
      ingredients: newMeal.selectedIngredients,
      recipe: newMeal.recipe.trim(),
    };
    const nextMeals = [...meals, item];
    persist(ingredients, nextMeals);
    setNewMeal({
      name: '',
      timing: 'pre-workout',
      recipe: '',
      selectedIngredientId: '',
      selectedIngredients: [],
    });
  }

  function deleteMeal(id: string) {
    const next = meals.filter(m => m.id !== id);
    persist(ingredients, next);
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Meals & Recipes</h1>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="section-label mb-3">Ingredient Library</p>
        <div className="space-y-2 mb-3">
          <input
            value={newIngredient.name}
            onChange={(e) => setNewIngredient(p => ({ ...p, name: e.target.value }))}
            placeholder="Ingredient name"
            className="w-full px-3 py-2 text-sm rounded-xl outline-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={newIngredient.calories}
              onChange={(e) => setNewIngredient(p => ({ ...p, calories: e.target.value }))}
              placeholder="Calories"
              className="px-3 py-2 text-sm rounded-xl outline-none"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
            <input
              value={newIngredient.protein}
              onChange={(e) => setNewIngredient(p => ({ ...p, protein: e.target.value }))}
              placeholder="Protein (g)"
              className="px-3 py-2 text-sm rounded-xl outline-none"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={newIngredient.carbs}
              onChange={(e) => setNewIngredient(p => ({ ...p, carbs: e.target.value }))}
              placeholder="Carbs (g)"
              className="px-3 py-2 text-sm rounded-xl outline-none"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
            <input
              value={newIngredient.fats}
              onChange={(e) => setNewIngredient(p => ({ ...p, fats: e.target.value }))}
              placeholder="Fats (g)"
              className="px-3 py-2 text-sm rounded-xl outline-none"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
          </div>
          <button onClick={addIngredient} className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--accent)' }}>
            <Plus size={14} /> Add Ingredient
          </button>
        </div>

        <div className="space-y-2">
          {ingredients.map(i => (
            <div key={i.id} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{i.name}</span>
                <button onClick={() => deleteIngredient(i.id)} className="p-1 rounded-lg press" style={{ color: 'var(--accent-warm)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{i.calories} kcal</span>
                <span style={{ color: '#FF6B6B' }}>{i.protein}g P</span>
                <span style={{ color: '#FFD93D' }}>{i.carbs}g C</span>
                <span style={{ color: '#4ECDC4' }}>{i.fats}g F</span>
              </div>
              {(i.protein || i.carbs || i.fats) && (
                <MacroVisualization macros={{ protein: i.protein || 0, carbs: i.carbs || 0, fats: i.fats || 0 }} compact />
              )}
            </div>
          ))}
          {ingredients.length === 0 && <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>No ingredients yet.</p>}
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="section-label mb-3">Create Meal Template</p>
        <div className="space-y-3">
          <input
            value={newMeal.name}
            onChange={(e) => setNewMeal(p => ({ ...p, name: e.target.value }))}
            placeholder="Meal name"
            className="w-full px-3 py-2 text-sm rounded-xl outline-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <select
            value={newMeal.timing}
            onChange={(e) => setNewMeal(p => ({ ...p, timing: e.target.value as Meal['timing'] }))}
            className="w-full px-3 py-2 text-sm rounded-xl outline-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          >
            <option value="pre-workout">Pre-workout</option>
            <option value="post-workout">Post-workout</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>

          <div className="flex gap-2">
            <select
              value={newMeal.selectedIngredientId}
              onChange={(e) => setNewMeal(p => ({ ...p, selectedIngredientId: e.target.value }))}
              className="flex-1 px-3 py-2 text-sm rounded-xl outline-none"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            >
              <option value="">Pick ingredient</option>
              {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.calories} kcal)</option>)}
            </select>
            <button onClick={addIngredientToMeal} className="h-10 px-3 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: 'var(--accent)' }}>Add</button>
          </div>

          <div className="flex flex-wrap gap-2">
            {newMeal.selectedIngredients.map(i => (
              <button key={i.id} onClick={() => removeSelectedIngredient(i.id)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium press transition-all" style={{ backgroundColor: 'rgba(108, 99, 255, 0.15)', color: 'var(--accent)' }}>
                {i.name} x
              </button>
            ))}
          </div>

          {newMeal.selectedIngredients.length > 0 && (
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(108, 99, 255, 0.08)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Nutrition Breakdown</p>
              <MacroVisualization macros={mealMacros} />
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Total: {newMeal.selectedIngredients.reduce((s, i) => s + i.calories, 0)} kcal
              </p>
            </div>
          )}

          <textarea
            value={newMeal.recipe}
            onChange={(e) => setNewMeal(p => ({ ...p, recipe: e.target.value }))}
            placeholder="Recipe / preparation steps (optional)"
            className="w-full px-3 py-2 text-sm rounded-xl outline-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            rows={3}
          />

          <button onClick={addMealTemplate} className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--accent-green)' }}>
            <Plus size={14} /> Save Meal Template
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="section-label mb-3">Meal Templates</p>
        <div className="space-y-3">
          {meals.map(m => {
            const total = m.ingredients.reduce((s, i) => s + i.calories, 0);
            const macros = { protein: m.ingredients.reduce((s, i) => s + (i.protein || 0), 0), carbs: m.ingredients.reduce((s, i) => s + (i.carbs || 0), 0), fats: m.ingredients.reduce((s, i) => s + (i.fats || 0), 0) };
            return (
              <div key={m.id} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.timing}</span>
                </div>
                <div className="flex items-center justify-between mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--accent-gold)' }}>{total} kcal</span>
                  <button onClick={() => deleteMeal(m.id)} className="p-1 rounded-lg press" style={{ color: 'var(--accent-warm)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {m.ingredients.length > 0 && (
                  <>
                    <MacroVisualization macros={macros} compact={false} />
                    <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                      {m.ingredients.map(i => i.name).join(' · ')}
                    </p>
                  </>
                )}
                {m.recipe && <p className="text-[11px] mt-2" style={{ color: 'var(--text-secondary)' }}><Zap size={10} className="inline" /> {m.recipe}</p>}
              </div>
            );
          })}
          {meals.length === 0 && <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>No meal templates yet.</p>}
        </div>
      </div>
    </div>
  );
}
