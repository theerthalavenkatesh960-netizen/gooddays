import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Edit2, FileText } from "lucide-react";

interface ThesisProtocolProps {
  protocol: any;
  onSave: (data: any) => void;
}

const STUDY_TYPES = [
  "Randomized Controlled Trial",
  "Observational Study",
  "Prospective Study",
  "Retrospective Study",
  "Case-Control Study",
  "Cohort Study"
];

export default function ThesisProtocol({ protocol, onSave }: ThesisProtocolProps) {
  const [isEditing, setIsEditing] = useState(!protocol);
  const [formData, setFormData] = useState({
    title: protocol?.title || "",
    studyType: protocol?.studyType || STUDY_TYPES[0],
    totalSampleSize: protocol?.totalSampleSize || 135,
    totalFollowups: protocol?.totalFollowups || 20,
    objective: protocol?.objective || "",
    inclusionCriteria: protocol?.inclusionCriteria || "",
    exclusionCriteria: protocol?.exclusionCriteria || "",
    studyDuration: protocol?.studyDuration || "",
    studyGroups: protocol?.studyGroups || JSON.stringify([
      { name: "A", targetSize: 60, description: "Treatment Group" },
      { name: "B", targetSize: 45, description: "Control Group" },
      { name: "C", targetSize: 30, description: "Placebo Group" }
    ])
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setIsEditing(false);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isEditing && protocol) {
    let studyGroups = [];
    try {
      studyGroups = typeof protocol.studyGroups === 'string'
        ? JSON.parse(protocol.studyGroups)
        : protocol.studyGroups || [];
    } catch {}

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-teal-700">Study Protocol</h1>
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            <Edit2 size={18} />
            Edit Protocol
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-md p-8"
        >
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">{protocol.title}</h2>
              <div className="flex gap-4 text-sm text-gray-600">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">{protocol.studyType}</span>
                <span>Sample Size: {protocol.totalSampleSize}</span>
                <span>Follow-ups: {protocol.totalFollowups}</span>
              </div>
            </div>

            {protocol.objective && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Objective</h3>
                <p className="text-gray-600">{protocol.objective}</p>
              </div>
            )}

            {protocol.inclusionCriteria && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Inclusion Criteria</h3>
                <p className="text-gray-600 whitespace-pre-line">{protocol.inclusionCriteria}</p>
              </div>
            )}

            {protocol.exclusionCriteria && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Exclusion Criteria</h3>
                <p className="text-gray-600 whitespace-pre-line">{protocol.exclusionCriteria}</p>
              </div>
            )}

            {studyGroups.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Study Groups</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {studyGroups.map((group: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="font-semibold text-gray-800">Group {group.name}</div>
                      <div className="text-sm text-gray-600">Target: {group.targetSize} patients</div>
                      <div className="text-sm text-gray-500 mt-1">{group.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {protocol.studyDuration && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Study Duration</h3>
                <p className="text-gray-600">{protocol.studyDuration}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-teal-700">
        {protocol ? 'Edit Protocol' : 'Create Protocol'}
      </h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-md p-8"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Study Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Enter study title"
              required
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Study Type
              </label>
              <select
                value={formData.studyType}
                onChange={(e) => handleChange('studyType', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {STUDY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Sample Size
              </label>
              <input
                type="number"
                value={formData.totalSampleSize}
                onChange={(e) => handleChange('totalSampleSize', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Follow-ups
              </label>
              <input
                type="number"
                value={formData.totalFollowups}
                onChange={(e) => handleChange('totalFollowups', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Study Objective
            </label>
            <textarea
              value={formData.objective}
              onChange={(e) => handleChange('objective', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              rows={3}
              placeholder="Describe the main objective of the study"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inclusion Criteria
            </label>
            <textarea
              value={formData.inclusionCriteria}
              onChange={(e) => handleChange('inclusionCriteria', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              rows={4}
              placeholder="List inclusion criteria (one per line)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exclusion Criteria
            </label>
            <textarea
              value={formData.exclusionCriteria}
              onChange={(e) => handleChange('exclusionCriteria', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              rows={4}
              placeholder="List exclusion criteria (one per line)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Study Duration
            </label>
            <input
              type="text"
              value={formData.studyDuration}
              onChange={(e) => handleChange('studyDuration', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., 12 months"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
            >
              <Save size={18} />
              Save Protocol
            </button>
            {protocol && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
