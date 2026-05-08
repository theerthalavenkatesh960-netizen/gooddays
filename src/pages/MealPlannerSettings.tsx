import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

type Ingredient = { id: string; name: string; calories: number };
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

  const [newIngredient, setNewIngredient] = useState({ name: '', calories: '' });
  const [newMeal, setNewMeal] = useState({
    name: '',
    timing: 'pre-workout' as Meal['timing'],
    recipe: '',
    selectedIngredientId: '',
    selectedIngredients: [] as Ingredient[],
  });

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
    };
    const next = [...ingredients, item];
    persist(next, meals);
    setNewIngredient({ name: '', calories: '' });
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
        <div className="flex gap-2 mb-3">
          <input
            value={newIngredient.name}
            onChange={(e) => setNewIngredient(p => ({ ...p, name: e.target.value }))}
            placeholder="Ingredient name"
            className="flex-1 px-3 py-2 text-sm rounded-xl outline-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <input
            value={newIngredient.calories}
            onChange={(e) => setNewIngredient(p => ({ ...p, calories: e.target.value }))}
            placeholder="kcal"
            className="w-20 px-3 py-2 text-sm rounded-xl outline-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <button onClick={addIngredient} className="h-10 px-3 rounded-xl text-white text-sm font-semibold flex items-center gap-1" style={{ backgroundColor: 'var(--accent)' }}>
            <Plus size={14} />
          </button>
        </div>

        <div className="space-y-2">
          {ingredients.map(i => (
            <div key={i.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{i.name}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{i.calories} kcal</span>
              <button onClick={() => deleteIngredient(i.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--accent-warm)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {ingredients.length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No ingredients yet.</p>}
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="section-label mb-3">Create Meal Template</p>
        <div className="space-y-2">
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

          <div className="flex flex-wrap gap-1.5">
            {newMeal.selectedIngredients.map(i => (
              <button key={i.id} onClick={() => removeSelectedIngredient(i.id)} className="px-2 py-1 rounded-full text-[11px]" style={{ backgroundColor: 'var(--accent)22', color: 'var(--accent)' }}>
                {i.name} • {i.calories} kcal ×
              </button>
            ))}
          </div>

          <textarea
            value={newMeal.recipe}
            onChange={(e) => setNewMeal(p => ({ ...p, recipe: e.target.value }))}
            placeholder="Recipe / preparation steps"
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
        <div className="space-y-2">
          {meals.map(m => {
            const total = m.ingredients.reduce((s, i) => s + i.calories, 0);
            return (
              <div key={m.id} className="p-2.5 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{m.timing}</span>
                  <button onClick={() => deleteMeal(m.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--accent-warm)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {m.ingredients.map(i => i.name).join(' · ') || 'No ingredients'}
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--accent-green)' }}>~ {total} kcal</p>
                {m.recipe && <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>{m.recipe}</p>}
              </div>
            );
          })}
          {meals.length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No meal templates yet.</p>}
        </div>
      </div>
    </div>
  );
}
