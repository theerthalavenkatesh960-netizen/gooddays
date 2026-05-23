import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Flame,
  Gauge,
  Lock,
  Salad,
  Save,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

type OptionCardProps = {
  selected: boolean;
  title: string;
  subtitle: string;
  caption?: string;
  onClick: () => void;
  accent?: string;
};

function OptionCard({ selected, title, subtitle, caption, onClick, accent = 'var(--accent)' }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className="text-left p-2.5 rounded-xl transition-all press relative overflow-hidden group"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${accent}33 0%, ${accent}11 100%)`
          : 'var(--surface-elevated)',
        border: selected ? `2px solid ${accent}` : '1px solid var(--border)',
        boxShadow: selected ? `0 12px 32px ${accent}35, inset 0 1px 0 ${accent}33` : 'none',
        transform: selected ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {selected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: accent }}>
          <CheckCircle2 size={14} color="#fff" strokeWidth={3} />
        </div>
      )}
      <p
        className="text-xs font-bold pr-3"
        style={{ color: selected ? accent : 'var(--text-primary)' }}
      >
        {title}
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: selected ? accent + 'cc' : 'var(--text-secondary)' }}>
        {subtitle}
      </p>
      {caption && (
        <p className="text-[9px] mt-1.5" style={{ color: selected ? accent : 'var(--text-muted)' }}>
          {caption}
        </p>
      )}
    </button>
  );
}

function MetricTile({ icon, label, value, subvalue }: { icon: ReactNode; label: string; value: string; subvalue?: string }) {
  return (
    <div
      className="rounded-2xl p-3"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        minHeight: '110px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <div className="flex items-center justify-center gap-1.5 mb-2 flex-wrap">
        <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--surface-elevated)' }}>
          {icon}
        </div>
        <p className="text-[8px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
      </div>
      <div>
        <p className="text-base font-black leading-tight truncate" style={{ color: 'var(--text-primary)', maxWidth: '100%' }}>
          {value}
        </p>
        {subvalue && (
          <p className="text-[9px] mt-1 font-semibold" style={{ color: 'var(--accent)' }}>
            {subvalue}
          </p>
        )}
      </div>
    </div>
  );
}

function nearestFromSet(value: number | undefined, set: number[]): number | undefined {
  if (!value || Number.isNaN(value)) return undefined;
  let nearest = set[0];
  let delta = Math.abs(value - nearest);
  for (const candidate of set) {
    const next = Math.abs(value - candidate);
    if (next < delta) {
      nearest = candidate;
      delta = next;
    }
  }
  return nearest;
}

const calorieOptions = [
  { value: '1500', title: '1500 kcal', subtitle: 'Cut aggressive', caption: 'Fast fat loss', accent: '#FF6B6B' },
  { value: '1800', title: '1800 kcal', subtitle: 'Cut moderate', caption: 'Sustainable', accent: '#F59E0B' },
  { value: '2000', title: '2000 kcal', subtitle: 'Balanced', caption: 'Recomposition', accent: '#10B981' },
  { value: '2400', title: '2400 kcal', subtitle: 'Performance', caption: 'Training fuel', accent: '#3B82F6' },
  { value: '3000', title: '3000+ kcal', subtitle: 'Bulk mode', caption: 'Gain phase', accent: '#8B5CF6' },
] as const;

const budgetOptions = [
  { value: '1000', title: 'Low', subtitle: 'INR 1000 / week', caption: 'Essentials only', accent: '#FF6B6B' },
  { value: '2000', title: 'Moderate', subtitle: 'INR 2000 / week', caption: 'Balanced groceries', accent: '#F59E0B' },
  { value: '4000', title: 'Medium', subtitle: 'INR 4000 / week', caption: 'More variety', accent: '#10B981' },
  { value: '6000', title: 'High', subtitle: 'INR 6000 / week', caption: 'Quality + convenience', accent: '#3B82F6' },
  { value: '10000', title: 'Unlimited', subtitle: 'No strict cap', caption: 'Best fit recommendations', accent: '#8B5CF6' },
] as const;

const activityOptions = [
  { value: 'Sedentary', title: 'Sedentary', subtitle: 'Desk heavy lifestyle', caption: '<4k steps / day', accent: '#FF6B6B' },
  { value: 'Light', title: 'Light', subtitle: 'Some movement', caption: '4-7k steps / day', accent: '#F59E0B' },
  { value: 'Moderate', title: 'Moderate', subtitle: 'Regular workouts', caption: '8-10k steps / day', accent: '#10B981' },
  { value: 'Active', title: 'Active', subtitle: 'Training focused', caption: '1-2 sessions / day', accent: '#3B82F6' },
  { value: 'Very Active', title: 'Very Active', subtitle: 'Athlete mode', caption: 'High output routine', accent: '#8B5CF6' },
] as const;

const dietOptions = [
  { value: 'Vegetarian', title: 'Vegetarian', subtitle: 'Plant-based meals', caption: 'Paneer, lentils, tofu', accent: '#FF6B6B' },
  { value: 'Non-Veg', title: 'Non-Veg', subtitle: 'Mixed protein sources', caption: 'Chicken, fish, eggs', accent: '#F59E0B' },
  { value: 'High-Protein', title: 'High-Protein', subtitle: 'Protein priority', caption: 'Lean body goals', accent: '#10B981' },
  { value: 'Low-Carb', title: 'Low-Carb', subtitle: 'Carb restricted', caption: 'Glycemic control', accent: '#3B82F6' },
  { value: 'Mixed', title: 'Mixed', subtitle: 'Flexible nutrition', caption: 'Most adaptable', accent: '#8B5CF6' },
] as const;

export default function AiPlannerSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingRecommendations, setGettingRecommendations] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'health' | 'provider'>('health');

  const isTestUser = user?.email?.toLowerCase().includes('test');

  const [provider, setProvider] = useState<api.AiProvider>('local-llama');
  const [localEndpoint, setLocalEndpoint] = useState('http://localhost:11434');
  const [localModel, setLocalModel] = useState('llama3.1:8b');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [claudeModel, setClaudeModel] = useState('claude-3-5-sonnet-latest');

  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [dailyCaloriesTarget, setDailyCaloriesTarget] = useState('');
  const [dietPreference, setDietPreference] = useState('');
  const [budgetPerWeek, setBudgetPerWeek] = useState('');
  const [activityLevel, setActivityLevel] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [settings, profile] = await Promise.all([
        api.getAiPlannerSettings(),
        api.getHealthProfile(),
      ]);

      setProvider((settings?.provider || 'local-llama') as api.AiProvider);
      setLocalEndpoint(settings?.localEndpoint || 'http://localhost:11434');
      setLocalModel(settings?.localModel || 'llama3.1:8b');
      setClaudeApiKey(settings?.claudeApiKey || '');
      setClaudeModel(settings?.claudeModel || 'claude-3-5-sonnet-latest');

      setHeightCm(profile?.heightCm ? String(profile.heightCm) : '');
      setWeightKg(profile?.weightKg ? String(profile.weightKg) : '');
      setTargetWeightKg(profile?.targetWeightKg ? String(profile.targetWeightKg) : '');
      setDailyCaloriesTarget(profile?.dailyCaloriesTarget ? String(profile.dailyCaloriesTarget) : '');
      setDietPreference(profile?.dietPreference || '');
      setBudgetPerWeek(profile?.budgetPerWeek ? String(profile.budgetPerWeek) : '');
      setActivityLevel(profile?.activityLevel || '');
    } catch (e: any) {
      setStatus(e?.message || 'Failed to load AI planner settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    setSaving(true);
    try {
      if (isTestUser) {
        await api.updateAiPlannerSettings({
          provider,
          localEndpoint,
          localModel: localModel.trim() || 'llama3.1:8b',
          claudeApiKey: claudeApiKey.trim() || undefined,
          claudeModel: claudeModel.trim() || 'claude-3-5-sonnet-latest',
        });
      }

      await api.updateHealthProfile({
        heightCm: heightCm ? Number(heightCm) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
        dailyCaloriesTarget: dailyCaloriesTarget ? Number(dailyCaloriesTarget) : undefined,
        dietPreference: dietPreference || undefined,
        budgetPerWeek: budgetPerWeek ? Number(budgetPerWeek) : undefined,
        activityLevel: activityLevel || undefined,
      });

      setStatus('Saved');
      setTimeout(() => setStatus(''), 1800);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function getAiRecommendations() {
    if (!heightCm || !weightKg) {
      setStatus('Please update height and weight first');
      setTimeout(() => setStatus(''), 3000);
      return;
    }

    setGettingRecommendations(true);
    try {
      const targetDate = targetWeightKg ? new Date().toISOString().split('T')[0] : undefined;

      const rec = await api.getHealthRecommendations({
        heightCm: heightCm ? Number(heightCm) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
        targetDate,
      });

      const nearestCalories = nearestFromSet(rec.dailyCaloriesTarget, [1500, 1800, 2000, 2400, 3000]);
      const nearestBudget = nearestFromSet(rec.budgetPerWeek, [1000, 2000, 4000, 6000, 10000]);

      if (nearestCalories) setDailyCaloriesTarget(String(nearestCalories));
      if (nearestBudget) setBudgetPerWeek(String(nearestBudget));
      if (rec.activityLevel) setActivityLevel(rec.activityLevel);
      if (rec.dietPreference) setDietPreference(rec.dietPreference);

      setStatus('AI recommendation applied');
      setTimeout(() => setStatus(''), 2200);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to get recommendations');
    } finally {
      setGettingRecommendations(false);
    }
  }

  const metrics = useMemo(() => {
    const h = Number(heightCm);
    const w = Number(weightKg);
    const t = Number(targetWeightKg);

    let bmiLabel = '--';
    let bmiValue = '--';
    let bmiStatus = '';
    if (h > 0 && w > 0) {
      const bmi = w / ((h / 100) * (h / 100));
      bmiValue = bmi.toFixed(1);
      if (bmi < 18.5) {
        bmiLabel = 'Underweight';
        bmiStatus = bmiValue;
      } else if (bmi < 25) {
        bmiLabel = 'Healthy';
        bmiStatus = bmiValue;
      } else if (bmi < 30) {
        bmiLabel = 'Overweight';
        bmiStatus = bmiValue;
      } else {
        bmiLabel = 'Obese';
        bmiStatus = bmiValue;
      }
    }

    let deltaLabel = '--';
    if (w > 0 && t > 0) {
      const delta = Math.abs(w - t).toFixed(1);
      deltaLabel = `${w > t ? '-' : '+'}${delta} kg`;
    }

    return {
      bmiLabel,
      bmiStatus,
      deltaLabel,
      planMode: (dailyCaloriesTarget && activityLevel) ? 'Personalized' : 'Incomplete',
    };
  }, [heightCm, weightKg, targetWeightKg, dailyCaloriesTarget, activityLevel]);

  const profileProgress = useMemo(() => {
    const checks = [
      !!heightCm,
      !!weightKg,
      !!targetWeightKg,
      !!dailyCaloriesTarget,
      !!budgetPerWeek,
      !!activityLevel,
      !!dietPreference,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [heightCm, weightKg, targetWeightKg, dailyCaloriesTarget, budgetPerWeek, activityLevel, dietPreference]);

  if (loading) {
    return (
      <div className="pt-20 flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading AI planner settings...</div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-xl flex items-center justify-center press"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>AI Planner</h1>
      </div>

      <div
        className="rounded-3xl p-4 mb-4 overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-elevated) 100%)',
          border: '1px solid var(--border)',
        }}
      >
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
          style={{ background: 'radial-gradient(circle, var(--accent)30 0%, transparent 70%)' }}
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Health Intelligence</p>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Advanced Personalization</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                AI calibrates calories, activity and budget strategy to your goal.
              </p>
            </div>
            <button
              onClick={getAiRecommendations}
              disabled={gettingRecommendations || !heightCm || !weightKg}
              className="px-6 py-3.5 rounded-2xl text-sm font-black flex items-center gap-2.5 press whitespace-nowrap transition-all"
              style={{
                background: !heightCm || !weightKg ? 'rgba(78, 205, 196, 0.15)' : 'linear-gradient(135deg, #4ECDC4 0%, #1ABC9C 100%)',
                color: !heightCm || !weightKg ? 'var(--text-muted)' : '#fff',
                border: !heightCm || !weightKg ? '1px solid rgba(78, 205, 196, 0.3)' : 'none',
                opacity: gettingRecommendations ? 0.85 : 1,
                boxShadow: !heightCm || !weightKg ? 'none' : '0 12px 32px rgba(78, 205, 196, 0.35)',
              }}
            >
              <Sparkles size={16} /> {gettingRecommendations ? 'Analyzing...' : 'Get AI Plan'}
            </button>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Setup completeness</p>
              <p className="text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>{profileProgress}%</p>
            </div>
            <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${profileProgress}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-green))' }}
              />
            </div>
          </div>
        </div>
      </div>

      {status && (
        <div
          className="mb-4 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
          style={{
            backgroundColor: status.toLowerCase().includes('fail') ? 'rgba(255,107,107,0.12)' : 'rgba(78,205,196,0.12)',
            color: status.toLowerCase().includes('fail') ? '#FF6B6B' : 'var(--accent-green)',
            border: `1px solid ${status.toLowerCase().includes('fail') ? 'rgba(255,107,107,0.3)' : 'rgba(78,205,196,0.3)'}`,
          }}
        >
          {status.toLowerCase().includes('fail') ? <Lock size={14} /> : <CheckCircle2 size={14} />}
          {status}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        <MetricTile icon={<Gauge size={13} style={{ color: 'var(--accent)' }} />} label="Mode" value={metrics.planMode} />
        <MetricTile icon={<TrendingUp size={13} style={{ color: 'var(--accent-green)' }} />} label="Target Delta" value={metrics.deltaLabel} />
        <MetricTile icon={<Activity size={13} style={{ color: 'var(--accent-warm)' }} />} label="BMI" value={metrics.bmiStatus} subvalue={metrics.bmiLabel} />
      </div>

      {isTestUser && (
        <div className="rounded-2xl p-1 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setActiveTab('health')}
              className="py-2.5 rounded-xl text-xs font-semibold press"
              style={{
                backgroundColor: activeTab === 'health' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'health' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              Health Engine
            </button>
            <button
              onClick={() => setActiveTab('provider')}
              className="py-2.5 rounded-xl text-xs font-semibold press"
              style={{
                backgroundColor: activeTab === 'provider' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'provider' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              AI Provider
            </button>
          </div>
        </div>
      )}

      {(activeTab === 'health' || !isTestUser) && (
        <>
          <div className="rounded-3xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent)22' }}>
                <Target size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Physical Baseline</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Core stats used by planning models</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                type="number"
                placeholder="Height cm"
                className="px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
              <input
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                type="number"
                placeholder="Weight kg"
                className="px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
              <input
                value={targetWeightKg}
                onChange={(e) => setTargetWeightKg(e.target.value)}
                type="number"
                placeholder="Target kg"
                className="px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
            </div>
          </div>

          <div className="rounded-3xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-warm)22' }}>
                <Flame size={15} style={{ color: 'var(--accent-warm)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Calories</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Pick intensity based on body-composition goal</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {calorieOptions.map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={dailyCaloriesTarget === opt.value}
                  title={opt.title}
                  subtitle={opt.subtitle}
                  caption={opt.caption}
                  accent={opt.accent}
                  onClick={() => setDailyCaloriesTarget(opt.value)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent)22' }}>
                <Wallet size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Budget / Week</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Controls food recommendation quality and variety</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {budgetOptions.map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={budgetPerWeek === opt.value}
                  title={opt.title}
                  subtitle={opt.subtitle}
                  caption={opt.caption}
                  accent={opt.accent}
                  onClick={() => setBudgetPerWeek(opt.value)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-green)22' }}>
                <Activity size={15} style={{ color: 'var(--accent-green)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Activity Level</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Used for calorie and recovery adjustments</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {activityOptions.map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={activityLevel === opt.value}
                  title={opt.title}
                  subtitle={opt.subtitle}
                  caption={opt.caption}
                  accent={opt.accent}
                  onClick={() => setActivityLevel(opt.value)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-4 mb-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-gold)22' }}>
                <Salad size={15} style={{ color: 'var(--accent-gold)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Diet Preference</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Shapes meal source and macro distribution</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {dietOptions.map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={dietPreference === opt.value}
                  title={opt.title}
                  subtitle={opt.subtitle}
                  caption={opt.caption}
                  accent={opt.accent}
                  onClick={() => setDietPreference(opt.value)}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-4">
            <button
              onClick={getAiRecommendations}
              disabled={gettingRecommendations || !heightCm || !weightKg}
              className="py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2.5 press transition-all"
              style={{
                background: !heightCm || !weightKg ? 'rgba(78, 205, 196, 0.15)' : 'linear-gradient(135deg, #4ECDC4 0%, #1ABC9C 100%)',
                color: !heightCm || !weightKg ? 'var(--text-muted)' : '#fff',
                border: !heightCm || !weightKg ? '1px solid rgba(78, 205, 196, 0.3)' : 'none',
                opacity: gettingRecommendations ? 0.85 : 1,
                boxShadow: !heightCm || !weightKg ? 'none' : '0 12px 32px rgba(78, 205, 196, 0.35)',
              }}
            >
              <Sparkles size={17} /> {gettingRecommendations ? 'Analyzing...' : 'Get AI Plan'}
            </button>

            <button
              onClick={saveAll}
              disabled={saving}
              className="py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 press transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent)dd)',
                color: '#fff',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.15)',
              }}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Setup'}
            </button>
          </div>
        </>
      )}

      {isTestUser && activeTab === 'provider' && (
        <div className="rounded-3xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent)22' }}>
              <Brain size={15} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Provider Configuration</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Visible only for test users</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <OptionCard
              selected={provider === 'local-llama'}
              title="Local Llama"
              subtitle="Self-hosted endpoint"
              caption="Runs on your machine"
              accent="#3B82F6"
              onClick={() => setProvider('local-llama')}
            />
            <OptionCard
              selected={provider === 'claude'}
              title="Claude"
              subtitle="Anthropic cloud"
              caption="External API"
              accent="#8B5CF6"
              onClick={() => setProvider('claude')}
            />
          </div>

          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Local Endpoint</label>
          <input
            value={localEndpoint}
            onChange={(e) => setLocalEndpoint(e.target.value)}
            placeholder="http://localhost:11434"
            className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-3"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />

          {provider === 'local-llama' && (
            <>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Local Model</label>
              <select
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                <option value="llama3.1:8b">llama3.1:8b</option>
                <option value="llama3.2">llama3.2</option>
                <option value="llama3.1:70b">llama3.1:70b</option>
              </select>
            </>
          )}

          {provider === 'claude' && (
            <>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Claude Model</label>
              <select
                value={claudeModel}
                onChange={(e) => setClaudeModel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-3"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                <option value="claude-3-5-sonnet-latest">claude-3-5-sonnet-latest</option>
                <option value="claude-3-7-sonnet-latest">claude-3-7-sonnet-latest</option>
                <option value="claude-3-5-haiku-latest">claude-3-5-haiku-latest</option>
              </select>

              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Claude API Key</label>
              <input
                value={claudeApiKey}
                onChange={(e) => setClaudeApiKey(e.target.value)}
                type="password"
                placeholder="sk-ant-..."
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
            </>
          )}

          <button
            onClick={saveAll}
            disabled={saving}
            className="w-full mt-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 press"
            style={{ backgroundColor: 'var(--accent)', color: '#fff', opacity: saving ? 0.7 : 1 }}
          >
            <Save size={15} /> {saving ? 'Saving...' : 'Save Provider'}
          </button>
        </div>
      )}
    </div>
  );
}
