/**
 * Credit Card Detector
 * Detects card issuer from transaction narration
 */

export interface CardDetection {
  issuer: string;
  confidence: number; // 0-1
  suggestedCardName?: string;
}

const ISSUER_KEYWORDS: Record<string, { keywords: string[]; issuer: string }> = {
  HDFC: {
    keywords: ['HDFC', 'HDFC Bank', 'HDBK'],
    issuer: 'HDFC'
  },
  ICICI: {
    keywords: ['ICICI', 'ICICI Bank', 'ICBK'],
    issuer: 'ICICI'
  },
  SBI: {
    keywords: ['SBI', 'STATE BANK', 'SBIN'],
    issuer: 'SBI'
  },
  Axis: {
    keywords: ['AXIS', 'Axis Bank', 'UTIB'],
    issuer: 'Axis'
  }
};

/**
 * Detect card issuer from narration/description
 * Returns the detected issuer and confidence score
 */
export function detectCardFromNarration(description: string): CardDetection {
  if (!description) {
    return {
      issuer: 'Other',
      confidence: 0
    };
  }

  const upperDesc = description.toUpperCase();

  for (const [, data] of Object.entries(ISSUER_KEYWORDS)) {
    for (const keyword of data.keywords) {
      if (upperDesc.includes(keyword)) {
        return {
          issuer: data.issuer,
          confidence: 0.95,
          suggestedCardName: `${data.issuer} Card`
        };
      }
    }
  }

  // Check for partial matches
  if (upperDesc.includes('CREDIT') || upperDesc.includes('CARD') || upperDesc.includes('CC')) {
    return {
      issuer: 'Other',
      confidence: 0.3,
      suggestedCardName: 'Credit Card'
    };
  }

  return {
    issuer: 'Other',
    confidence: 0
  };
}

/**
 * Get list of all known issuers
 */
export function getKnownIssuers(): string[] {
  return ['HDFC', 'ICICI', 'SBI', 'Axis', 'Other'];
}
