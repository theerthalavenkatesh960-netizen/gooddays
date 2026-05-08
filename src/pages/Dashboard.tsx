import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Settings, CheckCircle2, Moon, Dumbbell, Droplets, Target, Flame, ChevronRight, Zap, TrendingUp, Plus, RotateCcw, Trash2, Filter, CreditCard as Edit, Home, Briefcase, BookOpen, User, Heart, DollarSign, ShoppingCart, Users, Film, HeartPulse, Plane, Music, Clock, ChevronDown, GripVertical, LayoutDashboard, CheckSquare, Repeat } from 'lucide-react';
import { format, isToday, parseISO, subDays, addDays, startOfWeek, isSameDay, isPast } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  isCompleted?: boolean;
  status?: string;
  dueDate?: string;
  due_date?: string;
  category?: string;
  priority?: string;
  recurring?: boolean;
  recurrenceId?: string;
  recurrenceInterval?: number;
  recurrenceUnit?: string;
  recurrenceDays?: string[];
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
  updatedAt?: string;
}

interface RoutineBlock {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  done: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { name: 'Home', icon: Home },
  { name: 'Work', icon: Briefcase },
  { name: 'Study', icon: BookOpen },
  { name: 'Personal', icon: User },
  { name: 'Wellness', icon: Heart },
  { name: 'Fitness', icon: Dumbbell },
  { name: 'Travel', icon: Plane },
  { name: 'Finance', icon: DollarSign },
  { name: 'Shopping', icon: ShoppingCart },
  { name: 'Social', icon: Users },
  { name: 'Entertainment', icon: Film },
  { name: 'Health', icon: HeartPulse },
  { name: 'Music', icon: Music },
];

const PRIORITIES = ['low', 'medium', 'high'];

const DEFAULT_ROUTINE: RoutineBlock[] = [
  { id: '1', startTime: '06:00', endTime: '07:00', label: 'Morning routine', done: false },
  { id: '2', startTime: '07:00', endTime: '08:00', label: 'Exercise', done: false },
  { id: '3', startTime: '08:00', endTime: '09:00', label: 'Breakfast & prep', done: false },
  { id: '4', startTime: '09:00', endTime: '12:00', label: 'Deep work', done: false },
  { id: '5', startTime: '12:00', endTime: '13:00', label: 'Lunch break', done: false },
  { id: '6', startTime: '13:00', endTime: '17:00', label: 'Work / Study', done: false },
  { id: '7', startTime: '17:00', endTime: '18:00', label: 'Wind down', done: false },
  { id: '8', startTime: '18:00', endTime: '19:00', label: 'Dinner', done: false },
  { id: '9', startTime: '20:00', endTime: '22:00', label: 'Evening leisure', done: false },
  { id: '10', startTime: '22:00', endTime: '23:00', label: 'Sleep prep', done: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting(name?: string) {
  const h = new Date().getHours();
  const base = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${base}${name ? `, ${name.split(' ')[0]}` : ''}`;
}

function getPriorityColor(priority: string) {
  if (priority === 'high') return 'bg-red-100 text-red-700 border-red-200';
  if (priority === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function currentMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatChip({ icon: Icon, label, value, color, empty }: {
  icon: React.ElementType; label: string; value: string; color: string; empty?: boolean;
}) {
  return (
    <div className="stat-chip flex-1" style={{ borderColor: empty ? 'dashed' : 'var(--border)', borderStyle: empty ? 'dashed' : 'solid' }}>
      <Icon size={16} style={{ color }} />
      <div className="min-w-0">
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-semibold num" style={{ color: empty ? 'var(--text-muted)' : 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ user, navigate }: { user: any; navigate: (p: string) => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sleep, setSleep] = useState('');
  const [water, setWater] = useState(0);
  const [waterGoal] = useState(8);
  const [workoutStreak, setWorkoutStreak] = useState(0);
  const [reminders, setReminders] = useState<any[]>([]);
  const [streaks, setStreaks] = useState({ tasks: Array(7).fill(false), workout: Array(7).fill(false) });
  const [calToday, setCalToday] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');
  const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const isEvening = new Date().getHours() >= 20;

  useEffect(() => {
    if (!user) return;
    Promise.all([loadTasks(), loadTracking(), loadReminders(), loadStreaks()]).finally(() => setLoading(false));
  }, [user]);

  const loadTasks = async () => {
    try {
      const data = await api.getTasks(user.id);
      const list = Array.isArray(data) ? data : [];
      const todayTasks = list.filter((t: Task) => {
        const due = t.dueDate ?? t.due_date;
        if (!due) return false;
        try { return isToday(parseISO(due)); } catch { return false; }
      });
      setTasks(todayTasks.slice(0, 5));
    } catch {}
  };

  const loadTracking = async () => {
    try {
      const rec: any = await api.getDailyTracking(user.id, today);
      if (rec) {
        setSleep((rec.sleepHours ?? rec.sleep_hours)?.toString() || '');
        setWater(rec.waterCups ?? 0);
        setCalToday(rec.calories ?? 0);
      }
    } catch {}
  };

  const loadReminders = async () => {
    try {
      const data = await api.getReminders();
      setReminders(Array.isArray(data) ? data.filter((r: any) => r.isEnabled).slice(0, 3) : []);
    } catch {}
  };

  const loadStreaks = async () => {
    try {
      const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));
      const [tasksData, workoutData] = await Promise.all([
        api.getTasks(user.id).catch(() => []),
        api.getWorkoutAnalytics().catch(() => ({ trainedDates: [] })),
      ]);
      const tList = Array.isArray(tasksData) ? tasksData : [];
      const trainedDates: string[] = workoutData?.trainedDates ?? [];
      const tStreak = last7.map(d =>
        tList.some((t: any) => {
          if (!t.isCompleted) return false;
          const dt = new Date(t.updatedAt);
          return !isNaN(dt.getTime()) && format(dt, 'yyyy-MM-dd') === d;
        })
      );
      setStreaks({ tasks: tStreak, workout: last7.map(d => trainedDates.includes(d)) });
      let streak = 0;
      for (let i = 6; i >= 0; i--) {
        if (trainedDates.includes(format(subDays(new Date(), i), 'yyyy-MM-dd'))) streak++;
        else break;
      }
      setWorkoutStreak(streak);
    } catch {}
  };

  const toggleTask = async (task: Task) => {
    const done = !(task.isCompleted ?? task.status === 'completed');
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: done } : t));
    try { await api.updateTask(task.id, { isCompleted: done }); } catch {}
  };

  return (
    <div>
      {/* Stat Chips */}
      <div className="flex gap-2 mb-5">
        <StatChip icon={Moon}     label="Sleep"   value={sleep ? `${sleep}h` : '--'}               color="var(--accent)"      empty={!sleep} />
        <StatChip icon={Flame}    label="Workout" value={workoutStreak > 0 ? `${workoutStreak}d` : '--'} color="var(--accent-warm)" empty={workoutStreak === 0} />
        <StatChip icon={Droplets} label="Water"   value={`${water}/${waterGoal}`}                  color="#06B6D4"            empty={water === 0} />
        <StatChip icon={Zap}      label="Cals"    value={calToday > 0 ? `${calToday}` : '--'}      color="var(--accent-gold)" empty={calToday === 0} />
      </div>

      {/* Today's Tasks */}
      <div className="mb-5">
        <div className="section-header px-0 mb-2">
          <span className="section-label">Today's Tasks</span>
          <button onClick={() => {}} className="flex items-center gap-0.5 text-xs press" style={{ color: 'var(--accent)' }}>
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="task-row">
                <div className="skeleton w-5 h-5 rounded-md" />
                <div className="skeleton h-3 flex-1 rounded" />
              </div>
            ))
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center">
              <Target size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks for today</p>
            </div>
          ) : (
            tasks.map(task => {
              const done = task.isCompleted ?? task.status === 'completed';
              return (
                <div key={task.id} className="task-row" onClick={() => toggleTask(task)}>
                  <div className={`checkbox-custom ${done ? 'checked' : ''}`}>
                    {done && <CheckCircle2 size={13} color="#fff" />}
                  </div>
                  <p className="flex-1 text-sm" style={{ color: done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none' }}>
                    {task.title}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Streaks */}
      <div className="mb-5">
        <div className="section-header px-0 mb-2">
          <span className="section-label">This Week</span>
        </div>
        <div className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          {[
            { label: 'Tasks', data: streaks.tasks, color: 'var(--accent)' },
            { label: 'Workout', data: streaks.workout, color: 'var(--accent-warm)' },
          ].map(({ label, data, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span className="text-xs num" style={{ color: 'var(--text-muted)' }}>{data.filter(Boolean).length}/7</span>
              </div>
              <div className="flex gap-1">
                {data.map((done, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full h-6 rounded-md flex items-center justify-center transition-all" style={{ backgroundColor: done ? color : 'var(--surface-elevated)' }}>
                      {done && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
                    </div>
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{DAYS[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="mb-5">
          <div className="section-header px-0 mb-2">
            <span className="section-label">Reminders</span>
          </div>
          <div className="space-y-2">
            {reminders.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="w-2 h-2 rounded-full animate-pulse-dot" style={{ backgroundColor: 'var(--accent)' }} />
                <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{r.title}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evening check-in */}
      {isEvening && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 rounded-2xl"
          style={{ backgroundColor: 'var(--surface)', border: `1px solid var(--accent)44` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full animate-pulse-dot" style={{ backgroundColor: 'var(--accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Evening Check-in</span>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>How was your day? Tap to complete it.</p>
          <button
            onClick={() => navigate('/life')}
            className="w-full h-10 rounded-xl text-sm font-semibold text-white press"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Complete Day
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab({ user }: { user: any }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_OPTIONS[0].name);
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [recurring, setRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days');
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [recurrenceStart, setRecurrenceStart] = useState('');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [filterView, setFilterView] = useState('today');
  const [filterCategory, setFilterCategory] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ taskId: number; isRecurring: boolean } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (recurring) {
      const today = format(new Date(), 'yyyy-MM-dd');
      setRecurrenceStart(today);
      const d = new Date(); d.setDate(d.getDate() + 30);
      setRecurrenceEnd(format(d, 'yyyy-MM-dd'));
    } else {
      setRecurrenceStart('');
      setRecurrenceEnd('');
    }
  }, [recurring]);

  useEffect(() => {
    if (user) loadTasks();
  }, [user]);

  const loadTasks = async () => {
    try {
      const data = await api.getTasks(user.id);
      setTasks(Array.isArray(data) ? data : []);
    } catch {}
  };

  const addTask = async () => {
    if (!user || !newTask.trim()) return;
    const body: any = {
      userId: user.id,
      title: newTask,
      category: selectedCategory,
      priority: selectedPriority,
      recurring,
      recurrenceInterval,
      recurrenceUnit,
      recurrenceStartDate: recurrenceStart ? new Date(recurrenceStart) : undefined,
      recurrenceEndDate: recurrenceEnd ? new Date(recurrenceEnd) : undefined,
      recurrenceDays: recurrenceUnit === 'weeks' ? recurrenceDays : recurrenceUnit === 'months' ? [monthlyDay.toString()] : undefined,
    };
    if (!recurring && scheduledDate) body.dueDate = new Date(scheduledDate);
    if (recurring) {
      if (!body.recurrenceStartDate) body.recurrenceStartDate = new Date();
      if (!body.recurrenceEndDate) {
        const d = new Date(); d.setDate(d.getDate() + 30);
        body.recurrenceEndDate = d;
      }
    }
    if (editingTask) await api.updateTask(editingTask.id, body);
    else await api.createTask(body);
    resetForm();
    loadTasks();
  };

  const resetForm = () => {
    setNewTask(''); setScheduledDate(''); setRecurring(false);
    setRecurrenceInterval(1); setRecurrenceUnit('days');
    setRecurrenceDays([]); setRecurrenceStart(''); setRecurrenceEnd('');
    setShowAddSheet(false); setEditingTask(null);
  };

  const openEditSheet = (task: any) => {
    setEditingTask(task);
    setNewTask(task.title || '');
    setSelectedCategory(task.category || 'Personal');
    setSelectedPriority(task.priority || 'medium');
    setRecurring(!!task.recurring);
    setRecurrenceInterval(task.recurrenceInterval || 1);
    setRecurrenceUnit(task.recurrenceUnit || 'days');
    setRecurrenceDays(task.recurrenceDays || []);
    setMonthlyDay(task.recurrenceUnit === 'months' && task.recurrenceDays?.[0] ? parseInt(task.recurrenceDays[0], 10) : 1);
    setRecurrenceStart(task.recurrenceStartDate ? format(parseISO(task.recurrenceStartDate), 'yyyy-MM-dd') : '');
    setRecurrenceEnd(task.recurrenceEndDate ? format(parseISO(task.recurrenceEndDate), 'yyyy-MM-dd') : '');
    setScheduledDate(task.dueDate ? format(parseISO(task.dueDate), 'yyyy-MM-dd') : '');
    setShowAddSheet(true);
  };

  const toggleTask = async (task: any) => {
    const isCompleted = !task.isCompleted;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted } : t));
    await api.updateTask(task.id, { isCompleted });
    if (isCompleted && user) await api.addPoints(user.id, 'task_completed', 1);
    loadTasks();
  };

  const deleteTask = async (id: number, deleteMode: 'this' | 'series' = 'this') => {
    await api.deleteTask(id, deleteMode);
    setDeleteConfirm(null);
    loadTasks();
  };

  const getFilteredTasks = () => {
    let filtered = tasks;
    if (selectedDate) {
      filtered = filtered.filter(t => {
        const due = t.dueDate ?? t.due_date;
        if (!due) return false;
        try { return isSameDay(parseISO(due), selectedDate); } catch { return false; }
      });
    } else if (filterView === 'today') {
      filtered = filtered.filter(t => {
        const due = t.dueDate ?? t.due_date;
        return !due || isToday(parseISO(due));
      });
    } else if (filterView === 'overdue') {
      filtered = filtered.filter(t => {
        const due = t.dueDate ?? t.due_date;
        return due && isPast(parseISO(due)) && !isToday(parseISO(due)) && t.status !== 'completed';
      });
    }
    if (filterCategory !== 'all') filtered = filtered.filter(t => t.category === filterCategory);
    return filtered;
  };

  const renderOccurrences = (task: any) => {
    if (!task.recurrenceId) return null;
    const selected = new Date(selectedDate); selected.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const cutoff = selected > today ? today : selected;
    const seriesHistory = tasks.filter(t => {
      if (t.recurrenceId !== task.recurrenceId) return false;
      const dueValue = t.dueDate || t.due_date;
      if (!dueValue) return false;
      const due = new Date(dueValue); due.setHours(0, 0, 0, 0);
      return due <= cutoff;
    });
    const completed = seriesHistory.filter(t => t.isCompleted || t.status === 'completed')
      .sort((a, b) => new Date(b.dueDate || b.due_date).getTime() - new Date(a.dueDate || a.due_date).getTime())
      .slice(0, 5);
    const missed = seriesHistory.filter(t => !(t.isCompleted || t.status === 'completed')).length;
    if (completed.length === 0 && missed === 0) return null;
    return (
      <div className="flex items-center gap-1.5 mr-1">
        {completed.map((t, i) => (
          <span key={t.id || i} title={new Date(t.dueDate || t.due_date).toLocaleDateString()}
            className="w-4 h-4 rounded-sm flex items-center justify-center text-white text-[9px]"
            style={{ backgroundColor: 'var(--accent-green)' }}>✓</span>
        ))}
        {missed > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
            -{missed}
          </span>
        )}
      </div>
    );
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div>
      {/* Week date strip */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {format(selectedDate, 'EEEE, MMM d')}
          </h2>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              className="px-2 py-1 rounded-lg text-[11px] press" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>
              ◀
            </button>
            <button onClick={() => setSelectedDate(new Date())}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold press" style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)' }}>
              Today
            </button>
            <button onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              className="px-2 py-1 rounded-lg text-[11px] press" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>
              ▶
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {Array.from({ length: 7 }).map((_, i) => {
            const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
            const d = addDays(weekStart, i);
            const isSelected = isSameDay(d, selectedDate);
            const isNow = isToday(d);
            return (
              <button key={d.toISOString()} onClick={() => setSelectedDate(d)}
                className="flex-1 min-w-[38px] py-2 rounded-xl text-center press transition-all"
                style={{
                  backgroundColor: isSelected ? 'var(--accent)' : isNow ? 'var(--surface-elevated)' : 'var(--surface)',
                  border: isNow && !isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                }}>
                <div className="text-[10px]" style={{ color: isSelected ? '#fff' : 'var(--text-muted)' }}>{format(d, 'EEE')}</div>
                <div className="font-bold text-sm" style={{ color: isSelected ? '#fff' : 'var(--text-primary)' }}>{format(d, 'd')}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 mb-3">
        {(['all', 'today', 'overdue'] as const).map(v => (
          <button key={v} onClick={() => setFilterView(v)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 press transition-all"
            style={{
              backgroundColor: filterView === v ? (v === 'overdue' ? '#ef4444' : 'var(--accent)') : 'var(--surface)',
              color: filterView === v ? '#fff' : 'var(--text-secondary)',
            }}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
        <div className="flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'var(--surface)' }}>
          <Filter size={12} style={{ color: 'var(--text-muted)' }} />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="text-xs outline-none bg-transparent" style={{ color: 'var(--text-secondary)' }}>
            <option value="all">All</option>
            {CATEGORY_OPTIONS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <button onClick={() => { setEditingTask(null); setShowAddSheet(true); }}
          className="ml-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold press text-white"
          style={{ backgroundColor: 'var(--accent)' }}>
          <Plus size={13} /> New
        </button>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        <AnimatePresence>
          {filteredTasks.map(task => (
            <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
              className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', opacity: task.isCompleted ? 0.6 : 1 }}>
              <div className="flex items-center gap-2.5">
                <button onClick={() => toggleTask(task)} className="flex-shrink-0 press">
                  {task.isCompleted
                    ? <CheckCircle2 size={20} style={{ color: 'var(--accent)' }} />
                    : <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'var(--border)' }} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: task.isCompleted ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.isCompleted ? 'line-through' : 'none' }}>
                    {task.title}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                        {task.category}
                      </span>
                    )}
                    {task.priority && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    )}
                    {(task.dueDate ?? task.due_date) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                        {format(parseISO(task.dueDate ?? task.due_date), 'EEE, MMM d')}
                      </span>
                    )}
                    {task.recurring && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent-green)' }}>
                        recurring
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {renderOccurrences(task)}
                  {task.isCompleted ? (
                    <button onClick={() => toggleTask(task)} className="p-1.5 rounded-lg press" style={{ color: 'var(--text-muted)' }}>
                      <RotateCcw size={13} />
                    </button>
                  ) : (
                    <button onClick={() => openEditSheet(task)} className="p-1.5 rounded-lg press" style={{ color: 'var(--text-muted)' }}>
                      <Edit size={13} />
                    </button>
                  )}
                  <button onClick={() => setDeleteConfirm({ taskId: task.id, isRecurring: task.recurring })}
                    className="p-1.5 rounded-lg press" style={{ color: '#ef4444' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredTasks.length === 0 && (
          <div className="py-12 text-center">
            <Target size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks found</p>
            <button onClick={() => setShowAddSheet(true)} className="mt-2 text-xs font-semibold press" style={{ color: 'var(--accent)' }}>
              + Add a task
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Bottom Sheet */}
      <AnimatePresence>
        {showAddSheet && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={resetForm} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden flex flex-col"
              style={{ backgroundColor: 'var(--surface)', maxHeight: '90dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 350 }}>
              {/* handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
              </div>
              <div className="flex items-center justify-between px-5 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {editingTask ? 'Edit Task' : 'New Task'}
                </h3>
                <button onClick={resetForm} className="text-xl leading-none press" style={{ color: 'var(--text-muted)' }}>&times;</button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Title */}
                <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)}
                  placeholder="Task title" autoFocus
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />

                {/* Category */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Category</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_OPTIONS.map(c => {
                      const Icon = c.icon;
                      const active = selectedCategory === c.name;
                      return (
                        <button key={c.name} onClick={() => setSelectedCategory(c.name)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium press transition-all"
                          style={{
                            backgroundColor: active ? 'var(--accent)' : 'var(--surface-elevated)',
                            color: active ? '#fff' : 'var(--text-secondary)',
                          }}>
                          <Icon size={10} />{c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority + Recurring */}
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Priority</p>
                    <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <div onClick={() => setRecurring(!recurring)}
                      className="w-9 h-5 rounded-full relative transition-all"
                      style={{ backgroundColor: recurring ? 'var(--accent)' : 'var(--surface-elevated)' }}>
                      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                        style={{ left: recurring ? '18px' : '2px' }} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Recurring</span>
                  </label>
                </div>

                {/* Schedule date */}
                {!recurring && (
                  <div>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Schedule for</p>
                    <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                  </div>
                )}

                {/* Recurrence options */}
                {recurring && (
                  <div className="rounded-xl p-3 space-y-3" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Every</span>
                      <input type="number" value={recurrenceInterval} onChange={e => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                        className="w-14 px-2 py-1.5 rounded-lg text-xs text-center outline-none"
                        style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                      <select value={recurrenceUnit} onChange={e => setRecurrenceUnit(e.target.value as any)}
                        className="px-2 py-1.5 rounded-lg text-xs outline-none"
                        style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                        <option value="days">day(s)</option>
                        <option value="weeks">week(s)</option>
                        <option value="months">month(s)</option>
                        <option value="years">year(s)</option>
                      </select>
                    </div>
                    {recurrenceUnit === 'weeks' && (
                      <div className="flex gap-2 flex-wrap">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => {
                          const full = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i];
                          const active = recurrenceDays.includes(full);
                          return (
                            <button key={d} onClick={() => setRecurrenceDays(active ? recurrenceDays.filter(x => x !== full) : [...recurrenceDays, full])}
                              className="w-9 h-9 rounded-full text-xs font-semibold press"
                              style={{ backgroundColor: active ? 'var(--accent)' : 'var(--surface)', color: active ? '#fff' : 'var(--text-muted)' }}>
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {recurrenceUnit === 'months' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>on day</span>
                        <input type="number" min={1} max={31} value={monthlyDay} onChange={e => setMonthlyDay(parseInt(e.target.value) || 1)}
                          className="w-14 px-2 py-1.5 rounded-lg text-xs text-center outline-none"
                          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Start</p>
                        <input type="date" value={recurrenceStart} onChange={e => setRecurrenceStart(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>End</p>
                        <input type="date" value={recurrenceEnd} onChange={e => setRecurrenceEnd(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button onClick={resetForm} className="px-4 py-2.5 rounded-xl text-sm font-semibold press"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button onClick={addTask} disabled={!newTask.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white press disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirm sheet */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-5"
              style={{ backgroundColor: 'var(--surface)', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 350 }}>
              <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Delete Task</h3>
              {deleteConfirm.isRecurring ? (
                <div className="space-y-2 mt-3">
                  <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>This is a recurring task. What would you like to delete?</p>
                  <button onClick={() => deleteTask(deleteConfirm.taskId, 'this')}
                    className="w-full py-3 rounded-xl text-sm font-semibold press"
                    style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#ca8a04' }}>
                    Delete Only This Occurrence
                  </button>
                  <button onClick={() => deleteTask(deleteConfirm.taskId, 'series')}
                    className="w-full py-3 rounded-xl text-sm font-semibold press"
                    style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    Delete Entire Series
                  </button>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Are you sure you want to delete this task?</p>
                  <button onClick={() => deleteTask(deleteConfirm.taskId, 'this')}
                    className="w-full py-3 rounded-xl text-sm font-semibold press mb-2"
                    style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    Delete Task
                  </button>
                </div>
              )}
              <button onClick={() => setDeleteConfirm(null)}
                className="w-full py-3 rounded-xl text-sm font-semibold press mt-1"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Daily Routine Tab ────────────────────────────────────────────────────────

function DailyRoutineTab({ userId }: { userId: string | number }) {
  const routineKey = `routine_blocks_${userId}`;
  const doneKey = `routine_done_${userId}_${format(new Date(), 'yyyy-MM-dd')}`;

  const [blocks, setBlocks] = useState<RoutineBlock[]>(() => {
    try {
      const saved = localStorage.getItem(routineKey);
      return saved ? JSON.parse(saved) : DEFAULT_ROUTINE;
    } catch { return DEFAULT_ROUTINE; }
  });

  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(doneKey);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [editing, setEditing] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [newBlock, setNewBlock] = useState({ startTime: '09:00', endTime: '10:00', label: '' });
  const now = currentMinutes();

  const saveBlocks = (updated: RoutineBlock[]) => {
    setBlocks(updated);
    localStorage.setItem(routineKey, JSON.stringify(updated));
  };

  const saveDone = (updated: Record<string, boolean>) => {
    setDone(updated);
    localStorage.setItem(doneKey, JSON.stringify(updated));
  };

  const toggleDone = (id: string) => saveDone({ ...done, [id]: !done[id] });

  const removeBlock = (id: string) => saveBlocks(blocks.filter(b => b.id !== id));

  const addBlock = () => {
    if (!newBlock.label.trim()) return;
    const b: RoutineBlock = { id: Date.now().toString(), ...newBlock, done: false };
    const sorted = [...blocks, b].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    saveBlocks(sorted);
    setNewBlock({ startTime: '09:00', endTime: '10:00', label: '' });
    setAddingBlock(false);
  };

  const completedCount = blocks.filter(b => done[b.id]).length;
  const totalCount = blocks.length;

  return (
    <div>
      {/* Progress header */}
      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Today's routine</p>
            <p className="text-xl font-bold num mt-0.5" style={{ color: 'var(--text-primary)' }}>{completedCount}/{totalCount}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(!editing)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold press"
              style={{ backgroundColor: editing ? 'var(--accent)' : 'var(--surface-elevated)', color: editing ? '#fff' : 'var(--text-secondary)' }}>
              {editing ? 'Done' : 'Edit'}
            </button>
            <button onClick={() => setAddingBlock(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold press text-white"
              style={{ backgroundColor: 'var(--accent)' }}>
              + Block
            </button>
          </div>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
          <motion.div className="h-full rounded-full" style={{ backgroundColor: 'var(--accent)', width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            transition={{ duration: 0.5 }} />
        </div>
      </div>

      {/* Time blocks */}
      <div className="space-y-2">
        {blocks.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)).map(block => {
          const start = timeToMinutes(block.startTime);
          const end = timeToMinutes(block.endTime);
          const isActive = now >= start && now < end;
          const isPassed = now >= end;
          const isDone = done[block.id];

          return (
            <motion.div key={block.id} layout
              className="rounded-xl overflow-hidden"
              style={{
                border: isActive ? `1px solid var(--accent)` : '1px solid var(--border)',
                backgroundColor: isDone ? 'var(--surface)' : 'var(--surface)',
              }}>
              <div className="flex items-center gap-3 p-3">
                {/* Time */}
                <div className="text-center flex-shrink-0 w-14">
                  <p className="text-[10px] num font-semibold" style={{ color: 'var(--text-muted)' }}>{block.startTime}</p>
                  <div className="w-px h-3 mx-auto my-0.5" style={{ backgroundColor: 'var(--border)' }} />
                  <p className="text-[10px] num" style={{ color: 'var(--text-muted)' }}>{block.endTime}</p>
                </div>

                {/* Active indicator */}
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
                )}

                {/* Label */}
                <p className="flex-1 text-sm font-medium" style={{
                  color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: isDone ? 'line-through' : 'none',
                }}>
                  {block.label}
                </p>

                {/* Status */}
                {isActive && !isDone && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                    Now
                  </span>
                )}

                {/* Check / delete */}
                {editing ? (
                  <button onClick={() => removeBlock(block.id)} className="p-1.5 rounded-lg press" style={{ color: '#ef4444' }}>
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <button onClick={() => toggleDone(block.id)} className="press">
                    {isDone
                      ? <CheckCircle2 size={20} style={{ color: 'var(--accent)' }} />
                      : <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'var(--border)' }} />}
                  </button>
                )}
              </div>

              {/* Active progress bar */}
              {isActive && (
                <div className="h-0.5 w-full" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <div className="h-full" style={{
                    backgroundColor: 'var(--accent)',
                    width: `${Math.min(100, ((now - start) / (end - start)) * 100)}%`,
                    transition: 'width 60s linear',
                  }} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Add block sheet */}
      <AnimatePresence>
        {addingBlock && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAddingBlock(false)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-5"
              style={{ backgroundColor: 'var(--surface)', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 350 }}>
              <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Add Routine Block</h3>
              <div className="space-y-3">
                <input type="text" value={newBlock.label} onChange={e => setNewBlock({ ...newBlock, label: e.target.value })}
                  placeholder="e.g. Morning workout" autoFocus
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Start</p>
                    <input type="time" value={newBlock.startTime} onChange={e => setNewBlock({ ...newBlock, startTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>End</p>
                    <input type="time" value={newBlock.endTime} onChange={e => setNewBlock({ ...newBlock, endTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setAddingBlock(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold press"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button onClick={addBlock} disabled={!newBlock.label.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white press disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  Add Block
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type TabId = 'dashboard' | 'tasks' | 'routine';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'routine', label: 'Daily Routine', icon: Repeat },
  ];

  return (
    <div className="px-4 pt-4 pb-nav">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {greeting(user?.name)}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {format(new Date(), 'EEEE, d MMMM')}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
            <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
            <Settings size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all press"
              style={{ backgroundColor: activeTab === tab.id ? 'var(--accent)' : 'transparent', color: activeTab === tab.id ? '#fff' : 'var(--text-muted)' }}>
              <Icon size={14} />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}>
          {activeTab === 'dashboard' && <DashboardTab user={user} navigate={navigate} />}
          {activeTab === 'tasks' && <TasksTab user={user} />}
          {activeTab === 'routine' && user && <DailyRoutineTab userId={user.id} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
