import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Calendar, CheckCircle2, Circle } from "lucide-react";

interface ThesisDeadlinesProps {
  deadlines: any[];
  onCreate: (data: any) => void;
  onUpdate: (id: number, data: any) => void;
  onDelete: (id: number) => void;
}

export default function ThesisDeadlines({ deadlines, onCreate, onUpdate, onDelete }: ThesisDeadlinesProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    completed: false,
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingDeadline) {
      onUpdate(editingDeadline.id, formData);
    } else {
      onCreate(formData);
    }

    setShowForm(false);
    setEditingDeadline(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: "",
      date: "",
      completed: false,
      notes: ""
    });
  };

  const handleEdit = (deadline: any) => {
    setEditingDeadline(deadline);
    setFormData({
      title: deadline.title || "",
      date: deadline.date?.split('T')[0] || "",
      completed: deadline.completed || false,
      notes: deadline.notes || ""
    });
    setShowForm(true);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleComplete = (deadline: any) => {
    onUpdate(deadline.id, { ...deadline, completed: !deadline.completed });
  };

  const sortedDeadlines = [...deadlines].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const upcomingDeadlines = sortedDeadlines.filter(d => !d.completed);
  const completedDeadlines = sortedDeadlines.filter(d => d.completed);

  const getDeadlineStatus = (date: string, completed: boolean) => {
    if (completed) return 'completed';

    const today = new Date();
    const deadlineDate = new Date(date);
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays <= 7) return 'urgent';
    if (diffDays <= 30) return 'upcoming';
    return 'future';
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      'completed': 'text-green-600 bg-green-50',
      'overdue': 'text-red-600 bg-red-50',
      'urgent': 'text-orange-600 bg-orange-50',
      'upcoming': 'text-blue-600 bg-blue-50',
      'future': 'text-gray-600 bg-gray-50'
    };
    return colors[status] || colors.future;
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      'completed': 'Completed',
      'overdue': 'Overdue',
      'urgent': 'Due Soon',
      'upcoming': 'Upcoming',
      'future': 'Future'
    };
    return labels[status] || 'Scheduled';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-teal-700">Deadlines & Milestones</h1>
        <button
          onClick={() => {
            resetForm();
            setEditingDeadline(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          <Plus size={18} />
          Add Deadline
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl shadow-md p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingDeadline ? 'Edit Deadline' : 'Add New Deadline'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="e.g., Data Analysis, Thesis Submission"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional details or requirements..."
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.completed}
                  onChange={(e) => handleChange('completed', e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">Mark as completed</span>
              </label>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                >
                  {editingDeadline ? 'Update Deadline' : 'Add Deadline'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingDeadline(null);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl p-4 text-white">
          <div className="text-sm font-medium mb-1">Total Deadlines</div>
          <div className="text-3xl font-bold">{deadlines.length}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="text-sm font-medium mb-1">Upcoming</div>
          <div className="text-3xl font-bold">{upcomingDeadlines.length}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="text-sm font-medium mb-1">Completed</div>
          <div className="text-3xl font-bold">{completedDeadlines.length}</div>
        </div>
      </div>

      {upcomingDeadlines.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Upcoming Deadlines</h2>

          <div className="space-y-3">
            {upcomingDeadlines.map((deadline, idx) => {
              const status = getDeadlineStatus(deadline.date, deadline.completed);
              const statusColor = getStatusColor(status);
              const statusLabel = getStatusLabel(status);

              return (
                <motion.div
                  key={deadline.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 p-4 border rounded-xl hover:shadow-md transition"
                >
                  <button
                    onClick={() => toggleComplete(deadline)}
                    className="flex-shrink-0"
                  >
                    <Circle className="text-gray-400 hover:text-teal-600" size={24} />
                  </button>

                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{deadline.title}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(deadline.date).toLocaleDateString('en', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    {deadline.notes && (
                      <div className="text-xs text-gray-400 mt-1">{deadline.notes}</div>
                    )}
                  </div>

                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
                    {statusLabel}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(deadline)}
                      className="text-teal-600 hover:text-teal-800"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this deadline?')) {
                          onDelete(deadline.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {completedDeadlines.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Completed Deadlines</h2>

          <div className="space-y-3">
            {completedDeadlines.map((deadline, idx) => (
              <motion.div
                key={deadline.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 p-4 border rounded-xl bg-gray-50 opacity-75"
              >
                <button
                  onClick={() => toggleComplete(deadline)}
                  className="flex-shrink-0"
                >
                  <CheckCircle2 className="text-green-600" size={24} />
                </button>

                <div className="flex-1">
                  <div className="font-semibold text-gray-600 line-through">{deadline.title}</div>
                  <div className="text-sm text-gray-400">
                    {new Date(deadline.date).toLocaleDateString('en', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(deadline)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this deadline?')) {
                        onDelete(deadline.id);
                      }
                    }}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {deadlines.length === 0 && (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No deadlines yet</h3>
          <p className="text-gray-500 mb-4">Add your first deadline to start tracking your thesis milestones</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            <Plus size={18} />
            Add Deadline
          </button>
        </div>
      )}
    </div>
  );
}
