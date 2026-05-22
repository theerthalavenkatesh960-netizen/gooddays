import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, TrendingUp, ChevronRight, ChevronLeft,
  Plus, Wallet, BarChart3, Car,
  ArrowUpRight, ArrowDownRight, Trash2, Pencil, Mail, RefreshCw, Unplug
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';


type Tab = 'Transactions' | 'Buckets' | 'Investments';

const FINANCE_TABS: { id: string; label: string; icon: React.ComponentType<{ size?: string | number }> }[] = [
  { id: 'Transactions', label: 'Transactions', icon: DollarSign },
  { id: 'Buckets', label: 'Buckets', icon: Wallet },
  { id: 'Investments', label: 'Investments', icon: TrendingUp },
];

const formatMoney = (value: number) => `₹${new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(value || 0)}`;

function PillTabs({ active, onChange }: { active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1 mx-4 mb-2 p-1 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }}>
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
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date());
  const [expenses, setExpenses] = useState<any[]>([]);
  const [gmailStatus, setGmailStatus] = useState<any>(null);
  const [syncingGmail, setSyncingGmail] = useState(false);
  const [gmailOnly, setGmailOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [budgetProfile, setBudgetProfile] = useState<any>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editorForm, setEditorForm] = useState({ amount: '', category: 'Food', note: '', date: format(new Date(), 'yyyy-MM-dd') });

  const loadTransactions = () => Promise.all([
    user ? api.getExpenses(user.id).catch(() => []) : Promise.resolve([]),
    (api as any).getFinanceBudgetProfile(month.getMonth() + 1, month.getFullYear()).catch(() => null),
    user ? api.getFinanceGmailStatus().catch(() => null) : Promise.resolve(null),
  ]).then(([expenseData, budget, gmail]) => {
    setExpenses(Array.isArray(expenseData) ? expenseData : []);
    setBudgetProfile(budget);
    setGmailStatus(gmail);
  });

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    Promise.all([
      user ? api.getExpenses(user.id).catch(() => []) : Promise.resolve([]),
      (api as any).getFinanceBudgetProfile(month.getMonth() + 1, month.getFullYear()).catch(() => null),
      user ? api.getFinanceGmailStatus().catch(() => null) : Promise.resolve(null),
    ]).then(([expenseData, budget, gmail]) => {
      if (!isMounted) return;
      setExpenses(Array.isArray(expenseData) ? expenseData : []);
      setBudgetProfile(budget);
      setGmailStatus(gmail);
    }).finally(() => {
      if (isMounted) setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [user, month]);

  useEffect(() => {
    const onFocus = () => {
      if (!user) return;
      loadTransactions().catch(() => undefined);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, month]);

  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date ?? e.createdAt ?? e.created_at);
    return d >= startOfMonth(month) && d <= endOfMonth(month);
  });
  const visibleExpenses = gmailOnly ? monthExpenses.filter(e => (e.sourceType || '').toLowerCase() === 'gmail') : monthExpenses;

  const variableExpense = monthExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const fixedExpense = (budgetProfile?.fixedExpenses ?? []).reduce((s: number, f: any) => s + (f.effectiveAmount ?? f.amount ?? 0), 0);
  const totalExpense = variableExpense + fixedExpense;
  const totalIncome = Number(budgetProfile?.effectiveMonthlyIncome ?? budgetProfile?.monthlyIncome ?? 0);
  const net = totalIncome - totalExpense;

  // Group by date
  const grouped: Record<string, any[]> = {};
  visibleExpenses.forEach(e => {
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

  const openCreate = () => {
    setEditingExpenseId(null);
    setEditorForm({ amount: '', category: 'Food', note: '', date: format(new Date(), 'yyyy-MM-dd') });
    setShowEditor(true);
  };

  const openEdit = (exp: any) => {
    const sourceDate = exp.date ?? exp.createdAt ?? exp.created_at;
    const safeDate = sourceDate ? format(new Date(sourceDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    setEditingExpenseId(exp.id);
    setEditorForm({
      amount: String(exp.amount ?? ''),
      category: exp.category || 'Other',
      note: exp.note || exp.description || '',
      date: safeDate,
    });
    setShowEditor(true);
  };

  const submitEditor = async () => {
    if (!user) return;
    const amount = Number(editorForm.amount);
    if (!amount || amount <= 0) return;

    const txDate = new Date(`${editorForm.date}T12:00:00`);
    if (editingExpenseId) {
      const updated = await api.updateExpense(editingExpenseId, editorForm.note, amount, editorForm.category, txDate);
      setExpenses(prev => prev.map(e => e.id === editingExpenseId ? { ...e, ...updated } : e));
    } else {
      const created = await api.createExpense(user.id, editorForm.note, amount, editorForm.category, txDate);
      setExpenses(prev => [created, ...prev]);
    }
    setShowEditor(false);
  };

  const deleteTransaction = async (id: number) => {
    await api.deleteExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const connectGmail = async () => {
    const response = await api.getFinanceGmailConnectUrl();
    if (response?.url) {
      window.location.href = response.url;
    }
  };

  const manualGmailSync = async () => {
    setSyncingGmail(true);
    try {
      await api.triggerFinanceGmailSync();
      await loadTransactions();
    } finally {
      setSyncingGmail(false);
    }
  };

  const disconnectGmail = async () => {
    await api.disconnectFinanceGmail();
    await loadTransactions();
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

      <div className="rounded-2xl mb-4 p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Budget source</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {budgetProfile?.isMonthlyIncomeOverridden ? 'Using monthly override' : 'Using default setup'}
            </p>
          </div>
          <button
            onClick={() => navigate('/finance/settings')}
            className="h-9 px-3 rounded-xl text-xs font-semibold text-white press"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Edit budget
          </button>
        </div>
      </div>

      <div className="rounded-2xl mb-4 p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Gmail Sync</p>
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {gmailStatus?.connected ? `Connected: ${gmailStatus.email || 'Gmail account'}` : 'Not connected'}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Last sync: {gmailStatus?.lastSyncedUtc ? format(new Date(gmailStatus.lastSyncedUtc), 'dd MMM yyyy, hh:mm a') : 'Never'}
            </p>
          </div>
          <Mail size={16} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {!gmailStatus?.connected ? (
            <button onClick={connectGmail} className="h-8 px-3 rounded-lg text-xs font-semibold text-white press" style={{ backgroundColor: 'var(--accent)' }}>
              Connect Gmail
            </button>
          ) : (
            <>
              <button onClick={manualGmailSync} disabled={syncingGmail} className="h-8 px-3 rounded-lg text-xs font-semibold text-white press flex items-center gap-1.5 disabled:opacity-60" style={{ backgroundColor: 'var(--accent)' }}>
                <RefreshCw size={12} className={syncingGmail ? 'animate-spin' : ''} />
                {syncingGmail ? 'Syncing...' : 'Sync now'}
              </button>
              <button onClick={() => navigate('/finance/gmail-review')} className="h-8 px-3 rounded-lg text-xs font-semibold press flex items-center gap-1.5" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                <Mail size={12} />
                Gmail Review
              </button>
              <button onClick={disconnectGmail} className="h-8 px-3 rounded-lg text-xs font-semibold press flex items-center gap-1.5" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                <Unplug size={12} />
                Disconnect
              </button>
            </>
          )}
          <button onClick={() => setGmailOnly(v => !v)} className="h-8 px-3 rounded-lg text-xs font-semibold press" style={{ backgroundColor: gmailOnly ? 'var(--accent)' : 'var(--surface-elevated)', color: gmailOnly ? '#fff' : 'var(--text-secondary)' }}>
            {gmailOnly ? 'Showing Gmail only' : 'Show Gmail only'}
          </button>
        </div>
      </div>

      {/* KPI chips */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Income</p>
          <p className="text-sm font-bold num mt-1" style={{ color: 'var(--accent-green)' }}>{formatMoney(totalIncome)}</p>
        </div>
        <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Variable</p>
          <p className="text-sm font-bold num mt-1" style={{ color: 'var(--accent-warm)' }}>{formatMoney(variableExpense)}</p>
        </div>
        <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Fixed</p>
          <p className="text-sm font-bold num mt-1" style={{ color: 'var(--accent-warm)' }}>{formatMoney(fixedExpense)}</p>
        </div>
        <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Net</p>
          <p className="text-sm font-bold num mt-1" style={{ color: net >= 0 ? 'var(--accent-green)' : 'var(--accent-warm)' }}>
            {net >= 0 ? '+' : '-'}{formatMoney(Math.abs(net))}
          </p>
        </div>
      </div>

      {/* Transaction list */}
      <div className="mb-3">
        <button
          onClick={openCreate}
          className="w-full h-11 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 press"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Plus size={14} /> Quick Add Expense
        </button>
      </div>

      {showEditor && (
        <div className="mb-4 rounded-2xl p-3 space-y-2" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)44' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{editingExpenseId ? 'Edit Transaction' : 'Add Transaction'}</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Amount"
              value={editorForm.amount}
              onChange={(e) => setEditorForm(prev => ({ ...prev, amount: e.target.value }))}
              className="h-10 px-3 rounded-xl outline-none text-sm"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
            <select
              value={editorForm.category}
              onChange={(e) => setEditorForm(prev => ({ ...prev, category: e.target.value }))}
              className="h-10 px-3 rounded-xl outline-none text-sm"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            >
              {Object.keys(categoryColors).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <input
            type="date"
            value={editorForm.date}
            onChange={(e) => setEditorForm(prev => ({ ...prev, date: e.target.value }))}
            className="w-full h-10 px-3 rounded-xl outline-none text-sm"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <input
            type="text"
            placeholder="Note"
            value={editorForm.note}
            onChange={(e) => setEditorForm(prev => ({ ...prev, note: e.target.value }))}
            className="w-full h-10 px-3 rounded-xl outline-none text-sm"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <div className="flex gap-2">
            <button onClick={() => setShowEditor(false)} className="flex-1 h-9 rounded-xl text-xs" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={submitEditor} className="flex-1 h-9 rounded-xl text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>{editingExpenseId ? 'Save' : 'Add'}</button>
          </div>
        </div>
      )}

      {loading ? (
        [1,2,3].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 mb-2 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="skeleton w-9 h-9 rounded-xl" />
            <div className="flex-1"><div className="skeleton h-3 w-32 rounded mb-1" /><div className="skeleton h-2 w-20 rounded" /></div>
            <div className="skeleton h-4 w-14 rounded" />
          </div>
        ))
      ) : visibleExpenses.length === 0 ? (
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
                  <div key={exp.id ?? i} className="flex items-center gap-3 p-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '22' }}>
                      <DollarSign size={16} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {exp.note || exp.category}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{exp.category}</p>
                        {(exp.sourceType || '').toLowerCase() === 'gmail' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent)22', color: 'var(--accent)' }}>
                            Gmail
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold num" style={{ color: 'var(--accent-warm)' }}>
                      -{formatMoney(exp.amount ?? 0)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(exp)} className="w-8 h-8 rounded-lg flex items-center justify-center press" style={{ color: 'var(--text-secondary)' }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteTransaction(exp.id)} className="w-8 h-8 rounded-lg flex items-center justify-center press" style={{ color: '#ef4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
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

function BucketsTab() {
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newBucket, setNewBucket] = useState({ name: '', icon: '🪣', target: '', color: '#4ECDC4', frequency: 'monthly', periodMonths: '', investedIn: '' });
  const navigate = useNavigate();

  useEffect(() => {
    api.getBuckets().then((data: any) => setBuckets(Array.isArray(data) ? data : [])).finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!newBucket.name.trim() || !newBucket.target || !newBucket.periodMonths) return;
    const target = Number(newBucket.target);
    const periodMonths = Number(newBucket.periodMonths);
    const created = await api.createBucket({
      name: newBucket.name, icon: newBucket.icon, color: newBucket.color,
      target, current: 0,
      frequency: newBucket.frequency, periodMonths,
      investedIn: newBucket.investedIn,
    });
    setBuckets(p => [...p, created]);
    setNewBucket({ name: '', icon: '🪣', target: '', color: '#4ECDC4', frequency: 'monthly', periodMonths: '', investedIn: '' });
    setShowAdd(false);
  }

  if (loading) return <div className="px-4 py-8 flex justify-center"><div className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} /></div>;

  return (
    <div className="px-4">
      <div className="space-y-3">
        {buckets.map(b => {
          const pct = b.target > 0 ? Math.min(100, Math.round((b.current / b.target) * 100)) : 0;
          const sipAmount = b.periodMonths > 0 ? Math.ceil(b.target / b.periodMonths) : 0;
          return (
            <div key={b.id} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <button onClick={() => navigate(`/finance/bucket/${b.id}`)} className="w-full flex items-center gap-3 p-4 press">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: b.color + '22' }}>
                  {b.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{b.name}</p>
                  {b.investedIn && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{b.investedIn}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: b.color }} />
                    </div>
                    <span className="text-[10px] num flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{formatMoney(b.current)}</p>
                  <p className="text-[10px] num" style={{ color: 'var(--text-muted)' }}>of {formatMoney(b.target)}</p>
                  {sipAmount > 0 && <p className="text-[10px] num mt-0.5" style={{ color: b.color }}>{formatMoney(sipAmount)}/{b.frequency?.[0] ?? 'm'}</p>}
                </div>
              </button>
            </div>
          );
        })}

        {showAdd && (
          <div className="p-4 rounded-2xl space-y-2 max-h-[70dvh] overflow-y-auto" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)44' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>New Bucket</p>
            <div className="flex gap-2">
              <input value={newBucket.icon} onChange={e => setNewBucket(p => ({ ...p, icon: e.target.value }))} className="w-14 h-10 rounded-xl outline-none text-center text-xl" style={{ backgroundColor: 'var(--surface-elevated)' }} />
              <input value={newBucket.name} onChange={e => setNewBucket(p => ({ ...p, name: e.target.value }))} placeholder="Bucket name" className="flex-1 h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={newBucket.target} onChange={e => setNewBucket(p => ({ ...p, target: e.target.value }))} placeholder="Goal ₹" className="h-10 px-3 rounded-xl outline-none text-sm num" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
              <input type="number" value={newBucket.periodMonths} onChange={e => setNewBucket(p => ({ ...p, periodMonths: e.target.value }))} placeholder="Period (months)" className="h-10 px-3 rounded-xl outline-none text-sm num" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
            </div>
            {newBucket.target && newBucket.periodMonths && (
              <div className="p-2.5 rounded-xl text-xs" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent)' }}>
                📌 SIP: {formatMoney(Math.ceil(Number(newBucket.target) / Number(newBucket.periodMonths)))} / month
              </div>
            )}
            <div className="flex gap-2">
              {['monthly', 'weekly', 'quarterly'].map(f => (
                <button key={f} onClick={() => setNewBucket(p => ({ ...p, frequency: f }))}
                  className="flex-1 h-8 rounded-xl text-xs font-medium capitalize press"
                  style={{ backgroundColor: newBucket.frequency === f ? 'var(--accent)' : 'var(--surface-elevated)', color: newBucket.frequency === f ? '#fff' : 'var(--text-secondary)' }}>
                  {f}
                </button>
              ))}
            </div>
            <input value={newBucket.investedIn} onChange={e => setNewBucket(p => ({ ...p, investedIn: e.target.value }))} placeholder="Where invested / stored (e.g. Nifty BeES, HDFC Savings)" className="w-full h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 h-9 rounded-xl text-xs" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleAdd} className="flex-1 h-9 rounded-xl text-xs font-medium text-white" style={{ backgroundColor: 'var(--accent)' }}>Create</button>
            </div>
          </div>
        )}

        <button onClick={() => setShowAdd(v => !v)} className="w-full h-12 rounded-2xl text-sm font-medium press flex items-center justify-center gap-2" style={{ border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
          <Plus size={16} /> Add Bucket
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Investments Tab
// ──────────────────────────────────────────────────

function InvestmentsTab() {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newHolding, setNewHolding] = useState({ name: '', type: 'MF', invested: '', current: '' });
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editHolding, setEditHolding] = useState({ name: '', type: 'MF', invested: '', current: '' });

  useEffect(() => {
    api.getInvestments().then((data: any) => setHoldings(Array.isArray(data) ? data : [])).finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!newHolding.name.trim() || !newHolding.invested || !newHolding.current) return;
    const inv = Number(newHolding.invested);
    const cur = Number(newHolding.current);
    const created = await api.createInvestment({ name: newHolding.name, type: newHolding.type, invested: inv, current: cur, change: inv > 0 ? parseFloat(((cur - inv) / inv * 100).toFixed(1)) : 0 });
    setHoldings(p => [...p, created]);
    setNewHolding({ name: '', type: 'MF', invested: '', current: '' });
    setShowAdd(false);
  }

  async function handleDelete(id: string | number) {
    await api.deleteInvestment(id);
    setHoldings(p => p.filter(h => h.id !== id));
  }

  function startEdit(h: any) {
    setEditingId(h.id);
    setEditHolding({
      name: h.name || '',
      type: h.type || 'MF',
      invested: String(h.invested ?? ''),
      current: String(h.current ?? '')
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditHolding({ name: '', type: 'MF', invested: '', current: '' });
  }

  async function handleUpdate() {
    if (editingId == null) return;
    if (!editHolding.name.trim() || !editHolding.invested || !editHolding.current) return;

    const inv = Number(editHolding.invested);
    const cur = Number(editHolding.current);
    const payload = {
      name: editHolding.name,
      type: editHolding.type,
      invested: inv,
      current: cur,
      change: inv > 0 ? parseFloat((((cur - inv) / inv) * 100).toFixed(1)) : 0
    };

    const updated = await api.updateInvestment(editingId, payload);

    setHoldings(prev => prev.map(h => {
      if (h.id !== editingId) return h;
      return { ...h, ...(updated || payload), id: h.id };
    }));

    cancelEdit();
  }

  if (loading) return <div className="px-4 py-8 flex justify-center"><div className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} /></div>;

  const totalInvested = holdings.reduce((s, h) => s + (h.invested || 0), 0);
  const totalCurrent  = holdings.reduce((s, h) => s + (h.current || 0), 0);
  const totalPnL      = totalCurrent - totalInvested;
  const pnlPct        = totalInvested > 0 ? ((totalPnL / totalInvested) * 100).toFixed(1) : '0.0';
  const pos           = totalPnL >= 0;

  return (
    <div className="px-4">
      <div className="p-5 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, var(--accent-green)22, var(--surface))', border: '1px solid var(--accent-green)33' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Portfolio Value</p>
        <p className="text-3xl font-bold num mt-1" style={{ color: 'var(--text-primary)' }}>{formatMoney(totalCurrent)}</p>
        <div className="flex items-center gap-2 mt-2">
          {pos ? <ArrowUpRight size={14} style={{ color: 'var(--accent-green)' }} /> : <ArrowDownRight size={14} style={{ color: 'var(--accent-warm)' }} />}
          <span className="text-sm font-semibold num" style={{ color: pos ? 'var(--accent-green)' : 'var(--accent-warm)' }}>
            {pos ? '+' : '-'}{formatMoney(Math.abs(totalPnL))} ({pnlPct}%)
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Invested: {formatMoney(totalInvested)}</p>
      </div>

      <div className="section-header px-0 mb-2">
        <span className="section-label">Holdings</span>
        <button onClick={() => setShowAdd(v => !v)} className="press" style={{ color: 'var(--accent)' }}>
          <Plus size={18} />
        </button>
      </div>

      {showAdd && (
        <div className="p-4 rounded-2xl mb-3 space-y-2 max-h-[70dvh] overflow-y-auto" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)44' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Add Holding</p>
          <input value={newHolding.name} onChange={e => setNewHolding(p => ({ ...p, name: e.target.value }))} placeholder="Name (e.g. Nifty BeES)" className="w-full h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
          <select value={newHolding.type} onChange={e => setNewHolding(p => ({ ...p, type: e.target.value }))} className="w-full h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
            {['MF', 'ETF', 'Stock', 'FD', 'Gold', 'Crypto', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={newHolding.invested} onChange={e => setNewHolding(p => ({ ...p, invested: e.target.value }))} placeholder="Invested ₹" className="h-10 px-3 rounded-xl outline-none text-sm num" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
            <input type="number" value={newHolding.current} onChange={e => setNewHolding(p => ({ ...p, current: e.target.value }))} placeholder="Current ₹" className="h-10 px-3 rounded-xl outline-none text-sm num" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="flex-1 h-9 rounded-xl text-xs" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={handleAdd} className="flex-1 h-9 rounded-xl text-xs font-medium text-white" style={{ backgroundColor: 'var(--accent)' }}>Add</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {holdings.map(h => {
          const pnl = (h.current || 0) - (h.invested || 0);
          const hpos = pnl >= 0;

          if (editingId === h.id) {
            return (
              <div key={h.id ?? h.name} className="p-4 rounded-2xl space-y-2" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)44' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Holding</p>
                <input
                  value={editHolding.name}
                  onChange={e => setEditHolding(p => ({ ...p, name: e.target.value }))}
                  placeholder="Name"
                  className="w-full h-10 px-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                />
                <select
                  value={editHolding.type}
                  onChange={e => setEditHolding(p => ({ ...p, type: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                >
                  {['MF', 'ETF', 'Stock', 'FD', 'Gold', 'Crypto', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={editHolding.invested}
                    onChange={e => setEditHolding(p => ({ ...p, invested: e.target.value }))}
                    placeholder="Invested ₹"
                    className="h-10 px-3 rounded-xl outline-none text-sm num"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                  />
                  <input
                    type="number"
                    value={editHolding.current}
                    onChange={e => setEditHolding(p => ({ ...p, current: e.target.value }))}
                    placeholder="Current ₹"
                    className="h-10 px-3 rounded-xl outline-none text-sm num"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={cancelEdit} className="flex-1 h-9 rounded-xl text-xs" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                    Cancel
                  </button>
                  <button onClick={handleUpdate} className="flex-1 h-9 rounded-xl text-xs font-medium text-white" style={{ backgroundColor: 'var(--accent)' }}>
                    Save
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={h.id ?? h.name} className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: hpos ? 'var(--accent-green)22' : 'var(--accent-warm)22' }}>
                <TrendingUp size={18} style={{ color: hpos ? 'var(--accent-green)' : 'var(--accent-warm)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{h.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{h.type} · {formatMoney(h.invested || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{formatMoney(h.current || 0)}</p>
                <p className="text-xs num font-medium mt-0.5" style={{ color: hpos ? 'var(--accent-green)' : 'var(--accent-warm)' }}>
                  {hpos ? '+' : ''}{h.change ?? 0}%
                </p>
              </div>
              <button onClick={() => startEdit(h)} className="w-8 h-8 rounded-lg flex items-center justify-center press ml-1" style={{ color: 'var(--accent)' }}>
                <Pencil size={14} />
              </button>
              <button onClick={() => handleDelete(h.id)} className="w-8 h-8 rounded-lg flex items-center justify-center press ml-1" style={{ color: '#ef4444' }}>
                <Trash2 size={14} />
              </button>
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
                {formatMoney(c.amount)} · {Math.round((c.amount / totalCat) * 100)}%
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
            onClick={() => setTab('Analytics')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl press"
            style={{
              backgroundColor: tab === 'Analytics' ? 'var(--accent)' : 'var(--surface)',
              border: '1px solid var(--border)'
            }}
          >
            <BarChart3 size={14} style={{ color: tab === 'Analytics' ? '#fff' : 'var(--text-secondary)' }} />
            <span className="text-xs font-medium" style={{ color: tab === 'Analytics' ? '#fff' : 'var(--text-secondary)' }}>Analytics</span>
          </button>
      </div>

      <PillTabs
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
