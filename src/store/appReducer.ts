import type { ActivityDay, Card, Dataset, StudySessionRecord, ToastMessage, UIPreferences } from '@/types';

export interface SessionRescheduleEntry {
  cardId: string;
  term: string;
  nextReview: string | null;
}

export interface ActiveSessionState {
  queue: Card[];
  currentIndex: number;
  revealed: boolean;
  startedAt: string;
  reviewed: number;
  correct: number;
  wrong: number;
  rescheduled: SessionRescheduleEntry[];
  endedAt: string | null;
}

export interface AppState {
  bootstrapped: boolean;
  dbError: string | null;
  dataset: Dataset | null;
  cards: Card[];
  studySessions: StudySessionRecord[];
  activity: ActivityDay[];
  fileHandleAvailable: boolean;
  linkedFileName: string | null;
  online: boolean;
  ui: UIPreferences;
  activeSession: ActiveSessionState | null;
  toasts: ToastMessage[];
}

export type AppAction =
  | { type: 'BOOTSTRAP_COMPLETE'; payload: { dataset: Dataset | null; cards: Card[]; studySessions: StudySessionRecord[]; activity: ActivityDay[]; fileHandleAvailable: boolean; linkedFileName: string | null } }
  | { type: 'SET_DB_ERROR'; payload: string | null }
  | { type: 'SET_ONLINE'; payload: boolean }
  | { type: 'SET_DATASET_AND_CARDS'; payload: { dataset: Dataset; cards: Card[] } }
  | { type: 'SET_CARDS'; payload: Card[] }
  | { type: 'SET_ACTIVITY'; payload: ActivityDay[] }
  | { type: 'SET_STUDY_SESSIONS'; payload: StudySessionRecord[] }
  | { type: 'MARK_DIRTY' }
  | { type: 'MARK_SAVED'; payload: { mode: 'workbook' | 'export'; timestamp: string } }
  | { type: 'SET_FILE_HANDLE'; payload: { available: boolean; fileName: string | null } }
  | { type: 'SET_UI_PREF'; payload: Partial<UIPreferences> }
  | { type: 'START_SESSION'; payload: Card[] }
  | { type: 'REVEAL_CARD' }
  | { type: 'ANSWER_CARD'; payload: { updatedCard: Card; rescheduleEntry: SessionRescheduleEntry; isCorrect: boolean } }
  | { type: 'END_SESSION' }
  | { type: 'DISMISS_SESSION_SUMMARY' }
  | { type: 'ADD_TOAST'; payload: ToastMessage }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'RESET_ALL' };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'BOOTSTRAP_COMPLETE':
      return {
        ...state,
        bootstrapped: true,
        dataset: action.payload.dataset,
        cards: action.payload.cards,
        studySessions: action.payload.studySessions,
        activity: action.payload.activity,
        fileHandleAvailable: action.payload.fileHandleAvailable,
        linkedFileName: action.payload.linkedFileName
      };
    case 'SET_DB_ERROR':
      return { ...state, dbError: action.payload };
    case 'SET_ONLINE':
      return { ...state, online: action.payload };
    case 'SET_DATASET_AND_CARDS':
      return { ...state, dataset: action.payload.dataset, cards: action.payload.cards };
    case 'SET_CARDS':
      return { ...state, cards: action.payload };
    case 'SET_ACTIVITY':
      return { ...state, activity: action.payload };
    case 'SET_STUDY_SESSIONS':
      return { ...state, studySessions: action.payload };
    case 'MARK_DIRTY':
      return state.dataset ? { ...state, dataset: { ...state.dataset, isDirty: true } } : state;
    case 'MARK_SAVED':
      return state.dataset
        ? {
            ...state,
            dataset: {
              ...state.dataset,
              isDirty: false,
              lastSavedAt: action.payload.timestamp,
              lastSaveMode: action.payload.mode
            }
          }
        : state;
    case 'SET_FILE_HANDLE':
      return { ...state, fileHandleAvailable: action.payload.available, linkedFileName: action.payload.fileName };
    case 'SET_UI_PREF':
      return { ...state, ui: { ...state.ui, ...action.payload } };
    case 'START_SESSION':
      return {
        ...state,
        activeSession: {
          queue: action.payload,
          currentIndex: 0,
          revealed: false,
          startedAt: new Date().toISOString(),
          reviewed: 0,
          correct: 0,
          wrong: 0,
          rescheduled: [],
          endedAt: null
        }
      };
    case 'REVEAL_CARD':
      return state.activeSession ? { ...state, activeSession: { ...state.activeSession, revealed: true } } : state;
    case 'ANSWER_CARD': {
      if (!state.activeSession) return state;
      const updatedCards = state.cards.map((c) => (c.id === action.payload.updatedCard.id ? action.payload.updatedCard : c));
      return {
        ...state,
        cards: updatedCards,
        activeSession: {
          ...state.activeSession,
          currentIndex: state.activeSession.currentIndex + 1,
          revealed: false,
          reviewed: state.activeSession.reviewed + 1,
          correct: state.activeSession.correct + (action.payload.isCorrect ? 1 : 0),
          wrong: state.activeSession.wrong + (action.payload.isCorrect ? 0 : 1),
          rescheduled: [...state.activeSession.rescheduled, action.payload.rescheduleEntry]
        }
      };
    }
    case 'END_SESSION':
      return state.activeSession ? { ...state, activeSession: { ...state.activeSession, endedAt: new Date().toISOString() } } : state;
    case 'DISMISS_SESSION_SUMMARY':
      return { ...state, activeSession: null };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload) };
    case 'RESET_ALL':
      return {
        ...state,
        dataset: null,
        cards: [],
        studySessions: [],
        activity: [],
        fileHandleAvailable: false,
        linkedFileName: null,
        activeSession: null
      };
    default:
      return state;
  }
}
