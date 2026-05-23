import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2 } from 'lucide-react';
import { completeOnboarding, type OnboardingData } from '../lib/api';
import {
  ONBOARDING_FEATURES,
  ACTIVITY_LEVELS,
  DIET_PREFERENCES,
  WORKOUT_TYPES,
  MEAL_PREFERENCES,
  CALORIE_PRESETS,
  BUDGET_PRESETS,
} from '../lib/config';

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 px-6 pb-4">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-full transition-all duration-300"
          style={{
            height: 3,
            background: i < current ? 'var(--accent)' : i === current ? 'var(--accent)88' : 'var(--border)',
          }}
        />
      ))}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function StepHeading({ step, title, subtitle }: { step: string; title: string; subtitle: string }) {
  return (
    <div className="px-6 mb-5">
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--accent)' }}>
        {step}
      </p>
      <p className="text-xl font-black leading-tight" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
    </div>
  );
}

// ─── Toggle card ──────────────────────────────────────────────────────────────
function ToggleCard({
  emoji, title, desc, selected, onToggle,
}: { emoji: string; title: string; desc: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center gap-3"
      style={{
        background: selected ? 'var(--accent)18' : 'var(--surface-elevated)',
        border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
        boxShadow: selected ? '0 4px 14px var(--accent)22' : 'none',
      }}
    >
      <span className="text-xl flex-shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: selected ? 'var(--accent)' : 'var(--text-primary)' }}>
          {title}
        </p>
        {desc && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{desc}</p>}
      </div>
      {selected && (
        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)' }}>
          <Check size={11} color="#fff" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

// ─── Option pill ─────────────────────────────────────────────────────────────
function OptionPill({
  emoji, label, desc, selected, onClick,
}: { emoji?: string; label: string; desc?: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl transition-all text-center"
      style={{
        background: selected ? 'var(--accent)18' : 'var(--surface-elevated)',
        border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
        minWidth: 0,
      }}
    >
      {emoji && <span className="text-lg">{emoji}</span>}
      <p className="text-[11px] font-bold leading-tight" style={{ color: selected ? 'var(--accent)' : 'var(--text-primary)' }}>
        {label}
      </p>
      {desc && <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>}
    </button>
  );
}

// ─── Input field ─────────────────────────────────────────────────────────────
const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 12,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface-elevated)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
};

function Field({ label, unit, children }: { label: string; unit?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        {unit && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{unit}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0-3
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState<OnboardingData>({
    selectedFeatures: [],
    preferredWorkouts: [],
    preferredMeals: [],
  });

  const set = (patch: Partial<OnboardingData>) => setData((d) => ({ ...d, ...patch }));

  function toggleArr(field: 'selectedFeatures' | 'preferredWorkouts' | 'preferredMeals', val: string) {
    const arr = (data[field] as string[]) || [];
    set({ [field]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] });
  }

  const totalSteps = 4;

  async function handleFinish() {
    setSaving(true);
    setError('');
    try {
      await completeOnboarding(data);
      navigate('/', { replace: true });
    } catch (e: any) {
      setError(e?.message || 'Failed to save. Please try again.');
      setSaving(false);
    }
  }

  const canNext = [
    data.selectedFeatures.length > 0,
    (data.heightCm ?? 0) > 0 && (data.currentWeightKg ?? 0) > 0,
    (data.activityLevel ?? '') !== '' && (data.dietPreference ?? '') !== '',
    data.preferredWorkouts!.length > 0 || data.preferredMeals!.length > 0,
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-6">
        {step > 0 ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            <ArrowLeft size={15} style={{ color: 'var(--text-primary)' }} />
          </button>
        ) : (
          <div className="w-8 h-8" />
        )}
        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          {step + 1} of {totalSteps}
        </p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="text-xs font-semibold"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          Skip
        </button>
      </div>

      {/* Step bar */}
      <StepBar current={step + 1} total={totalSteps} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6">

        {/* ── STEP 0: Feature selection ── */}
        {step === 0 && (
          <>
            <StepHeading
              step="Step 1 of 4"
              title="What are you here for?"
              subtitle="Pick the features you want to use. You can always change this later."
            />
            <div className="px-6 space-y-2.5">
              {ONBOARDING_FEATURES.map((f) => (
                <ToggleCard
                  key={f.id}
                  emoji={f.emoji}
                  title={f.title}
                  desc={f.desc}
                  selected={data.selectedFeatures.includes(f.id)}
                  onToggle={() => toggleArr('selectedFeatures', f.id)}
                />
              ))}
            </div>
          </>
        )}

        {/* ── STEP 1: Profile review ── */}
        {step === 1 && (
          <>
            <StepHeading
              step="Step 2 of 4"
              title="Tell us about yourself"
              subtitle="We'll use this to build your personalized health plan."
            />
            <div className="px-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Height" unit="cm">
                  <input
                    type="number"
                    placeholder="e.g. 175"
                    value={data.heightCm ?? ''}
                    onChange={(e) => set({ heightCm: e.target.value ? Number(e.target.value) : undefined })}
                    style={fieldStyle}
                  />
                </Field>
                <Field label="Current Weight" unit="kg">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 72"
                    value={data.currentWeightKg ?? ''}
                    onChange={(e) => set({ currentWeightKg: e.target.value ? Number(e.target.value) : undefined })}
                    style={fieldStyle}
                  />
                </Field>
                <Field label="Target Weight" unit="kg">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 68"
                    value={data.targetWeightKg ?? ''}
                    onChange={(e) => set({ targetWeightKg: e.target.value ? Number(e.target.value) : undefined })}
                    style={fieldStyle}
                  />
                </Field>
                <Field label="Target Date">
                  <input
                    type="date"
                    value={data.targetDate ?? ''}
                    onChange={(e) => set({ targetDate: e.target.value || undefined })}
                    style={fieldStyle}
                  />
                </Field>
                <Field label="Age" unit="years">
                  <input
                    type="number"
                    placeholder="e.g. 28"
                    value={data.age ?? ''}
                    onChange={(e) => set({ age: e.target.value ? Number(e.target.value) : undefined })}
                    style={fieldStyle}
                  />
                </Field>
                <Field label="Gender">
                  <select
                    value={data.gender ?? ''}
                    onChange={(e) => set({ gender: e.target.value || undefined })}
                    style={{ ...fieldStyle, appearance: 'none' }}
                  >
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </Field>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 2: Health preferences ── */}
        {step === 2 && (
          <>
            <StepHeading
              step="Step 3 of 4"
              title="Your health preferences"
              subtitle="Set your nutrition targets and lifestyle choices."
            />
            <div className="px-6 space-y-5">
              {/* Calories */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Daily Calorie Target
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {CALORIE_PRESETS.map((c) => (
                    <OptionPill
                      key={c.value}
                      label={c.label}
                      desc={c.desc}
                      selected={String(data.dailyCaloriesTarget) === c.value}
                      onClick={() => set({ dailyCaloriesTarget: Number(c.value) })}
                    />
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Or enter custom calories…"
                  value={
                    data.dailyCaloriesTarget && !CALORIE_PRESETS.find((c) => Number(c.value) === data.dailyCaloriesTarget)
                      ? data.dailyCaloriesTarget
                      : ''
                  }
                  onChange={(e) => set({ dailyCaloriesTarget: e.target.value ? Number(e.target.value) : undefined })}
                  className="mt-2"
                  style={{ ...fieldStyle, fontSize: 13 }}
                />
              </div>

              {/* Budget */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Weekly Food Budget
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {BUDGET_PRESETS.map((b) => (
                    <OptionPill
                      key={b.value}
                      label={b.label}
                      desc={b.desc}
                      selected={String(data.budgetPerWeek) === b.value}
                      onClick={() => set({ budgetPerWeek: Number(b.value) })}
                    />
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Or enter custom budget (₹)…"
                  value={
                    data.budgetPerWeek && !BUDGET_PRESETS.find((b) => Number(b.value) === data.budgetPerWeek)
                      ? data.budgetPerWeek
                      : ''
                  }
                  onChange={(e) => set({ budgetPerWeek: e.target.value ? Number(e.target.value) : undefined })}
                  className="mt-2"
                  style={{ ...fieldStyle, fontSize: 13 }}
                />
              </div>

              {/* Activity */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Activity Level
                </p>
                <div className="space-y-2">
                  {ACTIVITY_LEVELS.map((a) => (
                    <ToggleCard
                      key={a.value}
                      emoji={a.emoji}
                      title={a.label}
                      desc={a.desc}
                      selected={data.activityLevel === a.value}
                      onToggle={() => set({ activityLevel: a.value })}
                    />
                  ))}
                </div>
              </div>

              {/* Diet */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Diet Preference
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {DIET_PREFERENCES.map((d) => (
                    <OptionPill
                      key={d.value}
                      emoji={d.emoji}
                      label={d.label}
                      desc={d.desc}
                      selected={data.dietPreference === d.value}
                      onClick={() => set({ dietPreference: d.value })}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 3: Workout & meal style ── */}
        {step === 3 && (
          <>
            <StepHeading
              step="Step 4 of 4"
              title="Customize your plans"
              subtitle="Tell us how you like to train and eat. We'll tailor your routines and meal plans."
            />
            <div className="px-6 space-y-5">
              {/* Workout types */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Workout styles you enjoy <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(pick all that apply)</span>
                </p>
                <div className="space-y-2">
                  {WORKOUT_TYPES.map((w) => (
                    <ToggleCard
                      key={w.id}
                      emoji={w.emoji}
                      title={w.name}
                      desc={w.desc}
                      selected={(data.preferredWorkouts || []).includes(w.id)}
                      onToggle={() => toggleArr('preferredWorkouts', w.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Workout schedule */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Workouts per week">
                  <input
                    type="number"
                    min={1}
                    max={7}
                    placeholder="e.g. 4"
                    value={data.workoutsPerWeek ?? ''}
                    onChange={(e) => set({ workoutsPerWeek: e.target.value ? Number(e.target.value) : undefined })}
                    style={fieldStyle}
                  />
                </Field>
                <Field label="Minutes per session">
                  <input
                    type="number"
                    min={10}
                    max={180}
                    placeholder="e.g. 45"
                    value={data.minutesPerSession ?? ''}
                    onChange={(e) => set({ minutesPerSession: e.target.value ? Number(e.target.value) : undefined })}
                    style={fieldStyle}
                  />
                </Field>
              </div>

              {/* Meal preferences */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  How you like to eat <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(pick all that apply)</span>
                </p>
                <div className="space-y-2">
                  {MEAL_PREFERENCES.map((m) => (
                    <ToggleCard
                      key={m.id}
                      emoji={m.emoji}
                      title={m.name}
                      desc={m.desc}
                      selected={(data.preferredMeals || []).includes(m.id)}
                      onToggle={() => toggleArr('preferredMeals', m.id)}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div
                  className="p-3 rounded-xl text-xs"
                  style={{ background: 'var(--accent-warm)18', border: '1px solid var(--accent-warm)44', color: 'var(--accent-warm)' }}
                >
                  {error}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer CTA */}
      <div className="px-6 pb-10 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        {step < totalSteps - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext[step]}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: canNext[step] ? 'var(--accent)' : 'var(--accent)44',
              color: canNext[step] ? '#fff' : 'var(--text-muted)',
              border: 'none',
              cursor: canNext[step] ? 'pointer' : 'not-allowed',
            }}
          >
            Continue
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.8 : 1,
            }}
          >
            {saving ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Setting up your profile…
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Let's go!
              </>
            )}
          </button>
        )}

        {step === 0 && (
          <p className="text-center text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>
            You can always update preferences later in Settings
          </p>
        )}
      </div>
    </div>
  );
}
