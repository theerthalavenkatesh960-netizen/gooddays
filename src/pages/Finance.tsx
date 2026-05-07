import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, BarChart2 } from 'lucide-react';
import ExpensesTab from './Expenses';
import FinancialTrackerTab from './FinancialTracker';

const tabs = [
  { id: 'expenses', label: 'Expenses', icon: DollarSign },
  { id: 'tracker', label: 'Tracker', icon: BarChart2 },
];

export default function Finance() {
  const [activeTab, setActiveTab] = useState<'expenses' | 'tracker'>('expenses');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Finance</h1>
        <p className="text-gray-500">Track spending and manage your financial goals</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveTab(tab.id as 'expenses' | 'tracker')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isActive
                  ? 'bg-white text-emerald-700 shadow-md'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'expenses' && <ExpensesTab />}
      {activeTab === 'tracker' && <FinancialTrackerTab />}
    </div>
  );
}
