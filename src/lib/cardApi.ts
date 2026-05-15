/**
 * Credit Card API Client
 * Handles all card-related API calls
 */

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

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

// API Methods
export const cardApi = {
  /**
   * Get all cards for a user
   */
  getCards: async (userId: number): Promise<CreditCard[]> => {
    return request(`cards/user/${userId}`);
  },

  /**
   * Get a specific card
   */
  getCard: async (cardId: string): Promise<CreditCard> => {
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
      creditLimit?: number;
      currentBalance?: number;
      rewardPointsBalance?: number;
      status?: string;
    }
  ): Promise<CreditCard> => {
    return request(`cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a card
   */
  deleteCard: async (cardId: string): Promise<void> => {
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
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());

    const query = params.toString();
    return request(`cards/${cardId}/expenses${query ? `?${query}` : ''}`);
  },

  /**
   * Get analytics for a specific card
   */
  getCardAnalytics: async (
    cardId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CardAnalytics> => {
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
    return request('expenses/bulk', {
      method: 'POST',
      body: JSON.stringify(items),
    });
  },
};

export default cardApi;
