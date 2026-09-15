import { describe, expect, it } from 'vitest';
import { getCardStatus, isDueCard, isMasteredCard, isNewCard } from '@/utils/cardStatus';
import { createDefaultProgress } from '@/types';
import type { Card } from '@/types';

const REFERENCE_DATE = new Date('2026-06-15T12:00:00.000Z');

function makeCard(overrides: Partial<Card['progress']> = {}): Card {
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
    progress: { ...createDefaultProgress(), ...overrides }
  };
}

describe('card status utilities', () => {
  it('treats a card with no review history as new', () => {
    const card = makeCard();
    expect(isNewCard(card)).toBe(true);
    expect(getCardStatus(card, REFERENCE_DATE)).toBe('new');
    expect(isDueCard(card, REFERENCE_DATE)).toBe(true);
  });

  it('is due when nextReview is in the past (local calendar date)', () => {
    const yesterday = new Date(REFERENCE_DATE);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const card = makeCard({ repetitions: 1, lastReviewed: yesterday.toISOString(), nextReview: yesterday.toISOString() });
    expect(isDueCard(card, REFERENCE_DATE)).toBe(true);
    expect(getCardStatus(card, REFERENCE_DATE)).toBe('due');
  });

  it('is due when nextReview is exactly today', () => {
    const card = makeCard({ repetitions: 1, lastReviewed: REFERENCE_DATE.toISOString(), nextReview: REFERENCE_DATE.toISOString() });
    expect(isDueCard(card, REFERENCE_DATE)).toBe(true);
  });

  it('is not due when nextReview is in the future', () => {
    const future = new Date(REFERENCE_DATE);
    future.setUTCDate(future.getUTCDate() + 5);
    const card = makeCard({ repetitions: 1, lastReviewed: REFERENCE_DATE.toISOString(), nextReview: future.toISOString() });
    expect(isDueCard(card, REFERENCE_DATE)).toBe(false);
  });

  it('requires repetitions >= 3, easeFactor >= 2.3, and interval >= 21 to be mastered', () => {
    const notMastered = makeCard({ repetitions: 2, easeFactor: 2.6, interval: 30 });
    expect(isMasteredCard(notMastered)).toBe(false);

    const masteredButLowEase = makeCard({ repetitions: 3, easeFactor: 2.0, interval: 30 });
    expect(isMasteredCard(masteredButLowEase)).toBe(false);

    const masteredButShortInterval = makeCard({ repetitions: 3, easeFactor: 2.5, interval: 10 });
    expect(isMasteredCard(masteredButShortInterval)).toBe(false);

    const mastered = makeCard({ repetitions: 3, easeFactor: 2.3, interval: 21 });
    expect(isMasteredCard(mastered)).toBe(true);
  });
});
