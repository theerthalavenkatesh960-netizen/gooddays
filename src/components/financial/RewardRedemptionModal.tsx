import { motion } from 'framer-motion';
import { X, Gift, Star, Zap, TrendingUp, Heart } from 'lucide-react';
import { calculateRewardRupeeValue, estimateRewardsEarned } from '../../lib/rewardCalculator';

interface RewardRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  rewardPoints: number;
  rewardRedemptionRate?: number;
  monthlySpending?: number;
  rewardsRate?: number;
}

export default function RewardRedemptionModal({
  isOpen,
  onClose,
  cardName,
  rewardPoints,
  rewardRedemptionRate = 1,
  monthlySpending = 0,
  rewardsRate = 1
}: RewardRedemptionModalProps) {
  if (!isOpen) return null;

  const rewardValue = calculateRewardRupeeValue(rewardPoints, rewardRedemptionRate);
  const spendingEstimate = monthlySpending > 0 
    ? estimateRewardsEarned(monthlySpending, rewardsRate)
    : null;

  const redemptionPartners = [
    {
      name: 'Shopping Voucher',
      icon: Gift,
      minPoints: 1000,
      description: 'Use at major retailers',
      bonus: '10% extra value'
    },
    {
      name: 'Airline Miles',
      icon: Zap,
      minPoints: 5000,
      description: 'Book domestic flights',
      bonus: '1.5x value'
    },
    {
      name: 'Cashback',
      icon: TrendingUp,
      minPoints: 100,
      description: 'Direct to account',
      bonus: 'Fastest option'
    },
    {
      name: 'Subscription Voucher',
      icon: Star,
      minPoints: 2000,
      description: 'Movies, music, OTT',
      bonus: 'Up to 3 months'
    },
    {
      name: 'Wellness Program',
      icon: Heart,
      minPoints: 3000,
      description: 'Gym, spa, health',
      bonus: 'Premium partners'
    }
  ];

  const availablePartners = redemptionPartners.filter(
    p => rewardPoints >= p.minPoints
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-6 flex items-center justify-between z-10">
          <div>
            <p className="text-white/80 text-sm font-medium">Reward Points on</p>
            <h2 className="text-white text-2xl font-black">{cardName}</h2>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
          >
            <X size={20} />
          </motion.button>
        </div>

        <div className="p-6 space-y-6">
          {/* Points Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 p-4 rounded-2xl border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-1">Available Points</p>
              <p className="text-3xl font-black text-amber-900 dark:text-amber-100">
                {rewardPoints.toLocaleString()}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Worth ₹{rewardValue.rupeeValue.toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">Monthly Earning</p>
              <p className="text-3xl font-black text-blue-900 dark:text-blue-100">
                {spendingEstimate?.earnedPoints || 0}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                ≈ ₹{spendingEstimate?.earnedRupees || 0}/month
              </p>
            </div>
          </motion.div>

          {/* Redemption Partners */}
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Gift size={20} className="text-amber-500" />
              Redemption Options
            </h3>

            {availablePartners.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availablePartners.map((partner, idx) => {
                  const Icon = partner.icon;
                  const canRedeem = rewardPoints >= partner.minPoints;
                  
                  return (
                    <motion.button
                      key={partner.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={canRedeem ? { scale: 1.05, y: -4 } : {}}
                      whileTap={canRedeem ? { scale: 0.95 } : {}}
                      disabled={!canRedeem}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${
                        canRedeem
                          ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 hover:border-amber-500 hover:shadow-lg cursor-pointer'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/20 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Icon 
                          size={20} 
                          className={canRedeem ? 'text-amber-600' : 'text-slate-400'}
                        />
                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-white/50 dark:bg-black/30">
                          {partner.minPoints} pts
                        </span>
                      </div>
                      <p className="font-bold text-sm mb-1">{partner.name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        {partner.description}
                      </p>
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                        ✓ {partner.bonus}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/30 rounded-2xl">
                <p className="text-slate-600 dark:text-slate-400">
                  Not enough points yet. Keep accumulating! 🎯
                </p>
              </div>
            )}
          </div>

          {/* Points Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-2xl"
          >
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              How You Earn Points
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Regular transactions</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {spendingEstimate?.breakdown?.baseCategoryPoints || 0} pts
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Bonus days (5x earning)</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {spendingEstimate?.breakdown?.bonusPointsDays || 0} pts
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Special offers</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {spendingEstimate?.breakdown?.specialOffers || 0} pts
                </span>
              </div>
              <div className="border-t border-slate-300 dark:border-slate-700 pt-2 mt-2 flex justify-between text-xs font-bold">
                <span>Total this month</span>
                <span className="text-amber-600 dark:text-amber-400">
                  {spendingEstimate?.earnedPoints || 0} pts
                </span>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-bold transition"
            >
              Close
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                // TODO: Redirect to redemption flow
                onClose();
              }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 font-bold text-white transition"
            >
              Redeem Points
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
