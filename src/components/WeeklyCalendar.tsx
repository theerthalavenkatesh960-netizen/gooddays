import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

interface WeeklyCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  renderDayExtra?: (date: Date) => React.ReactNode;
}

export default function WeeklyCalendar({ selectedDate, onSelectDate, renderDayExtra }: WeeklyCalendarProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          {format(selectedDate, 'EEEE, MMM d')}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => onSelectDate(addDays(selectedDate, -7))}
            className="px-2.5 py-1 rounded-lg text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Week ◀
          </button>
          <button
            onClick={() => onSelectDate(new Date())}
            className="px-2.5 py-1 rounded-lg text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Today
          </button>
          <button
            onClick={() => onSelectDate(addDays(selectedDate, 7))}
            className="px-2.5 py-1 rounded-lg text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Week ▶
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 pb-1.5">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = addDays(weekStart, i);
          const isActive = isSameDay(d, selectedDate);

          return (
            <button
              key={format(d, 'yyyy-MM-dd')}
              onClick={() => onSelectDate(d)}
              className={`px-2 py-2 rounded-lg text-center border transition-colors ${
                isActive
                  ? 'bg-emerald-500 text-white border-emerald-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="text-[11px] sm:text-xs">{format(d, 'EEE')}</div>
              <div className="font-semibold text-sm sm:text-base">{format(d, 'd')}</div>
              {renderDayExtra && renderDayExtra(d)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
