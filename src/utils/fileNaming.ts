import { format } from 'date-fns';

/** Builds the export file name: learning-playground-progress-YYYY-MM-DD.xlsx */
export function buildExportFileName(date: Date = new Date()): string {
  return `learning-playground-progress-${format(date, 'yyyy-MM-dd')}.xlsx`;
}

export function buildJsonBackupFileName(date: Date = new Date()): string {
  return `learning-playground-backup-${format(date, 'yyyy-MM-dd-HHmm')}.json`;
}

export function buildSampleTemplateFileName(): string {
  return 'learning-playground-sample-template.xlsx';
}
