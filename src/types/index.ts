/**
 * Core domain types for Learning Playground.
 * Excel is the source of truth; these types mirror the Excel schema
 * plus the local scheduling metadata that is layered on top of it.
 */

export interface CardProgress {
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReview: string | null;
  lastReviewed: string | null;
  correct: number;
  wrong: number;
}

export function createDefaultProgress(): CardProgress {
  return {
    repetitions: 0,
    easeFactor: 2.5,
    interval: 0,
    nextReview: null,
    lastReviewed: null,
    correct: 0,
    wrong: 0
  };
}

/** Rating a learner gives after revealing an answer. Maps to SM-2 quality. */
export type Rating = 'again' | 'hard' | 'good' | 'easy';

export const RATING_TO_QUALITY: Record<Rating, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5
};

/** A single flashcard, as read from / written to an Excel row. */
export interface Card {
  id: string;
  datasetId: string;
  sourceRowIndex: number;
  topic: string;
  term: string;
  definition: string;
  example: string;
  notes: string;
  tags: string[];
  /** The raw, original row values keyed by original column header, preserved for lossless export. */
  originalRow: Record<string, unknown>;
  progress: CardProgress;
}

export interface Dataset {
  id: string;
  name: string;
  sourceFileName: string;
  selectedSheetName: string;
  sheetNames: string[];
  importedAt: string;
  updatedAt: string;
  workbookMetadata: {
    columnOrder: string[];
    rowCount: number;
  };
  isDirty: boolean;
  lastSavedAt: string | null;
  lastSaveMode: 'workbook' | 'export' | null;
}

export interface StudySessionRecord {
  id: string;
  datasetId: string;
  startedAt: string;
  endedAt: string | null;
  reviewed: number;
  correct: number;
  wrong: number;
  durationSeconds: number;
}

export interface QuizSessionRecord {
  id: string;
  datasetId: string;
  startedAt: string;
  endedAt: string | null;
  questions: any[]; // QuizQuestion[] (kept any to avoid circular imports)
  responses: any[]; // QuizResponse[]
  currentIndex: number;
  config: any; // QuizConfig
  status: 'in-progress' | 'completed';
}

export interface ActivityDay {
  date: string; // yyyy-MM-dd, local calendar date
  reviews: number;
  correct: number;
  wrong: number;
  studyMinutes: number;
}

export interface FileHandleRecord {
  datasetId: string;
  handle: FileSystemFileHandle;
  fileName: string;
}

export type CardStatus = 'new' | 'learning' | 'mastered' | 'due';

export interface ValidationIssue {
  row: number;
  field: string;
  message: string;
}

export interface ImportRowResult {
  row: number;
  status: 'valid' | 'invalid' | 'duplicate';
  issues: ValidationIssue[];
}

export interface ColumnMapping {
  id: 'ID' | 'Topic' | 'Term' | 'Definition' | 'Example' | 'Notes' | 'Tags' | 'LastReviewed' | 'Correct' | 'Wrong' | 'EaseFactor' | 'Repetitions' | 'Interval' | 'NextReview';
  matchedHeader: string | null;
  required: boolean;
}

export interface ParsedWorkbookInfo {
  sheetNames: string[];
  fileName: string;
  fileSizeBytes: number;
}

export interface ImportPreview {
  headers: string[];
  sampleRows: Record<string, unknown>[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  rowResults: ImportRowResult[];
  columnMappings: ColumnMapping[];
}

export type MergeCardStatus = 'new' | 'updated' | 'preserved' | 'conflicted' | 'missing';

export interface MergeReportEntry {
  cardId: string;
  term: string;
  topic: string;
  status: MergeCardStatus;
  detail: string;
}

export interface MergeReport {
  entries: MergeReportEntry[];
  newCount: number;
  updatedCount: number;
  preservedCount: number;
  conflictedCount: number;
  missingCount: number;
}

export interface JsonBackup {
  formatVersion: 1;
  exportedAt: string;
  dataset: Omit<Dataset, 'isDirty' | 'lastSavedAt' | 'lastSaveMode'>;
  cards: Card[];
  studySessions: StudySessionRecord[];
  activity: ActivityDay[];
}

export interface UIPreferences {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  preferredStudyMode: 'standard' | 'cram';
  lastLibraryFilters: {
    status: 'all' | 'due' | 'new' | 'mastered';
    sort: 'name' | 'recent' | 'due' | 'mastery';
    view: 'grid' | 'list';
  };
  dismissedNotices: string[];
  newCardsPerSession: number;
  reviewCardsPerSession: number;
  shuffleCards: boolean;
  showKeyboardShortcuts: boolean;
  reducedMotion: boolean;
  compactDensity: boolean;
  confirmBeforeEndingSession: boolean;
  confirmBeforeClearingData: boolean;
  dateFormat: string;
}

export const DEFAULT_UI_PREFERENCES: UIPreferences = {
  theme: 'light',
  sidebarCollapsed: false,
  preferredStudyMode: 'standard',
  lastLibraryFilters: {
    status: 'all',
    sort: 'recent',
    view: 'grid'
  },
  dismissedNotices: [],
  newCardsPerSession: 10,
  reviewCardsPerSession: 30,
  shuffleCards: true,
  showKeyboardShortcuts: true,
  reducedMotion: false,
  compactDensity: false,
  confirmBeforeEndingSession: true,
  confirmBeforeClearingData: true,
  dateFormat: 'dd/MM/yyyy'
};

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}
