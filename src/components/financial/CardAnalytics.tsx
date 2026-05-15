import { motion } from 'framer-motion';
import { BarChart3, PieChart, TrendingUp, Calendar } from 'lucide-react';
import { CardAnalytics as CardAnalyticsType, CreditCard } from '../../lib/cardApi';

interface CardAnalyticsProps {
  analytics: CardAnalyticsType;
  card: CreditCard;
}

const COLORS = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-pink-500 to-pink-600',
  'from-rose-500 to-rose-600',
  'from-orange-500 to-orange-600',
  'from-amber-500 to-amber-600',
  'from-green-500 to-green-600',
  'from-teal-500 to-teal-600',
];

const generateHSL = (index: number) => {
  return `hsl(${(index * 45) % 360}, 70%, 50%)`;
};

export default function CardAnalytics({ analytics, card }: CardAnalyticsProps) {
  const maxValue = Math.max(...analytics.byCategory.map(c => c.total));
  const totalSpending = analytics.totalSpending;
  
  const formatRupee = (num: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  const monthlyPercentage = card.creditLimit 
    ? (totalSpending / (card.creditLimit * 0.3)) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Total Spending */}
        <motion.div
          whileHover={{ y: -4 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-blue-900">Total Spending</h4>
            <TrendingUp size={20} className="text-blue-600" />
          </div>
          <motion.p
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-black text-blue-600 mb-2"
          >
            {formatRupee(totalSpending)}
          </motion.p>
          <p className="text-sm text-blue-700">{analytics.transactionCount} transactions</p>
        </motion.div>

        {/* Average Transaction */}
        <motion.div
          whileHover={{ y: -4 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-purple-900">Average</h4>
            <BarChart3 size={20} className="text-purple-600" />
          </div>
          <motion.p
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-black text-purple-600 mb-2"
          >
            {formatRupee(totalSpending / (analytics.transactionCount || 1))}
          </motion.p>
          <p className="text-sm text-purple-700">per transaction</p>
        </motion.div>

        {/* Highest Category */}
        <motion.div
          whileHover={{ y: -4 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-pink-900">Top Category</h4>
            <PieChart size={20} className="text-pink-600" />
          </div>
          <motion.p
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-black text-pink-600 mb-1"
          >
            {analytics.byCategory[0]?.category || 'N/A'}
          </motion.p>
          <p className="text-sm text-pink-700">
            {analytics.byCategory[0] ? formatRupee(analytics.byCategory[0].total) : '₹0'}
          </p>
        </motion.div>
      </motion.div>

      {/* Category Breakdown with Advanced Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-8 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-100 shadow-xl"
      >
        <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
          <BarChart3 size={24} className="text-gray-900" />
          Spending by Category
        </h3>

        <div className="space-y-4">
          {analytics.byCategory.map((category, idx) => {
            const percentage = (category.total / maxValue) * 100;
            const color = generateHSL(idx);

            return (
              <motion.div
                key={category.category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group"
              >
                {/* Label Row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-3 h-6 rounded-full"
                      style={{ backgroundColor: color }}
                      whileHover={{ scale: 1.2 }}
                    />
                    <span className="font-medium text-gray-800">{category.category}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatRupee(category.total)}</p>
                    <p className="text-xs text-gray-500">{category.count} transactions</p>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  {/* Background gradient effect */}
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: `${percentage}%`, opacity: 1 }}
                    transition={{ duration: 0.6, delay: idx * 0.05 + 0.2, ease: 'easeOut' }}
                    className="h-full rounded-full relative"
                    style={{
                      background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                      boxShadow: `0 0 20px ${color}80`
                    }}
                  >
                    {/* Animated shine effect */}
                    <motion.div
                      animate={{
                        x: ['0%', '100%']
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 1,
                        ease: 'easeInOut'
                      }}
                      className="absolute h-full w-16 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
                    />
                  </motion.div>

                  {/* Percentage text */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 + 0.4 }}
                    className="absolute inset-0 flex items-center px-3 text-white font-bold text-sm"
                  >
                    {Math.round(percentage)}%
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Spending Pattern Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-8 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-100 shadow-xl"
      >
        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
          <Calendar size={24} className="text-gray-900" />
          Period Insights
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Distribution Pie-like Chart */}
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={generateHSL(0)}
                  strokeWidth="8"
                  strokeDasharray={`${(analytics.byCategory[0]?.total / maxValue) * 251.2} 251.2`}
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
                {analytics.byCategory.slice(1, 3).map((cat, idx) => (
                  <motion.circle
                    key={cat.category}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={generateHSL(idx + 1)}
                    strokeWidth="8"
                    strokeDasharray={`${(cat.total / maxValue) * 251.2} 251.2`}
                    strokeDashoffset={(analytics.byCategory.slice(0, idx + 1).reduce((s, c) => s + (c.total / maxValue) * 251.2, 0))}
                    initial={{ strokeDashoffset: 251.2 }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{ duration: 1, delay: 0.3 + (idx + 1) * 0.1 }}
                    opacity={0.6}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-600 text-xs mb-1">Total</p>
                  <p className="text-lg font-black text-gray-900">{formatRupee(totalSpending).split('.')[0]}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-2 text-center">
              {analytics.byCategory.slice(0, 3).map((cat, idx) => (
                <div key={cat.category} className="flex items-center justify-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: generateHSL(idx) }}
                  />
                  <span className="text-sm text-gray-700">
                    {cat.category} ({((cat.total / totalSpending) * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Column */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4 bg-blue-50 rounded-lg border border-blue-200"
            >
              <p className="text-sm text-blue-700 mb-1">Monthly Budget Utilization</p>
              <p className="text-2xl font-black text-blue-600 mb-2">
                {monthlyPercentage.toFixed(1)}%
              </p>
              <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(monthlyPercentage, 100)}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-blue-600"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="p-4 bg-green-50 rounded-lg border border-green-200"
            >
              <p className="text-sm text-green-700 mb-1">Recommended Monthly Spend</p>
              <p className="text-2xl font-black text-green-600">
                {formatRupee((card.creditLimit || 10000) * 0.3)}
              </p>
              <p className="text-xs text-green-700 mt-1">30% of credit limit</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="p-4 bg-purple-50 rounded-lg border border-purple-200"
            >
              <p className="text-sm text-purple-700 mb-1">Remaining Available Credit</p>
              <p className="text-2xl font-black text-purple-600">
                {formatRupee((card.creditLimit || 10000) - (card.currentBalance || 0))}
              </p>
              <p className="text-xs text-purple-700 mt-1">
                {(((card.creditLimit || 10000) - (card.currentBalance || 0)) / (card.creditLimit || 10000) * 100).toFixed(0)}% available
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
