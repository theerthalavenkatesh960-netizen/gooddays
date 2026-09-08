import { Landmark, Smartphone, Wallet } from 'lucide-react';
import { AccountInstrumentSummary } from '../../lib/cardApi';

interface Props {
  instruments: AccountInstrumentSummary[];
}

const formatMoney = (value: number) => `₹${new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
}).format(value || 0)}`;

export default function AccountsAndWalletsPanel({ instruments }: Props) {
  if (!instruments.length) return null;

  const iconFor = (type: string) => {
    if (type === 'BANK_ACCOUNT') return Landmark;
    if (type === 'UPI') return Smartphone;
    return Wallet;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Accounts & Wallets</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Non-card instruments detected from Gmail</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
        {instruments.map((instrument) => {
          const Icon = iconFor(instrument.type);
          const isWallet = instrument.type === 'WALLET';
          return (
            <div key={`${instrument.type}-${instrument.name}-${instrument.last4 || ''}`} className="rounded-2xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon size={15} style={{ color: 'var(--accent)' }} />
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{instrument.name}</p>
                  </div>
                  <p className="text-[10px] font-semibold tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>
                    {instrument.type.replace('_', ' ')}{instrument.last4 ? ` • ${instrument.last4}` : ''}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                  {instrument.transactionCount} txns
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <div>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isWallet ? 'Top-ups' : 'Credits'}</p>
                  <p className="text-xs font-bold num" style={{ color: 'var(--accent-green)' }}>{formatMoney(isWallet ? instrument.topUps : instrument.credits)}</p>
                </div>
                <div>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isWallet ? 'Wallet spend' : 'Debits'}</p>
                  <p className="text-xs font-bold num" style={{ color: 'var(--accent-warm)' }}>{formatMoney(isWallet ? instrument.spends : instrument.debits)}</p>
                </div>
                <div>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isWallet ? 'Est. balance' : 'Net'}</p>
                  <p className="text-xs font-bold num truncate" style={{ color: 'var(--accent)' }}>{formatMoney(isWallet ? instrument.estimatedBalance : instrument.credits - instrument.debits)}</p>
                </div>
              </div>

              {instrument.recentTransactions?.length > 0 && (
                <div className="mt-3 pt-2 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
                  {instrument.recentTransactions.slice(0, 3).map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{txn.description}</span>
                      <span className="num flex-shrink-0" style={{ color: txn.direction === 'CREDIT' ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                        {txn.direction === 'CREDIT' ? '+' : '-'}{formatMoney(txn.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
