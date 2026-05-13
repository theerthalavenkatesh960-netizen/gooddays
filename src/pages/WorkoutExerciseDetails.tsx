import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Calendar, Repeat } from 'lucide-react';
import * as api from '../lib/api';

type Exercise = {
  id: number;
  name: string;
  muscleGroup: string;
  description?: string;
  imageUrl?: string;
};

type RoutineEntry = { exerciseId: number; sets: number; reps: number };
type SplitPreset = { id: number; name: string; dayConfigs: string; isActive: boolean };

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default function WorkoutExerciseDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ name: '', muscleGroup: 'Chest', description: '', imageUrl: '' });
  const [plannedDays, setPlannedDays] = useState<Array<{ day: string; sets: number; reps: number }>>([]);

  const selectedMeta = (location.state || {}) as { day?: string; sets?: number; reps?: number };

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const exerciseId = Number(id);
    if (!exerciseId) return;

    const [exData, splitsData] = await Promise.all([api.getExercises(), api.getSplits()]);
    const list: Exercise[] = Array.isArray(exData) ? exData : [];
    const found = list.find(x => x.id === exerciseId) || null;
    setExercise(found);
    if (found) {
      setForm({
        name: found.name || '',
        muscleGroup: found.muscleGroup || 'Chest',
        description: found.description || '',
        imageUrl: found.imageUrl || '',
      });
    }

    const splits: SplitPreset[] = Array.isArray(splitsData) ? splitsData : [];
    const split = splits.find(s => s.name === 'Weekly Routine') || splits[0] || null;
    let rows: Array<{ day: string; sets: number; reps: number }> = [];

    if (split?.dayConfigs) {
      try {
        const map = (typeof split.dayConfigs === 'string'
          ? JSON.parse(split.dayConfigs || '{}')
          : split.dayConfigs) as Record<string, RoutineEntry[]>;
        rows = DAYS.flatMap(day => {
          const entries = map?.[day] || [];
          return entries
            .filter(entry => entry.exerciseId === exerciseId)
            .map(entry => ({ day, sets: entry.sets, reps: entry.reps }));
        });
      } catch {
        rows = [];
      }
    }

    setPlannedDays(rows);
  }

  async function save() {
    if (!exercise || !form.name.trim()) return;
    try {
      const updated = await api.updateExercise(exercise.id, {
        name: form.name.trim(),
        muscleGroup: form.muscleGroup,
        description: form.description,
        imageUrl: form.imageUrl.trim() || null,
      });
      if (updated) setExercise(updated as Exercise);
      setEditing(false);
      setStatus('Workout updated');
      setTimeout(() => setStatus(''), 1200);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to update workout');
    }
  }

  const totalSets = useMemo(() => plannedDays.reduce((sum, x) => sum + (x.sets || 0), 0), [plannedDays]);

  if (!exercise) {
    return (
      <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Workout not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Workout Detail</h1>
        <div className="ml-auto flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}>
                Cancel
              </button>
              <button onClick={save} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent-green)' }}>
                Save
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>
              Edit
            </button>
          )}
        </div>
      </div>

      {status && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs font-semibold" style={{ backgroundColor: 'rgba(78,205,196,0.1)', color: 'var(--accent-green)' }}>
          {status}
        </div>
      )}

      <div className="rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="h-48 flex items-center justify-center" style={{ backgroundColor: 'rgba(108, 99, 255, 0.08)' }}>
          {(editing ? form.imageUrl : exercise.imageUrl) ? (
            <img src={editing ? form.imageUrl : exercise.imageUrl} alt={exercise.name} className="w-full h-full object-cover" />
          ) : (
            <Dumbbell size={44} style={{ color: 'var(--accent)' }} />
          )}
        </div>
        <div className="p-4">
          {editing ? (
            <div className="space-y-2">
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
              <select value={form.muscleGroup} onChange={e => setForm(p => ({ ...p, muscleGroup: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
                <option>Chest</option>
                <option>Back</option>
                <option>Shoulders</option>
                <option>Arms</option>
                <option>Legs</option>
                <option>Core</option>
                <option>Cardio</option>
                <option>Full Body</option>
              </select>
              <input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
                placeholder="Image URL" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={3} placeholder="Description" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
            </div>
          ) : (
            <>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{exercise.name}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{exercise.muscleGroup}</p>
              {exercise.description && <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>{exercise.description}</p>}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Planned Days</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{plannedDays.length}</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Weekly Sets</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalSets}</p>
        </div>
      </div>

      {(selectedMeta.day && selectedMeta.sets && selectedMeta.reps) && (
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--accent)' }}>
            <Calendar size={14} />
            <p className="text-xs uppercase font-semibold">Selected Plan Slot</p>
          </div>
          <p className="text-sm capitalize" style={{ color: 'var(--text-primary)' }}>
            {selectedMeta.day}: {selectedMeta.sets} sets × {selectedMeta.reps} reps
          </p>
        </div>
      )}

      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--accent)' }}>
          <Repeat size={14} />
          <p className="text-xs uppercase font-semibold">Weekly Assignments</p>
        </div>
        {plannedDays.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Not added to weekly routine yet.</p>
        ) : (
          <div className="space-y-2">
            {plannedDays.map((row, idx) => (
              <div key={`${row.day}-${idx}`} className="rounded-xl p-3 flex items-center justify-between" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <p className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{row.day}</p>
                <p className="text-sm" style={{ color: 'var(--accent)' }}>{row.sets} × {row.reps}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
