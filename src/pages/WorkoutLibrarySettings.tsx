import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Plus, Trash2, Save, Search } from 'lucide-react';
import * as api from '../lib/api';
import MuscleVisualization from '../components/MuscleVisualization';

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

const MUSCLE_MAP: Record<string, string> = {
  'Chest': 'chest',
  'Back': 'lats',
  'Shoulders': 'shoulders',
  'Arms': 'biceps',
  'Legs': 'quads',
  'Core': 'abs',
};

export default function WorkoutLibrarySettings() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routine, setRoutine] = useState<RoutineMap>({});
  const [saving, setSaving] = useState('');
  const [search, setSearch] = useState('');
  const [filterMuscle, setFilterMuscle] = useState<string | null>(null);
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

  const filteredExercises = useMemo(() => {
    let result = exercises;
    if (filterMuscle) result = result.filter(e => e.muscleGroup === filterMuscle);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q));
    }
    return result;
  }, [exercises, filterMuscle, search]);

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
        <div className="mb-4 px-3 py-2 rounded-xl text-xs font-semibold" style={{ backgroundColor: 'rgba(78, 205, 196, 0.1)', color: 'var(--accent-green)' }}>
          ✓ {saving}
        </div>
      )}

      {/* Add Exercise Section */}
      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="section-label mb-3">Add Exercise to Library</p>
        <div className="space-y-3">
          <input
            value={newExercise.name}
            onChange={onNameChange}
            placeholder="Exercise name"
            className="w-full px-3 py-2 text-sm rounded-xl outline-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newExercise.muscleGroup}
              onChange={onMuscleGroupChange}
              className="px-3 py-2 text-sm rounded-xl outline-none"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            >
              {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input
              value={newExercise.imageUrl}
              onChange={onImageUrlChange}
              placeholder="Image URL"
              className="px-3 py-2 text-sm rounded-xl outline-none"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
          </div>
          <input
            value={newExercise.description}
            onChange={onDescriptionChange}
            placeholder="Description / instructions"
            className="w-full px-3 py-2 text-sm rounded-xl outline-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <button onClick={addExercise} className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--accent)' }}>
            <Plus size={14} /> Add Exercise
          </button>
        </div>
      </div>

      {/* Exercise Library with Search & Filter */}
      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="section-label">Exercise Library</p>
          <span className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
            {filteredExercises.length} / {exercises.length}
          </span>
        </div>

        {/* Search & Filter Row */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>

          {/* Muscle Group Filter Chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterMuscle(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium press transition-all"
              style={{
                backgroundColor: !filterMuscle ? 'var(--accent)' : 'var(--surface-elevated)',
                color: !filterMuscle ? '#fff' : 'var(--text-muted)',
              }}
            >
              All
            </button>
            {MUSCLE_GROUPS.map(mg => (
              <button
                key={mg}
                onClick={() => setFilterMuscle(filterMuscle === mg ? null : mg)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium press transition-all"
                style={{
                  backgroundColor: filterMuscle === mg ? 'var(--accent)' : 'var(--surface-elevated)',
                  color: filterMuscle === mg ? '#fff' : 'var(--text-muted)',
                }}
              >
                {mg}
              </button>
            ))}
          </div>
        </div>

        {filteredExercises.length === 0 ? (
          <div className="py-6 text-center">
            <Dumbbell size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No exercises found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredExercises.map(ex => (
              <div
                key={ex.id}
                className="p-3 rounded-xl flex items-start gap-3"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(108, 99, 255, 0.1)' }}>
                  {ex.imageUrl ? (
                    <img src={ex.imageUrl} alt={ex.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Dumbbell size={18} style={{ color: 'var(--accent)' }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {ex.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {ex.muscleGroup}
                  </p>
                  {ex.description && (
                    <p className="text-[11px] mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {ex.description}
                    </p>
                  )}
                </div>

                <button onClick={() => deleteExercise(ex)} className="p-2 rounded-lg press flex-shrink-0" style={{ color: ex.isCustom ? 'var(--accent-warm)' : 'var(--text-muted)' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Routine Planner */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="section-label">Weekly Routine Preset</p>
          <button onClick={saveRoutine} className="h-8 px-3 rounded-lg text-xs font-semibold text-white flex items-center gap-1" style={{ backgroundColor: 'var(--accent-green)' }}>
            <Save size={12} /> Save
          </button>
        </div>

        <div className="space-y-3">
          {DAYS.map(day => {
            const selectedIds = routine[day] || [];
            const dayExercises = exercises.filter(e => selectedIds.includes(e.id));
            const intensity: Record<string, number> = {};
            dayExercises.forEach(ex => {
              const map = MUSCLE_MAP[ex.muscleGroup];
              if (map) intensity[map] = Math.min(1, (intensity[map] || 0) + 0.4);
            });

            return (
              <div key={day} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                    {day}
                  </p>
                  <span className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}>
                    {selectedIds.length} exercise{selectedIds.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Mini Body Visualization */}
                {dayExercises.length > 0 && (
                  <div className="mb-2 rounded-lg p-2" style={{ backgroundColor: 'rgba(108, 99, 255, 0.05)' }}>
                    <MuscleVisualization intensity={intensity} side="front" height={80} />
                  </div>
                )}

                {/* Exercise Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {exercises.map(ex => {
                    const selected = selectedIds.includes(ex.id);
                    return (
                      <button
                        key={ex.id}
                        onClick={() => toggleDayExercise(day, ex.id)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium press transition-all"
                        style={{
                          backgroundColor: selected ? 'rgba(108, 99, 255, 0.2)' : 'var(--surface)',
                          color: selected ? 'var(--accent)' : 'var(--text-muted)',
                          border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                        }}
                      >
                        {ex.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
