import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Trophy, Star, Plus, ChevronRight, Check,
  TrendingUp, Target, Zap, MoreHorizontal, FlameKindling
} from 'lucide-react';
import { format } from 'date-fns';
import * as api from '../lib/api';

type Tab = 'Workout' | 'Diet' | 'Progress';

interface Exercise {
  id: string;
  name: string;
  muscleGroup?: string;
  sets?: WorkoutSet[];
}

interface WorkoutSet {
  setNumber: number;
  weight: number;
  reps: number;
  isCompleted?: boolean;
}

interface PR {
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  achievedAt?: string;
}

function PillTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="h-scroll px-4 py-3 gap-2">
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`pill-tab ${active === t ? 'pill-tab-active' : 'pill-tab-inactive'}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function SetRow({
  set, onChange, isPR
}: {
  set: WorkoutSet;
  onChange: (s: WorkoutSet) => void;
  isPR?: boolean;
}) {
  const [done, setDone] = useState(set.isCompleted ?? false);

  const toggle = () => {
    const next = !done;
    setDone(next);
    onChange({ ...set, isCompleted: next });
    if (next && 'vibrate' in navigator) navigator.vibrate(30);
  };

  return (
    <div className="flex items-center gap-3 py-2.5 px-3">
      <button
        onClick={toggle}
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all press"
        style={{
          backgroundColor: done ? 'var(--accent)' : 'var(--surface-elevated)',
          border: done ? 'none' : '1px solid var(--border)',
        }}
      >
        {done && <Check size={14} color="#fff" />}
      </button>
      <span className="text-xs font-medium w-12" style={{ color: 'var(--text-muted)' }}>Set {set.setNumber}</span>
      <input
        type="number"
        inputMode="decimal"
        defaultValue={set.weight || ''}
        placeholder="--"
        className="w-16 text-center rounded-lg p-1.5 text-sm font-semibold num outline-none"
        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
        onBlur={e => onChange({ ...set, weight: parseFloat(e.target.value) || 0 })}
      />
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>kg</span>
      <input
        type="number"
        inputMode="numeric"
        defaultValue={set.reps || ''}
        placeholder="--"
        className="w-14 text-center rounded-lg p-1.5 text-sm font-semibold num outline-none"
        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
        onBlur={e => onChange({ ...set, reps: parseInt(e.target.value) || 0 })}
      />
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>reps</span>
      {isPR && (
        <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--accent-gold)22' }}>
          <Star size={11} style={{ color: 'var(--accent-gold)' }} />
          <span className="text-[10px] font-bold" style={{ color: 'var(--accent-gold)' }}>PR</span>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const [sets, setSets] = useState<WorkoutSet[]>(
    exercise.sets ?? [{ setNumber: 1, weight: 0, reps: 0 }]
  );
  const [expanded, setExpanded] = useState(true);

  const addSet = () => {
    setSets(prev => [...prev, { setNumber: prev.length + 1, weight: 0, reps: 0 }]);
  };

  const updateSet = (idx: number, s: WorkoutSet) => {
    setSets(prev => prev.map((p, i) => i === idx ? s : p));
  };

  const completedSets = sets.filter(s => s.isCompleted).length;
  const totalSets = sets.length;

  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 press"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface-elevated)' }}>
          <Dumbbell size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{exercise.name}</p>
          {exercise.muscleGroup && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{exercise.muscleGroup}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs num" style={{ color: completedSets === totalSets && totalSets > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            {completedSets}/{totalSets}
          </span>
          <div
            className="w-8 h-1 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%`,
                backgroundColor: 'var(--accent-green)',
              }}
            />
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 w-28" style={{ color: 'var(--text-muted)' }}>Set</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider w-20 text-center" style={{ color: 'var(--text-muted)' }}>Weight</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider w-20 text-center" style={{ color: 'var(--text-muted)' }}>Reps</span>
              </div>
              {sets.map((s, i) => (
                <SetRow key={i} set={s} onChange={u => updateSet(i, u)} />
              ))}
              <button
                onClick={addSet}
                className="w-full py-3 text-xs font-medium press flex items-center justify-center gap-1"
                style={{ color: 'var(--accent)', borderTop: '1px solid var(--border)' }}
              >
                <Plus size={14} />
                Add Set
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WorkoutTab() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutDone, setWorkoutDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWorkoutPlans().then((data: any) => {
      const list = Array.isArray(data) ? data : [];
      setExercises(list.slice(0, 6).map((e: any, i: number) => ({
        id: e.id?.toString() ?? i.toString(),
        name: e.exerciseName ?? e.name ?? 'Exercise',
        muscleGroup: e.muscleGroup ?? e.muscle_group,
        sets: e.sets ?? [{ setNumber: 1, weight: 0, reps: 0 }],
      })));
    }).catch(() => {
      // Demo exercises if API fails
      setExercises([
        { id: '1', name: 'Bench Press', muscleGroup: 'Chest', sets: [{ setNumber: 1, weight: 60, reps: 10 }] },
        { id: '2', name: 'Incline Dumbbell Press', muscleGroup: 'Chest', sets: [{ setNumber: 1, weight: 30, reps: 12 }] },
        { id: '3', name: 'Tricep Pushdown', muscleGroup: 'Triceps', sets: [{ setNumber: 1, weight: 25, reps: 15 }] },
      ]);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4">
      {/* Session header */}
      <div className="p-4 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, var(--accent)22, var(--surface))', border: '1px solid var(--accent)33' }}>
        <div className="flex items-center gap-2 mb-1">
          <FlameKindling size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
            Today's Session
          </span>
        </div>
        <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Push Day — Chest & Triceps</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{format(new Date(), 'EEEE, d MMM')}</p>
      </div>

      {loading ? (
        [1,2,3].map(i => (
          <div key={i} className="rounded-2xl mb-3 p-4" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="skeleton h-4 w-40 rounded mb-2" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
        ))
      ) : exercises.length === 0 ? (
        <div className="py-12 text-center">
          <Dumbbell size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No workout planned</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Set up your program in settings</p>
        </div>
      ) : (
        exercises.map(ex => <ExerciseCard key={ex.id} exercise={ex} />)
      )}

      {exercises.length > 0 && (
        <button
          onClick={() => { setWorkoutDone(true); if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]); }}
          className="w-full h-12 rounded-2xl font-semibold text-white press transition-all mb-4 flex items-center justify-center gap-2"
          style={{ backgroundColor: workoutDone ? 'var(--accent-green)' : 'var(--accent)' }}
        >
          {workoutDone ? <><Check size={18} /> Workout Complete!</> : 'Complete Workout'}
        </button>
      )}
    </div>
  );
}

function DietTab() {
  const calsConsumed = 1840;
  const calsTarget = 2400;
  const pct = Math.round((calsConsumed / calsTarget) * 100);

  const macros = [
    { label: 'Protein', value: 142, target: 180, color: 'var(--accent-warm)' },
    { label: 'Carbs',   value: 198, target: 260, color: 'var(--accent-gold)' },
    { label: 'Fat',     value: 62,  target: 80,  color: 'var(--accent-green)' },
  ];

  return (
    <div className="px-4">
      {/* Calorie ring */}
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
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold num" style={{ color: 'var(--text-primary)' }}>{pct}%</span>
          </div>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Consumed</p>
          <p className="text-2xl font-bold num" style={{ color: 'var(--text-primary)' }}>{calsConsumed}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>of {calsTarget} kcal</p>
        </div>
      </div>

      {/* Macros */}
      <div className="p-4 rounded-2xl mb-4 space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="section-label">Macros</span>
        {macros.map(m => (
          <div key={m.label}>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
              <span className="text-xs num" style={{ color: 'var(--text-muted)' }}>{m.value}g / {m.target}g</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(100, (m.value / m.target) * 100)}%`, backgroundColor: m.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Meals */}
      <div className="section-header px-0 mb-2">
        <span className="section-label">Today's Meals</span>
      </div>
      {[
        { label: 'Pre-workout',  items: ['Oats + Banana', 'Whey Protein'], cals: 480 },
        { label: 'Post-workout', items: ['Chicken Breast', 'Brown Rice', 'Broccoli'], cals: 620 },
        { label: 'Dinner',       items: ['Greek Yogurt', 'Almonds'], cals: 320 },
      ].map(meal => (
        <div key={meal.label} className="flex items-center gap-3 p-3 rounded-xl mb-2" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{meal.label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{meal.items.join(' · ')}</p>
          </div>
          <span className="ml-auto text-sm font-bold num" style={{ color: 'var(--accent-warm)' }}>{meal.cals}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressTab() {
  const prs: PR[] = [
    { exerciseName: 'Bench Press',    bestWeight: 100, bestReps: 5, achievedAt: '2026-04-28' },
    { exerciseName: 'Squat',          bestWeight: 120, bestReps: 3, achievedAt: '2026-04-22' },
    { exerciseName: 'Deadlift',       bestWeight: 140, bestReps: 1, achievedAt: '2026-05-01' },
    { exerciseName: 'OHP',            bestWeight: 70,  bestReps: 5, achievedAt: '2026-04-18' },
  ];

  const weightData = [72.5, 72.1, 71.8, 71.6, 71.4, 71.9, 71.2];
  const minW = Math.min(...weightData) - 0.5;
  const maxW = Math.max(...weightData) + 0.5;

  return (
    <div className="px-4">
      {/* Weight chart */}
      <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="section-label">Body Weight</span>
          <span className="text-sm font-bold num" style={{ color: 'var(--accent-green)' }}>-1.3 kg</span>
        </div>
        <div className="flex items-end gap-1 h-20">
          {weightData.map((w, i) => {
            const h = ((w - minW) / (maxW - minW)) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{
                    height: `${40 + h * 0.6}%`,
                    backgroundColor: i === weightData.length - 1 ? 'var(--accent)' : 'var(--surface-elevated)',
                  }}
                />
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  {['M','T','W','T','F','S','S'][i]}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs num" style={{ color: 'var(--text-muted)' }}>Current: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{weightData[weightData.length-1]} kg</span></span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Goal: 70 kg</span>
        </div>
      </div>

      {/* PRs */}
      <div className="section-header px-0 mb-2">
        <span className="section-label">Personal Records</span>
      </div>
      <div className="space-y-2">
        {prs.map(pr => (
          <div key={pr.exerciseName} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-gold)22' }}>
              <Trophy size={16} style={{ color: 'var(--accent-gold)' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{pr.exerciseName}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {pr.bestWeight} kg × {pr.bestReps} reps
              </p>
            </div>
            {pr.achievedAt && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {format(new Date(pr.achievedAt), 'd MMM')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Body() {
  const [tab, setTab] = useState<Tab>('Workout');

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-4 mb-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Body</h1>
      </div>

      <PillTabs
        tabs={['Workout', 'Diet', 'Progress']}
        active={tab}
        onChange={t => setTab(t as Tab)}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.15 }}
          className="mt-2"
        >
          {tab === 'Workout'  && <WorkoutTab />}
          {tab === 'Diet'     && <DietTab />}
          {tab === 'Progress' && <ProgressTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
