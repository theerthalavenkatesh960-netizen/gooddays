import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronDown, ChevronUp, X, Check, ArrowLeft, Copy, GripVertical, BarChart2 } from 'lucide-react';
import BlockTemplateStatsModal from '../components/BlockTemplateStatsModal.tsx';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays, getDay } from 'date-fns';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as api from '../lib/api';
import WeeklyCalendar from '../components/WeeklyCalendar';

// ─── Types ─────────────────────────────────────────────────────────────────

interface RoutineBlock {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  category?: string;
  color?: string;
  sortOrder: number;
  linkedWorkoutPlanId?: number | null;
  linkedWorkoutLabel?: string | null;
  mealType?: string | null;
}

interface Routine {
  id: number;
  name: string;
  description?: string;
  color: string;
  blocks: RoutineBlock[];
}

interface BlockTemplate {
  id: number;
  title: string;
  category?: string | null;
  color?: string | null;
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
}

interface ScheduleEntry {
  dayOfWeek: number;
  routineId: number | null;
  routineName?: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const COLORS = ['#6C63FF', '#FF6584', '#43CBFF', '#F7971E', '#56AB2F', '#c471ed', '#12c2e9', '#f64f59'];

const MEAL_TYPES = ['Breakfast', 'Pre-Workout', 'Post-Workout', 'Lunch', 'Snack', 'Dinner', 'Evening Snack'] as const;

type WorkoutOption = {
  id: number;
  label: string;
};

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const normalized = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutesToTime(t: string, delta: number): string {
  return minutesToTime(parseTimeToMinutes(t) + delta);
}

// ─── Sortable block row wrapper ────────────────────────────────────────────

function SortableBlockRow({
  block,
  routineId,
  editing,
  todayWorkoutOptions,
  workoutLabelMap,
  templates,
  onEdit,
  onSaved,
  onCancelEdit,
  onDelete,
}: {
  block: RoutineBlock;
  routineId: number;
  editing: boolean;
  todayWorkoutOptions: WorkoutOption[];
  workoutLabelMap: Record<number, string>;
  templates: BlockTemplate[];
  onEdit: () => void;
  onSaved: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  if (editing) {
    return (
      <div ref={setNodeRef} style={style}>
        <BlockForm
          routineId={routineId}
          initial={block}
          todayWorkoutOptions={todayWorkoutOptions}
          templates={templates}
          onSave={onSaved}
          onCancel={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <div ref={setNodeRef}
      style={{ ...style, backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      {...attributes}>
      <button
        {...listeners}
        className="p-0.5 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
        style={{ color: 'var(--text-muted)' }}
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical size={14} />
      </button>
      <div className="text-center flex-shrink-0 w-14">
        <p className="text-[10px] num font-semibold" style={{ color: 'var(--text-muted)' }}>{block.startTime}</p>
        <div className="w-px h-2 mx-auto my-0.5" style={{ backgroundColor: 'var(--border)' }} />
        <p className="text-[10px] num" style={{ color: 'var(--text-muted)' }}>{block.endTime}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{block.title}</p>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {block.mealType && (
            <span
              className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
              style={{ backgroundColor: 'rgba(34,197,94,0.14)', color: 'var(--accent-green)', border: '1px solid rgba(34,197,94,0.28)' }}
            >
              🍽 {block.mealType}
            </span>
          )}
          {block.linkedWorkoutPlanId ? (
            <button
              type="button"
              onClick={() => navigate('/body?tab=Workout')}
              className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
              style={{ backgroundColor: 'rgba(108,99,255,0.16)', color: 'var(--accent)', border: '1px solid rgba(108,99,255,0.3)' }}
            >
              💪 {workoutLabelMap[block.linkedWorkoutPlanId] ?? block.linkedWorkoutLabel ?? 'Today Workout'}
            </button>
          ) : null}
        </div>
      </div>
      <button onClick={onEdit} className="p-1 press" style={{ color: 'var(--text-muted)' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button onClick={onDelete} className="p-1 press" style={{ color: '#ef4444' }}>
        <X size={12} />
      </button>
    </div>
  );
}

// ─── Block form ────────────────────────────────────────────────────────────

function BlockForm({
  routineId,
  initial,
  todayWorkoutOptions,
  templates,
  onSave,
  onCancel,
}: {
  routineId: number;
  initial?: Partial<RoutineBlock>;
  todayWorkoutOptions: WorkoutOption[];
  templates: BlockTemplate[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [startTime, setStartTime] = useState(initial?.startTime ?? '06:00');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '07:00');
  const [isMealBlock, setIsMealBlock] = useState(Boolean(initial?.mealType));
  const [mealType, setMealType] = useState<string>(initial?.mealType ?? '');
  const [linkedWorkoutPlanId, setLinkedWorkoutPlanId] = useState<number | null>(initial?.linkedWorkoutPlanId ?? null);
  const [saving, setSaving] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [statsTemplateId, setStatsTemplateId] = useState<number | null>(null);

  const workoutValue = linkedWorkoutPlanId != null ? String(linkedWorkoutPlanId) : '';

  function applyTemplate(tpl: BlockTemplate) {
    setTitle(tpl.title);
    if (tpl.defaultStartTime) setStartTime(tpl.defaultStartTime);
    if (tpl.defaultEndTime) setEndTime(tpl.defaultEndTime);
    setShowTemplatePicker(false);
  }

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title,
        startTime,
        endTime,
        mealType: isMealBlock && mealType ? mealType : null,
        linkedWorkoutPlanId,
      };
      if (initial?.id) {
        await (api as any).updateRoutineBlock(initial.id, payload);
      } else {
        await (api as any).addRoutineBlock(routineId, payload);
      }
      onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    {statsTemplateId !== null && (
      <BlockTemplateStatsModal templateId={statsTemplateId} onClose={() => setStatsTemplateId(null)} />
    )}
    <div className="rounded-xl p-3 space-y-2.5 mt-2" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
      {/* Template picker */}
      {!initial?.id && templates.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowTemplatePicker(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold press"
            style={{ backgroundColor: 'rgba(108,99,255,0.08)', color: 'var(--accent)', border: '1px solid rgba(108,99,255,0.25)' }}
          >
            <span>✨ Choose from saved blocks</span>
            {showTemplatePicker ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showTemplatePicker && (
            <div className="mt-1.5 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {templates.map(tpl => (
                <div key={tpl.id} className="flex items-center justify-between px-3 py-2"
                  style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
                  <button
                    type="button"
                    className="flex-1 text-left text-xs font-medium press"
                    style={{ color: 'var(--text-primary)' }}
                    onClick={() => applyTemplate(tpl)}
                  >
                    {tpl.color && (
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: tpl.color }} />
                    )}
                    {tpl.title}
                    {tpl.defaultStartTime && (
                      <span className="ml-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {tpl.defaultStartTime}–{tpl.defaultEndTime}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    title="View stats"
                    className="ml-2 p-1 press"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={() => setStatsTemplateId(tpl.id)}
                  >
                    <BarChart2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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

      {/* Meal block toggle */}
      <button
        type="button"
        onClick={() => { setIsMealBlock(m => !m); if (!isMealBlock) setMealType(''); }}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs press"
        style={{
          backgroundColor: isMealBlock ? 'rgba(34,197,94,0.10)' : 'var(--surface)',
          border: `1px solid ${isMealBlock ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
          color: isMealBlock ? 'var(--accent-green)' : 'var(--text-secondary)',
        }}
      >
        <div
          className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: isMealBlock ? 'rgba(34,197,94,0.8)' : 'transparent', border: `1.5px solid ${isMealBlock ? 'rgba(34,197,94,0.8)' : 'var(--border)'}` }}
        >
          {isMealBlock && <Check size={10} color="#fff" />}
        </div>
        <span className="font-semibold">This is a meal block</span>
      </button>

      {isMealBlock && (
        <div>
          <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Meal type</p>
          <div className="flex flex-wrap gap-1.5">
            {MEAL_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setMealType(type)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold press"
                style={{
                  backgroundColor: mealType === type ? 'rgba(34,197,94,0.16)' : 'var(--surface)',
                  color: mealType === type ? 'var(--accent-green)' : 'var(--text-secondary)',
                  border: mealType === type ? '1px solid rgba(34,197,94,0.4)' : '1px solid var(--border)',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Workout block */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Workout block (links to today's workout)</p>
        <select
          value={workoutValue}
          onChange={e => setLinkedWorkoutPlanId(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          <option value="">No workout link</option>
          {todayWorkoutOptions.map(opt => (
            <option key={`workout-${opt.id}`} value={opt.id}>{opt.label}</option>
          ))}
          {linkedWorkoutPlanId && !todayWorkoutOptions.some(opt => opt.id === linkedWorkoutPlanId) && (
            <option value={linkedWorkoutPlanId}>Workout Plan #{linkedWorkoutPlanId}</option>
          )}
        </select>
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
    </>
  );
}

// ─── Routine card ───────────────────────────────────────────────────────────

function RoutineCard({
  routine,
  todayWorkoutOptions,
  workoutLabelMap,
  templates,
  onRefresh,
}: {
  routine: Routine;
  todayWorkoutOptions: WorkoutOption[];
  workoutLabelMap: Record<number, string>;
  templates: BlockTemplate[];
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [editingBlock, setEditingBlock] = useState<number | null>(null);
  const [editingRoutine, setEditingRoutine] = useState(false);
  const [editName, setEditName] = useState(routine.name);
  const [editColor, setEditColor] = useState(routine.color);
  const [deleting, setDeleting] = useState(false);
  const [copying, setCopying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blocks, setBlocks] = useState<RoutineBlock[]>([]);

  // Keep local blocks in sync with prop
  useEffect(() => {
    setBlocks([...routine.blocks].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)));
  }, [routine.blocks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

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

  async function saveRoutine() {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await (api as any).updateDailyRoutine(routine.id, {
        name: editName.trim(),
        color: editColor,
      });
      setEditingRoutine(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  function cancelEditRoutine() {
    setEditName(routine.name);
    setEditColor(routine.color);
    setEditingRoutine(false);
  }

  async function copyRoutine() {
    setCopying(true);
    try {
      await (api as any).copyDailyRoutine(routine.id);
      onRefresh();
    } finally {
      setCopying(false);
    }
  }

  async function deleteBlock(id: number) {
    await (api as any).deleteRoutineBlock(id);
    onRefresh();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex(b => b.id === active.id);
    const newIndex = blocks.findIndex(b => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(blocks, oldIndex, newIndex);

    // Reflow times: preserve each block's duration, cascade from first block anchor
    const anchor = reordered[0];
    const reflowed: RoutineBlock[] = [];
    let cursor = parseTimeToMinutes(anchor.startTime);
    for (const block of reordered) {
      const origStart = parseTimeToMinutes(block.startTime);
      const origEnd = parseTimeToMinutes(block.endTime);
      const duration = Math.max(origEnd - origStart, 30); // guard: min 30 min
      const newStart = minutesToTime(cursor);
      const newEnd = minutesToTime(cursor + duration);
      reflowed.push({ ...block, startTime: newStart, endTime: newEnd });
      cursor += duration;
    }

    setBlocks(reflowed);

    // Persist all changed blocks
    await Promise.all(
      reflowed.map((block, idx) =>
        (api as any).updateRoutineBlock(block.id, {
          title: block.title,
          startTime: block.startTime,
          endTime: block.endTime,
          sortOrder: idx + 1,
          mealType: block.mealType ?? null,
          linkedWorkoutPlanId: block.linkedWorkoutPlanId ?? null,
        }),
      ),
    );
    onRefresh();
  }

  const defaultForNextBlock: Partial<RoutineBlock> = useMemo(() => {
    const prev = blocks[blocks.length - 1];
    if (!prev) return { startTime: '06:00', endTime: '06:30' };
    return { startTime: prev.endTime, endTime: addMinutesToTime(prev.endTime, 30) };
  }, [blocks]);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      {/* Header */}
      {editingRoutine ? (
        <div className="p-4 space-y-3" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Name</p>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Color</p>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setEditColor(c)}
                  className="w-7 h-7 rounded-full press flex items-center justify-center"
                  style={{ backgroundColor: c }}>
                  {editColor === c && <Check size={12} color="#fff" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={cancelEditRoutine} className="px-3 py-1.5 rounded-lg text-xs font-semibold press"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button onClick={saveRoutine} disabled={!editName.trim() || saving}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white press disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: routine.color }} />
          <p className="flex-1 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{routine.name}</p>
          <span className="text-xs mr-1" style={{ color: 'var(--text-muted)' }}>{routine.blocks.length} blocks</span>
          <button onClick={() => { setEditName(routine.name); setEditColor(routine.color); setEditingRoutine(true); }}
            className="p-1.5 rounded-lg press" style={{ color: 'var(--text-muted)' }}
            title="Edit routine">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button onClick={copyRoutine} disabled={copying}
            className="p-1.5 rounded-lg press" style={{ color: 'var(--text-muted)' }}
            title="Copy routine">
            <Copy size={14} />
          </button>
          <button onClick={deleteRoutine} disabled={deleting}
            className="p-1.5 rounded-lg press" style={{ color: '#ef4444' }}>
            <Trash2 size={14} />
          </button>
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg press" style={{ color: 'var(--text-muted)' }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      )}

      {/* Blocks */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-3 space-y-1.5">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map(block => (
                    <SortableBlockRow
                      key={block.id}
                      block={block}
                      routineId={routine.id}
                      editing={editingBlock === block.id}
                      todayWorkoutOptions={todayWorkoutOptions}
                      workoutLabelMap={workoutLabelMap}
                      templates={templates}
                      onEdit={() => setEditingBlock(block.id)}
                      onSaved={() => { setEditingBlock(null); onRefresh(); }}
                      onCancelEdit={() => setEditingBlock(null)}
                      onDelete={() => deleteBlock(block.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {addingBlock ? (
                <BlockForm
                  routineId={routine.id}
                  initial={defaultForNextBlock}
                  todayWorkoutOptions={todayWorkoutOptions}
                  templates={templates}
                  onSave={() => { setAddingBlock(false); onRefresh(); }}
                  onCancel={() => setAddingBlock(false)}
                />
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
  const [templates, setTemplates] = useState<BlockTemplate[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [todayWorkoutOptions, setTodayWorkoutOptions] = useState<WorkoutOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingRoutine, setCreatingRoutine] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [pickerDay, setPickerDay] = useState<number | null>(null);

  const workoutLabelMap = useMemo<Record<number, string>>(
    () => Object.fromEntries(todayWorkoutOptions.map(opt => [opt.id, opt.label])),
    [todayWorkoutOptions],
  );

  async function load() {
    setLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const [r, s, workoutPlan, tpls] = await Promise.all([
        (api as any).getDailyRoutines(),
        (api as any).getWeeklyRoutineSchedule(),
        api.getWorkoutPlanByDate(today),
        (api as any).getBlockTemplates(),
      ]);
      setRoutines(r);
      setTemplates(Array.isArray(tpls) ? tpls : []);

      if ((workoutPlan as any)?.id) {
        setTodayWorkoutOptions([
          {
            id: Number((workoutPlan as any).id),
            label: (workoutPlan as any).dayLabel ? `Today Workout - ${(workoutPlan as any).dayLabel}` : 'Today Workout',
          },
        ]);
      } else {
        setTodayWorkoutOptions([]);
      }

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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Routines</h2>
        <button onClick={() => setCreatingRoutine(c => !c)}
          className="p-2 rounded-xl press" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
          <Plus size={16} />
        </button>
      </div>

      {/* New routine form */}
      <AnimatePresence>
        {creatingRoutine && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-4 mb-3 space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Routine name (e.g. Weekday Hustle)" autoFocus
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Color</p>
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
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
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

      <div className="space-y-3 mb-6">
        {routines.length === 0 && !creatingRoutine && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No routines yet. Tap + to create one.</p>
        )}
        {routines.map(r => (
          <RoutineCard
            key={r.id}
            routine={r}
            todayWorkoutOptions={todayWorkoutOptions}
            workoutLabelMap={workoutLabelMap}
            templates={templates}
            onRefresh={load}
          />
        ))}
      </div>

      {/* ── Section 2: Weekly Schedule ── */}
      <div className="mb-4">
        <WeeklyCalendar
          selectedDate={addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), pickerDay ?? new Date().getDay())}
          onSelectDate={(date) => setPickerDay(getDay(date))}
          headerRight={
            <button onClick={saveSchedule} disabled={savingSchedule}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold press disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
              {savingSchedule ? 'Saving…' : 'Save'}
            </button>
          }
        />
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
