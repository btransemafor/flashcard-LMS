import React from 'react';
import { Save, X } from 'lucide-react';

interface SessionProgressProps {
  topicLabel: string;
  current: number;
  total: number;
  isDirty: boolean;
  onEnd: () => void;
}

export function SessionProgress({ topicLabel, current, total, isDirty, onEnd }: SessionProgressProps) {
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{topicLabel}</p>
          <p className="text-xs text-ink-secondary">
            Card {Math.min(current + 1, total)} of {total}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-xs text-ink-muted sm:flex">
            <Save size={13} aria-hidden="true" />
            {isDirty ? 'Autosaving locally…' : 'Saved locally'}
          </span>
          <button type="button" onClick={onEnd} className="btn-secondary !min-h-[36px] !px-3">
            <X size={14} aria-hidden="true" />
            End session
          </button>
        </div>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Session progress"
      >
        <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
