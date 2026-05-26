import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Flame,
  Lightbulb,
  TrendingDown,
  Zap,
} from 'lucide-react';
import type { HealthRecommendation, HealthRecommendationAnalysis } from '../lib/api';
import { APP_FLAGS, DUMMY_AI_ANALYSIS } from '../lib/config';
import { TimelineChart, type Milestone } from '../components/TimelineChart';

// --- Ordinal helper ---
function ordinalSuffix(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  if (mod10 === 1) return 'st';
  if (mod10 === 2) return 'nd';
  if (mod10 === 3) return 'rd';
  return 'th';
}

// --- Animated counter ---
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const duration = 1000;
    const startTime = performance.now();
    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      setDisplay(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);
  return <>{decimals > 0 ? display.toFixed(decimals) : Math.round(display)}</>;
}

// --- Section label ---
function SectionLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent)22' }}>
        {icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</p>
    </div>
  );
}

// --- Stat pill ---
function StatPill({ label, value, unit, sub, animated, decimals = 0 }: {
  label: string; value: string | number; unit?: string; sub?: string; animated?: number; decimals?: number;
}) {
  return (
    <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
      <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xl font-black leading-none" style={{ color: 'var(--text-primary)' }}>
        {animated !== undefined ? <AnimatedNumber value={animated} decimals={decimals} /> : value}
        {unit && <span className="text-xs font-medium ml-0.5" style={{ color: 'var(--text-muted)' }}>{unit}</span>}
      </p>
      {sub && <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
    </div>
  );
}

// --- Macro section ---
function MacroSection({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein + carbs + fat;
  if (total === 0) return null;
  const pPct = Math.round((protein / total) * 100);
  const cPct = Math.round((carbs / total) * 100);
  const fPct = 100 - pPct - cPct;
  const macros = [
    { label: 'Protein', short: 'P', value: protein, pct: pPct, color: 'var(--accent)', kcal: Math.round(protein * 4) },
    { label: 'Carbs', short: 'C', value: carbs, pct: cPct, color: 'var(--accent-gold)', kcal: Math.round(carbs * 4) },
    { label: 'Fat', short: 'F', value: fat, pct: fPct, color: 'var(--accent-warm)', kcal: Math.round(fat * 9) },
  ];
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
      <div className="flex rounded-xl overflow-hidden mb-4" style={{ height: 8 }}>
        {macros.map((m) => (
          <div key={m.label} style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {macros.map((m) => (
          <div key={m.label} className="rounded-xl p-2.5 flex flex-col gap-1 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center mx-auto" style={{ backgroundColor: `${m.color}22` }}>
              <span className="text-[9px] font-black" style={{ color: m.color }}>{m.short}</span>
            </div>
            <p className="text-sm font-black leading-none" style={{ color: 'var(--text-primary)' }}>
              {m.value}<span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>g</span>
            </p>
            <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{m.kcal} kcal</p>
            <p className="text-[9px] font-bold" style={{ color: m.color }}>{m.pct}%</p>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Total daily macros</p>
        <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{total}g</p>
      </div>
    </div>
  );
}

// --- Main page ---
export function AiAnalysisPage() {
  const navigate = useNavigate();
  const stored = sessionStorage.getItem('ai_analysis_result');
  const storedResult: HealthRecommendation | null = stored ? (JSON.parse(stored) as HealthRecommendation) : null;
  // Use dummy data when flag is ON or no stored result exists
  const result: HealthRecommendation | null = (APP_FLAGS.dummyAiAnalysis || !storedResult) ? DUMMY_AI_ANALYSIS : storedResult;
  const analysis: HealthRecommendationAnalysis | undefined = result?.analysis;

  const milestones: Milestone[] = [];
  if (analysis?.recommendation?.milestones && Array.isArray(analysis.recommendation.milestones)) {
    (analysis.recommendation.milestones as any[]).forEach((m, idx) => {
      const weight = m.estimated_weight_kg ?? m.expected_weight_kg;
      const weekNumber = m.week ?? idx + 1;
      if (weight !== undefined) {
        milestones.push({ week: weekNumber, date: m.date || `Week ${weekNumber}`, estimatedWeightKg: weight, status: 'on-track', notes: m.notes || undefined });
      }
    });
  }

  const macros = analysis?.recommendation?.macros || { protein_g: 0, carbs_g: 0, fat_g: 0 };
  const feasibilityPassed = analysis?.feasibility_check?.passed ?? false;
  const feasibilityReason = analysis?.feasibility_check?.reason || '';
  const goalType = (analysis?.goal_type || '').toLowerCase();
  const goalConfig = goalType === 'cut'
    ? { label: 'Fat Loss', color: 'var(--accent-warm)' }
    : goalType === 'bulk'
    ? { label: 'Muscle Gain', color: 'var(--accent)' }
    : { label: 'Maintenance', color: 'var(--accent-green)' };
  const bmiStatus = !analysis?.bmi ? '' : analysis.bmi < 18.5 ? 'Underweight' : analysis.bmi < 25 ? 'Healthy' : analysis.bmi < 30 ? 'Overweight' : 'Obese';

  if (!result || !analysis) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg)' }}>
        <Brain size={44} style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No analysis found.</p>
        <button onClick={() => navigate(-1)} className="px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--bg)' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', cursor: 'pointer' }}>
          <ArrowLeft size={15} style={{ color: 'var(--text-primary)' }} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)' }}>
            <Brain size={13} color="#fff" />
          </div>
          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>AI Health Analysis</p>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: `${goalConfig.color}22`, border: `1px solid ${goalConfig.color}44`, color: goalConfig.color }}>
          {goalConfig.label}
        </span>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Feasibility banner */}
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: feasibilityPassed ? 'var(--accent-green)18' : 'var(--accent-warm)18', border: `1px solid ${feasibilityPassed ? 'var(--accent-green)' : 'var(--accent-warm)'}44` }}>
          {feasibilityPassed
            ? <CheckCircle2 size={18} style={{ color: 'var(--accent-green)', flexShrink: 0, marginTop: 1 }} />
            : <AlertTriangle size={18} style={{ color: 'var(--accent-warm)', flexShrink: 0, marginTop: 1 }} />}
          <div className="min-w-0">
            <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
              {feasibilityPassed ? 'Goal is Achievable' : 'Goal Needs Attention'}
            </p>
            {feasibilityReason && <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feasibilityReason}</p>}
          </div>
        </div>

        {/* Body metrics */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <SectionLabel icon={<Activity size={13} style={{ color: 'var(--accent)' }} />} title="Body Metrics" />
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="BMI" value={analysis.bmi?.toFixed(1) || '—'} animated={analysis.bmi} decimals={1} sub={bmiStatus} />
            <StatPill label="BMR" value={analysis.bmr || '—'} animated={analysis.bmr} unit="cal" sub="Basal metabolic" />
            <StatPill label="TDEE" value={analysis.tdee || '—'} animated={analysis.tdee} unit="cal" sub="Total daily energy" />
            {analysis.recommendation?.daily_calories ? (
              <StatPill label="Target Cal" value={analysis.recommendation.daily_calories} animated={analysis.recommendation.daily_calories} unit="cal" sub="Daily goal" />
            ) : null}
          </div>
        </div>

        {/* Macros */}
        {(macros.protein_g || macros.carbs_g || macros.fat_g) ? (
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <SectionLabel icon={<Flame size={13} style={{ color: 'var(--accent)' }} />} title="Daily Macronutrients" />
            <MacroSection protein={macros.protein_g || 0} carbs={macros.carbs_g || 0} fat={macros.fat_g || 0} />
          </div>
        ) : null}

        {/* Timeline */}
        {milestones.length > 0 && (
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <SectionLabel icon={<TrendingDown size={13} style={{ color: 'var(--accent)' }} />} title={`Progress Timeline · ${milestones.length} milestones`} />
            <TimelineChart milestones={milestones} />
            <div className="space-y-2 mt-4">
              {milestones.map((m, i) => {
                const dateObj = m.date && !m.date.startsWith('Week') ? new Date(m.date) : null;
                const dateStr = dateObj
                  ? `${dateObj.toLocaleString('en-US', { month: 'short' })} ${dateObj.getDate()}${ordinalSuffix(dateObj.getDate())}`
                  : m.date;
                return (
                  <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black" style={{ background: 'var(--accent)22', border: '2px solid var(--accent)55', color: 'var(--accent)' }}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Week {m.week}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{dateStr}</p>
                      </div>
                      <p className="text-base font-black leading-none mt-0.5" style={{ color: 'var(--text-primary)' }}>
                        {m.estimatedWeightKg}<span className="text-xs font-medium ml-0.5" style={{ color: 'var(--text-muted)' }}>kg</span>
                      </p>
                      {m.notes && <p className="text-[10px] mt-1 italic" style={{ color: 'var(--text-muted)' }}>{m.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lifestyle recs */}
        {(analysis.recommendation?.activity_level || result.activityLevel || result.dietPreference || result.budgetPerWeek) && (
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <SectionLabel icon={<Zap size={13} style={{ color: 'var(--accent)' }} />} title="Recommendations" />
            <div className="space-y-2">
              {(analysis.recommendation?.activity_level || result.activityLevel) && (
                <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Activity Level</p>
                  <p className="text-xs font-bold capitalize" style={{ color: 'var(--accent-green)' }}>{analysis.recommendation?.activity_level || result.activityLevel}</p>
                </div>
              )}
              {result.dietPreference && (
                <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Diet Preference</p>
                  <p className="text-xs font-bold capitalize" style={{ color: 'var(--accent-gold)' }}>{result.dietPreference}</p>
                </div>
              )}
              {result.budgetPerWeek && (
                <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Weekly Budget</p>
                  <p className="text-xs font-bold" style={{ color: 'var(--accent)' }}>₹{result.budgetPerWeek}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warnings */}
        {analysis.recommendation?.warnings && (analysis.recommendation.warnings as string[]).length > 0 && (
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <SectionLabel icon={<AlertTriangle size={13} style={{ color: 'var(--accent-warm)' }} />} title="Important Notes" />
            <div className="space-y-2">
              {(analysis.recommendation.warnings as string[]).map((w, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl p-3" style={{ backgroundColor: 'var(--accent-warm)11', border: '1px solid var(--accent-warm)33' }}>
                  <AlertTriangle size={12} style={{ color: 'var(--accent-warm)', flexShrink: 0, marginTop: 1 }} />
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{w}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alternative plan */}
        {analysis.alternative_plan && (
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <SectionLabel icon={<Lightbulb size={13} style={{ color: 'var(--accent-gold)' }} />} title="Alternative Approach" />
            <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {(analysis.alternative_plan as any).description || (analysis.alternative_plan as any).interim_focus || 'Consider a different timeline or approach.'}
              </p>
            </div>
          </div>
        )}

        {/* Back */}
        <button onClick={() => navigate(-1)} className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <ArrowLeft size={15} />
          Back to AI Planner
        </button>
      </div>
    </div>
  );
}
