import { motion } from "framer-motion";
import { TrendingUp, Users, CheckCircle2, XCircle } from "lucide-react";

interface ThesisStatisticsProps {
  patients: any[];
  followups: Record<string, any[]>;
  protocol: any;
}

export default function ThesisStatistics({ patients, followups, protocol }: ThesisStatisticsProps) {
  const totalRecruited = patients.length;
  const totalSample = protocol?.totalSampleSize || 135;
  const dropouts = patients.filter((p: any) => p.followupStatus === "Dropout").length;
  const dropoutPercent = totalRecruited > 0 ? ((dropouts / totalRecruited) * 100).toFixed(1) : 0;

  const completedFollowups = Object.values(followups)
    .flat()
    .filter((f: any) => f.status === "completed").length;

  const totalFollowupsNeeded = protocol?.totalFollowups || 20;
  const followupPercent = totalFollowupsNeeded > 0
    ? ((completedFollowups / totalFollowupsNeeded) * 100).toFixed(1)
    : 0;

  const recruitmentRate = totalSample > 0 ? ((totalRecruited / totalSample) * 100).toFixed(1) : 0;

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

  const ageGroupLabels = ['20-29', '30-39', '40-49', '50+'];
  const ageGroupData = ageGroupLabels.map(g => ageGroups[g] || 0);
  const maxAge = Math.max(...ageGroupData, 1);

  const groupStats = patients.reduce((acc: any, p: any) => {
    const group = p.groupName || 'Unknown';
    if (!acc[group]) acc[group] = { recruited: 0, completed: 0, dropouts: 0 };
    acc[group].recruited += 1;
    if (p.followupStatus === 'Completed') acc[group].completed += 1;
    if (p.followupStatus === 'Dropout') acc[group].dropouts += 1;
    return acc;
  }, {});

  const monthlyData = patients.reduce((acc: any, p: any) => {
    const month = new Date(p.recruitmentDate).toLocaleDateString('en', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const recruitmentData = months.map(m => monthlyData[m] || 0);
  const maxRecruitment = Math.max(...recruitmentData, 1);

  const consentRate = patients.filter(p => p.consentTaken).length;
  const consentPercent = totalRecruited > 0 ? ((consentRate / totalRecruited) * 100).toFixed(1) : 0;

  const inclusionMet = patients.filter(p => p.inclusionCriteriaMet).length;
  const inclusionPercent = totalRecruited > 0 ? ((inclusionMet / totalRecruited) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-teal-700">Study Statistics</h1>
        <button className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm md:text-base w-full sm:w-auto">
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-md p-3 md:p-6 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <Users size={20} className="md:w-6 md:h-6" />
            <TrendingUp size={16} className="md:w-5 md:h-5" />
          </div>
          <div className="text-xl md:text-3xl font-bold mb-1">{totalRecruited}</div>
          <div className="text-xs md:text-sm opacity-90">Total Recruited</div>
          <div className="text-xs mt-2 opacity-75">{recruitmentRate}% of target</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-md p-3 md:p-6 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="text-xl md:text-3xl font-bold mb-1">{completedFollowups}</div>
          <div className="text-xs md:text-sm opacity-90">Follow-ups Completed</div>
          <div className="text-xs mt-2 opacity-75">{followupPercent}% completion</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-red-400 to-red-500 rounded-2xl shadow-md p-3 md:p-6 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <XCircle size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="text-xl md:text-3xl font-bold mb-1">{dropouts}</div>
          <div className="text-xs md:text-sm opacity-90">Dropouts</div>
          <div className="text-xs mt-2 opacity-75">{dropoutPercent}% dropout rate</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-md p-3 md:p-6 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="text-xl md:text-3xl font-bold mb-1">{consentRate}</div>
          <div className="text-xs md:text-sm opacity-90">Consents Obtained</div>
          <div className="text-xs mt-2 opacity-75">{consentPercent}% consent rate</div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-md p-4 md:p-6"
        >
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6">Gender Distribution</h2>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto sm:mx-0 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
                <circle cx="100" cy="100" r="90" fill="#3b82f6" />
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="transparent"
                  stroke="#ef4444"
                  strokeWidth="180"
                  strokeDasharray={`${femalePercent * 5.65} 565`}
                  strokeLinecap="butt"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs md:text-lg font-bold text-white">Male</div>
                  <div className="text-sm md:text-2xl font-bold text-white">{malePercent}%</div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3 md:space-y-4 text-sm md:text-base">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-blue-500"></div>
                  <span className="text-gray-700">Male</span>
                </div>
                <span className="font-semibold text-gray-800">{maleCount} ({malePercent}%)</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-red-400"></div>
                  <span className="text-gray-700">Female</span>
                </div>
                <span className="font-semibold text-gray-800">{femaleCount} ({femalePercent}%)</span>
              </div>

              <div className="pt-3 md:pt-4 border-t">
                <div className="text-xs md:text-sm text-gray-500">Total Participants</div>
                <div className="text-xl md:text-2xl font-bold text-gray-800">{totalGender}</div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-md p-4 md:p-6"
        >
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6">Age Distribution</h2>

          <div className="flex items-end justify-around h-32 md:h-48 gap-2 md:gap-3">
            {ageGroupLabels.map((age, idx) => {
              const count = ageGroupData[idx];
              const height = (count / maxAge) * 100;
              const isHighest = count === maxAge && count > 0;

              return (
                <div key={age} className="flex-1 flex flex-col items-center gap-1 md:gap-2">
                  <div className="text-xs md:text-lg font-bold text-gray-800">{count}</div>
                  <div
                    className={`w-full rounded-t transition-all ${
                      isHighest ? 'bg-blue-500' : 'bg-red-400'
                    }`}
                    style={{ height: `${height}%`, minHeight: count > 0 ? '12px' : '0' }}
                  ></div>
                  <div className="text-xs md:text-sm font-medium text-gray-600">{age}</div>
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
        className="bg-white rounded-2xl shadow-md p-4 md:p-6"
      >
        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6">Monthly Recruitment Trend</h2>

        <div className="flex items-end justify-around h-32 md:h-48 gap-1 md:gap-2">
          {months.map((month, idx) => {
            const count = recruitmentData[idx];
            const height = (count / maxRecruitment) * 100;

            return (
              <div key={month} className="flex-1 flex flex-col items-center gap-1 md:gap-2">
                <div className="text-xs md:text-sm font-semibold text-gray-700">{count}</div>
                <div
                  className="w-full rounded-t bg-gradient-to-t from-orange-400 to-orange-300 transition-all"
                  style={{ height: `${height}%`, minHeight: count > 0 ? '12px' : '0' }}
                ></div>
                <div className="text-xs text-gray-600">{month}</div>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-2xl shadow-md p-4 md:p-6"
      >
        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6">Group Performance</h2>

        <div className="space-y-3 md:space-y-4">
          {Object.entries(groupStats).map(([group, stats]: [string, any]) => (
            <div key={group} className="border rounded-lg p-3 md:p-4">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="font-semibold text-gray-800 text-sm md:text-base">Group {group}</h3>
                <span className="text-xs md:text-sm text-gray-600">{stats.recruited} patients</span>
              </div>

              <div className="grid grid-cols-3 gap-2 md:gap-4">
                <div className="text-center p-2 md:p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg md:text-2xl font-bold text-blue-600">{stats.recruited}</div>
                  <div className="text-xs text-gray-600">Recruited</div>
                </div>

                <div className="text-center p-2 md:p-3 bg-green-50 rounded-lg">
                  <div className="text-lg md:text-2xl font-bold text-green-600">{stats.completed}</div>
                  <div className="text-xs text-gray-600">Completed</div>
                </div>

                <div className="text-center p-2 md:p-3 bg-red-50 rounded-lg">
                  <div className="text-lg md:text-2xl font-bold text-red-600">{stats.dropouts}</div>
                  <div className="text-xs text-gray-600">Dropouts</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white rounded-2xl shadow-md p-4 md:p-6"
      >
        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6">Quality Metrics</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm text-gray-600">Consent Rate</span>
              <span className="font-semibold text-gray-800 text-sm md:text-base">{consentPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 md:h-3">
              <div
                className="bg-green-500 h-2 md:h-3 rounded-full transition-all"
                style={{ width: `${consentPercent}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm text-gray-600">Inclusion Criteria</span>
              <span className="font-semibold text-gray-800 text-sm md:text-base">{inclusionPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 md:h-3">
              <div
                className="bg-blue-500 h-2 md:h-3 rounded-full transition-all"
                style={{ width: `${inclusionPercent}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm text-gray-600">Follow-up Completion</span>
              <span className="font-semibold text-gray-800 text-sm md:text-base">{followupPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 md:h-3">
              <div
                className="bg-teal-500 h-2 md:h-3 rounded-full transition-all"
                style={{ width: `${followupPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
