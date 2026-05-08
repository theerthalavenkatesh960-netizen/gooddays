import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, TrendingUp, TrendingDown, ChevronRight, ChevronLeft,
  ChevronDown, Plus, Wallet, Target, BarChart3, Car, PiggyBank,
  ArrowUpRight, ArrowDownRight, Check
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

type Tab = 'Transactions' | 'Buckets' | 'Investments' | 'Analytics';

const FINANCE_TABS: { id: string; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'Transactions', label: 'Transactions', icon: DollarSign },
  { id: 'Buckets', label: 'Buckets', icon: Wallet },
  { id: 'Investments', label: 'Investments', icon: TrendingUp },
  { id: 'Analytics', label: 'Analytics', icon: BarChart3 },
];

function PillTabs({ active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1 mx-4 mb-2 p-1 rounded-2xl overflow-x-auto hide-scrollbar" style={{ backgroundColor: 'var(--surface)' }}>
      {FINANCE_TABS.map(t => {
        const Icon = t.icon;
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all press whitespace-nowrap"
            style={{ backgroundColor: active === t.id ? 'var(--accent)' : 'transparent', color: active === t.id ? '#fff' : 'var(--text-muted)' }}>
            <Icon size={14} />{t.label}
          </button>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────
// Transactions Tab
// ──────────────────────────────────────────────────
function TransactionsTab() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.getExpenses(user.id).then((data: any) => {
      setExpenses(Array.isArray(data) ? data : []);
    }).catch(() => setExpenses([])).finally(() => setLoading(false));
  }, [user]);

  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date ?? e.createdAt ?? e.created_at);
    return d >= startOfMonth(month) && d <= endOfMonth(month);
  });

  const totalExpense = monthExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalIncome = 85000;
  const net = totalIncome - totalExpense;

  // Group by date
  const grouped: Record<string, any[]> = {};
  monthExpenses.forEach(e => {
    const key = format(new Date(e.date ?? e.createdAt ?? e.created_at), 'yyyy-MM-dd');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const categoryColors: Record<string, string> = {
    Food: '#FF6B6B', Transport: '#6C63FF', Shopping: '#FFD93D',
    Entertainment: '#4ECDC4', Health: '#10B981', Utilities: '#8888A0',
    Education: '#3B82F6', Rent: '#F97316', Fuel: '#EF4444', Other: '#8888A0',
  };

  return (
    <div className="px-4">
      {/* Month selector */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button onClick={() => setMonth(m => subMonths(m, 1))} className="press p-2 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
          <ChevronLeft size={16} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {format(month, 'MMMM yyyy')}
        </span>
        <button onClick={() => setMonth(m => addMonths(m, 1))} className="press p-2 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
          <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      {/* KPI chips */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Income</p>
          <p className="text-sm font-bold num mt-1" style={{ color: 'var(--accent-green)' }}>₹{(totalIncome/1000).toFixed(0)}k</p>
        </div>
        <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Expenses</p>
          <p className="text-sm font-bold num mt-1" style={{ color: 'var(--accent-warm)' }}>₹{(totalExpense/1000).toFixed(1)}k</p>
        </div>
        <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Net</p>
          <p className="text-sm font-bold num mt-1" style={{ color: net >= 0 ? 'var(--accent-green)' : 'var(--accent-warm)' }}>
            {net >= 0 ? '+' : ''}₹{(net/1000).toFixed(1)}k
          </p>
        </div>
      </div>

      {/* Transaction list */}
      {loading ? (
        [1,2,3].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 mb-2 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="skeleton w-9 h-9 rounded-xl" />
            <div className="flex-1"><div className="skeleton h-3 w-32 rounded mb-1" /><div className="skeleton h-2 w-20 rounded" /></div>
            <div className="skeleton h-4 w-14 rounded" />
          </div>
        ))
      ) : monthExpenses.length === 0 ? (
        <div className="py-12 text-center">
          <Wallet size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No transactions</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tap the + button to log an expense</p>
        </div>
      ) : (
        sortedDates.map(date => (
          <div key={date} className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              {format(parseISO(date), 'EEEE, d MMM') === format(new Date(), 'EEEE, d MMM') ? 'TODAY' : format(parseISO(date), 'd MMM')}
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              {grouped[date].map((exp, i) => {
                const color = categoryColors[exp.category] ?? '#8888A0';
                return (
                  <div key={i} className="flex items-center gap-3 p-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '22' }}>
                      <DollarSign size={16} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {exp.note || exp.category}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{exp.category}</p>
                    </div>
                    <span className="text-sm font-bold num" style={{ color: 'var(--accent-warm)' }}>
                      -₹{(exp.amount ?? 0).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────
// Buckets Tab
// ──────────────────────────────────────────────────
const DEMO_BUCKETS = [
  { id: 1, name: 'Emergency Fund',  icon: '🛡️', target: 200000, current: 148000, color: '#4ECDC4', monthlyTarget: 10000 },
  { id: 2, name: 'Vacation — Goa',  icon: '🏖️', target: 50000,  current: 22500,  color: '#FFD93D', monthlyTarget: 5000 },
  { id: 3, name: 'New Phone',       icon: '📱', target: 80000,  current: 40000,  color: '#6C63FF', monthlyTarget: 8000 },
  { id: 4, name: 'Car Service',     icon: '🔧', target: 15000,  current: 9200,   color: '#FF6B6B', monthlyTarget: 3000 },
];

function BucketsTab() {
  const [buckets] = useState(DEMO_BUCKETS);
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="px-4">
      <div className="space-y-3">
        {buckets.map(b => {
          const pct = Math.round((b.current / b.target) * 100);
          const isOpen = selected === b.id;
          return (
            <div key={b.id} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <button
                onClick={() => setSelected(isOpen ? null : b.id)}
                className="w-full flex items-center gap-3 p-4 press"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: b.color + '22' }}>
                  {b.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{b.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: b.color }} />
                    </div>
                    <span className="text-[10px] num flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>₹{(b.current/1000).toFixed(0)}k</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>of ₹{(b.target/1000).toFixed(0)}k</p>
                </div>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="grid grid-cols-2 gap-2 pt-3">
                        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Monthly Target</p>
                          <p className="text-sm font-bold num mt-1" style={{ color: 'var(--text-primary)' }}>₹{b.monthlyTarget.toLocaleString()}</p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Remaining</p>
                          <p className="text-sm font-bold num mt-1" style={{ color: 'var(--accent-warm)' }}>₹{(b.target - b.current).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 h-9 rounded-xl text-xs font-medium press" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                          Add
                        </button>
                        <button className="flex-1 h-9 rounded-xl text-xs font-medium press" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                          Withdraw
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        <button className="w-full h-12 rounded-2xl text-sm font-medium press flex items-center justify-center gap-2" style={{ border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
          <Plus size={16} /> Add Bucket
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Investments Tab
// ──────────────────────────────────────────────────
const DEMO_HOLDINGS = [
  { name: 'Nifty BeES',    type: 'ETF',       invested: 50000, current: 62800, change: 25.6 },
  { name: 'ICICI Bank',    type: 'Stock',     invested: 30000, current: 34200, change: 14.0 },
  { name: 'Parag Parikh FoF', type: 'MF',    invested: 80000, current: 96400, change: 20.5 },
  { name: 'Gold BeES',     type: 'ETF',       invested: 20000, current: 23100, change: 15.5 },
];

function InvestmentsTab() {
  const totalInvested = DEMO_HOLDINGS.reduce((s, h) => s + h.invested, 0);
  const totalCurrent  = DEMO_HOLDINGS.reduce((s, h) => s + h.current, 0);
  const totalPnL      = totalCurrent - totalInvested;
  const pnlPct        = ((totalPnL / totalInvested) * 100).toFixed(1);

  return (
    <div className="px-4">
      {/* Portfolio summary */}
      <div className="p-5 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, var(--accent-green)22, var(--surface))', border: '1px solid var(--accent-green)33' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Portfolio Value</p>
        <p className="text-3xl font-bold num mt-1" style={{ color: 'var(--text-primary)' }}>₹{totalCurrent.toLocaleString()}</p>
        <div className="flex items-center gap-2 mt-2">
          <ArrowUpRight size={14} style={{ color: 'var(--accent-green)' }} />
          <span className="text-sm font-semibold num" style={{ color: 'var(--accent-green)' }}>
            +₹{totalPnL.toLocaleString()} ({pnlPct}%)
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Invested: ₹{totalInvested.toLocaleString()}</span>
        </div>
      </div>

      {/* Holdings */}
      <div className="section-header px-0 mb-2">
        <span className="section-label">Holdings</span>
        <button className="text-xs press" style={{ color: 'var(--accent)' }}>
          <Plus size={14} />
        </button>
      </div>
      <div className="space-y-2">
        {DEMO_HOLDINGS.map(h => {
          const pnl = h.current - h.invested;
          const pos = pnl >= 0;
          return (
            <div key={h.name} className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: pos ? 'var(--accent-green)22' : 'var(--accent-warm)22' }}>
                <TrendingUp size={18} style={{ color: pos ? 'var(--accent-green)' : 'var(--accent-warm)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{h.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{h.type} · ₹{h.invested.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>₹{h.current.toLocaleString()}</p>
                <p className="text-xs num font-medium mt-0.5" style={{ color: pos ? 'var(--accent-green)' : 'var(--accent-warm)' }}>
                  {pos ? '+' : ''}{h.change}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Analytics Tab
// ──────────────────────────────────────────────────
const CATEGORIES = ['Food','Transport','Shopping','Entertainment','Health','Utilities','Rent','Fuel'];
const COLORS = ['#FF6B6B','#6C63FF','#FFD93D','#4ECDC4','#10B981','#8888A0','#F97316','#EF4444'];
const CATEGORY_DATA = CATEGORIES.map((c, i) => ({ name: c, amount: [12400, 8200, 6800, 4500, 3200, 2800, 22000, 5600][i] }));
const MONTHLY_DATA = [
  { month: 'Dec', income: 80000, expense: 52000 },
  { month: 'Jan', income: 82000, expense: 48000 },
  { month: 'Feb', income: 85000, expense: 51000 },
  { month: 'Mar', income: 85000, expense: 55000 },
  { month: 'Apr', income: 85000, expense: 49000 },
  { month: 'May', income: 85000, expense: 40000 },
];
const totalCat = CATEGORY_DATA.reduce((s, c) => s + c.amount, 0);

function AnalyticsTab() {
  return (
    <div className="px-4">
      {/* Monthly trend */}
      <div className="section-header px-0 mb-2">
        <span className="section-label">6-Month Trend</span>
      </div>
      <div className="p-4 rounded-2xl mb-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-end gap-2 h-24">
          {MONTHLY_DATA.map(m => {
            const incH = (m.income / 90000) * 100;
            const expH = (m.expense / 90000) * 100;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5 justify-center" style={{ height: 80 }}>
                  <div className="w-[45%] rounded-t-sm" style={{ height: `${incH}%`, backgroundColor: 'var(--accent-green)', opacity: 0.7 }} />
                  <div className="w-[45%] rounded-t-sm" style={{ height: `${expH}%`, backgroundColor: 'var(--accent-warm)', opacity: 0.7 }} />
                </div>
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{m.month}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent-green)' }} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Income</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent-warm)' }} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Expense</span></div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="section-header px-0 mb-2">
        <span className="section-label">Spending by Category</span>
      </div>
      <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        {CATEGORY_DATA.map((c, i) => (
          <div key={c.name} className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
              <span className="text-xs num" style={{ color: 'var(--text-muted)' }}>
                ₹{c.amount.toLocaleString()} · {Math.round((c.amount / totalCat) * 100)}%
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(c.amount / totalCat) * 100}%`, backgroundColor: COLORS[i] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Main Finance Page
// ──────────────────────────────────────────────────
export default function Finance() {
  const [tab, setTab] = useState<Tab>('Transactions');
  const navigate = useNavigate();

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Finance</h1>
        <button
          onClick={() => navigate('/finance/vehicles')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl press"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Car size={14} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Vehicles</span>
        </button>
      </div>

      <PillTabs
        tabs={['Transactions', 'Buckets', 'Investments', 'Analytics']}
        active={tab}
        onChange={t => setTab(t as Tab)}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.15 }}
          className="mt-2"
        >
          {tab === 'Transactions'  && <TransactionsTab />}
          {tab === 'Buckets'       && <BucketsTab />}
          {tab === 'Investments'   && <InvestmentsTab />}
          {tab === 'Analytics'     && <AnalyticsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
