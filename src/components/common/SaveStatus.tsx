import React from 'react';
import { CheckCircle2, CloudUpload, FileWarning } from 'lucide-react';
import type { Dataset } from '@/types';
import { formatDisplayDateTime } from '@/utils/date';

export function SaveStatus({ dataset }: { dataset: Dataset | null }) {
  if (!dataset) {
    return (
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <FileWarning size={14} aria-hidden="true" />
        <span>No workbook linked</span>
      </div>
    );
  }

  if (dataset.isDirty) {
    return (
      <div className="flex items-center gap-2 text-xs text-warning">
        <CloudUpload size={14} aria-hidden="true" />
        <span>Changes not yet exported</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-success">
      <CheckCircle2 size={14} aria-hidden="true" />
      <span>
        {dataset.lastSaveMode === 'workbook' ? 'Saved to workbook' : 'Saved locally'}
        {dataset.lastSavedAt ? ` · ${formatDisplayDateTime(dataset.lastSavedAt)}` : ''}
      </span>
    </div>
  );
}
