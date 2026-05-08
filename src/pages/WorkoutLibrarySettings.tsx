import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Plus, Trash2, Save, Search, Calendar, BookOpen, X, Loader2 } from 'lucide-react';
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

type RoutineEntry = { exerciseId: number; sets: number; reps: number };
type RoutineMap = Record<string, RoutineEntry[]>;
type NewExercise = { name: string; muscleGroup: string; description: string; imageUrl: string };

// A workout split preset stored on the server.
// DayConfigs JSON: { monday: [{exerciseId, sets, reps}, ...], ... }
type SplitPreset = { id: number; name: string; dayConfigs: string; isActive: boolean };

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body'];
const SPLIT_NAME = 'Weekly Routine';

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
  const [tab, setTab] = useState<'routine' | 'library'>('routine');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [split, setSplit] = useState<SplitPreset | null>(null);
  const [routine, setRoutine] = useState<RoutineMap>({});
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMuscle, setFilterMuscle] = useState<string | null>(null);
  const [addingToDay, setAddingToDay] = useState<string | null>(null);
  const [pickExerciseId, setPickExerciseId] = useState<number | null>(null);
  const [pickSets, setPickSets] = useState(3);
  const [pickReps, setPickReps] = useState(10);
  const [newExercise, setNewExercise] = useState<NewExercise>({
    name: '', muscleGroup: 'Chest', description: '', imageUrl: '',
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [exData, splitsData] = await Promise.all([api.getExercises(), api.getSplits()]);
      setExercises(Array.isArray(exData) ? exData : []);
      const splits: SplitPreset[] = Array.isArray(splitsData) ? splitsData : [];
      const found = splits.find(s => s.name === SPLIT_NAME) ?? splits[0] ?? null;
      if (found) {
        setSplit(found);
        try { setRoutine(JSON.parse(found.dayConfigs) || {}); } catch { setRoutine({}); }
      }
    } catch (e: any) {
      setStatus(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function saveRoutine() {
    setSaving(true);
    try {
      const dayConfigs = JSON.stringify(routine);
      if (split) {
        const updated = await api.updateSplit(split.id, { ...split, dayConfigs });
        setSplit(updated);
      } else {
        const created = await api.createSplit({ name: SPLIT_NAME, dayConfigs, isActive: true });
        setSplit(created);
      }
      setStatus('Routine saved');
      setTimeout(() => setStatus(''), 1500);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to save');
      setTimeout(() => setStatus(''), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function addExercise() {
    if (!newExercise.name.trim()) return;
    try {
      await api.createExercise(newExercise);
      setNewExercise({ name: '', muscleGroup: 'Chest', description: '', imageUrl: '' });
      setStatus('Exercise added');
      const data = await api.getExercises();
      setExercises(Array.isArray(data) ? data : []);
      setTimeout(() => setStatus(''), 1500);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to add');
      setTimeout(() => setStatus(''), 2000);
    }
  }

  async function deleteExercise(exercise: Exercise) {
    try {
      await api.deleteExercise(exercise.id);
      const next = { ...routine };
      for (const day of DAYS) next[day] = (next[day] || []).filter(e => e.exerciseId !== exercise.id);
      setRoutine(next);
      const data = await api.getExercises();
      setExercises(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to delete');
      setTimeout(() => setStatus(''), 2000);
    }
  }

  function openAddModal(day: string) {
    setAddingToDay(day);
    setPickExerciseId(exercises[0]?.id ?? null);
    setPickSets(3);
    setPickReps(10);
  }

  function addToRoutine(day: string) {
    if (!pickExerciseId) return;
    setRoutine(prev => {
      const existing = prev[day] || [];
      if (existing.some(e => e.exerciseId === pickExerciseId)) return prev;
      return { ...prev, [day]: [...existing, { exerciseId: pickExerciseId, sets: pickSets, reps: pickReps }] };
    });
    setAddingToDay(null);
  }

  function removeFromRoutine(day: string, exerciseId: number) {
    setRoutine(prev => ({ ...prev, [day]: (prev[day] || []).filter(e => e.exerciseId !== exerciseId) }));
  }

  const filteredExercises = useMemo(() => {
    let result = exercises;
    if (filterMuscle) result = result.filter(e => e.muscleGroup === filterMuscle);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q)
      );
    }
    return result;
  }, [exercises, filterMuscle, search]);

  const pickedExercise = exercises.find(e => e.id === pickExerciseId) ?? null;

  if (loading) {
    return (
      <div className="pt-20 flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-xl flex items-center justify-center press"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Workout Library</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }}>
        <button
          onClick={() => setTab('routine')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all press"
          style={{ backgroundColor: tab === 'routine' ? 'var(--accent)' : 'transparent', color: tab === 'routine' ? '#fff' : 'var(--text-muted)' }}
        >
          <Calendar size={15} /> Weekly Routine
        </button>
        <button
          onClick={() => setTab('library')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all press"
          style={{ backgroundColor: tab === 'library' ? 'var(--accent)' : 'transparent', color: tab === 'library' ? '#fff' : 'var(--text-muted)' }}
        >
          <BookOpen size={15} /> Exercise Library
        </button>
      </div>

      {status && (
        <div
          className="mb-3 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{
            backgroundColor: status.toLowerCase().includes('fail') || status.toLowerCase().includes('error')
              ? 'rgba(255,107,107,0.1)' : 'rgba(78, 205, 196, 0.1)',
            color: status.toLowerCase().includes('fail') || status.toLowerCase().includes('error')
              ? 'var(--accent-warm)' : 'var(--accent-green)',
          }}
        >
          {status}
        </div>
      )}

      {/* ── WEEKLY ROUTINE TAB ── */}
      {tab === 'routine' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Weekly Plan
            </p>
            <button
              onClick={saveRoutine}
              disabled={saving}
              className="h-8 px-3 rounded-lg text-xs font-semibold text-white flex items-center gap-1"
              style={{ backgroundColor: 'var(--accent-green)', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save
            </button>
          </div>

          {DAYS.map(day => {
            const entries = routine[day] || [];
            const dayExercises = entries
              .map(e => ({ entry: e, ex: exercises.find(x => x.id === e.exerciseId) }))
              .filter((x): x is { entry: RoutineEntry; ex: Exercise } => !!x.ex);
            const intensity: Record<string, number> = {};
            dayExercises.forEach(({ ex }) => {
              const map = MUSCLE_MAP[ex.muscleGroup];
              if (map) intensity[map] = Math.min(1, (intensity[map] || 0) + 0.4);
            });

            return (
              <div key={day} className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{day}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {entries.length} exercise{entries.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {dayExercises.length > 0 && <MuscleVisualization intensity={intensity} side="front" height={48} />}
                    <button
                      onClick={() => openAddModal(day)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center press"
                      style={{ backgroundColor: 'rgba(108, 99, 255, 0.15)', color: 'var(--accent)' }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {dayExercises.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {dayExercises.map(({ entry, ex }) => (
                      <div key={entry.exerciseId} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                        <div className="w-full h-24 flex items-center justify-center relative" style={{ backgroundColor: 'rgba(108, 99, 255, 0.07)' }}>
                          {ex.imageUrl
                            ? <img src={ex.imageUrl} alt={ex.name} className="w-full h-full object-cover" />
                            : <Dumbbell size={30} style={{ color: 'var(--accent)', opacity: 0.5 }} />
                          }
                          <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}>
                            {ex.muscleGroup}
                          </span>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold line-clamp-1 mb-0.5" style={{ color: 'var(--text-primary)' }}>{ex.name}</p>
                          {ex.description && <p className="text-[10px] line-clamp-1 mb-1.5" style={{ color: 'var(--text-muted)' }}>{ex.description}</p>}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(108, 99, 255, 0.18)', color: 'var(--accent)' }}>
                              {entry.sets}×{entry.reps}
                            </span>
                            <button onClick={() => removeFromRoutine(day, entry.exerciseId)} className="p-1 rounded-lg press" style={{ color: 'var(--accent-warm)' }}>
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => openAddModal(day)}
                    className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-sm press"
                    style={{ border: '1.5px dashed var(--border)', color: 'var(--text-muted)' }}
                  >
                    <Plus size={14} /> Add exercises
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── EXERCISE LIBRARY TAB ── */}
      {tab === 'library' && (
        <>
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="section-label mb-3">Add Exercise to Library</p>
            <div className="space-y-3">
              <input
                value={newExercise.name}
                onChange={e => setNewExercise(p => ({ ...p, name: e.target.value }))}
                placeholder="Exercise name"
                className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newExercise.muscleGroup}
                  onChange={e => setNewExercise(p => ({ ...p, muscleGroup: e.target.value }))}
                  className="px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                >
                  {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input
                  value={newExercise.imageUrl}
                  onChange={e => setNewExercise(p => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="Image URL"
                  className="px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
              <input
                value={newExercise.description}
                onChange={e => setNewExercise(p => ({ ...p, description: e.target.value }))}
                placeholder="Description / instructions"
                className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
              />
              <button
                onClick={addExercise}
                className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <Plus size={14} /> Add Exercise
              </button>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="section-label">Exercise Library</p>
              <span className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                {filteredExercises.length} / {exercises.length}
              </span>
            </div>

            <div className="mb-3 space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <Search size={16} style={{ color: 'var(--text-muted)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search exercises..."
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilterMuscle(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium press"
                  style={{ backgroundColor: !filterMuscle ? 'var(--accent)' : 'var(--surface-elevated)', color: !filterMuscle ? '#fff' : 'var(--text-muted)' }}
                >
                  All
                </button>
                {MUSCLE_GROUPS.map(mg => (
                  <button
                    key={mg}
                    onClick={() => setFilterMuscle(filterMuscle === mg ? null : mg)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium press"
                    style={{ backgroundColor: filterMuscle === mg ? 'var(--accent)' : 'var(--surface-elevated)', color: filterMuscle === mg ? '#fff' : 'var(--text-muted)' }}
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
              <div className="grid grid-cols-2 gap-2">
                {filteredExercises.map(ex => (
                  <div key={ex.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                    <div className="w-full h-24 flex items-center justify-center relative" style={{ backgroundColor: 'rgba(108, 99, 255, 0.07)' }}>
                      {ex.imageUrl
                        ? <img src={ex.imageUrl} alt={ex.name} className="w-full h-full object-cover" />
                        : <Dumbbell size={28} style={{ color: 'var(--accent)', opacity: 0.5 }} />
                      }
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}>
                        {ex.muscleGroup}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold line-clamp-1 mb-0.5" style={{ color: 'var(--text-primary)' }}>{ex.name}</p>
                      {ex.description && <p className="text-[10px] line-clamp-2 mb-2" style={{ color: 'var(--text-muted)' }}>{ex.description}</p>}
                      <button
                        onClick={() => deleteExercise(ex)}
                        className="w-full py-1 rounded-lg text-[10px] font-medium press flex items-center justify-center gap-1"
                        style={{ color: ex.isCustom ? 'var(--accent-warm)' : 'var(--text-muted)', backgroundColor: 'var(--surface)' }}
                      >
                        <Trash2 size={10} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── ADD EXERCISE BOTTOM SHEET ── */}
      {addingToDay && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setAddingToDay(null); }}
        >
          <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
                Add to <span style={{ color: 'var(--accent)' }}>{addingToDay}</span>
              </p>
              <button onClick={() => setAddingToDay(null)} className="w-8 h-8 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <X size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            <div className="space-y-3">
              <select
                value={pickExerciseId ?? ''}
                onChange={e => setPickExerciseId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
              >
                <option value="">Select exercise</option>
                {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name} — {ex.muscleGroup}</option>)}
              </select>

              {pickedExercise && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <div className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'rgba(108, 99, 255, 0.1)' }}>
                    {pickedExercise.imageUrl
                      ? <img src={pickedExercise.imageUrl} alt={pickedExercise.name} className="w-full h-full object-cover" />
                      : <Dumbbell size={22} style={{ color: 'var(--accent)' }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{pickedExercise.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{pickedExercise.muscleGroup}</p>
                    {pickedExercise.description && (
                      <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{pickedExercise.description}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Sets', value: pickSets, set: setPickSets, min: 1, max: 20 },
                  { label: 'Reps', value: pickReps, set: setPickReps, min: 1, max: 100 },
                ].map(({ label, value, set, min, max }) => (
                  <div key={label} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-2 text-center" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => set(v => Math.max(min, v - 1))} className="w-8 h-8 rounded-lg text-sm font-bold press" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}>−</button>
                      <span className="flex-1 text-center text-lg font-bold" style={{ color: 'var(--accent)' }}>{value}</span>
                      <button onClick={() => set(v => Math.min(max, v + 1))} className="w-8 h-8 rounded-lg text-sm font-bold press" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addingToDay && addToRoutine(addingToDay)}
                disabled={!pickExerciseId}
                className="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: pickExerciseId ? 'var(--accent)' : 'var(--border)', opacity: pickExerciseId ? 1 : 0.6 }}
              >
                <Plus size={14} /> Add to {addingToDay}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
