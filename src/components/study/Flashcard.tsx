import React, { useCallback, useRef } from 'react';
import { Tag } from 'lucide-react';
import type { Card } from '@/types';

interface FlashcardProps {
  card: Card;
  revealed: boolean;
  onReveal: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function Flashcard({ card, revealed, onReveal, onPrev, onNext }: FlashcardProps) {
  const startX = useRef<number | null>(null);
  const threshold = 50; // px

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX;
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (startX.current === null) return;
      const dx = e.clientX - startX.current;
      startX.current = null;
      if (Math.abs(dx) < threshold) return;
      if (dx > 0) {
        // swipe right -> previous
        onPrev?.();
      } else {
        // swipe left -> next
        onNext?.();
      }
    },
    [onPrev, onNext]
  );

  const onPointerCancel = useCallback(() => {
    startX.current = null;
  }, []);

  // Touch fallback for some mobile browsers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) < threshold) return;
    if (dx > 0) onPrev?.();
    else onNext?.();
  }, [onPrev, onNext]);

  return (
    <div className="flip-card-container mx-auto w-full max-w-xl">
      <div
        className={`flip-card-inner relative min-h-[320px] w-full ${revealed ? 'is-flipped' : ''}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Prev / Next visible buttons for clarity on mobile */}
        <button
          type="button"
          aria-label="Previous card"
          onClick={() => onPrev?.()}
          className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-ink shadow-lg"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next card"
          onClick={() => onNext?.()}
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-ink shadow-lg"
        >
          ›
        </button>
        {/* Front: Term */}
        <div className="flip-card-face card-surface absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="badge-primary">{card.topic}</span>
          <p className="whitespace-pre-line break-words text-2xl font-semibold text-ink">{card.term}</p>
          {!revealed && (
            <button type="button" onClick={onReveal} className="btn-primary mt-2">
              Reveal answer
            </button>
          )}
          <p className="text-xs text-ink-muted">Press Space to reveal</p>
        </div>

        {/* Back: Definition + Example + Notes + Tags */}
        <div className="flip-card-face back card-surface absolute inset-0 flex flex-col gap-4 overflow-y-auto p-8">
          <div role="status" className="sr-only">
            Answer revealed
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Definition</p>
            <p className="mt-1.5 whitespace-pre-line break-words text-base text-ink">{card.definition}</p>
          </div>
          {card.example && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Example</p>
              <p className="mt-1.5 whitespace-pre-line break-words text-sm text-ink-secondary">{card.example}</p>
            </div>
          )}
          {card.notes && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Notes</p>
              <p className="mt-1.5 whitespace-pre-line break-words text-sm text-ink-secondary">{card.notes}</p>
            </div>
          )}
          {card.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag size={12} className="text-ink-muted" aria-hidden="true" />
              {card.tags.map((tag) => (
                <span key={tag} className="badge-neutral">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
