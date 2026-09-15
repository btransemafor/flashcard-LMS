import React from 'react';
import type { ColumnMapping } from '@/types';

interface ColumnMapperProps {
  mappings: ColumnMapping[];
  headers: string[];
  onChange: (id: ColumnMapping['id'], header: string | null) => void;
}

const UNMAPPED = '__unmapped__';

export function ColumnMapper({ mappings, headers, onChange }: ColumnMapperProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-ink">Column mapping</h3>
      <p className="mb-4 text-xs text-ink-secondary">
        We matched your columns automatically. Adjust any mapping that doesn't look right.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {mappings.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5">
            <span className="text-sm text-ink">
              {m.id}
              {m.required && <span className="text-error"> *</span>}
            </span>
            <select
              aria-label={`Map column for ${m.id}`}
              value={m.matchedHeader ?? UNMAPPED}
              onChange={(e) => onChange(m.id, e.target.value === UNMAPPED ? null : e.target.value)}
              className="input-field !w-auto !py-1.5 text-xs"
            >
              <option value={UNMAPPED}>Not mapped</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
