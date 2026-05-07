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
import CompleteTaskModal from '../components/financial/CompleteTaskModal';
import ConfigPanel from '../components/financial/ConfigPanel';
import RulesPanel from '../components/financial/RulesPanel';

export default function FinancialTracker() {
  const [dashboard, setDashboard] = useState<finApi.DashboardDto | null>(null);
  const [history, setHistory] = useState<finApi.MonthlyHistoryDto[]>([]);
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<finApi.TaskDto | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [activeRuleTab, setActiveRuleTab] = useState<
    'investment' | 'trading' | 'mindset' | 'lifestyle'
  >('investment');
  const [loading, setLoading] = useState(true);

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
      <div className="flex items-center justify-center py-20 bg-[#131722] rounded-xl">
        <div className="text-[#c8d0e0] text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#131722] text-[#c8d0e0] p-6">
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
                  className="bg-[#e05050] bg-opacity-20 border border-[#e05050] rounded-lg p-4 mb-4 flex items-center gap-3"
                >
                  <AlertCircle className="text-[#e05050]" size={24} />
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
                  className="bg-[#f0c040] bg-opacity-20 border border-[#f0c040] rounded-lg p-4 mb-4 flex items-center gap-3"
                >
                  <Calendar className="text-[#f0c040]" size={24} />
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
                    className="bg-[#26a65b] bg-opacity-20 border border-[#26a65b] rounded-lg p-4 mb-4 flex items-center gap-3"
                  >
                    <CheckCircle2 className="text-[#26a65b]" size={24} />
                    <span>🎉 You completed 100% last month!</span>
                  </motion.div>
                )}
            </>
          )}
        </AnimatePresence>

        {/* SECTION 1: HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#c8d0e0] mb-2">
              Financial Tracker
            </h1>
            <p className="text-[#787b86]">{dashboard?.currentMonth}</p>
          </div>

          <button
            onClick={() => setShowConfig(true)}
            className="p-3 bg-[#1e222d] hover:bg-[#2a2e39] rounded-lg transition-colors"
          >
            <Settings size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Overall Completion */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1e222d] rounded-xl p-6 border border-[#2a2e39]"
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-[#f0c040]" size={24} />
              <h3 className="text-sm text-[#787b86]">Completion</h3>
            </div>
            <p className="text-5xl font-bold text-[#f0c040]">
              {(dashboard?.overallCompletionPercent ?? 0).toFixed(0)}%
            </p>
          </motion.div>

          {/* Streak */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-[#1e222d] rounded-xl p-6 border border-[#2a2e39]"
          >
            <h3 className="text-sm text-[#787b86] mb-2">Streak</h3>
            <p className="text-3xl font-bold text-[#26a65b]">
              🔥 {dashboard?.streak || 0} months consistent!
            </p>
          </motion.div>

          {/* Rule of the Day */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-[#f0c040] to-[#e05050] bg-opacity-20 rounded-xl p-6 border border-[#f0c040]"
          >
            <h3 className="text-sm font-bold mb-2">💡 Rule of the Day</h3>
            {randomRule && (
              <p className="text-sm text-[#c8d0e0]">{randomRule.title}</p>
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
                className="bg-[#1e222d] rounded-xl p-5 border border-[#2a2e39] cursor-pointer hover:border-[#3a3e49] transition-colors"
                onClick={() =>
                  setExpandedBucket(
                    expandedBucket === bucket.id ? null : bucket.id
                  )
                }
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{bucket.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-[#c8d0e0]">{bucket.name}</h3>
                    <p className="text-sm text-[#787b86]">
                      ₹{bucket.monthlyTarget.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#787b86]">
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
                  <div className="w-full h-2 bg-[#2a2e39] rounded-full overflow-hidden">
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
                          className="flex items-start gap-2 p-2 bg-[#2a2e39] rounded-lg"
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
                              className="text-[#26a65b] flex-shrink-0 mt-0.5"
                              size={20}
                            />
                          ) : (
                            <div className="w-5 h-5 border-2 border-[#787b86] rounded-full flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm ${
                                task.isCompleted
                                  ? 'line-through text-[#787b86]'
                                  : 'text-[#c8d0e0]'
                              }`}
                            >
                              {task.title}
                            </p>
                            {(task.amount ?? 0) > 0 && (
                              <p className="text-xs text-[#787b86]">
                                ₹{(task.amount ?? 0).toLocaleString()}
                                {task.recurrenceDay &&
                                  ` • Day ${task.recurrenceDay}`}
                              </p>
                            )}
                            {task.isCompleted && task.completedAt && (
                              <p className="text-xs text-[#26a65b]">
                                ✓ Completed{' '}
                                {new Date(task.completedAt).toLocaleDateString()}
                                {task.actualAmount != null &&
                                  ` • ₹${task.actualAmount.toLocaleString()}`}
                              </p>
                            )}
                            {task.isCompleted && task.notes && (
                              <p className="text-xs text-[#787b86] italic mt-1">
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
            className="bg-[#1e222d] rounded-xl p-6 border border-[#2a2e39]"
          >
            <h2 className="text-xl font-bold mb-4">12-Month Progress</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Array.isArray(history) ? history : []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" />
                <XAxis dataKey="month" stroke="#787b86" />
                <YAxis stroke="#787b86" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e222d',
                    border: '1px solid #2a2e39',
                    borderRadius: '8px',
                    color: '#c8d0e0',
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
          />
        </div>

        {/* SECTION 6: MONTHLY SNAPSHOT */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1e222d] rounded-xl p-6 border border-[#2a2e39]"
        >
          <h2 className="text-2xl font-bold mb-4">Monthly Snapshot</h2>
          <MonthlySnapshotForm
            snapshot={dashboard?.monthlySnapshot}
            onSave={loadDashboard}
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
}: {
  snapshot?: finApi.MonthlySnapshotDto;
  onSave: () => void;
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
          <label className="block text-sm text-[#787b86] mb-2">
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
            className="w-full px-4 py-2 bg-[#2a2e39] border border-[#3a3e49] rounded-lg text-[#c8d0e0] focus:border-[#f0c040] outline-none"
            placeholder="₹"
          />
        </div>

        <div>
          <label className="block text-sm text-[#787b86] mb-2">
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
            className="w-full px-4 py-2 bg-[#2a2e39] border border-[#3a3e49] rounded-lg text-[#c8d0e0] focus:border-[#e05050] outline-none"
            placeholder="₹"
          />
        </div>

        <div>
          <label className="block text-sm text-[#787b86] mb-2">
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
            className="w-full px-4 py-2 bg-[#2a2e39] border border-[#3a3e49] rounded-lg text-[#c8d0e0] focus:border-[#26a65b] outline-none"
            placeholder="₹"
          />
        </div>

        <div>
          <label className="block text-sm text-[#787b86] mb-2">
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
            className="w-full px-4 py-2 bg-[#2a2e39] border border-[#3a3e49] rounded-lg text-[#c8d0e0] focus:border-[#4a7acc] outline-none"
            placeholder="₹"
          />
        </div>

        <div>
          <label className="block text-sm text-[#787b86] mb-2">
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
            className="w-full px-4 py-2 bg-[#2a2e39] border border-[#3a3e49] rounded-lg text-[#c8d0e0] focus:border-[#26a65b] outline-none"
            placeholder="₹"
          />
        </div>

        <div>
          <label className="block text-sm text-[#787b86] mb-2">
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
            className="w-full px-4 py-2 bg-[#2a2e39] border border-[#3a3e49] rounded-lg text-[#c8d0e0] focus:border-[#f0c040] outline-none"
            placeholder="₹"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-[#787b86] mb-2">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-4 py-2 bg-[#2a2e39] border border-[#3a3e49] rounded-lg text-[#c8d0e0] focus:border-[#f0c040] outline-none resize-none"
          rows={3}
          placeholder="Any notes for this month..."
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-[#787b86]">
          <span className="font-bold text-[#26a65b] text-lg">
            Savings Rate: {savingsRate.toFixed(1)}%
          </span>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-[#26a65b] hover:bg-[#1f8a4a] text-white rounded-lg font-bold transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Snapshot'}
        </button>
      </div>
    </form>
  );
}