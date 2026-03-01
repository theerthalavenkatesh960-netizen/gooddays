import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Settings as SettingsIcon,
  Download,
  Edit,
  FileText,
  Calendar as CalIcon,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

const STUDY_TYPES = ['Randomized Trial', 'Observational', 'Prospective', 'Retrospective'];

export default function Thesis() {
  const { user } = useAuth();
  const [protocol, setProtocol] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  const [showProtocolForm, setShowProtocolForm] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [loading, setLoading] = useState(false);

  const blankPatient = {
    patientId: '',
    studyNumber: '',
    groupName: 'A',
    recruitmentDate: new Date().toISOString(),
    consentTaken: false,
    inclusionCriteriaMet: false,
    exclusionCriteriaMet: false,
    proformaStatus: 'Pending',
    followupStatus: 'Pending',
    notes: '',
  };

  const [patientForm, setPatientForm] = useState<any>(blankPatient);

  useEffect(() => {
    if (user) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [p, pts, docs, dls] = await Promise.all([
        api.getThesisProtocol(user.id),
        api.getPatients(user.id),
        api.getDocuments(user.id),
        api.getDeadlines(user.id),
      ]);
      setProtocol(p || null);
      setPatients(pts || []);
      setDocuments(docs || []);
      setDeadlines(dls || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveProtocol = async (data: any) => {
    if (!user) return;
    const payload = { ...data, userId: user.id };
    if (protocol && protocol.id) {
      await api.updateProtocol(protocol.id, payload);
    } else {
      await api.createProtocol(payload);
    }
    loadAll();
    setShowProtocolForm(false);
  };

  const createOrUpdatePatient = async () => {
    if (!user) return;
    const payload = { ...patientForm, userId: user.id };
    if (editingPatient && editingPatient.id) {
      await api.updatePatient(editingPatient.id, payload);
    } else {
      await api.createPatient(payload);
    }
    setPatientForm(blankPatient);
    setEditingPatient(null);
    setShowAddPatient(false);
    loadAll();
  };

  const removePatient = async (id: string) => {
    if (!confirm('Delete this patient?')) return;
    await api.deletePatient(id);
    loadAll();
  };

  const uploadDoc = async (file: File, category: string) => {
    if (!user) return;
    await api.uploadDocument(user.id, file, category);
    loadAll();
  };

  const exportPatients = async () => {
    if (!user) return;
    const csv = await api.exportPatientsCsv(user.id);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patients.csv';
    a.click();
  };

  const stats = useMemo(() => {
    const total = protocol?.totalSampleSize || 0;
    const groupCounts = { A: 0, B: 0, C: 0 } as any;
    patients.forEach((p) => {
      if (p.groupName) groupCounts[p.groupName] = (groupCounts[p.groupName] || 0) + 1;
    });
    const recruited = patients.length;
    const completedFollowups = patients.reduce((acc, p) => acc + (p.followups?.filter((f:any)=>f.completed).length || 0), 0);
    const dropouts = patients.reduce((acc, p) => acc + (p.droppedOut ? 1 : 0), 0);
    return { total, groupCounts, recruited, completedFollowups, dropouts };
  }, [protocol, patients]);

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Thesis Protocol
          </h1>
          <p className="text-sm text-gray-500">Professional residency thesis management</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowProtocolForm((s) => !s)}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold flex items-center gap-2"
          >
            <SettingsIcon size={16} />
            Edit Protocol
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportPatients}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl font-semibold flex items-center gap-2"
          >
            <Download size={16} />
            Export Patients
          </motion.button>
        </div>
      </div>

      {/* Protocol form */}
      <AnimatePresence>
        {showProtocolForm && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget as HTMLFormElement);
              const payload: any = {
                title: form.get('title'),
                guideName: form.get('guideName'),
                coGuideName: form.get('coGuideName'),
                department: form.get('department'),
                studyType: form.get('studyType'),
                protocolSubmittedDate: form.get('protocolSubmittedDate'),
                protocolApprovedDate: form.get('protocolApprovedDate'),
                iecApprovalNumber: form.get('iecApprovalNumber'),
                trialRegistrationNumber: form.get('trialRegistrationNumber'),
                synopsisStatus: form.get('synopsisStatus'),
                totalSampleSize: Number(form.get('totalSampleSize') || 0),
              };
              saveProtocol(payload);
            }}
            className="bg-white rounded-2xl p-6 shadow-xl mb-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600">Thesis Title</label>
                <input defaultValue={protocol?.title || ''} name="title" className="w-full px-3 py-2 rounded-xl border" />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Guide Name</label>
                <input defaultValue={protocol?.guideName || ''} name="guideName" className="w-full px-3 py-2 rounded-xl border" />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Co-Guide Name</label>
                <input defaultValue={protocol?.coGuideName || ''} name="coGuideName" className="w-full px-3 py-2 rounded-xl border" />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Department</label>
                <input defaultValue={protocol?.department || ''} name="department" className="w-full px-3 py-2 rounded-xl border" />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Study Type</label>
                <select defaultValue={protocol?.studyType || STUDY_TYPES[0]} name="studyType" className="w-full px-3 py-2 rounded-xl border">
                  {STUDY_TYPES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Total Sample Size</label>
                <input defaultValue={protocol?.totalSampleSize || 0} name="totalSampleSize" type="number" className="w-full px-3 py-2 rounded-xl border" />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Protocol Submitted</label>
                <input defaultValue={protocol?.protocolSubmittedDate ? format(parseISO(protocol.protocolSubmittedDate), 'yyyy-MM-dd') : ''} name="protocolSubmittedDate" type="date" className="w-full px-3 py-2 rounded-xl border" />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Protocol Approved</label>
                <input defaultValue={protocol?.protocolApprovedDate ? format(parseISO(protocol.protocolApprovedDate), 'yyyy-MM-dd') : ''} name="protocolApprovedDate" type="date" className="w-full px-3 py-2 rounded-xl border" />
              </div>
              <div>
                <label className="block text-sm text-gray-600">IEC Approval #</label>
                <input defaultValue={protocol?.iecApprovalNumber || ''} name="iecApprovalNumber" className="w-full px-3 py-2 rounded-xl border" />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Trial Reg. #</label>
                <input defaultValue={protocol?.trialRegistrationNumber || ''} name="trialRegistrationNumber" className="w-full px-3 py-2 rounded-xl border" />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Synopsis Status</label>
                <select defaultValue={protocol?.synopsisStatus || 'Not Started'} name="synopsisStatus" className="w-full px-3 py-2 rounded-xl border">
                  <option>Not Started</option>
                  <option>Submitted</option>
                  <option>Approved</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="w-2/3">
                <div className="text-sm text-gray-500">Protocol completion</div>
                <div className="w-full bg-gray-100 rounded-full h-3 mt-2">
                  <div className="h-3 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, ((protocol?.completion || 0) * 100) || 20)}%` }} />
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl">Save</motion.button>
                <motion.button type="button" onClick={() => setShowProtocolForm(false)} className="px-4 py-2 bg-gray-200 rounded-xl">Cancel</motion.button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Overview: Sample size cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow">
          <div className="text-sm text-gray-500">Total Sample Size</div>
          <div className="text-3xl font-bold">{protocol?.totalSampleSize || 0}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow">
          <div className="text-sm text-gray-500">Recruited Patients</div>
          <div className="text-3xl font-bold">{stats.recruited}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow">
          <div className="text-sm text-gray-500">Completed Followups</div>
          <div className="text-3xl font-bold">{stats.completedFollowups}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow">
          <div className="text-sm text-gray-500">Dropouts</div>
          <div className="text-3xl font-bold">{stats.dropouts}</div>
        </div>
      </div>

      {/* Groups progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(['A','B','C'] as const).map((g) => {
          const groupSize = protocol?.[`group_${g}_size`] || 0;
          const count = stats.groupCounts[g] || 0;
          const pct = groupSize ? Math.round((count / groupSize) * 100) : 0;
          return (
            <motion.div key={g} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Group {g}</div>
                  <div className="text-2xl font-bold">{count}/{groupSize}</div>
                </div>
                <div className="text-sm text-gray-500">{pct}%</div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 mt-4">
                <div className={`h-3 rounded-full bg-emerald-500 transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Patient management */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Patients</h2>
          <div className="flex gap-2">
            <motion.button whileHover={{ scale: 1.03 }} onClick={() => { setShowAddPatient(true); setEditingPatient(null); setPatientForm(blankPatient); }} className="px-4 py-2 bg-emerald-500 text-white rounded-xl flex items-center gap-2"><Plus size={14}/> Add Patient</motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patients.map((p) => (
            <motion.div key={p.id} whileHover={{ scale: 1.01 }} className="p-4 rounded-xl border shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">{p.groupName}</span>
                    <div className="text-sm text-gray-500">{format(new Date(p.recruitmentDate || p.createdAt || Date.now()), 'MMM d, yyyy')}</div>
                    <div className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${p.proformaStatus === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.proformaStatus}</div>
                  </div>
                  <div className="text-gray-700 mb-2">Study #: {p.studyNumber || p.patientId}</div>
                  <div className="text-sm text-gray-600 mb-2">{p.notes}</div>

                  {/* followup timeline */}
                  <div className="flex items-center gap-2">
                    {(p.followups || []).map((f:any, i:number) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className={`inline-flex w-6 h-6 items-center justify-center text-white text-xs rounded ${f.completed ? 'bg-emerald-500' : 'bg-red-500'}`}>{f.completed ? '✓' : '✗'}</div>
                        <div className="text-xs text-gray-500">{f.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingPatient(p); setPatientForm({ ...p }); setShowAddPatient(true); }} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><Edit size={16}/></button>
                    <button onClick={() => removePatient(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                  </div>
                  <div className="text-xs text-gray-400">ID: {p.patientId}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Add / Edit patient drawer */}
      <AnimatePresence>
        {showAddPatient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black bg-opacity-40">
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:w-3/4 max-w-3xl">
              <h3 className="text-lg font-bold mb-4">{editingPatient ? 'Edit Patient' : 'Add Patient'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={patientForm.studyNumber} onChange={(e)=>setPatientForm({...patientForm, studyNumber:e.target.value})} placeholder="Study Number" className="px-3 py-2 rounded-xl border" />
                <select value={patientForm.groupName} onChange={(e)=>setPatientForm({...patientForm, groupName:e.target.value})} className="px-3 py-2 rounded-xl border">
                  <option value="A">Group A</option>
                  <option value="B">Group B</option>
                  <option value="C">Group C</option>
                </select>
                <input value={patientForm.recruitmentDate?.slice(0,10)} onChange={(e)=>setPatientForm({...patientForm, recruitmentDate:e.target.value})} type="date" className="px-3 py-2 rounded-xl border" />
                <label className="flex items-center gap-2"><input type="checkbox" checked={patientForm.consentTaken} onChange={(e)=>setPatientForm({...patientForm, consentTaken:e.target.checked})}/> Consent</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={patientForm.inclusionCriteriaMet} onChange={(e)=>setPatientForm({...patientForm, inclusionCriteriaMet:e.target.checked})}/> Inclusion</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={patientForm.exclusionCriteriaMet} onChange={(e)=>setPatientForm({...patientForm, exclusionCriteriaMet:e.target.checked})}/> Exclusion</label>
                <select value={patientForm.proformaStatus} onChange={(e)=>setPatientForm({...patientForm, proformaStatus:e.target.value})} className="px-3 py-2 rounded-xl border">
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
                <select value={patientForm.followupStatus} onChange={(e)=>setPatientForm({...patientForm, followupStatus:e.target.value})} className="px-3 py-2 rounded-xl border">
                  <option value="Pending">Pending</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                </select>
                <input value={patientForm.notes} onChange={(e)=>setPatientForm({...patientForm, notes:e.target.value})} placeholder="Notes" className="px-3 py-2 rounded-xl border md:col-span-3" />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={()=>{ setShowAddPatient(false); setEditingPatient(null); setPatientForm(blankPatient); }} className="px-4 py-2 bg-gray-200 rounded-xl">Cancel</button>
                <button onClick={createOrUpdatePatient} className="px-4 py-2 bg-emerald-500 text-white rounded-xl">Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Documents & deadlines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Documents</h3>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg cursor-pointer">
                <FileText size={14} /> Upload
                <input type="file" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) uploadDoc(f,'protocol'); }} className="hidden" />
              </label>
            </div>
          </div>
          <div className="space-y-2">
            {documents.map((d)=> (
              <div key={d.id} className="flex items-center justify-between p-2 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">{d.name}</div>
                  <div className="text-xs text-gray-400">{format(new Date(d.date || d.createdAt), 'MMM d')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={d.url || '#'} className="px-3 py-1 bg-gray-100 rounded">Download</a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Deadlines</h3>
            <div className="text-sm text-gray-400">Timeline</div>
          </div>
          <div className="space-y-3">
            {deadlines.map(dl => (
              <div key={dl.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{dl.title}</div>
                  <div className="text-xs text-gray-400">{format(new Date(dl.date), 'MMM d, yyyy')}</div>
                </div>
                <div className={`px-2 py-1 rounded ${dl.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>{dl.completed ? 'Done' : 'Pending'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Simple stats chart (SVG) */}
      <div className="bg-white rounded-2xl p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Recruitment Overview</h3>
          <div className="text-sm text-gray-500">Live</div>
        </div>
        <div className="flex gap-4 items-end">
          {(['A','B','C'] as const).map((g,i)=>(
            <div key={g} className="flex-1">
              <div className="h-36 flex items-end">
                <div className="w-full bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-t" style={{height:`${((stats.groupCounts[g]||0)/(protocol?.[`group_${g}_size`]||1))*100||5}%`}} />
              </div>
              <div className="text-center mt-2 font-medium">Group {g}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
