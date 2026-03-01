import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Download,
  DollarSign,
  Calendar,
  ShoppingCart,
  Car,
  Home,
  Coffee,
  Heart,
  Plane,
  BookOpen,
  Tv,
  Lightbulb,
  Shirt,
  Gamepad2,
  Wifi,
  Utensils,
  Fuel,
  Building2,
  Dumbbell,
  Droplet,
  ShoppingBag,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isToday, parseISO } from 'date-fns';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

const CATEGORIES = [
  { name: 'Food', icon: Utensils, color: 'from-orange-400 to-orange-600' },
  { name: 'Groceries', icon: ShoppingCart, color: 'from-green-400 to-green-600' },
  { name: 'Transport', icon: Car, color: 'from-blue-400 to-blue-600' },
  { name: 'Fuel', icon: Fuel, color: 'from-amber-400 to-amber-600' },
  { name: 'Home', icon: Home, color: 'from-purple-400 to-purple-600' },
  { name: 'Rent', icon: Building2, color: 'from-indigo-400 to-indigo-600' },
  { name: 'Utilities', icon: Lightbulb, color: 'from-yellow-400 to-yellow-600' },
  { name: 'Internet', icon: Wifi, color: 'from-cyan-400 to-cyan-600' },
  { name: 'Subscriptions', icon: Tv, color: 'from-pink-400 to-pink-600' },
  { name: 'Personal', icon: Shirt, color: 'from-rose-400 to-rose-600' },
  { name: 'Medical', icon: Heart, color: 'from-red-400 to-red-600' },
  { name: 'Gym', icon: Dumbbell, color: 'from-lime-400 to-lime-600' },
  { name: 'Self Care', icon: Droplet, color: 'from-teal-400 to-teal-600' },
  { name: 'Fun', icon: Gamepad2, color: 'from-violet-400 to-violet-600' },
  { name: 'Shopping', icon: ShoppingBag, color: 'from-fuchsia-400 to-fuchsia-600' },
  { name: 'Education', icon: BookOpen, color: 'from-blue-500 to-blue-700' },
  { name: 'Books', icon: BookOpen, color: 'from-slate-400 to-slate-600' },
  { name: 'Coffee', icon: Coffee, color: 'from-amber-700 to-amber-900' },
  { name: 'Travel', icon: Plane, color: 'from-sky-400 to-sky-600' },
  { name: 'Other', icon: DollarSign, color: 'from-gray-400 to-gray-600' },
];

const getCategoryConfig = (name: string) =>
  CATEGORIES.find((c) => c.name === name) || CATEGORIES[CATEGORIES.length - 1];

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    amount: '',
    category: 'Food',
    note: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    if (user) loadExpenses();
  }, [user]);

  const loadExpenses = async () => {
    if (!user) return;
    const data = await api.getExpenses(user.id);
    setExpenses(data || []);
  };

  // ========== MEMOIZED CALCULATIONS ==========
  const monthExpenses = useMemo(() => {
    // if showing all months just return all expenses
    if (showAll) return expenses;

    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return expenses.filter((e) => {
      const d = new Date(e.date || e.createdAt);
      return d >= start && d <= end;
    });
  }, [expenses, month, showAll]);

  const total = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
    [monthExpenses]
  );

  const avgPerDay = useMemo(() => {
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return total / daysInMonth || 0;
  }, [total, month]);

  const todayTotal = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return expenses
      .filter((e) => {
        try {
          return format(new Date(e.date || e.createdAt), 'yyyy-MM-dd') === today;
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }, [expenses]);

  const categoryTotals = useMemo(() => {
    const map: { [key: string]: number } = {};
    monthExpenses.forEach((e) => {
      const cat = e.category || 'Other';
      map[cat] = (map[cat] || 0) + (parseFloat(e.amount) || 0);
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);

  const dailyGrouped = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    monthExpenses.forEach((e) => {
      const key = format(new Date(e.date || e.createdAt), 'yyyy-MM-dd');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    });
    return Object.entries(grouped)
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => (b.amount || 0) - (a.amount || 0)),
        total: items.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [monthExpenses]);

  // ========== HANDLERS ==========
  const addExpense = async () => {
    if (!user || !form.amount.trim() || !form.category) return;
    try {
      await api.createExpense(
        user.id,
        form.note,
        parseFloat(form.amount),
        form.category,
        new Date(form.date)
      );
      setForm({
        amount: '',
        category: 'Food',
        note: '',
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      setShowAddForm(false);
      loadExpenses();
    } catch (error) {
      console.error('Failed to add expense:', error);
    }
  };

  const deleteExpense = async (id: number) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.deleteExpense(id);
      loadExpenses();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  const exportCSV = () => {
    const rows = filteredExpenses.map((e) => [
      format(new Date(e.date || e.createdAt), 'yyyy-MM-dd'),
      parseFloat(e.amount || 0).toFixed(2),
      e.category || 'Other',
      e.note || '',
    ]);

    const csv = [['Date', 'Amount', 'Category', 'Note'], ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handlePrevMonth = () => {
    const prev = new Date(month);
    prev.setMonth(prev.getMonth() - 1);
    setMonth(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(month);
    next.setMonth(next.getMonth() + 1);
    setMonth(next);
  };

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Expenses
            </h1>
            <p className="text-gray-600 mt-1">Track and manage your spending</p>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
            >
              <Download size={18} />
              Export CSV
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Month Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 bg-white rounded-2xl p-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          {!showAll && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={28} className="text-emerald-600" />
            </motion.button>
          )}

          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 min-w-xs text-center">
            {showAll ? 'All Time' : format(month, 'MMMM yyyy')}
          </h2>

          {!showAll && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={28} className="text-emerald-600" />
            </motion.button>
          )}
        </div>
      </motion.div>
      <div className="text-center mb-8">
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-blue-600 underline"
        >
          {showAll ? 'Show monthly view' : 'Show all expenses'}
        </button>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all w-full md:w-1/2"
        />
      </motion.div>

      {/* Metrics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ staggerChildren: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {/* Total */}
        <motion.div
          whileHover={{ translateY: -5 }}
          className="bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl p-6 text-white shadow-xl"
        >
          <p className="text-sm font-semibold opacity-90">Total Spent</p>
          <p className="text-4xl font-bold mt-2">₹{total.toFixed(0)}</p>
          <p className="text-xs opacity-75 mt-2">{monthExpenses.length} transactions</p>
        </motion.div>

        {/* Average */}
        <motion.div
          whileHover={{ translateY: -5 }}
          className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-6 text-white shadow-xl"
        >
          <p className="text-sm font-semibold opacity-90">Average/Day</p>
          <p className="text-4xl font-bold mt-2">₹{avgPerDay.toFixed(0)}</p>
          <p className="text-xs opacity-75 mt-2">Based on {new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()} days</p>
        </motion.div>

        {/* Today */}
        <motion.div
          whileHover={{ translateY: -5 }}
          className="bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl p-6 text-white shadow-xl"
        >
          <p className="text-sm font-semibold opacity-90">Today's Spend</p>
          <p className="text-4xl font-bold mt-2">₹{todayTotal.toFixed(0)}</p>
          <p className="text-xs opacity-75 mt-2">{format(new Date(), 'MMM d, yyyy')}</p>
        </motion.div>

        {/* Top Category */}
        <motion.div
          whileHover={{ translateY: -5 }}
          className="bg-gradient-to-br from-purple-400 to-pink-600 rounded-2xl p-6 text-white shadow-xl"
        >
          <p className="text-sm font-semibold opacity-90">Top Category</p>
          <p className="text-3xl font-bold mt-2">{categoryTotals[0]?.name || '—'}</p>
          {categoryTotals[0] && (
            <p className="text-xs opacity-75 mt-2">₹{categoryTotals[0].amount.toFixed(0)}</p>
          )}
        </motion.div>
      </motion.div>

      {/* Add Expense Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl p-6 shadow-xl mb-8"
          >
            <h3 className="text-2xl font-bold mb-4">Add Expense</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Note</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Optional..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                />
              </div>

              {/* Add Button */}
              <div className="flex gap-2 items-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addExpense}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <Plus size={18} className="inline mr-2" />
                  Add
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-3 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Expense Button */}
      {!showAddForm && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddForm(true)}
          className="mb-8 w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2"
        >
          <Plus size={24} />
          Add New Expense
        </motion.button>
      )}

      {/* Category Analytics */}
      {categoryTotals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-lg mb-8"
        >
          <h3 className="text-2xl font-bold mb-6 text-gray-800">Category Breakdown</h3>
          <div className="space-y-4">
            {categoryTotals.map((cat, idx) => {
              const percentage = (cat.amount / total) * 100;
              const config = getCategoryConfig(cat.name);
              const Icon = config.icon;

              return (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color} text-white`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline">
                        <p className="font-semibold text-gray-800">{cat.name}</p>
                        <p className="text-sm text-gray-600">
                          ₹{cat.amount.toFixed(0)} <span className="text-xs">({percentage.toFixed(1)}%)</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full bg-gradient-to-r ${config.color}`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Daily Timeline */}
      {dailyGrouped.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-lg mb-8"
        >
          <h3 className="text-2xl font-bold mb-6 text-gray-800">Daily Timeline</h3>
          <div className="space-y-6">
            {dailyGrouped.map((day, idx) => {
              const isToday_ = isToday(parseISO(day.date));

              return (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div
                    className={`flex items-center gap-3 mb-3 ${
                      isToday_ ? 'bg-emerald-50 px-3 py-2 rounded-lg' : ''
                    }`}
                  >
                    <Calendar size={18} className="text-gray-500" />
                    <p className="font-bold text-gray-800">
                      {format(parseISO(day.date), 'MMMM d, yyyy')}
                    </p>
                    {isToday_ && <span className="text-xs bg-emerald-500 text-white px-2 py-1 rounded-full">Today</span>}
                    <p className="ml-auto text-lg font-bold text-emerald-600">₹{day.total.toFixed(0)}</p>
                  </div>

                  <div className="space-y-2 pl-8 border-l-2 border-gray-200">
                    {day.items.map((expense) => {
                      const config = getCategoryConfig(expense.category || 'Other');
                      const Icon = config.icon;

                      return (
                        <motion.div
                          key={expense.id}
                          whileHover={{ translateX: 8 }}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                        >
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color} text-white flex-shrink-0`}>
                            <Icon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{expense.category || 'Other'}</p>
                            {expense.note && <p className="text-xs text-gray-500 truncate">{expense.note}</p>}
                          </div>
                          <p className="font-bold text-lg text-gray-800 flex-shrink-0">₹{(parseFloat(expense.amount) || 0).toFixed(0)}</p>
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => deleteExpense(expense.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          >
                            <Trash2 size={18} />
                          </motion.button>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {monthExpenses.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <DollarSign size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg font-semibold">No expenses yet</p>
          <p className="text-gray-400 mb-6">Start adding expenses to track your spending</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg"
          >
            Add First Expense
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
