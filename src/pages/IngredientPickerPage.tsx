import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

type SelectedIngredient = {
  id: number;
  name: string;
  qty: number;
  unit: string;
  baseQty: number;
  baseUnit: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
};

export default function IngredientPickerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ingredients, setIngredients] = useState<MealIngredient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | null>(null);
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('serving');

  const onDone = (location.state as any)?.onDone;

  useEffect(() => {
    loadIngredients();
  }, []);

  async function loadIngredients() {
    try {
      const data = await api.getMealIngredients();
      setIngredients(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Failed to load ingredients', e);
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

  function addIngredient() {
    if (!selectedIng) return;
    if (!qty || Number(qty) <= 0) return;

    const qtyNum = Number(qty);
    const baseQty = selectedIng.defaultQty || 1;
    const factor = qtyNum / baseQty;

    const newIng: SelectedIngredient = {
      id: selectedIng.id,
      name: selectedIng.name,
      qty: qtyNum,
      unit,
      baseQty,
      baseUnit: selectedIng.defaultUnit || 'serving',
      caloriesKcal: selectedIng.caloriesKcal * factor,
      proteinG: selectedIng.proteinG * factor,
      carbsG: selectedIng.carbsG * factor,
      fatsG: selectedIng.fatsG * factor,
    };

    // Add or update
    const existing = selectedIngredients.findIndex(i => i.id === selectedIng.id);
    if (existing >= 0) {
      const updated = [...selectedIngredients];
      updated[existing] = newIng;
      setSelectedIngredients(updated);
    } else {
      setSelectedIngredients([...selectedIngredients, newIng]);
    }

    // Reset form
    setSelectedIngredientId(null);
    setQty('1');
    setUnit('serving');
  }

  function removeIngredient(id: number) {
    setSelectedIngredients(prev => prev.filter(i => i.id !== id));
  }

  function done() {
    if (onDone) {
      onDone(selectedIngredients);
    }
    navigate(-1);
  }

  const totalMacros = selectedIngredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + ing.caloriesKcal,
      protein: acc.protein + ing.proteinG,
      carbs: acc.carbs + ing.carbsG,
      fats: acc.fats + ing.fatsG,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Add Ingredients</h1>
      </div>

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
          {/* Current Selection Summary */}
          {selectedIngredients.length > 0 && (
            <div className="mb-4 rounded-xl p-3" style={{ backgroundColor: 'var(--accent)11', border: '1px solid var(--accent)55' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--accent)' }}>
                {selectedIngredients.length} ingredient{selectedIngredients.length !== 1 ? 's' : ''} selected
              </p>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Kcal</p>
                  <p className="text-xs font-bold num" style={{ color: 'var(--accent-warm)' }}>
                    {Math.round(totalMacros.calories)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Protein</p>
                  <p className="text-xs font-bold num" style={{ color: 'var(--accent-green)' }}>
                    {Math.round(totalMacros.protein * 10) / 10}g
                  </p>
                </div>
                <div>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Carbs</p>
                  <p className="text-xs font-bold num" style={{ color: 'var(--accent-gold)' }}>
                    {Math.round(totalMacros.carbs * 10) / 10}g
                  </p>
                </div>
                <div>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Fats</p>
                  <p className="text-xs font-bold num" style={{ color: 'var(--accent)' }}>
                    {Math.round(totalMacros.fats * 10) / 10}g
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Added Ingredients List */}
          {selectedIngredients.length > 0 && (
            <div className="mb-4 space-y-2">
              {selectedIngredients.map(ing => (
                <div
                  key={ing.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {ing.qty} {ing.unit} {ing.name}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {Math.round(ing.caloriesKcal)} kcal • P:{Math.round(ing.proteinG * 10) / 10}g C:{Math.round(ing.carbsG * 10) / 10}g F:{Math.round(ing.fatsG * 10) / 10}g
                    </p>
                  </div>
                  <button
                    onClick={() => removeIngredient(ing.id)}
                    className="ml-2 p-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Ingredient Input Section */}
          <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Add New Ingredient
            </h3>

            <div className="space-y-3">
              {/* Ingredient List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                    No ingredients found
                  </div>
                ) : (
                  filtered.map(ing => (
                    <button
                      key={ing.id}
                      onClick={() => {
                        setSelectedIngredientId(selectedIngredientId === ing.id ? null : ing.id);
                      }}
                      className="w-full text-left p-2 rounded-lg transition-all"
                      style={{
                        backgroundColor: selectedIngredientId === ing.id ? 'var(--accent)11' : 'transparent',
                        border: `1px solid ${selectedIngredientId === ing.id ? 'var(--accent)55' : 'transparent'}`,
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                            {ing.name}
                          </p>
                          <div className="grid grid-cols-3 gap-1 text-[10px] mt-1">
                            <span style={{ color: 'var(--accent-warm)' }}>{Math.round(ing.caloriesKcal)} kcal</span>
                            <span style={{ color: 'var(--accent-green)' }}>P: {ing.proteinG}g</span>
                            <span style={{ color: 'var(--accent-gold)' }}>C: {ing.carbsG}g</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Quantity Input */}
              {selectedIng && (
                <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                    How much {selectedIng.name}?
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <input
                      type="number"
                      value={qty}
                      onChange={e => setQty(e.target.value)}
                      placeholder="1"
                      className="col-span-1 px-2 py-2 rounded-lg text-sm outline-none num"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                    <select
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      className="col-span-2 px-2 py-2 rounded-lg text-sm outline-none"
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
                  <button
                    onClick={addIngredient}
                    className="w-full h-9 rounded-lg font-semibold text-white flex items-center justify-center gap-1.5 text-sm"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    <Plus size={16} /> Add {selectedIng.name}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Done Button */}
          <button
            onClick={done}
            className="w-full h-11 rounded-xl font-semibold text-white"
            style={{ backgroundColor: 'var(--accent-green)' }}
          >
            Done ({selectedIngredients.length} ingredients)
          </button>
        </>
      )}
    </div>
  );
}
