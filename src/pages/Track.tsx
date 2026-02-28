import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Dumbbell, Smartphone, Sun, Smile } from 'lucide-react';
import { format } from 'date-fns';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

export default function Track() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [todayData, setTodayData] = useState({
    sleep_hours: 0,
    workout_minutes: 0,
    phone_minutes: 0,
    sunlight: false,
    mood: 3,
  });

  const [weeklyAverages, setWeeklyAverages] = useState({
    sleep: 0,
    workout: 0,
    phone: 0,
    mood: 0,
  });

  useEffect(() => {
    if (user) {
      loadTodayData();
      loadWeeklyAverages();
    }
  }, [user]);

  const loadTodayData = async () => {
    if (!user) return;

    // Data would be from self care activities or similar
    const data = await api.getSelfCareActivities(user.id);
    if (data && data.length > 0) {
      const today_data = data.find(d => format(new Date(d.date), 'yyyy-MM-dd') === today);
      if (today_data) {
        setTodayData({
          sleep_hours: 0,
          workout_minutes: today_data.durationMinutes || 0,
          phone_minutes: 0,
          sunlight: false,
          mood: 3,
        });
      }
    }
  };

  const loadWeeklyAverages = async () => {
    if (!user) return;

    const data = await api.getSelfCareActivities(user.id);

    if (data && data.length > 0) {
      const avg = {
        sleep: 7,
        workout: data.reduce((sum, d) => sum + (d.durationMinutes || 0), 0) / data.length,
        phone: 0,
        mood: 3,
      };
      setWeeklyAverages(avg);
    }
  };

  const updateData = async (field: string, value: any) => {
    if (!user) return;

    const updated = { ...todayData, [field]: value };
    setTodayData(updated);

    if (field === 'workout_minutes' && value > 0) {
      await api.addPoints(user.id, 'workout', 10);
    }

    loadWeeklyAverages();
  };

  const moodEmojis = ['😢', '😕', '😐', '😊', '😄'];

  return (
    <div>
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
        Daily Tracker
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4">
          <div className="text-sm font-semibold text-gray-600 mb-1">Avg Sleep</div>
          <div className="text-2xl font-bold text-blue-600">{weeklyAverages.sleep.toFixed(1)}h</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4">
          <div className="text-sm font-semibold text-gray-600 mb-1">Avg Workout</div>
          <div className="text-2xl font-bold text-green-600">{Math.round(weeklyAverages.workout)}m</div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-4">
          <div className="text-sm font-semibold text-gray-600 mb-1">Avg Phone</div>
          <div className="text-2xl font-bold text-red-600">{Math.round(weeklyAverages.phone)}m</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-4">
          <div className="text-sm font-semibold text-gray-600 mb-1">Avg Mood</div>
          <div className="text-2xl">{moodEmojis[Math.round(weeklyAverages.mood) - 1] || '😐'}</div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-xl space-y-6"
      >
        <h2 className="text-2xl font-bold mb-4">Today's Metrics</h2>

        <div>
          <div className="flex items-center gap-3 mb-3">
            <Moon className="text-blue-500" size={24} />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Sleep Hours</label>
              <input
                type="number"
                step="0.5"
                value={todayData.sleep_hours}
                onChange={(e) => updateData('sleep_hours', parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-3">
            <Dumbbell className="text-green-500" size={24} />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Workout Minutes</label>
              <input
                type="number"
                value={todayData.workout_minutes}
                onChange={(e) => updateData('workout_minutes', parseInt(e.target.value) || 0)}
                className="w-full mt-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-3">
            <Smartphone className="text-red-500" size={24} />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Phone Screen Time (minutes)</label>
              <input
                type="number"
                value={todayData.phone_minutes}
                onChange={(e) => updateData('phone_minutes', parseInt(e.target.value) || 0)}
                className="w-full mt-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-3">
            <Sun className="text-yellow-500" size={24} />
            <label className="text-sm font-medium text-gray-700">Got Sunlight?</label>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => updateData('sunlight', !todayData.sunlight)}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              todayData.sunlight
                ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {todayData.sunlight ? 'Yes, got some sun!' : 'No sunlight yet'}
          </motion.button>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-3">
            <Smile className="text-pink-500" size={24} />
            <label className="text-sm font-medium text-gray-700">How's your mood?</label>
          </div>
          <div className="flex gap-3 justify-between">
            {[1, 2, 3, 4, 5].map((mood) => (
              <motion.button
                key={mood}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => updateData('mood', mood)}
                className={`flex-1 py-4 rounded-xl text-3xl transition-all ${
                  todayData.mood === mood
                    ? 'bg-gradient-to-r from-pink-400 to-rose-400 scale-110 shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {moodEmojis[mood - 1]}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
