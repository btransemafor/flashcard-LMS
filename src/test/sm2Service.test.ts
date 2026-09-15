import { describe, expect, it } from 'vitest';
import { sm2, applyRating, MIN_EASE_FACTOR } from '@/services/sm2Service';
import { createDefaultProgress } from '@/types';

const FIXED_NOW = new Date('2026-01-15T09:00:00.000Z');

describe('sm2Service', () => {
  it('starts from the documented initial state', () => {
    const initial = createDefaultProgress();
    expect(initial).toEqual({
      repetitions: 0,
      easeFactor: 2.5,
      interval: 0,
      nextReview: null,
      lastReviewed: null,
      correct: 0,
      wrong: 0
    });
  });

  it('does not mutate the input card', () => {
    const card = createDefaultProgress();
    const snapshot = { ...card };
    sm2(card, 4, FIXED_NOW);
    expect(card).toEqual(snapshot);
  });

  it('Again (quality 1) resets repetitions and sets interval to 1', () => {
    const card = { ...createDefaultProgress(), repetitions: 3, interval: 20, easeFactor: 2.4 };
    const result = sm2(card, 1, FIXED_NOW);
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
    expect(result.lastReviewed).toBe(FIXED_NOW.toISOString());
  });

  it('Hard (quality 3) grows repetitions and schedules using the standard SM-2 interval ladder', () => {
    let card = createDefaultProgress();
    card = sm2(card, 3, FIXED_NOW); // rep 0 -> interval 1
    expect(card.interval).toBe(1);
    expect(card.repetitions).toBe(1);
    card = sm2(card, 3, FIXED_NOW); // rep 1 -> interval 6
    expect(card.interval).toBe(6);
    expect(card.repetitions).toBe(2);
  });

  it('Good (quality 4) follows the 1 / 6 / interval*EF progression', () => {
    let card = createDefaultProgress();
    card = sm2(card, 4, FIXED_NOW);
    expect(card.interval).toBe(1);
    card = sm2(card, 4, FIXED_NOW);
    expect(card.interval).toBe(6);
    const easeAfterTwo = card.easeFactor;
    card = sm2(card, 4, FIXED_NOW);
    expect(card.interval).toBe(Math.round(6 * easeAfterTwo));
  });

  it('Easy (quality 5) increases the ease factor', () => {
    const card = createDefaultProgress();
    const result = sm2(card, 5, FIXED_NOW);
    expect(result.easeFactor).toBeGreaterThan(card.easeFactor);
  });

  it('Hard (quality 3) decreases the ease factor', () => {
    const card = createDefaultProgress();
    const result = sm2(card, 3, FIXED_NOW);
    expect(result.easeFactor).toBeLessThan(card.easeFactor);
  });

  it('never lets the ease factor drop below the documented minimum of 1.3', () => {
    let card = { ...createDefaultProgress(), easeFactor: 1.3 };
    for (let i = 0; i < 10; i++) {
      card = sm2(card, 1, FIXED_NOW);
    }
    expect(card.easeFactor).toBeGreaterThanOrEqual(MIN_EASE_FACTOR);
    expect(card.easeFactor).toBe(MIN_EASE_FACTOR);
  });

  it('sets nextReview to lastReviewed + interval days', () => {
    const card = createDefaultProgress();
    const result = sm2(card, 4, FIXED_NOW);
    const expected = new Date(FIXED_NOW.getTime() + result.interval * 86400000);
    expect(result.nextReview).toBe(expected.toISOString());
  });

  describe('applyRating', () => {
    it('increments wrong on Again and keeps correct unchanged', () => {
      const card = createDefaultProgress();
      const result = applyRating(card, 'again', FIXED_NOW);
      expect(result.wrong).toBe(1);
      expect(result.correct).toBe(0);
    });

    it('increments correct on Hard, Good, and Easy', () => {
      for (const rating of ['hard', 'good', 'easy'] as const) {
        const card = createDefaultProgress();
        const result = applyRating(card, rating, FIXED_NOW);
        expect(result.correct).toBe(1);
        expect(result.wrong).toBe(0);
      }
    });
  });
});
