import React from 'react';
import { AlertCircle, CheckCircle2, Copy } from 'lucide-react';
import type { ImportRowResult } from '@/types';

interface ValidationReportProps {
  rowResults: ImportRowResult[];
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  totalRows: number;
}

export function ValidationReport({ rowResults, validCount, invalidCount, duplicateCount, totalRows }: ValidationReportProps) {
  const invalidRows = rowResults.filter((r) => r.status === 'invalid');
  const allGood = invalidCount === 0 && duplicateCount === 0 && totalRows > 0;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card-surface p-3 text-center">
          <p className="text-xs text-ink-secondary">Total rows</p>
          <p className="mt-1 text-lg font-semibold text-ink">{totalRows}</p>
        </div>
        <div className="card-surface p-3 text-center">
          <p className="text-xs text-ink-secondary">Valid</p>
          <p className="mt-1 text-lg font-semibold text-success">{validCount}</p>
        </div>
        <div className="card-surface p-3 text-center">
          <p className="text-xs text-ink-secondary">Duplicate</p>
          <p className="mt-1 text-lg font-semibold text-warning">{duplicateCount}</p>
        </div>
        <div className="card-surface p-3 text-center">
          <p className="text-xs text-ink-secondary">Invalid</p>
          <p className="mt-1 text-lg font-semibold text-error">{invalidCount}</p>
        </div>
      </div>

      {allGood ? (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success-subtle px-3.5 py-2.5 text-sm text-success">
          <CheckCircle2 size={16} aria-hidden="true" /> Everything looks good. Your cards are ready.
        </p>
      ) : (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-subtle px-3.5 py-2.5 text-sm text-warning">
          <AlertCircle size={16} aria-hidden="true" /> We found a few rows that need attention.
        </p>
      )}

      {invalidRows.length > 0 && (
        <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
          {invalidRows.map((row) => (
            <div key={row.row} className="rounded-lg border border-error/30 bg-error-subtle px-3.5 py-2.5 text-sm text-error">
              <p className="font-medium">Row {row.row}</p>
              <ul className="mt-1 list-disc pl-4 text-xs">
                {row.issues.map((issue, i) => (
                  <li key={i}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {duplicateCount > 0 && (
        <p className="mt-3 flex items-center gap-2 text-xs text-ink-secondary">
          <Copy size={13} aria-hidden="true" /> Duplicate rows share the same ID or Topic + Term as an earlier row and were skipped.
        </p>
      )}
    </div>
  );
}
