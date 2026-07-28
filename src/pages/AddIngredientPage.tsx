import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, X } from 'lucide-react';
import * as api from '../lib/api';

type MealIngredient = {
  id: number;
  name: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  defaultQty?: number;
  defaultUnit?: string;
};

export default function AddIngredientPage() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState<MealIngredient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | null>(null);
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('serving');
  const [status, setStatus] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => {
    loadIngredients();
  }, []);

  async function loadIngredients() {
    try {
      const data = await api.getMealIngredients();
      setIngredients(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return ingredients;
    const q = search.trim().toLowerCase();
    return ingredients.filter(i => 
      i.name.toLowerCase().includes(q)
    );
  }, [ingredients, search]);

  const selectedIng = ingredients.find(i => i.id === selectedIngredientId);

  async function logIngredient() {
    if (!selectedIngredientId) {
      setStatus('Select an ingredient first');
      return;
    }

    if (!qty || Number(qty) <= 0) {
      setStatus('Enter a valid quantity');
      return;
    }

    setIsLogging(true);
    setStatus('');
    try {
      const qtyNum = Number(qty);
      const macroFactor = qtyNum / (selectedIng?.defaultQty || 1);

      // Log as a meal with just this ingredient
      const mealData = {
        name: `${qtyNum} ${unit} ${selectedIng?.name}`,
        timing: 'snack',
        timeOfDay: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        ingredientsJson: JSON.stringify([
          {
            id: selectedIngredientId,
            name: selectedIng?.name || '',
            qty: qtyNum,
            baseQty: selectedIng?.defaultQty || 1,
            unit: unit,
            baseUnit: selectedIng?.defaultUnit || 'serving',
            caloriesKcal: (selectedIng?.caloriesKcal || 0) * macroFactor,
            proteinG: (selectedIng?.proteinG || 0) * macroFactor,
            carbsG: (selectedIng?.carbsG || 0) * macroFactor,
            fatsG: (selectedIng?.fatsG || 0) * macroFactor,
          }
        ]),
        recipe: '',
        imageUrl: '',
      };

      // Create a single-item meal template and log it for today so it appears immediately in Diet.
      const created = await api.createMealTemplate(mealData);
      const createdId = Number((created as any)?.id);
      
      if (!Number.isFinite(createdId) || createdId <= 0) {
        throw new Error('Failed to create meal: invalid response from server');
      }

      const today = new Date().toISOString().slice(0, 10);
      let todayLog = null;
      try {
        todayLog = await (api as any).getDailyMealLog(today);
      } catch (e) {
        // If getting the log fails, that's okay - we'll create a new one
      }
      
      const existingIds = Array.isArray(todayLog?.mealIds) 
        ? todayLog.mealIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0) 
        : [];
      
      const nextIds = Array.from(new Set([...existingIds, createdId]));
      await (api as any).upsertDailyMealLog(today, nextIds);
      
      setStatus('Ingredient logged! ✓');
      setTimeout(() => {
        navigate('/settings/meals', {
          state: {
            tab: 'library',
            reloadAt: Date.now(),
            mealCreated: created,
          },
        });
      }, 800);
    } catch (e: any) {
      console.error('Ingredient logging error:', e);
      const errorMsg = e?.message || 'Failed to log ingredient';
      setStatus(errorMsg);
    } finally {
      setIsLogging(false);
    }
  }

  const caloriesDisplay = selectedIng
    ? Math.round((selectedIng.caloriesKcal * Number(qty)) / (selectedIng.defaultQty || 1))
    : 0;

  const proteinDisplay = selectedIng
    ? Math.round((selectedIng.proteinG * Number(qty)) / (selectedIng.defaultQty || 1) * 10) / 10
    : 0;

  const carbsDisplay = selectedIng
    ? Math.round((selectedIng.carbsG * Number(qty)) / (selectedIng.defaultQty || 1) * 10) / 10
    : 0;

  const fatsDisplay = selectedIng
    ? Math.round((selectedIng.fatsG * Number(qty)) / (selectedIng.defaultQty || 1) * 10) / 10
    : 0;

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/settings/meals', { state: { tab: 'library' } })}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Log Ingredient</h1>
      </div>

      {status && (
        <div
          className="mb-3 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{
            backgroundColor: status.includes('✓') ? 'rgba(78, 205, 196, 0.1)' : 'rgba(255, 107, 107, 0.1)',
            color: status.includes('✓') ? 'var(--accent-green)' : 'var(--accent-warm)'
          }}
        >
          {status}
        </div>
      )}

      {/* Search Box */}
      <div className="mb-4 rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ backgroundColor: 'var(--surface-elevated)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ingredients..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="p-1">
              <X size={14} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
          Loading ingredients...
        </div>
      ) : (
        <>
          {/* Ingredient List */}
          <div className="space-y-2 mb-4">
            {filtered.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                No ingredients found
              </div>
            ) : (
              filtered.map(ing => (
                <button
                  key={ing.id}
                  onClick={() => setSelectedIngredientId(ing.id)}
                  className="w-full text-left p-3 rounded-xl transition-all"
                  style={{
                    backgroundColor: selectedIngredientId === ing.id ? 'var(--accent)11' : 'var(--surface)',
                    border: `1px solid ${selectedIngredientId === ing.id ? 'var(--accent)55' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {ing.name}
                    </p>
                    <span className="text-xs font-bold num" style={{ color: 'var(--accent-warm)' }}>
                      {Math.round(ing.caloriesKcal)} kcal
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <span style={{ color: 'var(--accent-green)' }}>P: {ing.proteinG}g</span>
                    <span style={{ color: 'var(--accent-gold)' }}>C: {ing.carbsG}g</span>
                    <span style={{ color: 'var(--accent)' }}>F: {ing.fatsG}g</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Quantity Input */}
          {selectedIng && (
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                How much {selectedIng.name}?
              </p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                <input
                  type="number"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder="1"
                  className="col-span-2 px-3 py-2 rounded-lg text-sm outline-none num"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                />
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  className="col-span-2 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                >
                  <option value="serving">serving</option>
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="oz">oz</option>
                  <option value="cup">cup</option>
                  <option value="tbsp">tbsp</option>
                  <option value="tsp">tsp</option>
                  <option value="piece">piece</option>
                </select>
              </div>

              {/* Macro Display */}
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Kcal</p>
                  <p className="text-xs font-bold num" style={{ color: 'var(--accent-warm)' }}>
                    {caloriesDisplay}
                  </p>
                </div>
                <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Protein</p>
                  <p className="text-xs font-bold num" style={{ color: 'var(--accent-green)' }}>
                    {proteinDisplay}g
                  </p>
                </div>
                <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Carbs</p>
                  <p className="text-xs font-bold num" style={{ color: 'var(--accent-gold)' }}>
                    {carbsDisplay}g
                  </p>
                </div>
                <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Fats</p>
                  <p className="text-xs font-bold num" style={{ color: 'var(--accent)' }}>
                    {fatsDisplay}g
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Log Button */}
          <button
            onClick={logIngredient}
            disabled={!selectedIng || isLogging}
            className="w-full h-11 rounded-xl font-semibold flex items-center justify-center gap-2 text-white disabled:opacity-50 transition-all"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {isLogging ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Logging...
              </>
            ) : (
              <>
                <Plus size={18} /> Log {selectedIng?.name || 'Ingredient'}
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
