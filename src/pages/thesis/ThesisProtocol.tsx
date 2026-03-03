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
    ]),
    guideName: protocol?.guideName || "",
    department: protocol?.department || "",
    college: protocol?.college || "",
    startDate: protocol?.startDate ? protocol.startDate.split('T')[0] : "",
    endDate: protocol?.endDate ? protocol.endDate.split('T')[0] : "",
    protocolApproved: protocol?.protocolApproved || false,
    approvalDate: protocol?.approvalDate ? protocol.approvalDate.split('T')[0] : "",
    iecNumber: protocol?.iecNumber || "",
    synopsisSubmitted: protocol?.synopsisSubmitted || false,
    synopsisApproved: protocol?.synopsisApproved || false,
    ethicsSubmitted: protocol?.ethicsSubmitted || false,
    ethicsApproved: protocol?.ethicsApproved || false,
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
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-teal-700">Study Protocol</h1>
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center justify-center sm:justify-start gap-2 px-3 md:px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm md:text-base w-full sm:w-auto"
          >
            <Edit2 size={18} />
            Edit Protocol
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-md p-4 md:p-8"
        >
          <div className="space-y-4 md:space-y-6">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-2">{protocol.title}</h2>
              <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-gray-600">
                <span className="px-2 md:px-3 py-1 bg-blue-100 text-blue-700 rounded-full">{protocol.studyType}</span>
                <span>Sample Size: {protocol.totalSampleSize}</span>
                <span>Follow-ups: {protocol.totalFollowups}</span>
                {protocol.guideName && <span>Guide: {protocol.guideName}</span>}
                {protocol.department && <span>Dept: {protocol.department}</span>}
                {protocol.college && <span>College: {protocol.college}</span>}
              </div>
            </div>

            {protocol.objective && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">Objective</h3>
                <p className="text-gray-600 text-sm md:text-base">{protocol.objective}</p>
              </div>
            )}

            {protocol.inclusionCriteria && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">Inclusion Criteria</h3>
                <p className="text-gray-600 whitespace-pre-line text-sm md:text-base">{protocol.inclusionCriteria}</p>
              </div>
            )}

            {protocol.exclusionCriteria && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">Exclusion Criteria</h3>
                <p className="text-gray-600 whitespace-pre-line text-sm md:text-base">{protocol.exclusionCriteria}</p>
              </div>
            )}

            {studyGroups.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 text-sm md:text-base">Study Groups</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  {studyGroups.map((group: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-3 md:p-4">
                      <div className="font-semibold text-gray-800 text-sm md:text-base">Group {group.name}</div>
                      <div className="text-xs md:text-sm text-gray-600">Target: {group.targetSize} patients</div>
                      <div className="text-xs md:text-sm text-gray-500 mt-1">{group.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {protocol.studyDuration && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">Study Duration</h3>
                <p className="text-gray-600 text-sm md:text-base">{protocol.studyDuration}</p>
              </div>
            )}

            {/* additional meta */}
            {(protocol.startDate || protocol.endDate || protocol.iecNumber) && (
              <div className="mt-4">
                <h3 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">Dates &amp; Approval</h3>
                <div className="text-xs md:text-sm text-gray-600 space-y-1">
                  {protocol.startDate && <div>Start: {new Date(protocol.startDate).toLocaleDateString()}</div>}
                  {protocol.endDate && <div>End: {new Date(protocol.endDate).toLocaleDateString()}</div>}
                  {protocol.protocolApproved && <div>Protocol approved{protocol.approvalDate ? ` on ${new Date(protocol.approvalDate).toLocaleDateString()}` : ''}</div>}
                  {protocol.iecNumber && <div>IEC#: {protocol.iecNumber}</div>}
                  {protocol.synopsisSubmitted && <div>Synopsis submitted{protocol.synopsisApproved ? ' (approved)' : ''}</div>}
                  {protocol.ethicsSubmitted && <div>Ethics submitted{protocol.ethicsApproved ? ' (approved)' : ''}</div>}
                </div>
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

          {/* guide/department/college */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guide Name
              </label>
              <input
                type="text"
                value={formData.guideName}
                onChange={(e) => handleChange('guideName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                College
              </label>
              <input
                type="text"
                value={formData.college}
                onChange={(e) => handleChange('college', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* dates and approval info */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={formData.protocolApproved}
                onChange={(e) => handleChange('protocolApproved', e.target.checked)}
                className="h-4 w-4 text-teal-600 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Protocol approved</label>
            </div>
          </div>
          {formData.protocolApproved && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approval Date
              </label>
              <input
                type="date"
                value={formData.approvalDate}
                onChange={(e) => handleChange('approvalDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IEC Number
              </label>
              <input
                type="text"
                value={formData.iecNumber}
                onChange={(e) => handleChange('iecNumber', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={formData.synopsisSubmitted}
                onChange={(e) => handleChange('synopsisSubmitted', e.target.checked)}
                className="h-4 w-4 text-teal-600 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Synopsis submitted</label>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={formData.synopsisApproved}
                onChange={(e) => handleChange('synopsisApproved', e.target.checked)}
                className="h-4 w-4 text-teal-600 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Synopsis approved</label>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={formData.ethicsSubmitted}
                onChange={(e) => handleChange('ethicsSubmitted', e.target.checked)}
                className="h-4 w-4 text-teal-600 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Ethics submitted</label>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={formData.ethicsApproved}
                onChange={(e) => handleChange('ethicsApproved', e.target.checked)}
                className="h-4 w-4 text-teal-600 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Ethics approved</label>
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
