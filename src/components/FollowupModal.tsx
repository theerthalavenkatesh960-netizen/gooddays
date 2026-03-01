import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";

export interface FollowupModalProps {
  show: boolean;
  patient: any | null;
  followups: any[];
  onClose: () => void;
  onCreate: (data: any) => void;
  onUpdate: (id: number, data: any) => void;
  onDelete: (id: number) => void;
}

const FOLLOWUP_STATUS = ["Pending", "Due", "Completed", "Dropout"];

export default function FollowupModal({ show, patient, followups, onClose, onCreate, onUpdate, onDelete }: FollowupModalProps) {
  const [followupForm, setFollowupForm] = useState({
    id: 0,
    patientId: 0,
    visitNumber: 1,
    visitDate: new Date().toISOString().split('T')[0],
    status: "pending",
    notes: "",
  });
  const [editingFollowup, setEditingFollowup] = useState<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'view' | 'add'>('view');

  useEffect(() => {
    if (show && patient) {
      // prepare the form when opening
      setMode('view');
      setEditingFollowup(null);
      setFollowupForm({
        id: 0,
        patientId: patient.id,
        visitNumber: (followups?.length || 0) + 1,
        visitDate: new Date().toISOString().split('T')[0],
        status: "pending",
        notes: "",
      });
    }
  }, [show, patient]);

  const handleChange = (field: string, value: any) => {
    setFollowupForm(prev => ({ ...prev, [field]: value }));
  };

  const startEdit = (f: any) => {
    setEditingFollowup(f);
    setFollowupForm({
      id: f.id,
      patientId: f.patientId,
      visitNumber: f.visitNumber || 1,
      visitDate: f.visitDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      status: f.status || "pending",
      notes: f.notes || "",
    });
    setMode('add');
    setTimeout(() => {
      modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const cancel = () => {
    setEditingFollowup(null);
    setMode('view');
    setFollowupForm({
      id: 0,
      patientId: patient?.id || 0,
      visitNumber: 1,
      visitDate: new Date().toISOString().split('T')[0],
      status: "pending",
      notes: "",
    });
  };

  const save = () => {
    const payload: any = { ...followupForm, status: followupForm.status?.toLowerCase() };
    if ((!payload.patientId || payload.patientId === 0) && patient) {
      payload.patientId = patient.id;
    }
    if (editingFollowup) {
      onUpdate(editingFollowup.id, payload);
    } else {
      onCreate(payload);
    }
    onClose();
  };

  if (!show || !patient) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-white rounded-xl p-6 w-full max-w-lg mx-4"
            ref={modalRef}
          >
            <h2 className="text-xl font-semibold mb-4">
              Follow-ups for {patient.patientId}
            </h2>
            <div className="mb-4 text-sm">
              <div>ID: {patient.patientId}</div>
              <div>Study #: {patient.studyNumber}</div>
              <div>Group: {patient.groupName}</div>
            </div>

            {(mode === 'add' || editingFollowup) && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-2">{editingFollowup ? 'Edit Follow-up' : 'New Follow-up'}</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Visit #</label>
                    <input
                      type="number"
                      value={followupForm.visitNumber}
                      onChange={e => handleChange('visitNumber', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={followupForm.visitDate}
                      onChange={e => handleChange('visitDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={followupForm.status}
                      onChange={e => handleChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      {FOLLOWUP_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={followupForm.notes}
                      onChange={e => handleChange('notes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={save} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Check size={16}/> Save
                  </button>
                  <button onClick={cancel} className="flex items-center gap-1 px-3 py-1 bg-gray-300 rounded-lg hover:bg-gray-400">
                    <X size={16}/> Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {followups.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-100">
                  <div>
                    <div className="text-sm font-medium">Visit {f.visitNumber || '-'}</div>
                    <div className="text-xs text-gray-600">{f.visitDate ? new Date(f.visitDate).toLocaleDateString() : ''} • {f.status}</div>
                    {f.notes && <div className="text-xs text-gray-500">{f.notes}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(f)} className="text-blue-500">
                      <Edit2 size={16}/>
                    </button>
                    <button onClick={() => onDelete(f.id)} className="text-red-500">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              {!editingFollowup && (
                <button onClick={() => setMode('add')} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-1">
                  <Plus size={16}/> Add New
                </button>
              )}
              <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">Close</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
