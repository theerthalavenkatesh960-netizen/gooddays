import { CheckCircle2, Circle, Dot, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

type IngredientSnap = {
  id: number;
  name: string;
  qty: number;
  baseQty: number;
  baseUnit: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  description?: string;
};

type MealCardProps = {
  id: number;
  name: string;
  timing: string;
  timeOfDay?: string;
  imageUrl?: string;
  ingredients: IngredientSnap[];
  onRemove?: (mealId: number) => void;
  done?: boolean;
  onToggleDone?: (mealId: number) => void;
};

const TIMING_COLORS: Record<string, string> = {
  breakfast: '#f59e0b',
  lunch: '#22c55e',
  dinner: '#3b82f6',
  'pre-workout': '#f97316',
  'post-workout': '#14b8a6',
  snack: '#8b5cf6',
};

const MACRO_GOALS = {
  protein: 40,
  carbs: 60,
  fats: 25,
};

function getMacroPercent(value: number, goal: number) {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(100, (value / goal) * 100));
}

export default function MealCard({
  id,
  name,
  timing,
  timeOfDay,
  imageUrl,
  ingredients,
  onRemove,
  done,
  onToggleDone,
}: MealCardProps) {
  const timingColor = TIMING_COLORS[timing] || 'var(--text-muted)';
  const calories = ingredients.reduce((sum, i) => sum + Number(i.caloriesKcal || 0), 0);
  const protein = ingredients.reduce((sum, i) => sum + Number(i.proteinG || 0), 0);
  const carbs = ingredients.reduce((sum, i) => sum + Number(i.carbsG || 0), 0);
  const fats = ingredients.reduce((sum, i) => sum + Number(i.fatsG || 0), 0);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
      <div className="px-4 pt-3 pb-2" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Dot size={18} style={{ color: timingColor }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: timingColor }}>{timing.replace('-', ' ')}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeOfDay || '--:--'}</span>
            </div>
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
          </div>

          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Energy</p>
            <p className="text-sm font-bold" style={{ color: 'var(--accent-gold)' }}>{Math.round(calories)} kcal</p>
          </div>
        </div>
      </div>

      {imageUrl && (
        <div className="w-full h-32 overflow-hidden" style={{ backgroundColor: 'rgba(78, 205, 196, 0.08)' }}>
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-4 py-3">
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Ingredients</p>
        <div className="space-y-1.5">
          {ingredients.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No ingredients</p>
          ) : (
            ingredients.map((ing) => (
              <div key={`${id}-${ing.id}-${ing.name}`} className="flex items-start justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="truncate" style={{ color: 'var(--text-primary)' }}>{ing.name}</p>
                  {ing.description && (
                    <p className="truncate" style={{ color: 'var(--text-muted)' }}>{ing.description}</p>
                  )}
                </div>
                <p className="whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  {Number(ing.qty || ing.baseQty || 1)} {ing.baseUnit || 'serving'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="px-4 pb-3 space-y-2">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: '#ef4444' }}>Protein</span>
            <span style={{ color: '#ef4444' }}>{protein.toFixed(0)}g</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
            <motion.div className="h-full rounded-full" style={{ backgroundColor: '#ef4444' }} animate={{ width: `${getMacroPercent(protein, MACRO_GOALS.protein)}%` }} transition={{ duration: 0.35 }} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: '#f59e0b' }}>Carbs</span>
            <span style={{ color: '#f59e0b' }}>{carbs.toFixed(0)}g</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
            <motion.div className="h-full rounded-full" style={{ backgroundColor: '#f59e0b' }} animate={{ width: `${getMacroPercent(carbs, MACRO_GOALS.carbs)}%` }} transition={{ duration: 0.35 }} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: '#3b82f6' }}>Fats</span>
            <span style={{ color: '#3b82f6' }}>{fats.toFixed(0)}g</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
            <motion.div className="h-full rounded-full" style={{ backgroundColor: '#3b82f6' }} animate={{ width: `${getMacroPercent(fats, MACRO_GOALS.fats)}%` }} transition={{ duration: 0.35 }} />
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 flex items-center gap-2">
        {onToggleDone && (
          <button
            onClick={() => onToggleDone(id)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
            style={{
              backgroundColor: done ? 'rgba(34,197,94,0.15)' : 'var(--surface)',
              color: done ? '#22c55e' : 'var(--text-secondary)',
            }}
          >
            {done ? <CheckCircle2 size={14} /> : <Circle size={14} />} {done ? 'Done' : 'Mark Done'}
          </button>
        )}

        {onRemove && (
          <button
            onClick={() => onRemove(id)}
            className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--accent-warm)' }}
          >
            <Trash2 size={13} /> Remove
          </button>
        )}
      </div>
    </div>
  );
}
