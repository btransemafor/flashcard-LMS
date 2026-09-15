import React, { useMemo, useState } from 'react';
import type * as XLSX from 'xlsx';
import { FileDropzone } from './FileDropzone';
import { SheetSelector } from './SheetSelector';
import { ColumnMapper } from './ColumnMapper';
import { DataPreviewTable } from './DataPreviewTable';
import { ValidationReport } from './ValidationReport';
import { MergeReport } from './MergeReport';
import { readWorkbookFromFile, ExcelParseError, parseSheetRows, getSheetNames, resolveExportColumnOrder } from '@/services/excelService';
import { buildColumnMappings, findDuplicateHeaders, validateRows } from '@/utils/validation';
import { useApp } from '@/store/AppContext';
import type { ColumnMapping, MergeReport as MergeReportType } from '@/types';

type Step = 'select' | 'sheet' | 'preview' | 'result';

interface ImportWizardProps {
  onGoToLibrary: () => void;
}

export function ImportWizard({ onGoToLibrary }: ImportWizardProps) {
  const { actions } = useApp();
  const [step, setStep] = useState<Step>('select');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [mergeReport, setMergeReport] = useState<MergeReportType | null>(null);

  const duplicateHeaders = useMemo(() => findDuplicateHeaders(headers), [headers]);
  const validation = useMemo(() => validateRows(rows, mappings), [rows, mappings]);

  const handleFileSelected = async (selectedFile: File) => {
    setError(null);
    setIsProcessing(true);
    try {
      const { workbook: wb } = await readWorkbookFromFile(selectedFile);
      const names = getSheetNames(wb);
      setFile(selectedFile);
      setWorkbook(wb);
      setSheetNames(names);
      if (names.length > 1) {
        setStep('sheet');
      } else {
        loadSheet(wb, names[0]);
      }
    } catch (err) {
      setError(err instanceof ExcelParseError ? err.message : 'This file could not be read. Please try a different workbook.');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const { headers: sheetHeaders, rows: sheetRows } = parseSheetRows(wb, sheetName);
    setSelectedSheet(sheetName);
    setHeaders(sheetHeaders);
    setRows(sheetRows);
    setMappings(buildColumnMappings(sheetHeaders));
    setStep('preview');
  };

  const handleMappingChange = (id: ColumnMapping['id'], header: string | null) => {
    setMappings((prev) => prev.map((m) => (m.id === id ? { ...m, matchedHeader: header } : m)));
  };

  const handleCommitImport = async () => {
    if (!file || !workbook || !selectedSheet) return;
    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const columnOrder = resolveExportColumnOrder(headers);
      const report = await actions.commitImport({
        fileName: file.name,
        sheetName: selectedSheet,
        sheetNames,
        columnOrder,
        parsedRows: rows,
        rowResults: validation.rowResults,
        mappings,
        workbookBuffer: buffer
      });
      setMergeReport(report);
      setStep('result');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetWizard = () => {
    setStep('select');
    setError(null);
    setFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet(null);
    setHeaders([]);
    setRows([]);
    setMappings([]);
    setMergeReport(null);
  };

  const stepIndex = { select: 0, sheet: 1, preview: 2, result: 3 }[step];
  const stepLabels = ['Select file', 'Select sheet', 'Preview & validate', 'Result'];

  return (
    <div className="card-surface p-6">
      <ol className="mb-6 flex flex-wrap items-center gap-2 text-xs text-ink-muted" aria-label="Import progress">
        {stepLabels.map((label, i) => (
          <li key={label} className={`flex items-center gap-2 ${i <= stepIndex ? 'text-primary font-medium' : ''}`}>
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                i <= stepIndex ? 'bg-primary text-white' : 'bg-surface-secondary text-ink-muted'
              }`}
            >
              {i + 1}
            </span>
            {label}
            {i < stepLabels.length - 1 && <span className="text-border-strong">/</span>}
          </li>
        ))}
      </ol>

      {step === 'select' && <FileDropzone onFileSelected={handleFileSelected} error={error} />}

      {step === 'sheet' && (
        <SheetSelector
          sheetNames={sheetNames}
          selected={selectedSheet}
          onSelect={setSelectedSheet}
          onContinue={() => workbook && selectedSheet && loadSheet(workbook, selectedSheet)}
        />
      )}

      {step === 'preview' && (
        <div className="space-y-6">
          {duplicateHeaders.length > 0 && (
            <p role="alert" className="rounded-lg border border-error/30 bg-error-subtle px-3.5 py-2.5 text-sm text-error">
              Duplicate column headers detected: {duplicateHeaders.join(', ')}. Please rename them in your spreadsheet before importing.
            </p>
          )}
          <ColumnMapper mappings={mappings} headers={headers} onChange={handleMappingChange} />
          <ValidationReport
            rowResults={validation.rowResults}
            validCount={validation.validCount}
            invalidCount={validation.invalidCount}
            duplicateCount={validation.duplicateCount}
            totalRows={validation.totalRows}
          />
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink">Preview (first 10 rows)</h3>
            <DataPreviewTable headers={headers} rows={rows.slice(0, 10)} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={handleCommitImport}
              disabled={isProcessing || duplicateHeaders.length > 0 || validation.validCount === 0}
            >
              {isProcessing ? 'Importing…' : `Import ${validation.validCount} cards`}
            </button>
            <button type="button" className="btn-secondary" onClick={resetWizard}>
              Start over
            </button>
          </div>
        </div>
      )}

      {step === 'result' && mergeReport && (
        <MergeReport report={mergeReport} onDone={resetWizard} onGoToLibrary={onGoToLibrary} />
      )}
    </div>
  );
}
