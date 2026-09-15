import type { Card, CardStatus } from '@/types';
import { isDueByLocalCalendar } from './date';

/**
 * Product-level thresholds for card status. These are NOT part of the SM-2
 * algorithm itself — SM-2 only produces repetitions/easeFactor/interval/nextReview.
 * "Mastered" and "learning" are display/reporting conventions layered on top.
 */
export const MASTERY_MIN_REPETITIONS = 3;
export const MASTERY_MIN_EASE_FACTOR = 2.3;
export const MASTERY_MIN_INTERVAL_DAYS = 21;

export function isNewCard(card: Card): boolean {
  return card.progress.repetitions === 0 && !card.progress.lastReviewed;
}

export function isMasteredCard(card: Card): boolean {
  const { repetitions, easeFactor, interval } = card.progress;
  return (
    repetitions >= MASTERY_MIN_REPETITIONS &&
    easeFactor >= MASTERY_MIN_EASE_FACTOR &&
    interval >= MASTERY_MIN_INTERVAL_DAYS
  );
}

export function isLearningCard(card: Card): boolean {
  return !isNewCard(card) && !isMasteredCard(card);
}

/** A card is "due" for study if it is new, or its scheduled nextReview has arrived. */
export function isDueCard(card: Card, referenceDate: Date = new Date()): boolean {
  if (isNewCard(card)) return true;
  return isDueByLocalCalendar(card.progress.nextReview, referenceDate);
}

/**
 * Returns a single, primary status label for display purposes.
 * Priority: new > due (including previously-mastered cards that came back due) > mastered > learning.
 */
export function getCardStatus(card: Card, referenceDate: Date = new Date()): CardStatus {
  if (isNewCard(card)) return 'new';
  if (isDueByLocalCalendar(card.progress.nextReview, referenceDate)) return 'due';
  if (isMasteredCard(card)) return 'mastered';
  return 'learning';
}

export function countByStatus(cards: Card[], referenceDate: Date = new Date()) {
  let due = 0;
  let learned = 0; // reviewed at least once (learning + mastered)
  let mastered = 0;
  let brandNew = 0;
  for (const card of cards) {
    if (isDueCard(card, referenceDate)) due++;
    if (isNewCard(card)) brandNew++;
    else learned++;
    if (isMasteredCard(card)) mastered++;
  }
  return { due, learned, mastered, brandNew, total: cards.length };
}
