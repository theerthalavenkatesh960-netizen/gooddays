import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import * as api from '../lib/api';

type EditDraft = {
  captureText: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatsG: string;
};

export default function MealNeedsReviewPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [items, setItems] = useState<api.MealReviewItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, EditDraft>>({});
  const [error, setError] = useState('');

  const from = format(subDays(new Date(), 21), 'yyyy-MM-dd');
  const to = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api.getMealReviewQueue(from, to);
        if (cancelled) return;
        const sorted = Array.isArray(data)
          ? data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          : [];
        setItems(sorted);
        const nextDrafts: Record<number, EditDraft> = {};
        for (const item of sorted) {
          nextDrafts[item.id] = {
            captureText: String(item.payload?.captureText || item.mealLabel || ''),
            calories: String(item.payload?.calories ?? ''),
            proteinG: String(item.payload?.proteinG ?? ''),
            carbsG: String(item.payload?.carbsG ?? ''),
            fatsG: String(item.payload?.fatsG ?? ''),
          };
        }
        setDrafts(nextDrafts);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load review queue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const pendingCount = useMemo(() => items.length, [items]);

  const updateDraft = (id: number, patch: Partial<EditDraft>) => {
    setDrafts(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));
  };

  const handleResolve = async (id: number) => {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    setError('');
    try {
      await api.resolveMealReview(id, {
        captureText: draft.captureText.trim(),
        calories: Number(draft.calories || 0),
        proteinG: Number(draft.proteinG || 0),
        carbsG: Number(draft.carbsG || 0),
        fatsG: Number(draft.fatsG || 0),
        estimateStatus: 'manual',
        confidence: 'high',
      });
      setItems(prev => prev.filter(item => item.id !== id));
      setDrafts(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e: any) {
      setError(e?.message || 'Could not resolve item');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between gap-3 px-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/body/diet/meals')}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Meal Needs Review</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{pendingCount} unresolved captured meals</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-3 p-2.5 rounded-xl text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.35)' }}>
          {error}
        </div>
      )}

      <div className="px-4 space-y-2">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-36 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }} />
          ))
        ) : items.length === 0 ? (
          <div className="p-5 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '2px dashed var(--border)' }}>
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>All meal entries are resolved</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>New low-confidence captures will appear here.</p>
          </div>
        ) : (
          items.map(item => {
            const draft = drafts[item.id] || { captureText: '', calories: '', proteinG: '', carbsG: '', fatsG: '' };
            return (
              <div
                key={item.id}
                className="p-3 rounded-2xl border"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{item.mealLabel}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {item.date} • {item.estimateStatus} • confidence {item.confidence}
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-lg" style={{ color: '#f59e0b', backgroundColor: '#f59e0b22' }}>
                    Review
                  </span>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={draft.captureText}
                    onChange={e => updateDraft(item.id, { captureText: e.target.value })}
                    className="w-full p-2 rounded-xl outline-none text-xs resize-none"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={draft.calories}
                      onChange={e => updateDraft(item.id, { calories: e.target.value })}
                      placeholder="Calories"
                      className="w-full p-2 rounded-xl outline-none text-xs num"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={draft.proteinG}
                      onChange={e => updateDraft(item.id, { proteinG: e.target.value })}
                      placeholder="Protein g"
                      className="w-full p-2 rounded-xl outline-none text-xs num"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={draft.carbsG}
                      onChange={e => updateDraft(item.id, { carbsG: e.target.value })}
                      placeholder="Carbs g"
                      className="w-full p-2 rounded-xl outline-none text-xs num"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={draft.fatsG}
                      onChange={e => updateDraft(item.id, { fatsG: e.target.value })}
                      placeholder="Fats g"
                      className="w-full p-2 rounded-xl outline-none text-xs num"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleResolve(item.id)}
                    disabled={savingId === item.id}
                    className="w-full h-9 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--accent)', opacity: savingId === item.id ? 0.7 : 1 }}
                  >
                    {savingId === item.id ? 'Saving...' : (<><Check size={14} />Mark Resolved</>)}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
