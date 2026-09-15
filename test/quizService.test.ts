import { describe, it, expect } from 'vitest';
import quizSvc, { generateQuizQuestions, normalizeAnswer } from '@/services/quizService';

type Card = any;

const sampleCards: Card[] = [
  { id: 'c1', term: 'Array', definition: 'An ordered collection', topic: 'DS', tags: ['linear'], progress: { correct: 1, wrong: 0, repetitions: 1, easeFactor: 2.5 } },
  { id: 'c2', term: 'Stack', definition: 'LIFO structure', topic: 'DS', tags: ['linear'], progress: { correct: 0, wrong: 1, repetitions: 2, easeFactor: 1.8 } },
  { id: 'c3', term: 'Queue', definition: 'FIFO structure', topic: 'DS', tags: ['linear'], progress: { correct: 0, wrong: 0, repetitions: 0 } },
  { id: 'c4', term: 'Graph', definition: 'Nodes and edges', topic: 'DS', tags: ['graph'], progress: { correct: 0, wrong: 0, repetitions: 0 } },
  { id: 'c5', term: 'Tree', definition: 'Hierarchical structure', topic: 'DS', tags: ['tree'], progress: { correct: 0, wrong: 0, repetitions: 0 } }
];

describe('quizService basic', () => {
  it('normalizeAnswer collapses whitespace and case', () => {
    expect(normalizeAnswer('  ARRAY ')).toBe('array');
    expect(normalizeAnswer('Array\n')).toBe('array');
  });

  it('generates term-to-definition question with 4 choices', () => {
    const config = {
      topicIds: [],
      direction: 'term-to-definition',
      source: 'all',
      questionCount: 1,
      shuffleQuestions: false,
      prioritizeDifficult: false,
      retryIncorrectAtEnd: false,
      updateProgress: false
    } as const;
    const qs = generateQuizQuestions(sampleCards, config as any);
    expect(qs.length).toBeGreaterThanOrEqual(1);
    const q = qs[0];
    expect(q.prompt).toBeDefined();
    expect(q.answers.length).toBe(4);
    const correct = q.answers.find((a) => a.isCorrect);
    expect(correct).toBeTruthy();
  });
});
