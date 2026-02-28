import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Upload, Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const themes = [
  { id: 'light', name: 'Light', gradient: 'from-white to-gray-100' },
  { id: 'dark', name: 'Dark', gradient: 'from-gray-800 to-gray-900' },
  { id: 'blue', name: 'Ocean Blue', gradient: 'from-blue-400 to-cyan-500' },
  { id: 'green', name: 'Forest Green', gradient: 'from-green-400 to-emerald-500' },
  { id: 'ocean', name: 'Deep Ocean', gradient: 'from-teal-400 to-cyan-600' },
];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [message, setMessage] = useState('');

  const exportData = async () => {
    if (!user) return;

    try {
      const tables = [
        'daily_top_three',
        'daily_notes',
        'tasks',
        'focus_sessions',
        'thesis_settings',
        'thesis_patients',
        'study_sessions',
        'study_resources',
        'study_chapters',
        'daily_tracking',
        'expenses',
        'self_care_template',
        'self_care_logs',
      ];

      const data: any = {};

      for (const table of tables) {
        const { data: tableData } = await supabase.from(table).select('*').eq('user_id', user.id);
        data[table] = tableData || [];
      }

      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
      data.user_profile = profile;

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

        const tables = [
          'daily_top_three',
          'daily_notes',
          'tasks',
          'focus_sessions',
          'thesis_settings',
          'thesis_patients',
          'study_sessions',
          'study_resources',
          'study_chapters',
          'daily_tracking',
          'expenses',
          'self_care_template',
          'self_care_logs',
        ];

        for (const table of tables) {
          if (data[table] && data[table].length > 0) {
            await supabase.from(table).upsert(data[table]);
          }
        }

        if (data.user_profile) {
          await supabase.from('user_profiles').upsert(data.user_profile);
        }

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
    <div>
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
        Settings
      </h1>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-100 text-emerald-700 px-4 py-3 rounded-xl mb-6 font-semibold"
        >
          {message}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-xl mb-6"
      >
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Palette className="text-emerald-500" size={24} />
          Theme
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {themes.map((themeOption) => (
            <motion.button
              key={themeOption.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTheme(themeOption.id as any)}
              className={`relative overflow-hidden rounded-2xl p-6 transition-all ${
                theme === themeOption.id ? 'ring-4 ring-emerald-500' : 'ring-2 ring-gray-200'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${themeOption.gradient}`} />
              <div className="relative z-10">
                <div className={`font-bold mb-1 ${themeOption.id === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {themeOption.name}
                </div>
                {theme === themeOption.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center"
                  >
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-6 shadow-xl"
      >
        <h2 className="text-2xl font-bold mb-4">Data Management</h2>

        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportData}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg"
          >
            <Download size={20} />
            Export Backup (JSON)
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={importData}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg"
          >
            <Upload size={20} />
            Import Backup (JSON)
          </motion.button>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
          <p className="text-sm text-gray-700">
            <strong>Note:</strong> Your backup includes all your tasks, notes, sessions, and settings. Keep it safe!
          </p>
        </div>
      </motion.div>
    </div>
  );
}
