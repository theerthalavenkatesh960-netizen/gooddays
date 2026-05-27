import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';

interface MonthlyStats {
  income: number;
  variable: number;
  fixed: number;
  net: number;
  categoryBreakdown: Record<string, number>;
  budgetVsActual: Record<string, { budgeted: number; actual: number }>;
}

export default function SettingsAnalytics() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stats, setStats] = useState<MonthlyStats | null>(null);

  useEffect(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    
    Promise.all([
      api.getExpenses(start, end),
      api.getFinanceBudgetProfile()
    ]).then(([expenses, budget]: any) => {
      const expenseList = Array.isArray(expenses) ? expenses : [];
      
      // Calculate totals
      const income = expenseList
        .filter((e: any) => e.type === 'income')
        .reduce((s: number, e: any) => s + (e.amount || 0), 0);
      
      const variable = expenseList
        .filter((e: any) => e.type === 'expense' && e.category !== 'fixed')
        .reduce((s: number, e: any) => s + (e.amount || 0), 0);
      
      const fixed = expenseList
        .filter((e: any) => e.category === 'fixed')
        .reduce((s: number, e: any) => s + (e.amount || 0), 0);

      // Category breakdown
      const categoryBreakdown: Record<string, number> = {};
      expenseList.forEach((e: any) => {
        if (e.type === 'expense') {
          categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + (e.amount || 0);
        }
      });

      // Budget vs actual
      const budgetVsActual: Record<string, any> = {};
      if (budget) {
        Object.entries(budget).forEach(([cat, budgetAmount]: any) => {
          budgetVsActual[cat] = {
            budgeted: budgetAmount,
            actual: categoryBreakdown[cat] || 0
          };
        });
      }

      setStats({
        income,
        variable,
        fixed,
        net: income - variable - fixed,
        categoryBreakdown,
        budgetVsActual
      });
    }).catch(() => {
      setStats({
        income: 0,
        variable: 0,
        fixed: 0,
        net: 0,
        categoryBreakdown: {},
        budgetVsActual: {}
      });
    });
  }, [currentDate]);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  if (!stats) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  const categoryColors: Record<string, string> = {
    'food': '#FF6B6B',
    'transport': '#4ECDC4',
    'entertainment': '#FFE66D',
    'utilities': '#95E1D3',
    'shopping': '#F38181',
    'healthcare': '#AA96DA',
    'fixed': '#5DADE2',
    'other': '#BDC3C7'
  };

  const topCategories = Object.entries(stats.categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const overBudgetCategories = Object.entries(stats.budgetVsActual)
    .filter(([, v]: any) => v.actual > v.budgeted)
    .sort((a, b) => (b[1].actual - b[1].budgeted) - (a[1].actual - a[1].budgeted));

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
            <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Finance Analytics</h1>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="px-4 mb-5 flex items-center justify-between">
        <button onClick={prevMonth} className="w-9 h-9 rounded-lg flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{format(currentDate, 'MMMM yyyy')}</h2>
        <button onClick={nextMonth} className="w-9 h-9 rounded-lg flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="px-4 grid grid-cols-2 gap-2 mb-5">
        <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} style={{ color: '#10B981' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Income</p>
          </div>
          <p className="text-lg font-bold num" style={{ color: 'var(--text-primary)' }}>₹{stats.income.toLocaleString()}</p>
        </div>

        <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} style={{ color: '#EF4444' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Variable Spend</p>
          </div>
          <p className="text-lg font-bold num" style={{ color: 'var(--text-primary)' }}>₹{stats.variable.toLocaleString()}</p>
        </div>

        <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={14} style={{ color: '#F59E0B' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Fixed Spend</p>
          </div>
          <p className="text-lg font-bold num" style={{ color: 'var(--text-primary)' }}>₹{stats.fixed.toLocaleString()}</p>
        </div>

        <div className="p-3 rounded-2xl border-2" style={{ backgroundColor: 'var(--surface)', borderColor: stats.net >= 0 ? '#10B981' : '#EF4444' }}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} style={{ color: stats.net >= 0 ? '#10B981' : '#EF4444' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Net</p>
          </div>
          <p className="text-lg font-bold num" style={{ color: stats.net >= 0 ? '#10B981' : '#EF4444' }}>₹{stats.net.toLocaleString()}</p>
        </div>
      </div>

      {/* Top Categories */}
      <div className="px-4 mb-5">
        <h3 className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Top Categories</h3>
        <div className="space-y-2">
          {topCategories.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No spending this month</p>
          ) : (
            topCategories.map(([cat, amount]) => {
              const allAmount = stats.variable + stats.fixed;
              const percent = allAmount > 0 ? ((amount / allAmount) * 100).toFixed(0) : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColors[cat] || '#BDC3C7' }} />
                  <div className="flex-1">
                    <p className="text-xs capitalize font-semibold" style={{ color: 'var(--text-primary)' }}>{cat}</p>
                    <div className="w-full h-1.5 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
                      <div className="h-full" style={{ width: `${percent}%`, backgroundColor: categoryColors[cat] || '#BDC3C7' }} />
                    </div>
                  </div>
                  <p className="text-xs whitespace-nowrap num" style={{ color: 'var(--text-muted)' }}>₹{amount.toLocaleString()} ({percent}%)</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Budget vs Actual */}
      {Object.keys(stats.budgetVsActual).length > 0 && (
        <div className="px-4 mb-5">
          <h3 className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Budget vs Actual</h3>
          <div className="space-y-2">
            {Object.entries(stats.budgetVsActual).map(([cat, data]: any) => (
              <div key={cat} className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm capitalize font-semibold" style={{ color: 'var(--text-primary)' }}>{cat}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs num" style={{ color: 'var(--text-muted)' }}>₹{data.actual.toLocaleString()}</p>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-semibold"
                      style={{
                        backgroundColor: data.actual > data.budgeted ? '#EF444422' : '#10B98122',
                        color: data.actual > data.budgeted ? '#EF4444' : '#10B981'
                      }}
                    >
                      {data.actual > data.budgeted ? '+' : '-'}₹{Math.abs(data.actual - data.budgeted).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.min((data.actual / data.budgeted) * 100, 100)}%`,
                      backgroundColor: data.actual > data.budgeted ? '#EF4444' : '#10B981'
                    }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Budget: ₹{data.budgeted.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {overBudgetCategories.length > 0 && (
        <div className="px-4 mb-5">
          <h3 className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Budget Alerts</h3>
          <div className="space-y-2">
            {overBudgetCategories.slice(0, 3).map(([cat, data]: any) => (
              <div key={cat} className="p-3 rounded-2xl flex items-center gap-3" style={{ backgroundColor: '#EF444422', border: '1px solid #EF444444' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EF444433' }}>
                  <TrendingUp size={16} style={{ color: '#EF4444' }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold capitalize" style={{ color: '#EF4444' }}>{cat} over budget</p>
                  <p className="text-xs mt-0.5" style={{ color: '#EF4444dd' }}>₹{(data.actual - data.budgeted).toLocaleString()} over</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
