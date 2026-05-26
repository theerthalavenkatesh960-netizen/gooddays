import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';

type DashboardPreset = 'balanced' | 'discipline' | 'health-first' | 'wealth-first' | 'custom';

const DASHBOARD_PRESETS: Array<{ id: DashboardPreset; label: string; weights: api.UserSettings['dashboardWeights'] }> = [
  { id: 'balanced', label: 'Balanced', weights: { tasks: 35, routine: 20, body: 15, workout: 15, finance: 10, journal: 5 } },
  { id: 'discipline', label: 'Discipline', weights: { tasks: 45, routine: 25, body: 10, workout: 10, finance: 5, journal: 5 } },
  { id: 'health-first', label: 'Health First', weights: { tasks: 20, routine: 20, body: 25, workout: 20, finance: 5, journal: 10 } },
  { id: 'wealth-first', label: 'Wealth First', weights: { tasks: 25, routine: 10, body: 10, workout: 10, finance: 35, journal: 10 } },
  { id: 'custom', label: 'Custom', weights: { tasks: 35, routine: 20, body: 15, workout: 15, finance: 10, journal: 5 } },
];

export default function DashboardMomentumSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dashboardPreset, setDashboardPreset] = useState<DashboardPreset>('balanced');
  const [dashboardWeights, setDashboardWeights] = useState<api.UserSettings['dashboardWeights']>({
    tasks: 35, routine: 20, body: 15, workout: 15, finance: 10, journal: 5,
  });
  const [initialPreset, setInitialPreset] = useState<DashboardPreset>('balanced');
  const [initialWeights, setInitialWeights] = useState<api.UserSettings['dashboardWeights']>({
    tasks: 35, routine: 20, body: 15, workout: 15, finance: 10, journal: 5,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await api.getUserSettings();
        const nextPreset = (settings?.dashboardPreset ?? 'balanced') as DashboardPreset;
        const nextWeights = settings?.dashboardWeights ?? {
          tasks: 35, routine: 20, body: 15, workout: 15, finance: 10, journal: 5,
        };
        setDashboardPreset(nextPreset);
        setDashboardWeights(nextWeights);
        setInitialPreset(nextPreset);
        setInitialWeights(nextWeights);
      } catch {
        // Keep defaults when settings are unavailable.
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const applyDashboardPreset = (preset: DashboardPreset) => {
    const selected = DASHBOARD_PRESETS.find(p => p.id === preset);
    if (!selected) return;
    setDashboardPreset(preset);
    if (preset !== 'custom') setDashboardWeights(selected.weights);
  };

  const updateDashboardWeight = (key: keyof api.UserSettings['dashboardWeights'], nextValue: number) => {
    const bounded = Math.max(0, Math.min(100, Math.round(nextValue)));
    const next = { ...dashboardWeights, [key]: bounded };
    setDashboardWeights(next);
    setDashboardPreset('custom');
  };

  const hasChanges =
    dashboardPreset !== initialPreset
    || (Object.keys(dashboardWeights) as Array<keyof api.UserSettings['dashboardWeights']>)
      .some(k => dashboardWeights[k] !== initialWeights[k]);

  const saveChanges = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      await api.updateUserSettings({
        dashboardPreset,
        dashboardWeights,
      });
      setInitialPreset(dashboardPreset);
      setInitialWeights(dashboardWeights);
    } catch {
      // Keep draft values; user can retry save.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard Momentum</h1>
      </div>

      <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        {loading ? (
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Loading settings...</p>
        ) : null}
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Scoring preset</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {DASHBOARD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyDashboardPreset(preset.id)}
              className="h-9 rounded-xl text-xs font-semibold press"
              style={{
                backgroundColor: dashboardPreset === preset.id ? 'var(--accent)' : 'var(--surface-elevated)',
                color: dashboardPreset === preset.id ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {(Object.keys(dashboardWeights) as Array<keyof api.UserSettings['dashboardWeights']>).map((key) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{key.replace('-', ' ')}</span>
                <span className="text-xs num" style={{ color: 'var(--text-muted)' }}>{dashboardWeights[key]}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={dashboardWeights[key]}
                onChange={(e) => updateDashboardWeight(key, Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xs" style={{ color: hasChanges ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
            {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
          </span>
          <button
            onClick={saveChanges}
            disabled={!hasChanges || saving || loading}
            className="h-9 px-4 rounded-xl text-xs font-semibold press disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
