import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle2, RotateCcw, Trash2, Filter } from 'lucide-react';
import { format, isToday, isPast, parseISO, addDays, startOfWeek, isSameDay } from 'date-fns';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

const categories = ['Home', 'Admin', 'Study', 'Personal', 'Fun'];
const priorities = ['low', 'medium', 'high'];

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Personal');
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [recurring, setRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<'days'|'weeks'|'months'|'years'>('days');
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [recurrenceStart, setRecurrenceStart] = useState('');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [filterView, setFilterView] = useState('today');
  const [filterCategory, setFilterCategory] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ taskId: string; isRecurring: boolean } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;

    const data = await api.getTasks(user.id);
    if (data && data.length > 0) setTasks(data);
  };

  const addTask = async () => {
    if (!user || !newTask.trim()) return;
    await api.createTask({
      userId: user.id,
      title: newTask,
      category: selectedCategory,
      priority: selectedPriority,
      dueDate: undefined,
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
    });
    setNewTask('');
    setRecurring(false);
    setRecurrenceInterval(1);
    setRecurrenceUnit('days');
    setRecurrenceDays([]);
    setRecurrenceStart('');
    setRecurrenceEnd('');
    loadTasks();
  };

  const toggleTask = async (task: any) => {
    const isCompleted = !task.isCompleted;
    await api.updateTask(task.id, { isCompleted });

    if (isCompleted && user) {
      await api.addPoints(user.id, 'task_completed', 10);
    }

    loadTasks();
  };

  const deleteTask = async (id: string, deleteMode: 'this' | 'series' = 'this') => {
    await api.deleteTask(id, deleteMode);
    setDeleteConfirm(null);
    loadTasks();
  };

  const getFilteredTasks = () => {
    let filtered = tasks;

    // Primary filtering by selectedDate (if present)
    if (selectedDate) {
      filtered = filtered.filter((t) => {
        if (!t.due_date) return false;
        try {
          return isSameDay(parseISO(t.due_date), selectedDate);
        } catch {
          return false;
        }
      });
    } else if (filterView === 'today') {
      filtered = filtered.filter((t) => !t.due_date || isToday(parseISO(t.due_date)));
    } else if (filterView === 'overdue') {
      filtered = filtered.filter(
        (t) => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)) && t.status !== 'completed'
      );
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
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
        Tasks
      </h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-xl mb-6"
      >
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add a new task..."
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
          >
            {priorities.map((pri) => (
              <option key={pri} value={pri}>
                {pri.charAt(0).toUpperCase() + pri.slice(1)}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => {
                const val = e.target.checked;
                setRecurring(val);
                if (!val) {
                  setRecurrenceInterval(1);
                  setRecurrenceUnit('days');
                  setRecurrenceDays([]);
                  setMonthlyDay(1);
                  setRecurrenceStart('');
                  setRecurrenceEnd('');
                }
              }}
            />
            <span className="text-sm">Recurring</span>
          </label>
        </div>

        {recurring && (
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-sm">Every</label>
              <input
                type="number"
                min={1}
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(parseInt(e.target.value, 10) || 1)}
                className="w-16 px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
              />
              <select
                value={recurrenceUnit}
                onChange={(e) => setRecurrenceUnit(e.target.value as any)}
                className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
              >
                <option value="days">day(s)</option>
                <option value="weeks">week(s)</option>
                <option value="months">month(s)</option>
                <option value="years">year(s)</option>
              </select>
            </div>

            {recurrenceUnit === 'weeks' && (
              <div className="flex items-center gap-2">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => (
                  <label key={day} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={recurrenceDays.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) setRecurrenceDays([...recurrenceDays, day]);
                        else setRecurrenceDays(recurrenceDays.filter(d => d !== day));
                      }}
                    />
                    <span className="text-xs">{day}</span>
                  </label>
                ))}
              </div>
            )}

            {recurrenceUnit === 'months' && (
              <div className="flex items-center gap-2">
                <label className="text-sm">on day</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={monthlyDay}
                  onChange={(e) => setMonthlyDay(parseInt(e.target.value, 10) || 1)}
                  className="w-16 px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
            )}

            <div className="flex gap-3">
              <input
                type="date"
                value={recurrenceStart}
                onChange={(e) => setRecurrenceStart(e.target.value)}
                className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
                placeholder="Start"
              />
              <input
                type="date"
                value={recurrenceEnd}
                onChange={(e) => setRecurrenceEnd(e.target.value)}
                className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
                placeholder="End"
              />
            </div>
          </div>
        )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={addTask}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add
          </motion.button>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterView('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterView === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterView('today')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterView === 'today'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setFilterView('overdue')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterView === 'overdue'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Overdue
          </button>

          <div className="ml-auto flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Date selector & selected date header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">{format(selectedDate, 'EEEE, MMM d')}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              ◀ Week
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              Week ▶
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {Array.from({ length: 7 }).map((_, i) => {
              const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
              const d = addDays(weekStart, i);
              const isSelected = isSameDay(d, selectedDate);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDate(d)}
                  className={`min-w-[88px] flex-shrink-0 px-3 py-2 rounded-xl text-center border ${isSelected ? 'bg-emerald-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  <div className="text-xs">{format(d, 'EEE')}</div>
                  <div className="font-semibold">{format(d, 'd')}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {filteredTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-all ${
                task.isCompleted ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleTask(task)}
                >
                  {task.isCompleted ? (
                    <CheckCircle2 className="text-emerald-500" size={24} />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  )}
                </motion.button>

                <div className="flex-1">
                  <h3
                    className={`font-semibold ${
                      task.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'
                    }`}
                  >
                    {task.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {task.category}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.due_date && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                        {format(parseISO(task.due_date), 'MMM d')}
                      </span>
                    )}
                    {task.recurring && (
                      <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                        {`every ${task.recurrenceType || 'day'}`}
                        {task.recurrenceType === 'weekly' && task.recurrenceDays && ` (${(task.recurrenceDays as string[]).join(',')})`}
                        {task.recurrenceType === 'monthly' && task.recurrenceDays && ` day ${(task.recurrenceDays as string[])[0]}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {task.isCompleted && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleTask(task)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                    >
                      <RotateCcw size={18} />
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setDeleteConfirm({ taskId: task.id, isRecurring: task.recurring })}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
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
              <p className="text-gray-600 mb-6">Are you sure you want to delete this task?</p>
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
    </div>
  );
}
