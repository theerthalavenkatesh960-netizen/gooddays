import React from 'react';

export type Milestone = {
  week: number;
  date: string;
  estimatedWeightKg: number;
  status: 'on-track' | 'caution' | 'risky';
  notes?: string;
};

type TimelineChartProps = {
  milestones: Milestone[];
};

export function TimelineChart({ milestones }: TimelineChartProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  if (!milestones || milestones.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No milestones available</p>;
  }

  // Color mapping for status
  const getStatusColor = (status: Milestone['status']) => {
    switch (status) {
      case 'on-track':
        return '#10b981'; // green
      case 'caution':
        return '#f59e0b'; // amber
      case 'risky':
        return '#ef4444'; // red
    }
  };

  const minWeight = Math.min(...milestones.map((m) => m.estimatedWeightKg));
  const maxWeight = Math.max(...milestones.map((m) => m.estimatedWeightKg));
  const weightRange = maxWeight - minWeight || 1;

  return (
    <div style={{ width: '100%' }}>
      {/* Timeline Container */}
      <div
        style={{
          position: 'relative',
          marginBottom: 24,
          overflowX: 'auto',
          paddingBottom: 8,
        }}
      >
        {/* SVG Line */}
        <svg
          style={{
            minWidth: `${Math.max(400, milestones.length * 60)}px`,
            height: 120,
            display: 'block',
          }}
        >
          {/* Baseline */}
          <line
            x1="30"
            y1="60"
            x2={Math.max(400, milestones.length * 60) - 30}
            y2="60"
            stroke="var(--border)"
            strokeWidth="2"
          />

          {/* Dots and Vertical Lines */}
          {milestones.map((milestone, idx) => {
            const x = 30 + idx * 60;
            const y = 60 - ((milestone.estimatedWeightKg - minWeight) / weightRange) * 30;
            const color = getStatusColor(milestone.status);

            return (
              <g key={idx}>
                {/* Vertical line from baseline to dot */}
                <line x1={x} y1="60" x2={x} y2={y} stroke={color} strokeWidth="1" opacity="0.3" />

                {/* Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                  style={{
                    cursor: 'pointer',
                    filter:
                      hoveredIndex === idx ? 'drop-shadow(0 0 8px rgba(0,0,0,0.3))' : 'none',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Tooltip */}
                {hoveredIndex === idx && (
                  <g>
                    {/* Tooltip background */}
                    <rect
                      x={x - 50}
                      y={y - 50}
                      width="100"
                      height="50"
                      rx="4"
                      fill="var(--surface-elevated)"
                      stroke={color}
                      strokeWidth="1"
                    />
                    {/* Text */}
                    <text
                      x={x}
                      y={y - 30}
                      textAnchor="middle"
                      fill="var(--text-primary)"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {milestone.date}
                    </text>
                    <text
                      x={x}
                      y={y - 15}
                      textAnchor="middle"
                      fill="var(--text-secondary)"
                      fontSize="11"
                    >
                      {milestone.estimatedWeightKg} kg
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#10b981',
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>On Track</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Caution</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#ef4444',
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Risky</span>
        </div>
      </div>
    </div>
  );
}
