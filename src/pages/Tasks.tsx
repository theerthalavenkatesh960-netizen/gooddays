import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle2, RotateCcw, Trash2, Filter, Edit, Home, Briefcase, BookOpen, User, Heart, DollarSign, ShoppingCart, Users, Film, HeartPulse, Plane, Music, Dumbbell, Bell } from 'lucide-react';
import { format, isToday, isPast, parseISO, addDays, startOfWeek, isSameDay } from 'date-fns';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';
import Reminders from './Reminders';

// a richer set of categories with icons for wellness tracking
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
const priorities = ['low', 'medium', 'high'];

export default function Tasks() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'tasks' | 'reminders'>('tasks');
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_OPTIONS[0].name);
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [recurring, setRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(0);
  const [recurrenceUnit, setRecurrenceUnit] = useState<'days'|'weeks'|'months'|'years'>('days');
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
  const [monthlyDay, setMonthlyDay] = useState<number>(0);
  const [recurrenceStart, setRecurrenceStart] = useState('');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [filterView, setFilterView] = useState('today');
  const [filterCategory, setFilterCategory] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ taskId: number; isRecurring: boolean } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // when recurrence toggle flips, initialize default date range
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

  // Show completion history and missed count without treating future dates as missed.
const renderOccurrences = (task: any) => {
  if (!task.recurrenceId) return null;

  const selected = new Date(selectedDate);
  selected.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // For future views, evaluate history only through today.
  const historyCutoff = selected > today ? today : selected;

  const seriesHistory = tasks.filter((t) => {
    if (t.recurrenceId !== task.recurrenceId) return false;

    const dueValue = t.dueDate || t.due_date;
    if (!dueValue) return false;

    const due = new Date(dueValue);
    due.setHours(0, 0, 0, 0);
    return due <= historyCutoff;
  });

  const completedOccurrences = seriesHistory
    .filter((t) => t.isCompleted || t.status === 'completed')
    .sort((a, b) => {
      const da = new Date(a.dueDate || a.due_date).getTime();
      const db = new Date(b.dueDate || b.due_date).getTime();
      return db - da;
    })
    .slice(0, 10);

  const missedCount = seriesHistory.filter((t) => !(t.isCompleted || t.status === 'completed')).length;

  if (completedOccurrences.length === 0 && missedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 mr-2">
      {completedOccurrences.length > 0 && (
        <div className="flex items-center gap-1">
          {completedOccurrences.map((t, i) => (
            <span
              key={t.id || i}
              title={new Date(t.dueDate || t.due_date).toLocaleDateString()}
              className="inline-flex w-4 h-4 items-center justify-center text-white border bg-emerald-500 border-emerald-600"
            >
              ✓
            </span>
          ))}
        </div>
      )}
      <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
        Missed: {missedCount}
      </span>
    </div>
  );
};

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;

    const data = await api.getTasks(user.id);
    setTasks(Array.isArray(data) ? data : []);
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
      recurrenceDays:
        recurrenceUnit === 'weeks'
          ? recurrenceDays
          : recurrenceUnit === 'months'
          ? [monthlyDay.toString()]
          : undefined,
    };

    // if not recurring and a scheduled date provided, send it as dueDate
    if (!recurring && scheduledDate) {
      body.dueDate = new Date(scheduledDate);
    }

    // ensure recurrence defaults on creation/edit
    if (recurring) {
      if (!body.recurrenceStartDate) body.recurrenceStartDate = new Date();
      if (!body.recurrenceEndDate) {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        body.recurrenceEndDate = d;
      }
    }

    if (editingTask) {
      await api.updateTask(editingTask.id, body);
    } else {
      await api.createTask(body);
    }

    // reset form
    setNewTask('');
    setScheduledDate('');
    setRecurring(false);
    setRecurrenceInterval(1);
    setRecurrenceUnit('days');
    setRecurrenceDays([]);
    setRecurrenceStart('');
    setRecurrenceEnd('');
    setShowAddModal(false);
    setEditingTask(null);
    loadTasks();
  };

  const openEditModal = (task: any) => {
    setEditingTask(task);
    setNewTask(task.title || '');
    setSelectedCategory(task.category || 'Personal');
    setSelectedPriority(task.priority || 'medium');
    setRecurring(!!task.recurring);
    setRecurrenceInterval(task.recurrenceInterval || 1);
    setRecurrenceUnit(task.recurrenceUnit || 'days');
    setRecurrenceDays(task.recurrenceDays || []);
    setMonthlyDay(
      task.recurrenceUnit === 'months' && task.recurrenceDays && task.recurrenceDays[0]
        ? parseInt(task.recurrenceDays[0], 10)
        : 1
    );
    setRecurrenceStart(task.recurrenceStartDate ? format(parseISO(task.recurrenceStartDate), 'yyyy-MM-dd') : '');
    setRecurrenceEnd(task.recurrenceEndDate ? format(parseISO(task.recurrenceEndDate), 'yyyy-MM-dd') : '');
    setScheduledDate(task.dueDate ? format(parseISO(task.dueDate), 'yyyy-MM-dd') : '');
    setShowAddModal(true);
  };

  const toggleTask = async (task: any) => {
    const isCompleted = !task.isCompleted;
    await api.updateTask(task.id, { isCompleted });

    if (isCompleted && user) {
      await api.addPoints(user.id, 'task_completed', 1);
    }

    loadTasks();
  };

  const deleteTask = async (id: number, deleteMode: 'this' | 'series' = 'this') => {
    await api.deleteTask(id, deleteMode);
    setDeleteConfirm(null);
    loadTasks();
  };

  const getFilteredTasks = () => {
    let filtered = tasks;

    // Primary filtering by selectedDate (if present)
    if (selectedDate) {
      filtered = filtered.filter((t) => {
        const due = t.dueDate ?? t.due_date;
        if (!due) return false;
        try {
          return isSameDay(parseISO(due), selectedDate);
        } catch {
          return false;
        }
      });
    } else if (filterView === 'today') {
      filtered = filtered.filter((t) => {
        const due = t.dueDate ?? t.due_date;
        return !due || isToday(parseISO(due));
      });
    } else if (filterView === 'overdue') {
      filtered = filtered.filter((t) => {
        const due = t.dueDate ?? t.due_date;
        return due && isPast(parseISO(due)) && !isToday(parseISO(due)) && t.status !== 'completed';
      });
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === filterCategory);
    }

    return filtered;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div>
      <h1 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
        Tasks & Reminders
      </h1>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-3 sm:mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${activeTab === 'tasks' ? 'bg-white text-emerald-700 shadow-md' : 'text-gray-500 hover:text-gray-800'}`}
        >
          Tasks
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${activeTab === 'reminders' ? 'bg-white text-emerald-700 shadow-md' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <Bell size={14} /> Reminders
        </button>
      </div>

      {activeTab === 'reminders' && <Reminders />}
      {activeTab === 'tasks' && <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-3 sm:p-5 shadow-xl mb-3 sm:mb-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingTask(null); setShowAddModal(true); }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-500 text-white rounded-lg font-semibold text-xs sm:text-sm flex items-center gap-1.5"
            >
              <Plus size={16} /> New Task
            </button>
            <div className="text-xs sm:text-sm text-gray-500">Click to open task dialog</div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar whitespace-nowrap pb-1">
          <button
            onClick={() => setFilterView('all')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex-shrink-0 ${
              filterView === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterView('today')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex-shrink-0 ${
              filterView === 'today'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setFilterView('overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex-shrink-0 ${
              filterView === 'overdue'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Overdue
          </button>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter size={16} className="text-gray-500" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-sm border border-gray-200 outline-none"
            >
              <option value="all">All Categories</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Date selector & selected date header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base sm:text-lg font-semibold">{format(selectedDate, 'EEEE, MMM d')}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              className="px-2.5 py-1 rounded-lg text-xs sm:text-sm bg-gray-100 hover:bg-gray-200"
            >
              ◀ Week
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-2.5 py-1 rounded-lg text-xs sm:text-sm bg-gray-100 hover:bg-gray-200"
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              className="px-2.5 py-1 rounded-lg text-xs sm:text-sm bg-gray-100 hover:bg-gray-200"
            >
              Week ▶
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-1.5 pb-1.5">
            {Array.from({ length: 7 }).map((_, i) => {
              const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
              const d = addDays(weekStart, i);
              const isSelected = isSameDay(d, selectedDate);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDate(d)}
                  className={`flex-1 min-w-0 px-2 py-2 rounded-lg text-center border ${isSelected ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className="text-[11px] sm:text-xs">{format(d, 'EEE')}</div>
                  <div className="font-semibold text-sm sm:text-base">{format(d, 'd')}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {/* Add Task Modal */}
        {showAddModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-semibold mb-4">
                {editingTask ? 'Edit Task' : 'Create Task'}
              </h3>
              <div className="space-y-3">
                <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Task title" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    {CATEGORY_OPTIONS.map((c) => {
                      const Icon = c.icon;
                      const selected = selectedCategory === c.name;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setSelectedCategory(c.name)}
                          className={`flex items-center gap-1 px-3 py-1 rounded-full border transition-all ${
                            selected
                              ? 'bg-emerald-500 text-white border-emerald-600'
                              : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          <Icon size={14} />
                          <span className="text-xs">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200">
                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={recurring} onChange={(e) => { setRecurring(e.target.checked); }} /> Recurring
                  </label>
                </div>

                {!recurring && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Schedule for</label>
                    <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200" />
                  </div>
                )}

                {recurring && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm">Every</label>
                      <input type="number" value={recurrenceInterval === 0 ? '' : recurrenceInterval} onChange={(e) => setRecurrenceInterval(e.target.value === '' ? 0 : parseInt(e.target.value, 10))} className="w-16 px-3 py-2 rounded-xl border border-gray-200" />
                      <select value={recurrenceUnit} onChange={(e) => setRecurrenceUnit(e.target.value as any)} className="px-3 py-2 rounded-xl border border-gray-200">
                        <option value="days">day(s)</option>
                        <option value="weeks">week(s)</option>
                        <option value="months">month(s)</option>
                        <option value="years">year(s)</option>
                      </select>
                    </div>

                    {recurrenceUnit === 'weeks' && (
                      <div className="flex gap-2">
                        {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => (
                          <label key={d} className="flex items-center gap-1">
                            <input type="checkbox" checked={recurrenceDays.includes(d)} onChange={(e) => { if (e.target.checked) setRecurrenceDays([...recurrenceDays, d]); else setRecurrenceDays(recurrenceDays.filter(x => x !== d)); }} />
                            <span className="text-xs">{d.slice(0,3)}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {recurrenceUnit === 'months' && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm">on day</label>
                        <input type="number" max={31} value={monthlyDay === 0 ? '' : monthlyDay} onChange={(e) => setMonthlyDay(e.target.value === '' ? 0 : parseInt(e.target.value, 10))} className="w-16 px-3 py-2 rounded-xl border border-gray-200" />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input type="date" value={recurrenceStart} onChange={(e) => setRecurrenceStart(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200" />
                      <input type="date" value={recurrenceEnd} onChange={(e) => setRecurrenceEnd(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200" />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <button onClick={addTask} className="px-4 py-2 bg-emerald-500 text-white rounded-xl">
                    {editingTask ? 'Save' : 'Create'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingTask(null);
                    }}
                    className="px-4 py-2 bg-gray-200 rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        <AnimatePresence>
          {filteredTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-xl p-2.5 sm:p-3 shadow-lg hover:shadow-xl transition-all ${
                task.isCompleted ? 'opacity-60' : ''
              }`}
            >
                <div className="flex items-center gap-2 sm:gap-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleTask(task)}
                >
                  {task.isCompleted ? (
                      <CheckCircle2 className="text-emerald-500" size={20} />
                  ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                </motion.button>

                <div className="flex-1">
                  <h3
                      className={`font-semibold text-sm sm:text-base ${
                      task.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'
                    }`}
                  >
                    {task.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {/* show icon next to category */}
                        {(() => {
                          const opt = CATEGORY_OPTIONS.find(c => c.name === task.category);
                          if (opt) {
                            const Icon = opt.icon;
                            return (
                              <span className="flex items-center gap-1">
                                <Icon size={12} />
                                {task.category}
                              </span>
                            );
                          }
                          return task.category;
                        })()}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {((task.dueDate ?? task.due_date)) && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                        {format(parseISO((task.dueDate ?? task.due_date)), 'EEE, MMM d')}
                      </span>
                    )}
                    {task.recurring && (
                      <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                        Scheduled • series
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* show last 5 occurrences for recurring tasks */}
                  {renderOccurrences(task)}
                  {task.isCompleted && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleTask(task)}
                      className="p-1.5 sm:p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                    >
                      <RotateCcw size={16} />
                    </motion.button>
                  )}
                  {/* edit button */}
                  {!task.isCompleted && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => openEditModal(task)}
                      className="p-1.5 sm:p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit size={16} />
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setDeleteConfirm({ taskId: task.id, isRecurring: task.recurring })}
                    className="p-1.5 sm:p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No tasks found</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setDeleteConfirm(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-4 text-gray-900">Delete Task</h2>
            {deleteConfirm.isRecurring ? (
              <div className="mb-6">
                <p className="text-gray-600 mb-4">This is a recurring task. What would you like to delete?</p>
                <div className="space-y-3">
                  <button
                    onClick={() => deleteTask(deleteConfirm.taskId, 'this')}
                    className="w-full px-4 py-3 bg-yellow-100 text-yellow-700 rounded-xl font-semibold hover:bg-yellow-200 transition-colors"
                  >
                    Delete Only This Task
                  </button>
                  <button
                    onClick={() => deleteTask(deleteConfirm.taskId, 'series')}
                    className="w-full px-4 py-3 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors"
                  >
                    Delete Entire Series
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-gray-600 mb-4">Are you sure you want to delete this task?</p>
                <button
                  onClick={() => deleteTask(deleteConfirm.taskId, 'this')}
                  className="w-full px-4 py-3 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors mb-3"
                >
                  Delete Task
                </button>
              </div>
            )}
            <button
              onClick={() => setDeleteConfirm(null)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>}
    </div>
  );
}
