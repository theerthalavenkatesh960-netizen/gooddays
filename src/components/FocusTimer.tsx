import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Timer, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

export default function FocusTimer() {
  const { user } = useAuth();
  const [duration, setDuration] = useState(10);
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);

  useEffect(() => {
    loadSessions();
  }, [user]);

  useEffect(() => {
    setTimeLeft(duration * 60);
  }, [duration]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setShowPopup(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const loadSessions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) setSessions(data);
  };

  const handleStart = () => {
    if (!taskName.trim()) {
      alert('Please enter a task name');
      return;
    }
    setIsRunning(true);
    setStartTime(new Date());
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    setTimeLeft(duration * 60);
    setTaskName('');
    setStartTime(null);
  };

  const handleComplete = async () => {
    if (!user || !startTime) return;

    const endTime = new Date();
    const actualDuration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60);

    await supabase.from('focus_sessions').insert({
      user_id: user.id,
      task_name: taskName,
      duration: actualDuration,
      started_at: startTime.toISOString(),
      completed_at: endTime.toISOString(),
    });

    await supabase.rpc('add_points', { user_id: user.id, points_to_add: 5 });

    setShowPopup(false);
    handleStop();
    loadSessions();
  };

  const handleContinue = () => {
    setTimeLeft(10 * 60);
    setShowPopup(false);
    setStartTime(new Date());
    setIsRunning(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 border-b border-gray-200">
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="text-orange-600" size={20} />
          <h3 className="font-bold text-gray-800">Focus Timer</h3>
        </div>

        <input
          type="text"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="What are you working on?"
          disabled={isRunning}
          className="w-full px-3 py-2 rounded-lg border border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none mb-3 text-sm"
        />

        <div className="text-center mb-3">
          <div className="text-4xl font-bold text-orange-600 mb-2">
            {formatTime(timeLeft)}
          </div>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 10))}
            disabled={isRunning}
            className="w-20 px-2 py-1 rounded-lg border border-orange-200 text-center text-sm"
            min="1"
          />
          <span className="text-sm text-gray-600 ml-2">minutes</span>
        </div>

        <div className="flex gap-2">
          {!isRunning ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStart}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-semibold shadow-lg"
            >
              <Play size={18} />
              Start
            </motion.button>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePause}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-yellow-500 text-white rounded-lg font-semibold"
              >
                <Pause size={18} />
                Pause
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStop}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-lg font-semibold"
              >
                <Square size={18} />
                Stop
              </motion.button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={16} className="text-gray-500" />
          <h4 className="text-sm font-semibold text-gray-700">Recent Sessions</h4>
        </div>
        {sessions.map((session) => (
          <div
            key={session.id}
            className="bg-gray-50 rounded-lg p-2 text-xs"
          >
            <div className="font-medium text-gray-800">{session.task_name}</div>
            <div className="text-gray-600 flex items-center justify-between">
              <span>{session.duration} min</span>
              <span>{format(new Date(session.completed_at), 'MMM d, h:mm a')}</span>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Time's Up!</h2>
                <p className="text-gray-600">Great focus session!</p>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleComplete}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold"
                >
                  Mark Done
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  className="w-full py-3 bg-gray-100 text-gray-800 rounded-xl font-semibold"
                >
                  Continue 10 More
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowPopup(false);
                    handleStop();
                  }}
                  className="w-full py-3 text-gray-600 rounded-xl font-semibold"
                >
                  Stop
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
