import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ChevronRight, AlertCircle, CheckCircle2, Copy } from 'lucide-react';
import { parseStatement, getBankDisplayName } from '../../lib/bankStatementParser';
import { detectCardFromNarration } from '../../lib/cardDetector';
import { autoCategory } from '../../lib/expenseCategorizer';
import cardApi, { CreditCard } from '../../lib/cardApi';
import * as api from '../../lib/api';

interface ImportedTransaction {
  date: Date;
  narration: string;
  debit?: number;
  credit?: number;
  category: string;
  cardId: string;
  skip: boolean;
  isDuplicate: boolean;
}

interface BankStatementImportProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const EXPENSE_CATEGORIES = [
  'Food', 'Groceries', 'Transport', 'Fuel', 'Home', 'Rent', 'Utilities',
  'Internet', 'Subscriptions', 'Personal', 'Medical', 'Gym', 'Self Care',
  'Fun', 'Shopping', 'Education', 'Books', 'Coffee', 'Travel', 'Other', 'Bank Credit'
];

export default function BankStatementImport({
  userId,
  isOpen,
  onClose,
  onSuccess,
}: BankStatementImportProps) {
  const [step, setStep] = useState<'upload' | 'card-select' | 'preview' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [suggestedIssuer, setSuggestedIssuer] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'debits' | 'credits' | 'duplicates'>('all');
  const [importedCount, setImportedCount] = useState(0);

  const handleFileSelect = async (f: File) => {
    setError('');
    setFile(f);
    setLoading(true);

    try {
      const parsed = await parseStatement(f);

      // Fetch existing expenses for dedup
      const existingExpenses = await api.getExpenses(userId);
      const dupSet = new Set(
        existingExpenses.map(e => `${new Date(e.date).toDateString()}|${e.amount}`)
      );

      // Detect card from narrations
      const allIssuers: Record<string, number> = {};
      parsed.forEach(t => {
        const detected = detectCardFromNarration(t.narration);
        allIssuers[detected.issuer] = (allIssuers[detected.issuer] || 0) + 1;
      });

      const mostCommonIssuer = Object.entries(allIssuers).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      setSuggestedIssuer(mostCommonIssuer);

      // Transform to import format
      const txns: ImportedTransaction[] = parsed.map(t => ({
        ...t,
        category: autoCategory(t.narration),
        cardId: '',
        skip: false,
        isDuplicate: dupSet.has(`${t.date.toDateString()}|${t.debit || t.credit}`)
      }));

      setTransactions(txns);

      // Fetch user cards
      const userCards = await cardApi.getCards(userId);
      setCards(userCards);

      // Try to auto-select card if we detected an issuer
      if (mostCommonIssuer && mostCommonIssuer !== 'Other') {
        const matchingCard = userCards.find(c => c.issuer === mostCommonIssuer);
        if (matchingCard) {
          setSelectedCard(matchingCard.id);
          // Assign this card to all transactions
          setTransactions(txns.map(t => ({ ...t, cardId: matchingCard.id })));
        }
      }

      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (t.skip) return false;
    if (filterType === 'debits') return t.debit && t.debit > 0;
    if (filterType === 'credits') return t.credit && t.credit > 0;
    if (filterType === 'duplicates') return t.isDuplicate;
    return true;
  });

  const handleImport = async () => {
    setLoading(true);
    setError('');

    try {
      const itemsToImport = transactions
        .filter(t => !t.skip && (!t.isDuplicate || confirm('Import duplicates?')))
        .map(t => ({
          expense: {
            userId,
            description: t.narration,
            amount: t.debit || t.credit || 0,
            category: t.category,
            date: t.date.toISOString()
          },
          cardId: t.cardId || undefined
        }));

      if (itemsToImport.length === 0) {
        setError('No transactions to import');
        return;
      }

      const result = await cardApi.bulkCreateExpenses(itemsToImport);
      setImportedCount(result.count);
      setStep('complete');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end animate-in fade-in duration-200">
      <motion.div
        initial={{ translateY: '100%' }}
        animate={{ translateY: 0 }}
        exit={{ translateY: '100%' }}
        className="w-full bg-white rounded-t-2xl max-h-[95vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Import Bank Statement</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-red-700 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Upload */}
            {step === 'upload' && (
              <motion.div key="upload" initial={{ opacity: 0 }} exit={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition cursor-pointer"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) handleFileSelect(f);
                  }}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <Upload size={40} className="mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600 mb-1">Drag and drop or click to select</p>
                  <p className="text-xs text-gray-500">Supports: Excel (.xlsx, .xls), CSV</p>
                  <input
                    id="file-input"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Preview & Card Selection */}
            {step === 'preview' && (
              <motion.div key="preview" initial={{ opacity: 0 }} exit={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Card Selection */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-3">Select or Create Card</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {cards.map(card => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCard(card.id)}
                        className={`px-4 py-2 rounded-lg border-2 transition ${
                          selectedCard === card.id
                            ? 'border-blue-500 bg-blue-100'
                            : 'border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        {card.name} ({card.last4Digits})
                      </button>
                    ))}
                  </div>
                  {suggestedIssuer && (
                    <p className="text-xs text-blue-700">
                      💡 Detected: {suggestedIssuer} — select the matching card or create new
                    </p>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-4 pb-3 border-b overflow-x-auto">
                  {(['all', 'debits', 'credits', 'duplicates'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterType(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                        filterType === f
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)} ({
                        transactions.filter(t => {
                          if (f === 'debits') return t.debit && t.debit > 0;
                          if (f === 'credits') return t.credit && t.credit > 0;
                          if (f === 'duplicates') return t.isDuplicate;
                          return !t.skip;
                        }).length
                      })
                    </button>
                  ))}
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                  <div className="p-2 bg-gray-50 rounded border">
                    <div className="font-semibold">{filteredTransactions.length}</div>
                    <div className="text-gray-600">Transactions</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded border">
                    <div className="font-semibold">₹{filteredTransactions.reduce((s, t) => s + (t.debit || 0), 0).toFixed(0)}</div>
                    <div className="text-gray-600">Total Debits</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded border">
                    <div className="font-semibold">{transactions.filter(t => t.isDuplicate).length}</div>
                    <div className="text-gray-600">Duplicates</div>
                  </div>
                </div>

                {/* Transaction Table */}
                <div className="overflow-x-auto mb-6 border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((t, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2">{t.date.toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{t.narration}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {t.debit ? `-₹${t.debit.toFixed(2)}` : `+₹${(t.credit || 0).toFixed(2)}`}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={t.category}
                              onChange={e => {
                                const newTxns = [...transactions];
                                newTxns[transactions.indexOf(t)].category = e.target.value;
                                setTransactions(newTxns);
                              }}
                              className="px-2 py-1 bg-white border rounded text-xs"
                            >
                              {EXPENSE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {t.isDuplicate && (
                              <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                                Duplicate
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('upload')}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={loading || filteredTransactions.length === 0}
                    className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium transition"
                  >
                    {loading ? 'Importing...' : `Import ${filteredTransactions.length} Transactions`}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Complete */}
            {step === 'complete' && (
              <motion.div key="complete" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
                <CheckCircle2 size={64} className="mx-auto mb-3 text-green-500" />
                <h3 className="text-lg font-bold mb-2">Import Successful!</h3>
                <p className="text-gray-600 mb-6">{importedCount} transactions imported</p>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
