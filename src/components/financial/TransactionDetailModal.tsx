import { useEffect, useState } from 'react';
import { X, Mail, CreditCard, Package, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import * as api from '../../lib/api';

interface Props {
  transactionId: number;
  onClose: () => void;
  onChanged?: () => void;
}

const money = (v: number, currency = 'INR') =>
  `${currency === 'INR' ? '₹' : ''}${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)}`;

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex justify-between gap-3 py-1.5">
      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-xs font-medium text-right break-words" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

export default function TransactionDetailModal({ transactionId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getFinanceGmailTransactionDetail(transactionId)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [transactionId]);

  const decide = async (decision: 'APPROVE' | 'REJECT') => {
    setBusy(true);
    try {
      await api.decideFinanceGmailTransaction(transactionId, decision);
      onChanged?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const isCredit = detail?.direction === 'CREDIT';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        {loading || !detail ? (
          <div className="p-6 text-sm" style={{ color: 'var(--text-muted)' }}>Loading transaction…</div>
        ) : (
          <>
            <div className="p-4 border-b sticky top-0" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {isCredit ? <ArrowDownLeft size={16} style={{ color: 'var(--accent-green)' }} /> : <ArrowUpRight size={16} style={{ color: 'var(--accent-warm)' }} />}
                    <p className="text-base font-bold num" style={{ color: isCredit ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                      {isCredit ? '+' : '−'}{money(detail.amount, detail.currency)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold mt-1 break-words" style={{ color: 'var(--text-primary)' }}>{detail.description}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {detail.date ? new Date(detail.date).toLocaleString() : ''}
                  </p>
                </div>
                <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <section>
                <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Transaction</p>
                <Row label="Type" value={detail.transactionType} />
                <Row label="Direction" value={detail.direction} />
                <Row label="Status" value={detail.transactionStatus} />
                <Row label="Category" value={detail.category} />
                <Row label="Reference" value={detail.externalReference} />
                <Row label="Confidence" value={detail.confidenceScore != null ? `${Math.round(detail.confidenceScore * 100)}%` : null} />
              </section>

              <section>
                <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Paid from / to</p>
                <Row label="Merchant" value={detail.merchantName} />
                <Row label="Counterparty" value={detail.counterpartyName} />
                <Row label="UPI / VPA" value={detail.counterpartyIdentifier} />
                <Row label="Bank / Issuer" value={detail.institutionName} />
                <Row label="Instrument" value={detail.paymentInstrumentType} />
                <Row label="Card / A/c" value={detail.instrumentLast4 ? `••${detail.instrumentLast4}` : null} />
                <Row label="Source" value={detail.sourceInstrumentType} />
                <Row label="Destination" value={detail.destinationInstrumentName || detail.destinationInstrumentType} />
              </section>

              {detail.card && (
                <section>
                  <p className="text-xs font-bold mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <CreditCard size={12} /> Linked card
                  </p>
                  <Row label="Card" value={`${detail.card.name} ${detail.card.last4Digits ? `••${detail.card.last4Digits}` : ''}`} />
                  <Row label="Issuer" value={detail.card.issuer} />
                </section>
              )}

              {detail.orders?.length > 0 && detail.orders.map((link: any, i: number) => (
                <section key={i}>
                  <p className="text-xs font-bold mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Package size={12} /> Order {link.order?.orderNumber ? `#${link.order.orderNumber}` : ''}
                  </p>
                  <Row label="Merchant" value={link.order?.merchant} />
                  <Row label="Order total" value={link.order?.totalAmount ? money(link.order.totalAmount) : null} />
                  <Row label="Match" value={`${link.status} (${Math.round((link.matchScore || 0) * 100)}%)`} />
                  {link.items?.length > 0 && (
                    <div className="mt-2 rounded-xl p-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                      {link.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between gap-2 py-1 text-xs">
                          <span style={{ color: 'var(--text-secondary)' }}>{item.quantity} × {item.name}</span>
                          {item.amount != null && <span className="num flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{money(item.amount)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}

              {detail.sourceEmail && (
                <section>
                  <p className="text-xs font-bold mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Mail size={12} /> Source email
                  </p>
                  <Row label="From" value={detail.sourceEmail.sender} />
                  <Row label="Subject" value={detail.sourceEmail.subject} />
                  <button onClick={() => setShowRaw(v => !v)} className="text-xs mt-1 underline" style={{ color: 'var(--accent)' }}>
                    {showRaw ? 'Hide original email' : 'Show original email'}
                  </button>
                  {showRaw && (
                    <pre className="mt-2 text-[11px] whitespace-pre-wrap break-words rounded-xl p-2 max-h-60 overflow-y-auto" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                      {detail.sourceEmail.bodyText || detail.sourceEmail.snippet}
                    </pre>
                  )}
                </section>
              )}
            </div>

            <div className="p-4 border-t flex gap-2 sticky bottom-0" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
              <button onClick={() => decide('REJECT')} disabled={busy} className="flex-1 h-10 rounded-xl text-sm font-semibold press disabled:opacity-60" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                Reject
              </button>
              <button onClick={() => decide('APPROVE')} disabled={busy || detail.isReviewed} className="flex-1 h-10 rounded-xl text-sm font-semibold text-white press disabled:opacity-60" style={{ backgroundColor: 'var(--accent)' }}>
                {detail.isReviewed ? 'Approved' : 'Approve'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
