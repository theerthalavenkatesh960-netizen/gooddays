/**
 * Bank Statement Parser
 * Detects bank format and parses Excel/CSV statements into normalized transactions
 */

export interface RawTransaction {
  date: Date;
  narration: string;
  debit?: number;
  credit?: number;
  balance?: number;
}

export type BankFormat = 'HDFC' | 'ICICI' | 'SBI' | 'Axis' | 'Generic' | 'Unknown';

/**
 * Detect bank from column headers
 */
export function detectBankFormat(headers: string[]): BankFormat {
  const normalized = headers.map(h => h.toLowerCase().trim());
  
  // HDFC patterns
  if (normalized.some(h => h.includes('narration')) && 
      normalized.some(h => h.includes('withdrawal'))) {
    return 'HDFC';
  }
  
  // ICICI patterns
  if (normalized.some(h => h.includes('remarks')) && 
      normalized.some(h => h.includes('withdrawal amount'))) {
    return 'ICICI';
  }
  
  // SBI patterns
  if (normalized.some(h => h.includes('description')) && 
      normalized.some(h => h.includes('debit') && h.includes('credit'))) {
    return 'SBI';
  }
  
  // Axis patterns
  if (normalized.some(h => h.includes('particulars')) && 
      normalized.some(h => h.includes('dr') || h.includes('cr'))) {
    return 'Axis';
  }
  
  return 'Generic';
}

/**
 * Find column index by pattern matching
 */
function findColumnIndex(headers: string[], patterns: string[]): number {
  const normalized = headers.map(h => h.toLowerCase().trim());
  for (let i = 0; i < normalized.length; i++) {
    if (patterns.some(p => normalized[i].includes(p.toLowerCase()))) {
      return i;
    }
  }
  return -1;
}

/**
 * Parse transaction row based on detected bank format
 */
function parseRow(row: any[], headers: string[], format: BankFormat): RawTransaction | null {
  try {
    let date: Date | null = null;
    let narration = '';
    let debit: number | undefined;
    let credit: number | undefined;

    if (format === 'HDFC') {
      const dateIdx = findColumnIndex(headers, ['date', 'txn date']);
      const narrationIdx = findColumnIndex(headers, ['narration', 'description']);
      const withdrawalIdx = findColumnIndex(headers, ['withdrawal']);
      const depositIdx = findColumnIndex(headers, ['deposit']);

      if (dateIdx >= 0) date = parseDate(row[dateIdx]);
      if (narrationIdx >= 0) narration = String(row[narrationIdx] || '').trim();
      if (withdrawalIdx >= 0) debit = parseFloat(row[withdrawalIdx]) || undefined;
      if (depositIdx >= 0) credit = parseFloat(row[depositIdx]) || undefined;
    } else if (format === 'ICICI') {
      const dateIdx = findColumnIndex(headers, ['transaction date', 'date']);
      const remarksIdx = findColumnIndex(headers, ['remarks', 'description']);
      const withdrawalIdx = findColumnIndex(headers, ['withdrawal']);
      const depositIdx = findColumnIndex(headers, ['deposit']);

      if (dateIdx >= 0) date = parseDate(row[dateIdx]);
      if (remarksIdx >= 0) narration = String(row[remarksIdx] || '').trim();
      if (withdrawalIdx >= 0) debit = parseFloat(row[withdrawalIdx]) || undefined;
      if (depositIdx >= 0) credit = parseFloat(row[depositIdx]) || undefined;
    } else if (format === 'SBI') {
      const dateIdx = findColumnIndex(headers, ['txn date', 'date']);
      const descIdx = findColumnIndex(headers, ['description']);
      const debitIdx = findColumnIndex(headers, ['debit']);
      const creditIdx = findColumnIndex(headers, ['credit']);

      if (dateIdx >= 0) date = parseDate(row[dateIdx]);
      if (descIdx >= 0) narration = String(row[descIdx] || '').trim();
      if (debitIdx >= 0) debit = parseFloat(row[debitIdx]) || undefined;
      if (creditIdx >= 0) credit = parseFloat(row[creditIdx]) || undefined;
    } else if (format === 'Axis') {
      const dateIdx = findColumnIndex(headers, ['tran date', 'date']);
      const particIdx = findColumnIndex(headers, ['particulars', 'description']);
      const drIdx = findColumnIndex(headers, ['dr']);
      const crIdx = findColumnIndex(headers, ['cr']);

      if (dateIdx >= 0) date = parseDate(row[dateIdx]);
      if (particIdx >= 0) narration = String(row[particIdx] || '').trim();
      if (drIdx >= 0) debit = parseFloat(row[drIdx]) || undefined;
      if (crIdx >= 0) credit = parseFloat(row[crIdx]) || undefined;
    } else {
      // Generic: find common column names
      const dateIdx = findColumnIndex(headers, ['date', 'txn date', 'transaction date']);
      const descIdx = findColumnIndex(headers, ['description', 'narration', 'particulars', 'remarks']);
      const amountIdx = findColumnIndex(headers, ['amount', 'debit', 'withdrawal']);
      const creditIdx = findColumnIndex(headers, ['credit', 'deposit']);

      if (dateIdx >= 0) date = parseDate(row[dateIdx]);
      if (descIdx >= 0) narration = String(row[descIdx] || '').trim();
      if (amountIdx >= 0) debit = parseFloat(row[amountIdx]) || undefined;
      if (creditIdx >= 0) credit = parseFloat(row[creditIdx]) || undefined;
    }

    if (!date || !narration) return null;

    return {
      date,
      narration,
      debit,
      credit
    };
  } catch (e) {
    console.warn('Failed to parse row:', e);
    return null;
  }
}

/**
 * Parse date string in various formats
 */
function parseDate(dateStr: any): Date | null {
  if (!dateStr) return null;

  // If already a Date object
  if (dateStr instanceof Date) return dateStr;

  // Convert to string
  const str = String(dateStr).trim();

  // Try common Indian date formats
  const formats = [
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/ // D Month YYYY
  ];

  for (const fmt of formats) {
    const match = str.match(fmt);
    if (match) {
      try {
        if (fmt.source.includes('-') && match[0].split('-')[2].length === 4) {
          // YYYY-MM-DD or DD-MM-YYYY
          const [, p1, p2, p3] = match;
          const year = p3.length === 4 ? p3 : p1;
          const month = p3.length === 4 ? p2 : p2;
          const day = p3.length === 4 ? p1 : p3;
          return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        }
        return new Date(str);
      } catch {
        continue;
      }
    }
  }

  // Fallback: try standard parsing
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parse Excel/CSV file and return normalized transactions
 */
export async function parseStatement(file: File): Promise<RawTransaction[]> {
  // Dynamic import of xlsx
  const XLSX = (await import('xlsx')).default;

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  if (!sheet) {
    throw new Error('No data found in the uploaded file');
  }

  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rows.length < 2) {
    throw new Error('File has insufficient data (need at least header + 1 data row)');
  }

  const headers = rows[0] as string[];
  const format = detectBankFormat(headers);

  console.log('Detected bank format:', format);
  console.log('Headers:', headers);

  const transactions: RawTransaction[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((cell: any) => cell === null || cell === '' || cell === undefined)) {
      continue; // Skip empty rows
    }

    const tx = parseRow(row, headers, format);
    if (tx) {
      transactions.push(tx);
    }
  }

  return transactions;
}

/**
 * Get displayable bank name
 */
export function getBankDisplayName(format: BankFormat): string {
  const bankNames: Record<BankFormat, string> = {
    HDFC: 'HDFC Bank',
    ICICI: 'ICICI Bank',
    SBI: 'SBI',
    Axis: 'Axis Bank',
    Generic: 'Generic Format',
    Unknown: 'Unknown Bank'
  };
  return bankNames[format];
}
