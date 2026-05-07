import { motion } from 'framer-motion';
import { DashboardDto } from '../../lib/financialApi';

interface RulesPanelProps {
  dashboard: DashboardDto | null;
  activeTab: 'investment' | 'trading' | 'mindset' | 'lifestyle';
  setActiveTab: (tab: 'investment' | 'trading' | 'mindset' | 'lifestyle') => void;
  onUpdate: () => void;
}

export default function RulesPanel({
  dashboard,
  activeTab,
  setActiveTab,
}: RulesPanelProps) {
  const tabs = [
    { key: 'investment' as const, label: 'Investment', color: '#f0c040' },
    { key: 'trading' as const, label: 'Trading', color: '#e05050' },
    { key: 'mindset' as const, label: 'Mindset', color: '#4a7acc' },
    { key: 'lifestyle' as const, label: 'Lifestyle', color: '#26a65b' },
  ];

  const filteredRules = (dashboard?.rules ?? []).filter(
    (rule) => rule.category.toLowerCase() === activeTab
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-[#1e222d] rounded-xl p-6 border border-[#2a2e39]"
    >
      <h2 className="text-xl font-bold mb-4">Financial Rules</h2>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'text-white'
                : 'bg-[#2a2e39] text-[#787b86] hover:bg-[#3a3e49]'
            }`}
            style={{
              backgroundColor: activeTab === tab.key ? tab.color : undefined,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {filteredRules?.map((rule) => (
          <motion.div
            key={rule.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#2a2e39] rounded-lg p-4 border-l-4"
            style={{
              borderLeftColor:
                tabs.find((t) => t.key === activeTab)?.color || '#26a65b',
            }}
          >
            <h4 className="font-bold text-[#c8d0e0] mb-1">{rule.title}</h4>
            {rule.description && (
              <p className="text-sm text-[#787b86]">{rule.description}</p>
            )}
          </motion.div>
        ))}

        {(!filteredRules || filteredRules.length === 0) && (
          <p className="text-center text-[#787b86] py-8">
            No rules in this category yet
          </p>
        )}
      </div>
    </motion.div>
  );
}