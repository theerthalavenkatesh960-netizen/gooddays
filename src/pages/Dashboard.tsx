import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, Settings, CheckCircle2, Circle, Moon, Dumbbell,
  Droplets, Target, Flame, ChevronRight, Zap, TrendingUp
} from 'lucide-react';
import { format, isToday, parseISO, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

function greeting(name?: string) {
  const h = new Date().getHours();
  const base = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${base}${name ? `, ${name.split(' ')[0]}` : ''}`;
}

interface Task { id: string; title: string; isCompleted?: boolean; status?: string; dueDate?: string; due_date?: string; }

function StatChip({ icon: Icon, label, value, color, empty }: {
  icon: React.ElementType; label: string; value: string; color: string; empty?: boolean;
}) {
  return (
    <div
      className="stat-chip flex-1"
      style={{ borderColor: empty ? 'dashed' : 'var(--border)', borderStyle: empty ? 'dashed' : 'solid' }}
    >
      <Icon size={16} style={{ color }} />
      <div className="min-w-0">
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-semibold num" style={{ color: empty ? 'var(--text-muted)' : 'var(--text-primary)' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function StreakDots({ data }: { data: boolean[] }) {
  return (
    <div className="flex gap-1">
      {data.map((done, i) => (
        <div
          key={i}
          className="w-5 h-5 rounded-md flex items-center justify-center"
          style={{ backgroundColor: done ? 'var(--accent)' : 'var(--surface-elevated)' }}
        >
          {done && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [intention, setIntention] = useState('');
  const [sleep, setSleep] = useState('');
  const [water, setWater] = useState(0);
  const [waterGoal] = useState(8);
  const [workoutStreak, setWorkoutStreak] = useState(0);
  const [reminders, setReminders] = useState<any[]>([]);
  const [streaks, setStreaks] = useState({ tasks: Array(7).fill(false), workout: Array(7).fill(false) });
  const [calToday, setCalToday] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');
  const intentionKey = `intention_${today}_${user?.id}`;

  useEffect(() => {
    const saved = localStorage.getItem(intentionKey);
    if (saved) setIntention(saved);
  }, [intentionKey]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      loadTasks(),
      loadTracking(),
      loadReminders(),
      loadStreaks(),
    ]).finally(() => setLoading(false));
  }, [user]);

  const loadTasks = async () => {
    try {
      const data = await api.getTasks(user!.id);
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
      const rec: any = await api.getDailyTracking(user!.id, today);
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
      const last7 = Array.from({ length: 7 }, (_, i) =>
        format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
      );
      const [tasksData, workoutData] = await Promise.all([
        api.getTasks(user!.id).catch(() => []),
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
      // workout streak count
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
    try {
      await api.updateTask(task.id, { isCompleted: done });
    } catch {}
  };

  const saveIntention = (val: string) => {
    setIntention(val);
    localStorage.setItem(intentionKey, val);
  };

  const DAYS = ['M','T','W','T','F','S','S'];

  const isEvening = new Date().getHours() >= 20;

  return (
    <div className="px-4 pt-4 pb-nav">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
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

      {/* Stat Chips Row */}
      <div className="flex gap-2 mt-4 mb-5">
        <StatChip icon={Moon}     label="Sleep"   value={sleep ? `${sleep}h` : '--'}     color="var(--accent)"       empty={!sleep} />
        <StatChip icon={Flame}    label="Workout" value={workoutStreak > 0 ? `${workoutStreak}d` : '--'} color="var(--accent-warm)"  empty={workoutStreak === 0} />
        <StatChip icon={Droplets} label="Water"   value={`${water}/${waterGoal}`}          color="#06B6D4"              empty={water === 0} />
        <StatChip icon={Zap}      label="Cals"    value={calToday > 0 ? `${calToday}` : '--'} color="var(--accent-gold)" empty={calToday === 0} />
      </div>

      {/* Intention */}
      <div className="mb-5">
        <div className="section-header px-0 mb-2">
          <span className="section-label">Today's Intention</span>
        </div>
        <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <input
            type="text"
            value={intention}
            onChange={e => saveIntention(e.target.value)}
            placeholder="What matters most today?"
            className="w-full bg-transparent outline-none text-sm italic"
            style={{ color: intention ? 'var(--text-primary)' : 'var(--text-muted)' }}
          />
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="mb-5">
        <div className="section-header px-0 mb-2">
          <span className="section-label">Today's Tasks</span>
          <button
            onClick={() => navigate('/life')}
            className="flex items-center gap-0.5 text-xs press"
            style={{ color: 'var(--accent)' }}
          >
            See all <ChevronRight size={14} />
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          {loading ? (
            [1,2,3].map(i => (
              <div key={i} className="task-row">
                <div className="skeleton w-5 h-5 rounded-md" />
                <div className="skeleton h-3 flex-1 rounded" />
              </div>
            ))
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center">
              <Target size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks for today</p>
              <button
                onClick={() => navigate('/life')}
                className="mt-2 text-xs press"
                style={{ color: 'var(--accent)' }}
              >
                Add a task
              </button>
            </div>
          ) : (
            tasks.map(task => {
              const done = task.isCompleted ?? task.status === 'completed';
              return (
                <div key={task.id} className="task-row" onClick={() => toggleTask(task)}>
                  <div className={`checkbox-custom ${done ? 'checked' : ''}`}>
                    {done && <CheckCircle2 size={13} color="#fff" />}
                  </div>
                  <p
                    className="flex-1 text-sm"
                    style={{
                      color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: done ? 'line-through' : 'none',
                    }}
                  >
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
                <span className="text-xs num" style={{ color: 'var(--text-muted)' }}>
                  {data.filter(Boolean).length}/7
                </span>
              </div>
              <div className="flex gap-1">
                {data.map((done, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className="w-full h-6 rounded-md flex items-center justify-center transition-all"
                      style={{ backgroundColor: done ? color : 'var(--surface-elevated)' }}
                    >
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
