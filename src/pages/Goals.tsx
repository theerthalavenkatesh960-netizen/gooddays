import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Check, ChevronLeft, Plus, Trash2 } from 'lucide-react';
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

export default function Goals() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGoalId, setActiveGoalId] = useState<number | null>(id ? Number(id) : null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    category: '',
    icon: '🎯',
    color: '#10b981',
    goalType: 'checklist' as GoalType,
    targetValue: '',
    unit: '',
    deadlineDate: '',
  });
  const [progressInput, setProgressInput] = useState('');

  async function loadGoals() {
    setLoading(true);
    try {
      const data = await api.getGoals();
      const list: Goal[] = Array.isArray(data) ? data : [];
      setGoals(list);
      if (!activeGoalId && list.length > 0) {
        setActiveGoalId(list[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
  }, []);

  useEffect(() => {
    if (!activeGoalId) return;
    navigate(`/goals/${activeGoalId}`, { replace: true });
  }, [activeGoalId]);

  const activeGoal = useMemo(() => goals.find(g => g.id === activeGoalId) || null, [goals, activeGoalId]);

  useEffect(() => {
    if (!activeGoal || activeGoal.goalType !== 'checklist') {
      setChecklistItems([]);
      return;
    }
    api.getGoalChecklistItems(activeGoal.id)
      .then((rows: any) => setChecklistItems(Array.isArray(rows) ? rows : []))
      .catch(() => setChecklistItems([]));
  }, [activeGoal?.id, activeGoal?.goalType]);

  async function createGoal() {
    if (!newGoal.title.trim()) return;

    const body: any = {
      title: newGoal.title.trim(),
      category: newGoal.category || null,
      icon: newGoal.icon || '🎯',
      color: newGoal.color || '#10b981',
      goalType: newGoal.goalType,
      deadlineDate: newGoal.deadlineDate || null,
      autoComplete: true,
    };

    if (newGoal.goalType === 'milestone') {
      const parsed = Number(newGoal.targetValue || 0);
      body.targetValue = Number.isFinite(parsed) ? parsed : 0;
      body.unit = newGoal.unit || null;
    }

    const created = await api.createGoal(body);
    setGoals(prev => [created, ...prev]);
    setActiveGoalId(created.id);
    setNewGoalOpen(false);
    setNewGoal({
      title: '',
      category: '',
      icon: '🎯',
      color: '#10b981',
      goalType: 'checklist',
      targetValue: '',
      unit: '',
      deadlineDate: '',
    });
  }

  async function removeGoal(goalId: number) {
    await api.deleteGoal(goalId);
    const next = goals.filter(g => g.id !== goalId);
    setGoals(next);
    if (activeGoalId === goalId) {
      setActiveGoalId(next[0]?.id ?? null);
    }
  }

  async function addChecklistItem() {
    if (!activeGoal || !newChecklistItem.trim()) return;
    const created = await api.createGoalChecklistItem(activeGoal.id, { title: newChecklistItem.trim() });
    setChecklistItems(prev => [...prev, created].sort((a, b) => a.position - b.position));
    setNewChecklistItem('');
    await loadGoals();
  }

  async function toggleChecklistItem(item: ChecklistItem) {
    const updated = await api.updateGoalChecklistItem(item.id, { isCompleted: !item.isCompleted });
    setChecklistItems(prev => prev.map(p => p.id === item.id ? updated : p));
    await loadGoals();
  }

  async function deleteChecklistItem(itemId: number) {
    await api.deleteGoalChecklistItem(itemId);
    setChecklistItems(prev => prev.filter(i => i.id !== itemId));
    await loadGoals();
  }

  async function addMilestoneProgress() {
    if (!activeGoal) return;
    const delta = Number(progressInput || 0);
    if (!Number.isFinite(delta) || delta <= 0) return;
    const updated = await api.updateGoalProgress(activeGoal.id, {
      valueDelta: delta,
      log: {
        date: new Date().toISOString().slice(0, 10),
        content: `Progress +${delta}`,
        valueDelta: delta,
      },
    });
    setProgressInput('');
    setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
  }

  if (loading) {
    return <div className="pt-16 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/life')} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
          <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Goals</h1>
        <button onClick={() => setNewGoalOpen(true)} className="ml-auto h-9 px-3 rounded-xl flex items-center gap-1 text-white" style={{ backgroundColor: 'var(--accent)' }}>
          <Plus size={14} /> New
        </button>
      </div>

      <div className="grid gap-3">
        {goals.map(goal => (
          <button key={goal.id} onClick={() => setActiveGoalId(goal.id)} className="w-full text-left rounded-2xl p-3" style={{ backgroundColor: activeGoalId === goal.id ? 'var(--surface-elevated)' : 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{goal.icon || '🎯'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{goal.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{goal.goalType === 'checklist' ? `${goal.checklistCompleted ?? 0}/${goal.checklistTotal ?? 0} done` : `${goal.currentValue ?? 0}/${goal.targetValue ?? 0} ${goal.unit ?? ''}`}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); removeGoal(goal.id); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
                <Trash2 size={14} style={{ color: '#ef4444' }} />
              </button>
            </div>
            <div className="mt-2 h-2 rounded-full" style={{ backgroundColor: 'var(--surface)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, Number(goal.progressPercent ?? 0)))}%`, backgroundColor: goal.color || 'var(--accent)' }} />
            </div>
          </button>
        ))}
      </div>

      {activeGoal && (
        <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{activeGoal.title}</h2>
            <CountdownBadge goal={activeGoal} />
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{activeGoal.category || 'General'} • {activeGoal.goalType}</p>

          {activeGoal.goalType === 'checklist' ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} placeholder="Add checklist item"
                  className="flex-1 h-10 px-3 rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                <button onClick={addChecklistItem} className="h-10 px-3 rounded-xl text-white" style={{ backgroundColor: 'var(--accent-green)' }}>Add</button>
              </div>

              {checklistItems.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No items yet.</p>
              ) : (
                checklistItems
                  .sort((a, b) => a.position - b.position)
                  .map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                      <button onClick={() => toggleChecklistItem(item)} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: item.isCompleted ? 'var(--accent-green)' : 'var(--surface)' }}>
                        {item.isCompleted && <Check size={12} color="#fff" />}
                      </button>
                      <span className="flex-1 text-sm" style={{ color: item.isCompleted ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.isCompleted ? 'line-through' : 'none' }}>{item.title}</span>
                      <button onClick={() => deleteChecklistItem(item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
                        <Trash2 size={12} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {(activeGoal.currentValue ?? 0).toLocaleString()} / {(activeGoal.targetValue ?? 0).toLocaleString()} {activeGoal.unit || ''}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Progress {Number(activeGoal.progressPercent ?? 0).toFixed(2)}%</p>
              </div>
              <div className="flex gap-2">
                <input type="number" value={progressInput} onChange={e => setProgressInput(e.target.value)} placeholder={`Add ${activeGoal.unit || 'value'}`}
                  className="flex-1 h-10 px-3 rounded-xl outline-none num" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                <button onClick={addMilestoneProgress} className="h-10 px-3 rounded-xl text-white" style={{ backgroundColor: 'var(--accent)' }}>Update</button>
              </div>
            </div>
          )}
        </div>
      )}

      {newGoalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Create Goal</h3>
            <div className="space-y-2">
              <input value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} placeholder="Goal title" className="w-full h-10 px-3 rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
              <input value={newGoal.category} onChange={e => setNewGoal(p => ({ ...p, category: e.target.value }))} placeholder="Category" className="w-full h-10 px-3 rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
              <div className="grid grid-cols-2 gap-2">
                <select value={newGoal.goalType} onChange={e => setNewGoal(p => ({ ...p, goalType: e.target.value as GoalType }))}
                  className="h-10 px-3 rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
                  <option value="checklist">Checklist Goal</option>
                  <option value="milestone">Milestone Goal</option>
                </select>
                <div className="flex items-center gap-2 h-10 px-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                  <input type="date" value={newGoal.deadlineDate} onChange={e => setNewGoal(p => ({ ...p, deadlineDate: e.target.value }))}
                    className="bg-transparent text-sm flex-1 outline-none" style={{ color: 'var(--text-primary)' }} />
                </div>
              </div>
              {newGoal.goalType === 'milestone' && (
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={newGoal.targetValue} onChange={e => setNewGoal(p => ({ ...p, targetValue: e.target.value }))} placeholder="Target value"
                    className="h-10 px-3 rounded-xl outline-none num" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                  <input value={newGoal.unit} onChange={e => setNewGoal(p => ({ ...p, unit: e.target.value }))} placeholder="Unit (INR)"
                    className="h-10 px-3 rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setNewGoalOpen(false)} className="flex-1 h-10 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={createGoal} className="flex-1 h-10 rounded-xl text-white" style={{ backgroundColor: 'var(--accent)' }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
