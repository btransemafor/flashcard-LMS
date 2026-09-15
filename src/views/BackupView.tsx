import React, { useRef, useState } from 'react';
import { Download, FileJson, FolderOpen, Save, Trash2, Upload } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { ViewId } from '@/App';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { buildJsonBackup, downloadJsonBackup, validateJsonBackup, type BackupValidationResult } from '@/services/backupService';
import { buildSampleTemplateWorkbook, workbookToArrayBuffer, triggerBrowserDownload } from '@/services/excelService';
import { buildSampleTemplateFileName } from '@/utils/fileNaming';
import { isFileSystemAccessSupported } from '@/services/fileSystemService';
import { formatDisplayDateTime } from '@/utils/date';
import type { JsonBackup } from '@/types';

interface BackupViewProps {
  onNavigate: (view: ViewId) => void;
}

export function BackupView({ onNavigate }: BackupViewProps) {
  const {
    state: { dataset, cards, studySessions, activity, fileHandleAvailable, linkedFileName, ui },
    actions: { exportExcel, saveToWorkbook, openLinkedWorkbook, clearLocalCache, restoreBackup }
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBackup, setPendingBackup] = useState<{ backup: JsonBackup; validation: BackupValidationResult } | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleExportJson = () => {
    if (!dataset) return;
    const backup = buildJsonBackup(dataset, cards, studySessions, activity);
    downloadJsonBackup(backup);
  };

  const handleDownloadSample = () => {
    const workbook = buildSampleTemplateWorkbook();
    triggerBrowserDownload(workbookToArrayBuffer(workbook), buildSampleTemplateFileName());
  };

  const handleBackupFileChosen = async (file: File) => {
    const text = await file.text();
    const validation = validateJsonBackup(text);
    if (validation.valid && validation.backup) {
      setPendingBackup({ backup: validation.backup, validation });
    } else {
      setPendingBackup({ backup: { formatVersion: 1, exportedAt: '', dataset: {} as JsonBackup['dataset'], cards: [], studySessions: [], activity: [] }, validation });
    }
  };

  const handleClearConfirmed = async () => {
    setConfirmClearOpen(false);
    await clearLocalCache();
  };

  if (!dataset) {
    return (
      <EmptyState
        icon={FileJson}
        title="No dataset to back up yet"
        description="Import a workbook first, then come back here to export, save, or back up your data."
        primaryAction={{ label: 'Import Excel', onClick: () => onNavigate('import') }}
      />
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <section className="card-surface p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink">Current dataset</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-ink-muted">Source file</dt>
            <dd className="truncate text-ink">{dataset.sourceFileName}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Sheet</dt>
            <dd className="text-ink">{dataset.selectedSheetName}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Cards</dt>
            <dd className="text-ink">{cards.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Status</dt>
            <dd className={dataset.isDirty ? 'text-warning' : 'text-success'}>{dataset.isDirty ? 'Changes not yet exported' : 'Saved'}</dd>
          </div>
        </dl>
        {dataset.lastSavedAt && (
          <p className="mt-3 text-xs text-ink-muted">Last saved {formatDisplayDateTime(dataset.lastSavedAt)}</p>
        )}
      </section>

      <section className="card-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Save your progress</h2>
        <div className="flex flex-wrap gap-3">
          {isFileSystemAccessSupported() ? (
            <>
              <span className="badge-success self-center">Direct save supported</span>
              {fileHandleAvailable ? (
                <button type="button" className="btn-primary" onClick={saveToWorkbook}>
                  <Save size={16} aria-hidden="true" /> Save to workbook
                </button>
              ) : (
                <button type="button" className="btn-secondary" onClick={openLinkedWorkbook}>
                  <FolderOpen size={16} aria-hidden="true" /> Open linked workbook
                </button>
              )}
            </>
          ) : (
            <span className="badge-neutral self-center">Export mode</span>
          )}
          <button type="button" className="btn-secondary" onClick={exportExcel}>
            <Download size={16} aria-hidden="true" /> Export Excel
          </button>
        </div>
        {linkedFileName && <p className="mt-3 text-xs text-ink-secondary">Linked workbook: {linkedFileName}</p>}
      </section>

      <section className="card-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">JSON backup</h2>
        <p className="mb-3 text-xs text-ink-secondary">A full snapshot of your library, sessions, and activity history — useful as an extra safety net alongside Excel.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={handleExportJson}>
            <FileJson size={16} aria-hidden="true" /> Export JSON backup
          </button>
          <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} aria-hidden="true" /> Import JSON backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && handleBackupFileChosen(e.target.files[0])}
          />
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Template &amp; cache</h2>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={handleDownloadSample}>
            <Download size={16} aria-hidden="true" /> Download sample template
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => (ui.confirmBeforeClearingData ? setConfirmClearOpen(true) : clearLocalCache())}
          >
            <Trash2 size={16} aria-hidden="true" /> Clear local cache
          </button>
        </div>
      </section>

      {pendingBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4">
          <div className="card-surface w-full max-w-lg p-6">
            <h3 className="text-base font-semibold text-ink">Restore JSON backup</h3>
            {!pendingBackup.validation.valid ? (
              <div className="mt-3 rounded-lg border border-error/30 bg-error-subtle p-3.5 text-sm text-error">
                <p className="font-medium">This backup could not be validated:</p>
                <ul className="mt-1 list-disc pl-4 text-xs">
                  {pendingBackup.validation.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink-secondary">
                  This backup contains {pendingBackup.backup.cards.length} cards, exported{' '}
                  {pendingBackup.backup.exportedAt ? formatDisplayDateTime(pendingBackup.backup.exportedAt) : 'at an unknown time'}.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    className="btn-primary flex-1"
                    onClick={async () => {
                      await restoreBackup(pendingBackup.backup, 'merge');
                      setPendingBackup(null);
                    }}
                  >
                    Merge into current library
                  </button>
                  <button
                    type="button"
                    className="btn-secondary flex-1"
                    onClick={async () => {
                      await restoreBackup(pendingBackup.backup, 'new');
                      setPendingBackup(null);
                    }}
                  >
                    Restore as new dataset
                  </button>
                </div>
              </>
            )}
            <button type="button" className="btn-ghost mt-3 w-full" onClick={() => setPendingBackup(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear local cache?"
        description="This removes all locally cached cards, sessions, and activity from this browser. Your Excel files on disk are not affected, but be sure you've exported or saved recent progress first."
        confirmLabel="Clear cache"
        tone="danger"
        onConfirm={handleClearConfirmed}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}
