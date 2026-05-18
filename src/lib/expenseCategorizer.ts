/**
 * Expense Categorizer
 * Auto-categorizes transactions based on keywords in description
 */

const CATEGORIZATION_RULES: Array<{
  category: string;
  keywords: string[];
  confidence?: number;
}> = [
  {
    category: 'Food',
    keywords: ['Swiggy', 'Zomato', 'Uber Eats', 'restaurant', 'cafe', 'pizza', 'burger', 'food delivery', 'dining']
  },
  {
    category: 'Groceries',
    keywords: ['Bigbasket', 'Blinkit', 'Instamart', 'amazon fresh', 'Dunzo', 'grocery', 'supermarket', 'dmart', 'reliance']
  },
  {
    category: 'Transport',
    keywords: ['Uber', 'Ola', 'Metro', 'autorickshaw', 'taxi', 'cab', 'transport', 'fuel', 'petrol pump', 'railway', 'parking']
  },
  {
    category: 'Fuel',
    keywords: ['Shell', 'Caltex', 'Bharat Petroleum', 'Indian Oil', 'Hindustan Petroleum', 'petrol', 'diesel', 'fuel', 'pump']
  },
  {
    category: 'Shopping',
    keywords: ['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Nykaa', 'Uniqlo', 'Decathlon', 'shopping', 'mall', 'retail']
  },
  {
    category: 'Entertainment',
    keywords: ['Netflix', 'Prime Video', 'Disney', 'Hotstar', 'YouTube', 'Spotify', 'Apple Music', 'gaming', 'movie', 'cinema', 'entertainment', 'subscription']
  },
  {
    category: 'Medical',
    keywords: ['Pharmeasy', 'Apollo', 'Practo', 'hospital', 'clinic', 'pharmacy', 'doctor', 'medicine', 'health', 'dental', 'lab', 'medical']
  },
  {
    category: 'Gym',
    keywords: ['Gym', 'Fitness', 'Cult', 'Curefit', 'Peloton', 'yoga', 'trainer', 'gym membership', 'fitness']
  },
  {
    category: 'Travel',
    keywords: ['Booking', 'Goibibo', 'MakeMyTrip', 'Agoda', 'Airbnb', 'Hotel', 'Flight', 'airline', 'resort', 'vacation', 'trip']
  },
  {
    category: 'Education',
    keywords: ['Udemy', 'Coursera', 'LinkedIn Learning', 'Byju', 'Vedantu', 'education', 'school', 'college', 'course', 'tuition']
  },
  {
    category: 'Utilities',
    keywords: ['Electricity', 'Water Supply', 'Gas', 'utility', 'bill', 'power', 'sewage', 'BESCOM', 'MERC', 'TSSPDCL']
  },
  {
    category: 'Internet',
    keywords: ['JioFiber', 'Airtel', 'Vodafone', 'ACT Fibernet', 'Spectra', 'Netplus', 'Internet', 'broadband', 'wifi', 'Jio']
  },
  {
    category: 'Personal',
    keywords: ['Salon', 'Spa', 'Haircut', 'Makeup', 'Beauty', 'Fashion', 'Apparel', 'Clothing', 'Dress']
  },
  {
    category: 'Self Care',
    keywords: ['Spa', 'Massage', 'Salon', 'beauty', 'skincare', 'wellness', 'self-care']
  },
  {
    category: 'Other',
    keywords: ['Transfer', 'Payment', 'Charge', 'Fee', 'Loan']
  },
  {
    category: 'Bank Credit',
    keywords: ['Salary', 'Deposit', 'Credit', 'Refund', 'NEFT', 'RTGS', 'IMPS', 'Transfer In', 'Fund Transfer', 'UPI Receive', 'Dividend', 'Interest']
  }
];

/**
 * Auto-categorize a transaction based on its description
 * Returns the best matching category or 'Other'
 */
export function autoCategory(description: string): string {
  if (!description) return 'Other';

  const upperDesc = description.toUpperCase();

  // Exact matches have highest priority
  for (const rule of CATEGORIZATION_RULES) {
    for (const keyword of rule.keywords) {
      if (upperDesc === keyword.toUpperCase()) {
        return rule.category;
      }
    }
  }

  // Partial matches
  for (const rule of CATEGORIZATION_RULES) {
    for (const keyword of rule.keywords) {
      if (upperDesc.includes(keyword.toUpperCase())) {
        return rule.category;
      }
    }
  }

  return 'Other';
}

/**
 * Get all available categories
 */
export function getAvailableCategories(): string[] {
  const categories = new Set(CATEGORIZATION_RULES.map(r => r.category));
  return Array.from(categories).sort();
}

/**
 * Get keywords for a specific category
 */
export function getKeywordsForCategory(category: string): string[] {
  const rule = CATEGORIZATION_RULES.find(r => r.category === category);
  return rule ? rule.keywords : [];
}
