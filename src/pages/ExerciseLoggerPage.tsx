import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Plus, Trash2, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import * as api from '../lib/api';

type Exercise = {
  id: number;
  name: string;
  muscleGroup?: string;
  imageUrl?: string;
};

type WorkoutSet = {
  id?: number;
  exerciseId: number;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  isCompleted?: boolean;
};

type WorkoutPlan = {
  id?: number;
  date?: string;
  sets?: WorkoutSet[];
  plannedExercises?: string;
};

export default function ExerciseLoggerPage() {
  const navigate = useNavigate();
  const { exerciseId } = useParams();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [todayPlan, setTodayPlan] = useState<WorkoutPlan | null>(null);
  const [setsToday, setSetsToday] = useState<WorkoutSet[]>([]);
  const [historySets, setHistorySets] = useState<Array<WorkoutSet & { date: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const exId = Number(exerciseId || 0);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!exId) return;
    load();
  }, [exId]);

  async function load() {
    setLoading(true);
    try {
      const fromDate = format(subDays(new Date(), 365), 'yyyy-MM-dd');
      const [allExercises, plan, plans] = await Promise.all([
        api.getExercises(),
        api.getWorkoutPlanByDate(today),
        api.getWorkoutPlans(fromDate),
      ]);

      const ex = (Array.isArray(allExercises) ? allExercises : []).find((x: any) => Number(x.id) === exId) || null;
      setExercise(ex);

      const normalizedPlan = (plan as WorkoutPlan) || null;
      setTodayPlan(normalizedPlan);

      const todaySets = (Array.isArray(normalizedPlan?.sets) ? normalizedPlan!.sets! : [])
        .filter(s => Number(s.exerciseId) === exId)
        .sort((a, b) => Number(a.setNumber || 0) - Number(b.setNumber || 0));
      setSetsToday(todaySets);

      const allPlans = Array.isArray(plans) ? plans as WorkoutPlan[] : [];
      const history: Array<WorkoutSet & { date: string }> = [];
      for (const p of allPlans) {
        const date = String((p as any).date || '').slice(0, 10);
        const sets = Array.isArray(p.sets) ? p.sets : [];
        for (const s of sets) {
          if (Number(s.exerciseId) !== exId) continue;
          history.push({ ...s, date });
        }
      }
      history.sort((a, b) => String(b.date).localeCompare(String(a.date)) || Number(a.setNumber) - Number(b.setNumber));
      setHistorySets(history);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to load logger');
    } finally {
      setLoading(false);
    }
  }

  async function ensureTodayPlan() {
    if (todayPlan?.id) return todayPlan;

    const created = await api.createWorkoutPlan({
      date: new Date().toISOString(),
      dayLabel: format(new Date(), 'EEEE'),
      plannedExercises: JSON.stringify([{ exerciseId: exId, targetSets: 4, targetReps: 10 }]),
      isCompleted: false,
    });

    const plan = created as WorkoutPlan;
    setTodayPlan(plan);
    return plan;
  }

  async function addSet() {
    if (!exId) return;
    setSaving(true);
    try {
      const plan = await ensureTodayPlan();
      const prev = setsToday[setsToday.length - 1];
      const created = await api.logWorkoutSet(Number(plan.id), {
        exerciseId: exId,
        setNumber: setsToday.length + 1,
        reps: Number(prev?.reps || 10),
        weightKg: Number(prev?.weightKg || 0),
        isCompleted: true,
      });
      const next = [...setsToday, created as WorkoutSet].sort((a, b) => Number(a.setNumber || 0) - Number(b.setNumber || 0));
      setSetsToday(next);
      setStatus('Set logged');
      await load();
    } catch (e: any) {
      setStatus(e?.message || 'Failed to add set');
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(''), 1200);
    }
  }

  async function saveSet(setId: number | undefined, patch: Partial<WorkoutSet>) {
    if (!setId) return;
    setSetsToday(prev => prev.map(s => s.id === setId ? { ...s, ...patch } : s));
    try {
      await api.updateWorkoutSet(setId, patch);
      await load();
    } catch (e: any) {
      setStatus(e?.message || 'Failed to save set');
    }
  }

  async function deleteSet(setId: number | undefined) {
    if (!setId) return;
    try {
      await api.deleteWorkoutSet(setId);
      await load();
      setStatus('Set deleted');
      setTimeout(() => setStatus(''), 1200);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to delete set');
    }
  }

  const insights = useMemo(() => {
    const completed = historySets.filter(s => s.isCompleted);
    const count = completed.length;
    const avgWeight = count ? completed.reduce((sum, s) => sum + Number(s.weightKg || 0), 0) / count : 0;
    const avgReps = count ? completed.reduce((sum, s) => sum + Number(s.reps || 0), 0) / count : 0;
    const maxWeight = count ? Math.max(...completed.map(s => Number(s.weightKg || 0))) : 0;
    const avgVolume = count ? completed.reduce((sum, s) => sum + (Number(s.weightKg || 0) * Number(s.reps || 0)), 0) / count : 0;
    const last5 = completed.slice(0, 5);
    const trendWeight = last5.length ? last5.reduce((sum, s) => sum + Number(s.weightKg || 0), 0) / last5.length : 0;

    return {
      totalSets: count,
      avgWeight,
      avgReps,
      maxWeight,
      avgVolume,
      trendWeight,
    };
  }, [historySets]);

  if (!exId) {
    return (
      <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Invalid exercise</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div className="space-y-3">
          <div className="h-20 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }} />
          <div className="h-24 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }} />
          <div className="h-56 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/body?tab=Workout')} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{exercise?.name || 'Exercise Logger'}</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{exercise?.muscleGroup || 'Workout'} · Performance Tracker</p>
        </div>
      </div>

      {status && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs font-semibold" style={{ backgroundColor: 'rgba(78,205,196,0.1)', color: 'var(--accent-green)' }}>
          {status}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1 mb-1" style={{ color: 'var(--accent)' }}><TrendingUp size={12} /><span className="text-[10px]">Avg Weight</span></div>
          <p className="text-base font-bold num" style={{ color: 'var(--text-primary)' }}>{insights.avgWeight.toFixed(1)} kg</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1 mb-1" style={{ color: 'var(--accent-green)' }}><Activity size={12} /><span className="text-[10px]">Avg Reps</span></div>
          <p className="text-base font-bold num" style={{ color: 'var(--text-primary)' }}>{insights.avgReps.toFixed(1)}</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1 mb-1" style={{ color: 'var(--accent-warm)' }}><Dumbbell size={12} /><span className="text-[10px]">Max Weight</span></div>
          <p className="text-base font-bold num" style={{ color: 'var(--text-primary)' }}>{insights.maxWeight.toFixed(1)} kg</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1 mb-1" style={{ color: 'var(--accent-gold)' }}><BarChart3 size={12} /><span className="text-[10px]">Avg Volume</span></div>
          <p className="text-base font-bold num" style={{ color: 'var(--text-primary)' }}>{insights.avgVolume.toFixed(0)}</p>
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Today&apos;s Logging</p>
          <button onClick={addSet} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1" style={{ backgroundColor: 'var(--accent)' }}>
            <Plus size={12} /> {saving ? 'Adding...' : 'Add Set'}
          </button>
        </div>

        {setsToday.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No sets today yet. Start with Add Set.</p>
        ) : (
          <div className="space-y-2">
            {setsToday.map((s, idx) => (
              <div key={s.id || idx} className="rounded-xl p-2.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Set #{s.setNumber}</p>
                  <button onClick={() => deleteSet(s.id)} className="p-1" style={{ color: 'var(--text-muted)' }} title="Delete set">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-[1fr_1fr_60px] gap-2 items-end">
                  <div>
                    <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Reps</label>
                    <input
                      type="number"
                      value={s.reps && s.reps > 0 ? s.reps : ''}
                      onChange={e => setSetsToday(prev => prev.map(row => row.id === s.id ? { ...row, reps: Number(e.target.value || 0) } : row))}
                      onBlur={() => saveSet(s.id, { reps: s.reps, weightKg: s.weightKg, isCompleted: s.isCompleted })}
                      className="w-full h-8 px-2 rounded-md text-xs num outline-none"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Weight (kg)</label>
                    <input
                      type="number"
                      value={s.weightKg && s.weightKg > 0 ? s.weightKg : ''}
                      onChange={e => setSetsToday(prev => prev.map(row => row.id === s.id ? { ...row, weightKg: Number(e.target.value || 0) } : row))}
                      onBlur={() => saveSet(s.id, { reps: s.reps, weightKg: s.weightKg, isCompleted: s.isCompleted })}
                      className="w-full h-8 px-2 rounded-md text-xs num outline-none"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                  </div>
                  <button
                    onClick={() => saveSet(s.id, { isCompleted: !s.isCompleted, reps: s.reps, weightKg: s.weightKg })}
                    className="h-8 rounded-md text-[10px] font-semibold"
                    style={{ backgroundColor: s.isCompleted ? 'var(--accent-green)' : 'var(--surface)', color: s.isCompleted ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)' }}
                  >
                    {s.isCompleted ? 'Done' : 'Log'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Set History (1 year)</p>
        {historySets.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No historical data yet for this exercise.</p>
        ) : (
          <div className="space-y-2 max-h-[36vh] overflow-y-auto pr-1">
            {historySets.map((s, idx) => (
              <div key={`${s.id || idx}-${s.date}`} className="rounded-lg px-2.5 py-2 flex items-center justify-between" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <div>
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{s.date} · Set #{s.setNumber}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.isCompleted ? 'Completed' : 'Pending'}</p>
                </div>
                <p className="text-[11px] num" style={{ color: 'var(--accent)' }}>{Number(s.weightKg || 0)} kg × {Number(s.reps || 0)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
