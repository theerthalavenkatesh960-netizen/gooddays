import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import * as api from '../lib/api';

type MealIngredient = {
  id: number;
  name: string;
  caloriesKcal: number;
  proteinG?: number;
  carbsG?: number;
  fatsG?: number;
};

type MealTemplate = {
  id: number;
  name: string;
  timing: string;
  ingredientsJson: string;
};

type DailyMealLog = { date: string; mealIds: number[] };

type MealRecord = {
  id: number;
  name: string;
  timing: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  count: number;
  lastDate: string;
};

type RankTab = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  subtitle: (m: MealRecord) => string;
  highlight: (m: MealRecord) => string;
  sortFn: (a: MealRecord, b: MealRecord) => number;
};

const RANK_TABS: RankTab[] = [
  {
    id: 'most_logged',
    label: 'Most Logged',
    emoji: '🔁',
    color: 'var(--accent)',
    subtitle: (m) => `${m.count}x logged`,
    highlight: (m) => `${m.count}×`,
    sortFn: (a, b) => b.count - a.count,
  },
  {
    id: 'high_protein',
    label: 'High Protein',
    emoji: '💪',
    color: '#10b981',
    subtitle: (m) => `${Math.round(m.protein)}g protein`,
    highlight: (m) => `${Math.round(m.protein)}g`,
    sortFn: (a, b) => b.protein - a.protein,
  },
  {
    id: 'low_calorie',
    label: 'Low Calorie',
    emoji: '🥗',
    color: '#06b6d4',
    subtitle: (m) => `${Math.round(m.calories)} kcal`,
    highlight: (m) => `${Math.round(m.calories)} kcal`,
    sortFn: (a, b) => a.calories - b.calories,
  },
  {
    id: 'high_calorie',
    label: 'High Calorie',
    emoji: '🔥',
    color: '#f59e0b',
    subtitle: (m) => `${Math.round(m.calories)} kcal`,
    highlight: (m) => `${Math.round(m.calories)} kcal`,
    sortFn: (a, b) => b.calories - a.calories,
  },
  {
    id: 'high_carbs',
    label: 'High Carbs',
    emoji: '🌾',
    color: '#a78bfa',
    subtitle: (m) => `${Math.round(m.carbs)}g carbs`,
    highlight: (m) => `${Math.round(m.carbs)}g`,
    sortFn: (a, b) => b.carbs - a.carbs,
  },
  {
    id: 'low_fat',
    label: 'Low Fat',
    emoji: '🫐',
    color: '#ec4899',
    subtitle: (m) => `${Math.round(m.fats)}g fat`,
    highlight: (m) => `${Math.round(m.fats)}g`,
    sortFn: (a, b) => a.fats - b.fats,
  },
];

const MEDALS = ['🥇', '🥈', '🥉'];

function parseMealIngredients(json: string): MealIngredient[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function BodyAllMealsPage() {
  const navigate = useNavigate();
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([]);
  const [mealLogs, setMealLogs] = useState<DailyMealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('most_logged');
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [templates, logs] = await Promise.all([
          api.getMealTemplates().catch(() => []),
          (api as any).getDailyMealLogs('1970-01-01', today).catch(() => []),
        ]);
        setMealTemplates(Array.isArray(templates) ? templates : []);
        setMealLogs(Array.isArray(logs) ? logs : []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [today]);

  const baseRecords = useMemo<MealRecord[]>(() => {
    const byMeal = new Map<number, { count: number; lastDate: string }>();
    for (const log of mealLogs) {
      const date = String(log?.date || '').slice(0, 10);
      for (const rawId of Array.isArray(log?.mealIds) ? log.mealIds : []) {
        const id = Number(rawId);
        if (!Number.isFinite(id) || id <= 0) continue;
        const prev = byMeal.get(id);
        byMeal.set(id, {
          count: (prev?.count ?? 0) + 1,
          lastDate: prev?.lastDate && prev.lastDate > date ? prev.lastDate : date,
        });
      }
    }

    return Array.from(byMeal.entries())
      .map(([id, stats]) => {
        const meal = mealTemplates.find((m) => m.id === id);
        if (!meal) return null;
        const ingredients = parseMealIngredients(meal.ingredientsJson);
        return {
          id,
          name: meal.name,
          timing: meal.timing,
          calories: ingredients.reduce((s, i) => s + Number(i.caloriesKcal || 0), 0),
          protein: ingredients.reduce((s, i) => s + Number(i.proteinG || 0), 0),
          carbs: ingredients.reduce((s, i) => s + Number(i.carbsG || 0), 0),
          fats: ingredients.reduce((s, i) => s + Number(i.fatsG || 0), 0),
          count: stats.count,
          lastDate: stats.lastDate,
        };
      })
      .filter((m): m is MealRecord => !!m);
  }, [mealLogs, mealTemplates]);

  const currentTab = RANK_TABS.find((t) => t.id === activeTab) ?? RANK_TABS[0];

  const sorted = useMemo(
    () => [...baseRecords].sort(currentTab.sortFn),
    [baseRecords, currentTab],
  );

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 mb-4">
        <button
          onClick={() => navigate('/body?tab=Progress')}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Meal Records</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{baseRecords.length} unique meals across all time</p>
        </div>
        <button
          onClick={() => navigate('/body/diet/meals/review')}
          className="ml-auto px-3 h-9 rounded-xl text-[11px] font-semibold"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--border)' }}
        >
          Needs Review
        </button>
      </div>

      {/* Rank tab strip — horizontal scroll */}
      <div className="flex gap-2 px-4 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {RANK_TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                backgroundColor: active ? tab.color : 'var(--surface)',
                color: active ? '#fff' : 'var(--text-muted)',
                border: active ? `1px solid ${tab.color}` : '1px solid var(--border)',
              }}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="px-4 space-y-2">
        {loading ? (
          [1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }} />
          ))
        ) : sorted.length === 0 ? (
          <div className="p-5 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '2px dashed var(--border)' }}>
            <p className="text-3xl mb-2">🍽️</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No meal records yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Log meals in the Diet tab to build your history</p>
          </div>
        ) : (
          sorted.map((meal, idx) => {
            const medal = MEDALS[idx] ?? null;
            const isTop = idx < 3;
            return (
              <div
                key={`${meal.id}-${idx}`}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: isTop
                    ? `1px solid ${currentTab.color}55`
                    : '1px solid var(--border)',
                  background: idx === 0
                    ? `linear-gradient(135deg, ${currentTab.color}15, var(--surface))`
                    : undefined,
                }}
              >
                {/* Rank badge */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 font-bold"
                  style={{
                    backgroundColor: isTop ? `${currentTab.color}22` : 'var(--surface-elevated)',
                  }}
                >
                  {medal ?? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>#{idx + 1}</span>}
                </div>

                {/* Name + timing */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{meal.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {meal.timing || 'Meal'} · {meal.count}× logged
                  </p>
                  <p className="text-[10px] mt-0.5 num" style={{ color: 'var(--text-muted)' }}>
                    {Math.round(meal.calories)} kcal · P{Math.round(meal.protein)} C{Math.round(meal.carbs)} F{Math.round(meal.fats)}
                  </p>
                </div>

                {/* Highlighted stat */}
                <div className="text-right flex-shrink-0">
                  <p
                    className="text-lg font-black num leading-tight"
                    style={{ color: currentTab.color }}
                  >
                    {currentTab.highlight(meal)}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {currentTab.subtitle(meal)}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    last {meal.lastDate || '--'}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
