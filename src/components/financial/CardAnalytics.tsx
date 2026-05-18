import { motion } from 'framer-motion';
import { BarChart3, PieChart, TrendingUp, Calendar } from 'lucide-react';
import { CardAnalytics as CardAnalyticsType, CreditCard } from '../../lib/cardApi';

interface CardAnalyticsProps {
  analytics: CardAnalyticsType;
  card: CreditCard;
  onCategoryClick?: (category: string) => void;
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

export default function CardAnalytics({ analytics, card, onCategoryClick }: CardAnalyticsProps) {
  const maxValue = Math.max(...analytics.byCategory.map(c => c.total));
  const totalSpending = analytics.totalSpending;
  
  const formatRupee = (num: number) => {
    return `₹${new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num || 0)}`;
  };

  const monthlyPercentage = card.creditLimit 
    ? (totalSpending / (card.creditLimit * 0.3)) * 100 
    : 0;

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-2"
      >
        {/* Total Spending */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-3 rounded-xl"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Total Spending</h4>
            <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
          </div>
          <motion.p
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xs md:text-sm font-semibold num leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {formatRupee(totalSpending)}
          </motion.p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{analytics.transactionCount} transactions</p>
        </motion.div>

        {/* Average Transaction */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-3 rounded-xl"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Average</h4>
            <BarChart3 size={14} style={{ color: 'var(--accent)' }} />
          </div>
          <motion.p
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xs md:text-sm font-semibold num leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {formatRupee(totalSpending / (analytics.transactionCount || 1))}
          </motion.p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>per transaction</p>
        </motion.div>

        {/* Highest Category */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-3 rounded-xl"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Top Category</h4>
            <PieChart size={14} style={{ color: 'var(--accent)' }} />
          </div>
          <motion.p
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xs md:text-sm font-semibold leading-tight truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {analytics.byCategory[0]?.category || 'N/A'}
          </motion.p>
          <p className="text-[10px] num" style={{ color: 'var(--text-muted)' }}>
            {analytics.byCategory[0] ? formatRupee(analytics.byCategory[0].total) : '₹0'}
          </p>
        </motion.div>
      </motion.div>

      {/* Category Breakdown with Advanced Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-3 md:p-4 rounded-2xl"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <h3 className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
          <BarChart3 size={13} style={{ color: 'var(--text-primary)' }} />
          Spending by Category
        </h3>

        <div className="space-y-2">
          {analytics.byCategory.map((category, idx) => {
            const percentage = (category.total / maxValue) * 100;
            const color = generateHSL(idx);

            return (
              <motion.button
                key={category.category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group w-full text-left"
                onClick={() => onCategoryClick?.(category.category)}
              >
                {/* Label Row */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-1.5 h-5 rounded-full"
                      style={{ backgroundColor: color }}
                      whileHover={{ scale: 1.2 }}
                    />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {category.category}
                      {onCategoryClick ? '  ->' : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold num" style={{ color: 'var(--accent)' }}>{formatRupee(category.total)}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{category.count} transactions</p>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="relative h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
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

                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{Math.round(percentage)}%</p>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Spending Pattern Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-3 md:p-4 rounded-2xl"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <h3 className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
          <Calendar size={13} style={{ color: 'var(--text-primary)' }} />
          Period Insights
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Distribution Pie-like Chart */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative w-28 h-28">
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
                  <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Total</p>
                  <p className="text-xs font-bold num" style={{ color: 'var(--text-primary)' }}>{formatRupee(totalSpending).split('.')[0]}</p>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-center">
              {analytics.byCategory.slice(0, 3).map((cat, idx) => (
                <div key={cat.category} className="flex items-center justify-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: generateHSL(idx) }}
                  />
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    {cat.category} ({((cat.total / totalSpending) * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Column */}
          <div className="space-y-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="p-2.5 rounded-lg"
              style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
            >
              <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Monthly Budget Utilization</p>
              <p className="text-xs font-bold num mb-1" style={{ color: 'var(--text-primary)' }}>
                {monthlyPercentage.toFixed(1)}%
              </p>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(monthlyPercentage, 100)}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="p-2.5 rounded-lg"
              style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
            >
              <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Recommended Monthly Spend</p>
              <p className="text-xs font-bold num" style={{ color: 'var(--text-primary)' }}>
                {formatRupee((card.creditLimit || 10000) * 0.3)}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>30% of credit limit</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="p-2.5 rounded-lg"
              style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
            >
              <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Remaining Available Credit</p>
              <p className="text-xs font-bold num" style={{ color: 'var(--text-primary)' }}>
                {formatRupee((card.creditLimit || 10000) - (card.currentBalance || 0))}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {(((card.creditLimit || 10000) - (card.currentBalance || 0)) / (card.creditLimit || 10000) * 100).toFixed(0)}% available
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
