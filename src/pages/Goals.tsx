import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import * as api from '../lib/api';

type GoalType = 'checklist' | 'milestone';

type Goal = {
  id: number;
  title: string;
  category?: string;
  color?: string;
  icon?: string;
  goalType: GoalType;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  deadlineDate?: string;
  status?: string;
  checklistTotal?: number;
  checklistCompleted?: number;
  progressPercent?: number;
  daysRemaining?: number | null;
};

function computeGoalProgress(goal: Goal): number {
  const goalType = String(goal.goalType || '').trim().toLowerCase();

  if (goalType === 'checklist') {
    const total = Number(goal.checklistTotal ?? 0);
    const completed = Number(goal.checklistCompleted ?? 0);
    if (total <= 0) return 0;
    return (completed / total) * 100;
  }

  if (goalType === 'milestone') {
    const target = Number(goal.targetValue ?? 0);
    const current = Number(goal.currentValue ?? 0);
    if (target <= 0) return 0;
    return (current / target) * 100;
  }

  const fallback = Number(goal.progressPercent ?? 0);
  if (Number.isFinite(fallback)) return fallback;
  return 0;
}

function StatusBadge({ goal }: { goal: Goal }) {
  if (goal.status === 'completed') {
    return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }}>Done</span>;
  }
  if (goal.daysRemaining === null || goal.daysRemaining === undefined) return null;
  if (goal.daysRemaining < 0) {
    return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>{Math.abs(goal.daysRemaining)}d overdue</span>;
  }
  return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>{goal.daysRemaining}d left</span>;
}

export default function Goals() {
  const navigate = useNavigate();
  const location = useLocation();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadGoals(showLoader = false) {
    if (showLoader) setLoading(true);
    try {
      const data = await api.getGoals();
      setGoals(Array.isArray(data) ? data : []);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals(true);
  }, []);

  useEffect(() => {
    loadGoals(false);
  }, [location.key]);

  useEffect(() => {
    function handleFocusRefresh() {
      loadGoals(false);
    }

    window.addEventListener('focus', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleFocusRefresh);

    return () => {
      window.removeEventListener('focus', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleFocusRefresh);
    };
  }, []);

  if (loading) {
    return (
      <div className="pt-16 flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/life?tab=Goals')} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Goals</h1>
        <button onClick={() => navigate('/goals/new')} className="ml-auto h-9 px-3 rounded-xl flex items-center gap-1 text-white press" style={{ backgroundColor: 'var(--accent)' }}>
          <Plus size={14} /> New
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No goals yet</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Set your first goal to start tracking progress</p>
          <button onClick={() => navigate('/goals/new')} className="h-10 px-5 rounded-xl text-white font-medium press" style={{ backgroundColor: 'var(--accent)' }}>
            <Plus size={14} className="inline mr-1" /> Create Goal
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {goals.map(goal => {
            const progress = Math.max(0, Math.min(100, computeGoalProgress(goal)));
            return (
              <button
                key={goal.id}
                onClick={() => navigate(`/goals/${goal.id}`, { state: { from: `${location.pathname}${location.search}` } })}
                className="w-full text-left rounded-2xl p-4 press"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: (goal.color || 'var(--accent)') + '22' }}>
                    {goal.icon || '🎯'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{goal.title}</p>
                      <StatusBadge goal={goal} />
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {goal.category || 'General'} ·{' '}
                      {goal.goalType === 'checklist'
                        ? `${goal.checklistCompleted ?? 0}/${goal.checklistTotal ?? 0} done`
                        : `${(goal.currentValue ?? 0).toLocaleString()}/${(goal.targetValue ?? 0).toLocaleString()} ${goal.unit ?? ''}`}
                    </p>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: goal.color || 'var(--accent)' }} />
                </div>
                <p className="text-right text-[10px] mt-1 num font-medium" style={{ color: 'var(--text-muted)' }}>{progress.toFixed(0)}%</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
