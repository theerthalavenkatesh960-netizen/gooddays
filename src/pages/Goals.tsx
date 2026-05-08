import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Trash2, X, Edit2, Save, BookOpen, Calendar, CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react';
import { format, addDays } from 'date-fns';
import * as api from '../lib/api';

export default function Goals() {
  const [goals, setGoals] = useState<any[]>([]);
  const [activeGoal, setActiveGoal] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('logs');
  const [showCreate, setShowCreate] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', category: '', color: '#10b981', icon: '🎯' });
  const [loading, setLoading] = useState(true);

  // Notes state
  const [notes, setNotes] = useState<any[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [newLogMinutes, setNewLogMinutes] = useState(0);
  const [logDate, setLogDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Flashcards state
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [newCard, setNewCard] = useState({ front: '', back: '' });

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    try {
      const data = await api.getGoals();
      setGoals(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadGoalDetails(goalId: number) {
    try {
      const [notesData, logsData, cardsData] = await Promise.all([
        api.getGoalNotes(goalId),
        api.getGoalLogs(goalId),
        api.getFlashcards(goalId),
      ]);
      setNotes(Array.isArray(notesData) ? notesData : []);
      setLogs(Array.isArray(logsData) ? logsData : []);
      setFlashcards(Array.isArray(cardsData) ? cardsData : []);
      
      // Load review queue for flashcards
      const queue = await api.getFlashcardReviewQueue(goalId);
      setReviewQueue(Array.isArray(queue) ? queue : []);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    } catch (e) { console.error(e); }
  }

  async function createGoal() {
    if (!newGoal.title) return;
    const goal = await api.createGoal(newGoal);
    setGoals(p => [...p, goal]);
    setNewGoal({ title: '', category: '', color: '#10b981', icon: '🎯' });
    setShowCreate(false);
  }

  async function deleteGoal(id: number) {
    await api.deleteGoal(id);
    setGoals(p => p.filter(g => g.id !== id));
    if (activeGoal?.id === id) setActiveGoal(null);
  }

  // Note handlers
  async function addNote() {
    if (!newNoteText || !activeGoal) return;
    const note = await api.createGoalNote(activeGoal.id, { content: newNoteText });
    setNotes(p => [...p, note]);
    setNewNoteText('');
    setShowAddNote(false);
  }

  async function updateNote(id: number, content: string) {
    await api.updateGoalNote(id, { content });
    setNotes(p => p.map(n => n.id === id ? { ...n, content } : n));
    setEditingNoteId(null);
  }

  async function deleteNote(id: number) {
    await api.deleteGoalNote(id);
    setNotes(p => p.filter(n => n.id !== id));
  }

  // Log handlers
  async function addLog() {
    if (!activeGoal || newLogMinutes <= 0) return;
    const log = await api.addGoalLog(activeGoal.id, { minutesSpent: newLogMinutes, date: logDate });
    setLogs(p => [...p, log]);
    setNewLogMinutes(0);
    setLogDate(format(new Date(), 'yyyy-MM-dd'));
  }

  async function deleteLog(id: number) {
    await api.updateGoalLog(id, { minutesSpent: -1 }); // Mark as deleted or call delete
    setLogs(p => p.filter(l => l.id !== id));
  }

  // Flashcard handlers
  async function addFlashcard() {
    if (!newCard.front || !newCard.back || !activeGoal) return;
    const card = await api.createFlashcard(activeGoal.id, newCard);
    setFlashcards(p => [...p, card]);
    setNewCard({ front: '', back: '' });
    setShowCardForm(false);
  }

  async function deleteFlashcard(id: number) {
    await api.deleteFlashcard(id);
    setFlashcards(p => p.filter(c => c.id !== id));
    setIsFlipped(false);
  }

  async function rateCard(confidence: number) {
    if (!reviewQueue[currentCardIndex] || !activeGoal) return;
    const card = reviewQueue[currentCardIndex];
    const nextReviewDate = calculateNextReview(confidence);
    await api.updateFlashcard(card.id, { confidenceLevel: confidence, nextReview: nextReviewDate });
    moveToNextCard();
  }

  function calculateNextReview(confidence: number): string {
    const days = confidence === 5 ? 30 : confidence === 4 ? 14 : confidence === 3 ? 7 : confidence === 2 ? 3 : 1;
    return format(addDays(new Date(), days), 'yyyy-MM-dd');
  }

  function moveToNextCard() {
    if (currentCardIndex < reviewQueue.length - 1) {
      setCurrentCardIndex(p => p + 1);
      setIsFlipped(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (activeGoal) {
    return (
      <div>
        <button onClick={() => setActiveGoal(null)} className="mb-4 flex items-center gap-2 text-indigo-600 font-semibold">
          ← Back
        </button>
        <div className="flex items-center gap-3 mb-4 sm:mb-6 bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <span className="text-3xl sm:text-4xl">{activeGoal.icon || '🎯'}</span>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{activeGoal.title}</h2>
            <p className="text-xs sm:text-sm text-gray-500">{activeGoal.category || 'General'} • {activeGoal.status || 'Active'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 sm:mb-6 p-1 rounded-2xl overflow-x-auto hide-scrollbar" style={{ backgroundColor: 'var(--surface)' }}>
          {['logs', 'notes', 'cards'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all"
              style={{ backgroundColor: activeTab === tab ? 'var(--accent)' : 'transparent', color: activeTab === tab ? '#fff' : 'var(--text-muted)' }}>
              {tab === 'notes' ? '📝 Notes' : tab === 'logs' ? '📊 Activity' : '🎴 Study'}
            </button>
          ))}
        </div>

        {/* Activity/Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-2xl p-3 sm:p-5 border border-gray-100 space-y-3">
              <h3 className="font-bold text-gray-900">Log Activity</h3>
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <input type="number" min="0" value={newLogMinutes} onChange={e => setNewLogMinutes(parseInt(e.target.value) || 0)} placeholder="Minutes"
                  className="w-full sm:w-28 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <motion.button whileTap={{ scale: 0.95 }} onClick={addLog} disabled={newLogMinutes <= 0}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold disabled:opacity-40">
                  Log
                </motion.button>
              </div>
            </motion.div>

            {logs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <Calendar size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 mt-2">No activity logged yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map(log => (
                  <motion.div key={log.id} whileHover={{ x: 4 }} className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{log.minutesSpent} minutes</p>
                      <p className="text-xs text-gray-500">{format(new Date(log.date), 'MMM d, yyyy')}</p>
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => deleteLog(log.id)} className="text-gray-300 hover:text-red-400">
                      <Trash2 size={16} />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddNote(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-all font-semibold text-sm">
              <Plus size={16} /> Add Note
            </motion.button>

            {notes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <BookOpen size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 mt-2">No notes yet — start documenting your progress</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map(note => (
                  <motion.div key={note.id} whileHover={{ y: -2 }} className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100">
                    {editingNoteId === note.id ? (
                      <div className="space-y-2">
                        <textarea value={editingNoteId === note.id ? newNoteText : note.content}
                          onChange={e => setNewNoteText(e.target.value)}
                          className="w-full h-24 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
                        <div className="flex gap-2">
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => updateNote(note.id, newNoteText)}
                            className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded-xl font-semibold">
                            Save
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditingNoteId(null)}
                            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl">
                            Cancel
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <p className="text-gray-700 flex-1 whitespace-pre-wrap">{note.content}</p>
                        <div className="flex gap-1">
                          <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setEditingNoteId(note.id); setNewNoteText(note.content); }}
                            className="text-gray-300 hover:text-blue-400">
                            <Edit2 size={16} />
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.9 }} onClick={() => deleteNote(note.id)}
                            className="text-gray-300 hover:text-red-400">
                            <Trash2 size={16} />
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            <AnimatePresence>
              {showAddNote && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                    className="bg-white rounded-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: 'min(90dvh, calc(100vh - 32px))' }}>
                    <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
                      <h2 className="text-xl font-bold text-gray-900">Add Note</h2>
                      <button onClick={() => setShowAddNote(false)}><X size={20} className="text-gray-400" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                      <textarea value={newNoteText} onChange={e => setNewNoteText(e.target.value)} placeholder="Write your note..."
                        className="w-full h-40 sm:h-48 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
                    </div>
                    <div className="p-4 sm:p-5 border-t border-gray-100 bg-white" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={addNote} disabled={!newNoteText}
                        className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold disabled:opacity-40">
                        Save Note
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Flashcards Tab */}
        {activeTab === 'cards' && (
          <div className="space-y-4">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCardForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-all font-semibold text-sm">
              <Plus size={16} /> New Card
            </motion.button>

            {reviewQueue.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-3 border border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-600">Study Session</p>
                  <p className="text-sm font-bold text-emerald-600">{currentCardIndex + 1} / {reviewQueue.length}</p>
                </div>

                {currentCardIndex < reviewQueue.length && (
                  <motion.div initial={{ rotateY: 0 }} animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.6 }}
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="h-48 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 cursor-pointer flex items-center justify-center text-white text-center hover:shadow-lg transition-shadow">
                    <div>
                      <p className="text-xs opacity-70 mb-2">{isFlipped ? 'Answer' : 'Question'}</p>
                      <p className="text-2xl font-semibold leading-relaxed">{isFlipped ? reviewQueue[currentCardIndex].back : reviewQueue[currentCardIndex].front}</p>
                    </div>
                  </motion.div>
                )}

                {currentCardIndex < reviewQueue.length && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 text-center">How confident are you?</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: '😰', value: 1, color: 'bg-red-500' },
                        { label: '😕', value: 2, color: 'bg-orange-500' },
                        { label: '😐', value: 3, color: 'bg-yellow-500' },
                        { label: '😊', value: 4, color: 'bg-teal-500' },
                        { label: '🔥', value: 5, color: 'bg-emerald-600' },
                      ].map(btn => (
                        <motion.button key={btn.value} whileTap={{ scale: 0.9 }}
                          onClick={() => rateCard(btn.value)}
                          className={`py-3 rounded-xl font-bold text-white transition-all ${btn.color}`}>
                          {btn.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {currentCardIndex >= reviewQueue.length && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
                    <p className="font-bold text-gray-900 mb-1">Session Complete! 🎉</p>
                    <p className="text-sm text-gray-500">Great work reviewing {reviewQueue.length} cards</p>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setCurrentCardIndex(0)}
                      className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold">
                      Start Over
                    </motion.button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {flashcards.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <Lightbulb size={40} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-400 mt-2">No flashcards yet — create some to practice</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {flashcards.map(card => (
                      <motion.div key={card.id} whileHover={{ y: -2 }} className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-500">Q:</p>
                              <p className="font-semibold text-gray-900">{card.front}</p>
                            </div>
                            <motion.button whileTap={{ scale: 0.9 }} onClick={() => deleteFlashcard(card.id)}
                              className="text-gray-300 hover:text-red-400">
                              <Trash2 size={16} />
                            </motion.button>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">A:</p>
                            <p className="text-gray-600">{card.back}</p>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${(card.confidenceLevel || 0) * 20}%` }} />
                            </div>
                            <span className="text-xs font-medium text-gray-500">{card.confidenceLevel || 0}/5</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <AnimatePresence>
              {showCardForm && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                    className="bg-white rounded-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: 'min(90dvh, calc(100vh - 32px))' }}>
                    <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
                      <h2 className="text-xl font-bold text-gray-900">New Flashcard</h2>
                      <button onClick={() => setShowCardForm(false)}><X size={20} className="text-gray-400" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Question</label>
                        <input value={newCard.front} onChange={e => setNewCard(p => ({ ...p, front: e.target.value }))} placeholder="What is...?"
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Answer</label>
                        <textarea value={newCard.back} onChange={e => setNewCard(p => ({ ...p, back: e.target.value }))} placeholder="The answer is..."
                          className="w-full h-20 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
                      </div>
                    </div>
                    <div className="p-4 sm:p-5 border-t border-gray-100 bg-white" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={addFlashcard} disabled={!newCard.front || !newCard.back}
                        className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold disabled:opacity-40">
                        Create Card
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Goals</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-0.5">Track learning & progress with notes, logs, and flashcards</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 sm:px-4 bg-emerald-500 text-white rounded-xl font-semibold text-sm sm:text-base shadow-md whitespace-nowrap">
          <Plus size={16} /> New Goal
        </motion.button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <Target size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No goals yet</h3>
          <p className="text-gray-400 mb-6">Create your first goal — DSA, fitness, language learning, etc.</p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-xl font-semibold">
            <Plus size={18} /> Create Goal
          </motion.button>
        </div>
      ) : (
        <div className="grid gap-3">
          {goals.map(goal => (
            <motion.button key={goal.id} whileHover={{ y: -2 }} onClick={() => { setActiveGoal(goal); loadGoalDetails(goal.id); }}
              className="text-left flex items-center gap-3 p-3 sm:p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <span className="text-2xl sm:text-3xl">{goal.icon || '🎯'}</span>
              <div className="flex-1">
                <p className="font-bold text-sm sm:text-base text-gray-900">{goal.title}</p>
                <p className="text-xs sm:text-sm text-gray-500">{goal.category || 'General'} • {goal.status || 'Active'}</p>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); deleteGoal(goal.id); }}
                className="text-gray-300 hover:text-red-400">
                <Trash2 size={18} />
              </motion.button>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md flex flex-col" style={{ maxHeight: 'min(90dvh, calc(100vh - 32px))' }}>
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">New Goal</h2>
                <button onClick={() => setShowCreate(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                <input value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} placeholder="Goal title (e.g. DSA Mastery)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <input value={newGoal.category} onChange={e => setNewGoal(p => ({ ...p, category: e.target.value }))} placeholder="Category (DSA, Fitness, etc.)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <input value={newGoal.icon} onChange={e => setNewGoal(p => ({ ...p, icon: e.target.value }))} placeholder="Icon emoji"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <input type="color" value={newGoal.color} onChange={e => setNewGoal(p => ({ ...p, color: e.target.value }))}
                  className="w-full h-10 rounded-xl cursor-pointer" />
              </div>
              <div className="p-4 sm:p-5 border-t border-gray-100 bg-white" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={createGoal} disabled={!newGoal.title}
                  className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold disabled:opacity-40">
                  Create Goal
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
