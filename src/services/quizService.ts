import { randomIdFragment } from '@/utils/normalize';
import type { Card } from '@/types';

export type QuizDirection = 'term-to-definition' | 'definition-to-term';

export type QuizAnswer = {
  id: string;
  cardId: string;
  text: string;
  isCorrect: boolean;
};

export type QuizQuestion = {
  id: string;
  sourceCardId: string;
  direction: QuizDirection;
  prompt: string;
  answers: QuizAnswer[];
  correctAnswerId: string;
  topic: string;
};

export type QuizResponse = {
  questionId: string;
  selectedAnswerId: string | null;
  correctAnswerId: string;
  isCorrect: boolean;
  answeredAt: string;
  responseTimeMs: number;
  attemptNumber: number;
};

export type QuizConfig = {
  topicIds: string[]; // empty => all
  direction: 'term-to-definition' | 'definition-to-term' | 'mixed';
  source: 'due' | 'new' | 'difficult' | 'all';
  questionCount: number;
  shuffleQuestions: boolean;
  prioritizeDifficult: boolean;
  retryIncorrectAtEnd: boolean;
  updateProgress: boolean;
};

export function normalizeAnswer(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hasTagOverlap(a: string[] = [], b: string[] = []) {
  return a.some((t) => b.includes(t));
}

function isDifficult(card: Card, recentWrongIds = new Set<string>()) {
  const p = (card as any).progress ?? {};
  const wrong = p.wrong ?? 0;
  const correct = p.correct ?? 0;
  const ease = p.easeFactor ?? p.ease ?? 2.5;
  const reps = p.repetitions ?? 0;
  const interval = p.interval ?? 0;
  if (wrong > correct) return true;
  if (typeof ease === 'number' && ease < 2.0) return true;
  if (reps > 0 && interval <= 3) return true;
  if (recentWrongIds.has(card.id)) return true;
  return false;
}

export function generateQuizQuestions(cards: Card[], config: QuizConfig, options?: { recentWrongIds?: Set<string> }) {
  const recentWrong = options?.recentWrongIds ?? new Set<string>();

  // Filter by topic
  let pool = cards.filter((c) => c.term && c.definition);
  if (config.topicIds && config.topicIds.length > 0) {
    pool = pool.filter((c) => config.topicIds.includes(c.topic));
  }

  // Filter by source
  const sourceFilter = (c: Card) => {
    if (config.source === 'all') return true;
    if (config.source === 'difficult') return isDifficult(c, recentWrong);
    const p = (c as any).progress ?? {};
    if (config.source === 'new') return (p.repetitions ?? 0) === 0 && !p.lastReviewed;
    if (config.source === 'due') return Boolean((p.nextReview && new Date(p.nextReview) <= new Date()) || (p.repetitions ?? 0) > 0);
    return true;
  };

  const validSources = pool.filter(sourceFilter);

  // If not enough, fall back to all cards (but keep original topic preference for distractors)
  const availableCount = validSources.length;
  const desired = Math.max(0, config.questionCount);
  const itemsToUse = availableCount >= desired ? validSources : pool;

  // Determine directions distribution
  let directions: QuizDirection[] = [];
  if (config.direction === 'term-to-definition') directions = Array(desired).fill('term-to-definition');
  else if (config.direction === 'definition-to-term') directions = Array(desired).fill('definition-to-term');
  else {
    // mixed - balanced
    const half = Math.floor(desired / 2);
    directions = Array(half).fill('term-to-definition').concat(Array(half).fill('definition-to-term'));
    if (desired % 2 === 1) directions.push(Math.random() < 0.5 ? 'term-to-definition' : 'definition-to-term');
  }

  // Optionally shuffle directions before assignment to keep balanced but random
  directions = fisherYatesShuffle(directions);

  const questions: QuizQuestion[] = [];

  // Helper to build candidates per priority
  function pickDistractors(source: Card, direction: QuizDirection, count = 3) {
    const correctText = direction === 'term-to-definition' ? source.definition : source.term;
    const normalizeCorrect = normalizeAnswer(correctText || '');
    const candidates = pool.filter((c) => c.id !== source.id && ((direction === 'term-to-definition' && c.definition) || (direction === 'definition-to-term' && c.term)));

    const seen = new Set<string>();
    seen.add(normalizeCorrect);

    const results: string[] = [];

    // priority 1: same topic
    const byTopic = candidates.filter((c) => c.topic === source.topic);
    for (const c of byTopic) {
      const text = direction === 'term-to-definition' ? c.definition : c.term;
      if (!text) continue;
      const n = normalizeAnswer(text);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      results.push(text);
      if (results.length >= count) return results;
    }

    // priority 2: tag overlap
    const byTags = candidates.filter((c) => hasTagOverlap(c.tags, source.tags));
    for (const c of byTags) {
      const text = direction === 'term-to-definition' ? c.definition : c.term;
      if (!text) continue;
      const n = normalizeAnswer(text);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      results.push(text);
      if (results.length >= count) return results;
    }

    // priority 3: other topics
    const byOthers = candidates.filter((c) => c.topic !== source.topic);
    for (const c of byOthers) {
      const text = direction === 'term-to-definition' ? c.definition : c.term;
      if (!text) continue;
      const n = normalizeAnswer(text);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      results.push(text);
      if (results.length >= count) return results;
    }

    // priority 4: any remaining
    for (const c of candidates) {
      const text = direction === 'term-to-definition' ? c.definition : c.term;
      if (!text) continue;
      const n = normalizeAnswer(text);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      results.push(text);
      if (results.length >= count) return results;
    }

    return results;
  }

  // Build question queue
  const sourceCandidates = fisherYatesShuffle(itemsToUse.slice());
  for (let i = 0; i < directions.length && questions.length < config.questionCount; i++) {
    const dir = directions[i];
    // pick next source card that can produce valid question
    let picked: Card | undefined;
    while (sourceCandidates.length > 0 && !picked) {
      const c = sourceCandidates.shift()!;
      const correctText = dir === 'term-to-definition' ? c.definition : c.term;
      if (!correctText) continue;
      const distractors = pickDistractors(c, dir, 3);
      if (distractors.length < 3) {
        // skip this card
        continue;
      }
      picked = c;
      const answersRaw = [ { text: dir === 'term-to-definition' ? c.definition : c.term, cardId: c.id, isCorrect: true }, ...distractors.map((t) => ({ text: t, cardId: '', isCorrect: false })) ];
      // Map answers to QuizAnswer with cardId resolved where possible
      const answersMapped: QuizAnswer[] = answersRaw.map((a) => ({ id: `ans-${randomIdFragment()}`, cardId: a.cardId, text: a.text, isCorrect: a.isCorrect }));
      const shuffled = fisherYatesShuffle(answersMapped);
      const correct = shuffled.find((s) => normalizeAnswer(s.text) === normalizeAnswer(dir === 'term-to-definition' ? c.definition : c.term));
      if (!correct) continue;
      const q: QuizQuestion = {
        id: `q-${randomIdFragment()}`,
        sourceCardId: c.id,
        direction: dir,
        prompt: dir === 'term-to-definition' ? c.term : c.definition,
        answers: shuffled,
        correctAnswerId: correct.id,
        topic: c.topic
      };
      questions.push(q);
    }
  }

  // Final shuffle of questions if requested
  const final = config.shuffleQuestions ? fisherYatesShuffle(questions) : questions;
  return final.slice(0, config.questionCount);
}

export default {
  generateQuizQuestions,
  normalizeAnswer,
  fisherYatesShuffle
};
