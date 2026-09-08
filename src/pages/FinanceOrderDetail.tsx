import { useEffect, useState } from 'react';
import { ArrowLeft, Package } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../lib/api';
import { formatTxDateTime } from '../lib/config';

const money = (amount: number, currency = 'INR') =>
  `${currency === 'INR' ? '₹' : ''}${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0)}`;

export default function FinanceOrderDetail() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    api.getFinanceGmailOrderDetail(orderId).then(setOrder).finally(() => setLoading(false));
  }, [orderId]);

  return (
    <div className="px-4 pb-8">
      <Link to="/finance" className="inline-flex items-center gap-1.5 text-xs font-semibold mb-4" style={{ color: 'var(--accent)' }}><ArrowLeft size={14} /> Back to finance</Link>
      {loading ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading order...</p> : !order ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Order not found.</p> : (
        <>
          <div className="flex items-start gap-3 mb-5"><Package size={22} style={{ color: 'var(--accent)' }} /><div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Order details</p><h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{order.merchant || 'Order'}</h1><p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{order.orderNumber ? `#${order.orderNumber} · ` : ''}{formatTxDateTime(order.orderDate)}</p></div></div>
          <section className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}><p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Items</p><p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{money(order.totalAmount, order.currency)}</p></div>
            {order.items?.length ? order.items.map((item: any, index: number) => <div key={index} className="flex justify-between gap-3 p-3 border-b last:border-b-0 text-sm" style={{ borderColor: 'var(--border)' }}><span style={{ color: 'var(--text-secondary)' }}>{item.quantity} × {item.name}</span><span className="num" style={{ color: 'var(--text-primary)' }}>{item.amount == null ? '—' : money(item.amount, order.currency)}</span></div>) : <p className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>No line items recorded.</p>}
          </section>
          {order.transactions?.length > 0 && <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>Linked transaction status: {order.transactions[0].status}</p>}
        </>
      )}
    </div>
  );
}
