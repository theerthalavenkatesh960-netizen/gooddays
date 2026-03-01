import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Upload, Download, Trash2, Search, Filter } from "lucide-react";

interface ThesisDocumentsProps {
  documents: any[];
  onUpload: (file: File, category: string) => void;
  onDelete: (id: number) => void;
}

const DOCUMENT_CATEGORIES = [
  "Protocol",
  "Consent Form",
  "Ethics Approval",
  "Case Report Form",
  "Data Collection",
  "Analysis",
  "Manuscript",
  "Presentation",
  "Other"
];

export default function ThesisDocuments({ documents, onUpload, onDelete }: ThesisDocumentsProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadCategory, setUploadCategory] = useState(DOCUMENT_CATEGORIES[0]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file, uploadCategory);
      e.target.value = '';
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
    const matchesSearch = doc.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getDocIcon = (filename: string) => {
    const ext = filename?.split('.').pop()?.toLowerCase();

    if (ext === 'pdf') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
        </svg>
      );
    }

    if (['doc', 'docx'].includes(ext || '')) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-blue-500">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
        </svg>
      );
    }

    return <FileText className="text-gray-500" size={24} />;
  };

  const getStatusBadge = (category: string) => {
    const statusMap: any = {
      'Protocol': { label: 'Approved', color: 'bg-green-100 text-green-700' },
      'Ethics Approval': { label: 'Approved', color: 'bg-green-100 text-green-700' },
      'Consent Form': { label: 'Final', color: 'bg-blue-100 text-blue-700' },
      'Manuscript': { label: 'Draft', color: 'bg-yellow-100 text-yellow-700' },
    };

    return statusMap[category] || null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-teal-700">Document Management</h1>
        <div className="flex items-center gap-3">
          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          >
            {DOCUMENT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition cursor-pointer">
            <Upload size={18} />
            Upload Document
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            />
          </label>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="All">All Categories</option>
          {DOCUMENT_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {filteredDocs.map((doc, idx) => {
          const status = getStatusBadge(doc.category);

          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-3">
                {getDocIcon(doc.name)}
                <div className="flex gap-1">
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <div className="font-medium text-gray-800 text-sm mb-1 truncate" title={doc.name}>
                  {doc.name}
                </div>
                <div className="text-xs text-gray-500">{doc.category}</div>
              </div>

              {status && (
                <div className={`inline-block px-2 py-1 rounded-full text-xs ${status.color} mb-3`}>
                  {status.label}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                {doc.filePath && (
                  <a
                    href={doc.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 transition"
                  >
                    <Download size={14} />
                    Download
                  </a>
                )}
                <button
                  onClick={() => {
                    if (confirm('Delete this document?')) {
                      onDelete(doc.id);
                    }
                  }}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {doc.uploadedAt && (
                <div className="text-xs text-gray-400 mt-2">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {filteredDocs.length === 0 && (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <FileText className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No documents found</h3>
          <p className="text-gray-500">Upload your first document to get started</p>
        </div>
      )}

      <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6 border border-teal-200">
        <h3 className="font-semibold text-gray-800 mb-2">Document Guidelines</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX</li>
          <li>• Maximum file size: 10 MB</li>
          <li>• Use descriptive filenames for better organization</li>
          <li>• Keep protocol and ethics documents up to date</li>
        </ul>
      </div>
    </div>
  );
}
