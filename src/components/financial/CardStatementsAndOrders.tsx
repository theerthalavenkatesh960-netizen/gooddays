import { useEffect, useState } from 'react';
import { FileText, Package, Scale } from 'lucide-react';
import cardApi from '../../lib/cardApi';

interface Props {
  cardId: string;
}

export default function CardStatementsAndOrders({ cardId }: Props) {
  const [statements, setStatements] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [reconciliation, setReconciliation] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cardId) return;
    setLoading(true);
    Promise.all([cardApi.getCardStatements(cardId), cardApi.getCardOrders(cardId), cardApi.getCardReconciliation(cardId)])
      .then(([s, o, r]) => {
        setStatements(Array.isArray(s) ? s : []);
        setOrders(Array.isArray(o) ? o : []);
        setReconciliation(r || null);
      })
      .finally(() => setLoading(false));
  }, [cardId]);

  if (loading) return null;
  if (statements.length === 0 && orders.length === 0 && !reconciliation) return null;

  return (
    <div className="space-y-3">
      {reconciliation && (
        <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Scale size={14} style={{ color: 'var(--text-secondary)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Reconciliation</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p style={{ color: 'var(--text-muted)' }}>Gmail total</p>
              <p className="font-bold num" style={{ color: 'var(--text-primary)' }}>₹{Number(reconciliation.gmailTotal || 0).toFixed(2)}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)' }}>Imported total</p>
              <p className="font-bold num" style={{ color: 'var(--text-primary)' }}>₹{Number(reconciliation.importedTotal || 0).toFixed(2)}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)' }}>Matched</p>
              <p className="font-bold num" style={{ color: 'var(--accent)' }}>{reconciliation.matchedCount || 0}</p>
            </div>
          </div>
          {(reconciliation.unmatchedGmailCount > 0 || reconciliation.unmatchedImportedCount > 0) && (
            <p className="text-xs mt-2" style={{ color: 'var(--accent-warm)' }}>
              {reconciliation.unmatchedGmailCount || 0} Gmail and {reconciliation.unmatchedImportedCount || 0} imported transactions need review.
            </p>
          )}
        </div>
      )}

      {statements.length > 0 && (
        <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} style={{ color: 'var(--text-secondary)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Statement history</p>
          </div>
          {statements.map((s) => (
            <div key={s.id} className="py-2 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{s.statementDate ? new Date(s.statementDate).toLocaleDateString() : 'Unknown date'}</span>
                <span>Due {s.dueDate ? new Date(s.dueDate).toLocaleDateString() : '—'}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                <span>Statement: ₹{Number(s.statementBalance || 0).toFixed(2)}</span>
                <span>Min due: ₹{Number(s.minimumAmountDue || 0).toFixed(2)}</span>
              </div>
              {s.creditLimit != null && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Limit ₹{Number(s.creditLimit).toFixed(0)} · Available ₹{Number(s.availableCreditLimit || 0).toFixed(0)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {orders.length > 0 && (
        <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Package size={14} style={{ color: 'var(--text-secondary)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Orders on this card</p>
          </div>
          {orders.map((link) => (
            <div key={link.id} className="py-2 border-b last:border-b-0 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{link.order?.merchant || 'Order'}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {link.order?.orderDate ? new Date(link.order.orderDate).toLocaleDateString() : ''} · ₹{Number(link.expenseAmount || 0).toFixed(2)}
                </p>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-1 rounded-full"
                style={{
                  backgroundColor: link.status === 'VALIDATED' ? 'var(--accent-green)' : 'var(--surface-elevated)',
                  color: link.status === 'VALIDATED' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                {link.status === 'VALIDATED' ? 'Matched' : 'Needs review'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
