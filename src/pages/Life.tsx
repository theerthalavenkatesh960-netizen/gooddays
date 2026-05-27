import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, BookOpen, BarChart2, Plus,
  Brain, Sparkles, ChevronLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as api from '../lib/api';

type LifeTab = 'Goals' | 'Journal' | 'Review';

const LIFE_TABS: { id: string; label: string; icon: React.ComponentType<{ size?: string | number }> }[] = [
  { id: 'Goals', label: 'Goals', icon: Target },
  { id: 'Journal', label: 'Journal', icon: BookOpen },
  { id: 'Review', label: 'Review', icon: BarChart2 },
];

function PillTabs({ active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1 mx-4 mb-2 p-1 rounded-2xl overflow-x-auto hide-scrollbar" style={{ backgroundColor: 'var(--surface)' }}>
      {LIFE_TABS.map(t => {
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

// ─────────────────────────────────────────────
// Goals Tab
// ─────────────────────────────────────────────
function GoalsTab() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGoals().then((data: any) => {
      setGoals(Array.isArray(data) ? data : []);
    }).catch(() => setGoals([])).finally(() => setLoading(false));
  }, []);

  const ICON_COLORS = ['#6C63FF','#FF6B6B','#4ECDC4','#FFD93D','#10B981'];

  return (
    <div className="px-4">
      <div className="section-header px-0 mb-3">
        <span className="section-label">Active Goals</span>
        <button onClick={() => navigate('/goals/new')} className="press" style={{ color: 'var(--accent)' }}><Plus size={18} /></button>
      </div>

      {loading ? (
        [1,2,3].map(i => (
          <div key={i} className="rounded-2xl p-4 mb-3" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="skeleton h-4 w-40 rounded mb-2" />
            <div className="skeleton h-2 w-full rounded" />
          </div>
        ))
      ) : goals.length === 0 ? (
        <div className="py-12 text-center">
          <Target size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No goals yet</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Set a goal to start tracking progress</p>
        </div>
      ) : (
        goals.slice(0, 6).map((g: any, i) => {
          const color = g.color ?? ICON_COLORS[i % ICON_COLORS.length];
          const pct = Math.min(100, Math.round((g.currentProgress ?? 0) / Math.max(1, g.targetValue ?? 100) * 100));
          return (
            <button key={g.id} onClick={() => navigate(`/goals/${g.id}`, { state: { from: '/life?tab=Goals' } })} className="w-full text-left rounded-2xl p-4 mb-3 press" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: color + '22' }}>
                  {g.icon ?? '🎯'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{g.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{g.category ?? 'Personal'}</p>
                </div>
                <div className="flex items-center justify-center w-10 h-10 relative flex-shrink-0">
                  <svg viewBox="0 0 40 40" width="40" height="40" className="-rotate-90">
                    <circle cx="20" cy="20" r="16" stroke="var(--surface-elevated)" strokeWidth="4" fill="none" />
                    <circle cx="20" cy="20" r="16" stroke={color} strokeWidth="4" fill="none"
                      strokeDasharray={`${2 * Math.PI * 16}`}
                      strokeDashoffset={`${2 * Math.PI * 16 * (1 - pct / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-[9px] font-bold num" style={{ color }}>{pct}%</span>
                </div>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Journal Tab
// ─────────────────────────────────────────────
function JournalTab() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const MOOD_COLORS: Record<string, string> = {
    happy: '#FFD93D', grateful: '#4ECDC4', motivated: '#6C63FF',
    tired: '#8888A0', neutral: '#55556A',
  };
  const MOOD_EMOJI: Record<string, string> = {
    happy: '😄', grateful: '🙏', motivated: '⚡', tired: '😴', neutral: '😐',
  };

  useEffect(() => {
    api.getJournalEntries().then((data: any) => {
      setEntries(Array.isArray(data) ? data.slice(0, 8) : []);
    }).catch(() => setEntries([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4">
      <div className="section-header px-0 mb-3">
        <span className="section-label">Journal</span>
        <button
          onClick={() => navigate('/journal/new')}
          className="flex items-center gap-1 text-xs press"
          style={{ color: 'var(--accent)' }}
        >
          <Plus size={14} /> Write
        </button>
      </div>

      {loading ? (
        [1,2,3].map(i => (
          <div key={i} className="rounded-2xl p-4 mb-3" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="skeleton h-4 w-40 rounded mb-2" />
            <div className="skeleton h-3 w-full rounded mb-1" />
            <div className="skeleton h-3 w-3/4 rounded" />
          </div>
        ))
      ) : entries.length === 0 ? (
        <div className="py-12 text-center">
          <BookOpen size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No entries yet</p>
          <button onClick={() => navigate('/journal/new')} className="mt-2 h-10 px-4 rounded-xl text-sm font-medium press text-white" style={{ backgroundColor: 'var(--accent)' }}>
            Write today's entry
          </button>
        </div>
      ) : (
        entries.map((e: any) => {
          const mood = e.mood ?? 'neutral';
          const color = MOOD_COLORS[mood] ?? '#8888A0';
          return (
            <button
              key={e.id}
              onClick={() => navigate(`/journal/${e.id}/edit`)}
              className="w-full text-left rounded-2xl p-4 mb-3 press"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ backgroundColor: color + '22' }}>
                  {MOOD_EMOJI[mood] ?? '📓'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{e.title}</p>
                  {e.body && (
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{e.body}</p>
                  )}
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {e.createdAt ? format(new Date(e.createdAt), 'd MMM yyyy') : ''}
                  </p>
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Review Tab
// ─────────────────────────────────────────────
function ReviewTab() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWeeklyReviews().then((data: any) => {
      setReviews(Array.isArray(data) ? data : []);
    }).catch(() => setReviews([])).finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await api.generateWeeklyReview();
      if (result) setReviews(prev => [result, ...prev.filter((r: any) => r.id !== result.id)]);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="px-4">
      {/* Generate button */}
      <div className="p-4 rounded-2xl mb-5" style={{ background: 'linear-gradient(135deg, var(--accent)22, var(--surface))', border: '1px solid var(--accent)33' }}>
        <div className="flex items-center gap-2 mb-2">
          <Brain size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI Weekly Review</span>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Claude analyses your week: tasks, workouts, spend, journal, and goals to create a personalised review.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full h-10 rounded-xl text-sm font-semibold text-white press flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <><Sparkles size={14} /> Generate This Week's Review</>
          )}
        </button>
      </div>

      <div className="section-header px-0 mb-3">
        <span className="section-label">Past Reviews</span>
      </div>

      {loading ? (
        [1,2].map(i => (
          <div key={i} className="rounded-2xl p-4 mb-3" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="skeleton h-4 w-32 rounded mb-2" />
            <div className="skeleton h-3 w-full rounded" />
          </div>
        ))
      ) : reviews.length === 0 ? (
        <div className="py-8 text-center">
          <BarChart2 size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No reviews yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Generate your first weekly review above</p>
        </div>
      ) : (
        reviews.slice(0, 5).map((r: any) => (
          <div key={r.id} className="rounded-2xl p-4 mb-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {r.weekStartDate ? format(new Date(r.weekStartDate), 'd MMM yyyy') : 'Weekly Review'}
                </span>
                {r.aiGenerated && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)22', color: 'var(--accent)' }}>AI</span>
                )}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {r.createdAt ? format(new Date(r.createdAt), 'd MMM') : ''}
              </span>
            </div>
            {/* Quick stats */}
            <div className="flex gap-3 mb-3">
              {r.tasksCompleted > 0 && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>✅ {r.tasksCompleted} tasks</span>}
              {r.workoutDays > 0 && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>🏋️ {r.workoutDays} days</span>}
              {r.moodAvg > 0 && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>😊 {r.moodAvg} mood</span>}
            </div>
            {r.aiSummary && (
              <p className="text-xs italic mb-2" style={{ color: 'var(--text-secondary)' }}>"{r.aiSummary}"</p>
            )}
            {r.aiPatternNoticed && (
              <div className="p-2 rounded-lg mb-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent)' }}>Pattern</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.aiPatternNoticed}</p>
              </div>
            )}
            {r.aiNextFocus && (
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--accent-green)11', border: '1px solid var(--accent-green)33' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent-green)' }}>Next Week</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.aiNextFocus}</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Life Page
// ─────────────────────────────────────────────
export default function Life() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get('tab') as LifeTab | null);
  const normalizedInitialTab: LifeTab = initialTab && ['Goals', 'Journal', 'Review'].includes(initialTab)
    ? initialTab
    : 'Goals';
  const [tab, setTab] = useState<LifeTab>(normalizedInitialTab);

  useEffect(() => {
    const queryTab = searchParams.get('tab') as LifeTab | null;
    if (queryTab && ['Goals', 'Journal', 'Review'].includes(queryTab) && queryTab !== tab) {
      setTab(queryTab);
    }
    if (!queryTab) {
      setSearchParams({ tab: 'Goals' }, { replace: true });
    }
  }, [searchParams, setSearchParams, tab]);

  const onChangeTab = (nextTab: LifeTab) => {
    setTab(nextTab);
    setSearchParams({ tab: nextTab }, { replace: true });
  };

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="px-4 mb-2 flex items-center gap-3">
        <button onClick={goBack} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }} aria-label="Go back">
          <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Life</h1>
      </div>

      <PillTabs
        tabs={['Goals', 'Journal', 'Review']}
        active={tab}
        onChange={t => onChangeTab(t as LifeTab)}
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
          {tab === 'Goals'   && <GoalsTab />}
          {tab === 'Journal' && <JournalTab />}
          {tab === 'Review'  && <ReviewTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
