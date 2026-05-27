import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { HealthRecommendationAnalysis } from '../lib/api';
import { TimelineChart, type Milestone } from './TimelineChart';
import { MacroChart } from './MacroChart';

type AnalysisCardProps = {
  analysis: HealthRecommendationAnalysis;
  feasible?: boolean;
};

export function AnalysisCard({ analysis, feasible }: AnalysisCardProps) {
  if (!analysis) {
    return null;
  }

  // Extract milestones
  const milestones: Milestone[] = [];
  if (analysis.recommendation?.milestones && Array.isArray(analysis.recommendation.milestones)) {
    analysis.recommendation.milestones.forEach((m: any, idx: number) => {
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

  // Extract macros from recommendation
  const macros = analysis.recommendation?.macros || { protein_g: 0, carbs_g: 0, fat_g: 0 };

  // Feasibility status
  const feasibilityPassed = feasible ?? analysis.feasibility_check?.passed ?? false;
  const feasibilityReason = analysis.feasibility_check?.reason || 'Analysis complete';

  return (
    <div
      className="rounded-3xl p-4"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: feasibilityPassed ? 'var(--accent)22' : 'var(--accent-warm)22',
          }}
        >
          {feasibilityPassed ? (
            <CheckCircle2 size={20} style={{ color: 'var(--accent)' }} />
          ) : (
            <AlertTriangle size={20} style={{ color: 'var(--accent-warm)' }} />
          )}
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {feasibilityPassed ? 'Goal is Achievable' : 'Goal Requires Attention'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {feasibilityReason}
          </p>
        </div>
      </div>

      {/* Key Metrics (3 cards) */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {/* BMI */}
        <div
          style={{
            padding: 12,
            backgroundColor: 'var(--surface-elevated)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            BMI
          </p>
          <p style={{ margin: '6px 0 0 0', fontSize: 18, fontWeight: 'bold', color: 'var(--text-primary)' }}>
            {analysis.bmi?.toFixed(1) || '—'}
          </p>
          <p style={{ margin: '2px 0 0 0', fontSize: 9, color: 'var(--text-muted)' }}>
            {analysis.bmi && analysis.bmi < 18.5
              ? 'Underweight'
              : analysis.bmi && analysis.bmi < 25
                ? '✓ Healthy'
                : analysis.bmi && analysis.bmi < 30
                  ? 'Overweight'
                  : 'Obese'}
          </p>
        </div>

        {/* BMR */}
        <div
          style={{
            padding: 12,
            backgroundColor: 'var(--surface-elevated)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            BMR
          </p>
          <p style={{ margin: '6px 0 0 0', fontSize: 18, fontWeight: 'bold', color: 'var(--text-primary)' }}>
            {analysis.bmr || '—'}
          </p>
          <p style={{ margin: '2px 0 0 0', fontSize: 9, color: 'var(--text-muted)' }}>cal/day</p>
        </div>

        {/* TDEE */}
        <div
          style={{
            padding: 12,
            backgroundColor: 'var(--surface-elevated)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            TDEE
          </p>
          <p style={{ margin: '6px 0 0 0', fontSize: 18, fontWeight: 'bold', color: 'var(--text-primary)' }}>
            {analysis.tdee || '—'}
          </p>
          <p style={{ margin: '2px 0 0 0', fontSize: 9, color: 'var(--text-muted)' }}>cal/day</p>
        </div>
      </div>

      {/* Milestones Timeline */}
      {milestones.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>
            Progress Milestones
          </p>
          <TimelineChart milestones={milestones} />
        </div>
      )}

      {/* Macros */}
      {macros && (
        <div className="mb-6">
          <p className="text-xs font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>
            Daily Macronutrient Target
          </p>
          <MacroChart
            protein={macros.protein_g || 0}
            carbs={macros.carbs_g || 0}
            fat={macros.fat_g || 0}
            unit="g"
          />
        </div>
      )}

      {/* Warnings / Alternative Plan */}
      {analysis.recommendation?.warnings && analysis.recommendation.warnings.length > 0 && (
        <div
          style={{
            padding: 12,
            backgroundColor: 'var(--accent-warm)11',
            borderLeft: '3px solid var(--accent-warm)',
            borderRadius: 8,
            marginTop: 12,
          }}
        >
          <p style={{ margin: 0, fontSize: 11, fontWeight: 'bold', color: 'var(--accent-warm)', marginBottom: 6 }}>
            ⚠️ Important Notes
          </p>
          {analysis.recommendation.warnings.map((warning: string, idx: number) => (
            <p key={idx} style={{ margin: '4px 0', fontSize: 10, color: 'var(--text-secondary)' }}>
              • {warning}
            </p>
          ))}
        </div>
      )}

      {/* Alternative Plan */}
      {analysis.alternative_plan && (
        <div
          style={{
            padding: 12,
            backgroundColor: 'var(--accent)11',
            borderLeft: '3px solid var(--accent)',
            borderRadius: 8,
            marginTop: 12,
          }}
        >
          <p style={{ margin: 0, fontSize: 11, fontWeight: 'bold', color: 'var(--accent)', marginBottom: 6 }}>
            💡 Alternative Approach
          </p>
          <p style={{ margin: '4px 0', fontSize: 10, color: 'var(--text-secondary)' }}>
            {analysis.alternative_plan.description || analysis.alternative_plan.interim_focus || 'Consider a different timeline or approach.'}
          </p>
        </div>
      )}
    </div>
  );
}
