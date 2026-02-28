import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Settings as SettingsIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

export default function Thesis() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    total_sample_size: 135,
    group_a_size: 45,
    group_b_size: 45,
    group_c_size: 45,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [newPatient, setNewPatient] = useState({
    group_name: 'A',
    notes: '',
    proforma_status: 'pending',
  });

  useEffect(() => {
    if (user) {
      loadSettings();
      loadPatients();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    // Settings would be stored with thesis entries in the backend
  };

  const loadPatients = async () => {
    if (!user) return;

    const data = await api.getThesisEntries(user.id);
    if (data && data.length > 0) setPatients(data);
  };

  const updateSettings = async () => {
    if (!user) return;
    // Settings update would be handled via thesis entry update
    setShowSettings(false);
  };

  const addPatient = async () => {
    if (!user) return;

    await api.createThesisEntry(
      user.id,
      `Group ${newPatient.group_name}`,
      newPatient.notes,
      newPatient.proforma_status,
      new Date()
    );

    setNewPatient({ group_name: 'A', notes: '', proforma_status: 'pending' });
    loadPatients();
  };

  const deletePatient = async (id: string) => {
    await api.deleteThesisEntry(id);
    loadPatients();
  };

  const exportCSV = () => {
    const headers = ['Date', 'Group', 'Notes', 'Proforma Status'];
    const rows = patients.map((p) => [p.date, p.group_name, p.notes, p.proforma_status]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thesis_patients.csv';
    a.click();
  };

  const getGroupCount = (group: string) => patients.filter((p) => p.group_name === group).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Thesis Tracker
        </h1>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportCSV}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl font-semibold flex items-center gap-2"
          >
            <Download size={18} />
            Export CSV
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-gray-500 text-white rounded-xl font-semibold flex items-center gap-2"
          >
            <SettingsIcon size={18} />
            Settings
          </motion.button>
        </div>
      </div>

      {showSettings && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-xl mb-6"
        >
          <h2 className="text-xl font-bold mb-4">Sample Size Settings</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Sample Size</label>
              <input
                type="number"
                value={settings.total_sample_size}
                onChange={(e) => setSettings({ ...settings, total_sample_size: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group A</label>
              <input
                type="number"
                value={settings.group_a_size}
                onChange={(e) => setSettings({ ...settings, group_a_size: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group B</label>
              <input
                type="number"
                value={settings.group_b_size}
                onChange={(e) => setSettings({ ...settings, group_b_size: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group C</label>
              <input
                type="number"
                value={settings.group_c_size}
                onChange={(e) => setSettings({ ...settings, group_c_size: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={updateSettings}
            className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-xl font-semibold"
          >
            Save Settings
          </motion.button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Group A</h3>
          <div className="text-3xl font-bold text-blue-600">{getGroupCount('A')}/{settings.group_a_size}</div>
          <div className="bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${(getGroupCount('A') / settings.group_a_size) * 100}%` }}
            />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Group B</h3>
          <div className="text-3xl font-bold text-green-600">{getGroupCount('B')}/{settings.group_b_size}</div>
          <div className="bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${(getGroupCount('B') / settings.group_b_size) * 100}%` }}
            />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Group C</h3>
          <div className="text-3xl font-bold text-orange-600">{getGroupCount('C')}/{settings.group_c_size}</div>
          <div className="bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-orange-500 h-2 rounded-full"
              style={{ width: `${(getGroupCount('C') / settings.group_c_size) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-xl mb-6"
      >
        <h2 className="text-xl font-bold mb-4">Add New Patient</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={newPatient.group_name}
            onChange={(e) => setNewPatient({ ...newPatient, group_name: e.target.value })}
            className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
          >
            <option value="A">Group A</option>
            <option value="B">Group B</option>
            <option value="C">Group C</option>
          </select>
          <input
            type="text"
            value={newPatient.notes}
            onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
            placeholder="Notes"
            className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
          />
          <select
            value={newPatient.proforma_status}
            onChange={(e) => setNewPatient({ ...newPatient, proforma_status: e.target.value })}
            className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={addPatient}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add Patient
          </motion.button>
        </div>
      </motion.div>

      <div className="space-y-3">
        {patients.map((patient) => (
          <motion.div
            key={patient.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl p-4 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold text-sm">
                    Group {patient.group_name}
                  </span>
                  <span className="text-sm text-gray-600">{format(new Date(patient.date), 'MMM d, yyyy')}</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      patient.proforma_status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {patient.proforma_status}
                  </span>
                </div>
                <p className="text-gray-700">{patient.notes}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => deletePatient(patient.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={18} />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
