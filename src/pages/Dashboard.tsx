import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, StickyNote, Flame, Moon, Dumbbell, Smartphone, Sun, Smile } from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
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
  const [streaks, setStreaks] = useState({
    tasks: Array(7).fill(false),
    study: Array(7).fill(false),
    selfcare: Array(7).fill(false),
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
      const today = format(new Date(), 'yyyy-MM-dd');
      const rec: any = await api.getDailyTracking(user.id, today);
      if (rec) {
        setTodayTrack({
          sleep_hours: (rec.sleepHours ?? rec.sleep_hours)?.toString() || '',
          workout_minutes: (rec.workoutMinutes ?? rec.workout_minutes)?.toString() || '',
          phone_minutes: (rec.phoneMinutes ?? rec.phone_minutes)?.toString() || '',
          sunlight: rec.sunlight || false,
          mood: rec.mood || 3,
        });
        setDailyNote(rec.note || '');
        return;
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

  const loadTopThree = async () => {
    if (!user) return;

    const tasks = await api.getTasks(user.id);
    if (tasks) {
      // filter to tasks scheduled for today (dueDate or due_date)
      const todays = (tasks as any[]).filter((t) => {
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

    const [tasksData, studyData, selfcareData] = await Promise.all([
      api.getTasks(user.id),
      api.getStudySessions(user.id),
      api.getSelfCareActivities(user.id),
    ]);

      const taskStreak = last7Days.map(d =>
        tasksData?.some(t => {
          if (!t.isCompleted) return false;
          const dt = new Date(t.updatedAt);
          if (isNaN(dt.getTime())) return false;
          return format(dt, 'yyyy-MM-dd') === d;
        }) || false
      );
      const studyStreak = last7Days.map(d =>
        studyData?.some(s => {
          const dt = new Date(s.date);
          if (isNaN(dt.getTime())) return false;
          return format(dt, 'yyyy-MM-dd') === d;
        }) || false
      );
      const selfcareStreak = last7Days.map(d =>
        selfcareData?.some(s => {
          const dt = new Date(s.date);
          if (isNaN(dt.getTime())) return false;
          return format(dt, 'yyyy-MM-dd') === d;
        }) || false
      );
      const workoutStreak = last7Days.map(d =>
        selfcareData?.some(s => {
          const dt = new Date(s.date);
          if (isNaN(dt.getTime())) return false;
          return (
            format(dt, 'yyyy-MM-dd') === d &&
            s.activityType?.toLowerCase().includes('workout')
          );
        }) || false
      );

    setStreaks({
      tasks: taskStreak,
      study: studyStreak,
      selfcare: selfcareStreak,
      workout: workoutStreak,
    });
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
        await api.addPoints(user.id, 'top_three_complete', 20);
      } else if (!newAllCompleted && prevAllCompleted) {
        await api.addPoints(user.id, 'top_three_complete', -20);
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
    await api.saveDailyTracking(user.id, date, sleep, workout, phone, sunlight, mood, dailyNote);

    // Award 1 point for completing tracking
    await api.addPoints(user.id, 'daily_tracking_complete', 1);
    setTrackCompleted(true);
    setTimeout(() => setTrackCompleted(false), 2000);
  };

  const StreakBar = ({ completed }: { completed: boolean[] }) => (
    <div className="flex gap-1">
      {completed.map((done, i) => (
        <div
          key={i}
          className={`flex-1 h-2 rounded-full ${
            done ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  );

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

      <motion.div
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
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl p-4 shadow-xl"
      >
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Flame className="text-orange-500" size={18} />
          This Week
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-2">
            <h3 className="text-xs font-semibold text-gray-700 mb-1">Tasks</h3>
            <StreakBar completed={streaks.tasks} />
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2">
            <h3 className="text-xs font-semibold text-gray-700 mb-1">Study</h3>
            <StreakBar completed={streaks.study} />
          </div>
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-2">
            <h3 className="text-xs font-semibold text-gray-700 mb-1">Self Care</h3>
            <StreakBar completed={streaks.selfcare} />
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-2">
            <h3 className="text-xs font-semibold text-gray-700 mb-1">Workout</h3>
            <StreakBar completed={streaks.workout} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
