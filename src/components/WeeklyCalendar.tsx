import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';

interface WeeklyCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  renderDayExtra?: (date: Date) => React.ReactNode;
}

export default function WeeklyCalendar({ selectedDate, onSelectDate, renderDayExtra }: WeeklyCalendarProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {format(selectedDate, 'EEEE, MMM d')}
        </h3>
        <div className="flex gap-1.5">
          <button
            onClick={() => onSelectDate(addDays(selectedDate, -7))}
            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            ◀
          </button>
          <button
            onClick={() => onSelectDate(new Date())}
            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Today
          </button>
          <button
            onClick={() => onSelectDate(addDays(selectedDate, 7))}
            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            ▶
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = addDays(weekStart, i);
          const isActive = isSameDay(d, selectedDate);
          const todayMark = isToday(d);

          return (
            <button
              key={format(d, 'yyyy-MM-dd')}
              onClick={() => onSelectDate(d)}
              className="flex flex-col items-center py-2 px-1 rounded-xl text-center transition-all"
              style={isActive ? {
                backgroundColor: 'var(--accent)',
                color: '#fff',
                border: '1.5px solid var(--accent)',
              } : {
                backgroundColor: 'var(--surface)',
                color: todayMark ? 'var(--accent)' : 'var(--text-primary)',
                border: todayMark ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              }}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{format(d, 'EEE')}</span>
              <span className="font-bold text-base leading-tight">{format(d, 'd')}</span>
              {renderDayExtra && renderDayExtra(d)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
