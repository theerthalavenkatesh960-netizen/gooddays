import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  GraduationCap,
  Activity,
  DollarSign,
  Heart,
  Calendar,
  Settings,
  LogOut,
  Timer,
  Play,
  Pause,
  Square,
  Menu,
  X
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContextApi';
import FocusTimer from './FocusTimer';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/thesis', label: 'Thesis', icon: BookOpen },
  { path: '/expenses', label: 'Expenses', icon: DollarSign },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <div className="hidden md:flex h-screen">
        <motion.aside
          initial={{ width: 288 }}
          animate={{ width: sidebarOpen ? 288 : 80 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="bg-white border-r border-gray-200 flex flex-col shadow-xl overflow-hidden"
        >
          <div className={`${sidebarOpen ? 'p-6' : 'p-4'} border-b border-gray-200`}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center"
              title="Toggle sidebar"
            >
              <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center flex-shrink-0 hover:shadow-lg transition-shadow">
                  <span className="text-2xl cursor-pointer">✨</span>
                </div>
                {sidebarOpen && (
                  <div className="text-left">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      GoodDays
                    </h1>
                    <p className="text-xs text-gray-500">Level up daily</p>
                  </div>
                )}
              </div>
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setTimerOpen(!timerOpen)}
            className={`${sidebarOpen ? 'mx-4 mt-4' : 'mx-2 mt-2'} flex items-center ${sidebarOpen ? 'justify-between px-4 py-2' : 'justify-center px-3 py-2'} bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-shadow`}
            title={sidebarOpen ? '' : 'Focus Timer'}
          >
            <span className={`flex items-center ${sidebarOpen ? 'gap-2' : ''}`}>
              <Timer size={18} />
              {sidebarOpen && 'Focus Timer'}
            </span>
            {sidebarOpen && <span className="text-xl">{timerOpen ? '−' : '+'}</span>}
          </motion.button>

          <AnimatePresence>
            {timerOpen && sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FocusTimer />
              </motion.div>
            )}
          </AnimatePresence>

          <nav className={`flex-1 ${sidebarOpen ? 'p-4' : 'p-2'} space-y-1 overflow-y-auto`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <motion.button
                  key={item.path}
                  whileHover={{ scale: 1.02, x: sidebarOpen ? 4 : 0 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4 py-3' : 'justify-center px-3 py-3'} rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={sidebarOpen ? '' : item.label}
                >
                  <Icon size={20} />
                  {sidebarOpen && <span className="font-medium">{item.label}</span>}
                </motion.button>
              );
            })}

            <motion.button
              whileHover={{ scale: 1.02, x: sidebarOpen ? 4 : 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSignOut}
              className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4 py-3' : 'justify-center px-3 py-3'} rounded-xl text-red-600 hover:bg-red-50 transition-all`}
              title={sidebarOpen ? '' : 'Sign Out'}
            >
              <LogOut size={20} />
              {sidebarOpen && <span className="font-medium">Sign Out</span>}
            </motion.button>
          </nav>
        </motion.aside>

        <main className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 max-w-7xl mx-auto relative"
          >
            {children}
          </motion.div>
        </main>
      </div>

      <div className="md:hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
              <span className="text-xl">✨</span>
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              GoodDays
            </h1>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white border-b border-gray-200 overflow-hidden"
            >
              <div className="p-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTimerOpen(!timerOpen)}
                  className="w-full flex items-center justify-between px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold shadow-md mb-3"
                >
                  <span className="flex items-center gap-2">
                    <Timer size={18} />
                    Focus Timer
                  </span>
                  <span className="text-xl">{timerOpen ? '−' : '+'}</span>
                </motion.button>

                <AnimatePresence>
                  {timerOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <FocusTimer />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="pb-20 p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {children}
          </motion.div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 flex gap-1 overflow-x-auto shadow-2xl z-50 scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <motion.button
                key={item.path}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title={item.label}
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{item.label}</span>
              </motion.button>
            );
          })}

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSignOut}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all text-gray-600 hover:text-red-600 flex-shrink-0"
            title="Sign Out"
          >
            <LogOut size={20} />
            <span className="text-xs font-medium">Sign Out</span>
          </motion.button>
        </nav>
      </div>
    </div>
  );
}
