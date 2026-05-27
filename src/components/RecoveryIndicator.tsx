interface RecoveryIndicatorProps {
  muscleGroup: string;
  intensity: number; // 0-1 scale
  status: 'fresh' | 'ready' | 'active' | 'recovering';
}

export default function RecoveryIndicator({ muscleGroup, intensity, status }: RecoveryIndicatorProps) {
  const statusConfig = {
    fresh: { color: 'var(--accent-green)', label: 'Fresh', bg: 'rgba(78, 205, 196, 0.1)' },
    ready: { color: 'var(--accent)', label: 'Ready', bg: 'rgba(108, 99, 255, 0.1)' },
    active: { color: 'var(--accent-gold)', label: 'Active', bg: 'rgba(255, 217, 61, 0.1)' },
    recovering: { color: 'var(--accent-warm)', label: 'Recovering', bg: 'rgba(255, 107, 107, 0.1)' },
  };

  const cfg = statusConfig[status];
  const intensityPercent = Math.round(intensity * 100);

  return (
    <div
      className="p-3 rounded-xl flex items-center gap-3"
      style={{ backgroundColor: cfg.bg }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {muscleGroup}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {cfg.label}
          </span>
          <span className="text-xs font-bold num" style={{ color: cfg.color }}>
            {intensityPercent}%
          </span>
        </div>
      </div>

      {/* Mini intensity bar */}
      <div className="w-1 h-12 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
        <div
          className="rounded-full transition-all"
          style={{
            height: `${intensityPercent}%`,
            backgroundColor: cfg.color,
            boxShadow: `0 0 8px ${cfg.color}40`,
          }}
        />
      </div>
    </div>
  );
}
