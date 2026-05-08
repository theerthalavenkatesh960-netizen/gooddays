import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Trash2, Search, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import * as api from '../lib/api';

export default function Journal() {
  const [entries, setEntries] = useState<any[]>([]);
  const [memoryWall, setMemoryWall] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'entries' | 'memory'>('entries');
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

  async function deleteEntry(id: number) {
    await api.deleteJournalEntry(id);
    setEntries(p => p.filter(e => e.id !== id));
  }

  function openEditor() {
    window.open('/journal/new', '_blank', 'noopener,noreferrer');
  }

  function openEditorForEntry(id: number) {
    window.open(`/journal/${id}/edit`, '_blank', 'noopener,noreferrer');
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
        <motion.button whileTap={{ scale: 0.95 }} onClick={openEditor}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold shadow-md">
          <Plus size={18} /> Write
        </motion.button>
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }}>
        {['entries', 'memory'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className="flex-1 px-4 py-2 rounded-xl font-medium text-sm transition-all"
            style={{ backgroundColor: activeTab === tab ? 'var(--accent)' : 'transparent', color: activeTab === tab ? '#fff' : 'var(--text-muted)' }}>
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
              <motion.button whileTap={{ scale: 0.95 }} onClick={openEditor}
                className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-xl font-semibold">
                <Plus size={18} /> Write Entry
              </motion.button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map(entry => (
                <motion.button key={entry.id} whileHover={{ y: -2 }}
                  onClick={() => openEditorForEntry(entry.id)}
                  className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                    <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                      className="text-gray-300 hover:text-red-400 mt-2">
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </motion.button>
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

    </div>
  );
}
