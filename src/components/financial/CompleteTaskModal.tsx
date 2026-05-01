import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';
import { TaskDto } from '../../lib/financialApi';

interface CompleteTaskModalProps {
  task: TaskDto | null;
  onClose: () => void;
  onComplete: (actualAmount?: number, notes?: string) => void;
}

export default function CompleteTaskModal({
  task,
  onClose,
  onComplete,
}: CompleteTaskModalProps) {
  const [actualAmount, setActualAmount] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (task) {
      setActualAmount(task.amount > 0 ? task.amount.toString() : '');
      setNotes('');
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = actualAmount ? parseFloat(actualAmount) : undefined;
    onComplete(amount, notes || undefined);
  };

  return (
    <AnimatePresence>
      {task && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-[#1e222d] rounded-xl p-6 w-full max-w-md border border-[#2a2e39]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#c8d0e0]">
                Complete Task
              </h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-[#2a2e39] rounded-lg transition-colors"
              >
                <X size={20} className="text-[#787b86]" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <p className="text-sm text-[#787b86] mb-3">{task.title}</p>

                {task.amount > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm text-[#787b86] mb-2">
                      Actual Amount
                    </label>
                    <input
                      type="number"
                      value={actualAmount}
                      onChange={(e) => setActualAmount(e.target.value)}
                      className="w-full px-4 py-2 bg-[#2a2e39] border border-[#3a3e49] rounded-lg text-[#c8d0e0] focus:border-[#26a65b] outline-none"
                      placeholder="₹"
                      step="0.01"
                    />
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm text-[#787b86] mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 bg-[#2a2e39] border border-[#3a3e49] rounded-lg text-[#c8d0e0] focus:border-[#26a65b] outline-none resize-none"
                    rows={3}
                    placeholder="Any notes..."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-[#2a2e39] hover:bg-[#3a3e49] text-[#c8d0e0] rounded-lg font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#26a65b] hover:bg-[#1f8a4a] text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Complete
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}