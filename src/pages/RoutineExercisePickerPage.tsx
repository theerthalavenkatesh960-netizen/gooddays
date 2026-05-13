import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Search } from 'lucide-react';
import * as api from '../lib/api';

type Exercise = {
  id: number;
  name: string;
  muscleGroup: string;
  description?: string;
  imageUrl?: string;
};

type PickerState = {
  day?: string;
};

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body'];

export default function RoutineExercisePickerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { day } = ((location.state || {}) as PickerState);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('All');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);

  useEffect(() => {
    if (loaded) return;
    setLoaded(true);
    api.getExercises().then((data: any) => {
      setExercises(Array.isArray(data) ? data : []);
    });
  }, [loaded]);

  const filtered = useMemo(() => {
    let list = exercises;
    if (muscle !== 'All') list = list.filter(e => e.muscleGroup === muscle);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q));
    }
    return list;
  }, [exercises, muscle, search]);

  function pickExercise(exercise: Exercise) {
    navigate('/settings/workout-library', {
      state: {
        routinePick: {
          day,
          exerciseId: exercise.id,
          sets,
          reps,
        },
        tab: 'routine',
        reloadAt: Date.now(),
      },
    });
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/settings/workout-library', { state: { tab: 'routine' } })} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold capitalize" style={{ color: 'var(--text-primary)' }}>Pick Workout for {day || 'day'}</h1>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workouts..."
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {MUSCLE_GROUPS.map(m => (
            <button key={m} onClick={() => setMuscle(m)} className="px-2.5 py-1 rounded-lg text-xs"
              style={{ backgroundColor: muscle === m ? 'var(--accent)' : 'var(--surface-elevated)', color: muscle === m ? '#fff' : 'var(--text-muted)' }}>
              {m}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={sets} min={1} max={20} onChange={e => setSets(Math.max(1, Number(e.target.value) || 1))}
            placeholder="Sets" className="px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
          <input type="number" value={reps} min={1} max={100} onChange={e => setReps(Math.max(1, Number(e.target.value) || 1))}
            placeholder="Reps" className="px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {filtered.map(ex => (
          <button key={ex.id} onClick={() => pickExercise(ex)} className="rounded-xl overflow-hidden text-left" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-full h-24 flex items-center justify-center" style={{ backgroundColor: 'rgba(108, 99, 255, 0.08)' }}>
              {ex.imageUrl ? (
                <img src={ex.imageUrl} alt={ex.name} className="w-full h-full object-cover" />
              ) : (
                <Dumbbell size={28} style={{ color: 'var(--accent)', opacity: 0.65 }} />
              )}
            </div>
            <div className="p-2.5">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)', whiteSpace: 'normal', wordBreak: 'break-word' }}>{ex.name}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{ex.muscleGroup}</p>
              {ex.description && <p className="text-[10px] mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{ex.description}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
