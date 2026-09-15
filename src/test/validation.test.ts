import { describe, expect, it } from 'vitest';
import { buildColumnMappings, findDuplicateHeaders, validateRow, validateRows } from '@/utils/validation';

const HEADERS = ['ID', 'Topic', 'Term', 'Definition', 'Example', 'Notes', 'Tags', 'Correct', 'Wrong', 'EaseFactor', 'Repetitions', 'Interval', 'NextReview', 'LastReviewed'];

describe('buildColumnMappings', () => {
  it('matches canonical columns case-insensitively', () => {
    const mappings = buildColumnMappings(['term', 'DEFINITION', 'Topic']);
    const term = mappings.find((m) => m.id === 'Term');
    const definition = mappings.find((m) => m.id === 'Definition');
    expect(term?.matchedHeader).toBe('term');
    expect(definition?.matchedHeader).toBe('DEFINITION');
  });

  it('leaves unmatched canonical columns null', () => {
    const mappings = buildColumnMappings(['Term', 'Definition']);
    const tags = mappings.find((m) => m.id === 'Tags');
    expect(tags?.matchedHeader).toBeNull();
  });
});

describe('findDuplicateHeaders', () => {
  it('detects case-insensitive duplicate headers', () => {
    expect(findDuplicateHeaders(['Term', 'term', 'Definition'])).toEqual(['term']);
  });

  it('returns an empty array when there are no duplicates', () => {
    expect(findDuplicateHeaders(['Term', 'Definition'])).toEqual([]);
  });
});

describe('validateRow', () => {
  const mappings = buildColumnMappings(HEADERS);

  it('requires Term', () => {
    const issues = validateRow({ Term: '', Definition: 'x' }, mappings, 2);
    expect(issues.some((i) => i.field === 'Term')).toBe(true);
  });

  it('requires Definition', () => {
    const issues = validateRow({ Term: 'x', Definition: '' }, mappings, 2);
    expect(issues.some((i) => i.field === 'Definition')).toBe(true);
  });

  it('rejects negative numeric progress fields', () => {
    const issues = validateRow({ Term: 'a', Definition: 'b', Correct: -1 }, mappings, 2);
    expect(issues.some((i) => i.field === 'Correct')).toBe(true);
  });

  it('rejects an EaseFactor below the minimum of 1.3', () => {
    const issues = validateRow({ Term: 'a', Definition: 'b', EaseFactor: 1.0 }, mappings, 2);
    expect(issues.some((i) => i.field === 'EaseFactor')).toBe(true);
  });

  it('accepts a fully blank row with no issues (handled separately as skippable)', () => {
    const issues = validateRow({ Term: '', Definition: '' }, mappings, 2);
    expect(issues).toEqual([]);
  });

  it('passes a fully valid row', () => {
    const issues = validateRow({ Term: 'align', Definition: 'to line up', Correct: 2, Wrong: 1, EaseFactor: 2.5 }, mappings, 2);
    expect(issues).toEqual([]);
  });
});

describe('validateRows', () => {
  const mappings = buildColumnMappings(HEADERS);

  it('flags duplicate Topic+Term combinations after the first occurrence', () => {
    const rows = [
      { Topic: 'Java', Term: 'align', Definition: 'a' },
      { Topic: 'Java', Term: 'align', Definition: 'b' }
    ];
    const result = validateRows(rows, mappings);
    expect(result.duplicateCount).toBe(1);
    expect(result.validCount).toBe(1);
  });

  it('skips fully blank rows without counting them as errors', () => {
    const rows = [
      { Topic: '', Term: '', Definition: '' },
      { Topic: 'Java', Term: 'align', Definition: 'a' }
    ];
    const result = validateRows(rows, mappings);
    expect(result.totalRows).toBe(1);
    expect(result.validCount).toBe(1);
  });
});
