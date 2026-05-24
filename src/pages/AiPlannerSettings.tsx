import { useEffect, useMemo, useRef, useState } from 'react';
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
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';
import { OptimizeWizard } from '../components/OptimizeWizard';
import { AiBadge } from '../components/AiBadge';

// ─── Drum / Scroll Picker (Apple-style) ──────────────────────────────────────
type AppliedRecommendations = {
  dailyCaloriesTarget?: boolean;
  activityLevel?: boolean;
  dietPreference?: boolean;
  budgetPerWeek?: boolean;
};

const ITEM_H = 34;
const VISIBLE = 3; // odd number — selected item is in the center

type DrumPickerProps = {
  label: string;
  value: string;
  options: (string | number)[];
  unit?: string;
  onChange: (v: string) => void;
};

function DrumPicker({ label, value, options, unit, onChange }: DrumPickerProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScroll = useRef(0);

  const selectedIndex = options.findIndex((o) => String(o) === value);

  // Scroll to selected value on mount / external change
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const idx = Math.max(0, selectedIndex);
    el.scrollTop = idx * ITEM_H;
  }, [selectedIndex]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const snapped = Math.max(0, Math.min(idx, options.length - 1));
    const v = String(options[snapped]);
    if (v !== value) onChange(v);
  }

  // Snap after scroll ends
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onScroll() {
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      handleScroll();
      // smoothly snap
      const el = listRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_H);
      el.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
    }, 80);
  }

  // Touch / mouse drag support
  function onPointerDown(e: React.PointerEvent) {
    isDragging.current = true;
    startY.current = e.clientY;
    startScroll.current = listRef.current?.scrollTop ?? 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging.current || !listRef.current) return;
    const delta = startY.current - e.clientY;
    listRef.current.scrollTop = startScroll.current + delta;
  }
  function onPointerUp() {
    isDragging.current = false;
    handleScroll();
    const el = listRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_H);
    el.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
  }

  const containerH = ITEM_H * VISIBLE;
  const paddingItems = Math.floor(VISIBLE / 2);

  return (
    <div className="flex flex-col items-center gap-1 select-none" style={{ minWidth: 80 }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          width: 80,
          height: containerH,
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Fade top */}
        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none" style={{ height: ITEM_H * paddingItems, background: 'linear-gradient(to bottom, var(--surface-elevated) 0%, transparent 100%)' }} />
        {/* Selection highlight */}
        <div className="absolute left-0 right-0 z-10 pointer-events-none rounded-xl mx-1" style={{ top: ITEM_H * paddingItems, height: ITEM_H, background: 'var(--accent)18', border: '1px solid var(--accent)44' }} />
        {/* Fade bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none" style={{ height: ITEM_H * paddingItems, background: 'linear-gradient(to top, var(--surface-elevated) 0%, transparent 100%)' }} />

        {/* Scrollable list */}
        <div
          ref={listRef}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute inset-0 overflow-y-scroll"
          style={{ scrollbarWidth: 'none', cursor: 'grab' }}
        >
          {/* top padding */}
          {Array.from({ length: paddingItems }).map((_, i) => (
            <div key={`t${i}`} style={{ height: ITEM_H }} />
          ))}
          {options.map((opt) => {
            const isSelected = String(opt) === value;
            return (
              <div
                key={opt}
                style={{
                  height: ITEM_H,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isSelected ? 15 : 13,
                  fontWeight: isSelected ? 700 : 400,
                  color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                  opacity: isSelected ? 1 : 0.22,
                  transition: 'all 0.15s',
                }}
              >
                {isSelected ? opt : '·'}
                {unit && isSelected ? <span style={{ fontSize: 10, marginLeft: 2, color: 'var(--text-muted)' }}>{unit}</span> : null}
              </div>
            );
          })}
          {/* bottom padding */}
          {Array.from({ length: paddingItems }).map((_, i) => (
            <div key={`b${i}`} style={{ height: ITEM_H }} />
          ))}
        </div>
      </div>
      <p className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
        {value || '—'}{unit ? <span style={{ fontSize: 9, color: 'var(--text-muted)' }}> {unit}</span> : null}
      </p>
    </div>
  );
}

// Height options: 100–250 cm
const HEIGHT_OPTIONS = Array.from({ length: 151 }, (_, i) => 100 + i);
// Weight options: 30–200 kg (0.1 kg steps)
const WEIGHT_OPTIONS = Array.from({ length: 1701 }, (_, i) => +(30 + i * 0.1).toFixed(1));

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
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [medicalConditions, setMedicalConditions] = useState<api.MedicalCondition[]>([]);
  const [addingCondition, setAddingCondition] = useState(false);
  const [newCondition, setNewCondition] = useState<Partial<api.MedicalCondition>>({
    condition_name: '',
    status: 'active',
    severity: 'mild',
    notes: '',
    diet_restrictions: [],
    exercise_limits: [],
    medications_affecting_plan: [],
  });
  const [newDietRestriction, setNewDietRestriction] = useState('');
  const [newExerciseLimit, setNewExerciseLimit] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [dailyCaloriesTarget, setDailyCaloriesTarget] = useState('');
  const [dietPreference, setDietPreference] = useState('');
  const [budgetPerWeek, setBudgetPerWeek] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [aiRecommendation, setAiRecommendation] = useState<api.HealthRecommendation | null>(null);
  const [showOptimizeWizard, setShowOptimizeWizard] = useState(false);
  const [appliedRecommendations, setAppliedRecommendations] = useState<AppliedRecommendations>({});

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
      setAge(profile?.age ? String(profile.age) : '');
      setGender(profile?.gender || '');
      setMedicalConditions(profile?.medicalConditions || []);
      const normalizedTargetDate = typeof profile?.targetDate === 'string'
        ? profile.targetDate.slice(0, 10)
        : '';
      setTargetDate(normalizedTargetDate);
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
        age: age ? Number(age) : undefined,
        gender: gender || undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
        dailyCaloriesTarget: dailyCaloriesTarget ? Number(dailyCaloriesTarget) : undefined,
        dietPreference: dietPreference || undefined,
        budgetPerWeek: budgetPerWeek ? Number(budgetPerWeek) : undefined,
        activityLevel: activityLevel || undefined,
        medicalConditions: medicalConditions.length > 0 ? medicalConditions : undefined,
        targetDate: targetDate || undefined,
      });

      setStatus('Saved');
      setTimeout(() => setStatus(''), 1800);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const handleApplyRecommendations = (recommendations: AppliedRecommendations, result: api.HealthRecommendation) => {
    const rec = result.analysis?.recommendation;

    // Apply selected recommendations
    if (recommendations.dailyCaloriesTarget) {
      const calories = rec?.daily_calories ?? result.dailyCaloriesTarget;
      if (calories) setDailyCaloriesTarget(String(calories));
    }
    if (recommendations.activityLevel) {
      const activity = rec?.activity_level ?? result.activityLevel;
      if (activity) {
        // Normalize to title-case to match option values (e.g. "sedentary" → "Sedentary")
        const normalizeActivity = (val: string) => {
          const known = activityOptions.map((o) => o.value);
          const match = known.find((k) => k.toLowerCase() === val.toLowerCase());
          return match ?? (val.charAt(0).toUpperCase() + val.slice(1).toLowerCase());
        };
        setActivityLevel(normalizeActivity(activity));
      }
    }
    if (recommendations.dietPreference) {
      const diet = result.dietPreference;
      if (diet) setDietPreference(diet);
    }
    if (recommendations.budgetPerWeek) {
      const budget = result.budgetPerWeek;
      if (budget) setBudgetPerWeek(String(budget));
    }

    // Keep analysis cards in sync with wizard output
    setAiRecommendation(result);

    // Track applied recommendations for badge display
    setAppliedRecommendations(recommendations);

    setStatus('Recommendations applied');
    setTimeout(() => setStatus(''), 2200);
  };

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

  const aiSummary = useMemo(() => {
    if (!aiRecommendation?.analysis) return null;

    const analysis = aiRecommendation.analysis;
    const goal = typeof analysis.goal_type === 'string' && analysis.goal_type
      ? analysis.goal_type.charAt(0).toUpperCase() + analysis.goal_type.slice(1)
      : '--';

    const weeklyRate = typeof analysis.weekly_change_needed_kg === 'number'
      ? `${analysis.weekly_change_needed_kg.toFixed(2)} kg/wk`
      : '--';

    const calories = analysis.recommendation?.daily_calories ?? aiRecommendation.dailyCaloriesTarget;
    const activity = analysis.recommendation?.activity_level ?? aiRecommendation.activityLevel;

    return {
      feasible: analysis.feasible,
      goal,
      weeklyRate,
      calories: calories ? `${calories} kcal` : '--',
      activity: activity || '--',
    };
  }, [aiRecommendation]);

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
          <div className="flex items-start gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Health Intelligence</p>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Advanced Personalization</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                AI calibrates calories, activity and budget strategy to your goal.
              </p>
            </div>
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

          {aiSummary && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div
                className="rounded-xl px-2.5 py-2"
                style={{
                  backgroundColor: aiSummary.feasible ? 'rgba(78,205,196,0.12)' : 'rgba(255,107,107,0.12)',
                  border: `1px solid ${aiSummary.feasible ? 'rgba(78,205,196,0.3)' : 'rgba(255,107,107,0.3)'}`,
                }}
              >
                <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Feasibility</p>
                <p className="text-xs font-bold" style={{ color: aiSummary.feasible ? 'var(--accent-green)' : '#FF6B6B' }}>
                  {aiSummary.feasible ? 'Feasible' : 'Infeasible'}
                </p>
              </div>

              <div className="rounded-xl px-2.5 py-2" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Goal / Rate</p>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{aiSummary.goal} · {aiSummary.weeklyRate}</p>
              </div>

              <div className="rounded-xl px-2.5 py-2" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Calories</p>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{aiSummary.calories}</p>
              </div>

              <div className="rounded-xl px-2.5 py-2" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Activity</p>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{aiSummary.activity}</p>
              </div>
            </div>
          )}
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

      {aiRecommendation?.analysis && (
        <div className="rounded-3xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI Analysis Details</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Detailed output from your advanced prompt</p>
            </div>
            <span
              className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase"
              style={{
                backgroundColor: aiRecommendation.analysis.feasible ? 'rgba(78,205,196,0.15)' : 'rgba(255,107,107,0.15)',
                color: aiRecommendation.analysis.feasible ? 'var(--accent-green)' : '#FF6B6B',
                border: `1px solid ${aiRecommendation.analysis.feasible ? 'rgba(78,205,196,0.3)' : 'rgba(255,107,107,0.3)'}`,
              }}
            >
              {aiRecommendation.analysis.feasible ? 'Feasible' : 'Infeasible'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-xl p-2" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Goal Type</p>
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{aiRecommendation.analysis.goal_type || aiRecommendation.goalType || '--'}</p>
            </div>
            <div className="rounded-xl p-2" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Days Remaining</p>
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{aiRecommendation.analysis.days_remaining ?? '--'}</p>
            </div>
            <div className="rounded-xl p-2" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>BMI / BMR</p>
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                {(aiRecommendation.analysis.bmi ?? '--')} / {(aiRecommendation.analysis.bmr ?? '--')}
              </p>
            </div>
            <div className="rounded-xl p-2" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>TDEE / Weekly Change</p>
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                {(aiRecommendation.analysis.tdee ?? '--')} / {(aiRecommendation.analysis.weekly_change_needed_kg ?? '--')} kg
              </p>
            </div>
          </div>

          {aiRecommendation.analysis.recommendation?.macros && (
            <div className="rounded-2xl p-3 mb-3" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Macro Split</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--surface)' }}>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Protein</p>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{aiRecommendation.analysis.recommendation.macros.protein_g ?? '--'} g</p>
                </div>
                <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--surface)' }}>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Carbs</p>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{aiRecommendation.analysis.recommendation.macros.carbs_g ?? '--'} g</p>
                </div>
                <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--surface)' }}>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Fat</p>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{aiRecommendation.analysis.recommendation.macros.fat_g ?? '--'} g</p>
                </div>
              </div>
            </div>
          )}

          {!!aiRecommendation.analysis.recommendation?.warnings?.length && (
            <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#F59E0B' }}>Warnings</p>
              {aiRecommendation.analysis.recommendation.warnings.map((w, idx) => (
                <p key={`${w}-${idx}`} className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{w}</p>
              ))}
            </div>
          )}

          {!!aiRecommendation.analysis.recommendation?.milestones?.length && (
            <div className="rounded-2xl p-3 mb-3" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Milestones</p>
              <div className="space-y-1.5">
                {aiRecommendation.analysis.recommendation.milestones.map((m, idx) => (
                  <div key={`${m.date}-${idx}`} className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    <span>{m.date || '--'}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{m.expected_weight_kg ?? '--'} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiRecommendation.analysis.alternative_plan && (
            <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#3B82F6' }}>Alternative Plan</p>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Safe Target Date: {aiRecommendation.analysis.alternative_plan.safe_target_date || '--'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Safe Weekly Rate: {aiRecommendation.analysis.alternative_plan.safe_weekly_rate_kg ?? '--'} kg
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-primary)' }}>
                {aiRecommendation.analysis.alternative_plan.interim_focus || '--'}
              </p>
            </div>
          )}
        </div>
      )}

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

            <button
              onClick={() => setShowOptimizeWizard(true)}
              disabled={!heightCm || !weightKg || !targetWeightKg}
              className="w-full px-4 py-2.5 rounded-xl text-xs font-bold mb-3 press transition-all flex items-center justify-center gap-2"
              style={{
                background: (!heightCm || !weightKg || !targetWeightKg) ? 'rgba(139, 92, 246, 0.15)' : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                color: (!heightCm || !weightKg || !targetWeightKg) ? 'var(--text-muted)' : '#fff',
                border: (!heightCm || !weightKg || !targetWeightKg) ? '1px solid rgba(139, 92, 246, 0.3)' : 'none',
                boxShadow: (!heightCm || !weightKg || !targetWeightKg) ? 'none' : '0 8px 20px rgba(139, 92, 246, 0.25)',
              }}
            >
              <Brain size={15} /> Optimize with AI
            </button>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                type="number"
                placeholder="Age"
                className="px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex justify-around gap-2 mt-2">
              <DrumPicker
                label="Height"
                value={heightCm}
                options={HEIGHT_OPTIONS}
                unit="cm"
                onChange={setHeightCm}
              />
              <DrumPicker
                label="Weight"
                value={weightKg}
                options={WEIGHT_OPTIONS}
                unit="kg"
                onChange={setWeightKg}
              />
              <DrumPicker
                label="Target"
                value={targetWeightKg}
                options={WEIGHT_OPTIONS}
                unit="kg"
                onChange={setTargetWeightKg}
              />
            </div>

            {/* Target Date */}
            <div className="mt-3 flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Target Date</p>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', colorScheme: 'dark' }}
              />
              {targetDate && (
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000)} days from today
                </p>
              )}
            </div>

            {/* Medical Conditions */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Medical Conditions
                  {medicalConditions.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--accent)22', color: 'var(--accent)' }}>
                      {medicalConditions.length}
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setAddingCondition((v) => !v)}
                  className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors"
                  style={{ background: 'var(--accent)22', color: 'var(--accent)' }}
                >
                  {addingCondition ? 'Cancel' : '+ Add Condition'}
                </button>
              </div>

              {/* Existing condition cards */}
              {medicalConditions.length > 0 && (
                <div className="flex flex-col gap-2 mb-2">
                  {medicalConditions.map((cond, idx) => (
                    <div key={idx} className="rounded-xl p-3 text-xs" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{cond.condition_name}</p>
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent)22', color: 'var(--accent)', fontSize: '10px' }}>{cond.status}</span>
                            <span className="px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-warm)22', color: 'var(--accent-warm)', fontSize: '10px' }}>{cond.severity}</span>
                          </div>
                          {cond.notes && <p className="mt-1" style={{ color: 'var(--text-muted)' }}>{cond.notes}</p>}
                          {cond.diet_restrictions.length > 0 && (
                            <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                              <span className="font-medium">Diet: </span>{cond.diet_restrictions.join(', ')}
                            </p>
                          )}
                          {cond.exercise_limits.length > 0 && (
                            <p className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              <span className="font-medium">Exercise: </span>{cond.exercise_limits.join(', ')}
                            </p>
                          )}
                          {cond.medications_affecting_plan.length > 0 && (
                            <p className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              <span className="font-medium">Meds: </span>{cond.medications_affecting_plan.join(', ')}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setMedicalConditions((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-lg leading-none opacity-50 hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add condition form */}
              {addingCondition && (
                <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                  <input
                    value={newCondition.condition_name || ''}
                    onChange={(e) => setNewCondition((p) => ({ ...p, condition_name: e.target.value }))}
                    placeholder="Condition name (e.g. Diabetes)"
                    className="px-3 py-2 rounded-lg text-sm outline-none w-full"
                    style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    list="mc-condition-names"
                  />
                  <datalist id="mc-condition-names">
                    {[
                      // Metabolic & Cardiovascular
                      'Diabetes Type 1', 'Diabetes Type 2', 'Prediabetes', 'Hypertension', 'Heart Disease', 'Heart Failure',
                      'Atrial Fibrillation', 'High Cholesterol', 'Metabolic Syndrome', 'Obesity',
                      // Respiratory
                      'Asthma', 'COPD', 'Sleep Apnea',
                      // Musculoskeletal — General
                      'Arthritis', 'Rheumatoid Arthritis', 'Osteoporosis', 'Osteopenia', 'Fibromyalgia',
                      // ── Head & Neck
                      'Neck Pain', 'Cervical Spondylosis', 'Whiplash', 'TMJ Disorder',
                      'Broken Neck (healed)', 'Cervical Fracture',
                      // ── Shoulder
                      'Shoulder Pain', 'Shoulder Impingement', 'Rotator Cuff Tear', 'Rotator Cuff Strain',
                      'Frozen Shoulder', 'Shoulder Dislocation', 'Shoulder Fracture', 'AC Joint Injury',
                      'Broken Collarbone', 'Clavicle Fracture',
                      // ── Upper Arm & Elbow
                      'Elbow Pain', 'Tennis Elbow', 'Golfer Elbow', 'Elbow Bursitis',
                      'Broken Arm', 'Humerus Fracture', 'Radius Fracture', 'Ulna Fracture',
                      // ── Wrist & Hand
                      'Wrist Pain', 'Wrist Sprain', 'Carpal Tunnel Syndrome',
                      'Broken Wrist', 'Scaphoid Fracture', 'Wrist Fracture',
                      'Hand Pain', 'Finger Fracture', 'Trigger Finger',
                      // ── Spine & Back
                      'Upper Back Pain', 'Lower Back Pain', 'Chronic Back Pain',
                      'Herniated Disc', 'Bulging Disc', 'Degenerative Disc Disease',
                      'Scoliosis', 'Spondylolisthesis', 'Spinal Stenosis',
                      'Compression Fracture', 'Vertebral Fracture', 'Sacral Fracture',
                      'Sciatica', 'Piriformis Syndrome',
                      // ── Hip & Pelvis
                      'Hip Pain', 'Hip Impingement', 'Hip Bursitis', 'Hip Flexor Strain',
                      'Hip Fracture', 'Hip Replacement', 'Femoral Neck Fracture',
                      'Pelvic Fracture', 'SI Joint Dysfunction',
                      // ── Thigh & Knee
                      'Knee Pain', 'Knee Osteoarthritis', 'Patellar Tendinitis', 'Patellar Fracture',
                      'ACL Tear', 'PCL Tear', 'MCL Tear', 'LCL Tear', 'Meniscus Tear',
                      'Knee Replacement', 'IT Band Syndrome',
                      'Femur Fracture', 'Thigh Strain', 'Quad Strain', 'Hamstring Strain',
                      // ── Lower Leg & Ankle
                      'Shin Splints', 'Stress Fracture (shin)', 'Tibial Fracture', 'Fibula Fracture',
                      'Calf Strain', 'Achilles Tendinitis', 'Achilles Rupture',
                      'Ankle Pain', 'Ankle Sprain', 'Ankle Fracture',
                      // ── Foot & Toe
                      'Foot Pain', 'Plantar Fasciitis', 'Heel Pain', 'Heel Spur',
                      'Metatarsal Fracture', 'Stress Fracture (foot)', 'Bunion',
                      'Toe Fracture', 'Turf Toe',
                      // ── Ribs & Chest
                      'Rib Fracture', 'Broken Rib', 'Rib Stress Fracture', 'Costochondritis',
                      // Endocrine & Hormonal
                      'Thyroid Disorder', 'Hypothyroidism', 'Hyperthyroidism', 'PCOS', 'Adrenal Insufficiency',
                      // Digestive
                      'GERD', 'IBS', 'Celiac Disease', 'Crohns Disease', 'Ulcerative Colitis',
                      // Renal & Hepatic
                      'Kidney Disease', 'Kidney Stones', 'Liver Disease', 'Fatty Liver',
                      // Neurological
                      'Epilepsy', 'Migraine', 'Multiple Sclerosis', 'Parkinsons Disease', 'Neuropathy',
                      // Mental Health
                      'Depression', 'Anxiety', 'Bipolar Disorder', 'Eating Disorder',
                      // Blood & Immune
                      'Anemia', 'Sickle Cell Anemia', 'Lupus',
                      // Cancer
                      'Cancer (active)', 'Cancer (remission)',
                    ].map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-muted)' }}>Status</label>
                      <select
                        value={newCondition.status || 'active'}
                        onChange={(e) => setNewCondition((p) => ({ ...p, status: e.target.value as api.MedicalCondition['status'] }))}
                        className="w-full px-2 py-2 rounded-lg text-xs outline-none"
                        style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      >
                        <option value="active">Active</option>
                        <option value="controlled">Controlled</option>
                        <option value="history">History</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-muted)' }}>Severity</label>
                      <select
                        value={newCondition.severity || 'mild'}
                        onChange={(e) => setNewCondition((p) => ({ ...p, severity: e.target.value as api.MedicalCondition['severity'] }))}
                        className="w-full px-2 py-2 rounded-lg text-xs outline-none"
                        style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      >
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                    </div>
                  </div>

                  <textarea
                    value={newCondition.notes || ''}
                    onChange={(e) => setNewCondition((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Notes (optional)"
                    rows={2}
                    className="px-3 py-2 rounded-lg text-xs outline-none resize-none w-full"
                    style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  />

                  {/* Diet restrictions chips */}
                  <div>
                    <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-muted)' }}>Diet Restrictions</label>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {(newCondition.diet_restrictions || []).map((r, i) => (
                        <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--accent)22', color: 'var(--accent)' }}>
                          {r}
                          <button type="button" onClick={() => setNewCondition((p) => ({ ...p, diet_restrictions: (p.diet_restrictions || []).filter((_, j) => j !== i) }))}>×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input
                        value={newDietRestriction}
                        onChange={(e) => setNewDietRestriction(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && newDietRestriction.trim()) { e.preventDefault(); setNewCondition((p) => ({ ...p, diet_restrictions: [...(p.diet_restrictions || []), newDietRestriction.trim()] })); setNewDietRestriction(''); } }}
                        placeholder="e.g. low sodium"
                        list="mc-diet-opts"
                        className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
                        style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                      <datalist id="mc-diet-opts">
                        {[
                          'low sodium', 'low potassium', 'low glycemic', 'low fat', 'low carb', 'low phosphorus', 'low purine',
                          'high protein', 'high calcium', 'high iron', 'high fiber',
                          'dairy free', 'gluten free', 'sugar free', 'alcohol free',
                          'soft foods only', 'small frequent meals', 'no processed foods',
                        ].map((s) => <option key={s} value={s} />)}
                      </datalist>
                      <button type="button" onClick={() => { if (newDietRestriction.trim()) { setNewCondition((p) => ({ ...p, diet_restrictions: [...(p.diet_restrictions || []), newDietRestriction.trim()] })); setNewDietRestriction(''); } }} className="px-2 py-1.5 rounded-lg text-xs" style={{ background: 'var(--accent)22', color: 'var(--accent)' }}>Add</button>
                    </div>
                  </div>

                  {/* Exercise limits chips */}
                  <div>
                    <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-muted)' }}>Exercise Limits</label>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {(newCondition.exercise_limits || []).map((r, i) => (
                        <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--accent-warm)22', color: 'var(--accent-warm)' }}>
                          {r}
                          <button type="button" onClick={() => setNewCondition((p) => ({ ...p, exercise_limits: (p.exercise_limits || []).filter((_, j) => j !== i) }))}>×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input
                        value={newExerciseLimit}
                        onChange={(e) => setNewExerciseLimit(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && newExerciseLimit.trim()) { e.preventDefault(); setNewCondition((p) => ({ ...p, exercise_limits: [...(p.exercise_limits || []), newExerciseLimit.trim()] })); setNewExerciseLimit(''); } }}
                        placeholder="e.g. no high impact"
                        list="mc-exercise-opts"
                        className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
                        style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                      <datalist id="mc-exercise-opts">
                        {[
                          'no high impact', 'no jumping', 'no running',
                          'avoid max HR', 'keep HR below 120', 'keep HR below 140',
                          'low intensity only', 'moderate intensity only',
                          'no weightlifting', 'light weights only', 'bodyweight only',
                          'no overhead pressing', 'no spinal loading', 'no twisting',
                          'limited weight bearing', 'non weight bearing',
                          'upper body only', 'lower body only',
                          'seated only', 'pool/aqua only',
                          'short duration only', 'max 20 min sessions', 'max 30 min sessions',
                          'supervised only',
                        ].map((s) => <option key={s} value={s} />)}
                      </datalist>
                      <button type="button" onClick={() => { if (newExerciseLimit.trim()) { setNewCondition((p) => ({ ...p, exercise_limits: [...(p.exercise_limits || []), newExerciseLimit.trim()] })); setNewExerciseLimit(''); } }} className="px-2 py-1.5 rounded-lg text-xs" style={{ background: 'var(--accent-warm)22', color: 'var(--accent-warm)' }}>Add</button>
                    </div>
                  </div>

                  {/* Medications chips */}
                  <div>
                    <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-muted)' }}>Medications Affecting Plan</label>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {(newCondition.medications_affecting_plan || []).map((r, i) => (
                        <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
                          {r}
                          <button type="button" onClick={() => setNewCondition((p) => ({ ...p, medications_affecting_plan: (p.medications_affecting_plan || []).filter((_, j) => j !== i) }))}>×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input
                        value={newMedication}
                        onChange={(e) => setNewMedication(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && newMedication.trim()) { e.preventDefault(); setNewCondition((p) => ({ ...p, medications_affecting_plan: [...(p.medications_affecting_plan || []), newMedication.trim()] })); setNewMedication(''); } }}
                        placeholder="e.g. insulin"
                        list="mc-med-opts"
                        className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
                        style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                      <datalist id="mc-med-opts">
                        {[
                          // Diabetes
                          'insulin', 'metformin', 'GLP-1 agonists', 'SGLT2 inhibitors',
                          // Cardiovascular
                          'beta blockers', 'ACE inhibitors', 'calcium channel blockers', 'diuretics',
                          'anticoagulants', 'statins', 'aspirin',
                          // Anti-inflammatory / Immune
                          'steroids', 'NSAIDs', 'immunosuppressants',
                          // Neurological / Mental Health
                          'antidepressants', 'antiepileptics', 'lithium',
                          // Bone & Hormones
                          'bisphosphonates', 'hormone therapy', 'thyroid medication',
                        ].map((s) => <option key={s} value={s} />)}
                      </datalist>
                      <button type="button" onClick={() => { if (newMedication.trim()) { setNewCondition((p) => ({ ...p, medications_affecting_plan: [...(p.medications_affecting_plan || []), newMedication.trim()] })); setNewMedication(''); } }} className="px-2 py-1.5 rounded-lg text-xs" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>Add</button>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!newCondition.condition_name?.trim()}
                    onClick={() => {
                      if (!newCondition.condition_name?.trim()) return;
                      setMedicalConditions((prev) => [...prev, {
                        condition_name: newCondition.condition_name!.trim(),
                        status: newCondition.status || 'active',
                        severity: newCondition.severity || 'mild',
                        notes: newCondition.notes?.trim() || undefined,
                        diet_restrictions: newCondition.diet_restrictions || [],
                        exercise_limits: newCondition.exercise_limits || [],
                        medications_affecting_plan: newCondition.medications_affecting_plan || [],
                      }]);
                      setNewCondition({ condition_name: '', status: 'active', severity: 'mild', notes: '', diet_restrictions: [], exercise_limits: [], medications_affecting_plan: [] });
                      setNewDietRestriction('');
                      setNewExerciseLimit('');
                      setNewMedication('');
                      setAddingCondition(false);
                    }}
                    className="w-full py-2 rounded-xl text-sm font-semibold transition-opacity"
                    style={{ background: 'var(--accent)', color: '#fff', opacity: newCondition.condition_name?.trim() ? 1 : 0.4 }}
                  >
                    Add Condition
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-warm)22' }}>
                <Flame size={15} style={{ color: 'var(--accent-warm)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                  Daily Calories
                  {appliedRecommendations.dailyCaloriesTarget && (
                    <AiBadge onDismiss={() => setAppliedRecommendations({ ...appliedRecommendations, dailyCaloriesTarget: false })} />
                  )}
                </p>
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
                <p className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                  Budget / Week
                  {appliedRecommendations.budgetPerWeek && (
                    <AiBadge onDismiss={() => setAppliedRecommendations({ ...appliedRecommendations, budgetPerWeek: false })} />
                  )}
                </p>
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
                <p className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                  Activity Level
                  {appliedRecommendations.activityLevel && (
                    <AiBadge onDismiss={() => setAppliedRecommendations({ ...appliedRecommendations, activityLevel: false })} />
                  )}
                </p>
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
                <p className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                  Diet Preference
                  {appliedRecommendations.dietPreference && (
                    <AiBadge onDismiss={() => setAppliedRecommendations({ ...appliedRecommendations, dietPreference: false })} />
                  )}
                </p>
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

          <div className="pb-4">
            <button
              onClick={saveAll}
              disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 press transition-all"
              style={{
                background: 'linear-gradient(135deg, #14B8A6 0%, #0EA5E9 100%)',
                color: '#fff',
                opacity: saving ? 0.7 : 1,
                border: '1px solid rgba(20, 184, 166, 0.55)',
                boxShadow: '0 10px 26px rgba(14, 165, 233, 0.35)',
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
      
      <OptimizeWizard
        profile={{
          heightCm: heightCm ? Number(heightCm) : undefined,
          weightKg: weightKg ? Number(weightKg) : undefined,
          targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
          targetDate: targetDate || undefined,
          age: age ? Number(age) : undefined,
          gender: gender || undefined,
          activityLevel: activityLevel || undefined,
          medicalConditions: medicalConditions.length > 0 ? medicalConditions : undefined,
          dietPreference: dietPreference || undefined,
        }}
        isOpen={showOptimizeWizard}
        onClose={() => setShowOptimizeWizard(false)}
        onApply={handleApplyRecommendations}
      />
    </div>
  );
}
