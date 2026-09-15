import React, { useMemo, useState } from 'react';
import { formatDisplayDate } from '@/utils/date';

interface ActivityHeatmapProps {
  series: { date: string; reviews: number }[];
}

function intensityClass(reviews: number): string {
  if (reviews === 0) return 'bg-surface-secondary';
  if (reviews < 5) return 'bg-primary-subtle';
  if (reviews < 15) return 'bg-accent/50';
  if (reviews < 30) return 'bg-accent';
  return 'bg-primary';
}

export function ActivityHeatmap({ series }: ActivityHeatmapProps) {
  const [hovered, setHovered] = useState<{ date: string; reviews: number } | null>(null);

  const weeks = useMemo(() => {
    const result: { date: string; reviews: number }[][] = [];
    let currentWeek: { date: string; reviews: number }[] = [];
    series.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === series.length - 1) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });
    return result;
  }, [series]);

  return (
    <div className="relative">
      <div className="flex gap-1 overflow-x-auto pb-2" role="img" aria-label="Study activity heatmap for the last 26 weeks">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <button
                key={day.date}
                type="button"
                className={`h-3 w-3 rounded-[3px] transition-colors duration-200 ${intensityClass(day.reviews)} hover:ring-2 hover:ring-primary/40`}
                onMouseEnter={() => setHovered(day)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(day)}
                onBlur={() => setHovered(null)}
                aria-label={`${formatDisplayDate(new Date(day.date).toISOString())}: ${day.reviews} card${day.reviews === 1 ? '' : 's'} reviewed`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
        <span>Less</span>
        <span className="h-3 w-3 rounded-[3px] bg-surface-secondary" />
        <span className="h-3 w-3 rounded-[3px] bg-primary-subtle" />
        <span className="h-3 w-3 rounded-[3px] bg-accent/50" />
        <span className="h-3 w-3 rounded-[3px] bg-accent" />
        <span className="h-3 w-3 rounded-[3px] bg-primary" />
        <span>More</span>
      </div>
      {hovered && (
        <div className="pointer-events-none absolute -top-9 left-0 rounded-md bg-ink px-2.5 py-1.5 text-xs text-white shadow-popover" role="status">
          {formatDisplayDate(new Date(hovered.date).toISOString())} · {hovered.reviews} card{hovered.reviews === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
}
