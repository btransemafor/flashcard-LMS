import React from 'react';
import { CheckCircle2, Plus, RefreshCw, ShieldAlert, ArchiveX } from 'lucide-react';
import type { MergeReport as MergeReportType } from '@/types';

interface MergeReportProps {
  report: MergeReportType;
  onDone: () => void;
  onGoToLibrary: () => void;
}

const STATUS_META: Record<string, { icon: typeof Plus; label: string; classes: string }> = {
  new: { icon: Plus, label: 'New', classes: 'text-primary bg-primary-subtle' },
  updated: { icon: RefreshCw, label: 'Updated', classes: 'text-accent bg-accent-subtle' },
  preserved: { icon: CheckCircle2, label: 'Preserved', classes: 'text-success bg-success-subtle' },
  conflicted: { icon: ShieldAlert, label: 'Conflicted', classes: 'text-error bg-error-subtle' },
  missing: { icon: ArchiveX, label: 'Missing from file', classes: 'text-warning bg-warning-subtle' }
};

export function MergeReport({ report, onDone, onGoToLibrary }: MergeReportProps) {
  return (
    <div>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-subtle text-success">
        <CheckCircle2 size={24} aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-ink">Import complete</h3>
      <p className="mt-1 text-sm text-ink-secondary">Here's exactly what changed in your library.</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(['new', 'updated', 'preserved', 'conflicted', 'missing'] as const).map((key) => {
          const count = { new: report.newCount, updated: report.updatedCount, preserved: report.preservedCount, conflicted: report.conflictedCount, missing: report.missingCount }[key];
          const meta = STATUS_META[key];
          return (
            <div key={key} className={`rounded-lg p-3 text-center ${meta.classes}`}>
              <meta.icon size={16} className="mx-auto mb-1" aria-hidden="true" />
              <p className="text-lg font-semibold">{count}</p>
              <p className="text-[11px]">{meta.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
        {report.entries.map((entry, i) => {
          const meta = STATUS_META[entry.status];
          return (
            <div key={`${entry.cardId}-${i}`} className="flex items-start gap-3 rounded-lg border border-border px-3.5 py-2.5">
              <span className={`mt-0.5 rounded-full p-1 ${meta.classes}`}>
                <meta.icon size={12} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {entry.term} <span className="font-normal text-ink-muted">· {entry.topic}</span>
                </p>
                <p className="text-xs text-ink-secondary">{entry.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn-primary flex-1" onClick={onGoToLibrary}>
          Go to Library
        </button>
        <button type="button" className="btn-secondary flex-1" onClick={onDone}>
          Import another file
        </button>
      </div>
    </div>
  );
}
