import { useState, useEffect } from 'react';
import {
  ChevronLeft, Target, BookOpen, BarChart2, Plus, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { useLocation, useNavigate } from 'react-router-dom';
import * as api from '../lib/api';

type LifeTab = 'Goals' | 'Journal' | 'Review';

const LIFE_TABS: { id: LifeTab; label: string; icon: React.ComponentType<{ size?: string | number }> }[] = [
  { id: 'Goals', label: 'Goals', icon: Target },
  { id: 'Journal', label: 'Journal', icon: BookOpen },
  { id: 'Review', label: 'Review', icon: BarChart2 },
];

function PillTabs({ active, onChange }: { active: LifeTab; onChange: (tab: LifeTab) => void }) {
  return (
    <div className="flex gap-2 p-2 rounded-2xl mb-4 sticky top-14 z-10" style={{ backgroundColor: 'var(--surface)' }}>
      {LIFE_TABS.map(t => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold press"
            style={{
              backgroundColor: active === t.id ? 'var(--accent)' : 'transparent',
              color: active === t.id ? '#fff' : 'var(--text-muted)'
            }}
          >
            <Icon size={16} />{t.label}
          </button>
        );
      })}
    </div>
  );
}

function GoalsTab() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGoals().then((data: any) => {
      setGoals(Array.isArray(data) ? data : []);
    }).catch(() => setGoals([])).finally(() => setLoading(false));
  }, []);

  const ICON_COLORS = ['#6C63FF','#FF6B6B','#4ECDC4','#FFD93D','#10B981'];

  if (loading) return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} /></div>;

  return (
    <div className="px-4 pb-nav space-y-3">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Active Goals</span>
        <button onClick={() => navigate('/goals/new', { state: { from: '/settings/life' } })} className="press flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
          <Plus size={16} /> New Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="py-12 text-center">
          <Target size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No goals yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Create your first goal to get started</p>
        </div>
      ) : (
        goals.map((g: any, i) => {
          const color = g.color ?? ICON_COLORS[i % ICON_COLORS.length];
          const pct = Math.min(100, Math.round((g.currentProgress ?? 0) / Math.max(1, g.targetValue ?? 100) * 100));
          return (
            <button
              key={g.id}
              onClick={() => navigate(`/goals/${g.id}`, { state: { from: '/settings/life' } })}
              className="w-full text-left p-4 rounded-2xl press"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: color + '22' }}>
                  {g.icon ?? '🎯'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{g.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{g.category ?? 'Personal'}</p>
                </div>
                <span className="text-sm font-bold num" style={{ color }}>{pct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

function JournalTab() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const MOOD_EMOJI: Record<string, string> = {
    happy: '😄', grateful: '🙏', motivated: '⚡', tired: '😴', neutral: '😐',
  };
  const MOOD_COLORS: Record<string, string> = {
    happy: '#FFD93D', grateful: '#4ECDC4', motivated: '#6C63FF',
    tired: '#8888A0', neutral: '#55556A',
  };

  useEffect(() => {
    api.getJournalEntries().then((data: any) => {
      setEntries(Array.isArray(data) ? data : []);
    }).catch(() => setEntries([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} /></div>;

  return (
    <div className="px-4 pb-nav space-y-3">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Journal Entries</span>
        <button onClick={() => navigate('/journal/new')} className="press flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
          <Plus size={16} /> New Entry
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="py-12 text-center">
          <BookOpen size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No entries yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Start your first journal entry today</p>
        </div>
      ) : (
        entries.map((e: any) => {
          const mood = e.mood ?? 'neutral';
          const color = MOOD_COLORS[mood] ?? '#8888A0';
          return (
            <button
              key={e.id}
              onClick={() => navigate(`/journal/${e.id}/edit`)}
              className="w-full text-left p-4 rounded-2xl press"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ backgroundColor: color + '22' }}>
                  {MOOD_EMOJI[mood] ?? '📓'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{e.title}</p>
                  {e.body && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{e.body}</p>}
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {e.createdAt ? format(new Date(e.createdAt), 'd MMM yyyy') : ''}
              </p>
            </button>
          );
        })
      )}
    </div>
  );
}

function ReviewTab() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingAdjustments, setGeneratingAdjustments] = useState(false);
  const [applyingAdjustments, setApplyingAdjustments] = useState(false);
  const [recommendation, setRecommendation] = useState<api.WeeklyRecommendationResponse | null>(null);
  const [includeMeals, setIncludeMeals] = useState('');
  const [excludeMeals, setExcludeMeals] = useState('');
  const [includeMealNames, setIncludeMealNames] = useState('');
  const [excludeMealNames, setExcludeMealNames] = useState('');
  const [includeExercises, setIncludeExercises] = useState('');
  const [excludeExercises, setExcludeExercises] = useState('');
  const [includeMuscleGroups, setIncludeMuscleGroups] = useState('');
  const [excludeMuscleGroups, setExcludeMuscleGroups] = useState('');
  const [mealPlanDraft, setMealPlanDraft] = useState('');
  const [workoutDraft, setWorkoutDraft] = useState('');
  const [currentSnapshotId, setCurrentSnapshotId] = useState<number | null>(null);
  const [snapshots, setSnapshots] = useState<api.RecommendationSnapshot[]>([]);

  useEffect(() => {
    api.getWeeklyReviews().then((data: any) => {
      setReviews(Array.isArray(data) ? data : []);
    }).catch(() => setReviews([])).finally(() => setLoading(false));
    api.getRecommendationSnapshots().then(setSnapshots).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await api.generateWeeklyReview();
      if (result) setReviews(prev => [result, ...prev.filter((r: any) => r.id !== result.id)]);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAdjustments = async () => {
    const parseIds = (raw: string) =>
      raw
        .split(',')
        .map(v => Number(v.trim()))
        .filter(v => Number.isInteger(v) && v > 0);

    setGeneratingAdjustments(true);
    try {
      const parseNames = (raw: string) => raw.split(',').map(v => v.trim()).filter(Boolean);
      const resp = await api.generateWeeklyRecommendations({
        forNextWeek: true,
        filters: {
          includeMealTemplateIds: parseIds(includeMeals),
          excludeMealTemplateIds: parseIds(excludeMeals),
          includeMealNames: parseNames(includeMealNames),
          excludeMealNames: parseNames(excludeMealNames),
          includeExerciseIds: parseIds(includeExercises),
          excludeExerciseIds: parseIds(excludeExercises),
          includeMuscleGroups: parseNames(includeMuscleGroups),
          excludeMuscleGroups: parseNames(excludeMuscleGroups),
        },
      });
      const result = resp.result;
      setCurrentSnapshotId(resp.snapshotId);
      setRecommendation(result);
      setMealPlanDraft(JSON.stringify(result.suggestedPlans?.mealPlan || {}, null, 2));
      setWorkoutDraft(JSON.stringify(result.suggestedPlans?.workoutRoutine || {}, null, 2));
      api.getRecommendationSnapshots().then(setSnapshots).catch(() => {});
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingAdjustments(false);
    }
  };

  const handleApplyAdjustments = async () => {
    if (!recommendation) return;

    setApplyingAdjustments(true);
    try {
      const mealPlan = mealPlanDraft ? JSON.parse(mealPlanDraft) : undefined;
      const workoutRoutine = workoutDraft ? JSON.parse(workoutDraft) : undefined;
      await api.applyWeeklyRecommendations({
        targetWeekStart: recommendation.targetWeekStart,
        mealPlan,
        workoutRoutine,
        workoutSplitName: 'Adaptive Weekly Split',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setApplyingAdjustments(false);
    }
  };

  const handleDismissSnapshot = async () => {
    if (!currentSnapshotId) return;
    try {
      await api.decideRecommendationSnapshot(currentSnapshotId, 'dismissed');
      setRecommendation(null);
      setCurrentSnapshotId(null);
      api.getRecommendationSnapshots().then(setSnapshots).catch(() => {});
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} /></div>;

  return (
    <div className="px-4 pb-nav">
      <div className="p-4 rounded-2xl mb-5" style={{ background: 'linear-gradient(135deg, var(--accent)22, var(--surface))', border: '1px solid var(--accent)33' }}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI Weekly Review</span>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Claude analyzes your week across tasks, workouts, finances, and goals to create a personalized review.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
          <input value={includeMeals} onChange={e => setIncludeMeals(e.target.value)} placeholder="Include meal IDs (e.g. 1,5,9)"
            className="h-9 rounded-lg px-3 text-xs" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          <input value={excludeMeals} onChange={e => setExcludeMeals(e.target.value)} placeholder="Exclude meal IDs"
            className="h-9 rounded-lg px-3 text-xs" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          <input value={includeMealNames} onChange={e => setIncludeMealNames(e.target.value)} placeholder="Include meal names (e.g. Oats, Chicken)"
            className="h-9 rounded-lg px-3 text-xs" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          <input value={excludeMealNames} onChange={e => setExcludeMealNames(e.target.value)} placeholder="Exclude meal names"
            className="h-9 rounded-lg px-3 text-xs" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          <input value={includeExercises} onChange={e => setIncludeExercises(e.target.value)} placeholder="Include exercise IDs"
            className="h-9 rounded-lg px-3 text-xs" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          <input value={excludeExercises} onChange={e => setExcludeExercises(e.target.value)} placeholder="Exclude exercise IDs"
            className="h-9 rounded-lg px-3 text-xs" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          <input value={includeMuscleGroups} onChange={e => setIncludeMuscleGroups(e.target.value)} placeholder="Include muscle groups (e.g. chest, legs)"
            className="h-9 rounded-lg px-3 text-xs" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          <input value={excludeMuscleGroups} onChange={e => setExcludeMuscleGroups(e.target.value)} placeholder="Exclude muscle groups"
            className="h-9 rounded-lg px-3 text-xs" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full h-10 rounded-xl text-sm font-semibold text-white press flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <><Sparkles size={14} /> Generate This Week's Review</>
          )}
        </button>

        <button
          onClick={handleGenerateAdjustments}
          disabled={generatingAdjustments}
          className="w-full mt-2 h-10 rounded-xl text-sm font-semibold press flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          {generatingAdjustments ? (
            <>
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--text-secondary)' }} />
              Building recommendations...
            </>
          ) : (
            <>Generate Meal + Workout Adjustments</>
          )}
        </button>
      </div>

      {recommendation && (
        <div className="p-4 rounded-2xl mb-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>This Week's Auto-Adjustments</span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{recommendation.targetWeekStart}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Meal Adherence</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{Math.round(recommendation.signals.mealAdherence * 100)}%</p>
            </div>
            <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Workout Adherence</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{Math.round(recommendation.signals.workoutAdherence * 100)}%</p>
            </div>
          </div>

          <div className="space-y-2">
            {recommendation.recommendations.slice(0, 3).map((item, idx) => (
              <div key={`${item.domain}-${idx}`} className="rounded-lg p-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>{item.proposedChange}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Edit Suggested Meal Plan JSON</p>
            <textarea
              value={mealPlanDraft}
              onChange={e => setMealPlanDraft(e.target.value)}
              className="w-full h-32 rounded-lg p-2 text-[11px]"
              style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />

            <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Edit Suggested Workout Routine JSON</p>
            <textarea
              value={workoutDraft}
              onChange={e => setWorkoutDraft(e.target.value)}
              className="w-full h-32 rounded-lg p-2 text-[11px]"
              style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />

            <div className="flex gap-2">
              <button
                onClick={handleApplyAdjustments}
                disabled={applyingAdjustments}
                className="flex-1 h-10 rounded-xl text-sm font-semibold text-white press disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent-green)' }}
              >
                {applyingAdjustments ? 'Applying...' : 'Apply Edited Plan'}
              </button>
              <button
                onClick={handleDismissSnapshot}
                className="h-10 px-4 rounded-xl text-sm font-semibold press"
                style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {snapshots.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Recommendation History</p>
          <div className="space-y-2">
            {snapshots.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Week of {s.weekStart}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>→ {s.targetWeekStart}</p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{
                  backgroundColor: s.status === 'approved' ? 'var(--accent-green)22' : s.status === 'dismissed' ? 'var(--surface-elevated)' : 'var(--accent)22',
                  color: s.status === 'approved' ? 'var(--accent-green)' : s.status === 'dismissed' ? 'var(--text-muted)' : 'var(--accent)',
                }}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Past Reviews</p>

      {reviews.length === 0 ? (
        <div className="py-12 text-center">
          <BarChart2 size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No reviews yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Generate your first weekly review above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r: any) => (
            <div key={r.id} className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {r.weekStartDate ? format(new Date(r.weekStartDate), 'd MMM yyyy') : 'Weekly Review'}
                </span>
                {r.aiGenerated && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent)22', color: 'var(--accent)' }}>
                    AI
                  </span>
                )}
              </div>
              <div className="flex gap-2 mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                {r.tasksCompleted > 0 && <span>✅ {r.tasksCompleted} tasks</span>}
                {r.workoutDays > 0 && <span>🏋️ {r.workoutDays} days</span>}
                {r.moodAvg > 0 && <span>😊 {r.moodAvg} mood</span>}
              </div>
              {r.aiSummary && (
                <p className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>"{r.aiSummary}"</p>
              )}
              {r.aiPatternNoticed && (
                <div className="p-2 rounded-lg mt-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--accent)' }}>Pattern</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.aiPatternNoticed}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsLife() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<LifeTab>('Goals');

  useEffect(() => {
    const requestedTab = (location.state as any)?.tab;
    if (requestedTab === 'Goals' || requestedTab === 'Journal' || requestedTab === 'Review') {
      setTab(requestedTab);
    }
  }, [location.state]);

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 mb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Life</h1>
      </div>

      <PillTabs active={tab} onChange={setTab} />

      {tab === 'Goals' && <GoalsTab />}
      {tab === 'Journal' && <JournalTab />}
      {tab === 'Review' && <ReviewTab />}
    </div>
  );
}
