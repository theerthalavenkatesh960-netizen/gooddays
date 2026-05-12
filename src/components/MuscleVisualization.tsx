type MuscleIntensity = Record<string, number>; // 0-1 scale

interface MuscleVisualizationProps {
  intensity: MuscleIntensity;
  side?: 'front' | 'back';
  height?: number;
}

export default function MuscleVisualization({ intensity, side = 'front', height = 280 }: MuscleVisualizationProps) {
  const getColor = (muscle: string): string => {
    const intensity_val = intensity[muscle] ?? 0;
    if (intensity_val === 0) return 'var(--surface-elevated)';
    if (intensity_val < 0.3) return '#2a4a6a';
    if (intensity_val < 0.7) return '#4a6aaa';
    return '#6c8eff';
  };

  const getGlow = (muscle: string): string => {
    const intensity_val = intensity[muscle] ?? 0;
    return intensity_val > 0.5 ? '0 0 8px rgba(108, 99, 255, 0.4)' : 'none';
  };

  return (
    <div className="flex items-center justify-center p-2" style={{ height: `${height}px` }}>
      <svg
        viewBox="0 0 200 360"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.2))',
        }}
      >
        {side === 'front' ? (
          <>
            {/* Head */}
            <circle cx="100" cy="30" r="18" fill="var(--surface-elevated)" stroke="var(--border)" strokeWidth="1" />
            
            {/* Chest */}
            <ellipse cx="85" cy="75" rx="22" ry="35" fill={getColor('chest')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('chest') }} />
            <ellipse cx="115" cy="75" rx="22" ry="35" fill={getColor('chest')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('chest') }} />
            
            {/* Shoulders */}
            <ellipse cx="55" cy="60" rx="18" ry="20" fill={getColor('shoulders')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('shoulders') }} />
            <ellipse cx="145" cy="60" rx="18" ry="20" fill={getColor('shoulders')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('shoulders') }} />
            
            {/* Biceps */}
            <rect x="35" y="70" width="16" height="50" rx="8" fill={getColor('biceps')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('biceps') }} />
            <rect x="149" y="70" width="16" height="50" rx="8" fill={getColor('biceps')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('biceps') }} />
            
            {/* Triceps */}
            <rect x="155" y="70" width="16" height="50" rx="8" fill={getColor('triceps')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('triceps') }} />
            <rect x="29" y="70" width="16" height="50" rx="8" fill={getColor('triceps')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('triceps') }} />
            
            {/* Abs */}
            <rect x="92" y="105" width="16" height="40" rx="4" fill={getColor('abs')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('abs') }} />
            
            {/* Quads */}
            <rect x="80" y="170" width="20" height="60" rx="8" fill={getColor('quads')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('quads') }} />
            <rect x="100" y="170" width="20" height="60" rx="8" fill={getColor('quads')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('quads') }} />
            
            {/* Shins */}
            <rect x="80" y="235" width="20" height="50" rx="6" fill={getColor('shins')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('shins') }} />
            <rect x="100" y="235" width="20" height="50" rx="6" fill={getColor('shins')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('shins') }} />
          </>
        ) : (
          <>
            {/* Head */}
            <circle cx="100" cy="30" r="18" fill="var(--surface-elevated)" stroke="var(--border)" strokeWidth="1" />
            
            {/* Traps */}
            <path d="M 85 50 Q 100 60 115 50 L 120 70 Q 100 80 80 70 Z" fill={getColor('traps')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('traps') }} />
            
            {/* Lats */}
            <ellipse cx="70" cy="110" rx="20" ry="45" fill={getColor('lats')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('lats') }} />
            <ellipse cx="130" cy="110" rx="20" ry="45" fill={getColor('lats')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('lats') }} />
            
            {/* Shoulders */}
            <ellipse cx="50" cy="70" rx="18" ry="20" fill={getColor('shoulders')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('shoulders') }} />
            <ellipse cx="150" cy="70" rx="18" ry="20" fill={getColor('shoulders')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('shoulders') }} />
            
            {/* Triceps (back view) */}
            <rect x="155" y="80" width="16" height="50" rx="8" fill={getColor('triceps')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('triceps') }} />
            <rect x="29" y="80" width="16" height="50" rx="8" fill={getColor('triceps')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('triceps') }} />
            
            {/* Glutes */}
            <ellipse cx="85" cy="160" rx="18" ry="22" fill={getColor('glutes')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('glutes') }} />
            <ellipse cx="115" cy="160" rx="18" ry="22" fill={getColor('glutes')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('glutes') }} />
            
            {/* Hamstrings */}
            <rect x="80" y="185" width="20" height="50" rx="8" fill={getColor('hamstrings')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('hamstrings') }} />
            <rect x="100" y="185" width="20" height="50" rx="8" fill={getColor('hamstrings')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('hamstrings') }} />
            
            {/* Calves */}
            <rect x="80" y="240" width="20" height="45" rx="6" fill={getColor('calves')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('calves') }} />
            <rect x="100" y="240" width="20" height="45" rx="6" fill={getColor('calves')} stroke="var(--border)" strokeWidth="1" style={{ filter: getGlow('calves') }} />
          </>
        )}
      </svg>
    </div>
  );
}
