interface MacroData {
  protein: number;
  carbs: number;
  fats: number;
}

interface MacroVisualizationProps {
  macros: MacroData;
  compact?: boolean;
}

export default function MacroVisualization({ macros, compact = false }: MacroVisualizationProps) {
  const total = macros.protein + macros.carbs + macros.fats;
  const proteinPct = total > 0 ? (macros.protein / total) * 100 : 0;
  const carbsPct = total > 0 ? (macros.carbs / total) * 100 : 0;
  const fatsPct = total > 0 ? (macros.fats / total) * 100 : 0;

  if (compact) {
    return (
      <div className="flex h-1.5 gap-px rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
        <div style={{ flex: proteinPct, backgroundColor: '#FF6B6B' }} />
        <div style={{ flex: carbsPct, backgroundColor: '#FFD93D' }} />
        <div style={{ flex: fatsPct, backgroundColor: '#4ECDC4' }} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="flex h-2 gap-px rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
        <div style={{ flex: proteinPct, backgroundColor: '#FF6B6B', boxShadow: '0 0 4px rgba(255, 107, 107, 0.4)' }} />
        <div style={{ flex: carbsPct, backgroundColor: '#FFD93D', boxShadow: '0 0 4px rgba(255, 217, 61, 0.4)' }} />
        <div style={{ flex: fatsPct, backgroundColor: '#4ECDC4', boxShadow: '0 0 4px rgba(78, 205, 196, 0.4)' }} />
      </div>

      {/* Labels */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div style={{ color: 'var(--text-muted)' }}>
          <p style={{ color: '#FF6B6B', fontWeight: 600 }}>{macros.protein}g</p>
          <p>Protein</p>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          <p style={{ color: '#FFD93D', fontWeight: 600 }}>{macros.carbs}g</p>
          <p>Carbs</p>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          <p style={{ color: '#4ECDC4', fontWeight: 600 }}>{macros.fats}g</p>
          <p>Fats</p>
        </div>
      </div>
    </div>
  );
}
