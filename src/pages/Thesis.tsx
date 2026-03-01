import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, FileText, Users, BarChart3, Calendar, ClipboardList } from "lucide-react";
import * as api from "../lib/api";
import { useAuth } from "../contexts/AuthContextApi";

import ThesisDashboard from "./thesis/ThesisDashboard";
import ThesisProtocol from "./thesis/ThesisProtocol";
import ThesisPatients from "./thesis/ThesisPatients";
import ThesisDocuments from "./thesis/ThesisDocuments";
import ThesisStatistics from "./thesis/ThesisStatistics";
import ThesisDeadlines from "./thesis/ThesisDeadlines";

type Tab = "Dashboard" | "Protocol" | "Patients" | "Documents" | "Statistics" | "Deadlines";

const TABS: { name: Tab; icon: any }[] = [
  { name: "Dashboard", icon: Briefcase },
  { name: "Protocol", icon: ClipboardList },
  { name: "Patients", icon: Users },
  { name: "Documents", icon: FileText },
  { name: "Statistics", icon: BarChart3 },
  { name: "Deadlines", icon: Calendar },
];

export default function Thesis() {
  const { user } = useAuth();

  if (!user) return null;

  const [selectedTab, setSelectedTab] = useState<Tab>("Dashboard");

  const [protocol, setProtocol] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [followupsByPatient, setFollowupsByPatient] = useState<Record<string, any[]>>({});

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (selectedTab === "Dashboard" || selectedTab === "Statistics") {
      if (patients.length > 0) {
        loadFollowups();
      }
    }
  }, [selectedTab, patients]);

  const loadAll = async () => {
    try {
      const [p, pts, docs, dls] = await Promise.all([
        api.getThesisProtocol(user.id),
        api.getPatients(user.id),
        api.getDocuments(user.id),
        api.getDeadlines(user.id)
      ]);

      setProtocol(p || null);
      setPatients(pts || []);
      setDocuments(docs || []);
      setDeadlines(dls || []);
    } catch (error) {
      console.error('Error loading thesis data:', error);
    }
  };

  const loadFollowups = async () => {
    try {
      const results = await Promise.all(
        patients.map(async p => {
          const arr = await api.getFollowups(p.id);
          return { id: p.id, arr: arr || [] };
        })
      );

      const map: Record<string, any[]> = {};
      results.forEach(r => map[r.id] = r.arr);
      setFollowupsByPatient(map);
    } catch (error) {
      console.error('Error loading followups:', error);
    }
  };

  const saveProtocol = async (data: any) => {
    try {
      const payload = { ...data, userId: user.id };

      if (protocol?.id) {
        await api.updateProtocol(protocol.id, payload);
      } else {
        await api.createProtocol(payload);
      }

      loadAll();
    } catch (error) {
      console.error('Error saving protocol:', error);
    }
  };

  const createFollowup = async (data: any) => {
    try {
      await api.createFollowup(data);
      loadAll();
    } catch (error) {
      console.error('Error creating followup:', error);
    }
  };

  const updateFollowup = async (id: number, data: any) => {
    try {
      await api.updateFollowup(id, data);
      loadAll();
    } catch (error) {
      console.error('Error updating followup:', error);
    }
  };

  const deleteFollowup = async (id: number) => {
    try {
      await api.deleteFollowup(id);
      loadAll();
    } catch (error) {
      console.error('Error deleting followup:', error);
    }
  };

  const createPatient = async (data: any) => {
    try {
      const payload = { ...data, userId: user.id };
      await api.createPatient(payload);
      loadAll();
    } catch (error) {
      console.error('Error creating patient:', error);
    }
  };

  const updatePatient = async (id: number, data: any) => {
    try {
      await api.updatePatient(id, data);
      loadAll();
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  };

  const deletePatient = async (id: number) => {
    try {
      await api.deletePatient(id);
      loadAll();
    } catch (error) {
      console.error('Error deleting patient:', error);
    }
  };

  const exportPatients = async () => {
    try {
      const csv = await api.exportPatientsCsv(user.id);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "patients.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting patients:', error);
    }
  };

  const uploadDocument = async (file: File, category: string) => {
    try {
      await api.uploadDocument(user.id, file, category);
      loadAll();
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  const deleteDocument = async (id: number) => {
    try {
      const response = await fetch(`${(import.meta as any).env?.VITE_API_URL || ''}/api/thesis/documents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${api.getSession()?.access_token}`
        }
      });
      if (response.ok) {
        loadAll();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const createDeadline = async (data: any) => {
    try {
      const payload = { ...data, userId: user.id };
      await api.createDeadline(payload);
      loadAll();
    } catch (error) {
      console.error('Error creating deadline:', error);
    }
  };

  const updateDeadline = async (id: number, data: any) => {
    try {
      await api.updateDeadline(id, data);
      loadAll();
    } catch (error) {
      console.error('Error updating deadline:', error);
    }
  };

  const deleteDeadline = async (id: number) => {
    try {
      await api.deleteDeadline(id);
      loadAll();
    } catch (error) {
      console.error('Error deleting deadline:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
      <div className="bg-teal-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-8">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = selectedTab === tab.name;

                return (
                  <button
                    key={tab.name}
                    onClick={() => setSelectedTab(tab.name)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      isActive
                        ? 'bg-white text-teal-700 shadow-md'
                        : 'text-white hover:bg-teal-500'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <span className="text-teal-700 font-semibold">
                  {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="text-white">
                <div className="text-sm font-medium">{user.name || 'Dr. User'}</div>
                <div className="text-xs opacity-75">{user.email}</div>
              </div>
            </div> */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {selectedTab === "Dashboard" && (
            <ThesisDashboard
              protocol={protocol}
              patients={patients}
              followups={followupsByPatient}
              deadlines={deadlines}
            />
          )}

          {selectedTab === "Protocol" && (
            <ThesisProtocol
              protocol={protocol}
              onSave={saveProtocol}
            />
          )}

          {selectedTab === "Patients" && (
            <ThesisPatients
              patients={patients}
              onCreate={createPatient}
              onUpdate={updatePatient}
              onDelete={deletePatient}
              onExport={exportPatients}
              followups={followupsByPatient}
              onFollowupCreate={createFollowup}
              onFollowupUpdate={updateFollowup}
              onFollowupDelete={deleteFollowup}
            />
          )}

          {selectedTab === "Documents" && (
            <ThesisDocuments
              documents={documents}
              onUpload={uploadDocument}
              onDelete={deleteDocument}
            />
          )}

          {selectedTab === "Statistics" && (
            <ThesisStatistics
              patients={patients}
              followups={followupsByPatient}
              protocol={protocol}
            />
          )}

          {selectedTab === "Deadlines" && (
            <ThesisDeadlines
              deadlines={deadlines}
              onCreate={createDeadline}
              onUpdate={updateDeadline}
              onDelete={deleteDeadline}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
