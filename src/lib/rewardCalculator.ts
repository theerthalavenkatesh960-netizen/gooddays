/**
 * Reward Redemption Calculator
 * Tracks reward points and converts to rupee values
 */

export interface RewardValue {
  points: number;
  rupeeValue: number;
  equivalentProducts: string[];
  bestRedemptionOpportunity: string;
}

export interface EMIInfo {
  amount: number;
  remainingMonths: number;
  monthlyPayment: number;
  totalRemaining: number;
  isActive: boolean;
  nextPaymentDate: string;
}

/**
 * Calculate rupee value from reward points
 */
export function calculateRewardRupeeValue(
  points: number,
  redemptionRate: number = 1
): RewardValue {
  // Standard: 100 points = 1 rupee, customizable
  const pointsPerRupee = 100 / redemptionRate;
  const rupeeValue = Math.floor(points / pointsPerRupee);

  // Common redemption opportunities
  const equivalentProducts = [];
  if (rupeeValue >= 100) equivalentProducts.push('Coffee from premium café');
  if (rupeeValue >= 500) equivalentProducts.push('Movie ticket + popcorn combo');
  if (rupeeValue >= 1000) equivalentProducts.push('Basic meal for 2 at restaurant');
  if (rupeeValue >= 2000) equivalentProducts.push('Premium dinner');
  if (rupeeValue >= 5000) equivalentProducts.push('Weekend trip expenses');

  return {
    points,
    rupeeValue,
    equivalentProducts,
    bestRedemptionOpportunity: equivalentProducts[equivalentProducts.length - 1] || 'Keep accumulating'
  };
}

/**
 * Estimate rewards earned from spending
 */
export function estimateRewardsEarned(
  spending: number,
  rewardsRate: number
): {
  earnedPoints: number;
  earnedRupees: number;
  breakdown: Record<string, number>;
} {
  // Typical rewards rates: 1-2.5% of spending as points
  const basePoints = spending * (rewardsRate / 100);
  const earnedPoints = Math.floor(basePoints);
  const earnedRupees = Math.floor(earnedPoints / 100);

  return {
    earnedPoints,
    earnedRupees,
    breakdown: {
      baseCategoryPoints: Math.floor(earnedPoints * 0.6),
      bonusPointsDays: Math.floor(earnedPoints * 0.3),
      specialOffers: Math.floor(earnedPoints * 0.1)
    }
  };
}

/**
 * Calculate EMI breakdown
 */
export function calculateEMIBreakdown(
  loanAmount: number,
  monthlyEMI: number,
  remainingMonths: number
): {
  monthlyEMI: number;
  totalRemaining: number;
  principalRemaining: number;
  interestRemaining: number;
  breakdown: Array<{
    month: number;
    emi: number;
    principal: number;
    interest: number;
    balance: number;
  }>;
} {
  const breakdown = [];
  let balance = loanAmount;
  let totalInterest = 0;

  for (let i = 0; i < remainingMonths; i++) {
    const interest = Math.round(balance * 0.01); // Approximate interest
    const principal = monthlyEMI - interest;
    balance -= principal;

    breakdown.push({
      month: i + 1,
      emi: monthlyEMI,
      principal: Math.round(principal),
      interest,
      balance: Math.max(balance, 0)
    });

    totalInterest += interest;
  }

  return {
    monthlyEMI,
    totalRemaining: monthlyEMI * remainingMonths,
    principalRemaining: Math.max(balance, 0),
    interestRemaining: totalInterest,
    breakdown
  };
}

/**
 * Get EMI payment due date
 */
export function getEMIPaymentDueDate(paymentDueDay: number): {
  dueDate: Date;
  daysUntilDue: number;
  isOverdue: boolean;
} {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  let dueDate = new Date(currentYear, currentMonth, paymentDueDay);

  // If the due date has passed this month, next month's due date
  if (dueDate < today) {
    dueDate = new Date(currentYear, currentMonth + 1, paymentDueDay);
  }

  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return {
    dueDate,
    daysUntilDue,
    isOverdue: daysUntilDue < 0
  };
}

/**
 * Format EMI info for display
 */
export function formatEMIInfo(emiAmount: number, remainingMonths: number, paymentDay: number): EMIInfo {
  const dueDateInfo = getEMIPaymentDueDate(paymentDay);

  return {
    amount: emiAmount,
    remainingMonths,
    monthlyPayment: emiAmount,
    totalRemaining: emiAmount * remainingMonths,
    isActive: remainingMonths > 0,
    nextPaymentDate: dueDateInfo.dueDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  };
}

/**
 * Calculate payoff projection
 */
export function calculatePayoffProjection(
  currentBalance: number,
  monthlyPayment: number,
  interestRate: number = 0
): {
  monthsToPayoff: number;
  totalInterestPaid: number;
  projectedPayoffDate: Date;
  monthlyBreakdown: Array<{ month: number; balance: number; interestPaid: number }>;
} {
  let balance = currentBalance;
  let monthsToPayoff = 0;
  let totalInterestPaid = 0;
  const breakdown = [];

  while (balance > 0 && monthsToPayoff < 60) {
    const monthlyInterest = Math.round(balance * (interestRate / 100 / 12));
    const principal = Math.min(monthlyPayment - monthlyInterest, balance);
    balance -= principal;
    totalInterestPaid += monthlyInterest;
    monthsToPayoff++;

    breakdown.push({
      month: monthsToPayoff,
      balance: Math.max(balance, 0),
      interestPaid: monthlyInterest
    });
  }

  const projectedPayoffDate = new Date();
  projectedPayoffDate.setMonth(projectedPayoffDate.getMonth() + monthsToPayoff);

  return {
    monthsToPayoff,
    totalInterestPaid,
    projectedPayoffDate,
    monthlyBreakdown: breakdown
  };
}
