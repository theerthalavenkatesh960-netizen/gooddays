/**
 * Card Designer - Generates beautiful, unique card designs based on spending data
 * Creates visually distinct cards for each card issuer with algorithmic design
 */

export interface CardDesign {
  gradientStart: string;
  gradientEnd: string;
  accentColor: string;
  iconColor: string;
  pattern: 'dots' | 'waves' | 'grid' | 'circles' | 'lines';
  theme: 'premium' | 'tech' | 'minimal' | 'vibrant' | 'luxury';
  seed: string;
}

/**
 * Generate a unique card design based on issuer and spending patterns
 */
export function generateCardDesign(
  issuer: string,
  totalSpending: number,
  categoryDiversity: number,
  seed: string
): CardDesign {
  // Deterministic hash function from seed
  const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h = h & h;
    }
    return Math.abs(h);
  };

  const seedHash = hash(seed);
  const random = (min: number, max: number) => {
    const r = Math.sin(seedHash * 12.9898 + hash(seed + min)) * 43758.5453;
    return min + ((r - Math.floor(r)) * (max - min));
  };

  // Issuer base theme
  const issuerThemes: Record<string, Partial<CardDesign>> = {
    HDFC: {
      gradientStart: '#1a5fb8',
      gradientEnd: '#0066cc',
      accentColor: '#00d4ff',
      theme: 'premium'
    },
    ICICI: {
      gradientStart: '#ff6b35',
      gradientEnd: '#f7931e',
      accentColor: '#ffc857',
      theme: 'vibrant'
    },
    SBI: {
      gradientStart: '#0d7a66',
      gradientEnd: '#2d9b6e',
      accentColor: '#95d5b2',
      theme: 'minimal'
    },
    Axis: {
      gradientStart: '#6f42c1',
      gradientEnd: '#9d4edd',
      accentColor: '#c77dff',
      theme: 'luxury'
    },
    Other: {
      gradientStart: '#454545',
      gradientEnd: '#757575',
      accentColor: '#b0bec5',
      theme: 'tech'
    }
  };

  const baseTheme = issuerThemes[issuer] || issuerThemes.Other;

  // Add variation based on spending
  const spendingHue = (totalSpending % 360) * 0.5;
  const diversityTheme = categoryDiversity > 0.7 ? 'vibrant' : categoryDiversity > 0.4 ? 'premium' : 'minimal';

  // Pattern selection
  const patterns: Array<'dots' | 'waves' | 'grid' | 'circles' | 'lines'> = ['dots', 'waves', 'grid', 'circles', 'lines'];
  const patternIndex = Math.floor(random(0, patterns.length));

  return {
    gradientStart: baseTheme.gradientStart!,
    gradientEnd: baseTheme.gradientEnd!,
    accentColor: baseTheme.accentColor!,
    iconColor: '#ffffff',
    pattern: patterns[patternIndex],
    theme: baseTheme.theme as any,
    seed
  };
}

/**
 * Get HSL color values from gradient for animations
 */
export function getCardColors(design: CardDesign) {
  return {
    primary: hexToHSL(design.gradientStart),
    secondary: hexToHSL(design.gradientEnd),
    accent: hexToHSL(design.accentColor),
    icon: design.iconColor
  };
}

/**
 * Convert hex to HSL for easier manipulation
 */
function hexToHSL(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

/**
 * Get card pattern SVG for background
 */
export function getCardPatternSVG(pattern: string, gradientId: string): string {
  const patterns: Record<string, string> = {
    dots: `
      <defs>
        <pattern id="${gradientId}-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="3" fill="rgba(255,255,255,0.1)" />
        </pattern>
      </defs>
    `,
    waves: `
      <defs>
        <pattern id="${gradientId}-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M0,50 Q25,40 50,50 T100,50" stroke="rgba(255,255,255,0.1)" stroke-width="2" fill="none" />
        </pattern>
      </defs>
    `,
    grid: `
      <defs>
        <pattern id="${gradientId}-pattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="30" height="30" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
        </pattern>
      </defs>
    `,
    circles: `
      <defs>
        <pattern id="${gradientId}-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="30" cy="30" r="15" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
        </pattern>
      </defs>
    `,
    lines: `
      <defs>
        <pattern id="${gradientId}-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="20" y2="20" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
        </pattern>
      </defs>
    `
  };

  return patterns[pattern] || patterns.dots;
}

/**
 * Calculate category diversity score (0-1)
 * Higher = more diverse spending across categories
 */
export function calculateCategoryDiversity(categorySpending: Record<string, number>): number {
  const categories = Object.keys(categorySpending);
  if (categories.length === 0) return 0;

  const total = Object.values(categorySpending).reduce((s, v) => s + v, 0);
  if (total === 0) return 0;

  // Shannon entropy formula for diversity
  const entropy = -Object.values(categorySpending).reduce((sum, val) => {
    const p = val / total;
    return sum + (p > 0 ? p * Math.log2(p) : 0);
  }, 0);

  // Normalize to 0-1 (max entropy for n categories is log2(n))
  const maxEntropy = Math.log2(Math.min(categories.length, 10));
  return Math.min(entropy / maxEntropy, 1);
}
