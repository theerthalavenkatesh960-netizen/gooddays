import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, BookOpen, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

export default function Study() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [todayMinutes, setTodayMinutes] = useState('');
  const [todayNotes, setTodayNotes] = useState('');
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [studyStreak, setStudyStreak] = useState(0);

  useEffect(() => {
    if (user) {
      loadTodaySession();
      loadWeeklyMinutes();
      loadStreak();
    }
  }, [user]);

  const loadTodaySession = async () => {
    if (!user) return;
    const data = await api.getStudySessions(user.id);
    if (data && data.length > 0) {
      const todaySession = data.find(
        (s: any) => format(new Date(s.date), 'yyyy-MM-dd') === today
      );
      if (todaySession) {
        setTodayMinutes(todaySession.durationMinutes?.toString() || '');
        setTodayNotes(todaySession.notes || '');
      }
    }
  };

  const loadWeeklyMinutes = async () => {
    if (!user) return;
    const data = await api.getStudySessions(user.id);
    if (data && data.length > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 6);
      const total = data
        .filter((s: any) => new Date(s.date) >= cutoff)
        .reduce((sum: number, s: any) => sum + (s.durationMinutes || 0), 0);
      setWeeklyMinutes(total);
    }
  };

  const loadStreak = async () => {
    if (!user) return;
    const data = await api.getStudySessions(user.id);
    if (data && data.length > 0) {
      let streak = 0;
      for (let i = 0; i < 7; i++) {
        const day = format(
          new Date(new Date().setDate(new Date().getDate() - i)),
          'yyyy-MM-dd'
        );
        if (
          data.some(
            (s: any) => format(new Date(s.date), 'yyyy-MM-dd') === day &&
              s.durationMinutes > 0
          )
        ) {
          streak++;
        } else {
          break;
        }
      }
      setStudyStreak(streak);
    }
  };

  const saveToday = async () => {
    if (!user) return;
    const data = await api.getStudySessions(user.id);
    const todaySession = data.find(
      (s: any) => format(new Date(s.date), 'yyyy-MM-dd') === today
    );
    if (todaySession) {
      await api.updateStudySession(todaySession.id, parseInt(todayMinutes, 10) || 0, todayNotes, new Date(today));
    } else {
      await api.createStudySession(user.id, parseInt(todayMinutes, 10) || 0, todayNotes, new Date(today));
    }
    loadWeeklyMinutes();
    loadStreak();
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
        Study Sessions
      </h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4">
          <div className="text-sm font-semibold text-gray-600 mb-1">
            This Week
          </div>
          <div className="text-2xl font-bold text-green-600">
            {weeklyMinutes} min
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4">
          <div className="text-sm font-semibold text-gray-600 mb-1">
            Streak
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {studyStreak} day{studyStreak !== 1 && 's'}
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-xl space-y-6"
      >
        <h2 className="text-2xl font-bold mb-4">Today's Session</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minutes
          </label>
          <input
            type="number"
            value={todayMinutes}
            onChange={(e) => setTodayMinutes(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={todayNotes}
            onChange={(e) => setTodayNotes(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 outline-none"
            rows={3}
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={saveToday}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          Save
        </motion.button>
      </motion.div>
    </div>
  );
}
