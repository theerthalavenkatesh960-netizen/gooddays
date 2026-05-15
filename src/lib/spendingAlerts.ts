/**
 * Spending Alerts System
 * Generates alerts when utilization crosses thresholds
 */

export interface SpendingAlert {
  id: string;
  cardId: string;
  cardName: string;
  type: 'warning' | 'danger' | 'critical';
  title: string;
  message: string;
  utilization: number;
  recommendedAction: string;
  createdAt: Date;
  dismissed: boolean;
}

/**
 * Generate spending alert based on utilization
 */
export function generateSpendingAlert(
  cardId: string,
  cardName: string,
  currentBalance: number,
  creditLimit: number,
  rewardsPoints: number
): SpendingAlert | null {
  const utilization = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;
  const id = `alert-${cardId}-${Date.now()}`;

  // No alert if under 70%
  if (utilization < 70) return null;

  // Warning at 70-80%
  if (utilization < 80) {
    return {
      id,
      cardId,
      cardName,
      type: 'warning',
      title: '⚠️ Getting Close to Limit',
      message: `${cardName} is at ${utilization.toFixed(0)}% utilization. Consider paying before it reaches 90%.`,
      utilization,
      recommendedAction: 'Make a payment to reduce balance',
      createdAt: new Date(),
      dismissed: false
    };
  }

  // Danger at 80-95%
  if (utilization < 95) {
    return {
      id,
      cardId,
      cardName,
      type: 'danger',
      title: '🚨 High Credit Utilization',
      message: `${cardName} is now at ${utilization.toFixed(0)}% of your credit limit. This may impact your credit score.`,
      utilization,
      recommendedAction: 'Pay down the balance immediately',
      createdAt: new Date(),
      dismissed: false
    };
  }

  // Critical at 95%+
  return {
    id,
    cardId,
    cardName,
    type: 'critical',
    title: '🔴 CRITICAL: Card Nearly Maxed',
    message: `${cardName} is at ${utilization.toFixed(0)}% utilization! You're approaching your credit limit.`,
    utilization,
    recommendedAction: 'Pay down balance urgently to avoid transaction declines',
    createdAt: new Date(),
    dismissed: false
  };
}

/**
 * Analyze spending pattern and suggest budget adjustments
 */
export function analyzeBudgetHealth(
  currentBalance: number,
  creditLimit: number,
  monthlySpending: number,
  billingCycleDays: number = 30
): {
  healthScore: number; // 0-100
  status: 'healthy' | 'caution' | 'danger';
  projectedBalance: number;
  recommendedMonthlySpend: number;
  message: string;
} {
  const utilization = (currentBalance / creditLimit) * 100;
  const daysInCycle = billingCycleDays;
  const projectedMonthlySpend = (monthlySpending / daysInCycle) * 30;
  const recommendedMonthlySpend = creditLimit * 0.3; // Keep under 30% recommended

  let healthScore = 100;
  healthScore -= Math.min(utilization * 0.5, 50); // Up to -50 for utilization
  healthScore -= Math.min((projectedMonthlySpend - recommendedMonthlySpend) / recommendedMonthlySpend * 20, 50); // Up to -50 for overspending

  const status = healthScore > 70 ? 'healthy' : healthScore > 40 ? 'caution' : 'danger';

  let message = '';
  if (status === 'healthy') {
    message = `✅ Your spending is well-managed. Keep up the good habits!`;
  } else if (status === 'caution') {
    message = `⚠️ Your spending is trending high. Consider reducing discretionary expenses.`;
  } else {
    message = `🔴 Your spending pattern is unsustainable. Urgent budget adjustment needed.`;
  }

  return {
    healthScore: Math.max(healthScore, 0),
    status,
    projectedBalance: projectedMonthlySpend,
    recommendedMonthlySpend,
    message
  };
}

/**
 * Calculate days until credit statement closes
 */
export function getDaysUntilStatementClose(
  billingCycleEndDate: number,
  todayDate: Date = new Date()
): number {
  const today = todayDate.getDate();
  let daysLeft = billingCycleEndDate - today;

  if (daysLeft < 0) {
    // Will close next month
    const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
    daysLeft = (daysInMonth - today) + billingCycleEndDate;
  }

  return daysLeft;
}

/**
 * Get alert severity color
 */
export function getAlertColor(type: string): string {
  switch (type) {
    case 'warning': return '#FF9800';
    case 'danger': return '#F44336';
    case 'critical': return '#C62828';
    default: return '#2196F3';
  }
}
