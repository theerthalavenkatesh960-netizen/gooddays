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

const UNIT_OPTIONS = ['gms', 'serving', 'ml', 'oz', 'cup', 'tbsp', 'tsp'];

/** Normalise backend unit string to what we display in the dropdown */
function normaliseUnit(raw: string | undefined): string {
  const u = (raw || 'serving').toLowerCase().trim();
  if (u === 'g' || u === 'gram' || u === 'grams') return 'gms';
  if (UNIT_OPTIONS.includes(u)) return u;
  return 'serving';
}

export default function LogIngredientPage() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState<MealIngredient[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('serving');
  const [loading, setLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => { loadIngredients(); }, []);

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

  // Auto-populate qty/unit from ingredient defaults when selection changes
  useEffect(() => {
    if (selectedIng) {
      setQty(String(selectedIng.defaultQty || 1));
      setUnit(normaliseUnit(selectedIng.defaultUnit));
    }
  }, [selectedIng]);

  // Live macro calculation scaled to current qty
  const scaledMacros = useMemo(() => {
    if (!selectedIng) return null;
    const qtyNum = Math.max(0, Number(qty) || 0);
    const baseQty = selectedIng.defaultQty || 1;
    const factor = qtyNum / baseQty;
    return {
      kcal: (selectedIng.caloriesKcal || 0) * factor,
      protein: (selectedIng.proteinG || 0) * factor,
      carbs: (selectedIng.carbsG || 0) * factor,
      fats: (selectedIng.fatsG || 0) * factor,
    };
  }, [selectedIng, qty]);

  async function logIngredient() {
    if (!selectedId || !selectedIng) return;
    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) return;

    setIsLogging(true);
    try {
      const factor = qtyNum / (selectedIng.defaultQty || 1);
      const storedUnit = unit === 'gms' ? 'g' : unit;

      const mealData = {
        name: `${qtyNum} ${unit} ${selectedIng.name}`,
        timing: 'snack',
        ingredientsJson: JSON.stringify([{
          id: selectedId,
          name: selectedIng.name,
          qty: qtyNum,
          baseQty: selectedIng.defaultQty || 1,
          unit: storedUnit,
          caloriesKcal: (selectedIng.caloriesKcal || 0) * factor,
          proteinG: (selectedIng.proteinG || 0) * factor,
          carbsG: (selectedIng.carbsG || 0) * factor,
          fatsG: (selectedIng.fatsG || 0) * factor,
        }]),
        recipe: '',
        imageUrl: '',
      };

      const created = await api.createMealTemplate(mealData);
      const createdId = Number((created as any)?.id);
      if (!Number.isFinite(createdId) || createdId <= 0) throw new Error('Failed to create meal');

      const today = new Date().toISOString().slice(0, 10);
      let todayLog: any = null;
      try { todayLog = await (api as any).getDailyMealLog(today); } catch { /* no log yet */ }

      const existingIds: number[] = Array.isArray(todayLog?.mealIds)
        ? todayLog.mealIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
        : [];

      await (api as any).upsertDailyMealLog(today, Array.from(new Set([...existingIds, createdId])));
      navigate('/body', { state: { mealAdded: true } });
    } catch (e) {
      console.error('Failed to log:', e);
    } finally {
      setIsLogging(false);
    }
  }

  const defaultUnitDisplay = normaliseUnit(selectedIng?.defaultUnit);
  const unitOptions = selectedIng
    ? [defaultUnitDisplay, ...UNIT_OPTIONS.filter(u => u !== defaultUnitDisplay)]
    : UNIT_OPTIONS;

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate('/body')} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={20} style={{ color: 'var(--text-primary)' }} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Log Ingredient</h1>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={16} style={{ color: 'var(--text-muted)', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ingredients..."
          className="w-full px-3 py-2 pl-10 rounded-lg text-sm outline-none"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        />
      </div>

      {/* Selected ingredient card — shown above the list */}
      {selectedIng && scaledMacros && (
        <div className="mb-4 p-4 rounded-xl space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          {/* Name + default serving info */}
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{selectedIng.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Per {selectedIng.defaultQty || 1} {defaultUnitDisplay}: {Math.round(selectedIng.caloriesKcal)} kcal
            </p>
          </div>

          {/* Qty + unit inputs */}
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-primary)' }}>Quantity</label>
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
                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Live macro preview */}
          <div>
            <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Macros for {qty || 0} {unit}
            </p>
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Kcal</p>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{Math.round(scaledMacros.kcal)}</p>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Protein</p>
                <p className="text-xs font-bold" style={{ color: 'var(--accent-green)' }}>{Math.round(scaledMacros.protein)}g</p>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Carbs</p>
                <p className="text-xs font-bold" style={{ color: 'var(--accent-gold)' }}>{Math.round(scaledMacros.carbs)}g</p>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Fats</p>
                <p className="text-xs font-bold" style={{ color: 'var(--accent)' }}>{Math.round(scaledMacros.fats)}g</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setSelectedId(null)}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-lg"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}
            >
              Clear
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

      {/* Ingredients list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold px-1" style={{ color: 'var(--text-muted)' }}>
          {selectedId ? 'Change ingredient' : 'Select an ingredient'}
        </p>
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
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{ing.name}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {Math.round(ing.caloriesKcal)} kcal · {Math.round(ing.proteinG || 0)}g protein
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
