import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Plus, Trash2, TrendingUp, Activity, BarChart3, Trophy } from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
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

type DraftSet = {
  localId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  isCompleted: boolean;
};

export default function ExerciseLoggerPage() {
  const navigate = useNavigate();
  const { exerciseId } = useParams();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [todayPlan, setTodayPlan] = useState<WorkoutPlan | null>(null);
  const [setsToday, setSetsToday] = useState<WorkoutSet[]>([]);
  const [draftSets, setDraftSets] = useState<DraftSet[]>([]);
  const [historySets, setHistorySets] = useState<Array<WorkoutSet & { date: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const exId = Number(exerciseId || 0);
  const today = format(new Date(), 'yyyy-MM-dd');

  function toNumber(value: unknown, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeSet(raw: any): WorkoutSet {
    const reps = toNumber(raw?.reps ?? raw?.Reps, 0);
    const weightKg = toNumber(raw?.weightKg ?? raw?.WeightKg, 0);
    const completedRaw = raw?.isCompleted ?? raw?.IsCompleted;
    const isCompleted = typeof completedRaw === 'boolean'
      ? completedRaw
      : (reps > 0 || weightKg > 0);

    return {
      id: toNumber(raw?.id ?? raw?.Id, 0) || undefined,
      exerciseId: toNumber(raw?.exerciseId ?? raw?.ExerciseId, 0),
      setNumber: toNumber(raw?.setNumber ?? raw?.SetNumber, 0),
      reps,
      weightKg,
      isCompleted,
    };
  }

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
        .map((s: any) => normalizeSet(s))
        .filter(s => Number(s.exerciseId) === exId)
        .sort((a, b) => Number(a.setNumber || 0) - Number(b.setNumber || 0));
      setSetsToday(todaySets);

      const allPlans = Array.isArray(plans) ? plans as WorkoutPlan[] : [];
      const history: Array<WorkoutSet & { date: string }> = [];
      for (const p of allPlans) {
        const date = String((p as any).date || '').slice(0, 10);
        const sets = (Array.isArray(p.sets) ? p.sets : []).map((s: any) => normalizeSet(s));
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
    const prev = draftSets[draftSets.length - 1] || setsToday[setsToday.length - 1];
    const nextSetNumber = setsToday.length + draftSets.length + 1;
    const draft: DraftSet = {
      localId: `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      setNumber: nextSetNumber,
      reps: Number((prev as any)?.reps || 10),
      weightKg: Number((prev as any)?.weightKg || 0),
      isCompleted: true,
    };
    setDraftSets(prevDrafts => [...prevDrafts, draft]);
    setStatus('Draft set added. Tap Log to save.');
    setTimeout(() => setStatus(''), 1200);
  }

  async function saveDraftSet(localId: string) {
    const draft = draftSets.find(d => d.localId === localId);
    if (!draft || !exId) return;

    setSaving(true);
    try {
      const plan = await ensureTodayPlan();
      const created = await api.logWorkoutSet(Number(plan.id), {
        exerciseId: exId,
        setNumber: draft.setNumber,
        reps: Number(draft.reps || 0),
        weightKg: Number(draft.weightKg || 0),
        isCompleted: Boolean(draft.isCompleted),
      });

      setDraftSets(prev => prev.filter(d => d.localId !== localId));
      setSetsToday(prev => [...prev, created as WorkoutSet].sort((a, b) => Number(a.setNumber || 0) - Number(b.setNumber || 0)));
      setStatus('Set logged. Tap Edit to modify.');
      await load();
    } catch (e: any) {
      setStatus(e?.message || 'Failed to log set');
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(''), 1200);
    }
  }

  function removeDraftSet(localId: string) {
    setDraftSets(prev => prev.filter(d => d.localId !== localId));
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
    const completed = historySets.filter(s => {
      if (typeof s.isCompleted === 'boolean') return s.isCompleted;
      return Number(s.reps || 0) > 0 || Number(s.weightKg || 0) > 0;
    });
    const count = completed.length;
    const avgWeight = count ? completed.reduce((sum, s) => sum + Number(s.weightKg || 0), 0) / count : 0;
    const avgReps = count ? completed.reduce((sum, s) => sum + Number(s.reps || 0), 0) / count : 0;
    const maxWeight = count ? Math.max(...completed.map(s => Number(s.weightKg || 0))) : 0;
    const avgVolume = count ? completed.reduce((sum, s) => sum + (Number(s.weightKg || 0) * Number(s.reps || 0)), 0) / count : 0;
    const last5 = completed.slice(0, 5);
    const trendWeight = last5.length ? last5.reduce((sum, s) => sum + Number(s.weightKg || 0), 0) / last5.length : 0;
    const bestSet = completed.reduce((best, s) => {
      const currVolume = Number(s.weightKg || 0) * Number(s.reps || 0);
      const bestVolume = Number(best?.weightKg || 0) * Number(best?.reps || 0);
      return currVolume > bestVolume ? s : best;
    }, completed[0] as (WorkoutSet & { date: string }) | undefined);

    const oneRm = bestSet ? Number(bestSet.weightKg || 0) * (1 + Number(bestSet.reps || 0) / 30) : 0;

    const byDate = new Map<string, Array<WorkoutSet & { date: string }>>();
    for (const s of historySets) {
      if (!byDate.has(s.date)) byDate.set(s.date, []);
      byDate.get(s.date)!.push(s);
    }

    const groupedHistory = Array.from(byDate.entries())
      .map(([date, sets]) => ({
        date,
        sets: [...sets].sort((a, b) => Number(a.setNumber || 0) - Number(b.setNumber || 0)),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      totalSets: count,
      avgWeight,
      avgReps,
      maxWeight,
      avgVolume,
      trendWeight,
      oneRm,
      groupedHistory,
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
        <div className="rounded-xl p-3 col-span-2" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1 mb-1" style={{ color: 'var(--accent-warm)' }}><Trophy size={12} /><span className="text-[10px]">Estimated 1RM</span></div>
          <p className="text-base font-bold num" style={{ color: 'var(--text-primary)' }}>{insights.oneRm.toFixed(1)} kg</p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Calculated from your best completed set</p>
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Today&apos;s Logging</p>
          <button onClick={addSet} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1" style={{ backgroundColor: 'var(--accent)' }}>
            <Plus size={12} /> {saving ? 'Adding...' : 'Add Set'}
          </button>
        </div>

        {(setsToday.length === 0 && draftSets.length === 0) ? (
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
                    style={{
                      backgroundColor: s.isCompleted ? 'var(--surface)' : 'var(--accent)',
                      color: s.isCompleted ? 'var(--text-secondary)' : '#fff',
                      border: s.isCompleted ? '1px solid var(--border)' : '1px solid var(--accent)'
                    }}
                  >
                    {s.isCompleted ? 'Edit' : 'Log'}
                  </button>
                </div>
              </div>
            ))}

            {draftSets.map((d) => (
              <div key={d.localId} className="rounded-xl p-2.5" style={{ backgroundColor: 'rgba(108,99,255,0.08)', border: '1px dashed var(--accent)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Set #{d.setNumber} (Draft)</p>
                  <button onClick={() => removeDraftSet(d.localId)} className="p-1" style={{ color: 'var(--text-muted)' }} title="Remove draft set">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-[1fr_1fr_72px] gap-2 items-end">
                  <div>
                    <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Reps</label>
                    <input
                      type="number"
                      value={d.reps > 0 ? d.reps : ''}
                      onChange={e => setDraftSets(prev => prev.map(row => row.localId === d.localId ? { ...row, reps: Number(e.target.value || 0) } : row))}
                      className="w-full h-8 px-2 rounded-md text-xs num outline-none"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Weight (kg)</label>
                    <input
                      type="number"
                      value={d.weightKg > 0 ? d.weightKg : ''}
                      onChange={e => setDraftSets(prev => prev.map(row => row.localId === d.localId ? { ...row, weightKg: Number(e.target.value || 0) } : row))}
                      className="w-full h-8 px-2 rounded-md text-xs num outline-none"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                  </div>
                  <button
                    onClick={() => saveDraftSet(d.localId)}
                    disabled={saving}
                    className="h-8 rounded-md text-[10px] font-semibold"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)', opacity: saving ? 0.7 : 1 }}
                  >
                    Log
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Set History (1 year)</p>
        {insights.groupedHistory.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No historical data yet for this exercise.</p>
        ) : (
          <div className="space-y-2 max-h-[36vh] overflow-y-auto pr-1">
            {insights.groupedHistory.map((dayGroup) => (
              <div key={dayGroup.date} className="rounded-lg px-2.5 py-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  {format(parseISO(dayGroup.date), 'MMM do, yyyy')}
                </p>
                <div className="space-y-1.5">
                  {dayGroup.sets.map((s, idx) => (
                    <div key={`${dayGroup.date}-${s.id || idx}`} className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      <span>Set #{s.setNumber} {s.isCompleted ? '• Completed' : '• Pending'}</span>
                      <span className="num" style={{ color: 'var(--accent)' }}>{Number(s.weightKg || 0)} kg x {Number(s.reps || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
