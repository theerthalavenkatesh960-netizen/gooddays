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

  // Keep generous spacing so long timelines stay readable and naturally scroll on mobile.
  const chartWidth = Math.max(560, milestones.length * 140);
  const xStart = 32;
  const xEnd = chartWidth - 32;
  const y = 36;

  const dateLabel = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    const day = parsed.getDate();
    const month = parsed.toLocaleDateString(undefined, { month: 'short' });
    const mod10 = day % 10;
    const mod100 = day % 100;
    let suffix = 'th';
    if (mod10 === 1 && mod100 !== 11) suffix = 'st';
    if (mod10 === 2 && mod100 !== 12) suffix = 'nd';
    if (mod10 === 3 && mod100 !== 13) suffix = 'rd';

    return `${month} ${day}${suffix}`;
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Timeline Container */}
      <div
        style={{
          position: 'relative',
          marginBottom: 24,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
          paddingBottom: 8,
        }}
      >
        {/* Static line with milestone dots and labels */}
        <svg
          style={{
            minWidth: `${chartWidth}px`,
            height: 126,
            display: 'block',
          }}
        >
          {/* Main line */}
          <line
            x1={xStart}
            y1={y}
            x2={xEnd}
            y2={y}
            stroke="var(--border)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Milestone dots + labels */}
          {milestones.map((milestone, idx) => {
            const ratio = milestones.length === 1 ? 0.5 : idx / (milestones.length - 1);
            const x = xStart + ratio * (xEnd - xStart);
            const color = getStatusColor(milestone.status);

            return (
              <g key={idx}>
                {/* Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r="8"
                  fill={color}
                  stroke="var(--surface)"
                  strokeWidth="3"
                />

                {/* Weight label above */}
                <text
                  x={x}
                  y={y - 14}
                  textAnchor="middle"
                  fill="var(--text-primary)"
                  fontSize="11"
                  fontWeight="700"
                >
                  {milestone.estimatedWeightKg} kg
                </text>

                {/* Date label below */}
                <text
                  x={x}
                  y={y + 30}
                  textAnchor="middle"
                  fill="var(--text-secondary)"
                  fontSize="11"
                  fontWeight="700"
                >
                  {dateLabel(milestone.date)}
                </text>
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
