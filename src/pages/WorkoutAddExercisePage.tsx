import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import * as api from '../lib/api';
import { MUSCLE_GROUPS_DETAILED } from '../lib/config';

export default function WorkoutAddExercisePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    muscleGroup: 'Upper Chest',
    description: '',
    imageUrl: '',
    videoUrl: '',
    beginnerTips: '',
    animationFrames: '',
    commonMistakes: '',
    shareWithOthers: false,
  });

  async function save() {
    if (!form.name.trim()) return;
    if (form.animationFrames.trim()) {
      try {
        JSON.parse(form.animationFrames);
      } catch {
        setStatus('Animation frames must be valid JSON array');
        return;
      }
    }
    if (form.commonMistakes.trim()) {
      try {
        JSON.parse(form.commonMistakes);
      } catch {
        setStatus('Common mistakes must be valid JSON array');
        return;
      }
    }
    setSaving(true);
    try {
      await api.createExercise({
        name: form.name.trim(),
        muscleGroup: form.muscleGroup,
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        videoUrl: form.videoUrl.trim() || null,
        beginnerTips: form.beginnerTips.trim() || null,
        animationFrames: form.animationFrames.trim() || null,
        commonMistakes: form.commonMistakes.trim() || null,
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
          {MUSCLE_GROUPS_DETAILED.map(group =>
            group.children.length > 0 ? (
              <optgroup key={group.parent} label={group.parent}>
                {group.children.map(child => (
                  <option key={child} value={child}>{child}</option>
                ))}
              </optgroup>
            ) : (
              <option key={group.parent} value={group.parent}>{group.parent}</option>
            )
          )}
        </select>

        <input
          value={form.imageUrl}
          onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
          placeholder="Image URL"
          className="w-full px-3 py-2 text-sm rounded-xl outline-none"
          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
        />

        <input
          value={form.videoUrl}
          onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))}
          placeholder="Form video/GIF URL (optional)"
          className="w-full px-3 py-2 text-sm rounded-xl outline-none"
          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
        />

        <input
          value={form.beginnerTips}
          onChange={e => setForm(p => ({ ...p, beginnerTips: e.target.value }))}
          placeholder="Beginner tips (comma-separated, e.g. Keep core tight, Control lowering)"
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

        <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Animation Frames JSON</p>
            <button
              type="button"
              className="text-xs font-semibold"
              style={{ color: 'var(--accent)' }}
              onClick={() => setForm(p => ({
                ...p,
                animationFrames: JSON.stringify([
                  {
                    phase: 0,
                    name: 'Starting Position',
                    duration: 0.6,
                    muscles: { [p.muscleGroup]: 0.1 },
                    cue: 'Set your posture and brace your core',
                  },
                  {
                    phase: 1,
                    name: 'Concentric',
                    duration: 1.2,
                    muscles: { [p.muscleGroup]: 0.9 },
                    cue: 'Perform the lift with control',
                  },
                  {
                    phase: 2,
                    name: 'Eccentric',
                    duration: 1.8,
                    muscles: { [p.muscleGroup]: 0.5 },
                    cue: 'Lower slowly and keep tension',
                  },
                ], null, 2),
              }))}
            >
              Insert Template
            </button>
          </div>
          <textarea
            value={form.animationFrames}
            onChange={e => setForm(p => ({ ...p, animationFrames: e.target.value }))}
            placeholder='[{"phase":0,"name":"Starting Position","duration":0.6,"muscles":{"Biceps – Long Head":0.1},"cue":"..."}]'
            rows={8}
            className="w-full px-3 py-2 text-xs rounded-xl outline-none resize-y font-mono"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
          />
        </div>

        <textarea
          value={form.commonMistakes}
          onChange={e => setForm(p => ({ ...p, commonMistakes: e.target.value }))}
          placeholder='Common mistakes JSON (optional): [{"mistake":"Swinging body","correction":"Keep torso still"}]'
          rows={4}
          className="w-full px-3 py-2 text-xs rounded-xl outline-none resize-y font-mono"
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
