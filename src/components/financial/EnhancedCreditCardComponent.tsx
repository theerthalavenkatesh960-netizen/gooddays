import { motion } from 'framer-motion';
import { AlertCircle, Gift, Clock } from 'lucide-react';
import {
  generateCardDesign,
  calculateCategoryDiversity,
  getCardPatternSVG
} from '../../lib/cardDesigner';
import {
  generateSpendingAlert,
  getDaysUntilStatementClose
} from '../../lib/spendingAlerts';
import {
  calculateRewardRupeeValue,
  formatEMIInfo
} from '../../lib/rewardCalculator';

interface EnhancedCreditCardComponentProps {
  card: any;
  index: number;
  isLarge?: boolean;
  onAction?: (action: string) => void;
}

export default function EnhancedCreditCardComponent({
  card,
  index,
  isLarge = false,
  onAction
}: EnhancedCreditCardComponentProps) {
  // Generate unique card design based on data
  const categorySpending: Record<string, number> = card.analytics?.byCategory?.reduce(
    (acc: Record<string, number>, c: any) => {
      acc[c.category] = c.total;
      return acc;
    },
    {}
  ) || {};

  const categoryDiversity = calculateCategoryDiversity(categorySpending);
  const design = generateCardDesign(
    card.issuer || 'Other',
    card.analytics?.totalSpending || 0,
    categoryDiversity,
    card.id
  );

  const utilization = (card.currentBalance || 0) / (card.creditLimit || 1);
  const rewardValue = calculateRewardRupeeValue(
    card.rewardPointsBalance || 0,
    card.rewardRedemptionRate || 1
  );
  const emiInfo = card.EmiAmount 
    ? formatEMIInfo(card.EmiAmount, card.EmiRemainingCount || 0, card.PaymentDueDate || 15)
    : null;
  const daysUntilClose = getDaysUntilStatementClose(card.BillingCycleEndDate || 31);
  const alert = generateSpendingAlert(
    card.id.toString(),
    card.name,
    card.currentBalance || 0,
    card.creditLimit || 10000,
    card.rewardPointsBalance || 0
  );

  const containerClass = isLarge ? 'h-80' : 'h-52';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="space-y-3"
    >
      {/* Alert Badge */}
      {alert && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${
            alert.type === 'critical'
              ? 'bg-red-50 border-red-500 dark:bg-red-900/20'
              : alert.type === 'danger'
              ? 'bg-orange-50 border-orange-500 dark:bg-orange-900/20'
              : 'bg-yellow-50 border-yellow-500 dark:bg-yellow-900/20'
          }`}
        >
          <AlertCircle
            size={20}
            className={
              alert.type === 'critical'
                ? 'text-red-600 dark:text-red-400'
                : alert.type === 'danger'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-yellow-600 dark:text-yellow-400'
            }
          />
          <div className="flex-1">
            <p className={`font-semibold text-sm ${
              alert.type === 'critical'
                ? 'text-red-900 dark:text-red-200'
                : alert.type === 'danger'
                ? 'text-orange-900 dark:text-orange-200'
                : 'text-yellow-900 dark:text-yellow-200'
            }`}>
              {alert.title}
            </p>
            <p className={`text-xs mt-0.5 ${
              alert.type === 'critical'
                ? 'text-red-700 dark:text-red-300'
                : alert.type === 'danger'
                ? 'text-orange-700 dark:text-orange-300'
                : 'text-yellow-700 dark:text-yellow-300'
            }`}>
              {alert.message}
            </p>
          </div>
        </motion.div>
      )}

      {/* Main Card */}
      <motion.div
        whileHover={{ y: -8 }}
        className={`group relative ${containerClass} w-full rounded-3xl overflow-hidden shadow-2xl cursor-pointer transition-all`}
        style={{
          background: `linear-gradient(135deg, ${design.gradientStart} 0%, ${design.gradientEnd} 100%)`
        }}
      >
        {/* Pattern Background */}
        <div 
          className="absolute inset-0 opacity-30"
          dangerouslySetInnerHTML={{
            __html: getCardPatternSVG(design.pattern, `card-${card.id}`)
          }}
        />

        {/* Animated Glow */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-1/3 -right-1/3 w-96 h-96 rounded-full blur-3xl bg-white/10"
        />

        {/* Content */}
        <div className={`relative h-full flex flex-col justify-between p-6 ${isLarge ? 'p-8' : ''} text-white`}>
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                className="text-white/70 text-xs font-semibold tracking-widest mb-1"
              >
                {card.issuer || 'CARD'}
              </motion.p>
              <h3 className="text-xl font-black tracking-tight">{card.name}</h3>
            </div>
          </div>

          {/* Status Row */}
          <div className="space-y-3">
            {/* Balance & Limit */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <p className="text-white/70 text-xs font-medium">Balance</p>
                <p className="text-sm font-bold text-white/90">
                  ₹{((card.currentBalance || 0) / 1000).toFixed(1)}K / ₹{((card.creditLimit || 0) / 100000).toFixed(1)}L
                </p>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(utilization * 100, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className={`h-full rounded-full ${
                    utilization > 0.95
                      ? 'bg-gradient-to-r from-red-400 to-red-300'
                      : utilization > 0.8
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-300'
                      : 'bg-gradient-to-r from-green-400 to-emerald-300'
                  }`}
                />
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              {/* Rewards */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                onClick={() => onAction?.('rewards')}
                className="p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 cursor-pointer transition"
              >
                <p className="text-white/60 text-xs mb-0.5">Rewards</p>
                <p className="font-bold text-sm">
                  {card.rewardPointsBalance || 0}
                  <span className="text-xs text-amber-300 block">
                    ₹{rewardValue.rupeeValue}
                  </span>
                </p>
              </motion.div>

              {/* Due Date */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                onClick={() => onAction?.('payment')}
                className="p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 cursor-pointer transition"
              >
                <p className="text-white/60 text-xs mb-0.5">Closes In</p>
                <p className="font-bold text-sm">
                  {daysUntilClose}
                  <span className="text-xs text-blue-300 block">days</span>
                </p>
              </motion.div>

              {/* Status */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20"
              >
                <p className="text-white/60 text-xs mb-0.5">Status</p>
                <p className={`font-bold text-sm ${
                  card.status === 'active' ? 'text-green-300' : 'text-red-300'
                }`}>
                  {card.status === 'active' ? '✓ Active' : 'Inactive'}
                </p>
              </motion.div>
            </div>

            {/* EMI Info */}
            {emiInfo && emiInfo.isActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-2 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center gap-2 text-xs text-amber-100"
              >
                <Clock size={14} />
                <span>EMI: ₹{emiInfo.monthlyPayment} ({emiInfo.remainingMonths} months left)</span>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-xs text-white/60">
              {card.last4Digits && `●●●● ${card.last4Digits}`}
            </div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="text-xs font-semibold px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 border border-white/30 transition cursor-pointer"
              onClick={() => onAction?.('details')}
            >
              View
            </motion.div>
          </div>
        </div>

        {/* Shine Effect */}
        <motion.div
          initial={{ opacity: 0, x: '-100%' }}
          animate={{ opacity: [0, 0.6, 0], x: '200%' }}
          transition={{ duration: 3, delay: 1, repeat: Infinity, repeatDelay: 2 }}
          className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
        />
      </motion.div>

      {/* Card Benefits Badge */}
      {rewardValue.equivalentProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
        >
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2 mb-1">
            <Gift size={14} />
            Reward Redeem
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Your {rewardValue.rupeeValue > 0 ? `₹${rewardValue.rupeeValue}` : 'rewards'} can get you: {rewardValue.bestRedemptionOpportunity}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
