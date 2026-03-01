import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addDays
} from 'date-fns';

import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';


export default function CalendarView() {

  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [dayData, setDayData] = useState<any>({});

  const [selectedDayDetails, setSelectedDayDetails] = useState<any>(null);

  const [tasksData, setTasksData] = useState<any[]>([]);


  useEffect(() => {

    if (user) loadMonthData();

  }, [user, currentDate]);


  useEffect(() => {

    setSelectedDate(null);

    setSelectedDayDetails(null);

  }, [currentDate]);



  const loadMonthData = async () => {

    if (!user) return;

    try {

      const start = startOfMonth(currentDate);

      const end = endOfMonth(currentDate);

      const startKey = format(start, 'yyyy-MM-dd');

      const endKey = format(end, 'yyyy-MM-dd');


      const [tasks, study, expenses, selfcare] = await Promise.all([
        api.getTasks(user.id),
        api.getStudySessions(user.id),
        api.getExpenses(user.id),
        api.getSelfCareActivities(user.id),
      ]);


      setTasksData(tasks || []);

      const data: any = {};



        tasks?.forEach((t: any) => {

          // skip non-completed items and protect against bad timestamp values
          if (!t.isCompleted) return;
          const d = new Date(t.updatedAt);
          if (isNaN(d.getTime())) return;
          const key = format(d, 'yyyy-MM-dd');

        if (key < startKey || key > endKey) return;

        data[key] ??= {};

        data[key].tasks = (data[key].tasks || 0) + 1;

      });



        study?.forEach((s: any) => {

          const d = new Date(s.date);
          if (isNaN(d.getTime())) return;
          const key = format(d, 'yyyy-MM-dd');

        if (key < startKey || key > endKey) return;

        data[key] ??= {};

        data[key].study = (data[key].study || 0) + s.durationMinutes;

      });



        expenses?.forEach((e: any) => {

          const d = new Date(e.date);
          if (isNaN(d.getTime())) return;
          const key = format(d, 'yyyy-MM-dd');

        if (key < startKey || key > endKey) return;

        data[key] ??= {};

        data[key].expenses = (data[key].expenses || 0) + parseFloat(e.amount);

      });



      selfcare?.forEach((s: any) => {

          const d = new Date(s.date);
          if (isNaN(d.getTime())) return;
          const key = format(d, 'yyyy-MM-dd');

        if (key < startKey || key > endKey) return;

        data[key] ??= {};

        data[key].selfcare = (data[key].selfcare || 0) + 1;

      });



      setDayData(data);

    }
    catch (err) {

      console.error("Calendar Load Error:", err);

    }

  };



  const getDaysInMonth = () => {

    const start = startOfWeek(startOfMonth(currentDate));

    const end = endOfWeek(endOfMonth(currentDate));

    return eachDayOfInterval({
      start,
      end
    });

  };



  const calculateStreak = (task: any, day: Date) => {

    let count = 0;

    let check = day;

    while (true) {

      const key = format(check, 'yyyy-MM-dd');

      const found = tasksData.some((t: any) =>
        t.isCompleted &&
        // ensure updatedAt is a valid date before comparing
        (() => {
          const d = new Date(t.updatedAt);
          if (isNaN(d.getTime())) return false;
          return format(d, 'yyyy-MM-dd') === key;
        })() &&
        (
          t.recurrenceId === task.recurrenceId ||
          t.title === task.title
        )
      );


      if (!found) break;

      count++;

      check = addDays(check, -1);

      if (count > 365) break;

    }

    return count;

  };



  const handleDayClick = (day: Date) => {
    // defensive: ignore invalid dates
    if (!(day instanceof Date) || isNaN(day.getTime())) {
      console.warn('handleDayClick received invalid date', day);
      return;
    }
    setSelectedDate(day);
    const key = format(day, 'yyyy-MM-dd');

    const base = dayData[key] || {};


    const completedTasks =
      tasksData.filter((t: any) => {
        if (!t.isCompleted) return false;
        const d = new Date(t.updatedAt);
        if (isNaN(d.getTime())) return false;
        return format(d, 'yyyy-MM-dd') === key;
      });


    const taskStreaks =
      completedTasks.map((t: any) => ({

        task: t,

        streak: calculateStreak(t, day)

      }));



    setSelectedDayDetails({

      ...base,

      taskStreaks

    });

  };



  const days = getDaysInMonth();



  return (

    <div className="p-6">


      <motion.div

        initial={{ opacity: 0, y: 10 }}

        animate={{ opacity: 1, y: 0 }}

        className="bg-white rounded-2xl shadow-lg p-6"

      >


        <div className="flex items-center justify-between mb-6">


          <div className="flex items-center gap-2">

            <CalendarIcon size={24} />

            <h2 className="text-xl font-semibold">

              {format(currentDate, "MMMM yyyy")}

            </h2>

          </div>



          <div className="flex gap-2">

            <button

              onClick={() => setCurrentDate(subMonths(currentDate, 1))}

              className="p-2 rounded-lg hover:bg-gray-100"

            >
              <ChevronLeft />
            </button>


            <button

              onClick={() => setCurrentDate(addMonths(currentDate, 1))}

              className="p-2 rounded-lg hover:bg-gray-100"

            >
              <ChevronRight />
            </button>

          </div>

        </div>



        <div className="grid grid-cols-7 gap-2 mb-4">

          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (

            <div
              key={d}
              className="text-center text-sm font-medium text-gray-500"
            >
              {d}
            </div>

          ))}

        </div>



        <div className="grid grid-cols-7 gap-2">

          {days.map((day) => {

            const key = format(day, 'yyyy-MM-dd');

            const data = dayData[key] || {};

            const selected =
              selectedDate &&
              format(selectedDate, 'yyyy-MM-dd') === key;


            return (

              <div

                key={key}

                onClick={() => handleDayClick(day)}

                className={`

                p-2 rounded-lg cursor-pointer border

                ${!isSameMonth(day, currentDate) && "opacity-40"}

                ${isToday(day) && "border-blue-500"}

                ${selected && "bg-blue-50"}

                `}

              >


                <div className="text-sm">

                  {format(day, "d")}

                </div>


                <div className="text-xs space-y-1">

                  {data.tasks && (
                    // each completed task gets a small dot; limit to five and show
                    // a plus sign when there are more tasks than dots.
                    <div className="flex justify-center mt-1 space-x-1">
                      {Array(Math.min(data.tasks, 5))
                        .fill(null)
                        .map((_, i) => (
                          <span
                            key={i}
                            className="inline-block w-1 h-1 bg-blue-500 rounded-full"
                          />
                        ))}
                      {data.tasks > 5 && (
                        <span className="text-[8px] text-blue-500">+</span>
                      )}
                    </div>
                  )}

                  {data.study && (

                    <div>📘 {data.study}m</div>

                  )}

                  {data.expenses && (

                    <div>₹ {data.expenses}</div>

                  )}

                  {data.selfcare && (

                    <div>🧘 {data.selfcare}</div>

                  )}

                </div>

              </div>

            );

          })}

        </div>



        {selectedDate && selectedDayDetails && (

          <motion.div

            initial={{ opacity: 0 }}

            animate={{ opacity: 1 }}

            className="mt-6 border-t pt-4"

          >

            <h3 className="font-semibold mb-2">

              {format(selectedDate, "PPP")}

            </h3>


            {selectedDayDetails.taskStreaks?.map((s: any, i: number) => (

              <div key={i} className="text-sm mb-1">

                {s.task.title} 🔥 {s.streak}

              </div>

            ))}


            <div className="text-sm mt-2">

              Tasks: {selectedDayDetails.tasks || 0}

            </div>


            <div className="text-sm">

              Study: {selectedDayDetails.study || 0} min

            </div>


            <div className="text-sm">

              Expenses: ₹{selectedDayDetails.expenses || 0}

            </div>


            <div className="text-sm">

              Self Care: {selectedDayDetails.selfcare || 0}

            </div>


          </motion.div>

        )}

      </motion.div>

    </div>

  );

}