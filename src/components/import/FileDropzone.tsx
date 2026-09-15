import React, { useRef, useState } from 'react';
import { FileSpreadsheet, ShieldCheck, UploadCloud } from 'lucide-react';

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  error?: string | null;
}

export function FileDropzone({ onFileSelected, error }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFileSelected(files[0]);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Drag and drop an Excel file here, or press Enter to browse"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors duration-200 ${
          isDragging ? 'border-primary bg-primary-subtle' : 'border-border-strong bg-surface hover:border-primary/50'
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-subtle text-primary">
          <UploadCloud size={24} aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-medium text-ink">Drag and drop your Excel file here</p>
          <p className="mt-1 text-xs text-ink-secondary">or click to browse — supports .xlsx and .xls</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-error/30 bg-error-subtle px-3.5 py-2.5 text-sm text-error">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <FileSpreadsheet size={14} aria-hidden="true" /> .xlsx, .xls supported
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} aria-hidden="true" /> Your spreadsheet stays on your device — nothing is uploaded.
        </span>
      </div>
    </div>
  );
}
