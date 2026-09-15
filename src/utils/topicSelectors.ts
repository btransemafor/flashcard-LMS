import type { Card } from '@/types';
import { isDueCard, isMasteredCard, isNewCard } from '@/utils/cardStatus';

export interface TopicSummary {
  topic: string;
  totalCards: number;
  dueCount: number;
  masteredCount: number;
  newCount: number;
  progressPercent: number; // share of cards that are mastered
  lastStudied: string | null; // most recent lastReviewed across the topic's cards
}

export function buildTopicSummaries(cards: Card[], referenceDate: Date = new Date()): TopicSummary[] {
  const byTopic = new Map<string, Card[]>();
  for (const card of cards) {
    const key = card.topic || 'General';
    if (!byTopic.has(key)) byTopic.set(key, []);
    byTopic.get(key)!.push(card);
  }

  return Array.from(byTopic.entries()).map(([topic, topicCards]) => {
    const dueCount = topicCards.filter((c) => isDueCard(c, referenceDate)).length;
    const masteredCount = topicCards.filter((c) => isMasteredCard(c)).length;
    const newCount = topicCards.filter((c) => isNewCard(c)).length;
    const lastReviewedDates = topicCards.map((c) => c.progress.lastReviewed).filter((d): d is string => Boolean(d));
    const lastStudied = lastReviewedDates.length > 0 ? lastReviewedDates.sort().reverse()[0] : null;
    return {
      topic,
      totalCards: topicCards.length,
      dueCount,
      masteredCount,
      newCount,
      progressPercent: topicCards.length > 0 ? Math.round((masteredCount / topicCards.length) * 100) : 0,
      lastStudied
    };
  });
}
