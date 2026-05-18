import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Trash2, TrendingUp, Calendar, Target, Repeat, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import * as api from '../lib/api';
import type { Bucket, BucketContribution } from '../lib/api';

const formatMoney = (value: number) => `₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0)}`;

export default function BucketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [loading, setLoading] = useState(true);

  // Contribution form state
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (api as any).getBucketById(Number(id)).then((b: Bucket | null) => {
      setBucket(b);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-24">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!bucket) {
    return (
      <div className="pt-16 px-4 text-center">
        <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Bucket not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm" style={{ color: 'var(--accent)' }}>Go back</button>
      </div>
    );
  }

  const sipAmount = bucket.periodMonths > 0 ? Math.ceil(bucket.target / bucket.periodMonths) : 0;
  const pct = bucket.target > 0 ? Math.min(100, (bucket.current / bucket.target) * 100) : 0;
  const remaining = Math.max(0, bucket.target - bucket.current);
  const periodsLeft = sipAmount > 0 ? Math.ceil(remaining / sipAmount) : 0;
  const R = 68;
  const CIRC = 2 * Math.PI * R;

  const handleAddContribution = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    try {
      const result = await (api as any).addContribution(Number(id), amt, note.trim() || undefined);
      if (result?.bucket) setBucket({ ...result.bucket });
    } finally {
      setSaving(false);
      setAmount('');
      setNote('');
      setShowForm(false);
    }
  };

  const handleDeleteContribution = async (contrib: BucketContribution) => {
    const result = await (api as any).deleteContribution(Number(id), contrib.id);
    if (result?.bucket) setBucket({ ...result.bucket });
  };

  const freq = bucket.frequency === 'monthly' ? 'month' : bucket.frequency === 'weekly' ? 'week' : 'quarter';

  const sorted = [...(bucket.contributions || [])].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="pb-24 pt-4 px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl">{bucket.icon}</span>
          <h1 className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{bucket.name}</h1>
        </div>
      </div>

      {/* Ring + summary card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl p-5 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-5">
          {/* SVG Ring */}
          <div className="relative flex-shrink-0" style={{ width: 152, height: 152 }}>
            <svg width="152" height="152" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="76" cy="76" r={R} stroke="var(--surface-elevated)" strokeWidth="11" fill="none" />
              <motion.circle cx="76" cy="76" r={R}
                stroke={pct >= 100 ? '#10b981' : bucket.color}
                strokeWidth="11" fill="none" strokeLinecap="round"
                strokeDasharray={CIRC}
                animate={{ strokeDashoffset: CIRC * (1 - pct / 100) }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <span className="text-2xl font-black leading-none" style={{ color: 'var(--text-primary)' }}>{Math.round(pct)}%</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>of goal</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-2.5">
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Saved</p>
              <p className="text-xl font-black num" style={{ color: bucket.color }}>{formatMoney(bucket.current)}</p>
            </div>
            <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Goal</p>
                <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{formatMoney(bucket.target)}</p>
              </div>
              <div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Remaining</p>
                <p className="text-sm font-bold num" style={{ color: 'var(--accent-warm)' }}>{formatMoney(remaining)}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* SIP details card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-3xl p-5 mb-4 space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>SIP Plan</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-3 flex items-start gap-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <Repeat size={15} style={{ color: bucket.color, marginTop: 2 }} />
            <div>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Frequency</p>
              <p className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{bucket.frequency}</p>
            </div>
          </div>
          <div className="rounded-2xl p-3 flex items-start gap-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <Calendar size={15} style={{ color: bucket.color, marginTop: 2 }} />
            <div>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Period</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{bucket.periodMonths} months</p>
            </div>
          </div>
          <div className="rounded-2xl p-3 flex items-start gap-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <Target size={15} style={{ color: bucket.color, marginTop: 2 }} />
            <div>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Per {freq}</p>
              <p className="text-sm font-bold num" style={{ color: bucket.color }}>{formatMoney(sipAmount)}</p>
            </div>
          </div>
          <div className="rounded-2xl p-3 flex items-start gap-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <TrendingUp size={15} style={{ color: bucket.color, marginTop: 2 }} />
            <div>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{periodsLeft > 0 ? `~${periodsLeft} left` : 'Goal reached!'}</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{periodsLeft > 0 ? `${periodsLeft} ${freq}s` : '🎉 Done'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl p-3 flex items-center gap-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
          <MapPin size={15} style={{ color: bucket.color }} />
          <div>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Invested / Stored in</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{bucket.investedIn || '—'}</p>
          </div>
        </div>
      </motion.div>

      {/* Log contribution */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="mb-4">
        <AnimatePresence>
          {showForm ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-3xl p-5 space-y-3 overflow-hidden"
              style={{ backgroundColor: 'var(--surface)', border: `1px solid ${bucket.color}55` }}
            >
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Log Contribution</p>
              <div className="flex items-end gap-2 p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <span className="text-xl font-bold mb-1" style={{ color: 'var(--text-muted)' }}>₹</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="flex-1 bg-transparent text-3xl font-black num outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
              {/* Quick presets (% of SIP) */}
              <div className="flex gap-2">
                {[0.5, 0.75, 1, 1.25].map(mult => {
                  const val = Math.round(sipAmount * mult);
                  return (
                    <button key={mult} onClick={() => setAmount(String(val))}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold press"
                      style={{ backgroundColor: Number(amount) === val ? bucket.color : 'var(--surface-elevated)', color: Number(amount) === val ? '#fff' : 'var(--text-secondary)' }}>
                      {formatMoney(val)}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="w-full h-10 px-3 rounded-xl outline-none text-sm"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
              />
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="flex-1 h-10 rounded-xl text-sm press" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
                <button onClick={handleAddContribution} disabled={saving || !amount} className="flex-1 h-10 rounded-xl text-sm font-bold text-white press" style={{ backgroundColor: bucket.color, opacity: !amount || saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(true)}
              className="w-full h-12 rounded-2xl text-sm font-semibold press flex items-center justify-center gap-2"
              style={{ backgroundColor: bucket.color + '18', color: bucket.color, border: `1px dashed ${bucket.color}66` }}
            >
              <Plus size={16} /> Log Contribution
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Contribution history */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Contribution History</p>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{bucket.contributions?.length || 0} entries</span>
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No contributions yet</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((c, i) => {
              const diff = c.amount - sipAmount;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-3.5 rounded-2xl"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  {/* Color dot */}
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: bucket.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{formatMoney(c.amount)}</p>
                      {diff !== 0 && sipAmount > 0 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: diff >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: diff >= 0 ? '#10b981' : '#f59e0b' }}>
                          {diff > 0 ? '+' : ''}{formatMoney(Math.abs(diff)).replace('₹', '')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {format(parseISO(c.date), 'd MMM yyyy')}
                      {c.note ? ` · ${c.note}` : ''}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteContribution(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
