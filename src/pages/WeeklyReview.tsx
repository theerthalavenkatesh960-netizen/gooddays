import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BookOpen, Dumbbell, CheckCircle2, Zap, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import * as api from '../lib/api';

export default function WeeklyReview() {
  const [review, setReview] = useState<any>(null);
  const [reflection, setReflection] = useState('');
  const [wins, setWins] = useState('');
  const [improvements, setImprovements] = useState('');
  const [nextWeekFocus, setNextWeekFocus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReview();
  }, []);

  async function loadReview() {
    try {
      const data = await api.getCurrentWeekReview();
      setReview(data);
      if (data) {
        setWins(data.wins || '');
        setImprovements(data.improvements || '');
        setNextWeekFocus(data.nextWeekFocus || '');
        setReflection(data.reflection || '');
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function saveReview() {
    if (!review) return;
    setSaving(true);
    try {
      await api.upsertWeeklyReview({
        ...review,
        wins,
        improvements,
        nextWeekFocus,
        reflection,
      });
      setReview(p => ({ ...p, wins, improvements, nextWeekFocus, reflection }));
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (!review) {
    return (
      <div className="text-center py-16">
        <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Initial review will be created next week</p>
      </div>
    );
  }

  const stats = [
    { icon: CheckCircle2, label: 'Tasks Completed', value: review.tasksCompleted || 0, color: 'emerald' },
    { icon: Dumbbell, label: 'Workout Days', value: review.workoutDays || 0, color: 'blue' },
    { icon: BookOpen, label: 'Study Hours', value: (review.studyHours || 0).toFixed(1), color: 'purple' },
    { icon: Zap, label: 'Avg Mood', value: (review.moodAverage || 0).toFixed(1), color: 'amber' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Weekly Review</h1>
        <p className="text-gray-500 mt-0.5">Reflect on your week & plan ahead</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map((stat, idx) => (
          <motion.div key={idx} whileHover={{ y: -4 }} className={`bg-gradient-to-br from-${stat.color}-500/10 to-${stat.color}-600/10 border border-${stat.color}-200 rounded-2xl p-4`}>
            <stat.icon size={20} className={`text-${stat.color}-500 mb-2`} />
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 className="font-bold text-lg text-gray-900 mb-4">💪 Wins This Week</h2>
          <textarea value={wins} onChange={e => setWins(e.target.value)} placeholder="What went well? What are you proud of?"
            className="w-full h-24 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 className="font-bold text-lg text-gray-900 mb-4">🔄 Areas to Improve</h2>
          <textarea value={improvements} onChange={e => setImprovements(e.target.value)} placeholder="What didn't go as planned? What can you do better?"
            className="w-full h-24 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 className="font-bold text-lg text-gray-900 mb-4">🎯 Focus for Next Week</h2>
          <textarea value={nextWeekFocus} onChange={e => setNextWeekFocus(e.target.value)} placeholder="What's your priority for next week?"
            className="w-full h-24 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 className="font-bold text-lg text-gray-900 mb-4">📝 General Reflection</h2>
          <textarea value={reflection} onChange={e => setReflection(e.target.value)} placeholder="Anything else on your mind?"
            className="w-full h-24 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
        </div>

        <motion.button whileTap={{ scale: 0.95 }} onClick={saveReview} disabled={saving}
          className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Review'}
        </motion.button>
      </div>
    </div>
  );
}
