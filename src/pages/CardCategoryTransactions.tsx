import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Receipt, CalendarDays } from 'lucide-react';
import cardApi from '../lib/cardApi';
import { useAuth } from '../contexts/AuthContextApi';

interface ExpenseItem {
  id: number | string;
  cardId?: string;
  cardName?: string;
  description?: string;
  note?: string;
  amount?: number;
  category?: string;
  date?: string;
  createdAt?: string;
}

export default function CardCategoryTransactions() {
  const navigate = useNavigate();
  const { cardId = '', category = '' } = useParams();
  const { user } = useAuth();
  const decodedCategory = decodeURIComponent(category);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ExpenseItem[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        let expenses: ExpenseItem[] = [];

        if (cardId) {
          const cardExpenses = await cardApi.getCardExpenses(cardId);
          expenses = Array.isArray(cardExpenses) ? cardExpenses : [];
        } else if (user) {
          const cards = await cardApi.getCards(user.id);
          const perCard = await Promise.all(
            cards.map(async (c) => {
              const cardExpenses = await cardApi.getCardExpenses(c.id);
              return (Array.isArray(cardExpenses) ? cardExpenses : []).map((e: ExpenseItem) => ({
                ...e,
                cardId: c.id,
                cardName: c.name,
              }));
            })
          );
          expenses = perCard.flat();
        }

        if (!alive) return;
        setItems(expenses);
      } catch {
        if (!alive) return;
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [cardId, user]);

  const filtered = useMemo(() => {
    return items
      .filter((e) => (e.category || '').toLowerCase() === decodedCategory.toLowerCase())
      .sort((a, b) => {
        const ad = new Date(a.date || a.createdAt || 0).getTime();
        const bd = new Date(b.date || b.createdAt || 0).getTime();
        return bd - ad;
      });
  }, [items, decodedCategory]);

  const total = filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="sticky top-0 z-20 border-b" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/finance/cards')}
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            <ArrowLeft size={18} style={{ color: 'var(--text-primary)' }} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {decodedCategory} Transactions
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {filtered.length} transactions · ₹{total.toLocaleString('en-IN')} · {cardId ? 'this card' : 'all cards'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading transactions...</div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <Receipt size={34} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No transactions found</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              No entries in {decodedCategory} for this card yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const when = item.date || item.createdAt;
              const d = when ? new Date(when) : null;
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.description || item.note || 'Card transaction'}
                      </p>
                      {!cardId && item.cardName && (
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--accent)' }}>
                          {item.cardName}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-1.5">
                        <CalendarDays size={12} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-bold num" style={{ color: 'var(--accent-warm)' }}>
                      ₹{(Number(item.amount) || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
