import { describe, expect, it } from 'vitest';
import { mergeImportedCards } from '@/services/mergeService';
import { buildColumnMappings, validateRows } from '@/utils/validation';
import { createDefaultProgress } from '@/types';
import type { Card } from '@/types';

const HEADERS = ['ID', 'Topic', 'Term', 'Definition', 'Example', 'Notes', 'Tags', 'Correct', 'Wrong', 'EaseFactor', 'Repetitions', 'Interval', 'NextReview', 'LastReviewed'];
const mappings = buildColumnMappings(HEADERS);

function makeExistingCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'java\u241fpolymorphism',
    datasetId: 'dataset-1',
    sourceRowIndex: 0,
    topic: 'Java',
    term: 'polymorphism',
    definition: 'Old definition',
    example: '',
    notes: '',
    tags: [],
    originalRow: {},
    progress: { ...createDefaultProgress(), repetitions: 3, easeFactor: 2.6, interval: 30, correct: 5, wrong: 1 },
    ...overrides
  };
}

describe('mergeImportedCards', () => {
  it('merges by explicit ID when present in both the file and existing cards', () => {
    const existing = makeExistingCard({ id: 'custom-id-1' });
    const rows = [{ ID: 'custom-id-1', Topic: 'Java', Term: 'polymorphism (updated)', Definition: 'New definition' }];
    const rowResults = validateRows(rows, mappings).rowResults;
    const { cards, report } = mergeImportedCards({ datasetId: 'dataset-1', existingCards: [existing], parsedRows: rows, rowResults, mappings });

    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('custom-id-1');
    expect(cards[0].term).toBe('polymorphism (updated)');
    expect(report.updatedCount).toBe(1);
  });

  it('merges by normalized Topic + Term when no ID is provided', () => {
    const existing = makeExistingCard();
    const rows = [{ Topic: '  JAVA  ', Term: '  Polymorphism ', Definition: 'Refined definition' }];
    const rowResults = validateRows(rows, mappings).rowResults;
    const { cards } = mergeImportedCards({ datasetId: 'dataset-1', existingCards: [existing], parsedRows: rows, rowResults, mappings });

    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe(existing.id);
    expect(cards[0].definition).toBe('Refined definition');
  });

  it('preserves existing IndexedDB progress when the imported row has no progress columns', () => {
    const existing = makeExistingCard();
    const rows = [{ Topic: 'Java', Term: 'polymorphism', Definition: 'Updated definition only' }];
    const rowResults = validateRows(rows, mappings).rowResults;
    const { cards } = mergeImportedCards({ datasetId: 'dataset-1', existingCards: [existing], parsedRows: rows, rowResults, mappings });

    expect(cards[0].progress.repetitions).toBe(3);
    expect(cards[0].progress.easeFactor).toBe(2.6);
    expect(cards[0].progress.interval).toBe(30);
  });

  it('uses the imported row progress when the file explicitly provides valid progress values', () => {
    const existing = makeExistingCard();
    const rows = [{ Topic: 'Java', Term: 'polymorphism', Definition: 'def', Repetitions: 1, EaseFactor: 2.0, Interval: 3, Correct: 1, Wrong: 0 }];
    const rowResults = validateRows(rows, mappings).rowResults;
    const { cards } = mergeImportedCards({ datasetId: 'dataset-1', existingCards: [existing], parsedRows: rows, rowResults, mappings });

    expect(cards[0].progress.repetitions).toBe(1);
    expect(cards[0].progress.easeFactor).toBe(2.0);
    expect(cards[0].progress.interval).toBe(3);
  });

  it('adds brand-new cards that do not match any existing card', () => {
    const existing = makeExistingCard();
    const rows = [{ Topic: 'Java', Term: 'encapsulation', Definition: 'def' }];
    const rowResults = validateRows(rows, mappings).rowResults;
    const { cards, report } = mergeImportedCards({ datasetId: 'dataset-1', existingCards: [existing], parsedRows: rows, rowResults, mappings });

    expect(cards).toHaveLength(2);
    expect(report.newCount).toBe(1);
  });

  it('keeps existing cards that are absent from the imported file and reports them as missing', () => {
    const existing = makeExistingCard();
    const rows: Record<string, unknown>[] = [];
    const rowResults = validateRows(rows, mappings).rowResults;
    const { cards, report } = mergeImportedCards({ datasetId: 'dataset-1', existingCards: [existing], parsedRows: rows, rowResults, mappings });

    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe(existing.id);
    expect(report.missingCount).toBe(1);
  });
});
