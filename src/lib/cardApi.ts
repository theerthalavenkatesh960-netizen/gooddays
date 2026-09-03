/**
 * Credit Card API Client
 * Handles all card-related API calls
 */

import { DUMMY_FLAGS } from './api';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';
const USE_DUMMY_FINANCE = DUMMY_FLAGS.finance;

function getAuthHeader(): Record<string, string> {
  const session = localStorage.getItem('gd_session');
  if (!session) return {};
  try {
    const parsed = JSON.parse(session);
    return { Authorization: `Bearer ${parsed.access_token}` };
  } catch {
    return {};
  }
}

async function request(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Types
export interface CreditCard {
  id: string;
  userId: number;
  name: string;
  issuer: 'HDFC' | 'ICICI' | 'SBI' | 'Axis' | 'Other';
  last4Digits?: string;
  creditLimit?: number;
  billingCycleStartDate?: number;
  billingCycleEndDate?: number;
  rewardsRate?: number;
  rewardPointsBalance?: number;
  currentBalance?: number;
  status: 'active' | 'inactive' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface CardExpense {
  id: string;
  cardId: string;
  expenseId: number;
  assignedAt: string;
  createdAt: string;
}

export interface CardAnalytics {
  card: {
    id: string;
    name: string;
    issuer: string;
    creditLimit?: number;
    currentBalance?: number;
    rewardPointsBalance?: number;
  };
  totalSpending: number;
  transactionCount: number;
  byCategory: Array<{
    category: string;
    total: number;
    count: number;
  }>;
  startDate?: string;
  endDate?: string;
}

export interface AccountInstrumentSummary {
  name: string;
  type: 'WALLET' | 'BANK_ACCOUNT' | 'UPI' | 'OTHER';
  topUps: number;
  spends: number;
  refunds: number;
  estimatedBalance: number;
  debits: number;
  credits: number;
  last4?: string;
  transactionCount: number;
  latestActivity?: string;
  recentTransactions: Array<{
    id: number;
    description: string;
    amount: number;
    category?: string;
    date?: string;
    direction: string;
    transactionType: string;
    sourceInstrumentType?: string;
    destinationInstrumentType?: string;
    destinationInstrumentName?: string;
  }>;
}

let DUMMY_CARDS: CreditCard[] = [
  {
    id: 'd9d9e3d5-4f92-4cb7-ae21-2d589d9f0001',
    userId: 1,
    name: 'HDFC Regalia',
    issuer: 'HDFC',
    last4Digits: '1287',
    creditLimit: 300000,
    billingCycleStartDate: 1,
    billingCycleEndDate: 30,
    rewardsRate: 2.0,
    rewardPointsBalance: 12840,
    currentBalance: 186500,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd9d9e3d5-4f92-4cb7-ae21-2d589d9f0002',
    userId: 1,
    name: 'ICICI Coral',
    issuer: 'ICICI',
    last4Digits: '7742',
    creditLimit: 150000,
    billingCycleStartDate: 5,
    billingCycleEndDate: 4,
    rewardsRate: 1.5,
    rewardPointsBalance: 7450,
    currentBalance: 68400,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd9d9e3d5-4f92-4cb7-ae21-2d589d9f0003',
    userId: 1,
    name: 'Axis Ace',
    issuer: 'Axis',
    last4Digits: '4421',
    creditLimit: 200000,
    billingCycleStartDate: 10,
    billingCycleEndDate: 9,
    rewardsRate: 2.5,
    rewardPointsBalance: 9320,
    currentBalance: 96420,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function getDummyCardsForUser(userId: number): CreditCard[] {
  return DUMMY_CARDS.map((c) => ({ ...c, userId }));
}

function getDummyAnalytics(cardId: string, startDate?: Date, endDate?: Date): CardAnalytics {
  const card = DUMMY_CARDS.find(c => c.id === cardId) || DUMMY_CARDS[0];
  const categoriesByIssuer: Record<string, Array<{ category: string; total: number; count: number }>> = {
    HDFC: [
      { category: 'Food', total: 22500, count: 14 },
      { category: 'Shopping', total: 38100, count: 9 },
      { category: 'Travel', total: 18450, count: 4 },
      { category: 'Utilities', total: 7800, count: 5 },
    ],
    ICICI: [
      { category: 'Food', total: 12800, count: 10 },
      { category: 'Transport', total: 9700, count: 11 },
      { category: 'Entertainment', total: 8400, count: 6 },
      { category: 'Shopping', total: 14200, count: 4 },
    ],
    Axis: [
      { category: 'Fuel', total: 15600, count: 10 },
      { category: 'Bills', total: 12100, count: 6 },
      { category: 'Food', total: 10400, count: 8 },
      { category: 'Subscriptions', total: 3300, count: 5 },
    ],
    SBI: [
      { category: 'Food', total: 9100, count: 8 },
      { category: 'Shopping', total: 12200, count: 4 },
      { category: 'Bills', total: 7100, count: 5 },
    ],
    Other: [
      { category: 'Food', total: 7500, count: 7 },
      { category: 'Shopping', total: 9800, count: 4 },
      { category: 'Utilities', total: 4300, count: 3 },
    ],
  };

  const byCategory = categoriesByIssuer[card.issuer] || categoriesByIssuer.Other;
  const totalSpending = byCategory.reduce((sum, c) => sum + c.total, 0);
  const transactionCount = byCategory.reduce((sum, c) => sum + c.count, 0);

  return {
    card: {
      id: card.id,
      name: card.name,
      issuer: card.issuer,
      creditLimit: card.creditLimit,
      currentBalance: card.currentBalance,
      rewardPointsBalance: card.rewardPointsBalance,
    },
    totalSpending,
    transactionCount,
    byCategory,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
  };
}

function getDummyExpenses(cardId: string): Array<{ id: number; description: string; amount: number; category: string; date: string; createdAt: string }> {
  const analytics = getDummyAnalytics(cardId);
  const now = new Date();
  let idCounter = 1;

  const expenses = analytics.byCategory.flatMap((cat, catIndex) => {
    const count = Math.max(cat.count, 1);
    const perTxn = Math.round(cat.total / count);
    return Array.from({ length: count }).map((_, idx) => {
      const daysAgo = catIndex * 3 + idx;
      const date = new Date(now);
      date.setDate(now.getDate() - daysAgo);
      return {
        id: idCounter++,
        description: `${cat.category} spend #${idx + 1}`,
        amount: perTxn,
        category: cat.category,
        date: date.toISOString(),
        createdAt: date.toISOString(),
      };
    });
  });

  return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// API Methods
export const cardApi = {
  /**
   * Get all cards for a user
   */
  getCards: async (userId: number): Promise<CreditCard[]> => {
    if (USE_DUMMY_FINANCE) {
      return Promise.resolve(getDummyCardsForUser(userId));
    }
    return request(`cards/user/${userId}`);
  },

  getAccountInstruments: async (userId: number): Promise<AccountInstrumentSummary[]> => {
    if (USE_DUMMY_FINANCE) return Promise.resolve([]);
    return request(`cards/user/${userId}/instruments`);
  },

  /**
   * Get a specific card
   */
  getCard: async (cardId: string): Promise<CreditCard> => {
    if (USE_DUMMY_FINANCE) {
      const found = DUMMY_CARDS.find(c => c.id === cardId) || DUMMY_CARDS[0];
      return Promise.resolve({ ...found });
    }
    return request(`cards/${cardId}`);
  },

  /**
   * Create a new card
   */
  createCard: async (data: {
    userId: number;
    name: string;
    issuer?: string;
    last4Digits?: string;
    creditLimit?: number;
    billingCycleStartDate?: number;
    billingCycleEndDate?: number;
    rewardsRate?: number;
    rewardPointsBalance?: number;
    currentBalance?: number;
    status?: string;
  }): Promise<CreditCard> => {
    if (USE_DUMMY_FINANCE) {
      const created: CreditCard = {
        id: crypto.randomUUID(),
        userId: data.userId,
        name: data.name,
        issuer: (data.issuer as CreditCard['issuer']) || 'Other',
        last4Digits: data.last4Digits,
        creditLimit: data.creditLimit,
        billingCycleStartDate: data.billingCycleStartDate,
        billingCycleEndDate: data.billingCycleEndDate,
        rewardsRate: data.rewardsRate,
        rewardPointsBalance: data.rewardPointsBalance || 0,
        currentBalance: data.currentBalance || 0,
        status: (data.status as CreditCard['status']) || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      DUMMY_CARDS.push(created);
      return Promise.resolve(created);
    }
    return request('cards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a card
   */
  updateCard: async (
    cardId: string,
    data: {
      name?: string;
      issuer?: string;
      last4Digits?: string;
      creditLimit?: number;
      billingCycleStartDate?: number;
      billingCycleEndDate?: number;
      rewardsRate?: number;
      currentBalance?: number;
      rewardPointsBalance?: number;
      status?: string;
    }
  ): Promise<CreditCard> => {
    if (USE_DUMMY_FINANCE) {
      const idx = DUMMY_CARDS.findIndex(c => c.id === cardId);
      const base = idx >= 0 ? DUMMY_CARDS[idx] : DUMMY_CARDS[0];
      const updated: CreditCard = {
        ...base,
        ...data,
        issuer: (data.issuer as CreditCard['issuer']) || base.issuer,
        status: (data.status as CreditCard['status']) || base.status,
        updatedAt: new Date().toISOString(),
      };

      if (idx >= 0) {
        DUMMY_CARDS[idx] = updated;
      }

      return Promise.resolve(updated);
    }
    return request(`cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a card
   */
  deleteCard: async (cardId: string): Promise<void> => {
    if (USE_DUMMY_FINANCE) {
      DUMMY_CARDS = DUMMY_CARDS.filter(c => c.id !== cardId);
      return Promise.resolve();
    }
    return request(`cards/${cardId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get expenses for a specific card
   */
  getCardExpenses: async (
    cardId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> => {
    if (USE_DUMMY_FINANCE) {
      let items = getDummyExpenses(cardId);
      if (startDate) {
        items = items.filter((e) => new Date(e.date) >= startDate);
      }
      if (endDate) {
        items = items.filter((e) => new Date(e.date) <= endDate);
      }
      return Promise.resolve(items);
    }
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());

    const query = params.toString();
    return request(`cards/${cardId}/expenses${query ? `?${query}` : ''}`);
  },

  /**
   * Get statement history for a specific card
   */
  getCardStatements: async (cardId: string): Promise<any[]> => {
    if (USE_DUMMY_FINANCE) return Promise.resolve([]);
    return request(`cards/${cardId}/statements`);
  },

  /**
   * Get orders linked to transactions on a specific card
   */
  getCardOrders: async (cardId: string): Promise<any[]> => {
    if (USE_DUMMY_FINANCE) return Promise.resolve([]);
    return request(`cards/${cardId}/orders`);
  },

  /**
   * Get analytics for a specific card
   */
  getCardAnalytics: async (
    cardId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CardAnalytics> => {
    if (USE_DUMMY_FINANCE) {
      return Promise.resolve(getDummyAnalytics(cardId, startDate, endDate));
    }
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());

    const query = params.toString();
    return request(`cards/${cardId}/analytics${query ? `?${query}` : ''}`);
  },

  /**
   * Bulk create expenses and link to cards
   */
  bulkCreateExpenses: async (items: Array<{
    expense: {
      userId: number;
      description?: string;
      note?: string;
      amount: number;
      category?: string;
      date?: string;
    };
    cardId?: string;
  }>): Promise<{ count: number; cardIdMap: Record<string, number> }> => {
    if (USE_DUMMY_FINANCE) {
      const cardIdMap: Record<string, number> = {};
      for (const item of items) {
        if (item.cardId) {
          cardIdMap[item.cardId] = (cardIdMap[item.cardId] || 0) + 1;
        }
      }
      return Promise.resolve({ count: items.length, cardIdMap });
    }
    return request('expenses/bulk', {
      method: 'POST',
      body: JSON.stringify(items),
    });
  },
};

export default cardApi;
