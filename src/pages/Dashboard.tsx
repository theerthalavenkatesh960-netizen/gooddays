import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, StickyNote, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import GamificationBar from '../components/GamificationBar';

export default function Dashboard() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [topThree, setTopThree] = useState({
    task_1: '',
    task_2: '',
    task_3: '',
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

  useEffect(() => {
    if (user) {
      loadTopThree();
      loadDailyNote();
      loadStreaks();
    }
  }, [user]);

  const loadTopThree = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('daily_top_three')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (data) {
      setTopThree(data);
    }
  };

  const loadDailyNote = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('daily_notes')
      .select('note')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (data) {
      setDailyNote(data.note);
    }
  };

  const loadStreaks = async () => {
    if (!user) return;

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return format(d, 'yyyy-MM-dd');
    });

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('completed_at', last7Days[0]);

    const { data: studyData } = await supabase
      .from('study_sessions')
      .select('date')
      .eq('user_id', user.id)
      .in('date', last7Days);

    const { data: selfcareData } = await supabase
      .from('self_care_logs')
      .select('date')
      .eq('user_id', user.id)
      .eq('completed', true)
      .in('date', last7Days);

    const { data: workoutData } = await supabase
      .from('daily_tracking')
      .select('date, workout_minutes')
      .eq('user_id', user.id)
      .in('date', last7Days)
      .gt('workout_minutes', 0);

    setStreaks({
      tasks: last7Days.map(date =>
        tasksData?.some(t => format(new Date(t.completed_at), 'yyyy-MM-dd') === date) || false
      ),
      study: last7Days.map(date => studyData?.some(s => s.date === date) || false),
      selfcare: last7Days.map(date => selfcareData?.some(s => s.date === date) || false),
      workout: last7Days.map(date => workoutData?.some(w => w.date === date) || false),
    });
  };

  const updateTopThree = async (field: string, value: string | boolean) => {
    if (!user) return;

    const updated = { ...topThree, [field]: value };
    setTopThree(updated);

    const { error } = await supabase
      .from('daily_top_three')
      .upsert({
        user_id: user.id,
        date: today,
        ...updated,
      });

    if (field.startsWith('completed_') && value === true) {
      const allCompleted = updated.completed_1 && updated.completed_2 && updated.completed_3;
      if (allCompleted) {
        await supabase.rpc('add_points', { user_id: user.id, points_to_add: 20 });
      }
    }
  };

  const updateDailyNote = async (note: string) => {
    if (!user) return;

    setDailyNote(note);

    await supabase
      .from('daily_notes')
      .upsert({
        user_id: user.id,
        date: today,
        note,
      });
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
            {[1, 2, 3].map((num) => {
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
                    onChange={(e) => updateTopThree(taskKey, e.target.value)}
                    placeholder={`Task ${num}`}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none ${
                      topThree[completedKey] ? 'line-through text-gray-400' : ''
                    }`}
                  />
                </div>
              );
            })}
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
            placeholder="What's on your mind today?"
            className="w-full h-32 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none resize-none"
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-6 shadow-xl"
      >
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Flame className="text-orange-500" size={24} />
          Weekly Streaks
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 mb-2">Tasks</h3>
            <StreakBar completed={streaks.tasks} />
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 mb-2">Study</h3>
            <StreakBar completed={streaks.study} />
          </div>
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 mb-2">Self Care</h3>
            <StreakBar completed={streaks.selfcare} />
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 mb-2">Workout</h3>
            <StreakBar completed={streaks.workout} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
