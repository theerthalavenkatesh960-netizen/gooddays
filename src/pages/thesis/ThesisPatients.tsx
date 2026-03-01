import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Search, Download } from "lucide-react";

interface ThesisPatientsProps {
  patients: any[];
  onCreate: (data: any) => void;
  onUpdate: (id: number, data: any) => void;
  onDelete: (id: number) => void;
  onExport: () => void;
  followups: Record<string, any[]>;
  onFollowupCreate: (data: any) => void;
  onFollowupUpdate: (id: number, data: any) => void;
  onFollowupDelete: (id: number) => void;
}

const GROUPS = ["A", "B", "C", "Control"];
const PROFORMA_STATUS = ["Pending", "In Progress", "Completed"];
const FOLLOWUP_STATUS = ["Pending", "Due", "Completed", "Dropout"];

export default function ThesisPatients({ patients, onCreate, onUpdate, onDelete, onExport, followups, onFollowupCreate, onFollowupUpdate, onFollowupDelete }: ThesisPatientsProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState("All");

  const [formData, setFormData] = useState({
    patientId: "",
    studyNumber: "",
    groupName: "A",
    age: 30,
    gender: "Male",
    recruitmentDate: new Date().toISOString().split('T')[0],
    consentTaken: false,
    inclusionCriteriaMet: false,
    exclusionCriteriaMet: false,
    proformaStatus: "Pending",
    followupStatus: "Pending",
    notes: ""
  });

  // followup form state
  const [followupForm, setFollowupForm] = useState({
    id: 0,
    patientId: 0,
    visitNumber: 1,
    visitDate: new Date().toISOString().split('T')[0],
    status: "pending",
    notes: "",
  });
  const [editingFollowup, setEditingFollowup] = useState<any>(null);

  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [patientForFollowup, setPatientForFollowup] = useState<any>(null);
  const [followupMode, setFollowupMode] = useState<'add' | 'view'>('add');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPatient) {
      onUpdate(editingPatient.id, formData);
    } else {
      onCreate(formData);
    }

    setShowForm(false);
    setEditingPatient(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      patientId: "",
      studyNumber: "",
      groupName: "A",
      age: 30,
      gender: "Male",
      recruitmentDate: new Date().toISOString().split('T')[0],
      consentTaken: false,
      inclusionCriteriaMet: false,
      exclusionCriteriaMet: false,
      proformaStatus: "Pending",
      followupStatus: "Pending",
      notes: ""
    });
  };

  const handleEdit = (patient: any) => {
    setEditingPatient(patient);
    setFormData({
      patientId: patient.patientId || "",
      studyNumber: patient.studyNumber || "",
      groupName: patient.groupName || "A",
      age: patient.age || 30,
      gender: patient.gender || "Male",
      recruitmentDate: patient.recruitmentDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      consentTaken: patient.consentTaken || false,
      inclusionCriteriaMet: patient.inclusionCriteriaMet || false,
      exclusionCriteriaMet: patient.exclusionCriteriaMet || false,
      proformaStatus: patient.proformaStatus || "Pending",
      followupStatus: patient.followupStatus || "Pending",
      notes: patient.notes || ""
    });
    setShowForm(true);
  };

  // start creating a followup for a given patient - open patient detail and prep followup form
  const handleAddFollowupFor = (patient: any) => {
    setPatientForFollowup(patient);
    setFollowupMode('add');
    setShowFollowupModal(true);
    setEditingFollowup(null);
    setFollowupForm({
      id: 0,
      patientId: patient.id,
      visitNumber: (followups[patient.id]?.length || 0) + 1,
      visitDate: new Date().toISOString().split('T')[0],
      status: "pending",
      notes: "",
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFollowupChange = (field: string, value: any) => {
    setFollowupForm(prev => ({ ...prev, [field]: value }));
  };

  const saveFollowup = () => {
    // ensure payload always carries a valid patientId; if the form somehow
    // lost it we can fall back to the currently selected patient.
    const payload: any = { ...followupForm, status: followupForm.status?.toLowerCase() };
    if ((!payload.patientId || payload.patientId === 0) && patientForFollowup) {
      payload.patientId = patientForFollowup.id;
    }
    if (editingFollowup) {
      onFollowupUpdate(editingFollowup.id, payload);
    } else {
      onFollowupCreate(payload);
    }
    closeFollowupModal();
    setEditingFollowup(null);
    setFollowupForm({
      id: 0,
      patientId: formData.patientId || 0,
      visitNumber: 1,
      visitDate: new Date().toISOString().split('T')[0],
      status: "pending",
      notes: "",
    });
  };

  const startFollowupEdit = (f: any) => {
    setEditingFollowup(f);
    setFollowupForm({
      id: f.id,
      patientId: f.patientId,
      visitNumber: f.visitNumber || 1,
      visitDate: f.visitDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      status: f.status || "pending",
      notes: f.notes || "",
    });
  };

  const cancelFollowup = () => {
    setEditingFollowup(null);
    setFollowupForm({
      id: 0,
      patientId: formData.patientId || 0,
      visitNumber: 1,
      visitDate: new Date().toISOString().split('T')[0],
      status: "pending",
      notes: "",
    });
  };

  const closeFollowupModal = () => {
    setShowFollowupModal(false);
    setPatientForFollowup(null);
    setFollowupMode('add');
    cancelFollowup();
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch =
      (p.patientId?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.studyNumber?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGroup = filterGroup === "All" || p.groupName === filterGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-teal-700">Patient Management</h1>
        <div className="flex gap-3">
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Download size={18} />
            Export CSV
          </button>
          <button
            onClick={() => {
              resetForm();
              setEditingPatient(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            <Plus size={18} />
            Add Patient
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by patient ID or study number..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="All">All Groups</option>
          {GROUPS.map(g => <option key={g} value={g}>Group {g}</option>)}
        </select>
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
              {editingPatient ? 'Edit Patient' : 'Add New Patient'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient ID
                  </label>
                  <input
                    type="text"
                    value={formData.patientId}
                    onChange={(e) => handleChange('patientId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Study Number
        {/* additional fields could go here */}
                  </label>

                  <input
                    type="text"
                    value={formData.studyNumber}
                    onChange={(e) => handleChange('studyNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group
                  </label>
                  <select
                    value={formData.groupName}
                    onChange={(e) => handleChange('groupName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleChange('age', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recruitment Date
                  </label>
                  <input
                    type="date"
                    value={formData.recruitmentDate}
                    onChange={(e) => handleChange('recruitmentDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proforma Status
                  </label>
                  <select
                    value={formData.proformaStatus}
                    onChange={(e) => handleChange('proformaStatus', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    {PROFORMA_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Follow-up Status
                  </label>
                  <select
                    value={formData.followupStatus}
                    onChange={(e) => handleChange('followupStatus', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    {FOLLOWUP_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.consentTaken}
                    onChange={(e) => handleChange('consentTaken', e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Consent Taken</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.inclusionCriteriaMet}
                    onChange={(e) => handleChange('inclusionCriteriaMet', e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Inclusion Criteria Met</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.exclusionCriteriaMet}
                    onChange={(e) => handleChange('exclusionCriteriaMet', e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Exclusion Criteria Met</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                >
                  {editingPatient ? 'Update Patient' : 'Add Patient'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPatient(null);
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

      {/* followup modal */}
      <AnimatePresence>
        {showFollowupModal && patientForFollowup && (
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
            >
              <h2 className="text-xl font-semibold mb-4">
                {followupMode === 'add' ? 'Add' : 'Follow-ups for'} {patientForFollowup.patientId}
              </h2>
              <div className="mb-4 text-sm">
                <div>ID: {patientForFollowup.patientId}</div>
                <div>Study #: {patientForFollowup.studyNumber}</div>
                <div>Group: {patientForFollowup.groupName}</div>
              </div>
              {followupMode === 'view' && (
                <div className="space-y-2 mb-4">
                  {(followups[patientForFollowup.id] || []).map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="text-sm font-medium">Visit {f.visitNumber || '-'}</div>
                        <div className="text-xs text-gray-600">{f.visitDate ? new Date(f.visitDate).toLocaleDateString() : ''} • {f.status}</div>
                        {f.notes && <div className="text-xs text-gray-500">{f.notes}</div>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { startFollowupEdit(f); setFollowupMode('add'); }} className="text-blue-500">Edit</button>
                        <button onClick={() => onFollowupDelete(f.id)} className="text-red-500">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {followupMode === 'add' && (
                <> 
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Visit #</label>
                      <input
                        type="number"
                        value={followupForm.visitNumber}
                        onChange={e => handleFollowupChange('visitNumber', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={followupForm.visitDate}
                        onChange={e => handleFollowupChange('visitDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={followupForm.status}
                        onChange={e => handleFollowupChange('status', e.target.value)}
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
                        onChange={e => handleFollowupChange('notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 mt-4">
                {followupMode === 'add' ? (
                  <button onClick={saveFollowup} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                ) : (
                  <button onClick={() => setFollowupMode('add')} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Add New</button>
                )}
                <button onClick={closeFollowupModal} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Study #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Age/Gender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proforma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Follow-up
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recruited
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.map((patient, idx) => {
                const statusColors: any = {
                  'Completed': 'bg-blue-100 text-blue-700',
                  'Pending': 'bg-yellow-100 text-yellow-700',
                  'Due': 'bg-green-100 text-green-700',
                  'In Progress': 'bg-orange-100 text-orange-700',
                  'Dropout': 'bg-red-100 text-red-700',
                };

                return (
                  <motion.tr
                    key={patient.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{patient.studyNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {patient.patientId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      Group {patient.groupName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {patient.age} / {patient.gender}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[patient.proformaStatus] || 'bg-gray-100 text-gray-700'}`}>
                        {patient.proformaStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[patient.followupStatus] || 'bg-gray-100 text-gray-700'}`}>
                        {patient.followupStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(patient.recruitmentDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          title="View / add follow-ups"
                          onClick={() => {
                            setPatientForFollowup(patient);
                            setFollowupMode('view');
                            setShowFollowupModal(true);
                            setEditingFollowup(null);
                            // prepare an empty followup for this patient so that
                            // the "Add New" button will have the correct patientId
                            setFollowupForm({
                              id: 0,
                              patientId: patient.id,
                              visitNumber: (followups[patient.id]?.length || 0) + 1,
                              visitDate: new Date().toISOString().split('T')[0],
                              status: "pending",
                              notes: "",
                            });
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Plus size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(patient)}
                          className="text-teal-600 hover:text-teal-900"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this patient?')) {
                              onDelete(patient.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {filteredPatients.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No patients found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
