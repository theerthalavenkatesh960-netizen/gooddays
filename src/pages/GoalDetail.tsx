import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Edit2, Plus, Trash2 } from 'lucide-react';
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

type ChecklistItem = {
  id: number;
  goalId: number;
  title: string;
  isCompleted: boolean;
  position: number;
};

function CountdownBadge({ goal }: { goal: Goal }) {
  if (goal.status === 'completed') {
    return <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }}>Completed</span>;
  }
  if (goal.daysRemaining === null || goal.daysRemaining === undefined) {
    return <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>No deadline</span>;
  }
  if (goal.daysRemaining < 0) {
    return <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>{Math.abs(goal.daysRemaining)} days overdue</span>;
  }
  return <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>{goal.daysRemaining} days left</span>;
}

export default function GoalDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const goalId = Number(id);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [progressInput, setProgressInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function loadGoal() {
    try {
      const goals: Goal[] = await api.getGoals();
      const found = Array.isArray(goals) ? goals.find(g => g.id === goalId) : null;
      if (!found) { navigate('/goals'); return; }
      setGoal(found);
      if (found.goalType === 'checklist') {
        const items = await api.getGoalChecklistItems(found.id);
        setChecklistItems(Array.isArray(items) ? items : []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadGoal(); }, [goalId]);

  async function toggleItem(item: ChecklistItem) {
    const updated = await api.updateGoalChecklistItem(item.id, { isCompleted: !item.isCompleted });
    setChecklistItems(prev => prev.map(p => p.id === item.id ? updated : p));
    const goals: Goal[] = await api.getGoals();
    const refreshed = goals.find(g => g.id === goalId);
    if (refreshed) setGoal(refreshed);
  }

  async function addItem() {
    if (!goal || !newItem.trim()) return;
    const created = await api.createGoalChecklistItem(goal.id, { title: newItem.trim() });
    setChecklistItems(prev => [...prev, created].sort((a, b) => a.position - b.position));
    setNewItem('');
    const goals: Goal[] = await api.getGoals();
    const refreshed = goals.find(g => g.id === goalId);
    if (refreshed) setGoal(refreshed);
  }

  async function deleteItem(itemId: number) {
    await api.deleteGoalChecklistItem(itemId);
    setChecklistItems(prev => prev.filter(i => i.id !== itemId));
    const goals: Goal[] = await api.getGoals();
    const refreshed = goals.find(g => g.id === goalId);
    if (refreshed) setGoal(refreshed);
  }

  async function addProgress() {
    if (!goal) return;
    const delta = Number(progressInput || 0);
    if (!Number.isFinite(delta) || delta <= 0) return;
    const updated = await api.updateGoalProgress(goal.id, {
      valueDelta: delta,
      log: { date: new Date().toISOString().slice(0, 10), content: `Progress +${delta}`, valueDelta: delta },
    });
    setProgressInput('');
    setGoal(updated);
  }

  async function deleteGoal() {
    await api.deleteGoal(goalId);
    navigate('/goals');
  }

  if (loading) {
    return (
      <div className="pt-16 flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!goal) return null;

  const progress = Math.max(0, Math.min(100, Number(goal.progressPercent ?? 0)));

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/goals')} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{goal.title}</h1>
        <button onClick={() => navigate(`/goals/${goal.id}/edit`)} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <Edit2 size={16} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <button onClick={() => setConfirmDelete(true)} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
          <Trash2 size={16} style={{ color: '#ef4444' }} />
        </button>
      </div>

      {/* Goal Hero Card */}
      <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
        <div className="h-24 flex items-center justify-center" style={{ backgroundColor: (goal.color || 'var(--accent)') + '22' }}>
          <span className="text-5xl">{goal.icon || '🎯'}</span>
        </div>
        <div className="p-4" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{goal.title}</p>
            <CountdownBadge goal={goal} />
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            {goal.category || 'General'} · {goal.goalType === 'checklist' ? 'Checklist' : 'Milestone'}
          </p>

          {/* Progress bar */}
          <div className="h-2.5 rounded-full overflow-hidden mb-1" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: goal.color || 'var(--accent)' }} />
          </div>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            {goal.goalType === 'checklist'
              ? <span>{goal.checklistCompleted ?? 0} of {goal.checklistTotal ?? 0} done</span>
              : <span>{(goal.currentValue ?? 0).toLocaleString()} / {(goal.targetValue ?? 0).toLocaleString()} {goal.unit || ''}</span>
            }
            <span className="font-semibold num">{progress.toFixed(0)}%</span>
          </div>

          {goal.deadlineDate && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Deadline: {new Date(goal.deadlineDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Checklist Section */}
      {goal.goalType === 'checklist' && (
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Checklist</p>

          <div className="flex gap-2 mb-3">
            <input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Add item..."
              className="flex-1 h-10 px-3 rounded-xl outline-none text-sm"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
            <button onClick={addItem} className="h-10 px-3 rounded-xl text-white flex items-center gap-1 press" style={{ backgroundColor: 'var(--accent)' }}>
              <Plus size={14} /> Add
            </button>
          </div>

          {checklistItems.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No items yet. Add your first checklist item above.</p>
          ) : (
            <div className="space-y-2">
              {checklistItems
                .sort((a, b) => a.position - b.position)
                .map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                    <button
                      onClick={() => toggleItem(item)}
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 press"
                      style={{ backgroundColor: item.isCompleted ? (goal.color || 'var(--accent-green)') : 'var(--surface)', border: `2px solid ${item.isCompleted ? (goal.color || 'var(--accent-green)') : 'var(--border)'}` }}
                    >
                      {item.isCompleted && <Check size={12} color="#fff" />}
                    </button>
                    <span className="flex-1 text-sm" style={{ color: item.isCompleted ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.isCompleted ? 'line-through' : 'none' }}>
                      {item.title}
                    </span>
                    <button onClick={() => deleteItem(item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center press" style={{ color: '#ef4444' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Milestone Section */}
      {goal.goalType === 'milestone' && (
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Log Progress</p>
          <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <p className="text-xl font-bold num" style={{ color: 'var(--text-primary)' }}>
              {(goal.currentValue ?? 0).toLocaleString()} <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>/ {(goal.targetValue ?? 0).toLocaleString()} {goal.unit}</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{progress.toFixed(1)}% complete</p>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={progressInput}
              onChange={e => setProgressInput(e.target.value)}
              placeholder={`Add ${goal.unit || 'value'}...`}
              className="flex-1 h-10 px-3 rounded-xl outline-none num"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
            <button onClick={addProgress} className="h-10 px-4 rounded-xl text-white font-medium press" style={{ backgroundColor: 'var(--accent)' }}>
              Update
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)' }}>
            <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Delete Goal?</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>This will permanently delete "{goal.title}" and all its data.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 h-10 rounded-xl font-medium press" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={deleteGoal} className="flex-1 h-10 rounded-xl font-medium text-white press" style={{ backgroundColor: '#ef4444' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
