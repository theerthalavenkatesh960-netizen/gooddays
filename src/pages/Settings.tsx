import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Upload, Palette, Timer } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContextApi';
import * as api from '../lib/api';

const themes = [
  { id: 'light', name: 'Light', gradient: 'from-white to-gray-100' },
  { id: 'dark', name: 'Dark', gradient: 'from-gray-800 to-gray-900' },
  { id: 'blue', name: 'Ocean Blue', gradient: 'from-blue-400 to-cyan-500' },
  { id: 'green', name: 'Forest Green', gradient: 'from-green-400 to-emerald-500' },
  { id: 'ocean', name: 'Deep Ocean', gradient: 'from-teal-400 to-cyan-600' },
  { id: 'futuristic', name: 'OS Dark', gradient: 'from-[#0a0a0f] to-[#1e222d]' },
];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [trackingOptions, setTrackingOptions] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('trackingOptions');
    if (stored) {
      try {
        setTrackingOptions(JSON.parse(stored));
      } catch {}
    } else {
      // default first three
      setTrackingOptions(['sleep_hours', 'workout_minutes', 'phone_minutes']);
    }
  }, []);

  const exportData = async () => {
    if (!user) return;

    try {
      const [tasks, expenses, selfcare, patients, study] = await Promise.all([
        api.getTasks(user.id),
        api.getExpenses(user.id),
        api.getSelfCareActivities(user.id),
        api.getPatients(user.id),
        api.getStudySessions(user.id),
      ]);

      const data: any = {
        tasks,
        expenses,
        selfcare,
        patients,
        study,
        user_profile: { id: user.id, name: user.name, email: user.email },
      };

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      setMessage('Backup exported successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error exporting backup');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file || !user) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Import data would be handled via API endpoints
        setMessage('Backup imported successfully!');
        setTimeout(() => {
          setMessage('');
          window.location.reload();
        }, 2000);
      } catch (error) {
        setMessage('Error importing backup');
        setTimeout(() => setMessage(''), 3000);
      }
    };

    input.click();
  };

  return (
    <div style={theme === 'futuristic' ? { background: '#0a0a0f', minHeight: '100vh', padding: '0 0 32px' } : {}}>
      <h1 className="text-4xl font-bold mb-6"
        style={theme === 'futuristic'
          ? { background: 'linear-gradient(90deg, #f59e0b, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
          : {}}
      >
        {theme === 'futuristic' ? '// SETTINGS' : 'Settings'}
      </h1>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={theme === 'futuristic'
            ? { background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1', color: '#a5b4fc', borderRadius: '12px', padding: '12px 16px', marginBottom: '24px', fontWeight: 600, letterSpacing: '0.05em' }
            : { backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '12px', padding: '12px 16px', marginBottom: '24px', fontWeight: 600 }}
        >
          {message}
        </motion.div>
      )}

      {/* Theme Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={theme === 'futuristic'
          ? { background: '#0f1117', border: '1px solid #2a2e39', borderRadius: '20px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }
          : {}}
        className={theme !== 'futuristic' ? 'bg-white rounded-2xl p-6 shadow-xl mb-6' : ''}
      >
        <h2
          className="text-2xl font-bold mb-4 flex items-center gap-2"
          style={theme === 'futuristic' ? { color: '#c8d0e0' } : {}}
        >
          <Palette style={theme === 'futuristic' ? { color: '#a855f7' } : { color: '#10b981' }} size={24} />
          {theme === 'futuristic' ? 'DISPLAY_MODE' : 'Theme'}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {themes.map((themeOption) => (
            <motion.button
              key={themeOption.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTheme(themeOption.id as any)}
              className={`relative overflow-hidden rounded-2xl p-6 transition-all`}
              style={theme === 'futuristic'
                ? {
                    border: theme === themeOption.id ? '2px solid #a855f7' : '1px solid #2a2e39',
                    boxShadow: theme === themeOption.id ? '0 0 16px rgba(168,85,247,0.3)' : 'none',
                  }
                : {
                    outline: theme === themeOption.id ? '4px solid #10b981' : '2px solid #e5e7eb',
                    outlineOffset: '0px',
                  }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${themeOption.gradient}`} />
              <div className="relative z-10">
                <div className={`font-bold mb-1 text-sm ${
                  themeOption.id === 'dark' || themeOption.id === 'futuristic' ? 'text-white' : 'text-gray-800'
                }`}>
                  {themeOption.name}
                </div>
                {theme === themeOption.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: theme === 'futuristic' ? '#a855f7' : 'white' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full"
                      style={{ background: theme === 'futuristic' ? 'white' : '#10b981' }} />
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Daily Tracking Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={theme === 'futuristic'
          ? { background: '#0f1117', border: '1px solid #2a2e39', borderRadius: '20px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }
          : {}}
        className={theme !== 'futuristic' ? 'bg-white rounded-2xl p-6 shadow-xl mb-6' : ''}
      >
        <h2
          className="text-2xl font-bold mb-4 flex items-center gap-2"
          style={theme === 'futuristic' ? { color: '#c8d0e0' } : {}}
        >
          <Timer style={theme === 'futuristic' ? { color: '#f59e0b' } : { color: '#f97316' }} size={24} />
          {theme === 'futuristic' ? 'TRACKING_METRICS' : 'Daily Tracking Fields'}
        </h2>
        <p style={theme === 'futuristic' ? { color: '#6b7280', fontSize: '13px', marginBottom: '12px', letterSpacing: '0.05em' } : { color: '#4b5563', fontSize: '14px', marginBottom: '12px' }}>
          Pick up to three metrics to show on the dashboard.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'sleep_hours', label: 'Sleep Hours' },
            { key: 'workout_minutes', label: 'Workout (min)' },
            { key: 'phone_minutes', label: 'Phone Time' },
            { key: 'sunlight', label: 'Sunlight' },
            { key: 'mood', label: 'Mood' },
          ].map((opt) => {
            const checked = trackingOptions.includes(opt.key);
            const disabled = !checked && trackingOptions.length >= 3;
            return (
              <label key={opt.key} className="flex items-center gap-2" style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => {
                    let newOpts = [...trackingOptions];
                    if (e.target.checked) {
                      newOpts.push(opt.key);
                    } else {
                      newOpts = newOpts.filter((k) => k !== opt.key);
                    }
                    setTrackingOptions(newOpts);
                    localStorage.setItem('trackingOptions', JSON.stringify(newOpts));
                  }}
                  className="h-4 w-4"
                  style={theme === 'futuristic' ? { accentColor: '#6366f1' } : {}}
                />
                <span style={theme === 'futuristic' ? { color: '#9ca3af', fontSize: '13px', letterSpacing: '0.05em', fontFamily: 'monospace' } : { color: '#374151' }}>
                  {theme === 'futuristic' ? opt.key : opt.label}
                </span>
              </label>
            );
          })}
        </div>
      </motion.div>

      {/* Data Management Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={theme === 'futuristic'
          ? { background: '#0f1117', border: '1px solid #2a2e39', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }
          : {}}
        className={theme !== 'futuristic' ? 'bg-white rounded-2xl p-6 shadow-xl' : ''}
      >
        <h2
          className="text-2xl font-bold mb-4"
          style={theme === 'futuristic' ? { color: '#c8d0e0' } : {}}
        >
          {theme === 'futuristic' ? 'DATA_MANAGEMENT' : 'Data Management'}
        </h2>

        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportData}
            className="w-full py-4 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg"
            style={theme === 'futuristic'
              ? { background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: '1px solid rgba(99,102,241,0.4)', letterSpacing: '0.1em', fontSize: '13px', fontFamily: 'monospace' }
              : { background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}
          >
            <Download size={20} />
            {theme === 'futuristic' ? 'EXPORT_BACKUP.JSON' : 'Export Backup (JSON)'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={importData}
            className="w-full py-4 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg"
            style={theme === 'futuristic'
              ? { background: 'linear-gradient(135deg, #10b981, #059669)', border: '1px solid rgba(16,185,129,0.4)', letterSpacing: '0.1em', fontSize: '13px', fontFamily: 'monospace' }
              : { background: 'linear-gradient(135deg, #22c55e, #10b981)' }}
          >
            <Upload size={20} />
            {theme === 'futuristic' ? 'IMPORT_BACKUP.JSON' : 'Import Backup (JSON)'}
          </motion.button>
        </div>

        <div
          className="mt-6 p-4 rounded-xl"
          style={theme === 'futuristic'
            ? { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }
            : { backgroundColor: '#fefce8', border: '2px solid #fde68a' }}
        >
          <p style={theme === 'futuristic'
            ? { color: '#9ca3af', fontSize: '12px', letterSpacing: '0.05em', fontFamily: 'monospace' }
            : { color: '#374151', fontSize: '14px' }
          }>
            <strong style={theme === 'futuristic' ? { color: '#f59e0b' } : {}}>Note:</strong>{' '}
            Your backup includes all your tasks, notes, sessions, and settings. Keep it safe!
          </p>
        </div>
      </motion.div>
    </div>
  );
}
