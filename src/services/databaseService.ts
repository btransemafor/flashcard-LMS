import Dexie, { type Table } from 'dexie';
import type { Card, Dataset, StudySessionRecord, ActivityDay } from '@/types';

interface WorkbookBinaryRecord {
  datasetId: string;
  data: ArrayBuffer;
}

interface FileHandleRecord {
  datasetId: string;
  handle: FileSystemFileHandle;
  fileName: string;
}

/**
 * Dexie (IndexedDB) database. This is the local cache layer — Excel remains the
 * long-term source of truth, but this store lets the app resume instantly on reload
 * and keeps progress safe between explicit Save Progress / Export actions.
 *
 * Versioning: bump `.version(n)` and add a `.upgrade()` callback whenever the schema
 * changes, so existing users' local data migrates instead of being wiped.
 */
class LearningPlaygroundDB extends Dexie {
  datasets!: Table<Dataset, string>;
  cards!: Table<Card, string>;
  studySessions!: Table<StudySessionRecord, string>;
  activity!: Table<ActivityDay, string>;
  workbookBinaries!: Table<WorkbookBinaryRecord, string>;
  fileHandles!: Table<FileHandleRecord, string>;

  constructor() {
    super('learning-playground');
    this.version(1).stores({
      datasets: 'id, updatedAt',
      cards: 'id, datasetId, topic',
      studySessions: 'id, datasetId, startedAt',
      activity: 'date',
      workbookBinaries: 'datasetId',
      fileHandles: 'datasetId'
    });
  }
}

export const db = new LearningPlaygroundDB();

export class DatabaseUnavailableError extends Error {}

async function guarded<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    console.error('IndexedDB operation failed', err instanceof Error ? err.message : err);
    throw new DatabaseUnavailableError(
      'Local storage (IndexedDB) is unavailable right now. You can still import, study, and export within this session, but progress may not persist after reload.'
    );
  }
}

export async function isIndexedDBAvailable(): Promise<boolean> {
  try {
    await db.open();
    return true;
  } catch {
    return false;
  }
}

export async function getMostRecentDataset(): Promise<Dataset | undefined> {
  return guarded(async () => {
    const all = await db.datasets.toArray();
    if (all.length === 0) return undefined;
    return all.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
  });
}

export async function saveDataset(dataset: Dataset): Promise<void> {
  await guarded(() => db.datasets.put(dataset));
}

export async function getCardsByDataset(datasetId: string): Promise<Card[]> {
  return guarded(() => db.cards.where('datasetId').equals(datasetId).toArray());
}

export async function bulkPutCards(cards: Card[]): Promise<void> {
  await guarded(() => db.cards.bulkPut(cards));
}

export async function putCard(card: Card): Promise<void> {
  await guarded(() => db.cards.put(card));
}

export async function replaceDatasetCards(datasetId: string, cards: Card[]): Promise<void> {
  await guarded(async () => {
    await db.transaction('rw', db.cards, async () => {
      await db.cards.where('datasetId').equals(datasetId).delete();
      await db.cards.bulkPut(cards);
    });
  });
}

export async function addStudySession(session: StudySessionRecord): Promise<void> {
  await guarded(() => db.studySessions.put(session));
}

export async function getStudySessions(datasetId: string): Promise<StudySessionRecord[]> {
  return guarded(() => db.studySessions.where('datasetId').equals(datasetId).toArray());
}

export async function upsertActivity(day: ActivityDay): Promise<void> {
  await guarded(() => db.activity.put(day));
}

export async function getActivity(date: string): Promise<ActivityDay | undefined> {
  return guarded(() => db.activity.get(date));
}

export async function getAllActivity(): Promise<ActivityDay[]> {
  return guarded(() => db.activity.toArray());
}

export async function storeWorkbookBinary(datasetId: string, data: ArrayBuffer): Promise<void> {
  await guarded(() => db.workbookBinaries.put({ datasetId, data }));
}

export async function getWorkbookBinary(datasetId: string): Promise<ArrayBuffer | undefined> {
  return guarded(async () => (await db.workbookBinaries.get(datasetId))?.data);
}

export async function storeFileHandle(datasetId: string, handle: FileSystemFileHandle, fileName: string): Promise<void> {
  await guarded(() => db.fileHandles.put({ datasetId, handle, fileName }));
}

export async function getFileHandleRecord(datasetId: string): Promise<FileHandleRecord | undefined> {
  return guarded(() => db.fileHandles.get(datasetId));
}

export async function clearAllLocalData(): Promise<void> {
  await guarded(async () => {
    await db.transaction('rw', db.datasets, db.cards, db.studySessions, db.activity, db.workbookBinaries, db.fileHandles, async () => {
      await Promise.all([
        db.datasets.clear(),
        db.cards.clear(),
        db.studySessions.clear(),
        db.activity.clear(),
        db.workbookBinaries.clear(),
        db.fileHandles.clear()
      ]);
    });
  });
}

export type { WorkbookBinaryRecord, FileHandleRecord };
