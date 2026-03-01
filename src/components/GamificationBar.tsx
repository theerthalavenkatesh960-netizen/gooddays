import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap } from 'lucide-react';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

const motivationalMessages = [
  "You're doing amazing",
  "You are unstoppable",
  "Great job today",
  "Keep going",
  "You can do better tomorrow",
  "Best streak yet",
  "Level up",
  "You are the best",
  "Stay consistent",
  "Legend mode activated",
  "Keep pushing",
];

export default function GamificationBar() {
  const { user } = useAuth();
  const [level, setLevel] = useState(1);
  const [points, setPoints] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
      // Real-time subscription would be set up here if needed
    }
  }, [user]);

  // whenever points change, show a motivational message
  useEffect(() => {
    if (points > 0) {
      showMotivationalMessage();
    }
  }, [points]);

  const loadProfile = async () => {
    if (!user) return;

    const data = await api.getUserPoints(user.id);
    if (data) {
      setPoints(data.totalPoints || 0);
      setLevel(Math.floor(data.totalPoints / 100) + 1);
    }
  };

  const showMotivationalMessage = () => {
    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    setMessage(randomMessage);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  };

  const getLevelThresholds = () => {
    const thresholds = [0, 100, 300, 700, 1500];
    const currentThreshold = thresholds[level - 1] || 0;
    const nextThreshold = thresholds[level] || 1500;
    return { currentThreshold, nextThreshold };
  };

  const { currentThreshold, nextThreshold } = getLevelThresholds();
  const progress = ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

  return (
    <>
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl p-4 shadow-xl mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <Trophy className="text-yellow-500" size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl">Level {level}</h3>
              <p className="text-white text-opacity-90 text-sm">{points} points</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="text-yellow-300" size={20} />
            <span className="text-white font-semibold">{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="bg-white bg-opacity-20 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="bg-white h-full rounded-full shadow-lg"
          />
        </div>

        <div className="flex justify-between text-xs text-white text-opacity-80 mt-2">
          <span>{currentThreshold} pts</span>
          <span>{nextThreshold} pts</span>
        </div>
      </motion.div>

      <AnimatePresence>
        {showMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-lg">
              {message} 🔥
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
