import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, User, Moon, Palette, Download,
  Upload, LogOut, Bell, Shield, Target, Dumbbell,
  Check, Sun, Droplets, BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContextApi';
import { useTheme } from '../contexts/ThemeContext';
import * as api from '../lib/api';

type Theme = 'light' | 'dark' | 'blue' | 'green' | 'ocean' | 'futuristic';
type DashboardPreset = 'balanced' | 'discipline' | 'health-first' | 'wealth-first' | 'custom';

const DASHBOARD_PRESETS: Array<{ id: DashboardPreset; label: string; weights: api.UserSettings['dashboardWeights'] }> = [
  { id: 'balanced', label: 'Balanced', weights: { tasks: 35, routine: 20, body: 15, workout: 15, finance: 10, journal: 5 } },
  { id: 'discipline', label: 'Discipline', weights: { tasks: 45, routine: 25, body: 10, workout: 10, finance: 5, journal: 5 } },
  { id: 'health-first', label: 'Health First', weights: { tasks: 20, routine: 20, body: 25, workout: 20, finance: 5, journal: 10 } },
  { id: 'wealth-first', label: 'Wealth First', weights: { tasks: 25, routine: 10, body: 10, workout: 10, finance: 35, journal: 10 } },
  { id: 'custom', label: 'Custom', weights: { tasks: 35, routine: 20, body: 15, workout: 15, finance: 10, journal: 5 } },
];

const THEMES: { id: Theme; label: string; accent: string; bg: string }[] = [
  { id: 'dark',        label: 'Dark',        accent: '#6C63FF', bg: '#0A0A0F' },
  { id: 'futuristic',  label: 'Futuristic',  accent: '#8B7CF8', bg: '#04040A' },
  { id: 'light',       label: 'Light',       accent: '#5B52F0', bg: '#F5F5F7' },
  { id: 'blue',        label: 'Ocean Blue',  accent: '#3B82F6', bg: '#080D14' },
  { id: 'green',       label: 'Forest',      accent: '#10B981', bg: '#060D0A' },
  { id: 'ocean',       label: 'Teal',        accent: '#06B6D4', bg: '#060A0D' },
];

function SettingRow({ icon: Icon, label, value, onPress, color }: {
  icon: React.ElementType;
  label: string;
  value?: string;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 p-4 press"
      style={{ minHeight: 52 }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (color ?? 'var(--accent)') + '22' }}>
        <Icon size={18} style={{ color: color ?? 'var(--accent)' }} />
      </div>
      <span className="flex-1 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
      {value && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{value}</span>}
      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="section-label px-4 mb-2">{title}</p>
      <div className="rounded-2xl overflow-hidden divide-y" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [calorieGoal, setCalorieGoal] = useState('2400');
  const [trackingOptions, setTrackingOptions] = useState<string[]>(['sleep_hours','workout_minutes','phone_minutes']);
  const [dashboardPreset, setDashboardPreset] = useState<DashboardPreset>('balanced');
  const [dashboardWeights, setDashboardWeights] = useState<api.UserSettings['dashboardWeights']>({
    tasks: 35, routine: 20, body: 15, workout: 15, finance: 10, journal: 5,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await api.getUserSettings();
        if (settings?.trackingOptions) setTrackingOptions(settings.trackingOptions);
        if (Number.isFinite(settings?.calorieGoal)) setCalorieGoal(String(settings.calorieGoal));
        if (settings?.dashboardPreset) setDashboardPreset(settings.dashboardPreset);
        if (settings?.dashboardWeights) setDashboardWeights(settings.dashboardWeights);
      } catch {
        // Keep existing defaults when API settings are unavailable.
      }
    }
    loadSettings();
  }, []);

  const toggleTrackOpt = async (opt: string) => {
    const next = trackingOptions.includes(opt)
      ? trackingOptions.filter(o => o !== opt)
      : [...trackingOptions, opt];
    setTrackingOptions(next);
    try {
      await api.updateUserSettings({ trackingOptions: next });
    } catch {
      // Keep optimistic UI; next settings refresh will reconcile state.
    }
  };

  const persistCalorieGoal = async () => {
    const parsed = Number(calorieGoal || 2400);
    if (!Number.isFinite(parsed)) return;
    try {
      const updated = await api.updateUserSettings({ calorieGoal: parsed });
      setCalorieGoal(String(updated.calorieGoal));
    } catch {
      // Keep UI value; next settings refresh will reconcile state.
    }
  };

  const applyDashboardPreset = async (preset: DashboardPreset) => {
    const selected = DASHBOARD_PRESETS.find(p => p.id === preset);
    if (!selected) return;
    setDashboardPreset(preset);
    if (preset !== 'custom') setDashboardWeights(selected.weights);
    try {
      await api.updateUserSettings({
        dashboardPreset: preset,
        dashboardWeights: preset === 'custom' ? dashboardWeights : selected.weights,
      });
    } catch {
      // Keep optimistic UI; refresh will reconcile state.
    }
  };

  const updateDashboardWeight = async (key: keyof api.UserSettings['dashboardWeights'], nextValue: number) => {
    const bounded = Math.max(0, Math.min(100, Math.round(nextValue)));
    const next = { ...dashboardWeights, [key]: bounded };
    setDashboardWeights(next);
    setDashboardPreset('custom');
    try {
      await api.updateUserSettings({ dashboardPreset: 'custom', dashboardWeights: next });
    } catch {
      // Keep optimistic UI; refresh will reconcile state.
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const exportData = () => {
    const data = { user, theme, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'gooddays-backup.json'; a.click();
  };

  const TRACK_OPTS = [
    { id: 'sleep_hours',      label: 'Sleep',   icon: Moon,    color: '#6C63FF' },
    { id: 'workout_minutes',  label: 'Workout', icon: Dumbbell,color: '#FF6B6B' },
    { id: 'phone_minutes',    label: 'Phone',   icon: Bell,    color: '#8888A0' },
    { id: 'mood',             label: 'Mood',    icon: Sun,     color: '#FFD93D' },
    { id: 'water',            label: 'Water',   icon: Droplets,color: '#06B6D4' },
  ];

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 mb-5">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
      </div>

      {/* Profile */}
      <div className="mx-4 mb-5 p-4 rounded-2xl flex items-center gap-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0" style={{ backgroundColor: 'var(--accent)22', color: 'var(--accent)' }}>
          {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{user?.name ?? 'User'}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
        </div>
        <button className="ml-auto press p-2">
          <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Appearance — Theme */}
      <div className="mb-5">
        <p className="section-label px-4 mb-3">Appearance</p>
        <div className="grid grid-cols-3 gap-3 px-4">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="p-3 rounded-2xl press flex flex-col items-center gap-2"
              style={{
                backgroundColor: t.bg,
                border: `2px solid ${theme === t.id ? t.accent : 'var(--border)'}`,
              }}
            >
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: t.accent }} />
              <span className="text-[11px] font-medium" style={{ color: theme === t.id ? t.accent : '#888' }}>
                {t.label}
              </span>
              {theme === t.id && (
                <div className="absolute bottom-2 right-2">
                  <Check size={10} style={{ color: t.accent }} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Daily Tracking */}
      <div className="mb-5">
        <p className="section-label px-4 mb-2">Daily Tracking Metrics</p>
        <div className="px-4">
          <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="grid grid-cols-3 gap-2">
              {TRACK_OPTS.map(opt => {
                const Icon = opt.icon;
                const on = trackingOptions.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleTrackOpt(opt.id)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl press"
                    style={{
                      backgroundColor: on ? opt.color + '22' : 'var(--surface-elevated)',
                      border: `1px solid ${on ? opt.color + '66' : 'var(--border)'}`,
                    }}
                  >
                    <Icon size={18} style={{ color: on ? opt.color : 'var(--text-muted)' }} />
                    <span className="text-[11px] font-medium" style={{ color: on ? opt.color : 'var(--text-muted)' }}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard */}
      <div className="mb-5">
        <p className="section-label px-4 mb-2">Dashboard Momentum</p>
        <div className="px-4">
          <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
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

            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Weight tuning ({dashboardPreset === 'custom' ? 'custom' : 'preset'})</p>
            <div className="space-y-2">
              {(Object.keys(dashboardWeights) as Array<keyof api.UserSettings['dashboardWeights']>).map((key) => (
                <div key={key} className="rounded-xl p-2.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold capitalize" style={{ color: 'var(--text-secondary)' }}>{key}</span>
                    <span className="text-[11px] font-bold num" style={{ color: 'var(--text-primary)' }}>{dashboardWeights[key]}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={dashboardWeights[key]}
                    onChange={(e) => updateDashboardWeight(key, Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Nutrition */}
      <SectionCard title="Nutrition">
        <div className="flex items-center gap-3 p-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-warm)22' }}>
            <Target size={18} style={{ color: 'var(--accent-warm)' }} />
          </div>
          <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Daily Calorie Goal</span>
          <input
            type="number"
            inputMode="numeric"
            value={calorieGoal}
            onChange={e => setCalorieGoal(e.target.value)}
            onBlur={persistCalorieGoal}
            className="w-20 text-right text-sm font-bold num outline-none bg-transparent"
            style={{ color: 'var(--text-primary)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>kcal</span>
        </div>
        <SettingRow icon={BookOpen} label="Meals, Ingredients & Recipes" onPress={() => navigate('/settings/meals')} color="var(--accent-warm)" />
      </SectionCard>

      {/* Workout */}
      <SectionCard title="Workout">
        <SettingRow icon={Dumbbell} label="Workout Library & Weekly Routine" onPress={() => navigate('/settings/workout-library')} color="var(--accent)" />
      </SectionCard>

      {/* Data */}
      <SectionCard title="Data">
        <SettingRow icon={Download} label="Export Backup" onPress={exportData} color="var(--accent-green)" />
        <SettingRow icon={Upload}   label="Import Backup" color="var(--accent-green)" />
      </SectionCard>

      {/* Account */}
      <SectionCard title="Account">
        <SettingRow icon={Shield} label="Security & Privacy" />
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 p-4 press"
          style={{ minHeight: 52 }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-warm)22' }}>
            <LogOut size={18} style={{ color: 'var(--accent-warm)' }} />
          </div>
          <span className="flex-1 text-left text-sm font-medium" style={{ color: 'var(--accent-warm)' }}>Sign Out</span>
        </button>
      </SectionCard>

      <p className="text-center text-[10px] pb-4" style={{ color: 'var(--text-muted)' }}>GoodDays · v1.0</p>
    </div>
  );
}
