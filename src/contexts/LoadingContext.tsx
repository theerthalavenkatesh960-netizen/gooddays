import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { setLoadingHandler } from '../lib/api';
import { useTheme } from './ThemeContext';

// ─── Shared constants ─────────────────────────────────────────────────────────
const NODES = [
  { id: 'discipline', label: 'Discipline', color: '#f59e0b', x: 50,  y: 10  },
  { id: 'health',     label: 'Health',     color: '#10b981', x: 15,  y: 45  },
  { id: 'focus',      label: 'Focus',      color: '#6366f1', x: 85,  y: 45  },
  { id: 'mindset',    label: 'Mindset',    color: '#a855f7', x: 25,  y: 82  },
  { id: 'wealth',     label: 'Wealth',     color: '#3b82f6', x: 75,  y: 82  },
];
const EDGES = [[0,1],[0,2],[1,3],[2,4],[1,4],[2,3]];
const MESSAGES = [
  'Building Discipline...',
  'Improving Focus...',
  'Strengthening Mindset...',
  'Compounding Progress...',
  'Leveling Up Your Life...',
];

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
  // Show full-screen loader only on first mount (startup)
  const [startup, setStartup] = useState(true);

  useEffect(() => {
    // Hide startup loader after 3.5s (enough for one full animation loop)
    const t = setTimeout(() => setStartup(false), 3500);
    return () => clearTimeout(t);
  }, []);

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
        {startup && <SkillTreeLoader key="startup" />}
      </AnimatePresence>
      <AnimatePresence>
        {!startup && count > 0 && <MiniLoader key="mini" />}
      </AnimatePresence>
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}

// ─── Theme palette helper (shared by both loaders) ───────────────────────────
function useLoaderPalette() {
  const { theme } = useTheme();
  const palettes: Record<string, {
    bg: string; border: string; bar: string; text: string; subtext: string;
    emptyNode: string; emptyEdge: string; backdropColor: string;
  }> = {
    light:      { bg: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,0,0,0.08)', bar: 'linear-gradient(90deg,#10b981,#6366f1,#3b82f6)', text: '#374151',   subtext: '#6b7280', emptyNode: '#e5e7eb', emptyEdge: '#d1d5db', backdropColor: 'rgba(0,0,0,0.3)' },
    dark:       { bg: 'rgba(17,24,39,0.97)',    border: '1px solid rgba(255,255,255,0.1)', bar: 'linear-gradient(90deg,#6366f1,#a855f7,#3b82f6)',  text: '#e5e7eb',   subtext: '#9ca3af', emptyNode: '#374151', emptyEdge: '#4b5563', backdropColor: 'rgba(0,0,0,0.6)' },
    blue:       { bg: 'rgba(15,23,42,0.97)',    border: '1px solid rgba(96,165,250,0.3)', bar: 'linear-gradient(90deg,#3b82f6,#06b6d4,#60a5fa)',  text: '#bfdbfe',   subtext: '#93c5fd', emptyNode: '#1e3a5f', emptyEdge: '#2563eb', backdropColor: 'rgba(0,10,40,0.5)' },
    green:      { bg: 'rgba(2,44,34,0.97)',     border: '1px solid rgba(52,211,153,0.3)', bar: 'linear-gradient(90deg,#10b981,#34d399,#6ee7b7)',  text: '#d1fae5',   subtext: '#6ee7b7', emptyNode: '#064e3b', emptyEdge: '#065f46', backdropColor: 'rgba(0,20,10,0.5)' },
    ocean:      { bg: 'rgba(4,47,46,0.97)',     border: '1px solid rgba(20,184,166,0.3)', bar: 'linear-gradient(90deg,#0d9488,#06b6d4,#67e8f9)',  text: '#ccfbf1',   subtext: '#5eead4', emptyNode: '#134e4a', emptyEdge: '#0f766e', backdropColor: 'rgba(0,15,20,0.5)' },
    futuristic: { bg: 'rgba(10,10,15,0.97)',    border: '1px solid rgba(99,102,241,0.35)', bar: 'linear-gradient(90deg,#6366f1,#a855f7,#3b82f6)', text: '#c8d0e0',   subtext: '#6b7280', emptyNode: '#1e1e2e', emptyEdge: '#2a2a3a', backdropColor: 'rgba(0,0,0,0.7)' },
  };
  return palettes[theme] ?? palettes.futuristic;
}

// ─── Skill Tree Loader (full-screen startup) ─────────────────────────────────
function SkillTreeLoader() {
  const p = useLoaderPalette();
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
      style={{ background: p.backdropColor, backdropFilter: 'blur(8px)' }}
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
                  stroke={active ? NODES[a].color : p.emptyEdge}
                  strokeWidth={active ? 0.6 : 0.4}
                  strokeLinecap="round"
                  initial={{ opacity: 0.2, strokeWidth: active ? 0.6 : 0.4 }}
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
                      initial={{ r: 5, opacity: 0.4 }}
                      animate={{ r: [5, 7, 5], opacity: [0.4, 0.1, 0.4] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}

                  {/* Node circle */}
                  <motion.circle
                    cx={node.x} cy={node.y} r={3.5}
                    fill={active ? node.color : p.emptyNode}
                    stroke={active ? node.color : p.emptyEdge}
                    strokeWidth={0.6}
                    filter={active ? `url(#glow-${node.id})` : undefined}
                    initial={{ scale: 1, opacity: 0.3 }}
                    animate={active ? {
                      scale: [1, 1.15, 1],
                      opacity: [0.9, 1, 0.9],
                    } : { scale: 1, opacity: 0.3 }}
                    transition={active ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.5 }}
                    style={{ transformOrigin: `${node.x}px ${node.y}px`, transformBox: 'fill-box', overflow: 'visible' }}
                  />

                  {/* Icon dot */}
                  <circle
                    cx={node.x} cy={node.y} r={1}
                    fill={active ? '#fff' : p.emptyEdge}
                    opacity={active ? 0.9 : 0.3}
                  />

                  {/* Label */}
                  <motion.text
                    x={node.x} y={node.y + 7.5}
                    textAnchor="middle"
                    fontSize="3.5"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    letterSpacing="0.3"
                    fill={active ? node.color : p.emptyEdge}
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
            color: p.subtext,
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
                  color: p.text,
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
          background: p.emptyNode,
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <motion.div
            style={{
              height: '100%',
              background: p.bar,
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

// ─── Mini Loader (API calls, bottom-right corner) ─────────────────────────────
function MiniLoader() {
  const p = useLoaderPalette();
  const [unlocked, setUnlocked] = useState<number[]>([]);

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      step = (step + 1) % (NODES.length + 1);
      setUnlocked(step === 0 ? [] : Array.from({ length: step }, (_, i) => i));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const isEdgeActive = (a: number, b: number) =>
    unlocked.includes(a) && unlocked.includes(b);

  return (
    <>
      {/* Full page blur backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9997,
          background: p.backdropColor,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />
      {/* Centered loader card */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))',
        }}
      >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 22 }}
        style={{
          background: p.bg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: p.border,
          borderRadius: '20px',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
          minWidth: '160px',
          maxWidth: 'min(88vw, 320px)',
        }}
      >
        {/* Skill tree SVG */}
        <svg viewBox="0 0 100 100" width="80" height="80" style={{ overflow: 'visible' }}>
          <defs>
            {NODES.map(node => (
              <filter key={node.id} id={`mglow-${node.id}`} x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}
          </defs>
          {EDGES.map(([a, b], i) => {
            const na = NODES[a], nb = NODES[b];
            const active = isEdgeActive(a, b);
            return (
              <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke={active ? NODES[a].color : p.emptyEdge}
                strokeWidth={active ? 1.2 : 0.7} strokeLinecap="round"
                opacity={active ? 0.95 : 0.4}
              />
            );
          })}
          {NODES.map((node, i) => {
            const active = unlocked.includes(i);
            return (
              <g key={node.id}>
                <circle cx={node.x} cy={node.y} r={5}
                  fill={active ? node.color : p.emptyNode}
                  stroke={active ? node.color : p.emptyEdge}
                  strokeWidth={0.8}
                  filter={active ? `url(#mglow-${node.id})` : undefined}
                  opacity={active ? 1 : 0.4}
                />
              </g>
            );
          })}
        </svg>

        {/* Progress bar */}
        <div style={{ width: '100%' }}>
          <p style={{ color: p.text, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
            Loading...
          </p>
          <div style={{ width: '100%', height: '3px', background: p.emptyNode, borderRadius: '4px', overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', background: p.bar, borderRadius: '4px' }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </motion.div>
      </div>
    </>
  );
}

