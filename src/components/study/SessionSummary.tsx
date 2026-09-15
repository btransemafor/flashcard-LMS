import React from 'react';
import { CheckCircle2, Clock, Download, Save, XCircle } from 'lucide-react';
import type { ActiveSessionState } from '@/store/appReducer';
import { formatDisplayDate } from '@/utils/date';

interface SessionSummaryProps {
  session: ActiveSessionState;
  isDirty: boolean;
  onSaveProgress: () => void;
  onExportExcel: () => void;
  onBackToDashboard: () => void;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes === 0) return `${secs}s`;
  return `${minutes}m ${secs}s`;
}

export function SessionSummary({ session, isDirty, onSaveProgress, onExportExcel, onBackToDashboard }: SessionSummaryProps) {
  const accuracy = session.reviewed > 0 ? Math.round((session.correct / session.reviewed) * 100) : 0;
  const durationSeconds = session.endedAt
    ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
    : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-subtle text-success">
          <CheckCircle2 size={24} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold text-ink">Session complete</h2>
        <p className="mt-1 text-sm text-ink-secondary">Nice work — here's how it went.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card-surface p-4 text-center">
          <p className="text-xs text-ink-secondary">Reviewed</p>
          <p className="mt-1 text-xl font-semibold text-ink">{session.reviewed}</p>
        </div>
        <div className="card-surface p-4 text-center">
          <p className="text-xs text-ink-secondary">Correct</p>
          <p className="mt-1 text-xl font-semibold text-success">{session.correct}</p>
        </div>
        <div className="card-surface p-4 text-center">
          <p className="text-xs text-ink-secondary">Wrong</p>
          <p className="mt-1 text-xl font-semibold text-error">{session.wrong}</p>
        </div>
        <div className="card-surface p-4 text-center">
          <p className="text-xs text-ink-secondary">Accuracy</p>
          <p className="mt-1 text-xl font-semibold text-ink">{accuracy}%</p>
        </div>
      </div>

      <div className="card-surface flex items-center justify-between p-4 text-sm">
        <span className="flex items-center gap-2 text-ink-secondary">
          <Clock size={16} aria-hidden="true" /> Time spent
        </span>
        <span className="font-medium text-ink">{formatDuration(durationSeconds)}</span>
      </div>

      <div className="card-surface p-4">
        <p className="mb-3 text-sm font-semibold text-ink">Cards rescheduled ({session.rescheduled.length})</p>
        <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
          {session.rescheduled.map((r, i) => (
            <li key={`${r.cardId}-${i}`} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
              <span className="truncate text-ink">{r.term}</span>
              <span className="shrink-0 text-xs text-ink-secondary">
                Next: {r.nextReview ? formatDisplayDate(r.nextReview) : '—'}
              </span>
            </li>
          ))}
          {session.rescheduled.length === 0 && <li className="text-ink-secondary">No cards were reviewed this session.</li>}
        </ul>
      </div>

      {isDirty && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-subtle p-4 text-sm text-warning">
          <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            Your progress is saved in this browser, but Excel is your source of truth. Export or save the workbook
            before clearing browser data.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn-primary flex-1" onClick={onSaveProgress}>
          <Save size={16} aria-hidden="true" /> Save Progress
        </button>
        <button type="button" className="btn-secondary flex-1" onClick={onExportExcel}>
          <Download size={16} aria-hidden="true" /> Export Excel
        </button>
        <button type="button" className="btn-ghost flex-1" onClick={onBackToDashboard}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
