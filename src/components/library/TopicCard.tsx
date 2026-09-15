import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Printer, Info } from 'lucide-react';
import type { TopicSummary } from '@/utils/topicSelectors';
import { ProgressRing } from '@/components/common/ProgressRing';
import { formatDisplayDate } from '@/utils/date';

interface TopicCardProps {
  summary: TopicSummary;
  view: 'grid' | 'list';
  onStudy: () => void;
  onOpenDetail: () => void;
  onPrint: () => void;
}

function initialsFor(topic: string): string {
  return topic
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export function TopicCard({ summary, view, onStudy, onOpenDetail, onPrint }: TopicCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const isList = view === 'list';

  return (
    <div className={`card-surface p-5 ${isList ? 'flex items-center gap-5' : 'flex flex-col gap-4'}`}>
      <div className={`flex items-center gap-3 ${isList ? 'flex-1 min-w-0' : ''}`}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-sm font-semibold text-primary">
          {initialsFor(summary.topic)}
        </div>
        <div className="min-w-0">
          <button type="button" onClick={onOpenDetail} className="truncate text-left text-sm font-semibold text-ink hover:text-primary">
            {summary.topic}
          </button>
          <p className="text-xs text-ink-secondary">
            {summary.totalCards} card{summary.totalCards === 1 ? '' : 's'} · Last studied {summary.lastStudied ? formatDisplayDate(summary.lastStudied) : 'never'}
          </p>
        </div>
      </div>

      <div className={`flex items-center gap-4 ${isList ? '' : 'justify-between'}`}>
        <div className="flex items-center gap-3">
          <ProgressRing value={summary.progressPercent} size={44} strokeWidth={5} label={`${summary.progressPercent} percent mastered`} />
          <div className="text-xs text-ink-secondary">
            <p className="font-medium text-ink">{summary.dueCount} due</p>
            <p>{summary.masteredCount} mastered</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="btn-primary !min-h-[40px] !px-3.5" onClick={onStudy}>
            Study
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label={`More actions for ${summary.topic}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-secondary hover:text-ink"
            >
              <MoreVertical size={16} aria-hidden="true" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-10 z-20 w-44 rounded-lg border border-border bg-surface py-1 shadow-popover">
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenDetail();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-secondary"
                >
                  <Info size={14} aria-hidden="true" /> View details
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onPrint();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-secondary"
                >
                  <Printer size={14} aria-hidden="true" /> Print cards
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
