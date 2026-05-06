import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Trash2, X, Search, Image as ImageIcon, SmilePlus, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import * as api from '../lib/api';

export default function Journal() {
  const [entries, setEntries] = useState<any[]>([]);
  const [memoryWall, setMemoryWall] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'entries' | 'memory'>('entries');
  const [showCreate, setShowCreate] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: '', body: '', moodTag: 'neutral', imageUrl: '' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    try {
      const [entriesData, wallData] = await Promise.all([api.getJournalEntries(), api.getMemoryWall()]);
      setEntries(Array.isArray(entriesData) ? entriesData : []);
      setMemoryWall(Array.isArray(wallData) ? wallData : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function createEntry() {
    if (!newEntry.title && !newEntry.body) return;
    const entry = await api.createJournalEntry({
      ...newEntry,
      date: new Date().toISOString(),
    });
    setEntries(p => [entry, ...p]);
    setNewEntry({ title: '', body: '', moodTag: 'neutral', imageUrl: '' });
    setShowCreate(false);
  }

  async function deleteEntry(id: number) {
    await api.deleteJournalEntry(id);
    setEntries(p => p.filter(e => e.id !== id));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNewEntry(p => ({ ...p, imageUrl: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }

  const filteredEntries = entries.filter(e =>
    e.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.body?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Journal</h1>
          <p className="text-gray-500 mt-0.5">Reflect, document & track your journey</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold shadow-md">
          <Plus size={18} /> Write
        </motion.button>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-2xl">
        {['entries', 'memory'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${activeTab === tab ? 'bg-white text-emerald-700 shadow-md' : 'text-gray-500'}`}>
            {tab === 'entries' ? '📔 Entries' : '🖼️ Memory Wall'}
          </button>
        ))}
      </div>

      {activeTab === 'entries' && (
        <div className="space-y-4">
          {entries.length > 0 && (
            <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-gray-200">
              <Search size={16} className="text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries..."
                className="flex-1 bg-transparent outline-none text-sm" />
            </div>
          )}

          {filteredEntries.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No entries yet</h3>
              <p className="text-gray-400 mb-6">Start your journal — capture moments, thoughts & progress</p>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-xl font-semibold">
                <Plus size={18} /> Write Entry
              </motion.button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map(entry => (
                <motion.div key={entry.id} whileHover={{ y: -2 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {entry.imageUrl && (
                    <img src={entry.imageUrl} alt="" className="w-full h-32 object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{entry.title}</p>
                        <p className="text-xs text-gray-400">{format(new Date(entry.date), 'MMM d, yyyy')}</p>
                      </div>
                      {entry.moodTag && <span className="text-2xl">{entry.moodTag === 'happy' ? '😊' : entry.moodTag === 'grateful' ? '🙏' : entry.moodTag === 'motivated' ? '💪' : entry.moodTag === 'tired' ? '😴' : '😐'}</span>}
                    </div>
                    {entry.body && <p className="text-sm text-gray-600 line-clamp-2 mt-2">{entry.body}</p>}
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => deleteEntry(entry.id)}
                      className="text-gray-300 hover:text-red-400 mt-2">
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'memory' && (
        <div>
          {memoryWall.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Memory Wall Empty</h3>
              <p className="text-gray-400">Add photos to your journal entries to see them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {memoryWall.map(entry => (
                <motion.div key={entry.id} whileHover={{ scale: 1.05 }} className="relative group h-48 rounded-2xl overflow-hidden">
                  <img src={entry.imageUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end p-3">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="font-bold text-sm">{entry.title}</p>
                      <p className="text-xs">{format(new Date(entry.date), 'MMM d')}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">New Entry</h2>
                <button onClick={() => setShowCreate(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <input value={newEntry.title} onChange={e => setNewEntry(p => ({ ...p, title: e.target.value }))} placeholder="Title"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <textarea value={newEntry.body} onChange={e => setNewEntry(p => ({ ...p, body: e.target.value }))} placeholder="Write your thoughts..."
                  className="w-full h-32 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Mood:</span>
                  {['happy', 'grateful', 'motivated', 'tired', 'neutral'].map(mood => (
                    <button key={mood} onClick={() => setNewEntry(p => ({ ...p, moodTag: mood }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${newEntry.moodTag === mood ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {mood === 'happy' ? '😊' : mood === 'grateful' ? '🙏' : mood === 'motivated' ? '💪' : mood === 'tired' ? '😴' : '😐'} {mood}
                    </button>
                  ))}
                </div>
                {newEntry.imageUrl && (
                  <img src={newEntry.imageUrl} alt="" className="w-full h-32 object-cover rounded-xl" />
                )}
                <label className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-600 hover:border-emerald-400 cursor-pointer">
                  <ImageIcon size={18} /> Add Photo
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
              <div className="p-5 border-t border-gray-100">
                <motion.button whileTap={{ scale: 0.95 }} onClick={createEntry}
                  className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold">
                  Save Entry
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
