import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ConfigPanel({
  isOpen,
  onClose,
}: ConfigPanelProps) {
  const [activeSection, setActiveSection] = useState<'buckets' | 'tasks' | 'rules'>('buckets');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-[#1e222d] shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#c8d0e0]">
                  Configuration
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[#2a2e39] rounded-lg transition-colors"
                >
                  <X size={24} className="text-[#787b86]" />
                </button>
              </div>

              {/* Section Tabs */}
              <div className="flex gap-2 mb-6 border-b border-[#2a2e39]">
                {['buckets', 'tasks', 'rules'].map((section) => (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section as any)}
                    className={`px-4 py-2 font-bold capitalize transition-colors ${
                      activeSection === section
                        ? 'text-[#f0c040] border-b-2 border-[#f0c040]'
                        : 'text-[#787b86] hover:text-[#c8d0e0]'
                    }`}
                  >
                    {section}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="space-y-4">
                {activeSection === 'buckets' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-[#c8d0e0]">
                        Manage Buckets
                      </h3>
                      <button className="flex items-center gap-2 px-4 py-2 bg-[#26a65b] hover:bg-[#1f8a4a] text-white rounded-lg font-bold transition-colors">
                        <Plus size={18} />
                        Add Bucket
                      </button>
                    </div>
                    <p className="text-[#787b86] text-sm">
                      Bucket management coming soon...
                    </p>
                  </div>
                )}

                {activeSection === 'tasks' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-[#c8d0e0]">
                        Manage Tasks
                      </h3>
                      <button className="flex items-center gap-2 px-4 py-2 bg-[#26a65b] hover:bg-[#1f8a4a] text-white rounded-lg font-bold transition-colors">
                        <Plus size={18} />
                        Add Task
                      </button>
                    </div>
                    <p className="text-[#787b86] text-sm">
                      Task management coming soon...
                    </p>
                  </div>
                )}

                {activeSection === 'rules' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-[#c8d0e0]">
                        Manage Rules
                      </h3>
                      <button className="flex items-center gap-2 px-4 py-2 bg-[#26a65b] hover:bg-[#1f8a4a] text-white rounded-lg font-bold transition-colors">
                        <Plus size={18} />
                        Add Rule
                      </button>
                    </div>
                    <p className="text-[#787b86] text-sm">
                      Rule management coming soon...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}