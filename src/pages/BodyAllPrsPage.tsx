import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import * as api from '../lib/api';

type Exercise = {
  id: number;
  name: string;
  muscleGroup?: string;
  category?: string;
};

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function BodyAllPrsPage() {
  const navigate = useNavigate();
  const [prs, setPrs] = useState<any[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [prsData, exData] = await Promise.all([
          api.getPersonalRecords().catch(() => []),
          api.getExercises().catch(() => []),
        ]);

        const normalizedPrs = (Array.isArray(prsData) ? prsData : [])
          .map((pr) => ({
            ...pr,
            exerciseId: toNumber(pr?.exerciseId ?? pr?.exercise_id ?? pr?.ExerciseId, 0),
            weightKg: toNumber(pr?.weightKg ?? pr?.maxWeightKg ?? pr?.max_weight_kg ?? pr?.MaxWeightKg, 0),
            reps: toNumber(pr?.reps ?? pr?.Reps, 0),
          }))
          .filter((pr) => pr.exerciseId > 0);

        setPrs(normalizedPrs);
        setExercises(Array.isArray(exData) ? exData : []);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const resolveExerciseName = (exerciseId: number) =>
    exercises.find(e => e.id === exerciseId)?.name ?? `Exercise #${exerciseId}`;

  const resolveExerciseMuscle = (exerciseId: number) => {
    const ex = exercises.find(e => e.id === exerciseId);
    return ex?.muscleGroup ?? ex?.category ?? 'Strength';
  };

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/body?tab=Progress')}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>All Personal Records</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{prs.length} total</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }} />
          ))}
        </div>
      ) : prs.length === 0 ? (
        <div className="p-5 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '2px dashed var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No PRs yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Complete sets in Workout to set records</p>
        </div>
      ) : (
        <div className="space-y-2">
          {prs.map((pr, idx) => {
            const name = resolveExerciseName(pr.exerciseId);
            const muscle = resolveExerciseMuscle(pr.exerciseId);
            const oneRm = pr.weightKg > 0 && pr.reps > 0
              ? Math.round(pr.weightKg * (1 + pr.reps / 30))
              : null;
            return (
              <div key={`${pr.exerciseId}-${idx}`} className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  🏅
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{muscle}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black num" style={{ color: 'var(--accent-warm)' }}>
                    {pr.weightKg} kg × {pr.reps}
                  </p>
                  {oneRm !== null && (
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>~{oneRm} kg 1RM</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
