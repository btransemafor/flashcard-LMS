import React from 'react';
import { Download, FolderOpen } from 'lucide-react';
import { ImportWizard } from '@/components/import/ImportWizard';
import { useApp } from '@/store/AppContext';
import type { ViewId } from '@/App';
import { buildSampleTemplateWorkbook, workbookToArrayBuffer, triggerBrowserDownload } from '@/services/excelService';
import { buildSampleTemplateFileName } from '@/utils/fileNaming';
import { isFileSystemAccessSupported } from '@/services/fileSystemService';

interface ImportViewProps {
  onNavigate: (view: ViewId) => void;
}

export function ImportView({ onNavigate }: ImportViewProps) {
  const {
    actions: { openLinkedWorkbook }
  } = useApp();

  const handleDownloadSample = () => {
    const workbook = buildSampleTemplateWorkbook();
    triggerBrowserDownload(workbookToArrayBuffer(workbook), buildSampleTemplateFileName());
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Import your flashcards</h2>
          <p className="text-sm text-ink-secondary">Excel is your source of truth — nothing leaves your browser.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={handleDownloadSample}>
            <Download size={16} aria-hidden="true" /> Sample template
          </button>
          {isFileSystemAccessSupported() && (
            <button type="button" className="btn-secondary" onClick={openLinkedWorkbook}>
              <FolderOpen size={16} aria-hidden="true" /> Open linked workbook
            </button>
          )}
        </div>
      </div>

      <ImportWizard onGoToLibrary={() => onNavigate('library')} />
    </div>
  );
}
