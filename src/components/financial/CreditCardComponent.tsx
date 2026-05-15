import { motion } from 'framer-motion';
import { CreditCard, Eye, EyeOff, Edit2 } from 'lucide-react';
import { CreditCard as CreditCardType } from '../../lib/cardApi';

interface CreditCardComponentProps {
  card: CreditCardType & { analytics?: any; utilization?: number };
  index: number;
  isLarge?: boolean;
}

const getIssuerGradient = (issuer: string) => {
  const gradients: Record<string, string> = {
    HDFC: 'from-blue-600 via-blue-500 to-cyan-500',
    ICICI: 'from-orange-600 via-red-500 to-pink-500',
    SBI: 'from-green-600 via-emerald-500 to-teal-500',
    Axis: 'from-purple-600 via-indigo-500 to-blue-500',
    Other: 'from-gray-600 via-gray-500 to-slate-500'
  };
  return gradients[issuer] || gradients.Other;
};

export default function CreditCardComponent({
  card,
  index,
  isLarge = false
}: CreditCardComponentProps) {
  const gradient = getIssuerGradient(card.issuer);
  const utilization = card.utilization || 0;
  const utilizationPercent = Math.min(utilization * 100, 100);

  const containerClass = isLarge
    ? 'h-80'
    : 'h-52';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={`group relative ${containerClass} w-full rounded-3xl overflow-hidden shadow-2xl cursor-pointer transition-all`}
    >
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />

      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-1/3 -right-1/3 w-96 h-96 rounded-full blur-3xl bg-white"
        />
      </div>

      {/* Glassmorphism Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 backdrop-blur-sm" />
      </div>

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
              {card.issuer}
            </motion.p>
            <h3 className="text-xl font-black tracking-tight">{card.name}</h3>
          </div>
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30"
          >
            <CreditCard size={24} />
          </motion.div>
        </div>

        {/* Middle - Status Indicators */}
        <div className="space-y-3">
          {/* Balance & Limit */}
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <p className="text-white/70 text-xs font-medium">Balance</p>
              <p className="text-sm font-bold text-white/90">
                {card.currentBalance ? `₹${(card.currentBalance / 1000).toFixed(0)}K` : '₹0'}
              </p>
            </div>
            <div className="flex justify-between text-xs text-white/60 mb-2">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${utilizationPercent}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className={`h-full rounded-full ${
                  utilizationPercent > 80
                    ? 'bg-gradient-to-r from-red-400 to-red-300'
                    : utilizationPercent > 50
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-300'
                    : 'bg-gradient-to-r from-green-400 to-emerald-300'
                }`}
              />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
              <p className="text-white/60 text-xs mb-0.5">Limit</p>
              <p className="font-bold text-sm">₹{((card.creditLimit || 0) / 100000).toFixed(1)}L</p>
            </div>
            <div className="p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
              <p className="text-white/60 text-xs mb-0.5">Rewards</p>
              <p className="font-bold text-sm">{card.rewardPointsBalance || 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
              <p className="text-white/60 text-xs mb-0.5">Status</p>
              <p className={`font-bold text-sm ${
                card.status === 'active' ? 'text-green-300' : 'text-red-300'
              }`}>
                {card.status === 'active' ? '✓ Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Card Last 4 & Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {card.last4Digits && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                className="font-mono text-lg font-black tracking-wider"
              >
                ●●●● {card.last4Digits}
              </motion.div>
            )}
          </div>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 transition-all cursor-pointer"
          >
            <Edit2 size={16} />
          </motion.div>
        </div>
      </div>

      {/* Shine Effect */}
      <motion.div
        initial={{ opacity: 0, x: '-100%' }}
        animate={{ opacity: [0, 0.5, 0], x: '200%' }}
        transition={{ duration: 3, delay: 1, repeat: Infinity, repeatDelay: 2 }}
        className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
      />
    </motion.div>
  );
}
