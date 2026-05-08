import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, DollarSign, Dumbbell, UtensilsCrossed, Fuel,
  CheckSquare, BookOpen, MessageSquare, Scale,
  ChevronLeft, Check, Droplets, Plus
} from 'lucide-react';
import * as api from '../lib/api';
import { format } from 'date-fns';

interface LogSheetProps {
  onClose: () => void;
  userId?: number;
}

type SubSheet = 'expense' | 'workout' | 'meal' | 'refill' | 'task' | 'journal' | 'note' | 'weight' | 'water' | null;

const QUICK_OPTIONS = [
  { id: 'expense',  label: 'Expense',    icon: DollarSign,      color: '#FF6B6B' },
  { id: 'workout',  label: 'Workout',    icon: Dumbbell,        color: '#4ECDC4' },
  { id: 'meal',     label: 'Meal',       icon: UtensilsCrossed, color: '#FFD93D' },
  { id: 'water',    label: 'Water',      icon: Droplets,        color: '#06B6D4' },
  { id: 'refill',   label: 'Car Refill', icon: Fuel,            color: '#6C63FF' },
  { id: 'task',     label: 'Task',       icon: CheckSquare,     color: '#4ECDC4' },
  { id: 'journal',  label: 'Journal',    icon: BookOpen,        color: '#FF6B6B' },
  { id: 'note',     label: 'Quick Note', icon: MessageSquare,   color: '#8888A0' },
  { id: 'weight',   label: 'Body Weight',icon: Scale,           color: '#FFD93D' },
] as const;

const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Shopping', 'Entertainment', 'Health',
  'Utilities', 'Education', 'Rent', 'Fuel', 'Other'
];

export default function LogSheet({ onClose, userId }: LogSheetProps) {
  const [sub, setSub] = useState<SubSheet>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Expense state
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Food');
  const [expenseNote, setExpenseNote] = useState('');

  // Workout state
  const [workoutName, setWorkoutName] = useState('');
  const [workoutMins, setWorkoutMins] = useState('');

  // Meal state
  const [mealName, setMealName] = useState('');
  const [mealCals, setMealCals] = useState('');
  const [mealProtein, setMealProtein] = useState('');

  // Refill state
  const [refillLitres, setRefillLitres] = useState('');
  const [refillAmount, setRefillAmount] = useState('');
  const [refillOdometer, setRefillOdometer] = useState('');

  // Task state
  const [taskTitle, setTaskTitle] = useState('');

  // Journal state
  const [journalTitle, setJournalTitle] = useState('');
  const [journalBody, setJournalBody] = useState('');

  // Note state
  const [noteText, setNoteText] = useState('');

  // Weight state
  const [weight, setWeight] = useState('');

  // Water state
  const [waterMl, setWaterMl] = useState(250);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (sub === 'expense' && expenseAmount && userId) {
        await api.createExpense(
          userId,
          expenseNote || expenseCategory,
          parseFloat(expenseAmount),
          expenseCategory,
          new Date(),
        );
      } else if (sub === 'task' && taskTitle && userId) {
        await api.createTask({
          userId,
          title: taskTitle,
          category: 'Personal',
          priority: 'medium',
          dueDate: new Date(),
          recurring: false,
        });
      } else if (sub === 'weight' && weight && userId) {
        const today = format(new Date(), 'yyyy-MM-dd');
        await api.saveDailyTracking(userId, today, 0, 0, 0, false, 3, '', 0, 8);
      } else if (sub === 'water' && waterMl > 0 && userId) {
        const today = format(new Date(), 'yyyy-MM-dd');
        await (api as any).logQuickEntry('water', { ml: waterMl }, today);
      }
      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const sheetVariants = {
    hidden: { y: '100%' },
    visible: { y: 0, transition: { type: 'spring' as const, damping: 30, stiffness: 300 } },
    exit: { y: '100%', transition: { duration: 0.2 } },
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ maxWidth: 390, margin: '0 auto', left: 0, right: 0 }}>
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={onClose}
      />

      <motion.div
        className="relative sheet max-h-[92dvh] overflow-y-auto scrollbar-none"
        variants={sheetVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="sheet-handle" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          {sub ? (
            <button onClick={() => setSub(null)} className="flex items-center gap-1 press" style={{ color: 'var(--accent)' }}>
              <ChevronLeft size={18} />
              <span className="text-sm font-medium">Back</span>
            </button>
          ) : (
            <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Quick Log</span>
          )}
          <button onClick={onClose} className="press p-1">
            <X size={20} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!sub ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-3 gap-3 px-4 pb-8 pt-2"
            >
              {QUICK_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSub(opt.id as SubSheet)}
                    className="flex flex-col items-center gap-3 p-4 rounded-2xl press"
                    style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: opt.color + '22' }}>
                      <Icon size={22} style={{ color: opt.color }} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{opt.label}</span>
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key={sub}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="px-4 pb-6 pt-2"
            >
              {sub === 'expense' && (
                <div className="space-y-4">
                  <div>
                    <label className="section-label mb-2 block">Amount</label>
                    <div className="flex items-center gap-2 p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                      <span className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>₹</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={expenseAmount}
                        onChange={e => setExpenseAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-transparent text-3xl font-bold num outline-none"
                        style={{ color: 'var(--text-primary)' }}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div>
                    <label className="section-label mb-2 block">Category</label>
                    <div className="h-scroll pb-1">
                      {EXPENSE_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setExpenseCategory(cat)}
                          className={`pill-tab ${expenseCategory === cat ? 'pill-tab-active' : 'pill-tab-inactive'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="section-label mb-2 block">Note (optional)</label>
                    <input
                      type="text"
                      value={expenseNote}
                      onChange={e => setExpenseNote(e.target.value)}
                      placeholder="What was it for?"
                      className="w-full p-3 rounded-xl outline-none text-sm"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              )}

              {sub === 'workout' && (
                <div className="space-y-4">
                  <div>
                    <label className="section-label mb-2 block">Workout Name</label>
                    <input
                      type="text"
                      value={workoutName}
                      onChange={e => setWorkoutName(e.target.value)}
                      placeholder="e.g. Push Day"
                      className="w-full p-4 rounded-2xl outline-none text-lg font-semibold"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="section-label mb-2 block">Duration (minutes)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={workoutMins}
                      onChange={e => setWorkoutMins(e.target.value)}
                      placeholder="60"
                      className="w-full p-4 rounded-2xl outline-none text-3xl font-bold num"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              )}

              {sub === 'meal' && (
                <div className="space-y-4">
                  <div>
                    <label className="section-label mb-2 block">Meal Name</label>
                    <input
                      type="text"
                      value={mealName}
                      onChange={e => setMealName(e.target.value)}
                      placeholder="e.g. Chicken & Rice"
                      className="w-full p-4 rounded-2xl outline-none text-lg font-semibold"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="section-label mb-2 block">Calories</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={mealCals}
                      onChange={e => setMealCals(e.target.value)}
                      placeholder="500"
                      className="w-full p-4 rounded-2xl outline-none text-3xl font-bold num"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="section-label mb-2 block">Protein (g, optional)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={mealProtein}
                      onChange={e => setMealProtein(e.target.value)}
                      placeholder="40"
                      className="w-full p-3 rounded-xl outline-none text-sm num"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              )}

              {sub === 'refill' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="section-label mb-2 block">Litres</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={refillLitres}
                        onChange={e => setRefillLitres(e.target.value)}
                        placeholder="30.5"
                        className="w-full p-3 rounded-xl outline-none text-xl font-bold num"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="section-label mb-2 block">Amount (₹)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={refillAmount}
                        onChange={e => setRefillAmount(e.target.value)}
                        placeholder="2800"
                        className="w-full p-3 rounded-xl outline-none text-xl font-bold num"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="section-label mb-2 block">Odometer (km)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={refillOdometer}
                      onChange={e => setRefillOdometer(e.target.value)}
                      placeholder="12500"
                      className="w-full p-3 rounded-xl outline-none text-xl font-bold num"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  {refillLitres && refillAmount && (
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cost per litre</p>
                      <p className="text-lg font-bold num" style={{ color: 'var(--accent-gold)' }}>
                        ₹{(parseFloat(refillAmount) / parseFloat(refillLitres)).toFixed(2)}/L
                      </p>
                    </div>
                  )}
                </div>
              )}

              {sub === 'task' && (
                <div className="space-y-4">
                  <div>
                    <label className="section-label mb-2 block">Task</label>
                    <textarea
                      value={taskTitle}
                      onChange={e => setTaskTitle(e.target.value)}
                      placeholder="What needs to get done?"
                      rows={3}
                      className="w-full p-4 rounded-2xl outline-none text-base resize-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {sub === 'journal' && (
                <div className="space-y-4">
                  <div>
                    <label className="section-label mb-2 block">Title</label>
                    <input
                      type="text"
                      value={journalTitle}
                      onChange={e => setJournalTitle(e.target.value)}
                      placeholder="Today's entry"
                      className="w-full p-4 rounded-2xl outline-none text-lg font-semibold"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="section-label mb-2 block">Note</label>
                    <textarea
                      value={journalBody}
                      onChange={e => setJournalBody(e.target.value)}
                      placeholder="What's on your mind?"
                      rows={5}
                      className="w-full p-4 rounded-2xl outline-none text-sm resize-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              )}

              {sub === 'note' && (
                <div className="space-y-4">
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Quick note..."
                    rows={6}
                    className="w-full p-4 rounded-2xl outline-none text-base resize-none"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    autoFocus
                  />
                </div>
              )}

              {sub === 'water' && (
                <div className="space-y-4">
                  <label className="section-label mb-2 block">Water amount</label>
                  <div className="flex items-end gap-2 p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={waterMl}
                      onChange={e => setWaterMl(Math.max(1, Number(e.target.value)))}
                      className="flex-1 bg-transparent text-4xl font-bold num outline-none"
                      style={{ color: 'var(--accent)' }}
                      autoFocus
                    />
                    <span className="text-xl font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>ml</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[100, 250, 500, 1000].map(ml => (
                      <button key={ml} onClick={() => setWaterMl(ml)}
                        className="py-2 rounded-xl text-xs font-bold transition-all"
                        style={{ backgroundColor: waterMl === ml ? 'var(--accent)' : 'var(--surface-elevated)', color: waterMl === ml ? '#fff' : 'var(--text-primary)' }}>
                        {ml >= 1000 ? '1L' : `${ml}ml`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sub === 'weight' && (
                <div className="space-y-4">
                  <div>
                    <label className="section-label mb-2 block">Body Weight</label>
                    <div className="flex items-end gap-2 p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                        placeholder="72.5"
                        className="flex-1 bg-transparent text-4xl font-bold num outline-none"
                        style={{ color: 'var(--text-primary)' }}
                        autoFocus
                      />
                      <span className="text-xl font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>kg</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="w-full h-12 rounded-2xl mt-6 font-semibold text-white press flex items-center justify-center gap-2 transition-all"
                style={{ backgroundColor: saved ? 'var(--accent-green)' : 'var(--accent)' }}
              >
                {saved ? (
                  <>
                    <Check size={18} />
                    Saved!
                  </>
                ) : saving ? (
                  'Saving...'
                ) : (
                  'Save'
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
