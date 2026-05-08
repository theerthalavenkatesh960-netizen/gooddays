import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Trophy, Check, Camera, Settings as SettingsIcon, Leaf, TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';

type Tab = 'Workout' | 'Diet' | 'Progress';

type Exercise = {
  id: number;
  name: string;
  muscleGroup?: string;
};

type WorkoutSet = {
  setNumber: number;
  weight: number;
  reps: number;
  isCompleted?: boolean;
};

type MealIngredient = { id: string; name: string; calories: number };
type MealTemplate = {
  id: string;
  name: string;
  timing: 'pre-workout' | 'post-workout' | 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: MealIngredient[];
  recipe: string;
};

type WorkoutLog = {
  date: string;
  exercises: Array<{ exerciseId: number; name: string; sets: WorkoutSet[] }>;
  imageUrls: string[];
};

const ROUTINE_KEY = 'gd.weeklyWorkoutRoutine';
const MEALS_KEY = 'gd.mealTemplates';
const CALORIE_KEY = 'calorieGoal';
const WORKOUT_LOGS_KEY = 'gd.workoutLogs';
const DIET_LOGS_KEY = 'gd.dietLogs';

const BODY_TABS: { id: string; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'Workout', label: 'Workout', icon: Dumbbell },
  { id: 'Diet', label: 'Diet', icon: Leaf },
  { id: 'Progress', label: 'Progress', icon: TrendingUp },
];

function PillTabs({ active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1 mx-4 mb-2 p-1 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }}>
      {BODY_TABS.map(t => {
        const Icon = t.icon;
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all press"
            style={{ backgroundColor: active === t.id ? 'var(--accent)' : 'transparent', color: active === t.id ? '#fff' : 'var(--text-muted)' }}>
            <Icon size={14} />{t.label}
          </button>
        );
      })}
    </div>
  );
}

function WorkoutTab() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routine, setRoutine] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [setsByExercise, setSetsByExercise] = useState<Record<number, WorkoutSet[]>>({});
  const [images, setImages] = useState<string[]>([]);
  const [saveMessage, setSaveMessage] = useState('');

  const dayKey = format(new Date(), 'EEEE').toLowerCase();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const raw = localStorage.getItem(ROUTINE_KEY);
    if (raw) {
      try { setRoutine(JSON.parse(raw)); } catch { setRoutine({}); }
    }

    api.getExercises()
      .then((data: any) => setExercises(Array.isArray(data) ? data : []))
      .catch(() => setExercises([]))
      .finally(() => setLoading(false));

    const logsRaw = localStorage.getItem(WORKOUT_LOGS_KEY);
    if (logsRaw) {
      try {
        const logs: WorkoutLog[] = JSON.parse(logsRaw);
        const existing = logs.find(l => l.date === today);
        if (existing) {
          const next: Record<number, WorkoutSet[]> = {};
          existing.exercises.forEach(e => { next[e.exerciseId] = e.sets; });
          setSetsByExercise(next);
          setImages(existing.imageUrls || []);
        }
      } catch {}
    }
  }, [today]);

  const suggestedExercises = useMemo(() => {
    const ids = routine[dayKey] || [];
    const mapped = exercises.filter(e => ids.includes(e.id));
    if (mapped.length > 0) return mapped;
    return exercises.slice(0, 4);
  }, [routine, dayKey, exercises]);

  useEffect(() => {
    if (suggestedExercises.length === 0) return;
    setSetsByExercise(prev => {
      const next = { ...prev };
      for (const ex of suggestedExercises) {
        if (!next[ex.id] || next[ex.id].length === 0) {
          next[ex.id] = [
            { setNumber: 1, weight: 0, reps: 0 },
            { setNumber: 2, weight: 0, reps: 0 },
            { setNumber: 3, weight: 0, reps: 0 },
          ];
        }
      }
      return next;
    });
  }, [suggestedExercises]);

  function addSet(exerciseId: number) {
    setSetsByExercise(prev => {
      const current = prev[exerciseId] || [];
      return {
        ...prev,
        [exerciseId]: [...current, { setNumber: current.length + 1, weight: 0, reps: 0 }],
      };
    });
  }

  function updateSet(exerciseId: number, index: number, patch: Partial<WorkoutSet>) {
    setSetsByExercise(prev => {
      const current = prev[exerciseId] || [];
      const next = current.map((s, i) => (i === index ? { ...s, ...patch } : s));
      return { ...prev, [exerciseId]: next };
    });
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImages(prev => [...prev, dataUrl]);
    };
    reader.readAsDataURL(file);
  }

  function saveTodayLog() {
    const payload: WorkoutLog = {
      date: today,
      exercises: suggestedExercises.map(ex => ({
        exerciseId: ex.id,
        name: ex.name,
        sets: setsByExercise[ex.id] || [],
      })),
      imageUrls: images,
    };

    const raw = localStorage.getItem(WORKOUT_LOGS_KEY);
    let logs: WorkoutLog[] = [];
    if (raw) {
      try { logs = JSON.parse(raw); } catch { logs = []; }
    }

    const exists = logs.findIndex(l => l.date === today);
    if (exists >= 0) logs[exists] = payload;
    else logs.unshift(payload);

    localStorage.setItem(WORKOUT_LOGS_KEY, JSON.stringify(logs));
    setSaveMessage('Workout log saved');
    setTimeout(() => setSaveMessage(''), 1500);
  }

  return (
    <div className="px-4">
      <div className="p-4 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, var(--accent)22, var(--surface))', border: '1px solid var(--accent)33' }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
            Suggested by {dayKey}
          </span>
          <button onClick={() => navigate('/settings/workout-library')} className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
            <SettingsIcon size={12} /> Configure
          </button>
        </div>
        <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          {suggestedExercises.length > 0 ? `${suggestedExercises.length} exercises for today` : 'No routine configured'}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{format(new Date(), 'EEEE, d MMM')}</p>
      </div>

      {loading ? (
        [1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl mb-3 p-4" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="skeleton h-4 w-40 rounded mb-2" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
        ))
      ) : suggestedExercises.length === 0 ? (
        <div className="py-10 text-center">
          <Dumbbell size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No workout library configured</p>
          <button onClick={() => navigate('/settings/workout-library')} className="mt-2 h-10 px-4 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent)' }}>
            Set Routine
          </button>
        </div>
      ) : (
        suggestedExercises.map(ex => {
          const sets = setsByExercise[ex.id] || [];
          const completed = sets.filter(s => s.isCompleted).length;
          return (
            <div key={ex.id} className="rounded-2xl overflow-hidden mb-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <Dumbbell size={16} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{ex.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ex.muscleGroup || 'General'}</p>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{completed}/{sets.length}</span>
              </div>

              <div className="px-3 pb-3 pt-2 space-y-2">
                {sets.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={!!s.isCompleted} onChange={e => updateSet(ex.id, idx, { isCompleted: e.target.checked })} />
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>#{s.setNumber}</span>
                    </label>
                    <input
                      type="number"
                      value={s.weight || ''}
                      onChange={e => updateSet(ex.id, idx, { weight: Number(e.target.value) || 0 })}
                      className="px-2 py-1.5 rounded-lg text-xs num"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      placeholder="kg"
                    />
                    <input
                      type="number"
                      value={s.reps || ''}
                      onChange={e => updateSet(ex.id, idx, { reps: Number(e.target.value) || 0 })}
                      className="px-2 py-1.5 rounded-lg text-xs num"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      placeholder="reps"
                    />
                    <button onClick={() => addSet(ex.id)} className="h-8 rounded-lg text-[11px] font-semibold" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent)' }}>
                      + Set
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      <div className="rounded-2xl p-3 mb-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Workout Images</p>
          <label className="text-xs flex items-center gap-1 cursor-pointer" style={{ color: 'var(--accent)' }}>
            <Camera size={12} /> Add
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
        {images.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <img key={i} src={img} alt="workout" className="w-full h-20 object-cover rounded-xl" />
            ))}
          </div>
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No images added yet.</p>
        )}
      </div>

      <button onClick={saveTodayLog} className="w-full h-11 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 mb-4" style={{ backgroundColor: 'var(--accent)' }}>
        <Check size={16} /> Save Today's Workout Log
      </button>
      {saveMessage && <p className="text-xs text-center" style={{ color: 'var(--accent-green)' }}>{saveMessage}</p>}
    </div>
  );
}

function DietTab() {
  const [meals, setMeals] = useState<MealTemplate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [goal, setGoal] = useState(2400);
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const rawMeals = localStorage.getItem(MEALS_KEY);
    if (rawMeals) {
      try { setMeals(JSON.parse(rawMeals)); } catch { setMeals([]); }
    }
    const rawGoal = localStorage.getItem(CALORIE_KEY);
    if (rawGoal) setGoal(Number(rawGoal) || 2400);

    const rawLogs = localStorage.getItem(DIET_LOGS_KEY);
    if (rawLogs) {
      try {
        const logs = JSON.parse(rawLogs) as Record<string, string[]>;
        setSelected(logs[today] || []);
      } catch {
        setSelected([]);
      }
    }
  }, [today]);

  const consumedCalories = useMemo(() => {
    return meals
      .filter(m => selected.includes(m.id))
      .reduce((sum, meal) => sum + meal.ingredients.reduce((s, i) => s + i.calories, 0), 0);
  }, [selected, meals]);

  const pct = goal > 0 ? Math.min(100, Math.round((consumedCalories / goal) * 100)) : 0;

  function toggleMeal(id: string) {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
    setSelected(next);
    const raw = localStorage.getItem(DIET_LOGS_KEY);
    let logs: Record<string, string[]> = {};
    if (raw) {
      try { logs = JSON.parse(raw); } catch { logs = {}; }
    }
    logs[today] = next;
    localStorage.setItem(DIET_LOGS_KEY, JSON.stringify(logs));
  }

  return (
    <div className="px-4">
      <div className="p-5 rounded-2xl mb-4 flex items-center gap-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="relative flex-shrink-0">
          <svg width="88" height="88" className="-rotate-90">
            <circle cx="44" cy="44" r="36" stroke="var(--surface-elevated)" strokeWidth="8" fill="none" />
            <circle
              cx="44" cy="44" r="36"
              stroke="var(--accent-warm)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - pct / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold num" style={{ color: 'var(--text-primary)' }}>{pct}%</span>
          </div>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Consumed</p>
          <p className="text-2xl font-bold num" style={{ color: 'var(--text-primary)' }}>{consumedCalories}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>of {goal} kcal</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="section-label">Configured Meals</span>
        <button onClick={() => navigate('/settings/meals')} className="text-xs" style={{ color: 'var(--accent)' }}>Manage</button>
      </div>

      {meals.length === 0 ? (
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>No meals configured yet.</p>
          <button onClick={() => navigate('/settings/meals')} className="mt-2 h-9 px-3 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent)' }}>
            Configure Meals
          </button>
        </div>
      ) : (
        meals.map(meal => {
          const total = meal.ingredients.reduce((s, i) => s + i.calories, 0);
          const on = selected.includes(meal.id);
          return (
            <button
              key={meal.id}
              onClick={() => toggleMeal(meal.id)}
              className="w-full text-left flex items-center gap-3 p-3 rounded-xl mb-2"
              style={{
                backgroundColor: on ? 'var(--accent)11' : 'var(--surface)',
                border: `1px solid ${on ? 'var(--accent)55' : 'var(--border)'}`,
              }}
            >
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: on ? 'var(--accent)' : 'var(--surface-elevated)' }}>
                {on && <Check size={12} color="#fff" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{meal.name}</p>
                <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{meal.timing} - {meal.ingredients.map(i => i.name).join(' - ')}</p>
                {meal.recipe && <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{meal.recipe}</p>}
              </div>
              <span className="text-xs font-bold num" style={{ color: 'var(--accent-warm)' }}>{total}</span>
            </button>
          );
        })
      )}
    </div>
  );
}

function ProgressTab() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(WORKOUT_LOGS_KEY);
    if (raw) {
      try { setLogs(JSON.parse(raw)); } catch { setLogs([]); }
    }
  }, []);

  const prs = useMemo(() => {
    const map = new Map<string, { exerciseName: string; bestWeight: number; bestReps: number; achievedAt: string }>();
    for (const log of logs) {
      for (const ex of log.exercises) {
        for (const set of ex.sets) {
          const existing = map.get(ex.name);
          if (!existing || (set.weight > existing.bestWeight || (set.weight === existing.bestWeight && set.reps > existing.bestReps))) {
            map.set(ex.name, {
              exerciseName: ex.name,
              bestWeight: set.weight || 0,
              bestReps: set.reps || 0,
              achievedAt: log.date,
            });
          }
        }
      }
    }
    return Array.from(map.values()).slice(0, 8);
  }, [logs]);

  return (
    <div className="px-4">
      <div className="section-header px-0 mb-2">
        <span className="section-label">Personal Records</span>
      </div>
      {prs.length === 0 ? (
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>No workout logs yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {prs.map(pr => (
            <div key={pr.exerciseName} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-gold)22' }}>
                <Trophy size={16} style={{ color: 'var(--accent-gold)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{pr.exerciseName}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {pr.bestWeight} kg x {pr.bestReps} reps
                </p>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(new Date(pr.achievedAt), 'd MMM')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Body() {
  const [tab, setTab] = useState<Tab>('Workout');

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="px-4 mb-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Body</h1>
      </div>

      <PillTabs tabs={['Workout', 'Diet', 'Progress']} active={tab} onChange={t => setTab(t as Tab)} />

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.15 }}
          className="mt-2"
        >
          {tab === 'Workout' && <WorkoutTab />}
          {tab === 'Diet' && <DietTab />}
          {tab === 'Progress' && <ProgressTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
