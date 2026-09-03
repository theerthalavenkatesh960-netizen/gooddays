import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, RefreshCw, Pencil, Check, X, ChevronRight } from 'lucide-react';
import * as api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContextApi';
import TransactionDetailModal from './TransactionDetailModal';

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
  const [candidates, setCandidates] = useState<any[]>([]);
  const [promoteCandidateId, setPromoteCandidateId] = useState<string | null>(null);
  const [promoteForm, setPromoteForm] = useState({ amount: '', merchant: '', category: 'Other', date: '', paymentInstrumentType: 'UNKNOWN' });
  const [previewEmail, setPreviewEmail] = useState<any | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({ financeSenderAllowlist: '', blockedSenderPatterns: '', trustedOrderDomains: '' });

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allVisibleSelected = rows.length > 0 && rows.every(r => selectedSet.has(r.id));

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const reviewed = reviewFilter === 'all' ? undefined : reviewFilter === 'reviewed';
      const [data, candidateData] = await Promise.all([
        api.getFinanceGmailTransactions(reviewed),
        api.getFinanceGmailCandidates('NEEDS_REVIEW').catch(() => []),
      ]);
      setRows(Array.isArray(data) ? data : []);
      setCandidates(Array.isArray(candidateData) ? candidateData : []);
      setSelected([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [user, reviewFilter]);

  useEffect(() => {
    if (!user) return;
    api.getFinanceGmailSettings().then((settings: any) => {
      setSettingsDraft({
        financeSenderAllowlist: (settings.financeSenderAllowlist || []).join('\n'),
        blockedSenderPatterns: (settings.blockedSenderPatterns || []).join('\n'),
        trustedOrderDomains: (settings.trustedOrderDomains || []).join('\n'),
      });
    }).catch(() => undefined);
  }, [user]);

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

  const bulkDecide = async (decision: 'APPROVE' | 'REJECT') => {
    if (selected.length === 0) return;
    await api.decideFinanceGmailTransactions(selected, decision);
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

  const rejectCandidate = async (id: string) => {
    await api.updateFinanceGmailCandidateStatus(id, 'REJECTED');
    await load();
  };

  const decide = async (id: number, decision: 'APPROVE' | 'REJECT') => {
    await api.decideFinanceGmailTransaction(id, decision);
    await load();
  };

  const startPromoteCandidate = (candidate: any) => {
    setPromoteCandidateId(candidate.id);
    setPromoteForm({ amount: '', merchant: '', category: 'Other', date: new Date().toISOString().slice(0, 10), paymentInstrumentType: 'UNKNOWN' });
  };

  const promoteCandidate = async (candidate: any) => {
    const amount = Number(promoteForm.amount);
    if (!amount || !promoteForm.merchant.trim()) return;
    await api.promoteFinanceGmailCandidate(candidate.id, {
      amount,
      merchant: promoteForm.merchant.trim(),
      category: promoteForm.category,
      transactionDate: promoteForm.date ? new Date(`${promoteForm.date}T12:00:00`).toISOString() : null,
      direction: 'DEBIT',
      transactionType: 'PURCHASE',
      paymentInstrumentType: promoteForm.paymentInstrumentType,
      sourceInstrumentType: promoteForm.paymentInstrumentType,
    });
    setPromoteCandidateId(null);
    await load();
  };

  const previewCandidateEmail = async (candidate: any) => {
    const email = await api.getFinanceGmailCandidateEmail(candidate.id);
    setPreviewEmail(email);
  };

  const saveSettings = async () => {
    await api.updateFinanceGmailSettings({
      financeSenderAllowlist: settingsDraft.financeSenderAllowlist.split(/\r?\n|,|;/).map(x => x.trim()).filter(Boolean),
      blockedSenderPatterns: settingsDraft.blockedSenderPatterns.split(/\r?\n|,|;/).map(x => x.trim()).filter(Boolean),
      trustedOrderDomains: settingsDraft.trustedOrderDomains.split(/\r?\n|,|;/).map(x => x.trim()).filter(Boolean),
    });
    setShowSettings(false);
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
          <button onClick={() => bulkDecide('APPROVE')} disabled={selected.length === 0} className="h-8 px-3 rounded-lg text-xs font-semibold text-white press disabled:opacity-60" style={{ backgroundColor: 'var(--accent)' }}>
            Approve Selected
          </button>
          <button onClick={() => bulkDecide('REJECT')} disabled={selected.length === 0} className="h-8 px-3 rounded-lg text-xs font-semibold press disabled:opacity-60" style={{ backgroundColor: 'var(--surface-elevated)', color: '#ef4444' }}>
            Reject Selected
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
          <button onClick={() => setShowSettings(v => !v)} className="h-8 px-3 rounded-lg text-xs font-semibold press ml-auto" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
            Sync Settings
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="rounded-2xl p-3 mb-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Finance senders
              <textarea value={settingsDraft.financeSenderAllowlist} onChange={(e) => setSettingsDraft(s => ({ ...s, financeSenderAllowlist: e.target.value }))} className="mt-1 w-full min-h-24 p-2 rounded-lg text-xs outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
            </label>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Blocked senders/patterns
              <textarea value={settingsDraft.blockedSenderPatterns} onChange={(e) => setSettingsDraft(s => ({ ...s, blockedSenderPatterns: e.target.value }))} className="mt-1 w-full min-h-24 p-2 rounded-lg text-xs outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
            </label>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Trusted order domains
              <textarea value={settingsDraft.trustedOrderDomains} onChange={(e) => setSettingsDraft(s => ({ ...s, trustedOrderDomains: e.target.value }))} className="mt-1 w-full min-h-24 p-2 rounded-lg text-xs outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
            </label>
          </div>
          <button onClick={saveSettings} className="mt-2 h-8 px-3 rounded-lg text-xs font-semibold text-white press" style={{ backgroundColor: 'var(--accent)' }}>
            Save Settings
          </button>
        </div>
      )}

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
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.category || 'Other'}</span>
                <span className="text-xs num" style={{ color: row.direction === 'CREDIT' ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {row.direction === 'CREDIT' ? '+' : '−'}₹{Number(row.amount || 0).toFixed(2)}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(row.date || row.createdAt).toLocaleDateString()}</span>
                {row.transactionType && row.transactionType !== 'PURCHASE' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                    {row.transactionType}
                  </span>
                )}
              </div>
              {(row.counterpartyName || row.instrumentLast4) && (
                <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                  {[row.counterpartyName, row.institutionName, row.instrumentLast4 ? `••${row.instrumentLast4}` : null].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button onClick={() => setDetailId(row.id)} className="h-8 px-2 rounded-lg text-xs font-semibold press flex items-center gap-1" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                Details <ChevronRight size={12} />
              </button>
              {!row.isReviewed ? (
                <div className="flex gap-1">
                  <button onClick={() => decide(row.id, 'APPROVE')} className="h-8 px-2 rounded-lg text-xs font-semibold text-white press" style={{ backgroundColor: 'var(--accent)' }}>
                    Approve
                  </button>
                  <button onClick={() => decide(row.id, 'REJECT')} className="h-8 px-2 rounded-lg text-xs font-semibold press" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                    Reject
                  </button>
                </div>
              ) : (
                <button onClick={() => toggleSingleReview(row)} className="h-8 px-2 rounded-lg text-xs font-semibold press flex items-center gap-1" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--accent-green)' }}>
                  <CheckCircle2 size={13} /> Reviewed
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {candidates.length > 0 && (
        <div className="rounded-2xl overflow-hidden mt-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Needs review</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Emails that were not promoted to transactions</p>
          </div>
          {candidates.map((candidate) => (
            <div key={candidate.id} className="p-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {candidate.subject || candidate.sender || 'Unrecognised email'}
                  </p>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {[candidate.sender, candidate.receivedAt ? new Date(candidate.receivedAt).toLocaleDateString() : null]
                      .filter(Boolean).join(' · ')}
                  </p>
                  {candidate.snippet && (
                    <p className="text-[11px] mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {candidate.snippet}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                      {candidate.status}
                    </span>
                    {candidate.error && (
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{candidate.error}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => rejectCandidate(candidate.id)}
                  className="h-8 px-3 rounded-lg text-xs font-semibold press flex-shrink-0"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
                >
                  Reject
                </button>
              </div>
              <button onClick={() => previewCandidateEmail(candidate)} className="mt-2 h-8 px-3 rounded-lg text-xs font-semibold press" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                Preview email
              </button>
              {promoteCandidateId === candidate.id ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                  <input value={promoteForm.merchant} onChange={(e) => setPromoteForm(f => ({ ...f, merchant: e.target.value }))} placeholder="Merchant" className="h-8 px-2 rounded-lg text-xs outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                  <input value={promoteForm.amount} onChange={(e) => setPromoteForm(f => ({ ...f, amount: e.target.value }))} placeholder="Amount" type="number" className="h-8 px-2 rounded-lg text-xs outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                  <input value={promoteForm.date} onChange={(e) => setPromoteForm(f => ({ ...f, date: e.target.value }))} type="date" className="h-8 px-2 rounded-lg text-xs outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                  <select value={promoteForm.paymentInstrumentType} onChange={(e) => setPromoteForm(f => ({ ...f, paymentInstrumentType: e.target.value }))} className="h-8 px-2 rounded-lg text-xs outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
                    {['UNKNOWN', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_ACCOUNT', 'UPI', 'WALLET', 'CASH'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <button onClick={() => promoteCandidate(candidate)} className="h-8 px-2 rounded-lg text-xs font-semibold text-white press" style={{ backgroundColor: 'var(--accent)' }}>Create</button>
                    <button onClick={() => setPromoteCandidateId(null)} className="h-8 px-2 rounded-lg text-xs font-semibold press" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => startPromoteCandidate(candidate)} className="mt-2 h-8 px-3 rounded-lg text-xs font-semibold press" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                  Create transaction
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {previewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{previewEmail.subject || 'Email preview'}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{previewEmail.sender} · {previewEmail.internalDate ? new Date(previewEmail.internalDate).toLocaleString() : ''}</p>
              </div>
              <button onClick={() => setPreviewEmail(null)} className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                <X size={14} />
              </button>
            </div>
            <div className="rounded-xl p-3 mb-3 text-xs whitespace-pre-wrap" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
              {previewEmail.snippet}
            </div>
            <pre className="text-xs whitespace-pre-wrap break-words rounded-xl p-3" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
              {previewEmail.bodyText || 'No body captured.'}
            </pre>
          </div>
        </div>
      )}
      {detailId != null && (
        <TransactionDetailModal
          transactionId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => load()}
        />
      )}
    </div>
  );
}
