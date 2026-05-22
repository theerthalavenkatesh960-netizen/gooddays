import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

interface WeeklyCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  renderDayExtra?: (date: Date) => React.ReactNode;
  /** Optional slot rendered in place of the week nav buttons (right side of header) */
  headerRight?: React.ReactNode;
}

export default function WeeklyCalendar({ selectedDate, onSelectDate, renderDayExtra, headerRight }: WeeklyCalendarProps) {
  // Match Dashboard Tasks calendar: Monday-start week strip.
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {format(selectedDate, 'EEEE, MMM d')}
        </h3>
        {headerRight ?? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSelectDate(addDays(selectedDate, -7))}
              className="px-2 py-1 rounded-lg text-[11px] press"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}
            >
              ◀
            </button>
            <button
              onClick={() => onSelectDate(new Date())}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold press"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)' }}
            >
              Today
            </button>
            <button
              onClick={() => onSelectDate(addDays(selectedDate, 7))}
              className="px-2 py-1 rounded-lg text-[11px] press"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}
            >
              ▶
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = addDays(weekStart, i);
          const isActive = isSameDay(d, selectedDate);
          const isToday = isSameDay(d, new Date());

          return (
            <button
              key={format(d, 'yyyy-MM-dd')}
              onClick={() => onSelectDate(d)}
              className="flex-1 min-w-[38px] py-2 rounded-xl text-center press transition-all"
              style={{
                backgroundColor: isActive ? 'var(--accent)' : isToday ? 'var(--surface-elevated)' : 'var(--surface)',
                border: isToday && !isActive ? '1px solid var(--accent)' : '1px solid transparent',
              }}
            >
              <div className="text-[10px]" style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}>{format(d, 'EEE')}</div>
              <div className="font-bold text-sm" style={{ color: isActive ? '#fff' : 'var(--text-primary)' }}>{format(d, 'd')}</div>
              {renderDayExtra && renderDayExtra(d)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
