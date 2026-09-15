import React from 'react';

interface DataPreviewTableProps {
  headers: string[];
  rows: Record<string, unknown>[];
}

export function DataPreviewTable({ headers, rows }: DataPreviewTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="bg-surface-secondary text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="px-3.5 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {headers.map((h) => (
                <td key={h} className="max-w-[220px] truncate px-3.5 py-2.5 text-ink-secondary">
                  {String(row[h] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
