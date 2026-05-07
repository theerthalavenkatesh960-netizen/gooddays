import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      <AnimatePresence>
        {count > 0 && <SkillTreeLoader key="loader" />}
      </AnimatePresence>
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}

// ─── Skill Tree Loader ────────────────────────────────────────────────────────

const NODES = [
  { id: 'discipline', label: 'Discipline', color: '#f59e0b', glow: 'rgba(245,158,11,0.6)',  x: 50,  y: 10  },
  { id: 'health',     label: 'Health',     color: '#10b981', glow: 'rgba(16,185,129,0.6)',  x: 15,  y: 45  },
  { id: 'focus',      label: 'Focus',      color: '#6366f1', glow: 'rgba(99,102,241,0.6)',  x: 85,  y: 45  },
  { id: 'mindset',    label: 'Mindset',    color: '#a855f7', glow: 'rgba(168,85,247,0.6)',  x: 25,  y: 82  },
  { id: 'wealth',     label: 'Wealth',     color: '#3b82f6', glow: 'rgba(59,130,246,0.6)',  x: 75,  y: 82  },
];

const EDGES = [
  [0, 1], [0, 2], [1, 3], [2, 4], [1, 4], [2, 3],
];

const MESSAGES = [
  'Building Discipline...',
  'Improving Focus...',
  'Strengthening Mindset...',
  'Compounding Progress...',
  'Leveling Up Your Life...',
];

function SkillTreeLoader() {
  const [unlocked, setUnlocked] = useState<number[]>([]);
  const [msgIndex, setMsgIndex] = useState(0);

  // Unlock nodes one by one, then loop
  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      step = (step + 1) % (NODES.length + 1);
      if (step === 0) {
        setUnlocked([]);
      } else {
        setUnlocked(Array.from({ length: step }, (_, i) => i));
      }
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Rotate messages every 2s
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const isEdgeActive = (a: number, b: number) =>
    unlocked.includes(a) && unlocked.includes(b);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(8px)' }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-6 px-4" style={{ maxWidth: 340, width: '100%' }}>

        {/* SVG Skill Tree */}
        <div style={{ width: '100%', maxWidth: 280, aspectRatio: '1 / 1' }}>
          <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: 'visible' }}>
            <defs>
              {NODES.map(node => (
                <filter key={node.id} id={`glow-${node.id}`} x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
            </defs>

            {/* Connection lines */}
            {EDGES.map(([a, b], i) => {
              const na = NODES[a], nb = NODES[b];
              const active = isEdgeActive(a, b);
              return (
                <motion.line
                  key={i}
                  x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                  stroke={active ? NODES[a].color : '#2a2a3a'}
                  strokeWidth={active ? 0.6 : 0.4}
                  strokeLinecap="round"
                  initial={{ opacity: 0.2 }}
                  animate={{
                    opacity: active ? [0.5, 1, 0.5] : 0.25,
                    strokeWidth: active ? [0.5, 0.8, 0.5] : 0.4,
                  }}
                  transition={active ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }}
                />
              );
            })}

            {/* Nodes */}
            {NODES.map((node, i) => {
              const active = unlocked.includes(i);
              return (
                <g key={node.id}>
                  {/* Outer glow ring */}
                  {active && (
                    <motion.circle
                      cx={node.x} cy={node.y} r={5}
                      fill="none"
                      stroke={node.color}
                      strokeWidth={0.4}
                      opacity={0.4}
                      animate={{ r: [5, 7, 5], opacity: [0.4, 0.1, 0.4] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}

                  {/* Node circle */}
                  <motion.circle
                    cx={node.x} cy={node.y} r={3.5}
                    fill={active ? node.color : '#1e1e2e'}
                    stroke={active ? node.color : '#3a3a5a'}
                    strokeWidth={0.6}
                    filter={active ? `url(#glow-${node.id})` : undefined}
                    initial={{ scale: 1, opacity: 0.3 }}
                    animate={active ? {
                      scale: [1, 1.15, 1],
                      opacity: [0.9, 1, 0.9],
                    } : { scale: 1, opacity: 0.3 }}
                    transition={active ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.5 }}
                    style={{ transformOrigin: `${node.x}px ${node.y}px`, transformBox: 'fill-box' }}
                  />

                  {/* Icon dot */}
                  <circle
                    cx={node.x} cy={node.y} r={1}
                    fill={active ? '#fff' : '#3a3a5a'}
                    opacity={active ? 0.9 : 0.3}
                  />

                  {/* Label */}
                  <motion.text
                    x={node.x} y={node.y + 7.5}
                    textAnchor="middle"
                    fontSize="3.5"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    letterSpacing="0.3"
                    fill={active ? node.color : '#4a4a6a'}
                    animate={{ opacity: active ? 1 : 0.35 }}
                    transition={{ duration: 0.5 }}
                    style={{ userSelect: 'none', textTransform: 'uppercase' }}
                  >
                    {node.label}
                  </motion.text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* App name */}
        <div style={{ textAlign: 'center' }}>
          <p style={{
            color: '#6b7280',
            fontSize: '10px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif',
            marginBottom: '8px',
          }}>
            GOOD DAYS OS
          </p>

          {/* Rotating message */}
          <div style={{ height: '20px', overflow: 'hidden', position: 'relative' }}>
            <AnimatePresence mode="wait">
              <motion.p
                key={msgIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                style={{
                  color: '#9ca3af',
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  fontFamily: 'system-ui, sans-serif',
                  textAlign: 'center',
                  position: 'absolute',
                  width: '100%',
                }}
              >
                {MESSAGES[msgIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          width: '120px',
          height: '2px',
          background: '#1e1e2e',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <motion.div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #6366f1, #a855f7, #3b82f6)',
              borderRadius: '4px',
            }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

      </div>
    </motion.div>
  );
}

