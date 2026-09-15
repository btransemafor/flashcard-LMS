import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SaveStatus } from '@/components/common/SaveStatus';
import type { Dataset } from '@/types';

function makeDataset(overrides: Partial<Dataset> = {}): Dataset {
  return {
    id: 'd1',
    name: 'Deck',
    sourceFileName: 'file.xlsx',
    selectedSheetName: 'Cards',
    sheetNames: ['Cards'],
    importedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workbookMetadata: { columnOrder: [], rowCount: 0 },
    isDirty: false,
    lastSavedAt: null,
    lastSaveMode: null,
    ...overrides
  };
}

describe('SaveStatus', () => {
  it('shows "no workbook linked" when there is no dataset', () => {
    render(<SaveStatus dataset={null} />);
    expect(screen.getByText(/no workbook linked/i)).toBeInTheDocument();
  });

  it('shows the dirty-state notice when the dataset has unsaved changes', () => {
    render(<SaveStatus dataset={makeDataset({ isDirty: true })} />);
    expect(screen.getByText(/changes not yet exported/i)).toBeInTheDocument();
  });

  it('shows "saved to workbook" after a successful direct save', () => {
    render(<SaveStatus dataset={makeDataset({ isDirty: false, lastSaveMode: 'workbook', lastSavedAt: new Date().toISOString() })} />);
    expect(screen.getByText(/saved to workbook/i)).toBeInTheDocument();
  });

  it('shows "saved locally" after export without a linked workbook', () => {
    render(<SaveStatus dataset={makeDataset({ isDirty: false, lastSaveMode: 'export', lastSavedAt: new Date().toISOString() })} />);
    expect(screen.getByText(/saved locally/i)).toBeInTheDocument();
  });
});
