import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Apple, DollarSign, Droplets, Clock, Trash2, Plus, Check, TrendingUp, Filter, Search, Calendar, CheckCircle } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Exercise { id: number; name: string; category?: string; }
interface MealTemplate { id: number; name: string; ingredientsJson: string; timing: string; recipe?: string; }
interface QuickLogEntry { id: number; date: string; type: 'workout' | 'meal' | 'expense' | 'water' | 'task'; payload: Record<string, any>; createdAt: string; }

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Track() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [activeTab, setActiveTab] = useState<'workout' | 'meal' | 'expense' | 'water' | 'task' | 'history'>('workout');
  const [loading, setLoading] = useState(false);
  const [todayLogs, setTodayLogs] = useState<QuickLogEntry[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [meals, setMeals] = useState<MealTemplate[]>([]);
  const [dateRange, setDateRange] = useState({ from: format(subDays(new Date(), 7), 'yyyy-MM-dd'), to: today });
  const [historyFilter, setHistoryFilter] = useState<'all' | 'workout' | 'meal' | 'expense' | 'water' | 'task'>('all');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5s to catch cross-tab updates
    return () => clearInterval(interval);
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [exData, mData, tLogs] = await Promise.all([
        api.getExercises(),
        api.getMealTemplates(),
        (api as any).getTodayQuickLogs?.() || Promise.resolve([]),
      ]);
      setExercises(Array.isArray(exData) ? exData : []);
      setMeals(Array.isArray(mData) ? mData : []);
      setTodayLogs(Array.isArray(tLogs) ? tLogs : []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => loadData();

  return (
    <div className="min-h-screen pb-20">
      <div className="mb-6 sticky top-0 z-10 bg-white" style={{ backgroundColor: 'var(--bg)' }}>
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Quick Log
        </h1>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'workout', label: 'Workout', icon: Dumbbell },
            { id: 'meal', label: 'Meal', icon: Apple },
            { id: 'expense', label: 'Expense', icon: DollarSign },
            { id: 'water', label: 'Water', icon: Droplets },
            { id: 'task', label: 'Task', icon: CheckCircle },
            { id: 'history', label: 'History', icon: Clock },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {activeTab === 'workout' && <WorkoutTab exercises={exercises} today={today} onLog={handleRefresh} logs={todayLogs} />}
        {activeTab === 'meal' && <MealTab meals={meals} today={today} onLog={handleRefresh} logs={todayLogs} />}
        {activeTab === 'expense' && <ExpenseTab today={today} onLog={handleRefresh} logs={todayLogs} userId={user?.id} />}
        {activeTab === 'water' && <WaterTab today={today} onLog={handleRefresh} logs={todayLogs} />}
        {activeTab === 'task' && <TaskTab today={today} onLog={handleRefresh} logs={todayLogs} />}
        {activeTab === 'history' && <HistoryTab dateRange={dateRange} setDateRange={setDateRange} filter={historyFilter} setFilter={setHistoryFilter} />}
      </div>
    </div>
  );
}

// ─── Workout Tab ──────────────────────────────────────────────────────────────

function WorkoutTab({ exercises, today, onLog, logs }: { exercises: Exercise[], today: string, onLog: () => void, logs: QuickLogEntry[] }) {
  const [form, setForm] = useState({ exerciseId: exercises[0]?.id || 0, reps: '', weightKg: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const workoutLogs = useMemo(() => logs.filter(l => l.type === 'workout' && l.date === today), [logs, today]);

  const handleLog = async () => {
    if (!form.exerciseId || (!form.reps && !form.weightKg)) return;
    setSaving(true);
    try {
      await (api as any).logQuickEntry('workout', {
        exerciseId: form.exerciseId,
        reps: form.reps ? parseInt(form.reps) : undefined,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
        notes: form.notes,
      }, today);
      setForm({ exerciseId: form.exerciseId, reps: '', weightKg: '', notes: '' });
      onLog();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await (api as any).deleteQuickLogEntry(id);
    onLog();
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: 'var(--surface)' }}>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Exercise</label>
          <select
            value={form.exerciseId}
            onChange={(e) => setForm({ ...form, exerciseId: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }}
          >
            {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="number" placeholder="Reps" value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} className="px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }} />
          <input type="number" placeholder="Weight (kg)" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} step="0.5" className="px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }} />
        </div>
        <input type="text" placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }} />
        <button onClick={handleLog} disabled={saving || !form.exerciseId} className="w-full py-3 rounded-xl font-semibold text-white transition-all" style={{ backgroundColor: 'var(--accent)', opacity: saving || !form.exerciseId ? 0.5 : 1 }}>
          {saving ? 'Logging...' : '+ Log Set'}
        </button>
      </motion.div>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Dumbbell size={16} /> Today's Workout ({workoutLogs.length})
        </h3>
        <div className="space-y-2">
          {workoutLogs.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No workouts logged yet</p>
          ) : (
            workoutLogs.map(log => (
              <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
                <Check size={18} style={{ color: 'var(--accent)' }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {exercises.find(e => e.id === log.payload.exerciseId)?.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {log.payload.reps ? `${log.payload.reps} reps` : ''} {log.payload.weightKg ? `@ ${log.payload.weightKg}kg` : ''}
                  </p>
                </div>
                <button onClick={() => handleDelete(log.id)} className="text-red-500 hover:text-red-700 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Meal Tab ─────────────────────────────────────────────────────────────────

function MealTab({ meals, today, onLog, logs }: { meals: MealTemplate[], today: string, onLog: () => void, logs: QuickLogEntry[] }) {
  const [saving, setSaving] = useState(false);

  const mealLogs = useMemo(() => logs.filter(l => l.type === 'meal' && l.date === today), [logs, today]);

  const handleLogMeal = async (mealId: number) => {
    setSaving(true);
    try {
      await (api as any).logQuickEntry('meal', { mealIds: [mealId] }, today);
      onLog();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await (api as any).deleteQuickLogEntry(id);
    onLog();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Apple size={16} /> Available Meals
      </h3>
      <div className="space-y-2">
        {meals.map(meal => {
          const logged = mealLogs.some(log => log.payload.mealIds?.includes(meal.id));
          return (
            <motion.button
              key={meal.id}
              onClick={() => handleLogMeal(meal.id)}
              whileHover={{ scale: 1.02 }}
              className="w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all"
              style={{
                backgroundColor: logged ? 'var(--accent)11' : 'var(--surface)',
                border: `1px solid ${logged ? 'var(--accent)55' : 'var(--border)'}`,
              }}
            >
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: logged ? 'var(--accent)' : 'var(--surface-elevated)' }}>
                {logged && <Check size={14} color="#fff" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{meal.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{meal.timing}{meal.recipe ? ` · ${meal.recipe}` : ''}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleLogMeal(meal.id); }} className="px-3 py-1 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>
                {logged ? '✓' : '+ Log'}
              </button>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Today's Meals ({mealLogs.length})</h3>
        <div className="space-y-2">
          {mealLogs.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No meals logged yet</p>
          ) : (
            mealLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
                <Check size={18} style={{ color: 'var(--accent)' }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {meals.find(m => log.payload.mealIds?.includes(m.id))?.name}
                  </p>
                </div>
                <button onClick={() => handleDelete(log.id)} className="text-red-500 hover:text-red-700 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Expense Tab ──────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Other'];

const SMART_EXPENSE_NOTES: Record<string, string[]> = {
  Food: ['Swiggy', 'Zomato', 'Blinkit', 'Restaurant', 'Cafe'],
  Transport: ['Uber', 'Ola', 'Metro', 'Auto', 'Fuel'],
  Utilities: ['Electricity Bill', 'Internet Bill', 'Water Bill', 'Mobile Recharge'],
  Entertainment: ['Netflix', 'Movie', 'Spotify', 'Gaming'],
  Health: ['Pharmacy', 'Doctor', 'Gym', 'Lab Test'],
  Shopping: ['Amazon', 'Flipkart', 'Myntra', 'Local Store'],
  Other: ['Miscellaneous'],
};

function ExpenseTab({ today, onLog, logs, userId }: { today: string, onLog: () => void, logs: QuickLogEntry[], userId?: number }) {
  const [form, setForm] = useState({ amount: '', category: 'Food', note: '' });
  const [saving, setSaving] = useState(false);

  const expenseLogs = useMemo(() => logs.filter(l => l.type === 'expense' && l.date === today), [logs, today]);
  const totalToday = useMemo(() => expenseLogs.reduce((sum, log) => sum + (log.payload.amount || 0), 0), [expenseLogs]);

  const handleLog = async () => {
    if (!form.amount) return;
    setSaving(true);
    try {
      const amount = parseFloat(form.amount);
      const suggested = SMART_EXPENSE_NOTES[form.category]?.[0] ?? '';
      const finalNote = form.note.trim() || suggested;

      await (api as any).logQuickEntry('expense', {
        amount,
        category: form.category,
        note: finalNote,
      }, today);

      // Mirror quick expense into the main transactions table so Finance > Transactions updates correctly.
      if (userId) {
        await (api as any).createExpense(userId, finalNote, amount, form.category, new Date(today));
      }

      setForm({ amount: '', category: 'Food', note: '' });
      onLog();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await (api as any).deleteQuickLogEntry(id);
    onLog();
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--accent)11' }}>
          <DollarSign size={24} style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Today's Expenses</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>₹{totalToday.toFixed(2)}</p>
          </div>
        </div>

        <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} step="0.01" className="w-full px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }} />
        
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <div className="flex flex-wrap gap-2">
          {(SMART_EXPENSE_NOTES[form.category] ?? []).slice(0, 4).map((note) => (
            <button
              key={note}
              type="button"
              onClick={() => setForm(prev => ({ ...prev, note }))}
              className="px-2.5 py-1 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
            >
              {note}
            </button>
          ))}
        </div>

        <input type="text" placeholder="Optional note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }} />

        <button onClick={handleLog} disabled={saving || !form.amount} className="w-full py-3 rounded-xl font-semibold text-white transition-all" style={{ backgroundColor: 'var(--accent)', opacity: saving || !form.amount ? 0.5 : 1 }}>
          {saving ? 'Logging...' : '+ Log Expense'}
        </button>
      </motion.div>

      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Today's Expenses ({expenseLogs.length})</h3>
        <div className="space-y-2">
          {expenseLogs.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No expenses logged yet</p>
          ) : (
            expenseLogs.map(log => (
              <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl justify-between" style={{ backgroundColor: 'var(--surface)' }}>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>₹{log.payload.amount}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{log.payload.category}{log.payload.note ? ` · ${log.payload.note}` : ''}</p>
                </div>
                <button onClick={() => handleDelete(log.id)} className="text-red-500 hover:text-red-700 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Water Tab ────────────────────────────────────────────────────────────────

const WATER_PRESETS = [
  { label: 'Sip', ml: 100, emoji: '💧' },
  { label: 'Glass', ml: 250, emoji: '🥛' },
  { label: 'Bottle', ml: 500, emoji: '🍶' },
  { label: '1 Litre', ml: 1000, emoji: '🫙' },
];

function WaterTab({ today, onLog, logs }: { today: string, onLog: () => void, logs: QuickLogEntry[] }) {
  const [saving, setSaving] = useState(false);
  const [customMl, setCustomMl] = useState(250);
  const [ripples, setRipples] = useState<{ id: number; ml: number }[]>([]);
  const [lastAdded, setLastAdded] = useState<number | null>(null);

  const waterLogs = useMemo(() => logs.filter(l => l.type === 'water' && l.date === today), [logs, today]);
  const totalMl = useMemo(() => waterLogs.reduce((sum, log) => sum + (log.payload.ml || 0), 0), [waterLogs]);
  const goalMl = 3000;

  // Clamp ring to 100%, but let the fill text show overflow
  const ringPct = Math.min(100, (totalMl / goalMl) * 100);
  const isOverGoal = totalMl > goalMl;
  const overflowMl = isOverGoal ? totalMl - goalMl : 0;

  // SVG ring dimensions
  const R = 72;
  const CIRC = 2 * Math.PI * R;
  const strokeDash = CIRC;
  const strokeOffset = CIRC * (1 - ringPct / 100);

  const handleAddWater = async (ml: number) => {
    if (saving) return;
    setSaving(true);
    const rid = Date.now();
    setRipples(prev => [...prev, { id: rid, ml }]);
    setLastAdded(ml);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== rid)), 900);
    setTimeout(() => setLastAdded(null), 1800);
    try {
      await (api as any).logQuickEntry('water', { ml }, today);
      onLog();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await (api as any).deleteQuickLogEntry(id);
    onLog();
  };

  const displayTotal = totalMl >= 1000 ? `${(totalMl / 1000).toFixed(2).replace(/\.?0+$/, '')}L` : `${totalMl}ml`;
  const displayGoal = goalMl >= 1000 ? `${goalMl / 1000}L` : `${goalMl}ml`;

  return (
    <div className="space-y-5">
      {/* ── Ring card ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl p-6" style={{ backgroundColor: 'var(--surface)' }}>

        {/* Big ring + stats row */}
        <div className="flex items-center gap-6">
          {/* Ring */}
          <div className="relative flex-shrink-0" style={{ width: 168, height: 168 }}>
            <svg width="168" height="168" style={{ transform: 'rotate(-90deg)' }}>
              {/* Track */}
              <circle cx="84" cy="84" r={R} stroke="var(--surface-elevated)" strokeWidth="12" fill="none" />
              {/* Progress */}
              <motion.circle
                cx="84" cy="84" r={R}
                stroke={isOverGoal ? '#f59e0b' : 'var(--accent)'}
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={strokeDash}
                animate={{ strokeDashoffset: strokeOffset }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
              {/* Overflow second ring (amber) */}
              {isOverGoal && (
                <motion.circle
                  cx="84" cy="84" r={R}
                  stroke="#f59e0b"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  animate={{ strokeDashoffset: CIRC * (1 - Math.min(1, overflowMl / goalMl)) }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  style={{ opacity: 0.45 }}
                />
              )}
            </svg>
            {/* Ripple animations */}
            <AnimatePresence>
              {ripples.map(r => (
                <motion.div
                  key={r.id}
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ border: '2px solid var(--accent)' }}
                  initial={{ scale: 0.85, opacity: 0.7 }}
                  animate={{ scale: 1.25, opacity: 0 }}
                  exit={{}}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              ))}
            </AnimatePresence>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center">
              <Droplets size={20} style={{ color: isOverGoal ? '#f59e0b' : 'var(--accent)' }} />
              <motion.span
                key={totalMl}
                className="text-2xl font-black leading-none"
                style={{ color: 'var(--text-primary)' }}
                initial={{ scale: 1.3, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {displayTotal}
              </motion.span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>of {displayGoal}</span>
              {isOverGoal && (
                <span className="text-xs font-bold" style={{ color: '#f59e0b' }}>+{overflowMl}ml extra 🔥</span>
              )}
            </div>
          </div>

          {/* Stats column */}
          <div className="flex-1 space-y-3">
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Progress</span>
                <span style={{ color: isOverGoal ? '#f59e0b' : 'var(--accent)', fontWeight: 700 }}>{Math.round((totalMl / goalMl) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: isOverGoal ? 'linear-gradient(90deg,var(--accent),#f59e0b)' : 'var(--accent)' }}
                  animate={{ width: `${Math.min(100, (totalMl / goalMl) * 100)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Remaining */}
            <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              {isOverGoal ? (
                <>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Goal smashed!</p>
                  <p className="text-lg font-bold" style={{ color: '#f59e0b' }}>+{overflowMl}ml</p>
                </>
              ) : (
                <>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Remaining</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{goalMl - totalMl}ml</p>
                </>
              )}
            </div>

            {/* Log count */}
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>{waterLogs.length} {waterLogs.length === 1 ? 'entry' : 'entries'} today</p>
          </div>
        </div>

        {/* ── Quick-add bubbles ── */}
        <div className="mt-5 grid grid-cols-4 gap-2">
          {WATER_PRESETS.map(p => (
            <motion.button
              key={p.ml}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => handleAddWater(p.ml)}
              disabled={saving}
              className="flex flex-col items-center gap-1 py-3 rounded-2xl font-semibold text-xs transition-all"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent)', opacity: saving ? 0.6 : 1 }}
            >
              <span className="text-xl">{p.emoji}</span>
              <span>{p.label}</span>
              <span style={{ color: 'var(--text-muted)' }}>{p.ml}ml</span>
            </motion.button>
          ))}
        </div>

        {/* ── Manual ml input ── */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Custom amount</span>
            <span className="text-sm font-black tabular-nums" style={{ color: 'var(--accent)' }}>{customMl} ml</span>
          </div>
          {/* Slider */}
          <input
            type="range"
            min={50}
            max={2000}
            step={50}
            value={customMl}
            onChange={e => setCustomMl(Number(e.target.value))}
            className="w-full accent-[var(--accent)] cursor-pointer"
            style={{ accentColor: 'var(--accent)' }}
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={customMl}
              onChange={e => setCustomMl(Math.max(1, Number(e.target.value)))}
              className="flex-1 px-3 py-2 rounded-xl border text-sm font-semibold"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
              placeholder="Enter ml"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleAddWater(customMl)}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-white text-sm"
              style={{ backgroundColor: 'var(--accent)', opacity: saving ? 0.6 : 1 }}
            >
              <Plus size={16} /> Add
            </motion.button>
          </div>
        </div>

        {/* ── Flash toast ── */}
        <AnimatePresence>
          {lastAdded !== null && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-3 text-center text-sm font-bold"
              style={{ color: 'var(--accent)' }}
            >
              +{lastAdded}ml logged 💧
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Log list ── */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Today's Entries ({waterLogs.length})</h3>
        <div className="space-y-2">
          {waterLogs.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No water logged yet — start hydrating! 💧</p>
          ) : (
            [...waterLogs].reverse().map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ backgroundColor: 'var(--surface)' }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <Droplets size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{log.payload.ml >= 1000 ? `${log.payload.ml / 1000}L` : `${log.payload.ml}ml`}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(parseISO(log.createdAt), 'h:mm a')}</p>
                </div>
                <button onClick={() => handleDelete(log.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={15} />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Task Tab ─────────────────────────────────────────────────────────────────

const TASK_CATEGORIES = ['work', 'personal', 'health', 'learning', 'other'];
const TASK_PRIORITIES = ['low', 'medium', 'high'];

function TaskTab({ today, onLog, logs }: { today: string, onLog: () => void, logs: QuickLogEntry[] }) {
  const [form, setForm] = useState({ title: '', category: 'personal', priority: 'medium', description: '' });
  const [saving, setSaving] = useState(false);

  const taskLogs = useMemo(() => logs.filter(l => l.type === 'task' && l.date === today), [logs, today]);

  const handleLog = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await (api as any).logQuickEntry('task', {
        title: form.title,
        category: form.category,
        priority: form.priority,
        description: form.description,
      }, today);
      setForm({ title: '', category: 'personal', priority: 'medium', description: '' });
      onLog();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await (api as any).deleteQuickLogEntry(id);
    onLog();
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return '#ef4444';
    if (priority === 'medium') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: 'var(--surface)' }}>
        <input
          type="text"
          placeholder="Task title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-3 py-2 rounded-xl border"
          style={{ borderColor: 'var(--border)' }}
        />
        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-3 py-2 rounded-xl border h-20"
          style={{ borderColor: 'var(--border)' }}
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="px-3 py-2 rounded-xl border"
            style={{ borderColor: 'var(--border)' }}
          >
            {TASK_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
          </select>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="px-3 py-2 rounded-xl border"
            style={{ borderColor: 'var(--border)' }}
          >
            {TASK_PRIORITIES.map(pri => <option key={pri} value={pri}>{pri.charAt(0).toUpperCase() + pri.slice(1)}</option>)}
          </select>
        </div>
        <button
          onClick={handleLog}
          disabled={saving || !form.title.trim()}
          className="w-full py-3 rounded-xl font-semibold text-white transition-all"
          style={{ backgroundColor: 'var(--accent)', opacity: saving || !form.title.trim() ? 0.5 : 1 }}
        >
          {saving ? 'Creating...' : '+ Create Task'}
        </button>
      </motion.div>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <CheckCircle size={16} /> Today's Tasks ({taskLogs.length})
        </h3>
        <div className="space-y-2">
          {taskLogs.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks logged yet</p>
          ) : (
            taskLogs.map(log => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: getPriorityColor(log.payload.priority) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {log.payload.title}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {log.payload.category} · {log.payload.priority}
                  </p>
                </div>
                <button onClick={() => handleDelete(log.id)} className="text-red-500 hover:text-red-700 p-1 flex-shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ dateRange, setDateRange, filter, setFilter }: { dateRange: { from: string, to: string }, setDateRange: (r: any) => void, filter: string, setFilter: (f: any) => void }) {
  const [history, setHistory] = useState<QuickLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadHistory();
  }, [dateRange, filter]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const result = await (api as any).getQuickLogHistory(dateRange.from, dateRange.to, filter === 'all' ? undefined : filter);
      setHistory(Array.isArray(result) ? result : []);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return history.filter(log =>
      !search ||
      JSON.stringify(log.payload).toLowerCase().includes(search.toLowerCase())
    );
  }, [history, search]);

  const stats = useMemo(() => {
    return {
      workouts: history.filter(l => l.type === 'workout').length,
      meals: history.filter(l => l.type === 'meal').length,
      expenses: history.filter(l => l.type === 'expense').reduce((sum, l) => sum + (l.payload.amount || 0), 0),
      water: history.filter(l => l.type === 'water').reduce((sum, l) => sum + (l.payload.ml || 0), 0),
      tasks: history.filter(l => l.type === 'task').length,
    };
  }, [history]);

  const handleDelete = async (id: number) => {
    await (api as any).deleteQuickLogEntry(id);
    loadHistory();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Workouts</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.workouts}</p>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Meals</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.meals}</p>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Expenses</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{stats.expenses.toFixed(0)}</p>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Water</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.water}ml</p>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tasks</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.tasks}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} className="px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }} />
        <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} className="px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'workout', 'meal', 'expense', 'water', 'task'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${filter === f ? 'text-white' : 'bg-gray-100'}`}
            style={{ backgroundColor: filter === f ? 'var(--accent)' : undefined }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 relative">
        <Search size={18} style={{ color: 'var(--text-muted)', position: 'absolute', left: 12 }} />
        <input type="text" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }} />
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No logs found</p>
        ) : (
          filtered.map(log => (
            <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                {log.type === 'workout' ? '💪' : log.type === 'meal' ? '🍽️' : log.type === 'expense' ? '💰' : log.type === 'water' ? '💧' : '✓'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                  {log.type === 'task' ? log.payload.title : log.type}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {log.type === 'water' ? `${log.payload.ml}ml` : log.type === 'task' ? `${log.payload.priority} · ${log.payload.category}` : ''}
                  {log.type === 'task' ? ' · ' : ' '}
                  {format(parseISO(log.createdAt), 'MMM d, h:mm a')}
                </p>
              </div>
              <button onClick={() => handleDelete(log.id)} className="text-red-500 hover:text-red-700 p-1">
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
