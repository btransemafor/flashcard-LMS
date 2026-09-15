import type { ColumnMapping, ValidationIssue, ImportRowResult } from '@/types';
import { normalizeHeader } from './normalize';
import { parseToISOOrNull } from './date';
import { MIN_EASE_FACTOR } from '@/services/sm2Service';

/** Canonical Excel schema, in the order they should appear on export. */
export const CANONICAL_COLUMNS: { id: ColumnMapping['id']; required: boolean; aliases: string[] }[] = [
  { id: 'ID', required: false, aliases: ['id', 'card id', 'cardid'] },
  { id: 'Topic', required: false, aliases: ['topic', 'deck', 'category'] },
  { id: 'Term', required: true, aliases: ['term', 'word', 'front', 'question'] },
  { id: 'Definition', required: true, aliases: ['definition', 'meaning', 'back', 'answer'] },
  { id: 'Example', required: false, aliases: ['example', 'example sentence'] },
  { id: 'Notes', required: false, aliases: ['notes', 'note'] },
  { id: 'Tags', required: false, aliases: ['tags', 'tag', 'labels'] },
  { id: 'LastReviewed', required: false, aliases: ['lastreviewed', 'last reviewed'] },
  { id: 'Correct', required: false, aliases: ['correct'] },
  { id: 'Wrong', required: false, aliases: ['wrong', 'incorrect'] },
  { id: 'EaseFactor', required: false, aliases: ['easefactor', 'ease factor'] },
  { id: 'Repetitions', required: false, aliases: ['repetitions', 'reps'] },
  { id: 'Interval', required: false, aliases: ['interval'] },
  { id: 'NextReview', required: false, aliases: ['nextreview', 'next review'] }
];

export const PROGRESS_COLUMN_IDS: ColumnMapping['id'][] = [
  'LastReviewed',
  'Correct',
  'Wrong',
  'EaseFactor',
  'Repetitions',
  'Interval',
  'NextReview'
];

/**
 * Builds a best-effort mapping from the canonical schema to the actual headers present
 * in an imported file, using case-insensitive / whitespace-tolerant matching.
 */
export function buildColumnMappings(headers: string[]): ColumnMapping[] {
  const normalizedHeaders = headers.map((h) => ({ raw: h, normalized: normalizeHeader(h) }));
  return CANONICAL_COLUMNS.map(({ id, required, aliases }) => {
    const match = normalizedHeaders.find((h) => aliases.includes(h.normalized));
    return { id, matchedHeader: match ? match.raw : null, required };
  });
}

/** Detects duplicate headers (case-insensitive), returning the list of duplicated header names. */
export function findDuplicateHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  for (const h of headers) {
    const key = normalizeHeader(h);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return Array.from(seen.entries())
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
}

function isBlankRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every((v) => v === null || v === undefined || String(v).trim() === '');
}

function isNonNegativeNumber(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true; // optional -> defaults later
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= 0;
}

/**
 * Validates a single raw Excel row (keyed by ORIGINAL header names) against the mapped schema.
 * Returns the list of issues found; an empty array means the row is valid.
 */
export function validateRow(row: Record<string, unknown>, mappings: ColumnMapping[], rowNumber: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (isBlankRow(row)) return issues; // blank rows are skipped elsewhere, not reported as errors

  const getValue = (id: ColumnMapping['id']): unknown => {
    const mapping = mappings.find((m) => m.id === id);
    if (!mapping?.matchedHeader) return undefined;
    return row[mapping.matchedHeader];
  };

  const term = getValue('Term');
  if (term === undefined || term === null || String(term).trim() === '') {
    issues.push({ row: rowNumber, field: 'Term', message: 'Term is required and cannot be empty.' });
  }

  const definition = getValue('Definition');
  if (definition === undefined || definition === null || String(definition).trim() === '') {
    issues.push({ row: rowNumber, field: 'Definition', message: 'Definition is required and cannot be empty.' });
  }

  const numericFields: ColumnMapping['id'][] = ['Correct', 'Wrong', 'Repetitions', 'Interval'];
  for (const field of numericFields) {
    const value = getValue(field);
    if (!isNonNegativeNumber(value)) {
      issues.push({ row: rowNumber, field, message: `${field} must be a non-negative number.` });
    }
  }

  const easeFactor = getValue('EaseFactor');
  if (easeFactor !== undefined && easeFactor !== null && String(easeFactor).trim() !== '') {
    const n = typeof easeFactor === 'number' ? easeFactor : Number(easeFactor);
    if (!Number.isFinite(n) || n < MIN_EASE_FACTOR) {
      issues.push({ row: rowNumber, field: 'EaseFactor', message: `EaseFactor must be a number of at least ${MIN_EASE_FACTOR}.` });
    }
  }

  const dateFields: ColumnMapping['id'][] = ['LastReviewed', 'NextReview'];
  for (const field of dateFields) {
    const value = getValue(field);
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      const parsed = parseToISOOrNull(value);
      if (parsed === null) {
        issues.push({ row: rowNumber, field, message: `${field} could not be parsed as a date. Leave blank if unknown.` });
      }
    }
  }

  return issues;
}

/** Validates a whole set of raw rows, returning per-row results plus aggregate counts. */
export function validateRows(rows: Record<string, unknown>[], mappings: ColumnMapping[]) {
  const rowResults: ImportRowResult[] = [];
  const seenKeys = new Set<string>();
  let duplicateCount = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // header is row 1 in typical spreadsheets
    if (isBlankRow(row)) return; // fully blank rows are silently ignored

    const issues = validateRow(row, mappings, rowNumber);

    const idMapping = mappings.find((m) => m.id === 'ID')?.matchedHeader;
    const topicMapping = mappings.find((m) => m.id === 'Topic')?.matchedHeader;
    const termMapping = mappings.find((m) => m.id === 'Term')?.matchedHeader;
    const idValue = idMapping ? String(row[idMapping] ?? '').trim() : '';
    const topicValue = topicMapping ? String(row[topicMapping] ?? '').trim() : '';
    const termValue = termMapping ? String(row[termMapping] ?? '').trim() : '';
    const key = idValue ? `id:${idValue.toLowerCase()}` : `tt:${topicValue.toLowerCase()}::${termValue.toLowerCase()}`;

    let status: ImportRowResult['status'] = issues.length > 0 ? 'invalid' : 'valid';
    if (status === 'valid' && seenKeys.has(key)) {
      status = 'duplicate';
      duplicateCount++;
    } else {
      seenKeys.add(key);
    }

    rowResults.push({ row: rowNumber, status, issues });
  });

  const validCount = rowResults.filter((r) => r.status === 'valid').length;
  const invalidCount = rowResults.filter((r) => r.status === 'invalid').length;

  return { rowResults, validCount, invalidCount, duplicateCount, totalRows: rowResults.length };
}
