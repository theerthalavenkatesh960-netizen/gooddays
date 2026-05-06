import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Trash2, X, Clock, ToggleLeft, ToggleRight, Calendar, CheckCircle2, Zap } from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';
import * as api from '../lib/api';

export default function Reminders() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [reminderLogs, setReminderLogs] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<any | null>(null);
  const [newReminder, setNewReminder] = useState({ 
    title: '', 
    time: '09:00', 
    frequency: 'daily', 
    activeDays: 'Mon,Tue,Wed,Thu,Fri',
    isEnabled: true 
  });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadReminders();
  }, []);

  async function loadReminders() {
    try {
      const [remindersData, logsData] = await Promise.all([
        api.getReminders(), 
        api.getReminderHistory()
      ]);
      setReminders(Array.isArray(remindersData) ? remindersData : []);
      setReminderLogs(Array.isArray(logsData) ? logsData : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function createReminder() {
    if (!newReminder.title || !newReminder.time) return;
    try {
      const reminder = await api.createReminder({
        title: newReminder.title,
        time: newReminder.time,
        frequency: newReminder.frequency,
        activeDays: newReminder.frequency === 'daily' ? 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' : newReminder.activeDays || 'Mon,Tue,Wed,Thu,Fri',
        isEnabled: newReminder.isEnabled
      });
      setReminders(p => [...p, reminder]);
      setNewReminder({ title: '', time: '09:00', frequency: 'daily', activeDays: 'Mon,Tue,Wed,Thu,Fri', isEnabled: true });
      setShowCreate(false);
    } catch (e) { console.error(e); }
  }

  async function deleteReminder(id: number) {
    await api.deleteReminder(id);
    setReminders(p => p.filter(r => r.id !== id));
  }

  async function toggleReminder(id: number, enabled: boolean) {
    await api.updateReminder(id, { isEnabled: !enabled });
    setReminders(p => p.map(r => r.id === id ? { ...r, isEnabled: !enabled } : r));
  }

  async function toggleDone(id: number) {
    await api.toggleReminderDone(id);
    loadReminders();
  }

  const get30DayData = (reminderId: number) => {
    const today = new Date();
    const data: { [key: string]: boolean } = {};
    
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const key = format(date, 'yyyy-MM-dd');
      const isComplete = reminderLogs.some(log => 
        log.reminderId === reminderId && 
        format(new Date(log.markedDoneAt || log.date), 'yyyy-MM-dd') === key &&
        log.markedDone
      );
      data[key] = isComplete;
    }
    return data;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reminders</h1>
          <p className="text-gray-500 mt-0.5">Set flexible reminders to build daily habits</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold shadow-md">
          <Plus size={18} /> Add Reminder
        </motion.button>
      </div>

      {reminders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <Bell size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No reminders set</h3>
          <p className="text-gray-400 mb-6">Create reminders to build consistent habits—water, meditation, exercise, etc.</p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-xl font-semibold">
            <Plus size={18} /> Create Reminder
          </motion.button>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map(reminder => {
            const data30Day = get30DayData(reminder.id);
            const completionCount = Object.values(data30Day).filter(Boolean).length;
            
            return (
              <motion.div key={reminder.id} whileHover={{ y: -2 }}
                onClick={() => setSelectedReminder(selectedReminder?.id === reminder.id ? null : reminder)}
                className={`p-4 rounded-2xl shadow-sm border cursor-pointer transition-all ${reminder.isEnabled ? 'bg-white border-gray-100 hover:shadow-md' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className={`font-bold ${reminder.isEnabled ? 'text-gray-900' : 'text-gray-400'}`}>{reminder.title}</p>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                      <Clock size={14} /> {reminder.time} • {reminder.frequency}
                      {reminder.frequency !== 'daily' && reminder.activeDays && (
                        <span className="text-xs">{reminder.activeDays}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); toggleReminder(reminder.id, reminder.isEnabled); }}
                      className="text-gray-400 hover:text-emerald-600">
                      {reminder.isEnabled ? <ToggleRight size={20} className="text-emerald-600" /> : <ToggleLeft size={20} />}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); deleteReminder(reminder.id); }}
                      className="text-gray-300 hover:text-red-400">
                      <Trash2 size={18} />
                    </motion.button>
                  </div>
                </div>

                {/* 30-day Heatmap */}
                <AnimatePresence>
                  {selectedReminder?.id === reminder.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-2">
                        <Calendar size={14} /> Last 30 days: <span className="font-bold text-emerald-600">{completionCount}/30</span>
                      </div>
                      <div className="grid grid-cols-10 gap-1">
                        {Object.entries(data30Day).map(([date, complete], idx) => {
                          const d = new Date(date);
                          return (
                            <motion.div key={idx} title={format(d, 'MMM d')}
                              className={`h-6 rounded-sm transition-all ${complete ? 'bg-emerald-500' : 'bg-gray-200'} hover:ring-2 hover:ring-emerald-400 cursor-default`} />
                          );
                        })}
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        Completion streak: <span className="font-semibold text-emerald-600">{calculateStreak(reminderLogs, reminder.id)}</span> days
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">New Reminder</h2>
                <button onClick={() => setShowCreate(false)}><X size={20} className="text-gray-400" /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Reminder Title</label>
                  <input value={newReminder.title} onChange={e => setNewReminder(p => ({ ...p, title: e.target.value }))} 
                    placeholder="e.g. Drink water, Meditation" 
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Time</label>
                  <input type="time" value={newReminder.time} onChange={e => setNewReminder(p => ({ ...p, time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Frequency</label>
                  <select value={newReminder.frequency} onChange={e => {
                    const freq = e.target.value;
                    setNewReminder(p => ({ 
                      ...p, 
                      frequency: freq,
                      activeDays: freq === 'daily' ? 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' : 'Mon,Tue,Wed,Thu,Fri'
                    }));
                  }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly on specific days</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {newReminder.frequency !== 'daily' && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-2">Active Days</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                        const isActive = newReminder.activeDays.includes(day);
                        return (
                          <motion.button key={day} whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              const days = newReminder.activeDays.split(',').map(d => d.trim());
                              const newDays = isActive 
                                ? days.filter(d => d !== day)
                                : [...days, day];
                              setNewReminder(p => ({ ...p, activeDays: newDays.join(',') }));
                            }}
                            className={`py-2 rounded-lg font-medium text-sm transition-all ${isActive ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {day}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 py-2">
                  <input type="checkbox" checked={newReminder.isEnabled} onChange={e => setNewReminder(p => ({ ...p, isEnabled: e.target.checked }))} 
                    className="w-4 h-4" />
                  <span className="text-sm font-medium">Enable reminder</span>
                </label>
              </div>

              <motion.button whileTap={{ scale: 0.95 }} onClick={createReminder} disabled={!newReminder.title || !newReminder.time}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold disabled:opacity-40">
                Create Reminder
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function calculateStreak(logs: any[], reminderId: number): number {
  let streak = 0;
  let date = new Date();
  
  while (true) {
    const key = format(date, 'yyyy-MM-dd');
    const found = logs.some(l => 
      l.reminderId === reminderId && 
      format(new Date(l.markedDoneAt || l.date), 'yyyy-MM-dd') === key && 
      l.markedDone
    );
    if (!found) break;
    streak++;
    date = subDays(date, 1);
    if (streak > 365) break;
  }
  return streak;
}
