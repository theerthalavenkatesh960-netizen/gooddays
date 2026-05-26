import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import * as api from '../lib/api';

type GoalType = 'checklist' | 'milestone';

const GOAL_ICONS = ['🎯','📚','💪','🏃','💰','🧘','🎸','✈️','🏡','💻','🌱','🎓','❤️','🏋️','🍎','📝','🎨','🌟','🔥','🏆'];
const GOAL_COLORS = [
  '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1',
];

export default function GoalCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const goalId = id ? Number(id) : null;
  const isEdit = goalId !== null;
  const backTarget = (location.state as { from?: string } | null)?.from || '/life?tab=Goals';

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [form, setForm] = useState({
    title: '',
    category: '',
    icon: '🎯',
    color: '#10b981',
    goalType: 'checklist' as GoalType,
    targetValue: '',
    unit: '',
    deadlineDate: '',
  });

  useEffect(() => {
    if (!isEdit) return;
    api.getGoals().then((goals: any[]) => {
      const g = goals.find(g => g.id === goalId);
      if (!g) { navigate('/goals'); return; }
      setForm({
        title: g.title || '',
        category: g.category || '',
        icon: g.icon || '🎯',
        color: g.color || '#10b981',
        goalType: g.goalType || 'checklist',
        targetValue: g.targetValue != null ? String(g.targetValue) : '',
        unit: g.unit || '',
        deadlineDate: g.deadlineDate ? g.deadlineDate.slice(0, 10) : '',
      });
    }).finally(() => setLoading(false));
  }, [isEdit, goalId]);

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body: any = {
        title: form.title.trim(),
        category: form.category || null,
        icon: form.icon || '🎯',
        color: form.color || '#10b981',
        goalType: form.goalType,
        deadlineDate: form.deadlineDate || null,
        autoComplete: true,
      };
      if (form.goalType === 'milestone') {
        const parsed = Number(form.targetValue || 0);
        body.targetValue = Number.isFinite(parsed) ? parsed : 0;
        body.unit = form.unit || null;
      }

      if (isEdit && goalId) {
        await api.updateGoal(goalId, body);
        navigate(`/goals/${goalId}`, { state: { from: backTarget } });
      } else {
        const created = await api.createGoal(body);
        navigate(`/goals/${created.id}`, { state: { from: backTarget } });
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="pt-16 flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(isEdit ? `/goals/${goalId}` : backTarget)} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{isEdit ? 'Edit Goal' : 'New Goal'}</h1>
      </div>

      <div className="space-y-4">
        {/* Icon preview + picker */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Choose Icon</p>
          <div className="flex flex-wrap gap-2">
            {GOAL_ICONS.map(icon => (
              <button
                key={icon}
                onClick={() => setForm(p => ({ ...p, icon }))}
                className="w-10 h-10 rounded-xl text-xl flex items-center justify-center press"
                style={{ backgroundColor: form.icon === icon ? (form.color + '33') : 'var(--surface-elevated)', border: form.icon === icon ? `2px solid ${form.color}` : '2px solid transparent' }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Color</p>
          <div className="flex flex-wrap gap-2">
            {GOAL_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setForm(p => ({ ...p, color }))}
                className="w-8 h-8 rounded-full press flex items-center justify-center"
                style={{ backgroundColor: color, border: form.color === color ? '3px solid var(--text-primary)' : '3px solid transparent' }}
              />
            ))}
          </div>
        </div>

        {/* Form fields */}
        <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Title</p>
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="What's your goal?"
              className="w-full h-11 px-3 rounded-xl outline-none text-sm font-medium"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <p className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Category</p>
            <input
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              placeholder="e.g. Health, Finance, Learning..."
              className="w-full h-11 px-3 rounded-xl outline-none text-sm"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <p className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Goal Type</p>
            <div className="grid grid-cols-2 gap-2">
              {(['checklist', 'milestone'] as GoalType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setForm(p => ({ ...p, goalType: type }))}
                  className="h-11 rounded-xl text-sm font-medium press"
                  style={{
                    backgroundColor: form.goalType === type ? (form.color + '22') : 'var(--surface-elevated)',
                    border: `2px solid ${form.goalType === type ? form.color : 'transparent'}`,
                    color: form.goalType === type ? form.color : 'var(--text-secondary)',
                  }}
                >
                  {type === 'checklist' ? '✅ Checklist' : '🏆 Milestone'}
                </button>
              ))}
            </div>
          </div>

          {form.goalType === 'milestone' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Target Value</p>
                <input
                  type="number"
                  value={form.targetValue}
                  onChange={e => setForm(p => ({ ...p, targetValue: e.target.value }))}
                  placeholder="e.g. 100000"
                  className="w-full h-11 px-3 rounded-xl outline-none text-sm num"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <p className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Unit</p>
                <input
                  value={form.unit}
                  onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                  placeholder="INR, kg, km..."
                  className="w-full h-11 px-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Deadline (Optional)</p>
            <div className="flex items-center gap-2 h-11 px-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="date"
                value={form.deadlineDate}
                onChange={e => setForm(p => ({ ...p, deadlineDate: e.target.value }))}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: `2px solid ${form.color}44` }}>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Preview</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: form.color + '22' }}>
              {form.icon}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{form.title || 'Your goal title'}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{form.category || 'General'} · {form.goalType}</p>
              <div className="mt-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <div className="h-full rounded-full w-0" style={{ backgroundColor: form.color }} />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || !form.title.trim()}
          className="w-full h-12 rounded-2xl font-semibold text-white press disabled:opacity-50"
          style={{ backgroundColor: form.color }}
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Goal'}
        </button>
      </div>
    </div>
  );
}
