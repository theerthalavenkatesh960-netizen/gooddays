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
  const [resources, setResources] = useState<any[]>([]);
  const [newResourceName, setNewResourceName] = useState('');
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [newChapter, setNewChapter] = useState({ name: '', video_link: '' });
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

  useEffect(() => {
    if (selectedResource) {
      loadChapters(selectedResource);
    }
  }, [selectedResource]);

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

  const loadResources = async () => {
    if (!user) return;

    const data = await api.getStudySessions(user.id);
    if (data) {
      const unique = Array.from(new Set(data.map(d => d.subject)));
      setResources(unique.map((s, i) => ({ id: i.toString(), name: s })));
      if (unique.length > 0 && !selectedResource) {
        setSelectedResource('0');
      }
    }
  };

  const loadChapters = async (resourceId: string) => {
    if (!user) return;
    // Chapters are part of study sessions in API
  };

  const loadWeeklyMinutes = async () => {
    if (!user) return;

    const data = await api.getStudySessions(user.id);
    if (data) {
      const total = data.reduce((sum, s) => sum + s.durationMinutes, 0);
      setWeeklyMinutes(total);
    }
  };

  const loadStreak = async () => {
    if (!user) return;

    const data = await api.getStudySessions(user.id);

    if (data && data.length > 0) {
      let streak = 0;
      let currentDate = new Date();

      for (const session of data) {
        const sessionDate = new Date(session.date);
        const dayDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dayDiff === streak) {
          streak++;
          currentDate = sessionDate;
        } else {
          break;
        }
      }

      setStudyStreak(streak);
    }
  };

  const updateTodaySession = async () => {
    if (!user) return;

    await api.createStudySession(user.id, 'Study', todayMinutes, todayNotes, new Date());

    if (todayMinutes > 0) {
      await api.addPoints(user.id, 'study_session', 10);
    }
  };

  const addResource = async () => {
    if (!user || !newResourceName.trim()) return;

    setNewResourceName('');
    loadResources();
  };

  const addChapter = async () => {
    if (!user || !selectedResource || !newChapter.name.trim()) return;

    setNewChapter({ name: '', video_link: '' });
    loadChapters(selectedResource);
  };

  const updateChapterStatus = async (chapterId: string, status: string) => {
    // Chapter status would be updated via study sessions
    if (selectedResource) loadChapters(selectedResource);
  };

  const deleteResource = async (id: string) => {
    // Resource delete would be handled via API
    loadResources();
  };

  const deleteChapter = async (id: string) => {
    // Chapter delete would be handled via API
    if (selectedResource) loadChapters(selectedResource);
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
        Study Tracker
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-1">Today</h3>
          <div className="text-3xl font-bold text-blue-600">{todayMinutes} min</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-1">This Week</h3>
          <div className="text-3xl font-bold text-green-600">{weeklyMinutes} min</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-1">Streak</h3>
          <div className="text-3xl font-bold text-orange-600">{studyStreak} days</div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-xl mb-6"
      >
        <h2 className="text-xl font-bold mb-4">Today's Session</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minutes Studied</label>
            <input
              type="number"
              value={todayMinutes}
              onChange={(e) => setTodayMinutes(parseInt(e.target.value) || 0)}
              onBlur={updateTodaySession}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={todayNotes}
              onChange={(e) => setTodayNotes(e.target.value)}
              onBlur={updateTodaySession}
              className="w-full h-24 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none resize-none"
              placeholder="What did you study today?"
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-xl"
      >
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <BookOpen className="text-emerald-500" />
          Study Resources
        </h2>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newResourceName}
            onChange={(e) => setNewResourceName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addResource()}
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
