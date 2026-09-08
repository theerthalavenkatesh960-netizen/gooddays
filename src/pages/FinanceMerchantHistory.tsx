import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, History, Package } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import * as api from '../lib/api';
import { formatTxDateTime } from '../lib/config';

const money = (amount: number, currency = 'INR') =>
  `${currency === 'INR' ? '₹' : ''}${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0)}`;

export default function FinanceMerchantHistory() {
  const [params] = useSearchParams();
  const merchant = params.get('merchant') || '';
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchant) return;
    api.getFinanceGmailMerchantHistory(merchant).then(setData).finally(() => setLoading(false));
  }, [merchant]);

  const transactions = data?.transactions || [];
  const orders = data?.orders || [];
  const debitTransactions = transactions.filter((tx: any) => tx.direction !== 'CREDIT' && tx.transactionType !== 'TRANSFER');
  const totalSpent = debitTransactions.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
  const totalReceived = transactions
    .filter((tx: any) => tx.direction === 'CREDIT')
    .reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
  const orderValue = orders.reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0);

  return (
    <div className="px-4 pb-8">
      <Link to="/finance" className="inline-flex items-center gap-1.5 text-xs font-semibold mb-4" style={{ color: 'var(--accent)' }}>
        <ArrowLeft size={14} /> Back to finance
      </Link>
      <div className="mb-5">
        <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}><History size={13} /> Merchant history</p>
        <h1 className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{merchant || 'Merchant'}</h1>
      </div>

      {loading ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading history...</p> : !data ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No history found.</p> : (
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Total spent</p>
              <p className="text-lg font-bold num mt-1" style={{ color: 'var(--accent-warm)' }}>{money(totalSpent)}</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{debitTransactions.length} payments</p>
            </div>
            <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Transactions</p>
              <p className="text-lg font-bold num mt-1" style={{ color: 'var(--text-primary)' }}>{transactions.length}</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>all recorded activity</p>
            </div>
            <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Orders</p>
              <p className="text-lg font-bold num mt-1" style={{ color: 'var(--accent)' }}>{orders.length}</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{money(orderValue)} order value</p>
            </div>
            <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Average payment</p>
              <p className="text-lg font-bold num mt-1" style={{ color: 'var(--text-primary)' }}>{money(debitTransactions.length ? totalSpent / debitTransactions.length : 0)}</p>
              {totalReceived > 0 && <p className="text-[10px] mt-1" style={{ color: 'var(--accent-green)' }}>{money(totalReceived)} received/refunded</p>}
            </div>
          </section>

          <section className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Transactions</p>
            </div>
            {data.transactions?.length ? data.transactions.map((tx: any) => (
              <Link key={tx.id} to={`/finance?transaction=${tx.id}`} className="flex items-center gap-3 p-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{tx.description || merchant}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatTxDateTime(tx.date || tx.createdAt)} · {tx.category || 'Other'}{tx.paymentRail ? ` · ${tx.paymentRail}` : ''}</p>
                </div>
                <p className="text-sm font-bold num" style={{ color: tx.direction === 'CREDIT' ? 'var(--accent-green)' : 'var(--accent-warm)' }}>{tx.direction === 'CREDIT' ? '+' : '-'}{money(tx.amount, tx.currency)}</p>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </Link>
            )) : <p className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>No matching transactions.</p>}
          </section>

          <section className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}><p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Orders</p></div>
            {data.orders?.length ? data.orders.map((order: any) => (
              <Link key={order.id} to={`/finance/orders/${order.id}`} className="flex items-center gap-3 p-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                <Package size={16} style={{ color: 'var(--accent)' }} />
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{order.orderNumber ? `Order #${order.orderNumber}` : 'Order'}</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatTxDateTime(order.orderDate)} · {order.items?.length || 0} items</p></div>
                <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{money(order.totalAmount, order.currency)}</p><ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </Link>
            )) : <p className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>No linked orders.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
