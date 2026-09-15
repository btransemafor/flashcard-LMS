import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type * as XLSX from 'xlsx';
import { appReducer, type AppState } from './appReducer';
import { loadUIPreferences, saveUIPreferences } from './uiPreferences';
import type { ActivityDay, Card, ColumnMapping, Dataset, ImportRowResult, JsonBackup, MergeReport, Rating, StudySessionRecord, ToastMessage, UIPreferences } from '@/types';
import {
  DatabaseUnavailableError,
  getAllActivity,
  getCardsByDataset,
  getFileHandleRecord,
  getMostRecentDataset,
  getStudySessions,
  getWorkbookBinary,
  replaceDatasetCards,
  saveDataset,
  storeFileHandle,
  storeWorkbookBinary,
  clearAllLocalData,
  addStudySession,
  putCard
} from '@/services/databaseService';
import { mergeImportedCards } from '@/services/mergeService';
import { mergeBackupCards } from '@/services/backupService';
import {
  buildUpdatedWorkbook,
  parseWorkbookFromBuffer,
  triggerBrowserDownload,
  workbookToArrayBuffer,
  resolveExportColumnOrder
} from '@/services/excelService';
import { buildExportFileName } from '@/utils/fileNaming';
import {
  hasReadWritePermission,
  isFileSystemAccessSupported,
  openWorkbookWithPicker,
  requestReadWritePermission,
  writeWorkbookToHandle
} from '@/services/fileSystemService';
import { applyRating } from '@/services/sm2Service';
import { recordActivity } from '@/services/activityService';
import { isDueCard } from '@/utils/cardStatus';
import { buildDemoDataset } from '@/data/demoData';
import { randomIdFragment } from '@/utils/normalize';

const initialState: AppState = {
  bootstrapped: false,
  dbError: null,
  dataset: null,
  cards: [],
  studySessions: [],
  activity: [],
  fileHandleAvailable: false,
  linkedFileName: null,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  ui: loadUIPreferences(),
  activeSession: null,
  toasts: []
};

export interface CommitImportInput {
  fileName: string;
  sheetName: string;
  sheetNames: string[];
  columnOrder: string[];
  parsedRows: Record<string, unknown>[];
  rowResults: ImportRowResult[];
  mappings: ColumnMapping[];
  workbookBuffer: ArrayBuffer;
}

interface AppContextValue {
  state: AppState;
  actions: {
    loadDemoData: () => Promise<void>;
    commitImport: (input: CommitImportInput) => Promise<MergeReport>;
    startSession: (options?: { topic?: string }) => void;
    revealCard: () => void;
    rateCard: (rating: Rating) => Promise<void>;
    prevCard: () => void;
    skipCard: () => void;
    hideCard: () => void;
    endSession: () => Promise<void>;
    dismissSessionSummary: () => void;
    exportExcel: () => Promise<void>;
    openLinkedWorkbook: () => Promise<void>;
    saveToWorkbook: () => Promise<void>;
    saveProgress: () => Promise<void>;
    restoreBackup: (backup: JsonBackup, mode: 'merge' | 'new') => Promise<void>;
    clearLocalCache: () => Promise<void>;
    updateUIPreferences: (partial: Partial<UIPreferences>) => void;
    addToast: (toast: Omit<ToastMessage, 'id'>) => void;
    removeToast: (id: string) => void;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const originalWorkbookRef = useRef<XLSX.WorkBook | null>(null);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    dispatch({ type: 'ADD_TOAST', payload: { ...toast, id: `toast-${Date.now()}-${randomIdFragment()}` } });
  }, []);

  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  }, []);

  // ---- Bootstrap: restore most recent dataset from IndexedDB on first load ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dataset = await getMostRecentDataset();
        if (!dataset) {
          if (!cancelled) dispatch({ type: 'BOOTSTRAP_COMPLETE', payload: { dataset: null, cards: [], studySessions: [], activity: [], fileHandleAvailable: false, linkedFileName: null } });
          return;
        }
        const [cards, sessions, activity, handleRecord, workbookBuffer] = await Promise.all([
          getCardsByDataset(dataset.id),
          getStudySessions(dataset.id),
          getAllActivity(),
          getFileHandleRecord(dataset.id),
          getWorkbookBinary(dataset.id)
        ]);
        if (workbookBuffer) {
          try {
            originalWorkbookRef.current = parseWorkbookFromBuffer(workbookBuffer);
          } catch {
            originalWorkbookRef.current = null;
          }
        }
        let handleAvailable = false;
        if (handleRecord) {
          fileHandleRef.current = handleRecord.handle;
          handleAvailable = await hasReadWritePermission(handleRecord.handle);
        }
        if (!cancelled) {
          dispatch({
            type: 'BOOTSTRAP_COMPLETE',
            payload: {
              dataset,
              cards,
              studySessions: sessions,
              activity,
              fileHandleAvailable: handleAvailable,
              linkedFileName: handleRecord?.fileName ?? null
            }
          });
        }
      } catch (err) {
        const message =
          err instanceof DatabaseUnavailableError
            ? err.message
            : 'Something went wrong while loading your saved data. You can still import a fresh workbook.';
        if (!cancelled) {
          dispatch({ type: 'SET_DB_ERROR', payload: message });
          dispatch({ type: 'BOOTSTRAP_COMPLETE', payload: { dataset: null, cards: [], studySessions: [], activity: [], fileHandleAvailable: false, linkedFileName: null } });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Online/offline tracking ----
  useEffect(() => {
    const goOnline = () => dispatch({ type: 'SET_ONLINE', payload: true });
    const goOffline = () => dispatch({ type: 'SET_ONLINE', payload: false });
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ---- Warn before closing/reloading with unsaved changes ----
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (state.dataset?.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.dataset?.isDirty]);

  // ---- Persist UI preferences ----
  useEffect(() => {
    saveUIPreferences(state.ui);
  }, [state.ui]);

  const loadDemoData = useCallback(async () => {
    const { dataset, cards } = buildDemoDataset();
    try {
      await saveDataset(dataset);
      await replaceDatasetCards(dataset.id, cards);
    } catch {
      // Even if IndexedDB is unavailable, keep the demo usable for this session.
    }
    originalWorkbookRef.current = null;
    dispatch({ type: 'SET_DATASET_AND_CARDS', payload: { dataset, cards } });
    addToast({ type: 'success', title: 'Demo library loaded', description: 'Explore Java, DSA, and English Vocabulary sample decks.' });
  }, [addToast]);

  const commitImport = useCallback(
    async (input: CommitImportInput): Promise<MergeReport> => {
      const datasetId = state.dataset?.id ?? `dataset-${randomIdFragment()}`;
      const existingCards = state.dataset ? state.cards : [];

      const { cards, report } = mergeImportedCards({
        datasetId,
        existingCards,
        parsedRows: input.parsedRows,
        rowResults: input.rowResults,
        mappings: input.mappings
      });

      const nowISO = new Date().toISOString();
      const isDirty = report.missingCount > 0 || report.entries.some((e) => e.status === 'updated' && e.detail.toLowerCase().includes('progress preserved'));

      const dataset: Dataset = {
        id: datasetId,
        name: state.dataset?.name ?? input.fileName.replace(/\.(xlsx|xls)$/i, ''),
        sourceFileName: input.fileName,
        selectedSheetName: input.sheetName,
        sheetNames: input.sheetNames,
        importedAt: state.dataset?.importedAt ?? nowISO,
        updatedAt: nowISO,
        workbookMetadata: { columnOrder: input.columnOrder, rowCount: cards.length },
        isDirty,
        lastSavedAt: state.dataset?.lastSavedAt ?? null,
        lastSaveMode: state.dataset?.lastSaveMode ?? null
      };

      try {
        originalWorkbookRef.current = parseWorkbookFromBuffer(input.workbookBuffer);
        await storeWorkbookBinary(datasetId, input.workbookBuffer);
        await saveDataset(dataset);
        await replaceDatasetCards(datasetId, cards);
      } catch (err) {
        addToast({ type: 'warning', title: 'Saved for this session only', description: 'IndexedDB is unavailable, so progress will not persist after reload.' });
      }

      dispatch({ type: 'SET_DATASET_AND_CARDS', payload: { dataset, cards } });
      addToast({ type: 'success', title: 'Import complete', description: `${report.newCount} new, ${report.updatedCount} updated, ${report.preservedCount} preserved.` });
      return report;
    },
    [state.dataset, state.cards, addToast]
  );

  const startSession = useCallback(
    (options?: { topic?: string }) => {
      let pool = state.cards;
      if (options?.topic) pool = pool.filter((c) => c.topic === options.topic);
      const due = pool.filter((c) => isDueCard(c));
      const newOnes = due.filter((c) => c.progress.repetitions === 0 && !c.progress.lastReviewed);
      const reviewOnes = due.filter((c) => !(c.progress.repetitions === 0 && !c.progress.lastReviewed));

      const limitedNew = newOnes.slice(0, state.ui.newCardsPerSession);
      const limitedReview = reviewOnes.slice(0, state.ui.reviewCardsPerSession);
      let queue = [...limitedReview, ...limitedNew];

      if (state.ui.shuffleCards) {
        queue = [...queue];
        for (let i = queue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [queue[i], queue[j]] = [queue[j], queue[i]];
        }
      }

      dispatch({ type: 'START_SESSION', payload: queue });
    },
    [state.cards, state.ui.newCardsPerSession, state.ui.reviewCardsPerSession, state.ui.shuffleCards]
  );

  const revealCard = useCallback(() => dispatch({ type: 'REVEAL_CARD' }), []);

  const rateCard = useCallback(
    async (rating: Rating) => {
      if (!state.activeSession) return;
      const card = state.activeSession.queue[state.activeSession.currentIndex];
      if (!card) return;
      const updatedProgress = applyRating(card.progress, rating);
      const updatedCard: Card = { ...card, progress: updatedProgress };

      try {
        await putCard(updatedCard);
        if (state.dataset) await saveDataset({ ...state.dataset, isDirty: true, updatedAt: new Date().toISOString() });
      } catch {
        // Keep going even if persistence fails this turn; in-memory state still reflects the answer.
      }

      dispatch({ type: 'MARK_DIRTY' });
      dispatch({
        type: 'ANSWER_CARD',
        payload: {
          updatedCard,
          isCorrect: rating !== 'again',
          rescheduleEntry: { cardId: updatedCard.id, term: updatedCard.term, nextReview: updatedProgress.nextReview }
        }
      });
    },
    [state.activeSession, state.dataset]
  );

  const endSession = useCallback(async () => {
    if (!state.activeSession || !state.dataset) {
      dispatch({ type: 'END_SESSION' });
      return;
    }
    const session = state.activeSession;
    const durationSeconds = Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000));
    const record: StudySessionRecord = {
      id: `session-${Date.now()}-${randomIdFragment()}`,
      datasetId: state.dataset.id,
      startedAt: session.startedAt,
      endedAt: new Date().toISOString(),
      reviewed: session.reviewed,
      correct: session.correct,
      wrong: session.wrong,
      durationSeconds
    };
    try {
      await addStudySession(record);
      const day = await recordActivity({ reviews: session.reviewed, correct: session.correct, wrong: session.wrong, studyMinutes: Math.round(durationSeconds / 60) });
      const allActivity: ActivityDay[] = (await getAllActivity()).map((a) => (a.date === day.date ? day : a));
      dispatch({ type: 'SET_ACTIVITY', payload: allActivity });
      dispatch({ type: 'SET_STUDY_SESSIONS', payload: [...state.studySessions, record] });
    } catch {
      // Session summary is still shown even if history logging failed to persist.
    }
    dispatch({ type: 'END_SESSION' });
  }, [state.activeSession, state.dataset, state.studySessions]);

  const dismissSessionSummary = useCallback(() => dispatch({ type: 'DISMISS_SESSION_SUMMARY' }), []);

  const buildWorkbookBuffer = useCallback((): ArrayBuffer | null => {
    if (!state.dataset) return null;
    const columnOrder = resolveExportColumnOrder(state.dataset.workbookMetadata.columnOrder);
    const workbook = buildUpdatedWorkbook(originalWorkbookRef.current, state.dataset.selectedSheetName, columnOrder, state.cards);
    return workbookToArrayBuffer(workbook);
  }, [state.dataset, state.cards]);

  const exportExcel = useCallback(async () => {
    const buffer = buildWorkbookBuffer();
    if (!buffer || !state.dataset) {
      addToast({ type: 'error', title: 'Nothing to export yet', description: 'Import a workbook first.' });
      return;
    }
    triggerBrowserDownload(buffer, buildExportFileName());
    const timestamp = new Date().toISOString();
    try {
      await saveDataset({ ...state.dataset, isDirty: false, lastSavedAt: timestamp, lastSaveMode: 'export' });
    } catch {
      /* non-fatal */
    }
    dispatch({ type: 'MARK_SAVED', payload: { mode: 'export', timestamp } });
    addToast({ type: 'success', title: 'Exported to Excel', description: 'A new workbook with your progress was downloaded.' });
  }, [buildWorkbookBuffer, state.dataset, addToast]);

  const openLinkedWorkbook = useCallback(async () => {
    if (!isFileSystemAccessSupported()) {
      addToast({ type: 'info', title: 'Direct save is not available in this browser', description: 'Use Import and Export Excel instead.' });
      return;
    }
    try {
      const opened = await openWorkbookWithPicker();
      if (!opened || !state.dataset) return;
      const { handle, file } = opened;
      fileHandleRef.current = handle;
      const buffer = await file.arrayBuffer();
      originalWorkbookRef.current = parseWorkbookFromBuffer(buffer);
      await storeFileHandle(state.dataset.id, handle, file.name);
      await storeWorkbookBinary(state.dataset.id, buffer);
      dispatch({ type: 'SET_FILE_HANDLE', payload: { available: true, fileName: file.name } });
      addToast({ type: 'success', title: 'Workbook linked', description: `${file.name} is now linked for direct save.` });
    } catch {
      addToast({ type: 'error', title: 'Could not link workbook', description: 'Please try again.' });
    }
  }, [state.dataset, addToast]);

  const saveToWorkbook = useCallback(async () => {
    if (!fileHandleRef.current || !state.dataset) {
      await exportExcel();
      return;
    }
    try {
      let granted = await hasReadWritePermission(fileHandleRef.current);
      if (!granted) {
        granted = await requestReadWritePermission(fileHandleRef.current);
      }
      if (!granted) {
        dispatch({ type: 'SET_FILE_HANDLE', payload: { available: false, fileName: state.linkedFileName } });
        addToast({ type: 'warning', title: 'Permission not granted', description: 'Falling back to Export Excel.' });
        await exportExcel();
        return;
      }
      const buffer = buildWorkbookBuffer();
      if (!buffer) return;
      await writeWorkbookToHandle(fileHandleRef.current, buffer);
      const timestamp = new Date().toISOString();
      await saveDataset({ ...state.dataset, isDirty: false, lastSavedAt: timestamp, lastSaveMode: 'workbook' });
      dispatch({ type: 'MARK_SAVED', payload: { mode: 'workbook', timestamp } });
      dispatch({ type: 'SET_FILE_HANDLE', payload: { available: true, fileName: state.linkedFileName } });
      addToast({ type: 'success', title: 'Saved to workbook', description: 'Your linked Excel file was updated directly.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Direct save failed', description: err instanceof Error ? err.message : 'Please try Export Excel instead.' });
    }
  }, [state.dataset, state.linkedFileName, buildWorkbookBuffer, exportExcel, addToast]);

  const saveProgress = useCallback(async () => {
    if (isFileSystemAccessSupported() && fileHandleRef.current) {
      await saveToWorkbook();
    } else {
      await exportExcel();
    }
  }, [saveToWorkbook, exportExcel]);

  const restoreBackup = useCallback(
    async (backup: JsonBackup, mode: 'merge' | 'new') => {
      const nowISO = new Date().toISOString();
      const datasetId = mode === 'new' ? `dataset-${randomIdFragment()}` : state.dataset?.id ?? backup.dataset.id;
      const cards = mode === 'merge' && state.dataset ? mergeBackupCards(state.cards, backup.cards, datasetId) : backup.cards.map((c) => ({ ...c, datasetId }));

      const dataset: Dataset = {
        ...backup.dataset,
        id: datasetId,
        isDirty: true,
        lastSavedAt: null,
        lastSaveMode: null,
        updatedAt: nowISO
      };

      try {
        await saveDataset(dataset);
        await replaceDatasetCards(datasetId, cards);
        for (const session of backup.studySessions) {
          await addStudySession({ ...session, datasetId });
        }
      } catch {
        addToast({ type: 'warning', title: 'Restored for this session only', description: 'IndexedDB is unavailable right now.' });
      }

      originalWorkbookRef.current = null;
      dispatch({ type: 'SET_DATASET_AND_CARDS', payload: { dataset, cards } });
      dispatch({ type: 'SET_STUDY_SESSIONS', payload: mode === 'merge' ? [...state.studySessions, ...backup.studySessions] : backup.studySessions });
      addToast({ type: 'success', title: 'Backup restored', description: `${cards.length} cards are now in your library.` });
    },
    [state.dataset, state.cards, state.studySessions, addToast]
  );

  const clearLocalCache = useCallback(async () => {
    try {
      await clearAllLocalData();
    } finally {
      fileHandleRef.current = null;
      originalWorkbookRef.current = null;
      dispatch({ type: 'RESET_ALL' });
      addToast({ type: 'info', title: 'Local cache cleared', description: 'Import a workbook to start again.' });
    }
  }, [addToast]);

  const updateUIPreferences = useCallback((partial: Partial<UIPreferences>) => {
    dispatch({ type: 'SET_UI_PREF', payload: partial });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      actions: {
        loadDemoData,
        commitImport,
        startSession,
        revealCard,
        rateCard,
        prevCard: useCallback(() => dispatch({ type: 'PREV_CARD' }), []),
        skipCard: useCallback(() => dispatch({ type: 'SKIP_CARD' }), []),
        hideCard: useCallback(() => dispatch({ type: 'HIDE_CARD' }), []),
        endSession,
        dismissSessionSummary,
        exportExcel,
        openLinkedWorkbook,
        saveToWorkbook,
        saveProgress,
        restoreBackup,
        clearLocalCache,
        updateUIPreferences,
        addToast,
        removeToast
      }
    }),
    [
      state,
      loadDemoData,
      commitImport,
      startSession,
      revealCard,
      rateCard,
      endSession,
      dismissSessionSummary,
      exportExcel,
      openLinkedWorkbook,
      saveToWorkbook,
      saveProgress,
      restoreBackup,
      clearLocalCache,
      updateUIPreferences,
      addToast,
      removeToast
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
