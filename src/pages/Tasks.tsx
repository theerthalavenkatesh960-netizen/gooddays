import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle2, RotateCcw, Trash2, Filter } from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const categories = ['Home', 'Admin', 'Study', 'Personal', 'Fun'];
const priorities = ['low', 'medium', 'high'];

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Personal');
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [filterView, setFilterView] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setTasks(data);
  };

  const addTask = async () => {
    if (!user || !newTask.trim()) return;

    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: newTask,
      category: selectedCategory,
      priority: selectedPriority,
      status: 'pending',
    });

    if (!error) {
      setNewTask('');
      loadTasks();
    }
  };

  const toggleTask = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const completed_at = newStatus === 'completed' ? new Date().toISOString() : null;

    await supabase
      .from('tasks')
      .update({ status: newStatus, completed_at })
      .eq('id', task.id);

    if (newStatus === 'completed' && user) {
      await supabase.rpc('add_points', { user_id: user.id, points_to_add: 10 });
    }

    loadTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    loadTasks();
  };

  const getFilteredTasks = () => {
    let filtered = tasks;

    if (filterView === 'today') {
      filtered = filtered.filter(
        (t) => !t.due_date || isToday(parseISO(t.due_date))
      );
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

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={addTask}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add
          </motion.button>
        </div>

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
                task.status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleTask(task)}
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="text-emerald-500" size={24} />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  )}
                </motion.button>

                <div className="flex-1">
                  <h3
                    className={`font-semibold ${
                      task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'
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
                  </div>
                </div>

                <div className="flex gap-2">
                  {task.status === 'completed' && (
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
                    onClick={() => deleteTask(task.id)}
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
    </div>
  );
}
