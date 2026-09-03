import { Link2 } from 'lucide-react';
import { CreditCard } from '../../lib/cardApi';

interface Props {
  cards: CreditCard[];
  transactions: any[];
  onAssign: (cardId: string, expenseId: number) => void;
}

export default function UnlinkedCardTransactionsPanel({ cards, transactions, onAssign }: Props) {
  if (!transactions.length || !cards.length) return null;

  return (
    <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={14} style={{ color: 'var(--accent)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Assign card transactions</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Card payments that need manual card matching</p>
        </div>
      </div>

      <div className="space-y-2">
        {transactions.slice(0, 5).map((txn) => (
          <div key={txn.id} className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between p-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{txn.description}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>₹{Number(txn.amount || 0).toFixed(2)} · {txn.instrumentLast4 ? `****${txn.instrumentLast4}` : txn.paymentInstrumentType}</p>
            </div>
            <select
              defaultValue=""
              onChange={(e) => e.target.value && onAssign(e.target.value, txn.id)}
              className="h-8 px-2 rounded-lg text-xs outline-none"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              <option value="">Assign to card</option>
              {cards.map(card => (
                <option key={card.id} value={card.id}>{card.name} {card.last4Digits ? `****${card.last4Digits}` : ''}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
