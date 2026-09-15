import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationReport } from '@/components/import/ValidationReport';

describe('ValidationReport', () => {
  it('shows a success message when every row is valid', () => {
    render(
      <ValidationReport
        rowResults={[{ row: 2, status: 'valid', issues: [] }]}
        validCount={1}
        invalidCount={0}
        duplicateCount={0}
        totalRows={1}
      />
    );
    expect(screen.getByText(/everything looks good/i)).toBeInTheDocument();
  });

  it('lists per-row issues when rows are invalid', () => {
    render(
      <ValidationReport
        rowResults={[{ row: 3, status: 'invalid', issues: [{ row: 3, field: 'Term', message: 'Term is required and cannot be empty.' }] }]}
        validCount={0}
        invalidCount={1}
        duplicateCount={0}
        totalRows={1}
      />
    );
    expect(screen.getByText(/a few rows that need attention/i)).toBeInTheDocument();
    expect(screen.getByText(/row 3/i)).toBeInTheDocument();
    expect(screen.getByText(/term is required/i)).toBeInTheDocument();
  });
});
