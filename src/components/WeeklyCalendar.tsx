import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

interface WeeklyCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  renderDayExtra?: (date: Date) => React.ReactNode;
  /** Optional slot rendered in place of the week nav buttons (right side of header) */
  headerRight?: React.ReactNode;
}

export default function WeeklyCalendar({ selectedDate, onSelectDate, renderDayExtra, headerRight }: WeeklyCalendarProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {format(selectedDate, 'EEEE, MMM d')}
        </h3>
        {headerRight ?? (
          <div className="flex gap-2">
            <button
              onClick={() => onSelectDate(addDays(selectedDate, -7))}
              className="px-2.5 py-1 rounded-lg text-xs sm:text-sm"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
            >
              Week ◀
            </button>
            <button
              onClick={() => onSelectDate(new Date())}
              className="px-2.5 py-1 rounded-lg text-xs sm:text-sm"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
            >
              Today
            </button>
            <button
              onClick={() => onSelectDate(addDays(selectedDate, 7))}
              className="px-2.5 py-1 rounded-lg text-xs sm:text-sm"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
            >
              Week ▶
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 pb-1.5">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = addDays(weekStart, i);
          const isActive = isSameDay(d, selectedDate);

          return (
            <button
              key={format(d, 'yyyy-MM-dd')}
              onClick={() => onSelectDate(d)}
              className="flex-1 py-2 rounded-lg text-center transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--accent-green)' : 'var(--surface-elevated)',
                border: `1px solid ${isActive ? 'var(--accent-green)' : 'var(--border)'}`,
                color: isActive ? '#fff' : 'var(--text-secondary)',
              }}
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
