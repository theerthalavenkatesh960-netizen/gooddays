import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import * as api from '../lib/api';

type MealIngredient = {
  id: number;
  name: string;
  caloriesKcal: number;
  proteinG?: number;
  carbsG?: number;
  fatsG?: number;
  defaultQty?: number;
  defaultUnit?: string;
};

export default function LogIngredientPage() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState<MealIngredient[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('serving');
  const [loading, setLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => {
    loadIngredients();
  }, []);

  async function loadIngredients() {
    try {
      const data = await api.getMealIngredients();
      setIngredients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load ingredients:', e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return ingredients;
    const q = search.trim().toLowerCase();
    return ingredients.filter(i => i.name.toLowerCase().includes(q));
  }, [ingredients, search]);

  const selectedIng = ingredients.find(i => i.id === selectedId);

  // Auto-populate qty/unit when ingredient selected
  useEffect(() => {
    if (selectedIng) {
      setQty(String(selectedIng.defaultQty || 1));
      setUnit(selectedIng.defaultUnit || 'serving');
    }
  }, [selectedIng]);

  function formatDefaultServing(ingredient: MealIngredient | undefined): string {
    if (!ingredient) return '';
    const defaultQty = ingredient.defaultQty ?? 1;
    const rawUnit = String(ingredient.defaultUnit || 'serving').toLowerCase();
    const displayUnit = rawUnit === 'g' ? 'gms' : rawUnit;
    return `${defaultQty} ${displayUnit}`;
  }

  async function logIngredient() {
    if (!selectedId) return;
    if (!qty || Number(qty) <= 0) return;

    setIsLogging(true);
    try {
      const qtyNum = Number(qty);
      const macroFactor = qtyNum / (selectedIng?.defaultQty || 1);

      const mealData = {
        name: `${qtyNum} ${unit} ${selectedIng?.name}`,
        timing: 'snack',
        ingredientsJson: JSON.stringify([
          {
            id: selectedId,
            name: selectedIng?.name || '',
            qty: qtyNum,
            baseQty: selectedIng?.defaultQty || 1,
            unit,
            caloriesKcal: (selectedIng?.caloriesKcal || 0) * macroFactor,
            proteinG: (selectedIng?.proteinG || 0) * macroFactor,
            carbsG: (selectedIng?.carbsG || 0) * macroFactor,
            fatsG: (selectedIng?.fatsG || 0) * macroFactor,
          }
        ]),
        recipe: '',
        imageUrl: '',
      };

      const created = await api.createMealTemplate(mealData);
      const createdId = Number((created as any)?.id);
      if (!Number.isFinite(createdId) || createdId <= 0) throw new Error('Failed to create meal');

      const today = new Date().toISOString().slice(0, 10);
      let todayLog = null;
      try {
        todayLog = await (api as any).getDailyMealLog(today);
      } catch {
        // No existing log for today
      }

      const existingIds = Array.isArray(todayLog?.mealIds)
        ? todayLog.mealIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
        : [];

      const nextIds = Array.from(new Set([...existingIds, createdId]));
      await (api as any).upsertDailyMealLog(today, nextIds);
      
      // Navigate back to Body page
      navigate('/body', { state: { mealAdded: true } });
    } catch (e) {
      console.error('Failed to log:', e);
    } finally {
      setIsLogging(false);
    }
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate('/body')}
          className="p-2 rounded-lg"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <ArrowLeft size={20} style={{ color: 'var(--text-primary)' }} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Log Ingredient
        </h1>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search
          size={16}
          style={{ color: 'var(--text-muted)', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ingredients..."
          className="w-full px-3 py-2 pl-10 rounded-lg text-sm outline-none"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        />
      </div>

      {/* Ingredients List */}
      <div className="space-y-2 mb-6">
        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No ingredients found</p>
        ) : (
          filtered.map(ing => (
            <button
              key={ing.id}
              onClick={() => setSelectedId(ing.id)}
              className="w-full text-left p-3 rounded-lg transition-all"
              style={{
                backgroundColor: selectedId === ing.id ? 'var(--accent)11' : 'var(--surface)',
                border: `1px solid ${selectedId === ing.id ? 'var(--accent)55' : 'var(--border)'}`,
              }}
            >
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {ing.name}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {Math.round(ing.caloriesKcal)} kcal · {Math.round(ing.proteinG || 0)}g protein
              </p>
            </button>
          ))
        )}
      </div>

      {/* Selected Ingredient Details and Input */}
      {selectedIng && (
        <div className="space-y-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div>
            <p className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
              {selectedIng.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Default: {formatDefaultServing(selectedIng)}
            </p>
          </div>

          {/* Quantity and Unit Inputs */}
          <div className="space-y-2">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Quantity
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                placeholder="Qty"
              />
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                <option>serving</option>
                <option>g</option>
                <option>ml</option>
                <option>oz</option>
                <option>cup</option>
                <option>tbsp</option>
                <option>tsp</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => navigate('/body')}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-lg"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={logIngredient}
              disabled={isLogging}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {isLogging ? 'Logging...' : 'Log Ingredient'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
