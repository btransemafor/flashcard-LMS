import type { CardProgress, Rating } from '@/types';
import { RATING_TO_QUALITY } from '@/types';
import { toISOTimestamp, addDaysISO } from '@/utils/date';

export const MIN_EASE_FACTOR = 1.3;

/**
 * Runs one step of the SM-2 spaced-repetition algorithm.
 * Does NOT mutate the input — always returns a new CardProgress object.
 *
 * @param card current progress state
 * @param quality SM-2 quality score, 0-5 (this app only ever passes 1, 3, 4 or 5)
 * @param now reference "now" instant, injectable for deterministic tests
 */
export function sm2(card: CardProgress, quality: number, now: Date = new Date()): CardProgress {
  const next: CardProgress = { ...card };

  if (quality < 3) {
    next.repetitions = 0;
    next.interval = 1;
  } else {
    if (next.repetitions === 0) {
      next.interval = 1;
    } else if (next.repetitions === 1) {
      next.interval = 6;
    } else {
      next.interval = Math.round(next.interval * next.easeFactor);
    }
    next.repetitions = next.repetitions + 1;
  }

  const newEaseFactor =
    next.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  next.easeFactor = Math.max(MIN_EASE_FACTOR, newEaseFactor);

  next.lastReviewed = toISOTimestamp(now);
  next.nextReview = addDaysISO(now, next.interval);

  return next;
}

/** Applies a user-facing Rating to a CardProgress, updating correct/wrong counters too. */
export function applyRating(card: CardProgress, rating: Rating, now: Date = new Date()): CardProgress {
  const quality = RATING_TO_QUALITY[rating];
  const scheduled = sm2(card, quality, now);
  const updated: CardProgress = { ...scheduled };
  if (rating === 'again') {
    updated.wrong = card.wrong + 1;
  } else {
    updated.correct = card.correct + 1;
  }
  return updated;
}
