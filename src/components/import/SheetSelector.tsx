import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

interface SheetSelectorProps {
  sheetNames: string[];
  selected: string | null;
  onSelect: (sheet: string) => void;
  onContinue: () => void;
}

export function SheetSelector({ sheetNames, selected, onSelect, onContinue }: SheetSelectorProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">This workbook has multiple sheets</h3>
      <p className="mt-1 text-sm text-ink-secondary">Choose which sheet contains your flashcards.</p>

      <div className="mt-4 space-y-2" role="radiogroup" aria-label="Select a sheet">
        {sheetNames.map((name) => (
          <label
            key={name}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors duration-200 ${
              selected === name ? 'border-primary bg-primary-subtle' : 'border-border hover:border-border-strong'
            }`}
          >
            <input
              type="radio"
              name="sheet"
              checked={selected === name}
              onChange={() => onSelect(name)}
              className="h-4 w-4 accent-primary"
            />
            <FileSpreadsheet size={16} className="text-ink-muted" aria-hidden="true" />
            <span className="font-medium text-ink">{name}</span>
          </label>
        ))}
      </div>

      <button type="button" className="btn-primary mt-5" onClick={onContinue} disabled={!selected}>
        Continue
      </button>
    </div>
  );
}
