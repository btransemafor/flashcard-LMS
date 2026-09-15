import type { Card, Dataset } from '@/types';
import { buildStableCardId } from '@/utils/normalize';
import { subDays, addDays } from 'date-fns';

const now = () => new Date();

interface DemoCardSeed {
  topic: string;
  term: string;
  definition: string;
  example?: string;
  notes?: string;
  tags?: string[];
  progress?: Partial<Card['progress']>;
}

const SEEDS: DemoCardSeed[] = [
  // --- Java ---
  {
    topic: 'Java',
    term: 'polymorphism',
    definition: 'The ability of an object to take on many forms, usually through method overriding or interfaces.'
    // new card: no progress overrides
  },
  {
    topic: 'Java',
    term: 'encapsulation',
    definition: 'Bundling data and the methods that operate on it within a single unit, restricting direct access to internals.',
    progress: {
      repetitions: 1,
      easeFactor: 2.4,
      interval: 3,
      lastReviewed: subDays(now(), 4).toISOString(),
      nextReview: subDays(now(), 1).toISOString(), // due (past)
      correct: 1,
      wrong: 1
    }
  },
  {
    topic: 'Java',
    term: 'inheritance',
    definition: 'A mechanism where a new class acquires the properties and behaviors of an existing class.',
    progress: {
      repetitions: 2,
      easeFactor: 2.6,
      interval: 10,
      lastReviewed: subDays(now(), 3).toISOString(),
      nextReview: addDays(now(), 7).toISOString(), // future
      correct: 2,
      wrong: 0
    }
  },
  {
    topic: 'Java',
    term: 'abstraction',
    definition: 'Hiding complex implementation details and exposing only the necessary features of an object.',
    progress: {
      repetitions: 4,
      easeFactor: 2.5,
      interval: 30,
      lastReviewed: subDays(now(), 5).toISOString(),
      nextReview: addDays(now(), 25).toISOString(), // mastered
      correct: 4,
      wrong: 0
    }
  },
  {
    topic: 'Java',
    term: 'interface',
    definition: 'A fully abstract type that declares behavior a class must implement, without providing implementation.',
    example: 'interface Shape { double area(); }\nclass Circle implements Shape { ... }',
    notes: 'A class can implement multiple interfaces, unlike single-class inheritance.',
    tags: ['oop', 'java'],
    progress: {
      repetitions: 1,
      easeFactor: 2.3,
      interval: 1,
      lastReviewed: subDays(now(), 1).toISOString(),
      nextReview: now().toISOString(), // due today
      correct: 1,
      wrong: 0
    }
  },

  // --- Data Structures & Algorithms ---
  {
    topic: 'Data Structures & Algorithms',
    term: 'two pointers',
    definition: 'A technique using two indices moving through a data structure to reduce time complexity, often to O(n).'
  },
  {
    topic: 'Data Structures & Algorithms',
    term: 'binary search',
    definition: 'A search algorithm that repeatedly halves a sorted search space to find a target in O(log n) time.',
    progress: {
      repetitions: 1,
      easeFactor: 2.2,
      interval: 2,
      lastReviewed: subDays(now(), 3).toISOString(),
      nextReview: subDays(now(), 1).toISOString(),
      correct: 1,
      wrong: 1
    }
  },
  {
    topic: 'Data Structures & Algorithms',
    term: 'dynamic programming',
    definition: 'Solving problems by breaking them into overlapping subproblems and caching their results.',
    progress: {
      repetitions: 2,
      easeFactor: 2.5,
      interval: 14,
      lastReviewed: subDays(now(), 2).toISOString(),
      nextReview: addDays(now(), 12).toISOString(),
      correct: 2,
      wrong: 0
    }
  },
  {
    topic: 'Data Structures & Algorithms',
    term: 'hash map',
    definition: 'A data structure that maps keys to values using a hash function, offering average O(1) lookups.',
    progress: {
      repetitions: 5,
      easeFactor: 2.7,
      interval: 40,
      lastReviewed: subDays(now(), 10).toISOString(),
      nextReview: addDays(now(), 30).toISOString(),
      correct: 5,
      wrong: 0
    }
  },
  {
    topic: 'Data Structures & Algorithms',
    term: 'sliding window',
    definition: 'A technique that maintains a window of elements over a sequence, expanding or shrinking it to satisfy a condition.',
    example: 'Find the longest substring without repeating characters using a moving window of indices.',
    notes: 'Often paired with a hash set/map to track window contents in O(1).',
    tags: ['algorithms', 'pattern'],
    progress: {
      repetitions: 2,
      easeFactor: 2.3,
      interval: 6,
      lastReviewed: subDays(now(), 1).toISOString(),
      nextReview: addDays(now(), 5).toISOString(),
      correct: 2,
      wrong: 1
    }
  },

  // --- English Vocabulary ---
  {
    topic: 'English Vocabulary',
    term: 'align',
    definition: 'To bring into agreement or correct relative position; to support or cooperate with a group or cause.'
  },
  {
    topic: 'English Vocabulary',
    term: 'articulate',
    definition: 'To express thoughts or feelings clearly and effectively in speech or writing.',
    progress: {
      repetitions: 1,
      easeFactor: 2.4,
      interval: 1,
      lastReviewed: subDays(now(), 2).toISOString(),
      nextReview: subDays(now(), 1).toISOString(),
      correct: 1,
      wrong: 0
    }
  },
  {
    topic: 'English Vocabulary',
    term: 'meticulous',
    definition: 'Showing great attention to detail; very careful and precise.',
    progress: {
      repetitions: 2,
      easeFactor: 2.6,
      interval: 12,
      lastReviewed: subDays(now(), 4).toISOString(),
      nextReview: addDays(now(), 8).toISOString(),
      correct: 2,
      wrong: 0
    }
  },
  {
    topic: 'English Vocabulary',
    term: 'resilient',
    definition: 'Able to recover quickly from difficulties; tough and adaptable.',
    progress: {
      repetitions: 3,
      easeFactor: 2.5,
      interval: 21,
      lastReviewed: subDays(now(), 6).toISOString(),
      nextReview: addDays(now(), 15).toISOString(),
      correct: 3,
      wrong: 0
    }
  },
  {
    topic: 'English Vocabulary',
    term: 'diminish',
    definition: 'To make or become smaller, weaker, or less important.',
    example: 'Regular practice will diminish your fear of public speaking over time.',
    notes: 'Often used with "gradually" or "significantly" as an adverb of degree.',
    tags: ['vocabulary', 'verb'],
    progress: {
      repetitions: 1,
      easeFactor: 2.3,
      interval: 4,
      lastReviewed: subDays(now(), 1).toISOString(),
      nextReview: addDays(now(), 3).toISOString(),
      correct: 1,
      wrong: 0
    }
  }
];

export const DEMO_DATASET_ID = 'demo-dataset';

export function buildDemoDataset(): { dataset: Dataset; cards: Card[] } {
  const nowISO = new Date().toISOString();
  const cards: Card[] = SEEDS.map((seed, index) => {
    const id = buildStableCardId(seed.topic, seed.term);
    const progress: Card['progress'] = {
      repetitions: 0,
      easeFactor: 2.5,
      interval: 0,
      nextReview: null,
      lastReviewed: null,
      correct: 0,
      wrong: 0,
      ...seed.progress
    };
    const originalRow: Record<string, unknown> = {
      ID: id,
      Topic: seed.topic,
      Term: seed.term,
      Definition: seed.definition,
      Example: seed.example ?? '',
      Notes: seed.notes ?? '',
      Tags: (seed.tags ?? []).join(', '),
      LastReviewed: progress.lastReviewed ?? '',
      Correct: progress.correct,
      Wrong: progress.wrong,
      EaseFactor: progress.easeFactor,
      Repetitions: progress.repetitions,
      Interval: progress.interval,
      NextReview: progress.nextReview ?? ''
    };
    return {
      id,
      datasetId: DEMO_DATASET_ID,
      sourceRowIndex: index,
      topic: seed.topic,
      term: seed.term,
      definition: seed.definition,
      example: seed.example ?? '',
      notes: seed.notes ?? '',
      tags: seed.tags ?? [],
      originalRow,
      progress
    };
  });

  const dataset: Dataset = {
    id: DEMO_DATASET_ID,
    name: 'Demo Library',
    sourceFileName: 'learning-playground-demo.xlsx',
    selectedSheetName: 'Cards',
    sheetNames: ['Cards'],
    importedAt: nowISO,
    updatedAt: nowISO,
    workbookMetadata: {
      columnOrder: ['ID', 'Topic', 'Term', 'Definition', 'Example', 'Notes', 'Tags', 'LastReviewed', 'Correct', 'Wrong', 'EaseFactor', 'Repetitions', 'Interval', 'NextReview'],
      rowCount: cards.length
    },
    isDirty: false,
    lastSavedAt: null,
    lastSaveMode: null
  };

  return { dataset, cards };
}
