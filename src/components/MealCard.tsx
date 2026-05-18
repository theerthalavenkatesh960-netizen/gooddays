import { CheckCircle2, Circle, Dot, Trash2 } from 'lucide-react';

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
      {/* Header */}
      <div className="px-4 pt-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        {/* Timing + time row */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Dot size={16} style={{ color: timingColor, flexShrink: 0 }} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: timingColor }}>{timing.replace(/-/g, ' ')}</span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>{timeOfDay || '--:--'}</span>
        </div>
        {/* Meal name — wraps instead of truncating */}
        <p className="text-sm font-bold leading-snug mb-2" style={{ color: 'var(--text-primary)' }}>{name}</p>
        {/* Calorie badge */}
        {/* Macro + calorie row */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <span className="text-[11px]">
              <span style={{ color: 'var(--text-muted)' }}>P </span>
              <strong style={{ color: '#f87171' }}>{protein.toFixed(0)}g</strong>
            </span>
            <span className="text-[11px]">
              <span style={{ color: 'var(--text-muted)' }}>C </span>
              <strong style={{ color: '#fbbf24' }}>{carbs.toFixed(0)}g</strong>
            </span>
            <span className="text-[11px]">
              <span style={{ color: 'var(--text-muted)' }}>F </span>
              <strong style={{ color: '#60a5fa' }}>{fats.toFixed(0)}g</strong>
            </span>
          </div>
          <span className="text-xs font-bold" style={{ color: 'var(--accent-gold)' }}>{Math.round(calories)} kcal</span>
        </div>
      </div>

      {imageUrl && (
        <div className="w-full h-32 overflow-hidden" style={{ backgroundColor: 'rgba(78, 205, 196, 0.08)' }}>
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Ingredients</p>
          <div className="space-y-1.5">
            {ingredients.map((ing) => (
              <div key={`${id}-${ing.id}-${ing.name}`} className="flex items-center justify-between gap-2 text-xs">
                <p className="flex-1 min-w-0" style={{ color: 'var(--text-primary)', whiteSpace: 'normal', wordBreak: 'break-word' }}>{ing.name}</p>
                <p className="whitespace-nowrap flex-shrink-0 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  {Number(ing.qty || ing.baseQty || 1)}{ing.baseUnit || 'g'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

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
