import React from 'react';
import type { Rating } from '@/types';

interface RatingControlsProps {
  disabled: boolean;
  onRate: (rating: Rating) => void;
}

const RATINGS: { id: Rating; label: string; shortcut: string; classes: string }[] = [
  { id: 'again', label: 'Again', shortcut: '1', classes: 'bg-error-subtle text-error hover:bg-error/20' },
  { id: 'hard', label: 'Hard', shortcut: '2', classes: 'bg-warning-subtle text-warning hover:bg-warning/20' },
  { id: 'good', label: 'Good', shortcut: '3', classes: 'bg-primary-subtle text-primary hover:bg-primary/20' },
  { id: 'easy', label: 'Easy', shortcut: '4', classes: 'bg-success-subtle text-success hover:bg-success/20' }
];

export function RatingControls({ disabled, onRate }: RatingControlsProps) {
  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Rate your recall">
      {RATINGS.map((r) => (
        <button
          key={r.id}
          type="button"
          disabled={disabled}
          onClick={() => onRate(r.id)}
          className={`btn min-h-[52px] flex-col gap-0.5 !rounded-lg font-semibold ${r.classes}`}
        >
          <span>{r.label}</span>
          <span className="text-[10px] font-normal opacity-70">Key {r.shortcut}</span>
        </button>
      ))}
    </div>
  );
}
