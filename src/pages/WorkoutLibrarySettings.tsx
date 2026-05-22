import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Plus, Trash2, Save, Search, Calendar, BookOpen, X, Loader2, Filter } from 'lucide-react';
import { format } from 'date-fns';
import * as api from '../lib/api';
import MuscleVisualization from '../components/MuscleVisualization';
import WeeklyCalendar from '../components/WeeklyCalendar';

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
// A workout split preset stored on the server.
// DayConfigs JSON: { monday: [{exerciseId, sets, reps}, ...], ... }
type SplitPreset = { id: number; name: string; dayConfigs: string; isActive: boolean };

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body'];

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
  const location = useLocation();
  const [tab, setTab] = useState<'routine' | 'library'>(((location.state as any)?.tab as 'routine' | 'library') ?? 'routine');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [split, setSplit] = useState<SplitPreset | null>(null);
  const [routine, setRoutine] = useState<RoutineMap>({});
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMuscle, setFilterMuscle] = useState<string | null>(null);
  const [showExerciseFilters, setShowExerciseFilters] = useState(false);
  const [lastPickSignature, setLastPickSignature] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [exData, activeSplit] = await Promise.all([api.getExercises(), api.getActiveSplit()]);
      setExercises(Array.isArray(exData) ? exData : []);
      const found = activeSplit as SplitPreset | null;
      if (found) {
        setSplit(found);
        if (typeof found.dayConfigs === 'string') {
          try { setRoutine(JSON.parse(found.dayConfigs) || {}); } catch { setRoutine({}); }
        } else if (found.dayConfigs && typeof found.dayConfigs === 'object') {
          setRoutine(found.dayConfigs as any);
        } else {
          setRoutine({});
        }
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
        const created = await api.createSplit({ name: 'Weekly Routine', dayConfigs, isActive: true });
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

  function openAddPicker(day: string) {
    navigate('/settings/workout-library/pick', { state: { day } });
  }

  function dayKey(date: Date) {
    return format(date, 'EEEE').toLowerCase();
  }

  function addToRoutine(day: string, exerciseId: number, sets: number, reps: number) {
    setRoutine(prev => {
      const existing = prev[day] || [];
      if (existing.some(e => e.exerciseId === exerciseId)) return prev;
      return { ...prev, [day]: [...existing, { exerciseId, sets, reps }] };
    });
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

  useEffect(() => {
    const state: any = location.state || {};
    const pick = state.routinePick;
    if (state.tab) setTab(state.tab);
    if (!pick?.day || !pick?.exerciseId) return;
    const signature = `${pick.day}-${pick.exerciseId}-${pick.sets}-${pick.reps}`;
    if (signature === lastPickSignature) return;
    setLastPickSignature(signature);
    addToRoutine(pick.day, Number(pick.exerciseId), Math.max(1, Number(pick.sets) || 3), Math.max(1, Number(pick.reps) || 10));
  }, [location.state]);

  const selectedDay = dayKey(selectedDate);
  const selectedDayEntries = routine[selectedDay] || [];
  const selectedDayExercises = selectedDayEntries
    .map(e => ({ entry: e, ex: exercises.find(x => x.id === e.exerciseId) }))
    .filter((x): x is { entry: RoutineEntry; ex: Exercise } => !!x.ex);

  const selectedIntensity: Record<string, number> = {};
  selectedDayExercises.forEach(({ ex }) => {
    const map = MUSCLE_MAP[ex.muscleGroup];
    if (map) selectedIntensity[map] = Math.min(1, (selectedIntensity[map] || 0) + 0.4);
  });

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
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Assign routines per day
            </span>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="mb-4">
              <WeeklyCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                renderDayExtra={(d) => {
                  const key = dayKey(d);
                  const count = (routine[key] || []).length;
                  return count > 0 ? <div className="text-[10px] opacity-80">{count}</div> : null;
                }}
                headerRight={
                  <button
                    onClick={saveRoutine}
                    disabled={saving}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold press disabled:opacity-40"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                }
              />
            </div>

            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{selectedDay}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedDayEntries.length} exercise{selectedDayEntries.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedDayExercises.length > 0 && <MuscleVisualization intensity={selectedIntensity} side="front" height={48} />}
                <button
                  onClick={() => openAddPicker(selectedDay)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center press"
                  style={{ backgroundColor: 'rgba(108, 99, 255, 0.15)', color: 'var(--accent)' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {selectedDayExercises.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {selectedDayExercises.map(({ entry, ex }) => (
                  <div key={`${selectedDay}-${entry.exerciseId}`} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                    <button
                      onClick={() => navigate(`/settings/workout-library/exercise/${entry.exerciseId}`, { state: { day: selectedDay, sets: entry.sets, reps: entry.reps } })}
                      className="w-full text-left"
                    >
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
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(108, 99, 255, 0.18)', color: 'var(--accent)' }}>
                          {entry.sets}×{entry.reps}
                        </span>
                      </div>
                    </button>
                    <div className="px-2.5 pb-2.5">
                      <button onClick={() => removeFromRoutine(selectedDay, entry.exerciseId)} className="w-full py-1 rounded-lg text-[10px] font-medium press flex items-center justify-center gap-1" style={{ color: 'var(--accent-warm)', backgroundColor: 'var(--surface)' }}>
                        <X size={10} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={() => openAddPicker(selectedDay)}
                className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-sm press"
                style={{ border: '1.5px dashed var(--border)', color: 'var(--text-muted)' }}
              >
                <Plus size={14} /> Add exercises for {selectedDay}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── EXERCISE LIBRARY TAB ── */}
      {tab === 'library' && (
        <>
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="section-label">Exercise Library</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/settings/workout-library/new-exercise')}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  <Plus size={12} /> Add
                </button>
                <span className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                  {filteredExercises.length} / {exercises.length}
                </span>
                <button
                  onClick={() => setShowExerciseFilters(v => !v)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center press"
                  style={{
                    backgroundColor: showExerciseFilters ? 'var(--accent)' : 'var(--surface-elevated)',
                    color: showExerciseFilters ? '#fff' : 'var(--text-secondary)',
                  }}
                  title="Toggle filters"
                >
                  <Filter size={14} />
                </button>
              </div>
            </div>

            {showExerciseFilters && (
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
            )}

            {filteredExercises.length === 0 ? (
              <div className="py-6 text-center">
                <Dumbbell size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No exercises found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredExercises.map(ex => (
                  <div key={ex.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                    <button onClick={() => navigate(`/settings/workout-library/exercise/${ex.id}`)} className="w-full text-left">
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
                      </div>
                    </button>
                    <div className="px-2.5 pb-2.5">
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

    </div>
  );
}
