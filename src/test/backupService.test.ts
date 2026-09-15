import { describe, expect, it } from 'vitest';
import { mergeBackupCards, validateJsonBackup } from '@/services/backupService';
import { createDefaultProgress } from '@/types';
import type { Card, JsonBackup } from '@/types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    datasetId: 'dataset-1',
    sourceRowIndex: 0,
    topic: 'Java',
    term: 'polymorphism',
    definition: 'def',
    example: '',
    notes: '',
    tags: [],
    originalRow: {},
    progress: createDefaultProgress(),
    ...overrides
  };
}

describe('validateJsonBackup', () => {
  it('rejects malformed JSON', () => {
    const result = validateJsonBackup('{not json');
    expect(result.valid).toBe(false);
  });

  it('rejects an unsupported format version', () => {
    const backup = { formatVersion: 99, dataset: {}, cards: [], studySessions: [], activity: [] };
    const result = validateJsonBackup(JSON.stringify(backup));
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/version/i);
  });

  it('rejects a backup with a card missing Term or Definition', () => {
    const backup = {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      dataset: { id: 'd1' },
      cards: [{ id: 'c1', term: '', definition: 'x', progress: createDefaultProgress() }],
      studySessions: [],
      activity: []
    };
    const result = validateJsonBackup(JSON.stringify(backup));
    expect(result.valid).toBe(false);
  });

  it('accepts a well-formed backup', () => {
    const backup: JsonBackup = {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      dataset: {
        id: 'd1',
        name: 'My Deck',
        sourceFileName: 'file.xlsx',
        selectedSheetName: 'Cards',
        sheetNames: ['Cards'],
        importedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        workbookMetadata: { columnOrder: ['Term', 'Definition'], rowCount: 1 }
      },
      cards: [makeCard()],
      studySessions: [],
      activity: []
    };
    const result = validateJsonBackup(JSON.stringify(backup));
    expect(result.valid).toBe(true);
    expect(result.backup?.cards).toHaveLength(1);
  });
});

describe('mergeBackupCards', () => {
  it('overwrites a matching existing card by id', () => {
    const existing = makeCard({ definition: 'old' });
    const backupCard = makeCard({ definition: 'new from backup' });
    const merged = mergeBackupCards([existing], [backupCard], 'dataset-1');
    expect(merged).toHaveLength(1);
    expect(merged[0].definition).toBe('new from backup');
  });

  it('matches by topic + term when ids differ', () => {
    const existing = makeCard({ id: 'old-id' });
    const backupCard = makeCard({ id: 'new-id', definition: 'refreshed' });
    const merged = mergeBackupCards([existing], [backupCard], 'dataset-1');
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('old-id');
    expect(merged[0].definition).toBe('refreshed');
  });

  it('keeps existing cards not present in the backup', () => {
    const existing = makeCard({ id: 'keep-me', term: 'unrelated' });
    const merged = mergeBackupCards([existing], [], 'dataset-1');
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('keep-me');
  });
});
