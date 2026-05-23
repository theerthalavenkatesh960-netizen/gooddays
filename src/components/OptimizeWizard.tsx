import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, X, Loader2, ExternalLink, CheckCircle2, AlertTriangle, Zap, Activity, TrendingUp } from 'lucide-react';
import { getHealthRecommendations, type HealthProfile, type HealthRecommendation } from '../lib/api';

type Step = 'review' | 'analyze' | 'apply';

type AppliedRecommendations = {
  dailyCaloriesTarget?: boolean;
  activityLevel?: boolean;
  dietPreference?: boolean;
  budgetPerWeek?: boolean;
};

type OptimizeWizardProps = {
  profile: HealthProfile;
  isOpen: boolean;
  onClose: () => void;
  onApply: (recommendations: AppliedRecommendations, result: HealthRecommendation) => void;
};

export function OptimizeWizard({ profile, isOpen, onClose, onApply }: OptimizeWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('review');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HealthRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftProfile, setDraftProfile] = useState<HealthProfile>(profile);
  const [checkedFields, setCheckedFields] = useState<AppliedRecommendations>({
    dailyCaloriesTarget: true,
    activityLevel: true,
    dietPreference: true,
    budgetPerWeek: true,
  });

  useEffect(() => {
    if (isOpen) {
      setDraftProfile(profile);
      setStep('review');
      setError(null);
      setResult(null);
      setCheckedFields({
        dailyCaloriesTarget: true,
        activityLevel: true,
        dietPreference: true,
        budgetPerWeek: true,
      });
    }
  }, [isOpen, profile]);

  if (!isOpen) {
    return null;
  }

  const canGenerateAnalysis =
    (draftProfile.heightCm ?? 0) > 0 &&
    (draftProfile.weightKg ?? 0) > 0 &&
    (draftProfile.targetWeightKg ?? 0) > 0;

  const handleGenerateAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const rec = await getHealthRecommendations(draftProfile);
      setResult(rec);
      setStep('analyze');
    } catch (err) {
      setError((err as Error).message || 'Failed to generate analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApply(checkedFields, result);
      onClose();
    }
  };

  const handleBack = () => {
    if (step === 'review') {
      onClose();
    } else if (step === 'analyze') {
      setStep('review');
    } else if (step === 'apply') {
      setStep('analyze');
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface-elevated)',
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
  };

  const toOptionalNumber = (value: string): number | undefined => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 39,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(90vw, 500px)',
          maxHeight: '85vh',
          backgroundColor: 'var(--surface)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {step === 'review' && 'Review Your Profile'}
              {step === 'analyze' && 'Your AI Analysis'}
              {step === 'apply' && 'Apply Recommendations'}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Step {step === 'review' ? '1' : step === 'analyze' ? '2' : '3'} of 3
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
          }}
        >
          {/* REVIEW STEP */}
          {step === 'review' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Height</span>
                  <input
                    type="number"
                    placeholder="Height (cm)"
                    value={draftProfile.heightCm ?? ''}
                    onChange={(e) => setDraftProfile((p) => ({ ...p, heightCm: toOptionalNumber(e.target.value) }))}
                    style={fieldStyle}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Current Weight</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Current Weight (kg)"
                    value={draftProfile.weightKg ?? ''}
                    onChange={(e) => setDraftProfile((p) => ({ ...p, weightKg: toOptionalNumber(e.target.value) }))}
                    style={fieldStyle}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Target Weight</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Target Weight (kg)"
                    value={draftProfile.targetWeightKg ?? ''}
                    onChange={(e) => setDraftProfile((p) => ({ ...p, targetWeightKg: toOptionalNumber(e.target.value) }))}
                    style={fieldStyle}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Target Date</span>
                  <input
                    type="date"
                    placeholder="Target Date"
                    value={draftProfile.targetDate ?? ''}
                    onChange={(e) => setDraftProfile((p) => ({ ...p, targetDate: e.target.value || undefined }))}
                    style={fieldStyle}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Age</span>
                  <input
                    type="number"
                    placeholder="Age"
                    value={draftProfile.age ?? ''}
                    onChange={(e) => setDraftProfile((p) => ({ ...p, age: toOptionalNumber(e.target.value) }))}
                    style={fieldStyle}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Gender</span>
                  <input
                    type="text"
                    placeholder="Gender"
                    value={draftProfile.gender ?? ''}
                    onChange={(e) => setDraftProfile((p) => ({ ...p, gender: e.target.value || undefined }))}
                    style={fieldStyle}
                  />
                </label>
              </div>

              {error && (
                <div
                  style={{
                    padding: 12,
                    backgroundColor: 'var(--accent-warm)22',
                    borderLeft: '3px solid var(--accent-warm)',
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--accent-warm)' }}>{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ANALYZE STEP */}
          {step === 'analyze' && result?.analysis && (
            <div>
              {/* Feasibility banner */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: result.analysis.feasibility_check?.passed ? '#34d39918' : '#f8717118',
                  border: `1px solid ${result.analysis.feasibility_check?.passed ? '#34d399' : '#f87171'}44`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {result.analysis.feasibility_check?.passed ? (
                  <CheckCircle2 size={18} style={{ color: '#34d399', flexShrink: 0 }} />
                ) : (
                  <AlertTriangle size={18} style={{ color: '#f87171', flexShrink: 0 }} />
                )}
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {result.analysis.feasibility_check?.passed ? 'Goal is Achievable' : 'Needs Attention'}
                  </p>
                  {result.analysis.feasibility_check?.reason && (
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>
                      {result.analysis.feasibility_check.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick metric pills */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'BMI', value: result.analysis.bmi?.toFixed(1) || '—', color: '#8b5cf6', icon: <Activity size={12} color="#8b5cf6" /> },
                  { label: 'BMR', value: result.analysis.bmr ? `${result.analysis.bmr}` : '—', color: '#06b6d4', icon: <Zap size={12} color="#06b6d4" /> },
                  { label: 'TDEE', value: result.analysis.tdee ? `${result.analysis.tdee}` : '—', color: '#10b981', icon: <TrendingUp size={12} color="#10b981" /> },
                ].map((m) => (
                  <div
                    key={m.label}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 12,
                      background: `${m.color}18`,
                      border: `1px solid ${m.color}33`,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{m.icon}</div>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>{m.value}</p>
                    <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: 0.8 }}>{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Calorie target */}
              {result.analysis.recommendation?.daily_calories && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: '#f59e0b18',
                    border: '1px solid #f59e0b33',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Daily Calorie Target</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#f59e0b' }}>
                    {result.analysis.recommendation.daily_calories}
                    <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 3 }}>cal</span>
                  </p>
                </div>
              )}

              {/* Milestone count teaser */}
              {result.analysis.recommendation?.milestones && result.analysis.recommendation.milestones.length > 0 && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                    📍 {result.analysis.recommendation?.milestones?.length ?? 0} progress milestones mapped
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Timeline ready</p>
                </div>
              )}

              {/* Primary CTA — go to apply step */}
              <button
                onClick={() => setStep('apply')}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 14,
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                Choose What to Apply
                <ChevronRight size={16} />
              </button>

              {/* Secondary — full analysis page */}
              <button
                onClick={() => {
                  sessionStorage.setItem('ai_analysis_result', JSON.stringify(result));
                  navigate('/settings/ai-planner/analysis');
                }}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 14,
                  background: 'none',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <ExternalLink size={13} />
                View Full Analysis
              </button>
            </div>
          )}

          {/* APPLY STEP */}
          {step === 'apply' && result && (
            <div>
              <p style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                Select which recommendations to apply to your profile:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Daily Calories */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    backgroundColor: 'var(--surface-elevated)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkedFields.dailyCaloriesTarget ?? false}
                    onChange={(e) =>
                      setCheckedFields({ ...checkedFields, dailyCaloriesTarget: e.target.checked })
                    }
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      Daily Calories
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                      {result.analysis?.recommendation?.daily_calories || result.analysis?.tdee || result.dailyCaloriesTarget || '—'} cal/day
                    </p>
                  </div>
                </label>

                {/* Activity Level */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    backgroundColor: 'var(--surface-elevated)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkedFields.activityLevel ?? false}
                    onChange={(e) =>
                      setCheckedFields({ ...checkedFields, activityLevel: e.target.checked })
                    }
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      Activity Level
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                      {result.analysis?.recommendation?.activity_level || result.activityLevel || draftProfile.activityLevel || '—'}
                    </p>
                  </div>
                </label>

                {/* Diet Preference */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    backgroundColor: 'var(--surface-elevated)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkedFields.dietPreference ?? false}
                    onChange={(e) =>
                      setCheckedFields({ ...checkedFields, dietPreference: e.target.checked })
                    }
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      Diet Preference
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                      {result.dietPreference || draftProfile.dietPreference || '—'}
                    </p>
                  </div>
                </label>

                {/* Budget */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    backgroundColor: 'var(--surface-elevated)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkedFields.budgetPerWeek ?? false}
                    onChange={(e) =>
                      setCheckedFields({ ...checkedFields, budgetPerWeek: e.target.checked })
                    }
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      Budget Per Week
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                      {result.budgetPerWeek
                        ? `$${result.budgetPerWeek}/week`
                        : draftProfile.budgetPerWeek
                          ? `$${draftProfile.budgetPerWeek}/week`
                          : '—'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <button
            onClick={handleBack}
            style={{
              flex: step === 'review' ? 1 : 0,
              padding: '10px 16px',
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 'bold',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {step === 'review' ? 'Close' : <ChevronLeft size={16} />}
            {step !== 'review' && 'Back'}
          </button>

          {step === 'review' && (
            <button
              onClick={handleGenerateAnalysis}
              disabled={!canGenerateAnalysis || loading}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: canGenerateAnalysis && !loading ? 'var(--accent)' : 'var(--accent)44',
                border: 'none',
                borderRadius: 8,
                cursor: canGenerateAnalysis && !loading ? 'pointer' : 'not-allowed',
                fontSize: 13,
                fontWeight: 'bold',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Generating...
                </>
              ) : (
                <>
                  Generate Analysis
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          )}

          {step === 'analyze' && (
            <div style={{ display: 'none' }}>
              {/* navigation handled by buttons inside analyze content */}
            </div>
          )}

          {step === 'apply' && (
            <button
              onClick={handleApply}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: 'var(--accent)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 'bold',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              Apply Selected
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
