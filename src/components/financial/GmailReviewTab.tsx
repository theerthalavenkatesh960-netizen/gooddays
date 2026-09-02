import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, RefreshCw, Pencil, Check, X } from 'lucide-react';
import * as api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContextApi';

const CATEGORIES = [
  'Food', 'Groceries', 'Transport', 'Fuel', 'Home', 'Rent', 'Utilities', 'Internet',
  'Subscriptions', 'Personal', 'Medical', 'Gym', 'Self Care', 'Fun', 'Shopping',
  'Education', 'Books', 'Coffee', 'Travel', 'Other'
];

export default function GmailReviewTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'reviewed' | 'unreviewed'>('unreviewed');
  const [bulkCategory, setBulkCategory] = useState('Food');
  const [editingMerchantId, setEditingMerchantId] = useState<number | null>(null);
  const [merchantDraft, setMerchantDraft] = useState('');
  const [savingMerchant, setSavingMerchant] = useState(false);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allVisibleSelected = rows.length > 0 && rows.every(r => selectedSet.has(r.id));

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const reviewed = reviewFilter === 'all' ? undefined : reviewFilter === 'reviewed';
      const data = await api.getFinanceGmailTransactions(reviewed);
      setRows(Array.isArray(data) ? data : []);
      setSelected([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [user, reviewFilter]);

  const toggle = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllToggle = () => {
    if (allVisibleSelected) {
      setSelected([]);
      return;
    }
    setSelected(rows.map(r => r.id));
  };

  const bulkMark = async (isReviewed: boolean) => {
    if (selected.length === 0) return;
    await api.bulkReviewFinanceGmailTransactions(selected, isReviewed);
    await load();
  };

  const bulkSetCategory = async () => {
    if (selected.length === 0 || !bulkCategory) return;
    await api.bulkSetCategoryFinanceGmailTransactions(selected, bulkCategory, true);
    await load();
  };

  const toggleSingleReview = async (row: any) => {
    await api.bulkReviewFinanceGmailTransactions([row.id], !row.isReviewed);
    await load();
  };

  const startEditMerchant = (row: any) => {
    setEditingMerchantId(row.id);
    setMerchantDraft(row.description || '');
  };

  const cancelEditMerchant = () => {
    setEditingMerchantId(null);
    setMerchantDraft('');
  };

  const saveMerchant = async (row: any) => {
    if (!merchantDraft.trim()) return;
    setSavingMerchant(true);
    try {
      // applyToFuture: true learns this correction so the same detected merchant text auto-corrects on future syncs
      await api.updateFinanceGmailMerchant(row.id, merchantDraft.trim(), row.category, true);
      cancelEditMerchant();
      await load();
    } finally {
      setSavingMerchant(false);
    }
  };

  return (
    <div className="px-4">
      <div className="rounded-2xl p-3 mb-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={() => setReviewFilter('unreviewed')}
            className="h-8 px-3 rounded-lg text-xs font-semibold press"
            style={{ backgroundColor: reviewFilter === 'unreviewed' ? 'var(--accent)' : 'var(--surface-elevated)', color: reviewFilter === 'unreviewed' ? '#fff' : 'var(--text-secondary)' }}
          >
            Unreviewed
          </button>
          <button
            onClick={() => setReviewFilter('reviewed')}
            className="h-8 px-3 rounded-lg text-xs font-semibold press"
            style={{ backgroundColor: reviewFilter === 'reviewed' ? 'var(--accent)' : 'var(--surface-elevated)', color: reviewFilter === 'reviewed' ? '#fff' : 'var(--text-secondary)' }}
          >
            Reviewed
          </button>
          <button
            onClick={() => setReviewFilter('all')}
            className="h-8 px-3 rounded-lg text-xs font-semibold press"
            style={{ backgroundColor: reviewFilter === 'all' ? 'var(--accent)' : 'var(--surface-elevated)', color: reviewFilter === 'all' ? '#fff' : 'var(--text-secondary)' }}
          >
            All
          </button>
          <button onClick={load} className="h-8 px-3 rounded-lg text-xs font-semibold press flex items-center gap-1.5 ml-auto" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={selectAllToggle} className="h-8 px-3 rounded-lg text-xs font-semibold press" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
            {allVisibleSelected ? 'Clear Selection' : 'Select All'}
          </button>
          <button onClick={() => bulkMark(true)} disabled={selected.length === 0} className="h-8 px-3 rounded-lg text-xs font-semibold text-white press disabled:opacity-60" style={{ backgroundColor: 'var(--accent)' }}>
            Mark Reviewed
          </button>
          <button onClick={() => bulkMark(false)} disabled={selected.length === 0} className="h-8 px-3 rounded-lg text-xs font-semibold press disabled:opacity-60" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
            Mark Unreviewed
          </button>
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="h-8 px-2 rounded-lg text-xs outline-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={bulkSetCategory} disabled={selected.length === 0} className="h-8 px-3 rounded-lg text-xs font-semibold press disabled:opacity-60" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
            Apply Category
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        {loading ? (
          <div className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>Loading Gmail transactions...</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>No Gmail transactions in this filter.</div>
        ) : rows.map((row) => (
          <div key={row.id} className="p-3 border-b last:border-b-0 flex items-start gap-3" style={{ borderColor: 'var(--border)' }}>
            <input type="checkbox" checked={selectedSet.has(row.id)} onChange={() => toggle(row.id)} className="mt-1" />
            <div className="flex-1 min-w-0">
              {editingMerchantId === row.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={merchantDraft}
                    onChange={(e) => setMerchantDraft(e.target.value)}
                    className="h-8 px-2 rounded-lg text-sm flex-1 outline-none"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  />
                  <button onClick={() => saveMerchant(row)} disabled={savingMerchant} className="h-8 w-8 rounded-lg flex items-center justify-center press disabled:opacity-60" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                    <Check size={13} />
                  </button>
                  <button onClick={cancelEditMerchant} className="h-8 w-8 rounded-lg flex items-center justify-center press" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{row.description || 'Transaction'}</p>
                  <button onClick={() => startEditMerchant(row)} className="press flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    <Pencil size={12} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.category || 'Other'}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>₹{Number(row.amount || 0).toFixed(2)}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(row.date || row.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <button onClick={() => toggleSingleReview(row)} className="h-8 px-2 rounded-lg text-xs font-semibold press flex items-center gap-1" style={{ backgroundColor: 'var(--surface-elevated)', color: row.isReviewed ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
              {row.isReviewed ? <CheckCircle2 size={13} /> : <Circle size={13} />}
              {row.isReviewed ? 'Reviewed' : 'Unreviewed'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
