import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { Card } from '@/types';
import type { TopicSummary } from '@/utils/topicSelectors';
import { getCardStatus } from '@/utils/cardStatus';
import { formatDisplayDate } from '@/utils/date';

interface TopicDetailDrawerProps {
  summary: TopicSummary;
  cards: Card[];
  onClose: () => void;
  onStudy: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  new: 'badge-primary',
  due: 'badge-warning',
  mastered: 'badge-success',
  learning: 'badge-neutral'
};

export function TopicDetailDrawer({ summary, cards, onClose, onStudy }: TopicDetailDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="topic-drawer-title"
        className="h-full w-full max-w-md animate-fade-in overflow-y-auto bg-surface p-6 shadow-popover"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="topic-drawer-title" className="text-lg font-semibold text-ink">
              {summary.topic}
            </h2>
            <p className="text-sm text-ink-secondary">
              {summary.totalCards} cards · {summary.dueCount} due · {summary.masteredCount} mastered
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close topic details"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-secondary hover:bg-surface-secondary hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <button type="button" className="btn-primary mb-5 w-full" onClick={onStudy}>
          Study this topic
        </button>

        <ul className="space-y-3">
          {cards.map((card) => {
            const status = getCardStatus(card);
            return (
              <li key={card.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{card.term}</p>
                  <span className={STATUS_BADGE[status]}>{status}</span>
                </div>
                <p className="mt-1 text-xs text-ink-secondary line-clamp-2">{card.definition}</p>
                <p className="mt-2 text-[11px] text-ink-muted">
                  Last reviewed {card.progress.lastReviewed ? formatDisplayDate(card.progress.lastReviewed) : 'never'}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
