import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Download, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

const categories = ['Food', 'Transport', 'Home', 'Personal', 'Medical', 'Fun', 'Other'];

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: 'Food',
    note: '',
  });
  const [todayTotal, setTodayTotal] = useState(0);
  const [monthlyTotals, setMonthlyTotals] = useState<any>({});

  useEffect(() => {
    if (user) {
      loadExpenses();
    }
  }, [user]);

  const loadExpenses = async () => {
    if (!user) return;

    const data = await api.getExpenses(user.id);
    if (data && data.length > 0) {
      setExpenses(data);
      calculateTotals(data);
    }
  };

  const calculateTotals = (data: any[]) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayExpenses = data.filter((e) => format(new Date(e.date), 'yyyy-MM-dd') === today);
    const todaySum = todayExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    setTodayTotal(todaySum);

    const byMonth: any = {};
    data.forEach((e) => {
      const month = format(new Date(e.date), 'MMM yyyy');
      byMonth[month] = (byMonth[month] || 0) + parseFloat(e.amount);
    });
    setMonthlyTotals(byMonth);
  };

  const addExpense = async () => {
    if (!user || !newExpense.amount) return;

    await api.createExpense(
      user.id,
      newExpense.note,
      parseFloat(newExpense.amount),
      newExpense.category,
      new Date()
    );

    setNewExpense({ amount: '', category: 'Food', note: '' });
    loadExpenses();
  };

  const deleteExpense = async (id: string) => {
    await api.deleteExpense(id);
    loadExpenses();
  };

  const exportCSV = () => {
    const headers = ['Date', 'Amount', 'Category', 'Note'];
    const rows = expenses.map((e) => [
      format(new Date(e.created_at), 'yyyy-MM-dd HH:mm'),
      e.amount,
      e.category,
      e.note,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
  };

  const getCategoryColor = (category: string) => {
    const colors: any = {
      Food: 'bg-orange-100 text-orange-700',
      Transport: 'bg-blue-100 text-blue-700',
      Home: 'bg-green-100 text-green-700',
      Personal: 'bg-pink-100 text-pink-700',
      Medical: 'bg-red-100 text-red-700',
      Fun: 'bg-purple-100 text-purple-700',
      Other: 'bg-gray-100 text-gray-700',
    };
    return colors[category] || colors.Other;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Expenses
        </h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={exportCSV}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl font-semibold flex items-center gap-2"
        >
          <Download size={18} />
          Export CSV
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-emerald-600" size={24} />
            <h3 className="text-sm font-semibold text-gray-600">Today</h3>
          </div>
          <div className="text-3xl font-bold text-emerald-600">${todayTotal.toFixed(2)}</div>
        </div>

        {Object.entries(monthlyTotals)
          .slice(0, 2)
          .map(([month, total]: [string, any]) => (
            <div key={month} className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">{month}</h3>
              <div className="text-3xl font-bold text-blue-600">${total.toFixed(2)}</div>
            </div>
          ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-xl mb-6"
      >
        <h2 className="text-xl font-bold mb-4">Add Expense</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="number"
            step="0.01"
            value={newExpense.amount}
            onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
            placeholder="Amount"
            className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
          />
          <select
            value={newExpense.category}
            onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
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
            value={newExpense.note}
            onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
            placeholder="Note (optional)"
            className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={addExpense}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add
          </motion.button>
        </div>
      </motion.div>

      <div className="space-y-3">
        {expenses.map((expense) => (
          <motion.div
            key={expense.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl p-4 shadow-lg flex items-center justify-between"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">${parseFloat(expense.amount).toFixed(2)}</div>
                <div className="text-xs text-gray-500">{format(new Date(expense.date), 'MMM d, h:mm a')}</div>
              </div>
              <div className="flex-1">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(expense.category)}`}>
                  {expense.category}
                </span>
                {expense.note && <p className="text-gray-600 text-sm mt-1">{expense.note}</p>}
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => deleteExpense(expense.id)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Trash2 size={18} />
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
