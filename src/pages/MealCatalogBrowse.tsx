import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronDown, Plus } from 'lucide-react';
import * as api from '../lib/api';

type MasterMealTemplate = {
  id: number;
  name: string;
  timing: string;
  timeOfDay?: string;
  totalCaloriesKcal: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatsG: number;
  estimatedTotalCost: number;
  plannerNotes?: string | null;
};

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
  const [filteredMeals, setFilteredMeals] = useState<MasterMealTemplate[]>([]);
  const [expandedFilters, setExpandedFilters] = useState(true);

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

  const grouped = useMemo(() => {
    const groups: Record<string, MasterMealTemplate[]> = {};
    meals.forEach(meal => {
      const key = meal.timing || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(meal);
    });
    return groups;
  }, [meals]);

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Browse Meal Catalog</h1>

        {/* Advanced Filters */}
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setExpandedFilters(!expandedFilters)}
            className="w-full flex items-center justify-between"
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Advanced Filters</p>
            <ChevronDown size={18} style={{ color: 'var(--text-secondary)', transform: expandedFilters ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
          </button>

          {expandedFilters && (
            <div className="mt-4 space-y-4">
              {/* Search */}
              <div>
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Search</label>
                <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)' }}>
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
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {timingOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTiming(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        timing === opt.value
                          ? 'text-white'
                          : ''
                      }`}
                      style={{
                        backgroundColor: timing === opt.value ? 'var(--accent)' : 'var(--surface-elevated)',
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
          <div className="space-y-6">
            {Object.entries(grouped).map(([group, groupMeals]) => (
              <div key={group}>
                <h2 className="text-sm font-bold mb-3 capitalize" style={{ color: 'var(--text-secondary)' }}>
                  {group}
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                    ({groupMeals.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupMeals.map(meal => (
                    <div
                      key={meal.id}
                      className="rounded-2xl p-4"
                      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{meal.name}</p>
                          {meal.estimatedTotalCost > 0 && (
                            <p className="text-xs mt-1" style={{ color: 'var(--accent-gold)' }}>₹{meal.estimatedTotalCost.toFixed(0)}</p>
                          )}
                        </div>
                        <button
                          onClick={() => addToLibrary(meal)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1"
                          style={{ backgroundColor: 'var(--accent-green)' }}
                        >
                          <Plus size={14} />
                          Add
                        </button>
                      </div>

                      {/* Macros */}
                      <div className="text-xs space-y-1 mb-2" style={{ color: 'var(--text-secondary)' }}>
                        <p>{meal.totalCaloriesKcal} kcal • {meal.totalProteinG.toFixed(1)}g protein</p>
                        <p>{meal.totalCarbsG.toFixed(1)}g carbs • {meal.totalFatsG.toFixed(1)}g fat</p>
                      </div>

                      {/* Notes */}
                      {meal.plannerNotes && (
                        <p className="text-xs leading-relaxed mt-2 pt-2" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)', fontStyle: 'italic' }}>
                          "{meal.plannerNotes}"
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
    </div>
  );
}
