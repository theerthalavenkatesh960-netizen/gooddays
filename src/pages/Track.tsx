import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Apple, DollarSign, Droplets, Clock, Trash2, Plus, Check, TrendingUp, Filter, Search, Calendar } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Exercise { id: number; name: string; category?: string; }
interface MealTemplate { id: number; name: string; ingredientsJson: string; timing: string; recipe?: string; }
interface QuickLogEntry { id: number; date: string; type: 'workout' | 'meal' | 'expense' | 'water'; payload: Record<string, any>; createdAt: string; }

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Track() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [activeTab, setActiveTab] = useState<'workout' | 'meal' | 'expense' | 'water' | 'history'>('workout');
  const [loading, setLoading] = useState(false);
  const [todayLogs, setTodayLogs] = useState<QuickLogEntry[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [meals, setMeals] = useState<MealTemplate[]>([]);
  const [dateRange, setDateRange] = useState({ from: format(subDays(new Date(), 7), 'yyyy-MM-dd'), to: today });
  const [historyFilter, setHistoryFilter] = useState<'all' | 'workout' | 'meal' | 'expense' | 'water'>('all');

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
        {activeTab === 'workout' && <WorkoutTab exercises={exercises} today={today} onLog={loadData} logs={todayLogs} />}
        {activeTab === 'meal' && <MealTab meals={meals} today={today} onLog={loadData} logs={todayLogs} />}
        {activeTab === 'expense' && <ExpenseTab today={today} onLog={loadData} logs={todayLogs} />}
        {activeTab === 'water' && <WaterTab today={today} onLog={loadData} logs={todayLogs} />}
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
                <button onClick={() => (api as any).deleteQuickLogEntry(log.id).then(() => {})} className="text-red-500 hover:text-red-700 p-1">
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
                <button onClick={() => (api as any).deleteQuickLogEntry(log.id).then(() => {})} className="text-red-500 hover:text-red-700 p-1">
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

function ExpenseTab({ today, onLog, logs }: { today: string, onLog: () => void, logs: QuickLogEntry[] }) {
  const [form, setForm] = useState({ amount: '', category: 'Food', note: '' });
  const [saving, setSaving] = useState(false);

  const expenseLogs = useMemo(() => logs.filter(l => l.type === 'expense' && l.date === today), [logs, today]);
  const totalToday = useMemo(() => expenseLogs.reduce((sum, log) => sum + (log.payload.amount || 0), 0), [expenseLogs]);

  const handleLog = async () => {
    if (!form.amount) return;
    setSaving(true);
    try {
      await (api as any).logQuickEntry('expense', {
        amount: parseFloat(form.amount),
        category: form.category,
        note: form.note,
      }, today);
      setForm({ amount: '', category: 'Food', note: '' });
      onLog();
    } finally {
      setSaving(false);
    }
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
                <button onClick={() => (api as any).deleteQuickLogEntry(log.id).then(() => {})} className="text-red-500 hover:text-red-700 p-1">
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

function WaterTab({ today, onLog, logs }: { today: string, onLog: () => void, logs: QuickLogEntry[] }) {
  const [saving, setSaving] = useState(false);

  const waterLogs = useMemo(() => logs.filter(l => l.type === 'water' && l.date === today), [logs, today]);
  const totalCups = useMemo(() => waterLogs.reduce((sum, log) => sum + (log.payload.cups || 0), 0), [waterLogs]);
  const goalCups = 8;
  const percentage = Math.min(100, (totalCups / goalCups) * 100);

  const handleAddCup = async () => {
    setSaving(true);
    try {
      await (api as any).logQuickEntry('water', { cups: 1 }, today);
      onLog();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 space-y-6" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg width="100" height="100" className="-rotate-90">
              <circle cx="50" cy="50" r="40" stroke="var(--surface-elevated)" strokeWidth="6" fill="none" />
              <circle cx="50" cy="50" r="40" stroke="var(--accent)" strokeWidth="6" fill="none" strokeDasharray={`${2 * Math.PI * 40}`} strokeD dashoffset={`${2 * Math.PI * 40 * (1 - percentage / 100)}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{totalCups}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/ {goalCups}</span>
            </div>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Water Intake</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>{Math.round(percentage)}%</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{(goalCups - totalCups).toFixed(1)} cups to goal</p>
          </div>
        </div>

        <div className="flex gap-2">
          {Array.from({ length: goalCups }).map((_, i) => (
            <div key={i} className="flex-1 h-16 rounded-xl flex items-center justify-center font-bold text-sm" style={{ backgroundColor: i < totalCups ? 'var(--accent)' : 'var(--surface-elevated)', color: i < totalCups ? 'white' : 'var(--text-muted)' }}>
              💧
            </div>
          ))}
        </div>

        <button onClick={handleAddCup} disabled={saving} className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--accent)', opacity: saving ? 0.5 : 1 }}>
          <Droplets size={18} /> {saving ? 'Adding...' : '+ Add 1 Cup'}
        </button>
      </motion.div>
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
      water: history.filter(l => l.type === 'water').reduce((sum, l) => sum + (l.payload.cups || 0), 0),
    };
  }, [history]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Workouts</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.workouts}</p>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Meals</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.meals}</p>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Expenses</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{stats.expenses.toFixed(0)}</p>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Water</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.water} cups</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} className="px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }} />
        <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} className="px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'workout', 'meal', 'expense', 'water'].map(f => (
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
                {log.type === 'workout' ? '💪' : log.type === 'meal' ? '🍽️' : log.type === 'expense' ? '💰' : '💧'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{log.type}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{format(parseISO(log.createdAt), 'MMM d, h:mm a')}</p>
              </div>
              <button onClick={() => (api as any).deleteQuickLogEntry(log.id).then(() => loadHistory())} className="text-red-500 hover:text-red-700 p-1">
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
