import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import * as api from '../lib/api';

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body'];

export default function WorkoutAddExercisePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    muscleGroup: 'Chest',
    description: '',
    imageUrl: '',
    shareWithOthers: false,
  });

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.createExercise({
        name: form.name.trim(),
        muscleGroup: form.muscleGroup,
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        shareWithOthers: form.shareWithOthers,
      });
      navigate('/settings/workout-library');
    } catch (e: any) {
      setStatus(e?.message || 'Failed to create exercise');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Add Exercise</h1>
      </div>

      {status && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs font-semibold" style={{ backgroundColor: 'rgba(255,107,107,0.1)', color: 'var(--accent-warm)' }}>
          {status}
        </div>
      )}

      <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <input
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="Exercise name"
          className="w-full px-3 py-2 text-sm rounded-xl outline-none"
          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
        />

        <select
          value={form.muscleGroup}
          onChange={e => setForm(p => ({ ...p, muscleGroup: e.target.value }))}
          className="w-full px-3 py-2 text-sm rounded-xl outline-none"
          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
        >
          {MUSCLE_GROUPS.map(group => <option key={group} value={group}>{group}</option>)}
        </select>

        <input
          value={form.imageUrl}
          onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
          placeholder="Image URL"
          className="w-full px-3 py-2 text-sm rounded-xl outline-none"
          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
        />

        <textarea
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Description / instructions"
          rows={4}
          className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none"
          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
        />

        <label className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
          <input
            type="checkbox"
            checked={form.shareWithOthers}
            onChange={e => setForm(p => ({ ...p, shareWithOthers: e.target.checked }))}
            className="mt-0.5"
          />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Allow others to use this workout</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>If checked, this exercise is visible in other users' workout libraries.</p>
          </div>
        </label>

        <button
          onClick={save}
          disabled={saving || !form.name.trim()}
          className="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--accent)', opacity: saving ? 0.7 : 1 }}
        >
          <Plus size={14} /> {saving ? 'Saving...' : 'Create Exercise'}
        </button>
      </div>
    </div>
  );
}
