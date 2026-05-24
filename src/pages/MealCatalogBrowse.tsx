import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronDown, Plus, ArrowLeft, Eye, Sparkles, Filter, Clock3 } from 'lucide-react';
import * as api from '../lib/api';

type MasterMealTemplate = {
  id: number;
  name: string;
  timing: string;
  timeOfDay?: string;
  ingredientsJson?: string | null;
  recipe?: string | null;
  totalCaloriesKcal: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatsG: number;
  estimatedTotalCost: number;
  plannerNotes?: string | null;
};

type Ingredient = {
  name?: string;
  caloriesKcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatsG?: number;
};

function getIngredientQuantity(name?: string): string | null {
  if (!name) return null;

  const raw = name.trim();
  const lower = raw.toLowerCase();
  const parenText = raw.match(/\(([^)]+)\)/)?.[1]?.trim();

  // Prefer explicit egg counts: "Eggs (2 whole)", "Boiled eggs (3)", etc.
  if (/\begg/.test(lower) && parenText) {
    const eggCount = parenText.match(/(\d+(?:\.\d+)?)/)?.[1];
    if (eggCount) {
      const qty = Math.max(1, Math.round(Number(eggCount)));
      return `${qty} egg${qty > 1 ? 's' : ''}`;
    }
  }

  // Handle names that begin with quantity, e.g., "2 bananas", "3 slices"
  const leadingQty = raw.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z][a-zA-Z\s-]{1,24})$/);
  if (leadingQty) {
    const qty = leadingQty[1];
    const unit = leadingQty[2].trim();
    return `${qty} ${unit}`;
  }

  // Handle parenthetical quantities for non-egg items, e.g. "Banana (2)", "Papad (2)"
  if (parenText && /\d/.test(parenText)) {
    return parenText.replace(/\bnos?\b/gi, 'pieces');
  }

  // Convert egg grams to approximate count if only grams are available.
  const grams = raw.match(/(\d+(?:\.\d+)?)\s*g\b/i)?.[1];
  if (/\begg/.test(lower) && grams) {
    const approxCount = Math.max(1, Math.round(Number(grams) / 50));
    return `~${approxCount} egg${approxCount > 1 ? 's' : ''}`;
  }

  return null;
}

function buildRecipeSteps(recipe?: string | null): string[] {
  const text = recipe?.trim();
  if (!text) return [];

  // If author already used lines, preserve them as individual steps.
  const lineSteps = text
    .split(/\r?\n+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/^\d+[.)]\s*/, ''));

  if (lineSteps.length > 1) return lineSteps;

  // Fallback: split prose recipe into sentence-like steps.
  return text
    .split(/[.;]\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/^\d+[.)]\s*/, ''));
}

function parseIngredients(input?: string | null): Ingredient[] {
  if (!input) return [];
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function timingLabel(value: string) {
  return value
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export default function MealCatalogBrowse() {
  const navigate = useNavigate();
  const [meals, setMeals] = useState<MasterMealTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // Filter state
  const [search, setSearch] = useState('');
  const [timing, setTiming] = useState(''); // breakfast/lunch/dinner/snack/pre-workout/post-workout
  const [costRange, setCostRange] = useState({ min: 0, max: 500 });
  const [calorieRange, setCalorieRange] = useState({ min: 0, max: 1000 });
  const [proteinRange, setProteinRange] = useState({ min: 0, max: 50 });
  const [expandedFilters, setExpandedFilters] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MasterMealTemplate | null>(null);

  const timingOptions = [
    { label: 'All', value: '' },
    { label: 'Breakfast', value: 'breakfast' },
    { label: 'Lunch', value: 'lunch' },
    { label: 'Dinner', value: 'dinner' },
    { label: 'Snack', value: 'snack' },
    { label: 'Pre-Workout', value: 'pre-workout' },
    { label: 'Post-Workout', value: 'post-workout' },
  ];

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getMealCatalog({
        search: search || undefined,
        timing: timing || undefined,
        minCost: costRange.min,
        maxCost: costRange.max,
        minCalories: calorieRange.min,
        maxCalories: calorieRange.max,
        minProtein: proteinRange.min,
        maxProtein: proteinRange.max,
      });
      setMeals(Array.isArray(data) ? data : []);
    } catch {
      setMeals([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const debounce = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, timing, costRange, calorieRange, proteinRange]);

  async function addToLibrary(meal: MasterMealTemplate) {
    try {
      await api.addMealFromCatalog(meal.id);
      setStatus(`Added "${meal.name}" to your library!`);
      setTimeout(() => setStatus(''), 2000);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to add meal');
    }
  }

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/settings/meals');
  }

  const grouped = useMemo(() => {
    const groups: Record<string, MasterMealTemplate[]> = {};
    meals.forEach(meal => {
      const key = meal.timing || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(meal);
    });
    return groups;
  }, [meals]);

  const selectedIngredients = useMemo(() => parseIngredients(selectedMeal?.ingredientsJson), [selectedMeal]);
  const selectedRecipeSteps = useMemo(() => buildRecipeSteps(selectedMeal?.recipe), [selectedMeal]);

  return (
    <div
      className="pt-4 pb-nav px-4"
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 20% 0%, rgba(34,197,94,0.08), transparent 36%), radial-gradient(circle at 90% 20%, rgba(245,158,11,0.08), transparent 28%), var(--bg)',
      }}
    >
      <div className="mb-6 max-w-6xl mx-auto">
        <div className="rounded-3xl p-5 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: 'var(--accent-green)' }}>
              <Sparkles size={14} />
              Curated Master Library
            </div>
          </div>

          <h1 className="text-3xl font-black mt-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Premium Meal Catalog</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Discover high-quality meal templates, inspect recipes in detail, and add only what fits your goal.
          </p>
        </div>

        {/* Advanced Filters */}
        <div className="rounded-3xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setExpandedFilters(!expandedFilters)}
            className="w-full flex items-center justify-between"
          >
            <p className="text-sm font-semibold inline-flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Filter size={15} />
              Filters
            </p>
            <ChevronDown size={18} style={{ color: 'var(--text-secondary)', transform: expandedFilters ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
          </button>

          {expandedFilters && (
            <div className="mt-4 space-y-4">
              {/* Search */}
              <div>
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Search</label>
                <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <Search size={16} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Meal name, ingredients, notes..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Timing */}
              <div>
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Meal Timing</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {timingOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTiming(opt.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        timing === opt.value
                          ? 'text-white'
                          : ''
                      }`}
                      style={{
                        backgroundColor: timing === opt.value ? 'var(--accent-green)' : 'var(--surface-elevated)',
                        color: timing === opt.value ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost Range */}
              <div>
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Cost Range: ₹{costRange.min.toFixed(0)} - ₹{costRange.max.toFixed(0)}
                </label>
                <div className="mt-2 space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="500"
                    value={costRange.min}
                    onChange={e => setCostRange({ ...costRange, min: Number(e.target.value) })}
                    className="w-full"
                  />
                  <input
                    type="range"
                    min="0"
                    max="500"
                    value={costRange.max}
                    onChange={e => setCostRange({ ...costRange, max: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Calorie Range */}
              <div>
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Calories: {calorieRange.min} - {calorieRange.max} kcal
                </label>
                <div className="mt-2 space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="50"
                    value={calorieRange.min}
                    onChange={e => setCalorieRange({ ...calorieRange, min: Number(e.target.value) })}
                    className="w-full"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="50"
                    value={calorieRange.max}
                    onChange={e => setCalorieRange({ ...calorieRange, max: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Protein Range */}
              <div>
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Protein: {proteinRange.min.toFixed(1)} - {proteinRange.max.toFixed(1)}g
                </label>
                <div className="mt-2 space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={proteinRange.min}
                    onChange={e => setProteinRange({ ...proteinRange, min: Number(e.target.value) })}
                    className="w-full"
                  />
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={proteinRange.max}
                    onChange={e => setProteinRange({ ...proteinRange, max: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {status && (
          <div className="mb-4 px-3 py-2 rounded-xl text-xs font-semibold" style={{ backgroundColor: 'rgba(78,205,196,0.1)', color: 'var(--accent-green)' }}>
            {status}
          </div>
        )}

        {loading && (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            <p className="text-sm">Loading meals...</p>
          </div>
        )}

        {!loading && meals.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            <p className="text-sm">No meals match your filters.</p>
          </div>
        )}

        {/* Grouped Meal Cards */}
        {!loading && meals.length > 0 && (
          <div className="space-y-8">
            {Object.entries(grouped).map(([group, groupMeals]) => (
              <div key={group}>
                <h2 className="text-sm font-bold mb-3 capitalize inline-flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <Clock3 size={14} />
                  {timingLabel(group)}
                  <span className="ml-1 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                    ({groupMeals.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {groupMeals.map(meal => (
                    <div
                      key={meal.id}
                      className="rounded-3xl p-4"
                      style={{
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.02), transparent), var(--surface)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{meal.name}</p>
                          {meal.estimatedTotalCost > 0 && (
                            <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--accent-gold)' }}>₹{meal.estimatedTotalCost.toFixed(0)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedMeal(meal)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1"
                            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                          >
                            <Eye size={14} />
                            Open
                          </button>
                          <button
                            onClick={() => addToLibrary(meal)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1"
                            style={{ backgroundColor: 'var(--accent-green)' }}
                          >
                            <Plus size={14} />
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Macros */}
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                          <p className="font-semibold">{meal.totalCaloriesKcal} kcal</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Energy</p>
                        </div>
                        <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                          <p className="font-semibold">{meal.totalProteinG.toFixed(1)}g</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Protein</p>
                        </div>
                        <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                          <p className="font-semibold">{meal.totalCarbsG.toFixed(1)}g</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Carbs</p>
                        </div>
                        <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                          <p className="font-semibold">{meal.totalFatsG.toFixed(1)}g</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Fat</p>
                        </div>
                      </div>

                      {/* Notes */}
                      {meal.plannerNotes && (
                        <p className="text-xs leading-relaxed mt-2 pt-2" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                          {meal.plannerNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMeal && (
        <div className="fixed inset-0 z-50 p-4 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedMeal(null)}>
          <div
            className="w-full max-w-2xl rounded-3xl max-h-[88vh] overflow-auto"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{timingLabel(selectedMeal.timing)}</p>
                  <h3 className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{selectedMeal.name}</h3>
                </div>
                <button onClick={() => setSelectedMeal(null)} className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
                  Close
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedMeal.totalCaloriesKcal}</p>
                  <p style={{ color: 'var(--text-muted)' }}>kcal</p>
                </div>
                <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedMeal.totalProteinG.toFixed(1)}g</p>
                  <p style={{ color: 'var(--text-muted)' }}>protein</p>
                </div>
                <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedMeal.totalCarbsG.toFixed(1)}g</p>
                  <p style={{ color: 'var(--text-muted)' }}>carbs</p>
                </div>
                <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedMeal.totalFatsG.toFixed(1)}g</p>
                  <p style={{ color: 'var(--text-muted)' }}>fat</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Ingredients</p>
                {selectedIngredients.length > 0 ? (
                  <div className="space-y-2">
                    {selectedIngredients.map((ing, idx) => (
                      <div key={`${ing.name || 'ingredient'}-${idx}`} className="px-3 py-2 rounded-xl text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold">{ing.name || `Ingredient ${idx + 1}`}</p>
                            {getIngredientQuantity(ing.name) && (
                              <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--accent-gold)' }}>
                                Qty: {getIngredientQuantity(ing.name)}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>
                            {(ing.caloriesKcal ?? 0).toFixed(0)} kcal • {(ing.proteinG ?? 0).toFixed(1)}p • {(ing.carbsG ?? 0).toFixed(1)}c • {(ing.fatsG ?? 0).toFixed(1)}f
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Ingredients are not available for this meal.</p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Recipe</p>
                {selectedRecipeSteps.length > 0 ? (
                  <ol className="space-y-2">
                    {selectedRecipeSteps.map((step, idx) => (
                      <li key={`${step.slice(0, 24)}-${idx}`} className="text-sm leading-relaxed flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <span
                          className="inline-flex items-center justify-center rounded-full text-[11px] font-bold mt-0.5"
                          style={{ width: 20, height: 20, backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                        >
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Recipe details are not available for this meal.
                  </p>
                )}
              </div>

              {selectedMeal.plannerNotes && (
                <div>
                  <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Coach Notes</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selectedMeal.plannerNotes}</p>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => addToLibrary(selectedMeal)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--accent-green)' }}
                >
                  <Plus size={16} />
                  Add To My Library
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
