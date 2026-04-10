'use client';

import * as React from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CalendarEventItem } from '@/lib/types/event';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-400',
  PUBLISHED: 'bg-emerald-500',
  CANCELED: 'bg-red-400',
  COMPLETED: 'bg-blue-400',
};

interface EventCalendarProps {
  month: number;
  year: number;
  byDate: Record<string, CalendarEventItem[]>;
  isLoading?: boolean;
  onMonthChange: (month: number, year: number) => void;
  onEventClick?: (event: CalendarEventItem) => void;
}

export function EventCalendar({
  month,
  year,
  byDate,
  isLoading,
  onMonthChange,
  onEventClick,
}: EventCalendarProps) {
  const currentDate = new Date(year, month - 1, 1);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    onMonthChange(d.getMonth() + 1, d.getFullYear());
  };

  const nextMonth = () => {
    const d = new Date(year, month, 1);
    onMonthChange(d.getMonth() + 1, d.getFullYear());
  };

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              const now = new Date();
              onMonthChange(now.getMonth() + 1, now.getFullYear());
            }}
          >
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className={cn('grid grid-cols-7', isLoading && 'opacity-40 pointer-events-none')}>
        {days.map((day, i) => {
          const key = format(day, 'yyyy-MM-dd');
          const events = byDate[key] ?? [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={key}
              className={cn(
                'min-h-[100px] border-b border-r p-1',
                !isCurrentMonth && 'bg-muted/30',
                i % 7 === 6 && 'border-r-0',
              )}
            >
              <div
                className={cn(
                  'mb-1 flex h-7 w-7 items-center justify-center rounded-full text-sm',
                  isCurrentDay && 'bg-primary text-primary-foreground font-semibold',
                  !isCurrentMonth && 'text-muted-foreground',
                )}
              >
                {format(day, 'd')}
              </div>

              <div className="space-y-0.5">
                {events.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick?.(ev)}
                    className={cn(
                      'w-full truncate rounded px-1 py-0.5 text-left text-xs text-white transition-opacity hover:opacity-80',
                      STATUS_COLORS[ev.status] ?? 'bg-gray-500',
                    )}
                    title={ev.title}
                  >
                    {format(new Date(ev.startsAt), 'h:mm')} {ev.title}
                  </button>
                ))}
                {events.length > 3 && (
                  <p className="px-1 text-xs text-muted-foreground">+{events.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
