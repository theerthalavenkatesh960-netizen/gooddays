import { useEffect, useState } from 'react';
import { X, Mail, CreditCard, Package, ArrowDownLeft, ArrowUpRight, Pencil, Copy, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as api from '../../lib/api';
import { formatTxDateTime } from '../../lib/config';

interface Props {
  transactionId: number;
  onClose: () => void;
  onChanged?: () => void;
}

const CATEGORIES = [
  'Food', 'Groceries', 'Transport', 'Fuel', 'Home', 'Rent', 'Utilities', 'Internet',
  'Subscriptions', 'Personal', 'Medical', 'Gym', 'Self Care', 'Fun', 'Shopping',
  'Education', 'Books', 'Coffee', 'Travel', 'Investments', 'Transfer', 'Lending', 'EMI', 'Other'
];

const money = (v: number, currency = 'INR') =>
  `${currency === 'INR' ? '₹' : ''}${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)}`;

function PaymentSummaryLine({ detail }: { detail: any }) {
  const merchant = detail.merchantName || detail.counterpartyName;
  const institution = detail.institutionName;
  const instrument = [detail.paymentInstrumentType, detail.instrumentLast4 ? `••${detail.instrumentLast4}` : null].filter(Boolean).join(' ');
  const paymentSource = [institution, instrument].filter(Boolean).join(' ');
  if (!merchant && !paymentSource) return null;
  const isCredit = detail.direction === 'CREDIT';
  const Arrow = isCredit ? ArrowLeft : ArrowRight;
  return (
    <div className="mt-1 flex items-center gap-1.5 text-xs break-words" style={{ color: 'var(--text-secondary)' }}>
      {merchant && <span>{merchant}</span>}
      {paymentSource && <><Arrow size={13} style={{ color: isCredit ? 'var(--accent-green)' : 'var(--accent-warm)' }} /><span>{paymentSource}</span></>}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex justify-between gap-3 py-1.5">
      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-xs font-medium text-right break-words" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function toForm(detail: any) {
  return {
    description: detail.merchantName || detail.counterpartyName || detail.rawMerchant || detail.description || '',
    merchant: detail.merchantName || detail.counterpartyName || detail.rawMerchant || '',
    category: detail.category || 'Other',
    amount: String(detail.amount ?? ''),
    date: detail.date ? new Date(detail.date).toISOString().slice(0, 10) : '',
  };
}

export default function TransactionDetailModal({ transactionId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [editing, setEditing] = useState(false);
  const [merchants, setMerchants] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [items, setItems] = useState<Array<{ name: string; quantity: number; amount: string }>>([]);
  const [form, setForm] = useState({ description: '', merchant: '', category: 'Other', amount: '', date: '' });

  useEffect(() => {
    api.getFinanceGmailMerchants().then(value => setMerchants(Array.isArray(value) ? value : [])).catch(() => setMerchants([]));
    api.getFinanceGmailCategories()
      .then(value => setCategories([...CATEGORIES, ...(Array.isArray(value) ? value : [])]
        .filter((category, index, all) => all.findIndex(item => item.toLowerCase() === category.toLowerCase()) === index)))
      .catch(() => setCategories(CATEGORIES));
    setLoading(true);
    api.getFinanceGmailTransactionDetail(transactionId)
      .then(d => {
        setDetail(d);
        setForm(toForm(d));
        setItems((d.orders?.[0]?.items || []).map((item: any) => ({
          name: item.name || '', quantity: item.quantity || 1, amount: item.amount == null ? '' : String(item.amount),
        })));
      })
      .finally(() => setLoading(false));
  }, [transactionId]);

  const saveEdits = async () => {
    const amount = Number(form.amount);
    await api.updateExpense(
      transactionId,
      form.description.trim() || undefined,
      amount > 0 ? amount : undefined,
      form.category,
      form.date ? new Date(`${form.date}T12:00:00`) : undefined,
    );
    const merchant = form.merchant.trim();
    if (merchant) {
      await api.updateFinanceGmailMerchant(transactionId, merchant, form.category || undefined, true);
    }
    await api.saveFinanceGmailTransactionItems(transactionId, items
      .filter(item => item.name.trim() && item.quantity > 0)
      .map(item => ({ name: item.name.trim(), quantity: item.quantity, amount: item.amount ? Number(item.amount) : undefined })));
  };

  const decide = async (decision: 'APPROVE' | 'REJECT') => {
    setBusy(true);
    try {
      if (decision === 'APPROVE') await saveEdits();
      await api.decideFinanceGmailTransaction(transactionId, decision);
      onChanged?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const copyTransaction = async () => {
    setBusy(true);
    try {
      const copied = await api.copyFinanceGmailTransaction(transactionId);
      onChanged?.();
      onClose();
      window.dispatchEvent(new CustomEvent('gooddays:transaction-copied', { detail: copied.id }));
    } finally {
      setBusy(false);
    }
  };

  const isCredit = detail?.direction === 'CREDIT';
  const categoryQuery = form.category.trim().toLowerCase();
  const categorySuggestions = categories
    .filter(category => !categoryQuery || category.toLowerCase().includes(categoryQuery))
    .slice(0, 20);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        {loading || !detail ? (
          <div className="p-6 text-sm" style={{ color: 'var(--text-muted)' }}>Loading transaction…</div>
        ) : (
          <>
            <div className="p-4 border-b sticky top-0" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isCredit ? <ArrowDownLeft size={16} style={{ color: 'var(--accent-green)' }} /> : <ArrowUpRight size={16} style={{ color: 'var(--accent-warm)' }} />}
                    {editing ? (
                      <input
                        value={form.amount}
                        onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                        type="number"
                        className="h-8 px-2 rounded-lg text-sm font-bold w-28 outline-none"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <p className="text-base font-bold num" style={{ color: isCredit ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                        {isCredit ? '+' : '−'}{money(detail.amount, detail.currency)}
                      </p>
                    )}
                  </div>
                  {editing ? (
                    <>
                      <input
                        value={form.merchant}
                        onChange={(e) => setForm(f => ({ ...f, merchant: e.target.value }))}
                        placeholder="Merchant"
                        list="finance-merchant-options"
                        className="mt-1.5 h-8 px-2 rounded-lg text-sm w-full outline-none"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                      <datalist id="finance-merchant-options">
                        {merchants.map(merchant => <option key={merchant} value={merchant} />)}
                      </datalist>
                    </>
                  ) : (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{detail.merchantName || detail.counterpartyName || 'Merchant not identified'}</p>
                  )}
                  {editing ? (
                    null
                  ) : (
                    <PaymentSummaryLine detail={detail} />
                  )}
                  {editing ? (
                    <input
                      value={form.date}
                      onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                      type="date"
                      className="mt-1.5 h-8 px-2 rounded-lg text-xs outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {detail.date ? formatTxDateTime(detail.date) : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setEditing(v => !v)} className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: editing ? 'var(--accent)' : 'var(--surface-elevated)', color: editing ? '#fff' : 'var(--text-secondary)' }} aria-label="Edit transaction">
                    <Pencil size={13} />
                  </button>
                  <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <section>
                <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Transaction</p>
                <Row label="Type" value={detail.transactionType} />
                <Row label="Direction" value={detail.direction} />
                <Row label="Status" value={detail.transactionStatus} />
                {editing ? (
                  <div className="flex justify-between items-center gap-3 py-1.5">
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Category</span>
                    <input
                      value={form.category}
                      onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                      list="finance-category-options"
                      placeholder="Category"
                      className="h-8 px-2 rounded-lg text-xs outline-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                    <datalist id="finance-category-options">
                      {categorySuggestions.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                ) : (
                  <Row label="Category" value={detail.category} />
                )}
                <Row label="Reference" value={detail.externalReference} />
                <Row label="Confidence" value={detail.confidenceScore != null ? `${Math.round(detail.confidenceScore * 100)}%` : null} />
              </section>

              <section>
                <p className="text-xs font-bold mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>Paid from / to</p>
                {(detail.merchantName || detail.counterpartyName) ? (
                  <div className="flex justify-between gap-3 py-1.5">
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Merchant</span>
                    <Link to={`/finance/merchant-history?merchant=${encodeURIComponent(detail.merchantName || detail.counterpartyName)}`} onClick={onClose} className="text-xs font-medium text-right break-words" style={{ color: 'var(--accent)' }}>
                      {detail.merchantName || detail.counterpartyName}
                    </Link>
                  </div>
                ) : null}
                <Row label="Counterparty" value={detail.counterpartyName || detail.merchantName} />
                <Row label="UPI / VPA" value={detail.counterpartyIdentifier} />
                <Row label="Bank / Issuer" value={detail.institutionName} />
                <Row label="Instrument" value={detail.paymentInstrumentType} />
                <Row label="Payment rail" value={detail.paymentRail} />
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
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Package size={12} /> Order {link.order?.orderNumber ? `#${link.order.orderNumber}` : ''}
                    </p>
                    {link.order?.id && <Link to={`/finance/orders/${link.order.id}`} onClick={onClose} className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Open order</Link>}
                  </div>
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

              {editing && (
                <section>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Items bought</p>
                    <button onClick={() => setItems(current => [...current, { name: '', quantity: 1, amount: '' }])} className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Add item</button>
                  </div>
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-[1fr_3.5rem_5rem_1.5rem] gap-1">
                        <input value={item.name} placeholder="Item" onChange={e => setItems(current => current.map((x, i) => i === index ? { ...x, name: e.target.value } : x))} className="h-8 px-2 rounded-lg text-xs outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                        <input value={item.quantity} min={1} type="number" aria-label="Quantity" onChange={e => setItems(current => current.map((x, i) => i === index ? { ...x, quantity: Number(e.target.value) } : x))} className="h-8 px-2 rounded-lg text-xs outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                        <input value={item.amount} min={0} type="number" placeholder="Amount" aria-label="Amount" onChange={e => setItems(current => current.map((x, i) => i === index ? { ...x, amount: e.target.value } : x))} className="h-8 px-2 rounded-lg text-xs outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                        <button onClick={() => setItems(current => current.filter((_, i) => i !== index))} aria-label="Remove item" className="text-xs" style={{ color: '#ef4444' }}>×</button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

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
              <button onClick={copyTransaction} disabled={busy} className="h-10 px-3 rounded-xl text-sm font-semibold press disabled:opacity-60" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }} aria-label="Copy transaction">
                <Copy size={14} />
              </button>
              {editing ? (
                <button
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await saveEdits();
                      const refreshed = await api.getFinanceGmailTransactionDetail(transactionId);
                      setDetail(refreshed);
                      setForm(toForm(refreshed));
                      setEditing(false);
                      onChanged?.();
                    } finally { setBusy(false); }
                  }}
                  disabled={busy}
                  className="flex-1 h-10 rounded-xl text-sm font-semibold text-white press disabled:opacity-60"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  Save changes
                </button>
              ) : (
                <button onClick={() => decide('REJECT')} disabled={busy} className="flex-1 h-10 rounded-xl text-sm font-semibold press disabled:opacity-60" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                  Reject
                </button>
              )}
              <button onClick={() => decide('APPROVE')} disabled={busy || detail.isReviewed} className="flex-1 h-10 rounded-xl text-sm font-semibold text-white press disabled:opacity-60" style={{ backgroundColor: editing ? 'var(--accent-green)' : 'var(--accent)' }}>
                {detail.isReviewed ? 'Approved' : editing ? 'Save & Approve' : 'Approve'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
