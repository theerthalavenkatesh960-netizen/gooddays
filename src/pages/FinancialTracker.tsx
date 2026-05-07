import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import * as finApi from '../lib/financialApi';
import { useTheme } from '../contexts/ThemeContext';
import CompleteTaskModal from '../components/financial/CompleteTaskModal';
import ConfigPanel from '../components/financial/ConfigPanel';
import RulesPanel from '../components/financial/RulesPanel';

export default function FinancialTracker() {
  const { theme } = useTheme();
  const [dashboard, setDashboard] = useState<finApi.DashboardDto | null>(null);
  const [history, setHistory] = useState<finApi.MonthlyHistoryDto[]>([]);
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<finApi.TaskDto | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [activeRuleTab, setActiveRuleTab] = useState<
    'investment' | 'trading' | 'mindset' | 'lifestyle'
  >('investment');
  const [loading, setLoading] = useState(true);

  // Theme-aware color scheme
  const colors = useMemo(() => {
    const schemes: Record<string, any> = {
      light: {
        bg: 'bg-white',
        bgAlt: 'bg-gray-50',
        bgSecondary: 'bg-gray-100',
        card: 'bg-white',
        cardBorder: 'border-gray-200',
        text: 'text-gray-900',
        subtext: 'text-gray-600',
        subtitle: 'text-gray-500',
        chart: { bg: '#ffffff', grid: '#e5e7eb', text: '#6b7280' },
        tooltip: { bg: '#ffffff', border: '#e5e7eb', text: '#000000' },
      },
      dark: {
        bg: 'bg-slate-900',
        bgAlt: 'bg-slate-800',
        bgSecondary: 'bg-slate-700',
        card: 'bg-slate-800',
        cardBorder: 'border-slate-700',
        text: 'text-white',
        subtext: 'text-gray-400',
        subtitle: 'text-gray-500',
        chart: { bg: '#1e293b', grid: '#334155', text: '#94a3b8' },
        tooltip: { bg: '#1e293b', border: '#334155', text: '#e2e8f0' },
      },
      blue: {
        bg: 'bg-blue-50',
        bgAlt: 'bg-blue-100',
        bgSecondary: 'bg-blue-200',
        card: 'bg-white',
        cardBorder: 'border-blue-200',
        text: 'text-blue-900',
        subtext: 'text-blue-700',
        subtitle: 'text-blue-600',
        chart: { bg: '#ffffff', grid: '#bfdbfe', text: '#1e40af' },
        tooltip: { bg: '#ffffff', border: '#93c5fd', text: '#1e3a8a' },
      },
      green: {
        bg: 'bg-green-50',
        bgAlt: 'bg-green-100',
        bgSecondary: 'bg-green-200',
        card: 'bg-white',
        cardBorder: 'border-green-200',
        text: 'text-green-900',
        subtext: 'text-green-700',
        subtitle: 'text-green-600',
        chart: { bg: '#ffffff', grid: '#bbf7d0', text: '#166534' },
        tooltip: { bg: '#ffffff', border: '#86efac', text: '#15803d' },
      },
      ocean: {
        bg: 'bg-teal-50',
        bgAlt: 'bg-teal-100',
        bgSecondary: 'bg-teal-200',
        card: 'bg-white',
        cardBorder: 'border-teal-200',
        text: 'text-teal-900',
        subtext: 'text-teal-700',
        subtitle: 'text-teal-600',
        chart: { bg: '#ffffff', grid: '#99f6e4', text: '#134e4a' },
        tooltip: { bg: '#ffffff', border: '#5eead4', text: '#0f766e' },
      },
      futuristic: {
        bg: 'bg-[#0a0a0f]',
        bgAlt: 'bg-[#161921]',
        bgSecondary: 'bg-[#1e222d]',
        card: 'bg-[#0f1117]',
        cardBorder: 'border-[#2a2e39]',
        text: 'text-[#c8d0e0]',
        subtext: 'text-[#9ca3af]',
        subtitle: 'text-[#787b86]',
        chart: { bg: '#0f1117', grid: '#2a2e39', text: '#787b86' },
        tooltip: { bg: '#0f1117', border: '#2a2e39', text: '#c8d0e0' },
      },
    };
    return schemes[theme] || schemes.futuristic;
  }, [theme]);

  useEffect(() => {
    loadDashboard();
    loadHistory();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await finApi.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await finApi.getHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load history:', error);
      setHistory([]);
    }
  };

  const handleTaskClick = (task: finApi.TaskDto) => {
    if (!task.isCompleted) {
      setSelectedTask(task);
    }
  };

  const handleCompleteTask = async (
    actualAmount?: number,
    notes?: string
  ) => {
    if (!selectedTask) return;

    try {
      await finApi.completeTask(selectedTask.id, { actualAmount, notes });
      setSelectedTask(null);
      await loadDashboard();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleUncompleteTask = async (taskId: string) => {
    try {
      await finApi.uncompleteTask(taskId);
      await loadDashboard();
    } catch (error) {
      console.error('Failed to uncomplete task:', error);
    }
  };

  const getBarColor = (percent: number) => {
    if (percent >= 100) return '#26a65b';
    if (percent >= 70) return '#f0c040';
    return '#e05050';
  };

  const randomRule = useMemo(() => {
    const rules = dashboard?.rules;
    if (!rules || rules.length === 0) return null;
    return rules[Math.floor(Math.random() * rules.length)];
  }, [dashboard?.rules?.length]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-20 ${colors.bgSecondary} rounded-xl`}>
        <div className={`${colors.text} text-xl`}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* SECTION 7: ALERTS */}
        <AnimatePresence>
          {dashboard && (
            <>
              {(dashboard.missedTasks?.length ?? 0) > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`${theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-900 bg-opacity-20 border-red-600 text-red-400'} border rounded-lg p-4 mb-4 flex items-center gap-3`}
                >
                  <AlertCircle className={theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? 'text-red-600' : 'text-red-500'} size={24} />
                  <span>
                    ⚠️ {dashboard.missedTasks?.length} task
                    {(dashboard.missedTasks?.length ?? 0) > 1 ? 's' : ''} pending from
                    last month!
                  </span>
                </motion.div>
              )}

              {(dashboard.upcomingTasks?.length ?? 0) > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`${theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-yellow-900 bg-opacity-20 border-yellow-600 text-yellow-400'} border rounded-lg p-4 mb-4 flex items-center gap-3`}
                >
                  <Calendar className={theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? 'text-yellow-600' : 'text-yellow-500'} size={24} />
                  <span>
                    📅 {dashboard.upcomingTasks?.length} task
                    {(dashboard.upcomingTasks?.length ?? 0) > 1 ? 's' : ''} due this
                    week!
                  </span>
                </motion.div>
              )}

              {history.length > 0 &&
                history[history.length - 2]?.completionPercent >= 100 && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`${theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-green-900 bg-opacity-20 border-green-600 text-green-400'} border rounded-lg p-4 mb-4 flex items-center gap-3`}
                  >
                    <CheckCircle2 className={theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? 'text-green-600' : 'text-green-500'} size={24} />
                    <span>🎉 You completed 100% last month!</span>
                  </motion.div>
                )}
            </>
          )}
        </AnimatePresence>

        {/* SECTION 1: HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${colors.text} mb-2`}>
              Financial Tracker
            </h1>
            <p className={colors.subtitle}>{dashboard?.currentMonth}</p>
          </div>

          <button
            onClick={() => setShowConfig(true)}
            className={`p-3 ${colors.bgSecondary} hover:${colors.bgAlt} rounded-lg transition-colors ${colors.text}`}
          >
            <Settings size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Overall Completion */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${colors.card} rounded-xl p-6 border ${colors.cardBorder}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-amber-500" size={24} />
              <h3 className={`text-sm ${colors.subtext}`}>Completion</h3>
            </div>
            <p className="text-5xl font-bold text-amber-500">
              {(dashboard?.overallCompletionPercent ?? 0).toFixed(0)}%
            </p>
          </motion.div>

          {/* Streak */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={`${colors.card} rounded-xl p-6 border ${colors.cardBorder}`}
          >
            <h3 className={`text-sm ${colors.subtext} mb-2`}>Streak</h3>
            <p className="text-3xl font-bold text-green-500">
              🔥 {dashboard?.streak || 0} months consistent!
            </p>
          </motion.div>

          {/* Rule of the Day */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className={`${theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200' : 'bg-gradient-to-br from-amber-900 to-orange-900 bg-opacity-20 border-amber-700'} rounded-xl p-6 border`}
          >
            <h3 className={`text-sm font-bold mb-2 ${colors.text}`}>💡 Rule of the Day</h3>
            {randomRule && (
              <p className={`text-sm ${colors.subtext}`}>{randomRule.title}</p>
            )}
          </motion.div>
        </div>

        {/* SECTION 2: BUCKET CARDS */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Investment Buckets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(dashboard?.buckets ?? []).map((bucket, index) => (
              <motion.div
                key={bucket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`${colors.card} rounded-xl p-5 border ${colors.cardBorder} cursor-pointer hover:${colors.cardBorder} hover:border-opacity-100 transition-colors`}
                onClick={() =>
                  setExpandedBucket(
                    expandedBucket === bucket.id ? null : bucket.id
                  )
                }
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{bucket.icon}</span>
                  <div className="flex-1">
                    <h3 className={`font-bold ${colors.text}`}>{bucket.name}</h3>
                    <p className={`text-sm ${colors.subtext}`}>
                      ₹{bucket.monthlyTarget.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className={colors.subtext}>
                      {bucket.tasksCompleted}/{bucket.tasksTotal} tasks
                    </span>
                    <span
                      className="font-bold"
                      style={{
                        color: bucket.colorHex || '#26a65b',
                      }}
                    >
                      {(bucket.completionPercent ?? 0).toFixed(0)}%
                    </span>
                  </div>
                  <div className={`w-full h-2 ${colors.bgAlt} rounded-full overflow-hidden`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, bucket.completionPercent ?? 0)}%` }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: bucket.colorHex || '#26a65b',
                      }}
                    />
                  </div>
                </div>

                {/* SECTION 3: TASK CHECKLIST (Expanded) */}
                <AnimatePresence>
                  {expandedBucket === bucket.id && (bucket.tasks ?? []).length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-2"
                    >
                      {(bucket.tasks ?? []).map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-start gap-2 p-2 ${colors.bgSecondary} rounded-lg`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (task.isCompleted) {
                              handleUncompleteTask(task.id);
                            } else {
                              handleTaskClick(task);
                            }
                          }}
                        >
                          {task.isCompleted ? (
                            <CheckCircle2
                              className="text-green-500 flex-shrink-0 mt-0.5"
                              size={20}
                            />
                          ) : (
                            <div className={`w-5 h-5 border-2 ${colors.subtext} rounded-full flex-shrink-0 mt-0.5`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm ${
                                task.isCompleted
                                  ? `line-through ${colors.subtext}`
                                  : colors.text
                              }`}
                            >
                              {task.title}
                            </p>
                            {(task.amount ?? 0) > 0 && (
                              <p className={`text-xs ${colors.subtext}`}>
                                ₹{(task.amount ?? 0).toLocaleString()}
                                {task.recurrenceDay &&
                                  ` • Day ${task.recurrenceDay}`}
                              </p>
                            )}
                            {task.isCompleted && task.completedAt && (
                              <p className="text-xs text-green-500">
                                ✓ Completed{' '}
                                {new Date(task.completedAt).toLocaleDateString()}
                                {task.actualAmount != null &&
                                  ` • ₹${task.actualAmount.toLocaleString()}`}
                              </p>
                            )}
                            {task.isCompleted && task.notes && (
                              <p className={`text-xs ${colors.subtext} italic mt-1`}>
                                {task.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* SECTION 5: PROGRESS CHART */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${colors.card} rounded-xl p-6 border ${colors.cardBorder}`}
          >
            <h2 className={`text-xl font-bold mb-4 ${colors.text}`}>12-Month Progress</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Array.isArray(history) ? history : []}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.chart.grid} />
                <XAxis dataKey="month" stroke={colors.chart.text} />
                <YAxis stroke={colors.chart.text} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.tooltip.bg,
                    border: `1px solid ${colors.tooltip.border}`,
                    borderRadius: '8px',
                    color: colors.tooltip.text,
                  }}
                  formatter={(value: any, name: string) => {
                    const num = typeof value === 'number' ? value : parseFloat(value) || 0;
                    if (name === 'completionPercent') {
                      return [`${num.toFixed(0)}%`, 'Completion'];
                    }
                    return [
                      `₹${num.toLocaleString()}`,
                      'Total Invested',
                    ];
                  }}
                />
                <Bar
                  dataKey="completionPercent"
                  radius={[8, 8, 0, 0]}
                >
                  {(Array.isArray(history) ? history : []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(entry.completionPercent ?? 0)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* SECTION 4: RULES PANEL */}
          <RulesPanel
            dashboard={dashboard}
            activeTab={activeRuleTab}
            setActiveTab={setActiveRuleTab}
            onUpdate={loadDashboard}
            theme={theme}
            colors={colors}
          />
        </div>

        {/* SECTION 6: MONTHLY SNAPSHOT */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${colors.card} rounded-xl p-6 border ${colors.cardBorder}`}
        >
          <h2 className={`text-2xl font-bold mb-4 ${colors.text}`}>Monthly Snapshot</h2>
          <MonthlySnapshotForm
            snapshot={dashboard?.monthlySnapshot}
            onSave={loadDashboard}
            theme={theme}
            colors={colors}
          />
        </motion.div>
      </div>

      {/* Modals */}
      <CompleteTaskModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onComplete={handleCompleteTask}
      />

      <ConfigPanel
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        onUpdate={loadDashboard}
      />
    </div>
  );
}

// Monthly Snapshot Form Component
function MonthlySnapshotForm({
  snapshot,
  onSave,
  theme,
  colors,
}: {
  snapshot?: finApi.MonthlySnapshotDto;
  onSave: () => void;
  theme?: string;
  colors?: any;
}) {
  const now = new Date();
  const [formData, setFormData] = useState({
    month: snapshot?.month || now.getMonth() + 1,
    year: snapshot?.year || now.getFullYear(),
    totalIncome: snapshot?.totalIncome || 0,
    totalExpenses: snapshot?.totalExpenses || 0,
    totalInvested: snapshot?.totalInvested || 0,
    emergencyFundBalance: snapshot?.emergencyFundBalance || 0,
    travelFundBalance: snapshot?.travelFundBalance || 0,
    portfolioEstimatedValue: snapshot?.portfolioEstimatedValue || 0,
    notes: snapshot?.notes || '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (snapshot) {
      setFormData({
        month: snapshot.month,
        year: snapshot.year,
        totalIncome: snapshot.totalIncome,
        totalExpenses: snapshot.totalExpenses,
        totalInvested: snapshot.totalInvested,
        emergencyFundBalance: snapshot.emergencyFundBalance,
        travelFundBalance: snapshot.travelFundBalance,
        portfolioEstimatedValue: snapshot.portfolioEstimatedValue,
        notes: snapshot.notes || '',
      });
    }
  }, [snapshot]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await finApi.upsertSnapshot(formData);
      onSave();
    } catch (error) {
      console.error('Failed to save snapshot:', error);
    } finally {
      setSaving(false);
    }
  };

  const savingsRate =
    formData.totalIncome > 0
      ? (formData.totalInvested / formData.totalIncome) * 100
      : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className={`block text-sm ${colors?.subtext || 'text-gray-600'} mb-2`}>
            Total Income
          </label>
          <input
            type="number"
            value={formData.totalIncome}
            onChange={(e) =>
              setFormData({
                ...formData,
                totalIncome: parseFloat(e.target.value) || 0,
              })
            }
            style={{
              backgroundColor: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#f3f4f6' : colors?.bgAlt,
              borderColor: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#e5e7eb' : '#3a3e49',
              color: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#1f2937' : '#c8d0e0',
            }}
            className="w-full px-4 py-2 border rounded-lg outline-none focus:border-amber-500"
            placeholder="₹"
          />
        </div>

        <div>
          <label style={{ color: colors?.subtext || '#9ca3af' }} className="block text-sm mb-2">
            Total Expenses
          </label>
          <input
            type="number"
            value={formData.totalExpenses}
            onChange={(e) =>
              setFormData({
                ...formData,
                totalExpenses: parseFloat(e.target.value) || 0,
              })
            }
            style={{
              backgroundColor: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#f3f4f6' : colors?.bgAlt,
              borderColor: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#e5e7eb' : '#3a3e49',
              color: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#1f2937' : '#c8d0e0',
            }}
            className="w-full px-4 py-2 border rounded-lg outline-none focus:border-red-500"
            placeholder="₹"
          />
        </div>

        <div>
          <label style={{ color: colors?.subtext || '#9ca3af' }} className="block text-sm mb-2">
            Total Invested
          </label>
          <input
            type="number"
            value={formData.totalInvested}
            onChange={(e) =>
              setFormData({
                ...formData,
                totalInvested: parseFloat(e.target.value) || 0,
              })
            }
            style={{
              backgroundColor: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#f3f4f6' : colors?.bgAlt,
              borderColor: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#e5e7eb' : '#3a3e49',
              color: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#1f2937' : '#c8d0e0',
            }}
            className="w-full px-4 py-2 border rounded-lg outline-none focus:border-green-500"
            placeholder="₹"
          />
        </div>

        <div>
          <label style={{ color: colors?.subtext || '#9ca3af' }} className="block text-sm mb-2">
            Emergency Fund
          </label>
          <input
            type="number"
            value={formData.emergencyFundBalance}
            onChange={(e) =>
              setFormData({
                ...formData,
                emergencyFundBalance: parseFloat(e.target.value) || 0,
              })
            }
            style={{
              backgroundColor: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#f3f4f6' : colors?.bgAlt,
              borderColor: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#e5e7eb' : '#3a3e49',
              color: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#1f2937' : '#c8d0e0',
            }}
            className="w-full px-4 py-2 border rounded-lg outline-none focus:border-blue-500"
            placeholder="₹"
          />
        </div>

        <div>
          <label style={{ color: colors?.subtext || '#9ca3af' }} className="block text-sm mb-2">
            Travel Fund
          </label>
          <input
            type="number"
            value={formData.travelFundBalance}
            onChange={(e) =>
              setFormData({
                ...formData,
                travelFundBalance: parseFloat(e.target.value) || 0,
              })
            }
            style={{
              backgroundColor: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#f3f4f6' : colors?.bgAlt,
              borderColor: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#e5e7eb' : '#3a3e49',
              color: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#1f2937' : '#c8d0e0',
            }}
            className="w-full px-4 py-2 border rounded-lg outline-none focus:border-green-500"
            placeholder="₹"
          />
        </div>

        <div>
          <label style={{ color: colors?.subtext || '#9ca3af' }} className="block text-sm mb-2">
            Portfolio Value
          </label>
          <input
            type="number"
            value={formData.portfolioEstimatedValue}
            onChange={(e) =>
              setFormData({
                ...formData,
                portfolioEstimatedValue: parseFloat(e.target.value) || 0,
              })
            }
            style={{
              backgroundColor: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#f3f4f6' : colors?.bgAlt,
              borderColor: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#e5e7eb' : '#3a3e49',
              color: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#1f2937' : '#c8d0e0',
            }}
            className="w-full px-4 py-2 border rounded-lg outline-none focus:border-amber-500"
            placeholder="₹"
          />
        </div>
      </div>

      <div>
        <label style={{ color: colors?.subtext || '#9ca3af' }} className="block text-sm mb-2">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          style={{
            backgroundColor: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#f3f4f6' : colors?.bgAlt,
            borderColor: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#e5e7eb' : '#3a3e49',
            color: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#1f2937' : '#c8d0e0',
          }}
          className="w-full px-4 py-2 border rounded-lg outline-none resize-none focus:border-amber-500"
          rows={3}
          placeholder="Any notes for this month..."
        />
      </div>

      <div className="flex items-center justify-between">
        <div style={{ color: colors?.subtext || '#9ca3af' }} className="text-sm">
          <span className="font-bold text-lg" style={{ color: '#22c55e' }}>
            Savings Rate: {savingsRate.toFixed(1)}%
          </span>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            backgroundColor: theme === 'light' || theme === 'blue' || theme === 'green' || theme === 'ocean' ? '#22c55e' : '#26a65b',
            color: 'white',
          }}
          className="px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 hover:opacity-80"
        >
          {saving ? 'Saving...' : 'Save Snapshot'}
        </button>
      </div>
    </form>
  );
}