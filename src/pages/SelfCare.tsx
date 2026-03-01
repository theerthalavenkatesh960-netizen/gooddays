import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

export default function SelfCare() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [template, setTemplate] = useState<any[]>([]);
  const [todayLogs, setTodayLogs] = useState<Set<string>>(new Set());
  const [newItem, setNewItem] = useState({ category: 'AM', item: '' });
  const [completionPercent, setCompletionPercent] = useState(0);
  const [streak, setStreak] = useState(0);
  // per-template streak counts
  const [itemStreaks, setItemStreaks] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user) {
      loadTemplate();
      loadTodayLogs();
      loadStreak();
    }
  }, [user]);

  // when template changes (after loading from server) recalc logs/streaks
  useEffect(() => {
    if (user && template.length > 0) {
      loadTodayLogs();
      loadStreak();
    }
  }, [user, template]);

  const loadTemplate = async () => {
    if (!user) return;
    // fetch saved template items from backend
    const data = await api.getSelfCareTemplates(user.id);
    if (data && data.length > 0) {
      setTemplate(data);
    } else {
      // fallback defaults and persist them
      const defaultItems = [
        { category: 'AM', item: 'Face Wash', order_index: 0 },
        { category: 'AM', item: 'Moisturizer', order_index: 1 },
        { category: 'AM', item: 'Sunscreen', order_index: 2 },
        { category: 'PM', item: 'Cleanse', order_index: 3 },
        { category: 'PM', item: 'Treatment', order_index: 4 },
        { category: 'PM', item: 'Moisturize', order_index: 5 },
        { category: 'Hair', item: 'Serum', order_index: 6 },
        { category: 'Hair', item: 'Scalp Care', order_index: 7 },
      ];
      setTemplate(defaultItems);
      // optionally persist defaults for user
      defaultItems.forEach(async (it) => {
        await api.createSelfCareTemplate(user.id, it.category, it.item, it.order_index);
      });
    }
  };

  const loadTodayLogs = async () => {
    if (!user) return;

    const data = await api.getSelfCareActivities(user.id);
    if (data) {
      const todayActivities = data.filter(d => format(new Date(d.date), 'yyyy-MM-dd') === today);
      let completed = new Set(todayActivities.map((log) => log.id));

      // if no logs today but there were some yesterday, auto-copy them
      if (todayActivities.length === 0) {
        const yesterday = format(new Date(new Date().setDate(new Date().getDate() - 1)), 'yyyy-MM-dd');
        const yesterdayActivities = data.filter(d => format(new Date(d.date), 'yyyy-MM-dd') === yesterday);
        if (yesterdayActivities.length > 0) {
          for (const y of yesterdayActivities) {
            await api.createSelfCareActivity(user.id, new Date(today), y.templateId, true);
          }
          // re-fetch to get the newly created entries with their ids
          const refreshed = await api.getSelfCareActivities(user.id);
          const newToday = refreshed.filter(d => format(new Date(d.date), 'yyyy-MM-dd') === today);
          completed = new Set(newToday.map((log) => log.id));
        }
      }

      setTodayLogs(completed);

      const total = template.length;
      const done = completed.size;
      setCompletionPercent(total > 0 ? Math.round((done / total) * 100) : 0);
    }
  };

  const loadStreak = async () => {
    if (!user) return;

    const data = await api.getSelfCareActivities(user.id);

    if (data && data.length > 0) {
      const uniqueDates = Array.from(new Set(data.map((l) => format(new Date(l.date), 'yyyy-MM-dd')))).sort().reverse();
      let streakCount = 0;
      let currentDate = new Date();

      for (const dateStr of uniqueDates) {
        const logDate = new Date(dateStr);
        const dayDiff = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dayDiff === streakCount) {
          streakCount++;
          currentDate = logDate;
        } else {
          break;
        }
      }

      setStreak(streakCount);
      // compute per-item streaks
      const streaks: Record<string, number> = {};
      template.forEach((tpl) => {
        let count = 0;
        let check = new Date();
        while (true) {
          const key = format(check, 'yyyy-MM-dd');
          const found = data.some(
            (s) => format(new Date(s.date), 'yyyy-MM-dd') === key && s.templateId === tpl.id && s.completed
          );
          if (found) {
            count++;
            check.setDate(check.getDate() - 1);
          } else break;
        }
        streaks[tpl.id] = count;
      });
      setItemStreaks(streaks);
    }
  };

  const toggleItem = async (templateId: number) => {
    if (!user) return;

    const isCompleted = todayLogs.has(templateId);
    const newLogs = new Set(todayLogs);
    const todayDate = new Date();

    if (isCompleted) {
      newLogs.delete(templateId);
      // remove log entry if exists
      const activities = await api.getSelfCareActivities(user.id);
      const log = activities.find(
        (a: any) => a.templateId === templateId && format(new Date(a.date), 'yyyy-MM-dd') === format(todayDate, 'yyyy-MM-dd')
      );
      if (log) await api.deleteSelfCareActivity(log.id);
    } else {
      newLogs.add(templateId);
      await api.createSelfCareActivity(user.id, todayDate, templateId, true);
      await api.addPoints(user.id, 'selfcare_activity', 15);
    }

    setTodayLogs(newLogs);
    const percent = Math.round((newLogs.size / template.length) * 100);
    setCompletionPercent(percent);
    loadStreak();
  };

  const addItem = async () => {
    if (!user || !newItem.item.trim()) return;

    // create template on server
    await api.createSelfCareTemplate(user.id, newItem.category, newItem.item, template.length);
    setNewItem({ category: 'AM', item: '' });
    loadTemplate();
  };

  const deleteItem = async (id: number) => {
    await api.deleteSelfCareTemplate(id);
    loadTemplate();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'AM':
        return 'from-yellow-400 to-orange-400';
      case 'PM':
        return 'from-blue-400 to-indigo-400';
      case 'Hair':
        return 'from-pink-400 to-rose-400';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const categories = ['AM', 'PM', 'Hair'];

  return (
    <div>
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
        Self Care
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Today's Completion</h3>
          <div className="text-4xl font-bold text-pink-600 mb-3">{completionPercent}%</div>
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPercent}%` }}
              className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded-full"
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Streak</h3>
          <div className="text-4xl font-bold text-orange-600">{streak} days</div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-xl mb-6"
      >
        <h2 className="text-xl font-bold mb-4">Add New Item</h2>
        <div className="flex gap-3">
          <select
            value={newItem.category}
            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
            className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newItem.item}
            onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
            placeholder="Item name..."
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={addItem}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold flex items-center gap-2"
          >
            <Plus size={20} />
            Add
          </motion.button>
        </div>
      </motion.div>

      <div className="space-y-6">
        {categories.map((category) => {
          const items = template.filter((item) => item.category === category);
          if (items.length === 0) return null;

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl"
            >
              <div className={`inline-block px-4 py-2 rounded-xl bg-gradient-to-r ${getCategoryColor(category)} text-white font-bold mb-4`}>
                {category}
              </div>

              <div className="space-y-2">
                {items.map((item) => {
                  const isCompleted = todayLogs.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleItem(item.id)}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="text-emerald-500" size={24} />
                          ) : (
                            <Circle className="text-gray-300" size={24} />
                          )}
                        </motion.button>
                        <span
                          className={`font-medium ${
                            isCompleted ? 'line-through text-gray-400' : 'text-gray-800'
                          }`}
                        >
                          {item.item}
                        </span>
                        {itemStreaks[item.id] > 0 && (
                          <span className="text-xs text-gray-500 ml-2">
                            🔁 {itemStreaks[item.id]}d
                          </span>
                        )}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => deleteItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
