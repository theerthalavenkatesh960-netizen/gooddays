import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, BookOpen, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

export default function Study() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [todayMinutes, setTodayMinutes] = useState(0);
  const [todayNotes, setTodayNotes] = useState('');
  // resource and chapter management has been moved to server-side templates
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [studyStreak, setStudyStreak] = useState(0);

  useEffect(() => {
    if (user) {
      loadTodaySession();
      loadResources();
      loadWeeklyMinutes();
      loadStreak();
    }
  }, [user]);

  // no longer using selected resource or chapters

  const loadTodaySession = async () => {
    if (!user) return;

    const data = await api.getStudySessions(user.id);
    if (data && data.length > 0) {
      const todaySession = data.find(s => format(new Date(s.date), 'yyyy-MM-dd') === today);
      if (todaySession) {
        setTodayMinutes(todaySession.durationMinutes);
        setTodayNotes(todaySession.notes || '');
      }
    }
  };

  // resources no longer derived from sessions


      {/* resource/chapter UI removed; study sessions now simple logs so
          most of the previous interface is no longer needed. */}
            placeholder="Add new resource..."
            className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={addResource}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold"
          >
            <Plus size={20} />
          </motion.button>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto">
          {resources.map((resource) => (
            <button
              key={resource.id}
              onClick={() => setSelectedResource(resource.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                selectedResource === resource.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {resource.name}
            </button>
          ))}
        </div>

        {selectedResource && (
          <>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newChapter.name}
                onChange={(e) => setNewChapter({ ...newChapter, name: e.target.value })}
                placeholder="Chapter name..."
                className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
              />
              <input
                type="url"
                value={newChapter.video_link}
                onChange={(e) => setNewChapter({ ...newChapter, video_link: e.target.value })}
                placeholder="Video link (optional)..."
                className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={addChapter}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold"
              >
                <Plus size={20} />
              </motion.button>
            </div>

            <div className="space-y-2">
              {chapters.map((chapter) => (
                <div key={chapter.id} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <select
                      value={chapter.status}
                      onChange={(e) => updateChapterStatus(chapter.id, e.target.value)}
                      className={`px-3 py-1 rounded-lg border-2 text-sm font-medium ${
                        chapter.status === 'done'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : chapter.status === 'in_progress'
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                    <div>
                      <div className="font-medium text-gray-800">{chapter.name}</div>
                      {chapter.video_link && (
                        <a
                          href={chapter.video_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View Video
                        </a>
                      )}
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => deleteChapter(chapter.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </motion.button>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
