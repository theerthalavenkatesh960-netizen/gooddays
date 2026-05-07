import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Plus, Trash2, Save } from 'lucide-react';
import * as api from '../lib/api';

type Exercise = {
  id: number;
  name: string;
  muscleGroup: string;
  description?: string;
  imageUrl?: string;
  isCustom?: boolean;
};

type RoutineMap = Record<string, number[]>;
type NewExercise = {
  name: string;
  muscleGroup: string;
  description: string;
  imageUrl: string;
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body'];
const ROUTINE_KEY = 'gd.weeklyWorkoutRoutine';

export default function WorkoutLibrarySettings() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routine, setRoutine] = useState<RoutineMap>({});
  const [saving, setSaving] = useState('');
  const [newExercise, setNewExercise] = useState<NewExercise>({
    name: '',
    muscleGroup: 'Chest',
    description: '',
    imageUrl: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem(ROUTINE_KEY);
    if (stored) {
      try {
        setRoutine(JSON.parse(stored));
      } catch {
        setRoutine({});
      }
    }
    loadExercises();
  }, []);

  async function loadExercises() {
    try {
      const data = await api.getExercises();
      setExercises(Array.isArray(data) ? data : []);
    } catch {
      setExercises([]);
    }
  }

  async function addExercise() {
    if (!newExercise.name.trim()) return;
    try {
      await api.createExercise(newExercise);
      setNewExercise({ name: '', muscleGroup: 'Chest', description: '', imageUrl: '' });
      setSaving('Exercise added');
      await loadExercises();
      setTimeout(() => setSaving(''), 1500);
    } catch {
      setSaving('Failed to add exercise');
      setTimeout(() => setSaving(''), 1800);
    }
  }

  async function deleteExercise(exercise: Exercise) {
    try {
      await api.deleteExercise(exercise.id);
      setRoutine((prev: RoutineMap) => {
        const next: RoutineMap = {};
        for (const day of DAYS) {
          next[day] = (prev[day] || []).filter((id: number) => id !== exercise.id);
        }
        return next;
      });
      await loadExercises();
    } catch {
      setSaving('Failed to delete');
      setTimeout(() => setSaving(''), 1500);
    }
  }

  function toggleDayExercise(day: string, id: number) {
    setRoutine((prev: RoutineMap) => {
      const list = prev[day] || [];
      return {
        ...prev,
        [day]: list.includes(id) ? list.filter((x: number) => x !== id) : [...list, id],
      };
    });
  }

  function saveRoutine() {
    localStorage.setItem(ROUTINE_KEY, JSON.stringify(routine));
    setSaving('Routine saved');
    setTimeout(() => setSaving(''), 1500);
  }

  const customExercises = useMemo(() => exercises.filter((e: Exercise) => e.isCustom), [exercises]);

  function onNameChange(e: ChangeEvent<HTMLInputElement>) {
    setNewExercise((p: NewExercise) => ({ ...p, name: e.target.value }));
  }

  function onMuscleGroupChange(e: ChangeEvent<HTMLSelectElement>) {
    setNewExercise((p: NewExercise) => ({ ...p, muscleGroup: e.target.value }));
  }

  function onDescriptionChange(e: ChangeEvent<HTMLInputElement>) {
    setNewExercise((p: NewExercise) => ({ ...p, description: e.target.value }));
  }

  function onImageUrlChange(e: ChangeEvent<HTMLInputElement>) {
    setNewExercise((p: NewExercise) => ({ ...p, imageUrl: e.target.value }));
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Workout Library</h1>
      </div>

      {saving && (
        <div className="mb-4 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
          {saving}
        </div>
      )}

      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="section-label mb-3">Add Exercise</p>
        <div className="space-y-2">
          <input
            value={newExercise.name}
            onChange={onNameChange}
            placeholder="Exercise name"
            className="w-full px-3 py-2 text-sm rounded-xl outline-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <select
            value={newExercise.muscleGroup}
            onChange={onMuscleGroupChange}
            className="w-full px-3 py-2 text-sm rounded-xl outline-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          >
            {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            value={newExercise.description}
            onChange={onDescriptionChange}
            placeholder="Description"
            className="w-full px-3 py-2 text-sm rounded-xl outline-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <input
            value={newExercise.imageUrl}
            onChange={onImageUrlChange}
            placeholder="Image URL (optional)"
            className="w-full px-3 py-2 text-sm rounded-xl outline-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <button onClick={addExercise} className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--accent)' }}>
            <Plus size={14} /> Add Exercise
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="section-label">Custom Exercises</p>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{customExercises.length}</span>
        </div>
        <div className="space-y-2">
          {customExercises.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No custom exercises yet.</p>
          )}
          {customExercises.map(ex => (
            <div key={ex.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent)22' }}>
                <Dumbbell size={14} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{ex.name}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{ex.muscleGroup}</p>
              </div>
              <button onClick={() => deleteExercise(ex)} className="p-2 rounded-lg press" style={{ color: 'var(--accent-warm)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="section-label">Weekly Routine Preset</p>
          <button onClick={saveRoutine} className="h-8 px-3 rounded-lg text-xs font-semibold text-white flex items-center gap-1" style={{ backgroundColor: 'var(--accent-green)' }}>
            <Save size={12} /> Save
          </button>
        </div>

        <div className="space-y-3">
          {DAYS.map(day => (
            <div key={day} className="p-2.5 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>{day}</p>
              <div className="flex flex-wrap gap-1.5">
                {exercises.map(ex => {
                  const selected = (routine[day] || []).includes(ex.id);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => toggleDayExercise(day, ex.id)}
                      className="px-2 py-1 rounded-full text-[11px]"
                      style={{
                        backgroundColor: selected ? 'var(--accent)22' : 'var(--surface)',
                        color: selected ? 'var(--accent)' : 'var(--text-muted)',
                        border: `1px solid ${selected ? 'var(--accent)66' : 'var(--border)'}`,
                      }}
                    >
                      {ex.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
