import React from 'react';
import { Tag } from 'lucide-react';
import type { Card } from '@/types';

interface FlashcardProps {
  card: Card;
  revealed: boolean;
  onReveal: () => void;
}

export function Flashcard({ card, revealed, onReveal }: FlashcardProps) {
  return (
    <div className="flip-card-container mx-auto w-full max-w-xl">
      <div className={`flip-card-inner relative min-h-[320px] w-full ${revealed ? 'is-flipped' : ''}`}>
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
