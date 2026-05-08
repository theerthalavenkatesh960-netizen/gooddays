import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Copy, Info, MinusCircle, Plus, Save, Settings2 } from 'lucide-react';
import { addMonths, format, subMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';

export default function FinanceBudgetSettings() {
  type ToastKind = 'success' | 'error' | 'info';

  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<api.FinanceBudgetProfile | null>(null);
  const [defaultIncomeDraft, setDefaultIncomeDraft] = useState('0');
  const [monthlyIncomeDraft, setMonthlyIncomeDraft] = useState('0');
  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedAmount, setNewFixedAmount] = useState('');
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const selectedMonth = month.getMonth() + 1;
  const selectedYear = month.getFullYear();

  function pushToast(kind: ToastKind, message: string) {
    setToast({ kind, message });
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  async function loadBudget() {
    setLoading(true);
    try {
      const data = await api.getFinanceBudgetProfile(selectedMonth, selectedYear);
      setProfile(data);
      setDefaultIncomeDraft(String(data.monthlyIncome ?? 0));
      setMonthlyIncomeDraft(String(data.effectiveMonthlyIncome ?? data.monthlyIncome ?? 0));
      const nextDrafts: Record<string, string> = {};
      (data.fixedExpenses ?? []).forEach((expense: any) => {
        const effective = expense.effectiveAmount ?? expense.amount ?? 0;
        nextDrafts[expense.id] = String(effective);
      });
      setOverrideDrafts(nextDrafts);
    } catch {
      pushToast('error', 'Unable to load budget settings for this month.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBudget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const totals = useMemo(() => {
    const fixed = (profile?.fixedExpenses ?? []).reduce((sum, expense) => sum + (expense.effectiveAmount ?? expense.amount ?? 0), 0);
    const income = profile?.effectiveMonthlyIncome ?? profile?.monthlyIncome ?? 0;
    return {
      income,
      fixed,
      net: income - fixed,
    };
  }, [profile]);

  async function runSavingAction(action: () => Promise<void>, successMessage?: string) {
    setSaving(true);
    try {
      await action();
      if (successMessage) {
        pushToast('success', successMessage);
      }
      return true;
    } catch {
      pushToast('error', 'Something went wrong. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveDefaultIncome() {
    const amount = Number(defaultIncomeDraft);
    if (!Number.isFinite(amount) || amount < 0) {
      pushToast('info', 'Enter a valid default income amount.');
      return;
    }
    await runSavingAction(async () => {
      await api.updateFinanceMonthlyIncome(amount);
      await loadBudget();
    }, 'Default income updated.');
  }

  async function saveMonthlyIncomeOverride() {
    const amount = Number(monthlyIncomeDraft);
    if (!Number.isFinite(amount) || amount < 0) {
      pushToast('info', 'Enter a valid monthly override amount.');
      return;
    }
    await runSavingAction(async () => {
      await api.upsertFinanceMonthlyIncomeOverride(selectedMonth, selectedYear, amount);
      await loadBudget();
    }, 'Monthly income override saved.');
  }

  async function resetMonthlyIncomeOverride() {
    await runSavingAction(async () => {
      await api.deleteFinanceMonthlyIncomeOverride(selectedMonth, selectedYear);
      await loadBudget();
    }, 'Monthly income reverted to default.');
  }

  async function addFixedExpense() {
    const amount = Number(newFixedAmount);
    if (!newFixedName.trim() || !Number.isFinite(amount) || amount <= 0) {
      pushToast('info', 'Enter a fixed expense name and a valid amount.');
      return;
    }
    await runSavingAction(async () => {
      await api.addFinanceFixedExpense(newFixedName.trim(), amount);
      setNewFixedName('');
      setNewFixedAmount('');
      await loadBudget();
    }, 'Fixed expense added.');
  }

  async function deleteFixedExpense(expenseId: string) {
    await runSavingAction(async () => {
      await api.deleteFinanceFixedExpense(expenseId);
      await loadBudget();
    }, 'Fixed expense removed.');
  }

  async function saveFixedExpenseOverride(expenseId: string) {
    const amount = Number(overrideDrafts[expenseId] ?? '0');
    if (!Number.isFinite(amount) || amount < 0) {
      pushToast('info', 'Enter a valid override amount.');
      return;
    }
    await runSavingAction(async () => {
      await api.upsertFinanceFixedExpenseOverride(expenseId, selectedMonth, selectedYear, amount);
      await loadBudget();
    }, 'Fixed expense override saved.');
  }

  async function resetFixedExpenseOverride(expenseId: string) {
    await runSavingAction(async () => {
      await api.deleteFinanceFixedExpenseOverride(expenseId, selectedMonth, selectedYear);
      await loadBudget();
    }, 'Fixed expense reverted to default.');
  }

  async function copyPreviousMonthOverrides() {
    const previousMonthDate = subMonths(month, 1);
    const prevMonth = previousMonthDate.getMonth() + 1;
    const prevYear = previousMonthDate.getFullYear();

    const currentExpenseIds = new Set((profile?.fixedExpenses ?? []).map((expense) => expense.id));

    await runSavingAction(async () => {
      const previousBudget = await api.getFinanceBudgetProfile(prevMonth, prevYear);

      let copiedCount = 0;

      if (previousBudget.isMonthlyIncomeOverridden) {
        const incomeToCopy = Number(previousBudget.effectiveMonthlyIncome ?? previousBudget.monthlyIncome ?? 0);
        await api.upsertFinanceMonthlyIncomeOverride(selectedMonth, selectedYear, incomeToCopy);
        copiedCount += 1;
      }

      for (const expense of previousBudget.fixedExpenses ?? []) {
        if (!expense.isOverridden || !currentExpenseIds.has(expense.id)) {
          continue;
        }
        const amountToCopy = Number(expense.effectiveAmount ?? expense.amount ?? 0);
        await api.upsertFinanceFixedExpenseOverride(expense.id, selectedMonth, selectedYear, amountToCopy);
        copiedCount += 1;
      }

      await loadBudget();

      if (copiedCount === 0) {
        pushToast('info', `No overrides to copy from ${format(previousMonthDate, 'MMMM yyyy')}.`);
      } else {
        pushToast('success', `Copied ${copiedCount} override${copiedCount > 1 ? 's' : ''} from ${format(previousMonthDate, 'MMMM yyyy')}.`);
      }
    });
  }

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex items-center gap-3 px-4 mb-4">
        <button
          onClick={() => navigate('/finance')}
          className="w-9 h-9 rounded-xl flex items-center justify-center press"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Finance Settings</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Defaults + monthly overrides</p>
        </div>
      </div>

      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="w-9 h-9 rounded-xl flex items-center justify-center press"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            <ChevronLeft size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {format(month, 'MMMM yyyy')}
          </p>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="w-9 h-9 rounded-xl flex items-center justify-center press"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <button
          onClick={copyPreviousMonthOverrides}
          disabled={saving}
          className="w-full h-9 rounded-xl text-xs font-semibold press inline-flex items-center justify-center gap-1 mb-3"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            opacity: saving ? 0.7 : 1,
          }}
        >
          <Copy size={12} /> Copy previous month overrides
        </button>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-2.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Income</p>
            <p className="text-sm font-bold num mt-1" style={{ color: 'var(--accent-green)' }}>Rs {Math.round(totals.income).toLocaleString()}</p>
          </div>
          <div className="rounded-xl p-2.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Fixed</p>
            <p className="text-sm font-bold num mt-1" style={{ color: 'var(--accent-warm)' }}>Rs {Math.round(totals.fixed).toLocaleString()}</p>
          </div>
          <div className="rounded-xl p-2.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Net</p>
            <p className="text-sm font-bold num mt-1" style={{ color: totals.net >= 0 ? 'var(--accent-green)' : 'var(--accent-warm)' }}>
              {totals.net >= 0 ? '+' : ''}Rs {Math.round(totals.net).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="px-4 py-8 text-center">
          <div className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--accent)' }} />
        </div>
      ) : (
        <div className="px-4 space-y-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Settings2 size={16} style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Default Setup</p>
            </div>

            <label className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Default monthly income</label>
            <div className="mt-1 flex items-center gap-2 mb-3">
              <input
                type="number"
                value={defaultIncomeDraft}
                onChange={(e) => setDefaultIncomeDraft(e.target.value)}
                className="flex-1 h-10 px-3 rounded-xl outline-none text-sm num"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
              />
              <button
                disabled={saving}
                onClick={saveDefaultIncome}
                className="h-10 px-3 rounded-xl text-xs font-semibold text-white press"
                style={{ backgroundColor: 'var(--accent)', opacity: saving ? 0.7 : 1 }}
              >
                <span className="inline-flex items-center gap-1"><Save size={12} /> Save</span>
              </button>
            </div>

            <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Default fixed expenses</p>
            <div className="space-y-2 mb-3">
              {(profile?.fixedExpenses ?? []).map((expense) => (
                <div key={expense.id} className="rounded-xl p-2.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{expense.name}</p>
                      <p className="text-[11px] num" style={{ color: 'var(--text-muted)' }}>Default: Rs {Math.round(expense.defaultAmount ?? expense.amount ?? 0).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => deleteFixedExpense(expense.id)}
                      className="h-8 px-2.5 rounded-lg text-[11px] font-semibold press"
                      style={{ backgroundColor: '#ef444422', color: '#ef4444' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-12 gap-2">
              <input
                value={newFixedName}
                onChange={(e) => setNewFixedName(e.target.value)}
                placeholder="New fixed expense"
                className="col-span-7 h-9 px-3 rounded-xl outline-none text-xs"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
              />
              <input
                type="number"
                value={newFixedAmount}
                onChange={(e) => setNewFixedAmount(e.target.value)}
                placeholder="Amount"
                className="col-span-3 h-9 px-3 rounded-xl outline-none text-xs num"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
              />
              <button
                onClick={addFixedExpense}
                className="col-span-2 h-9 rounded-xl text-xs font-semibold text-white press"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <span className="inline-flex items-center gap-1 justify-center"><Plus size={12} /> Add</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>This month override</p>
            <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>Use overrides only when this month differs from default.</p>

            <div className="flex items-center gap-2 mb-1">
              <input
                type="number"
                value={monthlyIncomeDraft}
                onChange={(e) => setMonthlyIncomeDraft(e.target.value)}
                className="flex-1 h-10 px-3 rounded-xl outline-none text-sm num"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
              />
              <button
                onClick={saveMonthlyIncomeOverride}
                className="h-10 px-3 rounded-xl text-xs font-semibold text-white press"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Save override
              </button>
            </div>

            {profile?.isMonthlyIncomeOverridden ? (
              <button
                onClick={resetMonthlyIncomeOverride}
                className="text-xs font-semibold inline-flex items-center gap-1 press"
                style={{ color: 'var(--accent-warm)' }}
              >
                <MinusCircle size={12} /> Use default income
              </button>
            ) : (
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Currently using default income.</p>
            )}
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Fixed expenses for {format(month, 'MMMM yyyy')}</p>
            <div className="space-y-2">
              {(profile?.fixedExpenses ?? []).map((expense) => (
                <div key={expense.id} className="rounded-xl p-2.5" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{expense.name}</p>
                  <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>
                    Default Rs {Math.round(expense.defaultAmount ?? expense.amount ?? 0).toLocaleString()} · Effective Rs {Math.round(expense.effectiveAmount ?? expense.amount ?? 0).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={overrideDrafts[expense.id] ?? ''}
                      onChange={(e) => setOverrideDrafts((prev) => ({ ...prev, [expense.id]: e.target.value }))}
                      className="flex-1 h-9 px-3 rounded-xl outline-none text-xs num"
                      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
                    />
                    <button
                      onClick={() => saveFixedExpenseOverride(expense.id)}
                      className="h-9 px-2.5 rounded-xl text-[11px] font-semibold text-white press"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      Save
                    </button>
                    {expense.isOverridden && (
                      <button
                        onClick={() => resetFixedExpenseOverride(expense.id)}
                        className="h-9 px-2.5 rounded-xl text-[11px] font-semibold press"
                        style={{ backgroundColor: '#ef444422', color: '#ef4444' }}
                      >
                        Revert
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 px-4 w-full max-w-sm">
          <div
            className="rounded-xl px-3 py-2.5 flex items-start gap-2"
            style={{
              border: '1px solid var(--border)',
              backgroundColor:
                toast.kind === 'success' ? 'var(--accent-green)22'
                : toast.kind === 'error' ? '#ef444422'
                : 'var(--surface)',
            }}
          >
            {toast.kind === 'success' ? (
              <CheckCircle2 size={15} style={{ color: 'var(--accent-green)', marginTop: 1 }} />
            ) : toast.kind === 'error' ? (
              <AlertTriangle size={15} style={{ color: '#ef4444', marginTop: 1 }} />
            ) : (
              <Info size={15} style={{ color: 'var(--text-secondary)', marginTop: 1 }} />
            )}
            <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
