import { ReactNode, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sun, Dumbbell, DollarSign, Settings, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';
import LogSheet from './LogSheet';

const NAV_TABS = [
  { path: '/',        label: 'Today',   icon: Sun },
  { path: '/body',    label: 'Body',    icon: Dumbbell },
  { path: '/finance', label: 'Finance', icon: DollarSign },
  { path: '/settings',label: 'Settings',icon: Settings },
];

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  const prefetchForPath = (path: string) => {
    if (!user) return;
    if (path === '/finance') {
      queryClient.prefetchQuery({ queryKey: ['expenses', user.id], queryFn: () => api.getExpenses(user.id), staleTime: 60_000 });
      queryClient.prefetchQuery({ queryKey: ['financeGmailStatus', user.id], queryFn: () => api.getFinanceGmailStatus(), staleTime: 30_000 });
      queryClient.prefetchQuery({ queryKey: ['financeBudgetProfile', new Date().getMonth() + 1, new Date().getFullYear()], queryFn: () => (api as any).getFinanceBudgetProfile(new Date().getMonth() + 1, new Date().getFullYear()), staleTime: 5 * 60_000 });
    }
    if (path === '/body') {
      queryClient.prefetchQuery({ queryKey: ['exercises'], queryFn: () => api.getExercises(), staleTime: 15 * 60_000 });
      queryClient.prefetchQuery({ queryKey: ['workoutPlanByDate', today], queryFn: () => api.getWorkoutPlanByDate(today), staleTime: 60_000 });
      queryClient.prefetchQuery({ queryKey: ['mealTemplates'], queryFn: () => api.getMealTemplates(), staleTime: 10 * 60_000 });
      queryClient.prefetchQuery({ queryKey: ['weeklyMealPlan'], queryFn: () => api.getWeeklyMealPlan(), staleTime: 5 * 60_000 });
    }
    if (path === '/settings') {
      queryClient.prefetchQuery({ queryKey: ['userSettings'], queryFn: () => api.getUserSettings(), staleTime: 5 * 60_000 });
      queryClient.prefetchQuery({ queryKey: ['vehicles'], queryFn: () => api.getVehicles(), staleTime: 5 * 60_000 });
    }
  };

  const prefetchQuickLog = () => {
    if (!user) return;
    queryClient.prefetchQuery({ queryKey: ['cards', user.id], queryFn: () => import('../lib/cardApi').then(m => m.default.getCards(user.id)), staleTime: 5 * 60_000 });
    queryClient.prefetchQuery({ queryKey: ['exercises'], queryFn: () => api.getExercises(), staleTime: 15 * 60_000 });
    queryClient.prefetchQuery({ queryKey: ['mealTemplates'], queryFn: () => api.getMealTemplates(), staleTime: 10 * 60_000 });
    queryClient.prefetchQuery({ queryKey: ['vehicles'], queryFn: () => api.getVehicles(), staleTime: 5 * 60_000 });
  };

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
        <div className="grid grid-cols-5 items-center h-16 px-1">
          {NAV_TABS.slice(0, 2).map(tab => {
            const Icon = tab.icon;
            const isActive = tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);
            return (
              <button
                key={tab.path}
                onPointerEnter={() => prefetchForPath(tab.path)}
                onFocus={() => prefetchForPath(tab.path)}
                onTouchStart={() => prefetchForPath(tab.path)}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center gap-1 py-2 press"
              >
                <Icon size={20} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                <span className="text-[10px] font-medium" style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          <div aria-hidden="true" className="w-full h-full" />

          {NAV_TABS.slice(2).map(tab => {
            const Icon = tab.icon;
            const isActive = tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);
            return (
              <button
                key={tab.path}
                onPointerEnter={() => prefetchForPath(tab.path)}
                onFocus={() => prefetchForPath(tab.path)}
                onTouchStart={() => prefetchForPath(tab.path)}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center gap-1 py-2 press"
              >
                <Icon size={20} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                <span className="text-[10px] font-medium" style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* Log button - floating above the nav items row */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-5 pointer-events-none">
            <button
              onPointerEnter={prefetchQuickLog}
              onFocus={prefetchQuickLog}
              onTouchStart={prefetchQuickLog}
              onClick={() => { prefetchQuickLog(); setLogOpen(true); }}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg press pointer-events-auto"
              style={{
                backgroundColor: 'var(--accent)',
                boxShadow: '0 10px 24px rgba(108, 99, 255, 0.4), 0 4px 8px rgba(0,0,0,0.2)',
              }}
            >
              <Plus size={24} color="#fff" strokeWidth={2.5} />
            </button>
          </div>
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
