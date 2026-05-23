import React from 'react';

type MacroChartProps = {
  protein: number;
  carbs: number;
  fat: number;
  unit?: 'g' | '%';
};

export function MacroChart({ protein, carbs, fat, unit = 'g' }: MacroChartProps) {
  const total = protein + carbs + fat || 1;
  const proteinPct = (protein / total) * 100;
  const carbsPct = (carbs / total) * 100;
  const fatPct = (fat / total) * 100;

  return (
    <div style={{ width: '100%' }}>
      {/* Stacked bar */}
      <div
        style={{
          display: 'flex',
          height: 34,
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 10,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        {/* Protein */}
        <div
          style={{
            width: `${proteinPct}%`,
            backgroundColor: '#8b5cf6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 11,
            fontWeight: 'bold',
            minWidth: proteinPct > 15 ? 'auto' : 0,
          }}
        >
          {proteinPct > 15 && 'P'}
        </div>

        {/* Carbs */}
        <div
          style={{
            width: `${carbsPct}%`,
            backgroundColor: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            fontSize: 11,
            fontWeight: 'bold',
            minWidth: carbsPct > 15 ? 'auto' : 0,
          }}
        >
          {carbsPct > 15 && 'C'}
        </div>

        {/* Fat */}
        <div
          style={{
            width: `${fatPct}%`,
            backgroundColor: '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 11,
            fontWeight: 'bold',
            minWidth: fatPct > 15 ? 'auto' : 0,
          }}
        >
          {fatPct > 15 && 'F'}
        </div>
      </div>

      {/* Inline labels and gram counts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#8b5cf6' }}>P</p>
          <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{protein}{unit}</p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#f59e0b' }}>C</p>
          <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{carbs}{unit}</p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#f87171' }}>F</p>
          <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{fat}{unit}</p>
        </div>
      </div>
    </div>
  );
}
