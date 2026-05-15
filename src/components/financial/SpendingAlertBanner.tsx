import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, TrendingUp, Zap, ArrowRight } from 'lucide-react';
import { SpendingAlert, analyzeBudgetHealth } from '../../lib/spendingAlerts';

interface SpendingAlertBannerProps {
  alerts: SpendingAlert[];
  onDismiss?: (id: string) => void;
  onAction?: (action: string) => void;
  compact?: boolean;
}

export default function SpendingAlertBanner({
  alerts,
  onDismiss,
  onAction,
  compact = false
}: SpendingAlertBannerProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  // Sort by severity
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { critical: 0, danger: 1, warning: 2 };
    return (severityOrder[a.type as keyof typeof severityOrder] || 3) - 
           (severityOrder[b.type as keyof typeof severityOrder] || 3);
  });

  if (compact) {
    // Show only most critical alert in compact mode
    const alert = sortedAlerts[0];
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${
          alert.type === 'critical'
            ? 'bg-red-50 border-red-500 dark:bg-red-900/20'
            : alert.type === 'danger'
            ? 'bg-orange-50 border-orange-500 dark:bg-orange-900/20'
            : 'bg-yellow-50 border-yellow-500 dark:bg-yellow-900/20'
        }`}
      >
        <AlertCircle
          size={16}
          className={
            alert.type === 'critical'
              ? 'text-red-600 dark:text-red-400 flex-shrink-0'
              : alert.type === 'danger'
              ? 'text-orange-600 dark:text-orange-400 flex-shrink-0'
              : 'text-yellow-600 dark:text-yellow-400 flex-shrink-0'
          }
        />
        <p className={`text-xs flex-1 font-medium ${
          alert.type === 'critical'
            ? 'text-red-900 dark:text-red-200'
            : alert.type === 'danger'
            ? 'text-orange-900 dark:text-orange-200'
            : 'text-yellow-900 dark:text-yellow-200'
        }`}>
          {alert.message}
        </p>
        <button
          onClick={() => onDismiss?.(alert.id)}
          className="text-xs font-semibold px-2 py-1 rounded hover:opacity-80 transition"
        >
          ✕
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {sortedAlerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-start gap-4 p-4 rounded-lg border-l-4 backdrop-blur-sm ${
              alert.type === 'critical'
                ? 'bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-600'
                : alert.type === 'danger'
                ? 'bg-orange-50 border-orange-500 dark:bg-orange-900/20 dark:border-orange-600'
                : 'bg-yellow-50 border-yellow-500 dark:bg-yellow-900/20 dark:border-yellow-600'
            }`}
          >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {alert.type === 'critical' ? (
                <div className="animate-pulse">
                  <Zap 
                    size={20} 
                    className="text-red-600 dark:text-red-400"
                  />
                </div>
              ) : (
                <AlertCircle
                  size={20}
                  className={
                    alert.type === 'danger'
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm mb-1 ${
                alert.type === 'critical'
                  ? 'text-red-900 dark:text-red-200'
                  : alert.type === 'danger'
                  ? 'text-orange-900 dark:text-orange-200'
                  : 'text-yellow-900 dark:text-yellow-200'
              }`}>
                {alert.title}
              </p>
              <p className={`text-xs leading-relaxed mb-2 ${
                alert.type === 'critical'
                  ? 'text-red-800 dark:text-red-300'
                  : alert.type === 'danger'
                  ? 'text-orange-800 dark:text-orange-300'
                  : 'text-yellow-800 dark:text-yellow-300'
              }`}>
                {alert.message}
              </p>

              {/* Utilization Bar */}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-opacity-70">
                    {Math.round(alert.utilization)}% utilized
                  </span>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/40">
                    {alert.recommendedAction}
                  </span>
                </div>
                <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(alert.utilization, 100)}%` }}
                    transition={{ duration: 0.6 }}
                    className={`h-full rounded-full ${
                      alert.type === 'critical'
                        ? 'bg-red-500'
                        : alert.type === 'danger'
                        ? 'bg-orange-500'
                        : 'bg-yellow-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Action */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDismiss?.(alert.id)}
              className={`flex-shrink-0 mt-1 text-lg font-bold transition-colors ${
                alert.type === 'critical'
                  ? 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                  : alert.type === 'danger'
                  ? 'text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300'
                  : 'text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300'
              }`}
            >
              ×
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
