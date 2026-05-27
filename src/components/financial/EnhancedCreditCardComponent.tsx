import { motion } from 'framer-motion';
import { AlertCircle, Gift, Clock, CreditCard, Star, Calendar, CheckCircle, XCircle } from 'lucide-react';
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

const getIssuerColor = (issuer: string) => {
  const colors: Record<string, string> = {
    HDFC: '#2563eb',
    ICICI: '#ea580c',
    SBI: '#16a34a',
    Axis: '#4f46e5',
    Other: '#64748b'
  };
  return colors[issuer] || colors.Other;
};

export default function EnhancedCreditCardComponent({
  card,
  index,
  isLarge = false,
  onAction
}: EnhancedCreditCardComponentProps) {
  const issuerColor = getIssuerColor(card.issuer || 'Other');
  const utilization = (card.currentBalance || 0) / (card.creditLimit || 1);
  const cardBackground = `linear-gradient(145deg, ${issuerColor}1A 0%, var(--surface) 45%, var(--surface-elevated) 100%)`;
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
  const formatMoney = (value: number) => `₹${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0)}`;

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
        whileHover={{ y: -4 }}
        className={`group relative w-full rounded-2xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all`}
        style={{
          background: cardBackground,
          border: `1px solid ${issuerColor}33`
        }}
      >
        <div className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: issuerColor }} />

        {/* Content */}
        <div className={`relative flex flex-col justify-between h-full ${isLarge ? 'p-3 md:p-4 gap-2' : 'p-4 md:p-5'}`}>
          {/* Header */}
          <div className="flex justify-between items-start gap-2">
            <div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                className={`font-semibold tracking-widest mb-0.5 ${isLarge ? 'text-[10px]' : 'text-xs'}`}
                style={{ color: 'var(--text-muted)' }}
              >
                {card.issuer || 'CARD'}
              </motion.p>
              <h3 className={`font-bold tracking-tight leading-tight ${isLarge ? 'text-sm' : 'text-base md:text-lg'}`} style={{ color: 'var(--text-primary)' }}>{card.name}</h3>
            </div>
            <motion.div
              whileHover={{ scale: 1.08 }}
              transition={{ duration: 0.2 }}
              className={`rounded-xl flex items-center justify-center border flex-shrink-0 ${isLarge ? 'w-7 h-7' : 'w-9 h-9'}`}
              style={{ backgroundColor: `${issuerColor}1A`, borderColor: `${issuerColor}3D` }}
            >
              <CreditCard size={isLarge ? 13 : 16} style={{ color: issuerColor }} />
            </motion.div>
          </div>

          {/* Status Row */}
          <div className={`${isLarge ? 'space-y-1.5' : 'space-y-2.5'}`}>
            {/* Balance & Limit */}
            {isLarge ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col items-start" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.625rem', padding: '0.375rem 0.625rem' }}>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Balance</p>
                    <p className="text-xs font-semibold num truncate" style={{ color: 'var(--accent-warm)' }}>{formatMoney(card.currentBalance || 0)}</p>
                  </div>
                  <div className="flex flex-col items-start" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.625rem', padding: '0.375rem 0.625rem' }}>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Limit</p>
                    <p className="text-xs font-semibold num truncate" style={{ color: 'var(--text-primary)' }}>{formatMoney(card.creditLimit || 0)}</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Utilization</p>
                    <p className="text-[10px] font-semibold" style={{ color: utilization > 0.8 ? 'var(--accent-warm)' : 'var(--accent-green)' }}>{(utilization * 100).toFixed(1)}%</p>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${issuerColor}22` }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(utilization * 100, 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className={`h-full rounded-full ${utilization > 0.95 ? 'bg-red-400' : utilization > 0.8 ? 'bg-yellow-400' : 'bg-green-400'}`}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Balance</p>
                  <p className="text-xs md:text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {formatMoney(card.currentBalance || 0)} / {formatMoney(card.creditLimit || 0)}
                  </p>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${issuerColor}22` }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(utilization * 100, 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className={`h-full rounded-full ${
                      utilization > 0.95
                        ? 'bg-red-400'
                        : utilization > 0.8
                        ? 'bg-yellow-400'
                        : 'bg-green-400'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              {/* Rewards */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => onAction?.('rewards')}
                className="flex flex-col items-start cursor-pointer"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.625rem', padding: '0.375rem 0.625rem' }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Star size={12} style={{ color: 'var(--accent-gold)' }} />
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Rewards</p>
                </div>
                <p className="text-xs font-semibold num leading-tight" style={{ color: 'var(--text-primary)' }}>{card.rewardPointsBalance || 0}</p>
                <p className="text-[10px]" style={{ color: 'var(--accent-gold)' }}>₹{rewardValue.rupeeValue}</p>
              </motion.div>

              {/* Due Date */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => onAction?.('payment')}
                className="flex flex-col items-start cursor-pointer"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.625rem', padding: '0.375rem 0.625rem' }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Calendar size={12} style={{ color: 'var(--accent)' }} />
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Closes In</p>
                </div>
                <p className="text-xs font-semibold num leading-tight" style={{ color: 'var(--text-primary)' }}>{daysUntilClose}</p>
                <p className="text-[10px]" style={{ color: 'var(--accent)' }}>days</p>
              </motion.div>

              {/* Status */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex flex-col items-start"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.625rem', padding: '0.375rem 0.625rem' }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  {card.status === 'active'
                    ? <CheckCircle size={12} className="text-green-500" />
                    : <XCircle size={12} className="text-red-500" />}
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Status</p>
                </div>
                <p className={`text-xs font-semibold ${
                  card.status === 'active' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {card.status === 'active' ? 'Active' : 'Inactive'}
                </p>
              </motion.div>
            </div>

            {/* EMI Info */}
            {emiInfo && emiInfo.isActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-2 rounded-lg flex items-center gap-2 text-xs"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--accent-gold)',
                  color: 'var(--text-secondary)'
                }}
              >
                <Clock size={14} style={{ color: 'var(--accent-gold)' }} />
                <span>EMI: ₹{emiInfo.monthlyPayment} ({emiInfo.remainingMonths} months left)</span>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center">
            <div className={`${isLarge ? 'text-[10px]' : 'text-xs'}`} style={{ color: 'var(--text-muted)' }}>
              {card.last4Digits && `●●●● ${card.last4Digits}`}
            </div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="text-xs font-semibold px-2 py-1 rounded-lg transition cursor-pointer"
              style={{
                backgroundColor: `${issuerColor}14`,
                border: `1px solid ${issuerColor}33`,
                color: 'var(--text-secondary)'
              }}
              onClick={() => onAction?.('details')}
            >
              View
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Card Benefits Badge */}
      {rewardValue.equivalentProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-3 rounded-lg border"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--accent-gold)'
          }}
        >
          <p className="text-xs font-semibold flex items-center gap-2 mb-1" style={{ color: 'var(--text-primary)' }}>
            <Gift size={14} style={{ color: 'var(--accent-gold)' }} />
            Reward Redeem
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Your {rewardValue.rupeeValue > 0 ? `₹${rewardValue.rupeeValue}` : 'rewards'} can get you: {rewardValue.bestRedemptionOpportunity}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
