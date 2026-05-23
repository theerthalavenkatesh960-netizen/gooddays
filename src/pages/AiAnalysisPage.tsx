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
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { HealthRecommendation, HealthRecommendationAnalysis } from '../lib/api';
import { TimelineChart, type Milestone } from '../components/TimelineChart';
import { MacroChart } from '../components/MacroChart';

// ─── Ordinal helper ───────────────────────────────────────────────────────────
function ordinalSuffix(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  if (mod10 === 1) return 'st';
  if (mod10 === 2) return 'nd';
  if (mod10 === 3) return 'rd';
  return 'th';
}

// ─── Animated number ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = 0;
    const end = value;
    const duration = 1200;
    const startTime = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * ease);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return (
    <span>
      {decimals > 0 ? display.toFixed(decimals) : Math.round(display)}
      {suffix}
    </span>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-warm) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 12px var(--accent)44',
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</p>
        {subtitle && <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Big metric card ──────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  unit,
  sub,
  accent,
  icon,
  animatedValue,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  accent: string;
  icon: React.ReactNode;
  animatedValue?: number;
}) {
  return (
    <div
      style={{
        padding: '20px 16px',
        borderRadius: 20,
        background: `linear-gradient(135deg, ${accent}22 0%, ${accent}0a 100%)`,
        border: `1px solid ${accent}44`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow orb */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}44 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: `${accent}33`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: accent }}>
          {label}
        </p>
      </div>
      <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
        {animatedValue !== undefined ? (
          <AnimatedNumber value={animatedValue} decimals={label === 'BMI' ? 1 : 0} />
        ) : (
          value
        )}
        {unit && (
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>{unit}</span>
        )}
      </p>
      {sub && <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>{sub}</p>}
    </div>
  );
}

// ─── Goal type badge ──────────────────────────────────────────────────────────
function GoalBadge({ goalType }: { goalType?: string }) {
  const type = goalType?.toLowerCase() || 'maintain';
  const config: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    cut: { label: 'Fat Loss', color: '#f87171', icon: <TrendingDown size={13} color="#f87171" /> },
    bulk: { label: 'Muscle Gain', color: '#60a5fa', icon: <TrendingUp size={13} color="#60a5fa" /> },
    maintain: { label: 'Maintenance', color: '#34d399', icon: <Activity size={13} color="#34d399" /> },
  };
  const c = config[type] || config['maintain'];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 12px',
        borderRadius: 20,
        background: `${c.color}22`,
        border: `1px solid ${c.color}55`,
        fontSize: 11,
        fontWeight: 700,
        color: c.color,
      }}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function AiAnalysisPage() {
  const navigate = useNavigate();

  // Retrieve the stored recommendation from sessionStorage
  const stored = sessionStorage.getItem('ai_analysis_result');
  const result: HealthRecommendation | null = stored ? (JSON.parse(stored) as HealthRecommendation) : null;
  const analysis: HealthRecommendationAnalysis | undefined = result?.analysis;

  // Milestones
  const milestones: Milestone[] = [];
  if (analysis?.recommendation?.milestones && Array.isArray(analysis.recommendation.milestones)) {
    (analysis.recommendation.milestones as any[]).forEach((m, idx) => {
      const weight = m.estimated_weight_kg ?? m.expected_weight_kg;
      const weekNumber = m.week ?? idx + 1;
      if (weight !== undefined) {
        milestones.push({
          week: weekNumber,
          date: m.date || `Week ${weekNumber}`,
          estimatedWeightKg: weight,
          status: 'on-track',
          notes: m.notes || undefined,
        });
      }
    });
  }

  const macros = analysis?.recommendation?.macros || { protein_g: 0, carbs_g: 0, fat_g: 0 };
  const feasibilityPassed = analysis?.feasibility_check?.passed ?? false;
  const feasibilityReason = analysis?.feasibility_check?.reason || '';

  if (!result || !analysis) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: 'var(--background)',
        }}
      >
        <Brain size={48} style={{ color: 'var(--text-muted)' }} />
        <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>No analysis found.</p>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '10px 24px',
            borderRadius: 12,
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const bmiStatus =
    !analysis.bmi ? '—'
    : analysis.bmi < 18.5 ? 'Underweight'
    : analysis.bmi < 25 ? 'Healthy'
    : analysis.bmi < 30 ? 'Overweight'
    : 'Obese';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* ── Hero header ── */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '40px 24px 56px',
          background: 'linear-gradient(160deg, var(--accent)18 0%, var(--accent-warm)0a 50%, transparent 100%)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Background glow orbs */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--accent)22 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -40,
            left: '30%',
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--accent-warm)18 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Back navigation */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 600,
            padding: '6px 0',
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={16} />
          Back to Planner
        </button>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-warm) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 20px var(--accent)55',
                }}
              >
                <Brain size={22} color="#fff" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text-primary)' }}>
                  AI Health Analysis
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                  Powered by your personalized profile
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <GoalBadge goalType={analysis.goal_type} />
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: feasibilityPassed ? '#34d39922' : '#f8717122',
                  border: `1px solid ${feasibilityPassed ? '#34d399' : '#f87171'}55`,
                  fontSize: 11,
                  fontWeight: 700,
                  color: feasibilityPassed ? '#34d399' : '#f87171',
                }}
              >
                {feasibilityPassed ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                {feasibilityPassed ? 'Goal is Achievable' : 'Needs Attention'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Feasibility reason */}
        {feasibilityReason && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 16,
              background: feasibilityPassed ? '#34d39918' : '#f8717118',
              border: `1px solid ${feasibilityPassed ? '#34d399' : '#f87171'}33`,
              marginBottom: 28,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            {feasibilityPassed ? (
              <CheckCircle2 size={18} style={{ color: '#34d399', flexShrink: 0, marginTop: 1 }} />
            ) : (
              <AlertTriangle size={18} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
            )}
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {feasibilityReason}
            </p>
          </div>
        )}

        {/* ── Key Metrics ── */}
        <section style={{ marginBottom: 36 }}>
          <SectionHeading
            icon={<Zap size={18} color="#fff" />}
            title="Body Metrics"
            subtitle="Your baseline numbers"
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            <MetricCard
              label="BMI"
              value={analysis.bmi?.toFixed(1) || '—'}
              animatedValue={analysis.bmi}
              sub={bmiStatus}
              accent="#8b5cf6"
              icon={<Activity size={13} color="#8b5cf6" />}
            />
            <MetricCard
              label="BMR"
              value={analysis.bmr || '—'}
              animatedValue={analysis.bmr}
              unit="cal"
              sub="Basal metabolic rate"
              accent="#06b6d4"
              icon={<Flame size={13} color="#06b6d4" />}
            />
            <MetricCard
              label="TDEE"
              value={analysis.tdee || '—'}
              animatedValue={analysis.tdee}
              unit="cal"
              sub="Total daily energy"
              accent="#10b981"
              icon={<TrendingUp size={13} color="#10b981" />}
            />
            {analysis.recommendation?.daily_calories && (
              <MetricCard
                label="Target Calories"
                value={analysis.recommendation.daily_calories}
                animatedValue={analysis.recommendation.daily_calories}
                unit="cal"
                sub="Daily calorie goal"
                accent="#f59e0b"
                icon={<Zap size={13} color="#f59e0b" />}
              />
            )}
          </div>
        </section>

        {/* ── Macros ── */}
        {(macros.protein_g || macros.carbs_g || macros.fat_g) ? (
          <section style={{ marginBottom: 36 }}>
            <SectionHeading
              icon={<Flame size={18} color="#fff" />}
              title="Daily Macros"
              subtitle="Optimal macronutrient split"
            />
            <div
              style={{
                padding: '24px 20px',
                borderRadius: 20,
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
              }}
            >
              <MacroChart
                protein={macros.protein_g || 0}
                carbs={macros.carbs_g || 0}
                fat={macros.fat_g || 0}
                unit="g"
              />

              {/* Macro detail row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 20 }}>
                {[
                  { label: 'Protein', value: macros.protein_g, color: '#8b5cf6', cal: Math.round((macros.protein_g || 0) * 4) },
                  { label: 'Carbs', value: macros.carbs_g, color: '#f59e0b', cal: Math.round((macros.carbs_g || 0) * 4) },
                  { label: 'Fat', value: macros.fat_g, color: '#f87171', cal: Math.round((macros.fat_g || 0) * 9) },
                ].map((m) => (
                  <div
                    key={m.label}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: `${m.color}18`,
                      border: `1px solid ${m.color}33`,
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {m.label}
                    </p>
                    <p style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 900, color: 'var(--text-primary)' }}>
                      {m.value ?? 0}
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 2 }}>g</span>
                    </p>
                    <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>{m.cal} kcal</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Timeline ── */}
        {milestones.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <SectionHeading
              icon={<TrendingDown size={18} color="#fff" />}
              title="Progress Timeline"
              subtitle={`${milestones.length} milestone${milestones.length !== 1 ? 's' : ''} mapped`}
            />
            <div
              style={{
                padding: '24px 20px',
                borderRadius: 20,
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
              }}
            >
              <TimelineChart milestones={milestones} />
            </div>

            {/* Milestone cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginTop: 16 }}>
              {milestones.map((m, i) => {
                const dateObj = m.date && !m.date.startsWith('Week') ? new Date(m.date) : null;
                const dateStr = dateObj
                  ? `${dateObj.toLocaleString('en-US', { month: 'short' })} ${dateObj.getDate()}${ordinalSuffix(dateObj.getDate())}`
                  : m.date;
                return (
                  <div
                    key={i}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'var(--accent)22',
                        border: '2px solid var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        fontWeight: 900,
                        color: 'var(--accent)',
                      }}
                    >
                      {i + 1}
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Week {m.week}
                    </p>
                    <p style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>
                      {m.estimatedWeightKg}
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 2 }}>kg</span>
                    </p>
                    <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>{dateStr}</p>
                    {m.notes && (
                      <p style={{ margin: '6px 0 0', fontSize: 10, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        {m.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Warnings ── */}
        {analysis.recommendation?.warnings && analysis.recommendation.warnings.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <SectionHeading
              icon={<AlertTriangle size={18} color="#fff" />}
              title="Important Notes"
              subtitle="Take these into consideration"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(analysis.recommendation.warnings as string[]).map((w, i) => (
                <div
                  key={i}
                  style={{
                    padding: '14px 18px',
                    borderRadius: 14,
                    background: '#f59e0b18',
                    border: '1px solid #f59e0b33',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{w}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Alternative plan ── */}
        {analysis.alternative_plan && (
          <section style={{ marginBottom: 36 }}>
            <SectionHeading
              icon={<Lightbulb size={18} color="#fff" />}
              title="Alternative Approach"
              subtitle="Another way to reach your goal"
            />
            <div
              style={{
                padding: '20px',
                borderRadius: 20,
                background: 'linear-gradient(135deg, var(--accent)18 0%, var(--accent)08 100%)',
                border: '1px solid var(--accent)33',
              }}
            >
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {(analysis.alternative_plan as any).description ||
                  (analysis.alternative_plan as any).interim_focus ||
                  'Consider a different timeline or approach for better long-term results.'}
              </p>
            </div>
          </section>
        )}

        {/* ── Activity & Diet recommendation ── */}
        {(analysis.recommendation?.activity_level || result.activityLevel || result.dietPreference) && (
          <section style={{ marginBottom: 36 }}>
            <SectionHeading
              icon={<Activity size={18} color="#fff" />}
              title="Lifestyle Recommendations"
              subtitle="Suggested daily habits"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {(analysis.recommendation?.activity_level || result.activityLevel) && (
                <div
                  style={{
                    padding: '20px',
                    borderRadius: 20,
                    background: '#10b98118',
                    border: '1px solid #10b98133',
                  }}
                >
                  <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#10b981' }}>
                    Activity Level
                  </p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {analysis.recommendation?.activity_level || result.activityLevel}
                  </p>
                </div>
              )}
              {result.dietPreference && (
                <div
                  style={{
                    padding: '20px',
                    borderRadius: 20,
                    background: '#f59e0b18',
                    border: '1px solid #f59e0b33',
                  }}
                >
                  <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#f59e0b' }}>
                    Diet Preference
                  </p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {result.dietPreference}
                  </p>
                </div>
              )}
              {result.budgetPerWeek && (
                <div
                  style={{
                    padding: '20px',
                    borderRadius: 20,
                    background: '#8b5cf618',
                    border: '1px solid #8b5cf633',
                  }}
                >
                  <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8b5cf6' }}>
                    Weekly Budget
                  </p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                    ${result.budgetPerWeek}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Back button ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 32px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #14B8A6 0%, #0EA5E9 100%)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 14,
              boxShadow: '0 8px 22px rgba(14,165,233,0.35)',
            }}
          >
            <ArrowLeft size={16} />
            Back to AI Planner
          </button>
        </div>
      </div>
    </div>
  );
}
