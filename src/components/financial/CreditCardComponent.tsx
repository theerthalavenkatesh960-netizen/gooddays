import { motion } from 'framer-motion';
import { CreditCard, Edit2 } from 'lucide-react';
import { CreditCard as CreditCardType } from '../../lib/cardApi';

interface CreditCardComponentProps {
  card: CreditCardType & { analytics?: any; utilization?: number };
  index: number;
  isLarge?: boolean;
}

const getIssuerGradient = (issuer: string) => {
  const colors: Record<string, string> = {
    HDFC: '#2563eb',
    ICICI: '#ea580c',
    SBI: '#16a34a',
    Axis: '#4f46e5',
    Other: '#64748b'
  };
  return colors[issuer] || colors.Other;
};

export default function CreditCardComponent({
  card,
  index,
  isLarge = false
}: CreditCardComponentProps) {
  const issuerColor = getIssuerGradient(card.issuer);
  const utilization = card.utilization || 0;
  const utilizationPercent = Math.min(utilization > 1 ? utilization : utilization * 100, 100);
  const cardBackground = `linear-gradient(145deg, ${issuerColor}1A 0%, var(--surface) 45%, var(--surface-elevated) 100%)`;

  const containerClass = isLarge
    ? 'h-60'
    : 'h-44 md:h-48';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={`group relative ${containerClass} w-full rounded-2xl overflow-hidden cursor-pointer transition-all`}
      style={{
        background: cardBackground,
        border: `1px solid ${issuerColor}33`
      }}
    >
      <div className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: issuerColor }} />

      {/* Content */}
      <div className={`relative h-full flex flex-col justify-between ${isLarge ? 'p-5 md:p-7' : 'p-3 md:p-3.5'}`}>
        {/* Header */}
        <div className={`flex justify-between items-start ${isLarge ? 'gap-3' : 'gap-2'}`}>
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              className={`font-semibold tracking-widest ${isLarge ? 'text-xs mb-1' : 'text-[10px] mb-0.5'}`}
              style={{ color: 'var(--text-muted)' }}
            >
              {card.issuer}
            </motion.p>
              <h3 className={`font-bold tracking-tight leading-tight ${isLarge ? 'text-lg md:text-xl' : 'text-sm md:text-[15px]'}`} style={{ color: 'var(--text-primary)' }}>{card.name}</h3>
          </div>
          <motion.div
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.2 }}
            className={`rounded-xl flex items-center justify-center border ${isLarge ? 'w-10 h-10' : 'w-7 h-7'}`}
            style={{ backgroundColor: `${issuerColor}1A`, borderColor: `${issuerColor}3D` }}
          >
            <CreditCard size={isLarge ? 18 : 13} style={{ color: issuerColor }} />
          </motion.div>
        </div>

        {/* Middle - Status Indicators */}
        <div className={isLarge ? 'space-y-3' : 'space-y-1.5'}>
          {/* Balance & Limit */}
          <div>
            <div className={`flex justify-between items-baseline ${isLarge ? 'mb-2' : 'mb-1'}`}>
              <p className={`font-medium ${isLarge ? 'text-xs' : 'text-[10px]'}`} style={{ color: 'var(--text-muted)' }}>Balance</p>
              <p className={`font-bold ${isLarge ? 'text-base' : 'text-xs'}`} style={{ color: 'var(--text-primary)' }}>
                {card.currentBalance ? `₹${(card.currentBalance / 1000).toFixed(0)}K` : '₹0'}
              </p>
            </div>
            {isLarge && (
              <div className={`flex justify-between ${isLarge ? 'text-xs mb-2' : 'text-[9px] mb-1'}`} style={{ color: 'var(--text-muted)' }}>
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            )}
            <div className={`rounded-full overflow-hidden ${isLarge ? 'h-2' : 'h-1.5'}`} style={{ backgroundColor: `${issuerColor}22` }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${utilizationPercent}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className={`rounded-full ${
                  utilizationPercent > 80
                    ? 'bg-red-400'
                    : utilizationPercent > 50
                    ? 'bg-yellow-400'
                    : 'bg-green-400'
                }`}
              />
            </div>
          </div>

          {/* Stats Row */}
          <div className={`grid grid-cols-3 ${isLarge ? 'gap-2' : 'gap-1.5'}`}>
            <div className={`rounded-lg h-full flex flex-col justify-between ${isLarge ? 'p-3' : 'p-1.5'}`} style={{ backgroundColor: `${issuerColor}14` }}>
              <p className={`${isLarge ? 'text-xs mb-0.5' : 'text-[9px] mb-0.5'}`} style={{ color: 'var(--text-muted)' }}>Limit</p>
                <p className={`font-bold leading-tight ${isLarge ? 'text-base' : 'text-xs'}`} style={{ color: 'var(--text-primary)' }}>₹{((card.creditLimit || 0) / 100000).toFixed(1)}L</p>
            </div>
            <div className={`rounded-lg h-full flex flex-col justify-between ${isLarge ? 'p-3' : 'p-1.5'}`} style={{ backgroundColor: `${issuerColor}14` }}>
              <p className={`${isLarge ? 'text-xs mb-0.5' : 'text-[9px] mb-0.5'}`} style={{ color: 'var(--text-muted)' }}>Rewards</p>
                <p className={`font-bold leading-tight ${isLarge ? 'text-base' : 'text-xs'}`} style={{ color: 'var(--text-primary)' }}>{card.rewardPointsBalance || 0}</p>
            </div>
            <div className={`rounded-lg h-full flex flex-col justify-between ${isLarge ? 'p-3' : 'p-1.5'}`} style={{ backgroundColor: `${issuerColor}14` }}>
              <p className={`${isLarge ? 'text-xs mb-0.5' : 'text-[9px] mb-0.5'}`} style={{ color: 'var(--text-muted)' }}>Status</p>
                <p className={`font-bold ${
                  card.status === 'active' ? 'text-green-500' : 'text-red-500'
                } ${isLarge ? 'text-base' : 'text-xs'}`}>
                {card.status === 'active' ? '✓' : '✗'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Card Last 4 & Actions */}
        {isLarge && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {card.last4Digits && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  className="font-mono text-base md:text-lg font-black tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ●●●● {card.last4Digits}
                </motion.div>
              )}
            </div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg transition-all cursor-pointer border"
              style={{ backgroundColor: `${issuerColor}14`, borderColor: `${issuerColor}33` }}
            >
              <Edit2 size={16} style={{ color: 'var(--text-secondary)' }} />
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
