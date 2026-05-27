import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import * as api from '../lib/api';
import { RichTextEditor } from '../components/RichTextEditor';

const MOODS = ['happy', 'grateful', 'motivated', 'tired', 'neutral'] as const;

export default function JournalEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const entryId = id ? Number(id) : null;
  const isEditMode = Number.isFinite(entryId) && entryId !== null;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    setError('');
    try {
      if (isEditMode && entryId) {
        await api.updateJournalEntry(entryId, entry);
      } else {
        await api.createJournalEntry({
          ...entry,
          date: new Date().toISOString(),
        });
      }
      navigate('/settings/life', { state: { tab: 'Journal' } });
    } catch (e: any) {
      const message = e?.message || 'Unable to save journal entry';
      setError(message);
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen p-3 sm:p-6" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/settings/life', { state: { tab: 'Journal' } })}
          className="mb-3 sm:mb-4 inline-flex items-center gap-2 font-semibold"
          style={{ color: 'var(--accent)' }}
        >
          <ArrowLeft size={18} /> Back to Journal
        </button>

        <div className="rounded-2xl shadow-sm border p-4 sm:p-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{isEditMode ? 'Edit Journal Entry' : 'New Journal Entry'}</h1>
          <p className="text-sm sm:text-base mb-4 sm:mb-6" style={{ color: 'var(--text-muted)' }}>Use the full screen to write freely.</p>

          {loading ? (
            <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>Loading entry...</div>
          ) : (
          <div className="space-y-4">

            <input
              value={entry.title}
              onChange={(e) => setEntry((p) => ({ ...p, title: e.target.value }))}
              placeholder="Title"
              className="w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 border"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border)', '--tw-ring-color': 'var(--accent)' } as any}
            />

            <RichTextEditor
              value={entry.body}
              onChange={(content) => setEntry((p) => ({ ...p, body: content }))}
              placeholder="Write your thoughts..."
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Mood:</span>
              {MOODS.map((mood) => (
                <button
                  key={mood}
                  onClick={() => setEntry((p) => ({ ...p, moodTag: mood }))}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all`}
                  style={{
                    backgroundColor: entry.moodTag === mood ? 'var(--accent)' : 'var(--surface-elevated)',
                    color: entry.moodTag === mood ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  {mood === 'happy' ? '😊' : mood === 'grateful' ? '🙏' : mood === 'motivated' ? '💪' : mood === 'tired' ? '😴' : '😐'} {mood}
                </button>
              ))}
            </div>

            {entry.imageUrl && <img src={entry.imageUrl} alt="" className="w-full h-40 object-cover rounded-xl" />}

            <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')} onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <ImageIcon size={18} /> Add Photo
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={saveEntry}
              disabled={saving || (!entry.title && !entry.body)}
              className="w-full py-3 text-white rounded-xl font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {saving ? 'Saving...' : isEditMode ? 'Update Entry' : 'Save Entry'}
            </motion.button>

            {error && (
              <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
