import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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

type GoalLog = {
  id: number;
  goalId: number;
  date: string;
  content?: string;
  minutesSpent?: number;
  valueDelta?: number | null;
  createdAt?: string;
};

type PracticeStatus = 'not_started' | 'practicing' | 'confident';

type LearningLogContent = {
  entryType: 'learning';
  topic: string;
  notes: string;
  links: string[];
  practiceStatus: PracticeStatus;
  revisionDueDate?: string;
  weeklyDone: boolean;
};

type LearningEntry = {
  logId: number;
  date: string;
  topic: string;
  notes: string;
  links: string[];
  practiceStatus: PracticeStatus;
  revisionDueDate?: string;
  weeklyDone: boolean;
};

function normalizeDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getWeekStartMonday(now: Date): Date {
  const start = new Date(now);
  const day = start.getDay();
  const diff = (day + 6) % 7;
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function parseLearningContent(raw: string | undefined): LearningLogContent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.entryType !== 'learning') return null;
    const links = Array.isArray(parsed.links)
      ? parsed.links.map((l: any) => String(l || '').trim()).filter((l: string) => !!l)
      : [];
    const practiceRaw = String(parsed.practiceStatus || 'not_started') as PracticeStatus;
    const practiceStatus: PracticeStatus =
      practiceRaw === 'practicing' || practiceRaw === 'confident' ? practiceRaw : 'not_started';
    return {
      entryType: 'learning',
      topic: String(parsed.topic || '').trim(),
      notes: String(parsed.notes || '').trim(),
      links,
      practiceStatus,
      revisionDueDate: parsed.revisionDueDate ? String(parsed.revisionDueDate).slice(0, 10) : undefined,
      weeklyDone: Boolean(parsed.weeklyDone),
    };
  } catch {
    return null;
  }
}

function toLearningContentString(entry: Omit<LearningEntry, 'logId' | 'date'>): string {
  return JSON.stringify({
    entryType: 'learning',
    topic: entry.topic,
    notes: entry.notes,
    links: entry.links,
    practiceStatus: entry.practiceStatus,
    revisionDueDate: entry.revisionDueDate || null,
    weeklyDone: entry.weeklyDone,
  });
}

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
  const location = useLocation();
  const { id } = useParams();
  const goalId = Number(id);
  const backTarget = (location.state as { from?: string } | null)?.from || '/life?tab=Goals';

  const [goal, setGoal] = useState<Goal | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [learningEntries, setLearningEntries] = useState<LearningEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [progressInput, setProgressInput] = useState('');
  const [savingLearning, setSavingLearning] = useState(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [learningForm, setLearningForm] = useState({
    topic: '',
    notes: '',
    links: '',
    practiceStatus: 'not_started' as PracticeStatus,
    revisionDueDate: '',
    weeklyDone: false,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function loadLearningEntries(targetGoalId: number) {
    const logs: GoalLog[] = await api.getGoalLogs(targetGoalId);
    const mapped = (Array.isArray(logs) ? logs : [])
      .map((log) => {
        const content = parseLearningContent(log.content);
        if (!content) return null;
        return {
          logId: log.id,
          date: String(log.date || '').slice(0, 10),
          topic: content.topic,
          notes: content.notes,
          links: content.links,
          practiceStatus: content.practiceStatus,
          revisionDueDate: content.revisionDueDate,
          weeklyDone: content.weeklyDone,
        } as LearningEntry;
      })
      .filter((x): x is LearningEntry => !!x)
      .sort((a, b) => b.date.localeCompare(a.date));
    setLearningEntries(mapped);
  }

  async function loadGoal() {
    try {
      const goals: Goal[] = await api.getGoals();
      const found = Array.isArray(goals) ? goals.find(g => g.id === goalId) : null;
      if (!found) { navigate('/life?tab=Goals'); return; }
      setGoal(found);
      if (found.goalType === 'checklist') {
        const items = await api.getGoalChecklistItems(found.id);
        setChecklistItems(Array.isArray(items) ? items : []);
      }
      await loadLearningEntries(found.id);
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
    navigate(backTarget, { replace: true });
  }

  async function addLearningEntry() {
    if (!goal) return;
    const topic = learningForm.topic.trim();
    const notes = learningForm.notes.trim();
    if (!topic || !notes) return;

    const links = learningForm.links
      .split(/\r?\n|,/)
      .map(v => v.trim())
      .filter(Boolean);

    setSavingLearning(true);
    try {
      const content = toLearningContentString({
        topic,
        notes,
        links,
        practiceStatus: learningForm.practiceStatus,
        revisionDueDate: learningForm.revisionDueDate || undefined,
        weeklyDone: learningForm.weeklyDone,
      });

      await api.addGoalLog(goal.id, {
        date: normalizeDateKey(new Date()),
        content,
        minutesSpent: 0,
      });

      setLearningForm({
        topic: '',
        notes: '',
        links: '',
        practiceStatus: 'not_started',
        revisionDueDate: '',
        weeklyDone: false,
      });
      await loadLearningEntries(goal.id);
    } finally {
      setSavingLearning(false);
    }
  }

  function startEditingLearningEntry(entry: LearningEntry) {
    setEditingLogId(entry.logId);
    setLearningForm({
      topic: entry.topic,
      notes: entry.notes,
      links: entry.links.join('\n'),
      practiceStatus: entry.practiceStatus,
      revisionDueDate: entry.revisionDueDate || '',
      weeklyDone: entry.weeklyDone,
    });
  }

  function cancelEditingLearningEntry() {
    setEditingLogId(null);
    setLearningForm({
      topic: '',
      notes: '',
      links: '',
      practiceStatus: 'not_started',
      revisionDueDate: '',
      weeklyDone: false,
    });
  }

  async function saveEditedLearningEntry() {
    if (!goal || editingLogId == null) return;
    const topic = learningForm.topic.trim();
    const notes = learningForm.notes.trim();
    if (!topic || !notes) return;

    const links = learningForm.links
      .split(/\r?\n|,/)
      .map(v => v.trim())
      .filter(Boolean);

    setSavingLearning(true);
    try {
      await api.updateGoalLog(editingLogId, {
        content: toLearningContentString({
          topic,
          notes,
          links,
          practiceStatus: learningForm.practiceStatus,
          revisionDueDate: learningForm.revisionDueDate || undefined,
          weeklyDone: learningForm.weeklyDone,
        }),
        minutesSpent: 0,
      });

      cancelEditingLearningEntry();
      await loadLearningEntries(goal.id);
    } finally {
      setSavingLearning(false);
    }
  }

  async function deleteLearningEntry(entry: LearningEntry) {
    if (!goal) return;
    await api.deleteGoalLog(entry.logId);
    if (editingLogId === entry.logId) {
      cancelEditingLearningEntry();
    }
    await loadLearningEntries(goal.id);
  }

  async function toggleWeeklyDone(entry: LearningEntry) {
    const nextEntry = { ...entry, weeklyDone: !entry.weeklyDone };
    await api.updateGoalLog(entry.logId, {
      content: toLearningContentString({
        topic: nextEntry.topic,
        notes: nextEntry.notes,
        links: nextEntry.links,
        practiceStatus: nextEntry.practiceStatus,
        revisionDueDate: nextEntry.revisionDueDate,
        weeklyDone: nextEntry.weeklyDone,
      }),
      minutesSpent: 0,
    });
    setLearningEntries(prev => prev.map(x => x.logId === entry.logId ? nextEntry : x));
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
  const currentWeekStart = getWeekStartMonday(new Date());
  const currentWeekStartKey = normalizeDateKey(currentWeekStart);
  const currentWeekEntries = useMemo(
    () => learningEntries.filter(e => e.date >= currentWeekStartKey),
    [learningEntries, currentWeekStartKey],
  );
  const weeklyDoneCount = currentWeekEntries.filter(e => e.weeklyDone).length;
  const todayKey = normalizeDateKey(new Date());
  const dueForRevision = useMemo(
    () => learningEntries
      .filter(e => !!e.revisionDueDate && e.revisionDueDate <= todayKey)
      .sort((a, b) => String(a.revisionDueDate).localeCompare(String(b.revisionDueDate))),
    [learningEntries, todayKey],
  );

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(backTarget, { replace: true })} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
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

      {/* Learning Log Section */}
      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Learning Log</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This week: {weeklyDoneCount}/{currentWeekEntries.length} done</p>
        </div>

        <div className="space-y-2 mb-3">
          <input
            value={learningForm.topic}
            onChange={e => setLearningForm(p => ({ ...p, topic: e.target.value }))}
            placeholder="Topic title (e.g. Consistent Hashing, Barre Chords)"
            className="w-full h-10 px-3 rounded-xl outline-none text-sm"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <textarea
            value={learningForm.notes}
            onChange={e => setLearningForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="What did you learn? Add revision notes here..."
            className="w-full min-h-[90px] px-3 py-2 rounded-xl outline-none text-sm"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <input
            value={learningForm.links}
            onChange={e => setLearningForm(p => ({ ...p, links: e.target.value }))}
            placeholder="Reference links (YouTube/docs), separate with comma or new line"
            className="w-full h-10 px-3 rounded-xl outline-none text-sm"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={learningForm.practiceStatus}
              onChange={e => setLearningForm(p => ({ ...p, practiceStatus: e.target.value as PracticeStatus }))}
              className="h-10 px-3 rounded-xl outline-none text-sm"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            >
              <option value="not_started">Not Started</option>
              <option value="practicing">Practicing</option>
              <option value="confident">Confident</option>
            </select>
            <input
              type="date"
              value={learningForm.revisionDueDate}
              onChange={e => setLearningForm(p => ({ ...p, revisionDueDate: e.target.value }))}
              className="h-10 px-3 rounded-xl outline-none text-sm"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
          </div>
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={learningForm.weeklyDone}
              onChange={e => setLearningForm(p => ({ ...p, weeklyDone: e.target.checked }))}
            />
            Mark this as done for this week
          </label>
          <div className="flex gap-2">
            <button
              onClick={editingLogId == null ? addLearningEntry : saveEditedLearningEntry}
              disabled={savingLearning || !learningForm.topic.trim() || !learningForm.notes.trim()}
              className="h-10 px-4 rounded-xl text-white font-medium press disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {savingLearning ? 'Saving...' : editingLogId == null ? 'Add Learning Entry' : 'Save Changes'}
            </button>
            {editingLogId != null && (
              <button
                onClick={cancelEditingLearningEntry}
                className="h-10 px-4 rounded-xl font-medium press"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {dueForRevision.length > 0 && (
          <div className="mb-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>Due for Revision</p>
            <div className="space-y-1">
              {dueForRevision.map(entry => (
                <p key={`rev-${entry.logId}`} className="text-xs" style={{ color: 'var(--text-primary)' }}>
                  {entry.topic} · {entry.revisionDueDate}
                </p>
              ))}
            </div>
          </div>
        )}

        {learningEntries.length === 0 ? (
          <p className="text-sm text-center py-2" style={{ color: 'var(--text-muted)' }}>No learning entries yet. Add your first topic above.</p>
        ) : (
          <div className="space-y-2">
            {learningEntries.map(entry => (
              <div key={entry.logId} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{entry.topic}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {entry.date}
                      {entry.revisionDueDate ? ` · Revise by ${entry.revisionDueDate}` : ''}
                      {` · ${entry.practiceStatus.replace('_', ' ')}`}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleWeeklyDone(entry)}
                    className="px-2 py-1 rounded-lg text-[11px] font-semibold"
                    style={{
                      backgroundColor: entry.weeklyDone ? 'rgba(16,185,129,0.15)' : 'var(--surface)',
                      color: entry.weeklyDone ? '#10b981' : 'var(--text-secondary)',
                    }}
                  >
                    {entry.weeklyDone ? 'Done' : 'Not done'}
                  </button>
                </div>
                <p className="text-sm whitespace-pre-wrap mb-1" style={{ color: 'var(--text-primary)' }}>{entry.notes}</p>
                {entry.links.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {entry.links.map((link, idx) => (
                      <a
                        key={`${entry.logId}-${idx}`}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs break-all"
                        style={{ color: 'var(--accent)' }}
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => startEditingLearningEntry(entry)}
                    className="px-2 py-1 rounded-lg text-[11px] font-medium"
                    style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteLearningEntry(entry)}
                    className="px-2 py-1 rounded-lg text-[11px] font-medium"
                    style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
