import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import * as api from '../lib/api';

const MOODS = ['happy', 'grateful', 'motivated', 'tired', 'neutral'] as const;

export default function JournalEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const entryId = id ? Number(id) : null;
  const isEditMode = Number.isFinite(entryId) && entryId !== null;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState({
    title: '',
    body: '',
    moodTag: 'neutral',
    imageUrl: '',
  });

  useEffect(() => {
    async function loadEntry() {
      if (!isEditMode || !entryId) return;
      setLoading(true);
      try {
        const existing = await api.getJournalEntry(entryId);
        setEntry({
          title: existing?.title || '',
          body: existing?.body || '',
          moodTag: existing?.moodTag || 'neutral',
          imageUrl: existing?.imageUrl || '',
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadEntry();
  }, [isEditMode, entryId]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEntry((p) => ({ ...p, imageUrl: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }

  async function saveEntry() {
    if (!entry.title && !entry.body) return;
    setSaving(true);
    try {
      if (isEditMode && entryId) {
        await api.updateJournalEntry(entryId, entry);
      } else {
        await api.createJournalEntry({
          ...entry,
          date: new Date().toISOString(),
        });
      }
      navigate('/calendar');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-3 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/calendar')}
          className="mb-3 sm:mb-4 inline-flex items-center gap-2 text-emerald-700 font-semibold"
        >
          <ArrowLeft size={18} /> Back to Calendar
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{isEditMode ? 'Edit Journal Entry' : 'New Journal Entry'}</h1>
          <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">Use the full screen to write freely.</p>

          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading entry...</div>
          ) : (
          <div className="space-y-4">

            <input
              value={entry.title}
              onChange={(e) => setEntry((p) => ({ ...p, title: e.target.value }))}
              placeholder="Title"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />

            <textarea
              value={entry.body}
              onChange={(e) => setEntry((p) => ({ ...p, body: e.target.value }))}
              placeholder="Write your thoughts..."
              className="w-full min-h-[48vh] sm:min-h-[56vh] border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y"
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Mood:</span>
              {MOODS.map((mood) => (
                <button
                  key={mood}
                  onClick={() => setEntry((p) => ({ ...p, moodTag: mood }))}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    entry.moodTag === mood ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {mood === 'happy' ? '😊' : mood === 'grateful' ? '🙏' : mood === 'motivated' ? '💪' : mood === 'tired' ? '😴' : '😐'} {mood}
                </button>
              ))}
            </div>

            {entry.imageUrl && <img src={entry.imageUrl} alt="" className="w-full h-40 object-cover rounded-xl" />}

            <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-600 hover:border-emerald-400 cursor-pointer">
              <ImageIcon size={18} /> Add Photo
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={saveEntry}
              disabled={saving || (!entry.title && !entry.body)}
              className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditMode ? 'Update Entry' : 'Save Entry'}
            </motion.button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
