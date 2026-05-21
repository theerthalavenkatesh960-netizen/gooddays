import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronDown, ChevronUp, X, Check, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays } from 'date-fns';
import * as api from '../lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────

interface RoutineBlock {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  category?: string;
  color?: string;
  sortOrder: number;
}

interface Routine {
  id: number;
  name: string;
  description?: string;
  color: string;
  blocks: RoutineBlock[];
}

interface ScheduleEntry {
  dayOfWeek: number;
  routineId: number | null;
  routineName?: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const COLORS = ['#6C63FF', '#FF6584', '#43CBFF', '#F7971E', '#56AB2F', '#c471ed', '#12c2e9', '#f64f59'];

// ─── Block form ────────────────────────────────────────────────────────────

function BlockForm({
  routineId,
  initial,
  onSave,
  onCancel,
}: {
  routineId: number;
  initial?: Partial<RoutineBlock>;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [startTime, setStartTime] = useState(initial?.startTime ?? '06:00');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '07:00');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (initial?.id) {
        await (api as any).updateRoutineBlock(initial.id, { title, startTime, endTime });
      } else {
        await (api as any).addRoutineBlock(routineId, { title, startTime, endTime });
      }
      onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl p-3 space-y-2.5 mt-2" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="e.g. Study DSA"
        autoFocus
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Start</p>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>End</p>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-semibold press"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          Cancel
        </button>
        <button onClick={submit} disabled={!title.trim() || saving}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white press disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent)' }}>
          {saving ? 'Saving…' : initial?.id ? 'Update' : 'Add Block'}
        </button>
      </div>
    </div>
  );
}

// ─── Routine card ───────────────────────────────────────────────────────────

function RoutineCard({
  routine,
  onRefresh,
}: {
  routine: Routine;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [editingBlock, setEditingBlock] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function deleteRoutine() {
    if (!confirm(`Delete "${routine.name}"?`)) return;
    setDeleting(true);
    try {
      await (api as any).deleteDailyRoutine(routine.id);
      onRefresh();
    } finally {
      setDeleting(false);
    }
  }

  async function deleteBlock(id: number) {
    await (api as any).deleteRoutineBlock(id);
    onRefresh();
  }

  const sorted = [...routine.blocks].sort((a, b) => {
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    return toMin(a.startTime) - toMin(b.startTime);
  });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: routine.color }} />
        <p className="flex-1 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{routine.name}</p>
        <span className="text-xs mr-1" style={{ color: 'var(--text-muted)' }}>{routine.blocks.length} blocks</span>
        <button onClick={deleteRoutine} disabled={deleting}
          className="p-1.5 rounded-lg press" style={{ color: '#ef4444' }}>
          <Trash2 size={14} />
        </button>
        <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg press" style={{ color: 'var(--text-muted)' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Blocks */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-3 space-y-1.5">
              {sorted.map(block => (
                <div key={block.id}>
                  {editingBlock === block.id ? (
                    <BlockForm routineId={routine.id} initial={block}
                      onSave={() => { setEditingBlock(null); onRefresh(); }}
                      onCancel={() => setEditingBlock(null)} />
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                      <div className="text-center flex-shrink-0 w-14">
                        <p className="text-[10px] num font-semibold" style={{ color: 'var(--text-muted)' }}>{block.startTime}</p>
                        <div className="w-px h-2 mx-auto my-0.5" style={{ backgroundColor: 'var(--border)' }} />
                        <p className="text-[10px] num" style={{ color: 'var(--text-muted)' }}>{block.endTime}</p>
                      </div>
                      <p className="flex-1 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{block.title}</p>
                      <button onClick={() => setEditingBlock(block.id)} className="p-1 press" style={{ color: 'var(--text-muted)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button onClick={() => deleteBlock(block.id)} className="p-1 press" style={{ color: '#ef4444' }}>
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {addingBlock ? (
                <BlockForm routineId={routine.id}
                  onSave={() => { setAddingBlock(false); onRefresh(); }}
                  onCancel={() => setAddingBlock(false)} />
              ) : (
                <button onClick={() => setAddingBlock(true)}
                  className="w-full py-2 rounded-xl text-xs font-semibold press flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
                  <Plus size={12} /> Add Block
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function RoutineManager() {
  const navigate = useNavigate();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingRoutine, setCreatingRoutine] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [pickerDay, setPickerDay] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        (api as any).getDailyRoutines(),
        (api as any).getWeeklyRoutineSchedule(),
      ]);
      setRoutines(r);
      // Ensure all 7 days are present
      const map: Record<number, ScheduleEntry> = {};
      (s as ScheduleEntry[]).forEach(e => { map[e.dayOfWeek] = e; });
      setSchedule(Array.from({ length: 7 }, (_, i) => map[i] ?? { dayOfWeek: i, routineId: null }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createRoutine() {
    if (!newName.trim()) return;
    await (api as any).createDailyRoutine({ name: newName.trim(), color: newColor });
    setNewName('');
    setNewColor(COLORS[0]);
    setCreatingRoutine(false);
    await load();
  }

  function assignRoutine(dayOfWeek: number, routineId: number | null) {
    setSchedule(s => s.map(e => e.dayOfWeek === dayOfWeek ? { ...e, routineId } : e));
    setPickerDay(null);
  }

  async function saveSchedule() {
    setSavingSchedule(true);
    try {
      await (api as any).updateWeeklyRoutineSchedule(schedule.map(e => ({ dayOfWeek: e.dayOfWeek, routineId: e.routineId })));
    } finally {
      setSavingSchedule(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 pt-4 pb-nav space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--surface)', height: 64 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-nav">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={17} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Routine Manager</h1>
      </div>

      {/* ── Section 1: Routines ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-3 sm:p-5 shadow-xl mb-3 sm:mb-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setCreatingRoutine(c => !c)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-500 text-white rounded-lg font-semibold text-xs sm:text-sm flex items-center gap-1.5">
              <Plus size={16} /> New Routine
            </button>
          </div>
        </div>

        <AnimatePresence>
          {creatingRoutine && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="rounded-xl p-4 mb-3 space-y-3" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Routine name (e.g. Weekday Hustle)" autoFocus
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
              <div>
                <p className="text-xs font-semibold mb-2 text-gray-500">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewColor(c)}
                      className="w-7 h-7 rounded-full press flex items-center justify-center"
                      style={{ backgroundColor: c }}>
                      {newColor === c && <Check size={12} color="#fff" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCreatingRoutine(false)} className="px-4 py-2 rounded-xl text-xs font-semibold press"
                  style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  Cancel
                </button>
                <button onClick={createRoutine} disabled={!newName.trim()}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white press disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  Create
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {routines.length === 0 && !creatingRoutine && (
            <p className="text-sm text-center py-6 text-gray-400">No routines yet. Tap New Routine to create one.</p>
          )}
          {routines.map(r => <RoutineCard key={r.id} routine={r} onRefresh={load} />)}
        </div>
      </motion.div>

      {/* ── Section 2: Weekly Schedule ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base sm:text-lg font-semibold">Weekly Schedule</h2>
          <button onClick={saveSchedule} disabled={savingSchedule}
            className="px-2.5 py-1 rounded-lg text-xs sm:text-sm bg-emerald-500 text-white font-semibold disabled:opacity-40">
            {savingSchedule ? 'Saving…' : 'Save'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-1.5 pb-1.5">
            {schedule.map(entry => {
              const isSelected = (pickerDay ?? new Date().getDay()) === entry.dayOfWeek;
              const d = addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), entry.dayOfWeek);
              return (
                <button
                  key={entry.dayOfWeek}
                  onClick={() => setPickerDay(entry.dayOfWeek)}
                  className={`flex-1 min-w-0 px-2 py-2 rounded-lg text-center border ${isSelected ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className="text-[11px] sm:text-xs">{format(d, 'EEE')}</div>
                  <div className="font-semibold text-sm sm:text-base">{format(d, 'd')}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {(() => {
        const activeDay = pickerDay ?? new Date().getDay();
        const activeEntry = schedule.find(e => e.dayOfWeek === activeDay) ?? { dayOfWeek: activeDay, routineId: null };
        const activeAssigned = routines.find(r => r.id === activeEntry.routineId);

        return (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{DAY_NAMES[activeDay]}</p>
              <div className="flex items-center gap-2">
                {activeAssigned && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeAssigned.color }} />}
                <p className="text-xs" style={{ color: activeAssigned ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {activeAssigned ? activeAssigned.name : 'Rest Day'}
                </p>
              </div>
            </div>

            <button onClick={() => assignRoutine(activeDay, null)} className="w-full flex items-center justify-between px-4 py-2.5 press" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Rest Day</p>
              {activeEntry.routineId === null && <Check size={14} style={{ color: 'var(--accent)' }} />}
            </button>

            {routines.map(r => (
              <button
                key={r.id}
                onClick={() => assignRoutine(activeDay, r.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 press"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                <p className="flex-1 text-sm text-left" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                {activeEntry.routineId === r.id && <Check size={14} style={{ color: 'var(--accent)' }} />}
              </button>
            ))}
          </motion.div>
        );
      })()}
    </div>
  );
}
