import { ReactNode, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sun, Dumbbell, DollarSign, Sparkles, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContextApi';
import LogSheet from './LogSheet';

const NAV_TABS = [
  { path: '/',        label: 'Today',   icon: Sun },
  { path: '/body',    label: 'Body',    icon: Dumbbell },
  { path: '/finance', label: 'Finance', icon: DollarSign },
  { path: '/settings',label: 'Settings',icon: Sparkles },
];

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [logOpen, setLogOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <main className="page">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="bottom-nav">
        <div className="flex items-center justify-around h-16 px-2">
          {NAV_TABS.slice(0, 2).map(tab => {
            const Icon = tab.icon;
            const isActive = tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center gap-1 flex-1 py-2 press"
              >
                <Icon size={20} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                <span className="text-[10px] font-medium" style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          <div className="flex flex-col items-center flex-1">
            <button
              onClick={() => setLogOpen(true)}
              className="w-14 h-14 -mt-6 rounded-full flex items-center justify-center shadow-lg press"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Plus size={24} color="#fff" strokeWidth={2.5} />
            </button>
            <span className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>Log</span>
          </div>

          {NAV_TABS.slice(2).map(tab => {
            const Icon = tab.icon;
            const isActive = location.pathname.startsWith(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center gap-1 flex-1 py-2 press"
              >
                <Icon size={20} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                <span className="text-[10px] font-medium" style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <AnimatePresence>
        {logOpen && (
          <LogSheet onClose={() => setLogOpen(false)} userId={user?.id} />
        )}
      </AnimatePresence>
    </div>
  );
}
