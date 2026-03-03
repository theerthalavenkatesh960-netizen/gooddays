import { motion } from "framer-motion";
import { CheckCircle2, Users, ClipboardCheck, UserX, BarChart3, Calendar } from "lucide-react";

interface ThesisDashboardProps {
  protocol: any;
  patients: any[];
  followups: Record<string, any[]>;
  deadlines: any[];
}

export default function ThesisDashboard({ protocol, patients, followups, deadlines }: ThesisDashboardProps) {
  const totalSample = protocol?.totalSampleSize || 135;
  const recruited = Array.isArray(patients) ? patients.length : 0;
  const protocolApproved = !!protocol;

  const totalFollowupsNeeded = protocol?.totalFollowups || 20;
  const completedFollowups = Object.values(followups)
    .flat()
    .filter((f: any) => f.status === "completed").length;

  const dropouts = Array.isArray(patients) ? patients.filter((p: any) => p.followupStatus === "Dropout").length : 0;

  const progressPercent = totalSample > 0 ? Math.round((recruited / totalSample) * 100) : 0;

  const upcomingDeadlines = deadlines
    .filter((d: any) => !d.completed)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const groupProgress = (Array.isArray(patients) ? patients : []).reduce((acc: any, p: any) => {
    const group = p.groupName || "Unknown";
    if (!acc[group]) acc[group] = { recruited: 0, target: 0 };
    acc[group].recruited += 1;
    return acc;
  }, {});

  if (protocol?.studyGroups) {
    try {
      const groups = typeof protocol.studyGroups === 'string'
        ? JSON.parse(protocol.studyGroups)
        : protocol.studyGroups;
      groups.forEach((g: any) => {
        if (!groupProgress[g.name]) groupProgress[g.name] = { recruited: 0, target: 0 };
        groupProgress[g.name].target = g.targetSize || 0;
      });
    } catch {}
  }

  const recentPatients = [...patients]
    .sort((a: any, b: any) => new Date(b.recruitmentDate).getTime() - new Date(a.recruitmentDate).getTime())
    .slice(0, 4);

  const monthlyRecruitment = patients.reduce((acc: any, p: any) => {
    const month = new Date(p.recruitmentDate).toLocaleDateString('en', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const months = ['Jan', 'Feb', 'Mar', 'Apr'];
  const recruitmentData = months.map(m => monthlyRecruitment[m] || 0);
  const maxRecruitment = Math.max(...recruitmentData, 1);

  const genderDistribution = patients.reduce((acc: any, p: any) => {
    const gender = p.gender || 'Unknown';
    acc[gender] = (acc[gender] || 0) + 1;
    return acc;
  }, {});

  const maleCount = genderDistribution.Male || 0;
  const femaleCount = genderDistribution.Female || 0;
  const totalGender = maleCount + femaleCount || 1;
  const malePercent = Math.round((maleCount / totalGender) * 100);
  const femalePercent = 100 - malePercent;

  const ageGroups = patients.reduce((acc: any, p: any) => {
    const age = p.age || 0;
    let group = '20-29';
    if (age >= 30 && age < 40) group = '30-39';
    else if (age >= 40 && age < 50) group = '40-49';
    else if (age >= 50) group = '50+';
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {});

  const ageGroupData = ['20-29', '30-39', '40-49', '40+', '50+'].map(g => ageGroups[g] || 0);
  const maxAge = Math.max(...ageGroupData, 1);

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-teal-700">Residency Thesis Management System</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-md p-4 md:p-6"
        >
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Thesis Progress</h2>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto sm:mx-0 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  stroke="#e5e7eb"
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  stroke="url(#progressGradient)"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${progressPercent * 5.65} 565`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl md:text-4xl font-bold text-gray-800">{progressPercent}%</div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-2 md:space-y-3">
              <div className="flex items-center gap-2 md:gap-3 text-sm md:text-base">
                <CheckCircle2 className="text-green-500 flex-shrink-0" size={20} />
                <span className="text-gray-700">Protocol Approved</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-sm md:text-base">
                <CheckCircle2 className={protocolApproved ? "text-green-500" : "text-gray-300"} size={20} />
                <span className="text-gray-700">{recruited} / {totalSample} Patients</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-sm md:text-base">
                <CheckCircle2 className="text-green-500 flex-shrink-0" size={20} />
                <span className="text-gray-700">{completedFollowups} / {totalFollowupsNeeded} Follow-Ups</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-md p-4 md:p-6"
        >
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Upcoming Deadlines</h2>

          <div className="space-y-2 md:space-y-3">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-gray-500 text-sm md:text-base">No upcoming deadlines</p>
            ) : (
              upcomingDeadlines.map((d: any, idx: number) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm md:text-base">
                  <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                    <span className="font-medium text-gray-700 truncate">{d.title}</span>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${idx === 2 ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                    <span className="text-gray-600">{new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl shadow-md p-4 md:p-6 text-white"
        >
          <div className="text-xs md:text-sm font-medium mb-2">Total Sample Size</div>
          <div className="text-2xl md:text-4xl font-bold">{totalSample}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-md p-4 md:p-6 text-white"
        >
          <div className="text-xs md:text-sm font-medium mb-2">Patients Recruited</div>
          <div className="text-2xl md:text-4xl font-bold">{recruited}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-md p-4 md:p-6 text-white"
        >
          <div className="text-xs md:text-sm font-medium mb-2">Follow-Ups Completed</div>
          <div className="text-2xl md:text-4xl font-bold">{completedFollowups}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gradient-to-br from-red-400 to-red-500 rounded-2xl shadow-md p-4 md:p-6 text-white"
        >
          <div className="text-xs md:text-sm font-medium mb-2">Dropouts</div>
          <div className="text-2xl md:text-4xl font-bold">{dropouts}</div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-md p-4 md:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-800">Recruitment Overview</h2>
            <button className="text-xs md:text-sm text-teal-600 font-medium">More</button>
          </div>

          <div className="mb-2 text-xs md:text-sm text-gray-600">Patients Recruited</div>
          <div className="flex items-end gap-1 md:gap-2 h-24 md:h-32">
            {recruitmentData.map((count, idx) => (
              <div key={months[idx]} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-gradient-to-t from-orange-400 to-orange-300 rounded-t"
                     style={{ height: `${(count / maxRecruitment) * 100}%` }}></div>
                <div className="text-xs text-gray-600">{months[idx]}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-2xl shadow-md p-4 md:p-6"
        >
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Group Progress</h2>

          <div className="space-y-2 md:space-y-3">
            {Object.entries(groupProgress).map(([name, data]: [string, any]) => {
              const percent = data.target > 0 ? (data.recruited / data.target) * 100 : 0;
              const colors: any = {
                'A': 'bg-blue-500',
                'B': 'bg-green-500',
                'C': 'bg-orange-500',
              };

              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1 text-sm md:text-base">
                    <span className="font-medium text-gray-700">Group {name}</span>
                    <span className="text-xs md:text-sm text-gray-600">{data.recruited} / {data.target}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 md:h-6">
                    <div
                      className={`${colors[name] || 'bg-gray-500'} h-4 md:h-6 rounded-full transition-all`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-md p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Documents</h2>
            <button className="text-sm text-teal-600 font-medium">Export</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'Protocol.pdf', status: 'Approved' },
              { name: 'Consent Form.pdf', status: 'Pending' },
              { name: 'IEC Approval.pdf', status: 'Pending' },
              { name: 'Thesis Draft.docx', status: 'Draft' },
            ].map((doc, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex items-start gap-2 mb-2">
                  <div className="text-red-500">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                    </svg>
                  </div>
                  <button className="ml-auto">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                  </button>
                </div>
                <div className="text-sm font-medium text-gray-800 mb-1">{doc.name}</div>
                {doc.status === 'Approved' && (
                  <div className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    {doc.status}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="bg-white rounded-2xl shadow-md p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Recent Patients</h2>
            <select className="text-sm border rounded px-2 py-1">
              <option>All</option>
            </select>
          </div>

          <div className="space-y-3">
            {recentPatients.map((p: any) => {
              const statusColors: any = {
                'Completed': 'bg-blue-100 text-blue-700',
                'Pending': 'bg-yellow-100 text-yellow-700',
                'Due': 'bg-green-100 text-green-700',
              };

              const status = p.followupStatus || 'Pending';

              return (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm">#{p.studyNumber}</span>
                    <span className="font-medium text-gray-700">{p.patientId || 'Patient'}</span>
                    <span className="text-gray-500 text-sm">{p.groupName ? `Group ${p.groupName}` : 'Control'}</span>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
                    {p.proformaStatus || status}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-2xl shadow-md p-6"
      >
        <h2 className="text-xl font-bold text-gray-800 mb-6">Study Statistics</h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-700 mb-4">Gender Distribution</h3>
            <div className="flex items-center gap-8">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" fill="#3b82f6" />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="#ef4444"
                    strokeDasharray={`${femalePercent * 4.4} 440`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">Male</div>
                    <div className="text-xl text-white">{malePercent}%</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-700">Male</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <span className="text-sm text-gray-700">Female</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-4">Age Distribution</h3>
            <div className="flex items-end gap-2 h-32">
              {['20-29', '30-39', '40-49', '40+', '50+'].map((age, idx) => {
                const count = ageGroupData[idx];
                const height = (count / maxAge) * 100;
                const isHighest = idx === 0;

                return (
                  <div key={age} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t ${isHighest ? 'bg-blue-500' : 'bg-red-400'}`}
                      style={{ height: `${height}%` }}
                    ></div>
                    <div className="text-xs text-gray-600">{age}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
