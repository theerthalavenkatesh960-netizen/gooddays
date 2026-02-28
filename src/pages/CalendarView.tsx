import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

export default function CalendarView() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayData, setDayData] = useState<any>({});
  const [selectedDayDetails, setSelectedDayDetails] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadMonthData();
    }
  }, [user, currentDate]);

  const loadMonthData = async () => {
    if (!user) return;

    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');

    const [tasks, study, expenses, selfcare] = await Promise.all([
      api.getTasks(user.id),
      api.getStudySessions(user.id),
      api.getExpenses(user.id),
      api.getSelfCareActivities(user.id),
    ]);

    const data: any = {};

    tasks?.forEach((t) => {
      if (t.isCompleted) {
        const date = format(new Date(t.updatedAt), 'yyyy-MM-dd');
        data[date] = data[date] || {};
        data[date].tasks = (data[date].tasks || 0) + 1;
      }
    });

    study?.forEach((s) => {
      const date = format(new Date(s.date), 'yyyy-MM-dd');
      data[date] = data[date] || {};
      data[date].study = s.durationMinutes;
    });

    expenses?.forEach((e) => {
      const date = format(new Date(e.date), 'yyyy-MM-dd');
      data[date] = data[date] || {};
      data[date].expenses = (data[date].expenses || 0) + parseFloat(e.amount);
    });

    selfcare?.forEach((s) => {
      const date = format(new Date(s.date), 'yyyy-MM-dd');
      data[date] = data[date] || {};
      data[date].selfcare = (data[date].selfcare || 0) + 1;
    });

    setDayData(data);
  };

  const getDaysInMonth = () => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    const dateKey = format(day, 'yyyy-MM-dd');
    setSelectedDayDetails(dayData[dateKey] || null);
  };

  const days = getDaysInMonth();

  return (
    <div>
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
        Calendar
      </h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-xl mb-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronLeft size={20} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 rounded-lg bg-emerald-100 text-emerald-700 font-medium"
            >
              Today
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronRight size={20} />
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const data = dayData[dateKey];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrent = isToday(day);

            return (
              <motion.button
                key={day.toString()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDayClick(day)}
                className={`aspect-square p-2 rounded-xl border-2 transition-all ${
                  isCurrent
                    ? 'border-emerald-500 bg-emerald-50'
                    : selectedDate && format(selectedDate, 'yyyy-MM-dd') === dateKey
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!isCurrentMonth ? 'opacity-30' : ''}`}
              >
                <div className={`text-sm font-semibold mb-1 ${isCurrent ? 'text-emerald-600' : 'text-gray-800'}`}>
                  {format(day, 'd')}
                </div>
                {data && isCurrentMonth && (
                  <div className="space-y-0.5">
                    {data.tasks && (
                      <div className="text-xs bg-blue-500 text-white rounded px-1">
                        {data.tasks}
                      </div>
                    )}
                    {data.focus && (
                      <div className="text-xs bg-orange-500 text-white rounded px-1">
                        {data.focus}
                      </div>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-xl"
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CalendarIcon className="text-emerald-500" size={24} />
            {format(selectedDate, 'MMMM d, yyyy')}
          </h3>

          {selectedDayDetails ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedDayDetails.tasks && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-600">{selectedDayDetails.tasks}</div>
                  <div className="text-sm text-gray-600">Tasks Completed</div>
                </div>
              )}
              {selectedDayDetails.focus && (
                <div className="bg-orange-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-orange-600">{selectedDayDetails.focus}</div>
                  <div className="text-sm text-gray-600">Focus Sessions</div>
                </div>
              )}
              {selectedDayDetails.study && (
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-600">{selectedDayDetails.study}</div>
                  <div className="text-sm text-gray-600">Study Minutes</div>
                </div>
              )}
              {selectedDayDetails.expenses && (
                <div className="bg-red-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-red-600">
                    ${selectedDayDetails.expenses.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Expenses</div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No activity recorded for this day</p>
          )}
        </motion.div>
      )}
    </div>
  );
}
