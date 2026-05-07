import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, StickyNote, Flame, Moon, Dumbbell, Smartphone, Sun, Smile, Bell, Zap, Droplets, Target, TrendingUp } from 'lucide-react';
import { format, parseISO, isToday, subDays } from 'date-fns';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';
import GamificationBar from '../components/GamificationBar';

export default function Dashboard() {
  const { user } = useAuth();
  const [topThree, setTopThree] = useState({
    task_1: '',
    task_2: '',
    task_3: '',
    id_1: '',
    id_2: '',
    id_3: '',
    completed_1: false,
    completed_2: false,
    completed_3: false,
  });

  const [dailyNote, setDailyNote] = useState('');
  const [reminders, setReminders] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [workoutStreak, setWorkoutStreak] = useState(0);
  const [todayWater, setTodayWater] = useState(0);
  const [waterGoal, setWaterGoal] = useState(8);
  const [streaks, setStreaks] = useState({
    tasks: Array(7).fill(false),
    goals: Array(7).fill(false),
    finance: Array(7).fill(false),
    workout: Array(7).fill(false),
  });

  // store as strings so inputs can be cleared; convert when saving
  const [todayTrack, setTodayTrack] = useState({
    sleep_hours: '',
    workout_minutes: '',
    phone_minutes: '',
    sunlight: false,
    mood: 3,
  });
  const [trackingOptions, setTrackingOptions] = useState<string[]>([]);

  const [trackCompleted, setTrackCompleted] = useState(false);

  useEffect(() => {
    if (user) {
      loadTopThree();
      loadDailyNote();
      loadStreaks();
      loadTodayTrack();
      loadReminders();
      loadGoals();
      loadWorkoutStreak();
    }
    // load tracking options stored in settings
    const stored = localStorage.getItem('trackingOptions');
    if (stored) {
      try {
        setTrackingOptions(JSON.parse(stored));
      } catch {}
    } else {
      setTrackingOptions(['sleep_hours', 'workout_minutes', 'phone_minutes']);
    }
  }, [user]);

  const loadTodayTrack = async () => {
    if (!user) return;
    // For now, load with default values; in future could fetch from backend
    // try to load existing record from backend
    if (user) {
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const rec: any = await api.getDailyTracking(user.id, today);
        if (rec && typeof rec === 'object' && !Array.isArray(rec)) {
          setTodayTrack({
            sleep_hours: (rec.sleepHours ?? rec.sleep_hours)?.toString() || '',
            workout_minutes: (rec.workoutMinutes ?? rec.workout_minutes)?.toString() || '',
            phone_minutes: (rec.phoneMinutes ?? rec.phone_minutes)?.toString() || '',
            sunlight: rec.sunlight || false,
            mood: rec.mood || 3,
          });
          setTodayWater((rec.waterCups ?? 0) || 0);
          setWaterGoal((rec.waterGoalCups ?? 8) || 8);
          setDailyNote(rec.note || '');
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    setTodayTrack({
      sleep_hours: '',
      workout_minutes: '',
      phone_minutes: '',
      sunlight: false,
      mood: 3,
    });
  };

  const loadReminders = async () => {
    try {
      const data = await api.getReminders();
      const active = Array.isArray(data) ? data.filter((r: any) => r.isEnabled) : [];
      setReminders(active);
    } catch (e) { console.error(e); }
  };

  const loadGoals = async () => {
    try {
      const data = await api.getGoals();
      setGoals(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const loadWorkoutStreak = async () => {
    try {
      const workoutData = await api.getWorkoutAnalytics();
      if (workoutData && workoutData.trainedDates) {
        const dates = workoutData.trainedDates.sort().reverse();
        let streak = 0;
        let checkDate = new Date();
        for (let i = 0; i < 365; i++) {
          const dateStr = format(checkDate, 'yyyy-MM-dd');
          if (dates.includes(dateStr)) {
            streak++;
            checkDate = subDays(checkDate, 1);
          } else {
            break;
          }
        }
        setWorkoutStreak(streak);
      }
    } catch (e) { console.error(e); }
  };

  const loadTopThree = async () => {
    if (!user) return;

    try {
      const tasks = await api.getTasks(user.id);
      const taskList = Array.isArray(tasks) ? tasks : [];
      // filter to tasks scheduled for today (dueDate or due_date)
      const todays = taskList.filter((t: any) => {
        const due = (t.dueDate ?? t.due_date) as string | undefined;
        if (!due) return false;
        try { return isToday(parseISO(due)); } catch { return false; }
      });

      const t1 = todays[0] || {};
      const t2 = todays[1] || {};
      const t3 = todays[2] || {};
      const completedVal = (task: any) => task.isCompleted ?? (task.status === 'completed');
      setTopThree({
        task_1: t1.title || '',
        id_1: t1.id || '',
        task_2: t2.title || '',
        id_2: t2.id || '',
        task_3: t3.title || '',
        id_3: t3.id || '',
        completed_1: completedVal(t1),
        completed_2: completedVal(t2),
        completed_3: completedVal(t3),
      });
    } catch (e) {
      console.error(e);
      setTopThree({
        task_1: '',
        task_2: '',
        task_3: '',
        id_1: '',
        id_2: '',
        id_3: '',
        completed_1: false,
        completed_2: false,
        completed_3: false,
      });
    }
  };

  const loadDailyNote = async () => {
    if (!user) return;
    // notes are stored alongside daily tracking
    await loadTodayTrack();
  };

  const loadStreaks = async () => {
    if (!user) return;

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return format(d, 'yyyy-MM-dd');
    });

    try {
      const [tasksDataRaw, goalsDataRaw, expensesDataRaw, workoutDataRaw] = await Promise.all([
        api.getTasks(user.id),
        api.getGoals(),
        api.getExpenses(user.id),
        api.getWorkoutAnalytics(),
      ]);

      const tasksData = Array.isArray(tasksDataRaw) ? tasksDataRaw : [];
      const goalsData = Array.isArray(goalsDataRaw) ? goalsDataRaw : [];
      const expensesData = Array.isArray(expensesDataRaw) ? expensesDataRaw : [];

      const taskStreak = last7Days.map(d =>
        tasksData.some((t: any) => {
          if (!t.isCompleted) return false;
          const dt = new Date(t.updatedAt);
          if (isNaN(dt.getTime())) return false;
          return format(dt, 'yyyy-MM-dd') === d;
        })
      );

      // Goals: day has a goal with updatedAt on that day (any progress)
      const goalsStreak = last7Days.map(d =>
        goalsData.some((g: any) => {
          const dt = new Date(g.updatedAt ?? g.updated_at ?? g.createdAt ?? g.created_at);
          if (isNaN(dt.getTime())) return false;
          return format(dt, 'yyyy-MM-dd') === d;
        })
      );

      // Finance: day has at least one expense logged
      const financeStreak = last7Days.map(d =>
        expensesData.some((e: any) => {
          const dt = new Date(e.date ?? e.createdAt ?? e.created_at);
          if (isNaN(dt.getTime())) return false;
          return format(dt, 'yyyy-MM-dd') === d;
        })
      );

      // Workout: days with a workout log
      const trainedDates: string[] = workoutDataRaw?.trainedDates ?? [];
      const workoutStreakArr = last7Days.map(d => trainedDates.includes(d));

      setStreaks({
        tasks: taskStreak,
        goals: goalsStreak,
        finance: financeStreak,
        workout: workoutStreakArr,
      });
    } catch (e) {
      console.error(e);
      setStreaks({
        tasks: Array(7).fill(false),
        goals: Array(7).fill(false),
        finance: Array(7).fill(false),
        workout: Array(7).fill(false),
      });
    }
  };

  const handleTaskTitleBlur = async (index: number, title: string) => {
    if (!user || !title.trim()) return;

    const idKey = `id_${index}` as keyof typeof topThree;
    const currentId = (topThree as any)[idKey];

    if (currentId) {
      // update existing task
      await api.updateTask(currentId, { title: title.trim() });
    } else {
      // create new task
      const created = await api.createTask({
        userId: user.id,
        title: title.trim(),
        category: 'Personal',
        priority: 'medium',
        dueDate: new Date(),
        recurring: false,
      });
      if (created && created.id) {
        const updated = { ...topThree, [idKey]: created.id };
        setTopThree(updated);
        loadTopThree();
      }
    }
  };

  const updateTopThree = async (field: string, value: string | boolean) => {
    if (!user) return;

    const prevAllCompleted = topThree.completed_1 && topThree.completed_2 && topThree.completed_3;
    const updated = { ...topThree, [field]: value };
    setTopThree(updated);

    // if toggling completion, try to update underlying task
    if (field.startsWith('completed_')) {
      const index = parseInt(field.split('_')[1], 10);
      const idKey = `id_${index}` as keyof typeof topThree;
      const taskId = (topThree as any)[idKey];
      if (taskId) {
        await api.updateTask(taskId, { isCompleted: value === true });
        // also refresh the tasks list for streaks, top three etc
        loadTopThree();
      }

      const newAllCompleted = updated.completed_1 && updated.completed_2 && updated.completed_3;
      if (newAllCompleted && !prevAllCompleted) {
        await api.addPoints(user.id, 'top_three_complete', 2);
      } else if (!newAllCompleted && prevAllCompleted) {
        await api.addPoints(user.id, 'top_three_complete', -2);
      }
    }
  };

  const updateDailyNote = async (note: string) => {
    if (!user) return;

    setDailyNote(note);
  };

  const saveTrackingData = async () => {
    if (!user) return;
    // persist to backend
    const date = format(new Date(), 'yyyy-MM-dd');
    const sleep = parseFloat(todayTrack.sleep_hours) || 0;
    const workout = parseInt(todayTrack.workout_minutes, 10) || 0;
    const phone = parseInt(todayTrack.phone_minutes, 10) || 0;
    const sunlight = todayTrack.sunlight;
    const mood = todayTrack.mood;
    await api.saveDailyTracking(user.id, date, sleep, workout, phone, sunlight, mood, dailyNote, todayWater, waterGoal);

    // Award 1 point for completing tracking
    await api.addPoints(user.id, 'daily_tracking_complete', 1);
    setTrackCompleted(true);
    setTimeout(() => setTrackCompleted(false), 2000);
  };

  const StreakBar = ({ completed, color }: { completed: boolean[]; color: string }) => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const count = completed.filter(Boolean).length;
    return (
      <div>
        <div className="flex gap-2 mb-1.5">
          {completed.map((done, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`w-full rounded-lg transition-all border ${
                  done
                    ? `${color} border-transparent shadow-sm`
                    : 'bg-white border-gray-300'
                }`}
                style={{ height: '32px' }}
              >
                {done && (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-white text-[10px] font-bold">✓</span>
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-semibold ${done ? 'text-gray-700' : 'text-gray-400'}`}>{days[i]}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-right font-semibold text-gray-400">{count}/7 days</p>
      </div>
    );
  };

  return (
    <div>
      <GamificationBar />

      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
        Today's Quest
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-xl"
        >
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Today's Top 3
          </h2>

          <div className="space-y-3">
            {(!topThree.task_1 && !topThree.task_2 && !topThree.task_3) ? (
              <p className="text-gray-500">Your top three list is empty. Head over to the Tasks page to add some!</p>
            ) : (
              [1, 2, 3].map((num) => {
              const taskKey = `task_${num}` as keyof typeof topThree;
              const completedKey = `completed_${num}` as keyof typeof topThree;

              return (
                <div key={num} className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => updateTopThree(completedKey, !topThree[completedKey])}
                  >
                    {topThree[completedKey] ? (
                      <CheckCircle2 className="text-emerald-500" size={24} />
                    ) : (
                      <Circle className="text-gray-300" size={24} />
                    )}
                  </motion.button>
                  <input
                    type="text"
                    value={topThree[taskKey] as string}
                    onChange={(e) => setTopThree({ ...topThree, [taskKey]: e.target.value })}
                    onBlur={(e) => handleTaskTitleBlur(num, e.target.value)}
                    placeholder={`Task ${num}`}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none ${
                      topThree[completedKey] ? 'line-through text-gray-400' : ''
                    }`}
                  />
                </div>
              );
              })
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-xl"
        >
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <StickyNote className="text-yellow-500" size={24} />
            Daily Note
          </h2>

          <textarea
            value={dailyNote}
            onChange={(e) => updateDailyNote(e.target.value)}
            // onBlur={() => saveTrackingData()}
            placeholder="What's on your mind today?"
            className="w-full h-32 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none resize-none"
          />
        </motion.div>
      </div>

      {/* Quick Stats & Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Workout Streak */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-4 shadow-sm border border-orange-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Workout Streak</p>
            <Flame size={16} className="text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-orange-600">{workoutStreak}</p>
          <p className="text-xs text-orange-500 mt-1">🔥 days in a row</p>
        </motion.div>

        {/* Active Reminders */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
          className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 shadow-sm border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Active Reminders</p>
            <Bell size={16} className="text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{reminders.length}</p>
          <p className="text-xs text-blue-500 mt-1">set for today</p>
        </motion.div>

        {/* Water Progress */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}
          className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl p-4 shadow-sm border border-cyan-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Water Intake</p>
            <Droplets size={16} className="text-cyan-500" />
          </div>
          <p className="text-3xl font-bold text-cyan-600">{todayWater}/{waterGoal}</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (todayWater / waterGoal) * 100)}%` }} />
          </div>
        </motion.div>

        {/* Goals Progress */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}
          className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 shadow-sm border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Active Goals</p>
            <Target size={16} className="text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-purple-600">{goals.filter((g: any) => g.status === 'Active' || !g.status).length}</p>
          <p className="text-xs text-purple-500 mt-1">in progress</p>
        </motion.div>
      </div>

      {/* Reminders Widget */}
      {reminders.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.23 }}
          className="bg-white rounded-2xl p-5 shadow-lg mb-6 border-l-4 border-blue-500">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Bell size={20} className="text-blue-500" /> Today's Reminders
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {reminders.slice(0, 6).map((reminder: any) => (
              <div key={reminder.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-sm font-medium text-gray-700">{reminder.title}</span>
                <span className="text-xs text-gray-500 ml-auto">{reminder.time}</span>
              </div>
            ))}
          </div>
          {reminders.length > 6 && <p className="text-xs text-gray-500 mt-2 text-center">+{reminders.length - 6} more</p>}
        </motion.div>
      )}

      {false && <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-xl mb-6"
      >
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">✨</span>
          Today's Tracking
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Sleep */}
          {trackingOptions.includes('sleep_hours') && (
            <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Moon size={18} className="text-indigo-500" />
              Sleep Hours
            </label>
            <input
              type="number"
                min="0"
                max="24"
                step="0.5"
                value={todayTrack.sleep_hours}
                onChange={(e) => setTodayTrack({ ...todayTrack, sleep_hours: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
            />
            </div>
          )}
          {/* Workout */}
          {trackingOptions.includes('workout_minutes') && (
            <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Dumbbell size={18} className="text-pink-500" />
              Workout Minutes
            </label>
            <input
              type="number"
                min="0"
                max="1440"
                step="5"
                value={todayTrack.workout_minutes}
                onChange={(e) => setTodayTrack({ ...todayTrack, workout_minutes: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all outline-none"
            />
            </div>
          )}
          {/* Phone Time */}
          {trackingOptions.includes('phone_minutes') && (
            <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Smartphone size={18} className="text-blue-500" />
              Phone Time (minutes)
            </label>
            <input
              type="number"
                min="0"
                max="1440"
                step="5"
                value={todayTrack.phone_minutes}
                onChange={(e) => setTodayTrack({ ...todayTrack, phone_minutes: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
            />
            </div>
          )}
          {/* Sunlight */}
          {trackingOptions.includes('sunlight') && (
            <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Sun size={18} className="text-yellow-500" />
              Got Sunlight Today?
            </label>
            <button
              onClick={() => setTodayTrack({ ...todayTrack, sunlight: !todayTrack.sunlight })}
              className={`w-full px-4 py-2 rounded-lg font-semibold transition-all ${
                todayTrack.sunlight
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {todayTrack.sunlight ? '☀️ Yes' : '☁️ No'}
            </button>
            </div>
          )}
        </div>

        {/* Mood Selector */}
        {trackingOptions.includes('mood') && (
          <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Smile size={18} className="text-red-500" />
            How are you feeling? ({todayTrack.mood}/5)
          </label>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((mood) => (
              <motion.button
                key={mood}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setTodayTrack({ ...todayTrack, mood })}
                className={`text-3xl px-3 py-2 rounded-lg transition-all ${
                  todayTrack.mood === mood ? 'ring-2 ring-red-500 scale-110' : 'opacity-50 hover:opacity-75'
                }`}
              >
                {['😢', '😕', '😐', '🙂', '😄'][mood - 1]}
              </motion.button>
            ))}
          </div>
        </div>
        )}

        {/* Water Tracking */}
        <div className="bg-white bg-opacity-50 rounded-xl p-4 mb-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <Droplets size={18} className="text-cyan-500" />
            Water Intake: {todayWater}/{waterGoal} cups
          </label>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setTodayWater(Math.max(0, todayWater - 1))}
              className="px-3 py-2 bg-gray-300 rounded-lg font-bold text-gray-700">
              −
            </motion.button>
            <div className="flex-1 flex gap-1 justify-center">
              {Array(waterGoal).fill(0).map((_, i) => (
                <motion.button key={i} whileTap={{ scale: 0.9 }}
                  onClick={() => setTodayWater(i + 1)}
                  className={`w-8 h-8 rounded-lg font-bold transition-all ${i < todayWater ? 'bg-cyan-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {i + 1 <= todayWater ? '✓' : '○'}
                </motion.button>
              ))}
            </div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setTodayWater(Math.min(waterGoal + 2, todayWater + 1))}
              className="px-3 py-2 bg-cyan-500 text-white rounded-lg font-bold">
              +
            </motion.button>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-2 mt-3">
            <div className="bg-gradient-to-r from-cyan-400 to-teal-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (todayWater / waterGoal) * 100)}%` }} />
          </div>
        </div>

        {/* total time estimate */}
        <div className="text-center text-sm text-gray-600 mb-4">
          {(() => {
            let total = 0;
            if (trackingOptions.includes('sleep_hours')) {
              const sleep = parseFloat(todayTrack.sleep_hours) || 0;
              total += Math.round(sleep * 60);
            }
            if (trackingOptions.includes('workout_minutes')) {
              const workout = parseInt(todayTrack.workout_minutes, 10) || 0;
              total += workout;
            }
            if (trackingOptions.includes('phone_minutes')) {
              const phone = parseInt(todayTrack.phone_minutes, 10) || 0;
              total += phone;
            }
            const hrs = Math.floor(total / 60);
            const mins = total % 60;
            if (total === 0) return null;
            return `Estimated total: ${hrs}h ${mins}m`;
          })()}
        </div>

        {/* Save Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={saveTrackingData}
          className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
            trackCompleted
              ? 'bg-emerald-500 text-white'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
          }`}
        >
          {trackCompleted ? (
            <>
              <CheckCircle2 size={20} />
              Tracked! +1 Point
            </>
          ) : (
            <>
              <span>💾</span>
              Save Daily Tracking
            </>
          )}
        </motion.button>
      </motion.div>}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl p-5 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Flame className="text-orange-500" size={20} />
            This Week
          </h2>
          <span className="text-xs text-gray-400 font-medium">Last 7 days</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Tasks */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">✅</span>
              <span className="text-sm font-bold text-blue-700">Tasks</span>
            </div>
            <StreakBar completed={streaks.tasks} color="bg-blue-500" />
          </div>

          {/* Workout */}
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-3 border border-rose-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏋️</span>
              <span className="text-sm font-bold text-rose-600">Workout</span>
            </div>
            <StreakBar completed={streaks.workout} color="bg-rose-500" />
          </div>

          {/* Goals */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎯</span>
              <span className="text-sm font-bold text-amber-700">Goals</span>
            </div>
            <StreakBar completed={streaks.goals} color="bg-amber-500" />
          </div>

          {/* Finance */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💰</span>
              <span className="text-sm font-bold text-emerald-700">Finance</span>
            </div>
            <StreakBar completed={streaks.finance} color="bg-emerald-500" />
          </div>
        </div>

        {/* Overall summary bar */}
        {(() => {
          const allDays = [...streaks.tasks, ...streaks.workout, ...streaks.study, ...streaks.selfcare];
          const total = allDays.length;
          const done = allDays.filter(Boolean).length;
          const pct = Math.round((done / total) * 100);
          return (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span className="font-medium">Overall consistency</span>
                <span className="font-bold text-gray-700">{pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-rose-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })()}
      </motion.div>
    </div>
  );
}
