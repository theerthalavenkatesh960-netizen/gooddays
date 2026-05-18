import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UtensilsCrossed } from 'lucide-react';
import * as api from '../lib/api';

type MealTemplate = {
  id: number;
  name: string;
  timing: string;
  timeOfDay?: string;
  ingredientsJson: string;
  imageUrl?: string;
};

type PickerState = {
  dayKey?: string;
};

function parseIngredients(json: string) {
  try {
    const parsed = JSON.parse(json) || [];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export default function MealDayPickerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dayKey } = ((location.state || {}) as PickerState);
  const [meals, setMeals] = useState<MealTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [timing, setTiming] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'pre-workout' | 'post-workout' | 'snack'>('all');
  const [pickTime, setPickTime] = useState('');

  useEffect(() => {
    if (loaded) return;
    setLoaded(true);
    api.getMealTemplates().then((data: any) => {
      setMeals(Array.isArray(data) ? data : []);
    });
  }, [loaded]);

  const filtered = useMemo(() => {
    let list = meals;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q));
    }
    if (timing !== 'all') list = list.filter(m => m.timing === timing);
    return list;
  }, [meals, search, timing]);

  function pickMeal(meal: MealTemplate) {
    if (!dayKey) {
      navigate('/settings/meals', { state: { tab: 'weekly' } });
      return;
    }

    navigate('/settings/meals', {
      state: {
        tab: 'weekly',
        mealPick: {
          dayKey,
          mealTemplateId: meal.id,
          timeOfDay: pickTime.trim() || meal.timeOfDay || undefined,
        },
        reloadAt: Date.now(),
      },
    });
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/settings/meals', { state: { tab: 'weekly' } })} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Pick Meal for {dayKey || 'Day'}</h1>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search meals..."
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        </div>

        <select value={timing} onChange={e => setTiming(e.target.value as any)} className="w-full px-3 py-2 text-sm rounded-xl outline-none mb-2"
          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
          <option value="all">All timings</option>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="pre-workout">Pre-workout</option>
          <option value="post-workout">Post-workout</option>
          <option value="snack">Snack</option>
        </select>

        <input value={pickTime} onChange={e => setPickTime(e.target.value)} placeholder="Override time HH:MM (optional)"
          className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {filtered.map(meal => {
          const totalCalories = parseIngredients(meal.ingredientsJson).reduce((sum, i) => sum + Number(i.caloriesKcal || 0), 0);
          return (
            <button key={meal.id} onClick={() => pickMeal(meal)} className="rounded-xl overflow-hidden text-left" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-full h-24 flex items-center justify-center" style={{ backgroundColor: 'rgba(78, 205, 196, 0.08)' }}>
                {meal.imageUrl ? (
                  <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" />
                ) : (
                  <UtensilsCrossed size={28} style={{ color: 'var(--accent-green)', opacity: 0.65 }} />
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)', whiteSpace: 'normal', wordBreak: 'break-word' }}>{meal.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{meal.timing}{meal.timeOfDay ? ` • ${meal.timeOfDay}` : ''}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--accent-gold)' }}>{Math.round(totalCalories)} kcal</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
