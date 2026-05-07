import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { setLoadingHandler } from '../lib/api';

interface LoadingContextType {
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  startLoading: () => {},
  stopLoading: () => {},
});

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  const startLoading = useCallback(() => {
    countRef.current += 1;
    setCount(countRef.current);
  }, []);

  const stopLoading = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    setCount(countRef.current);
  }, []);

  useEffect(() => {
    setLoadingHandler((active) => active ? startLoading() : stopLoading());
    return () => setLoadingHandler((_) => {});
  }, [startLoading, stopLoading]);

  return (
    <LoadingContext.Provider value={{ startLoading, stopLoading }}>
      {children}
      {count > 0 && <EmojiLoader />}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}

const EMOJIS = ['🏠', '💼', '📖', '👤', '💙', '💪', '✈️', '💰', '🛒', '👥', '🎬', '❤️', '🎵', '🎯', '✨', '🌟'];

function EmojiLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 max-w-xs w-full mx-4">
        {/* Orbiting emojis */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          {EMOJIS.slice(0, 8).map((emoji, i) => {
            const angle = (i / 8) * 360;
            const rad = (angle * Math.PI) / 180;
            const r = 40;
            const x = Math.cos(rad) * r;
            const y = Math.sin(rad) * r;
            return (
              <span
                key={i}
                className="absolute text-xl animate-spin"
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  animationDuration: `${2 + i * 0.15}s`,
                  animationDelay: `${i * 0.1}s`,
                  fontSize: '18px',
                  display: 'inline-block',
                  animation: `orbit-${i} 2s linear infinite`,
                }}
              >
                {emoji}
              </span>
            );
          })}
          {/* Center spinning emoji */}
          <span
            className="text-3xl"
            style={{
              display: 'inline-block',
              animation: 'spin 1.5s linear infinite',
            }}
          >
            ⭐
          </span>
        </div>

        {/* Bouncing emoji row */}
        <div className="flex gap-2">
          {EMOJIS.slice(8, 14).map((emoji, i) => (
            <span
              key={i}
              className="text-lg"
              style={{
                display: 'inline-block',
                animation: `bounce 0.8s ease-in-out infinite`,
                animationDelay: `${i * 0.12}s`,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>

        <p className="text-sm font-semibold text-gray-500 tracking-wide">Just a moment...</p>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    </div>
  );
}
