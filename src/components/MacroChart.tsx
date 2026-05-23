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
          height: 40,
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 12,
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

      {/* Legend with values */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ padding: 8, backgroundColor: 'var(--surface-elevated)', borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Protein
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, fontWeight: 'bold', color: '#8b5cf6' }}>
            {protein}{unit}
          </p>
        </div>

        <div style={{ padding: 8, backgroundColor: 'var(--surface-elevated)', borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Carbs
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, fontWeight: 'bold', color: '#fbbf24' }}>
            {carbs}{unit}
          </p>
        </div>

        <div style={{ padding: 8, backgroundColor: 'var(--surface-elevated)', borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Fat
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, fontWeight: 'bold', color: '#f87171' }}>
            {fat}{unit}
          </p>
        </div>
      </div>
    </div>
  );
}
