import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronDown, Plus, ArrowLeft, Sparkles, Filter, Clock3, UtensilsCrossed } from 'lucide-react';
import * as api from '../lib/api';

type MasterMealTemplate = {
  id: number;
  name: string;
  timing: string;
  timeOfDay?: string;
  imageUrl?: string | null;
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

function extractTagsFromNotes(notes?: string | null): string[] {
  if (!notes) return [];

  const text = notes.toLowerCase();
  const tags: string[] = [];
  const tagRules: Array<{ match: RegExp; label: string }> = [
    { match: /\bveg\b|\bvegetarian\b/, label: 'Veg' },
    { match: /\bvegan\b/, label: 'Vegan' },
    { match: /\bhigh\s*protein\b|\bprotein\s*rich\b/, label: 'High Protein' },
    { match: /\blow\s*carb\b|\bketo\b/, label: 'Low Carb' },
    { match: /\bfiber\b|\bgut\b/, label: 'Gut Friendly' },
    { match: /\bquick\b|\bfast\b|\bunder\s*\d+\s*min/, label: 'Quick' },
    { match: /\bpost\s*workout\b|\bpre\s*workout\b/, label: 'Workout' },
    { match: /\bbudget\b|\baffordable\b|\blow\s*cost\b/, label: 'Budget' },
    { match: /\bspicy\b|\bmasala\b/, label: 'Spicy' },
  ];

  tagRules.forEach(rule => {
    if (rule.match.test(text)) tags.push(rule.label);
  });

  if (tags.length > 0) return tags.slice(0, 3);

  const normalized = notes
    .replace(/goal:\s*/gi, '')
    .replace(/notes:\s*/gi, '')
    .split(/[.;,|]/)
    .map(s => s.trim())
    .filter(Boolean);

  return normalized.slice(0, 2).map(s => (s.length > 18 ? `${s.slice(0, 18)}...` : s));
}

function shortDescription(notes?: string | null): string {
  if (!notes) return 'Balanced meal crafted for your daily nutrition target.';

  const cleaned = notes
    .replace(/goal:\s*/gi, '')
    .replace(/notes:\s*/gi, '')
    .trim();

  if (cleaned.length <= 90) return cleaned;
  return `${cleaned.slice(0, 90).trim()}...`;
}

function getTagTone(tag: string) {
  const key = tag.toLowerCase();

  if (key.includes('veg') || key.includes('vegan')) {
    return {
      backgroundColor: 'rgba(78,205,196,0.12)',
      color: 'var(--accent-green)',
      border: '1px solid rgba(78,205,196,0.28)',
    };
  }

  if (key.includes('protein') || key.includes('workout')) {
    return {
      backgroundColor: 'rgba(108,99,255,0.14)',
      color: 'var(--accent)',
      border: '1px solid rgba(108,99,255,0.3)',
    };
  }

  if (key.includes('spicy')) {
    return {
      backgroundColor: 'rgba(255,107,107,0.12)',
      color: 'var(--accent-warm)',
      border: '1px solid rgba(255,107,107,0.3)',
    };
  }

  if (key.includes('budget') || key.includes('quick')) {
    return {
      backgroundColor: 'rgba(255,217,61,0.14)',
      color: 'var(--accent-gold)',
      border: '1px solid rgba(255,217,61,0.3)',
    };
  }

  return {
    backgroundColor: 'var(--surface-elevated)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
  };
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
        background: 'linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0) 22%), var(--bg)',
      }}
    >
      <style>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        input[type='range'] {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: var(--surface-elevated);
          outline: none;
          -webkit-appearance: none;
          appearance: none;
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent-green);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(78, 205, 196, 0.3);
          transition: all 0.2s;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(78, 205, 196, 0.5);
        }
        input[type='range']::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent-green);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(78, 205, 196, 0.3);
          transition: all 0.2s;
        }
        input[type='range']::-moz-range-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(78, 205, 196, 0.5);
        }
      `}</style>
      <div className="mb-6 max-w-6xl mx-auto">
        <div className="rounded-3xl p-5 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
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
            className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
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
                <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl transition-all" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid transparent' }}>
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
                    <button onClick={() => setSearch('')} className="text-xs hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
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
                          : 'hover:opacity-80'
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Cost Range</label>
                  <span className="text-xs font-semibold" style={{ color: 'var(--accent-gold)' }}>₹{costRange.min.toFixed(0)} - ₹{costRange.max.toFixed(0)}</span>
                </div>
                <div className="mt-3 px-2 py-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Min</label>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        value={costRange.min}
                        onChange={e => setCostRange({ ...costRange, min: Number(e.target.value) })}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Max</label>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        value={costRange.max}
                        onChange={e => setCostRange({ ...costRange, max: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Calorie Range */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Calories</label>
                  <span className="text-xs font-semibold" style={{ color: 'var(--accent-gold)' }}>{calorieRange.min} - {calorieRange.max} kcal</span>
                </div>
                <div className="mt-3 px-2 py-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Min</label>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        step="50"
                        value={calorieRange.min}
                        onChange={e => setCalorieRange({ ...calorieRange, min: Number(e.target.value) })}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Max</label>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        step="50"
                        value={calorieRange.max}
                        onChange={e => setCalorieRange({ ...calorieRange, max: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Protein Range */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Protein</label>
                  <span className="text-xs font-semibold" style={{ color: 'var(--accent-gold)' }}>{proteinRange.min.toFixed(1)} - {proteinRange.max.toFixed(1)}g</span>
                </div>
                <div className="mt-3 px-2 py-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Min</label>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="0.5"
                        value={proteinRange.min}
                        onChange={e => setProteinRange({ ...proteinRange, min: Number(e.target.value) })}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Max</label>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="0.5"
                        value={proteinRange.max}
                        onChange={e => setProteinRange({ ...proteinRange, max: Number(e.target.value) })}
                      />
                    </div>
                  </div>
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
          <div className="space-y-6">
            {Object.entries(grouped).map(([group, groupMeals]) => (
              <div key={group}>
                <h2 className="text-sm font-bold mb-3 capitalize inline-flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <Clock3 size={14} />
                  {timingLabel(group)}
                  <span className="ml-1 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                    ({groupMeals.length})
                  </span>
                </h2>
                <div className="space-y-2.5">
                  {groupMeals.map(meal => (
                    <div
                      key={meal.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedMeal(meal)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedMeal(meal);
                        }
                      }}
                      className="rounded-2xl overflow-hidden transition-all hover:shadow-lg cursor-pointer"
                      style={{
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.02), transparent), var(--surface)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                      }}
                    >
                      <div className="flex flex-row gap-2 items-start min-w-0">
                        {/* Content Section */}
                        <div className="flex-1 min-w-0 p-3 pb-1.5">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <h3 className="text-sm font-bold leading-snug break-words" style={{ color: 'var(--text-primary)' }}>
                              {meal.name}
                            </h3>
                          </div>

                          <div className="mb-1.5 flex items-center gap-1 overflow-x-auto whitespace-nowrap no-scrollbar">
                            <span
                              className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold inline-flex items-center gap-1 shrink-0"
                              style={{ backgroundColor: 'rgba(108,99,255,0.16)', color: 'var(--accent)', border: '1px solid rgba(108,99,255,0.3)' }}
                            >
                              <span className="inline-block h-1 w-1 rounded-full" style={{ backgroundColor: 'currentColor', opacity: 0.9 }} />
                              {timingLabel(meal.timing)}
                            </span>
                            {extractTagsFromNotes(meal.plannerNotes).map(tag => (
                              <span
                                key={`${meal.id}-${tag}`}
                                className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold inline-flex items-center gap-1 shrink-0"
                                style={getTagTone(tag)}
                              >
                                <span
                                  className="inline-block h-1 w-1 rounded-full"
                                  style={{ backgroundColor: 'currentColor', opacity: 0.9 }}
                                />
                                {tag}
                              </span>
                            ))}
                          </div>

                          {meal.estimatedTotalCost > 0 ? (
                            <p className="text-sm font-bold mb-1" style={{ color: 'var(--accent-gold)' }}>
                              ₹{meal.estimatedTotalCost.toFixed(0)}
                            </p>
                          ) : (
                            <p className="text-sm font-bold mb-1" style={{ color: 'var(--accent-gold)' }}>
                              ₹0
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="px-2 py-1 rounded-md" style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: 'var(--accent-green)' }}>
                              P {meal.totalProteinG.toFixed(1)}g
                            </span>
                            <span className="px-2 py-1 rounded-md" style={{ backgroundColor: 'rgba(255,107,107,0.12)', color: 'var(--accent-warm)' }}>
                              C {meal.totalCarbsG.toFixed(1)}g
                            </span>
                            <span className="px-2 py-1 rounded-md" style={{ backgroundColor: 'rgba(108,99,255,0.14)', color: 'var(--accent)' }}>
                              F {meal.totalFatsG.toFixed(1)}g
                            </span>
                          </div>
                        </div>

                        {/* Image Section - Right */}
                        <div className="w-32 sm:w-36 flex-shrink-0 p-2 self-start">
                          <div className="relative w-full">
                            <div
                              className="w-full h-28 sm:h-32 rounded-xl overflow-hidden relative bg-center bg-cover flex items-end justify-center pb-2"
                              style={{
                                border: '1px solid var(--border)',
                                backgroundImage: meal.imageUrl ? `url('${meal.imageUrl}')` : 'none',
                                backgroundColor: 'var(--surface-elevated)',
                              }}
                            >
                              <div
                                className="absolute inset-0"
                                style={{ backgroundColor: 'var(--accent)', opacity: meal.imageUrl ? 0.08 : 0.12 }}
                              />

                              <div className="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-semibold" style={{ backgroundColor: 'rgba(10,10,15,0.45)', color: 'var(--text-primary)' }}>
                                {meal.totalCaloriesKcal} kcal
                              </div>

                              {!meal.imageUrl && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <UtensilsCrossed size={24} style={{ color: 'var(--accent)' }} />
                                </div>
                              )}

                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  addToLibrary(meal);
                                }}
                                className="relative px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-md z-10"
                                style={{ backgroundColor: 'var(--accent-green)', border: '1px solid rgba(0,0,0,0.05)' }}
                              >
                                <span className="inline-flex items-center gap-1">
                                  <Plus size={11} />
                                  Add
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="px-3 pb-3 pt-0.5">
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {shortDescription(meal.plannerNotes)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMeal && (
        <div className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedMeal(null)}>
          <div
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-3xl rounded-t-3xl max-h-[80vh] overflow-auto pb-6"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedMeal(null)}
              className="absolute top-3 right-4 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold z-10"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              <X size={16} />
            </button>

            {/* Image Section at Top */}
            <div
              className="w-full h-48 sm:h-56 bg-center bg-cover relative"
              style={{
                backgroundImage: selectedMeal.imageUrl ? `url('${selectedMeal.imageUrl}')` : 'none',
                backgroundColor: 'var(--surface-elevated)',
              }}
            >
              <div
                className="absolute inset-0"
                style={{ backgroundColor: 'var(--accent)', opacity: selectedMeal.imageUrl ? 0.08 : 0.12 }}
              />

              {!selectedMeal.imageUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <UtensilsCrossed size={48} style={{ color: 'var(--accent)' }} />
                </div>
              )}

              <div className="absolute top-3 left-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'rgba(10,10,15,0.45)', color: 'var(--text-primary)' }}>
                {selectedMeal.totalCaloriesKcal} kcal
              </div>
            </div>

            <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{timingLabel(selectedMeal.timing)}</p>
                  <h3 className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{selectedMeal.name}</h3>
                </div>
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
