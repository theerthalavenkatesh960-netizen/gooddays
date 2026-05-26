import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import * as api from '../lib/api';

type StatsPayload = {
  templateId: number;
  title: string;
  totalCompletions: number;
  totalDaysLogged: number;
  completionRate: number;
  lastCompleted: string | null;
  currentStreak: number;
  dailyCompletions: Array<{ date: string }>;
};

export default function BlockTemplateStatsModal({
  templateId,
  onClose,
}: {
  templateId: number;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsPayload | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const data = await (api as any).getBlockTemplateStats(templateId, 90);
        if (!mounted) return;
        setStats(data as StatsPayload);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [templateId]);

  const completionSet = useMemo(() => {
    const set = new Set<string>();
    (stats?.dailyCompletions ?? []).forEach(d => set.add(d.date));
    return set;
  }, [stats]);

  const last30Days = useMemo(() => {
    const rows: Array<{ date: string; hit: boolean }> = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      rows.push({ date: key, hit: completionSet.has(key) });
    }
    return rows;
  }, [completionSet]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-4"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            Block Stats
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg press" style={{ color: 'var(--text-muted)' }}>
            <X size={15} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-6 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--surface-elevated)' }} />
            <div className="h-6 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--surface-elevated)' }} />
            <div className="h-24 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--surface-elevated)' }} />
          </div>
        ) : stats ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.title}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Last 90 days</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Completions" value={String(stats.totalCompletions)} />
              <StatCard label="Completion Rate" value={`${stats.completionRate}%`} />
              <StatCard label="Days Logged" value={String(stats.totalDaysLogged)} />
              <StatCard label="Current Streak" value={`${stats.currentStreak}d`} />
            </div>

            <div className="rounded-xl p-2" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Last 30 days</p>
              <div className="grid grid-cols-10 gap-1">
                {last30Days.map(d => (
                  <div
                    key={d.date}
                    title={d.date}
                    className="w-full aspect-square rounded-[4px]"
                    style={{
                      backgroundColor: d.hit ? 'var(--accent)' : 'var(--surface)',
                      border: `1px solid ${d.hit ? 'var(--accent)' : 'var(--border)'}`,
                      opacity: d.hit ? 1 : 0.6,
                    }}
                  />
                ))}
              </div>
            </div>

            {stats.lastCompleted && (
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Last completed: {stats.lastCompleted}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Unable to load stats.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-2 py-2" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}
