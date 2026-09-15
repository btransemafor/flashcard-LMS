import type { ActivityDay, Card, Dataset, JsonBackup, StudySessionRecord } from '@/types';
import { downloadJsonFile } from '@/services/excelService';
import { buildJsonBackupFileName } from '@/utils/fileNaming';

export function buildJsonBackup(
  dataset: Dataset,
  cards: Card[],
  studySessions: StudySessionRecord[],
  activity: ActivityDay[]
): JsonBackup {
  const { isDirty, lastSavedAt, lastSaveMode, ...datasetMeta } = dataset;
  return {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    dataset: datasetMeta,
    cards,
    studySessions,
    activity
  };
}

export function downloadJsonBackup(backup: JsonBackup): void {
  const json = JSON.stringify(backup, null, 2);
  downloadJsonFile(json, buildJsonBackupFileName());
}

export interface BackupValidationResult {
  valid: boolean;
  errors: string[];
  backup?: JsonBackup;
}

/** Validates the shape of a JSON backup file before allowing restore. Never executes any code from the file. */
export function validateJsonBackup(raw: string): BackupValidationResult {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { valid: false, errors: ['This file is not valid JSON.'] };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { valid: false, errors: ['This backup file is malformed.'] };
  }

  const candidate = parsed as Partial<JsonBackup>;

  if (candidate.formatVersion !== 1) {
    errors.push('Unsupported backup format version. This app can only restore version 1 backups.');
  }
  if (!candidate.dataset || typeof candidate.dataset !== 'object') {
    errors.push('Missing dataset information.');
  }
  if (!Array.isArray(candidate.cards)) {
    errors.push('Missing or invalid card list.');
  } else {
    candidate.cards.forEach((card, i) => {
      if (!card || typeof card !== 'object') {
        errors.push(`Card at position ${i + 1} is malformed.`);
        return;
      }
      const c = card as Partial<Card>;
      if (!c.term || typeof c.term !== 'string') errors.push(`Card at position ${i + 1} is missing a Term.`);
      if (!c.definition || typeof c.definition !== 'string') errors.push(`Card at position ${i + 1} is missing a Definition.`);
      if (!c.progress || typeof c.progress !== 'object') errors.push(`Card at position ${i + 1} is missing progress data.`);
    });
  }
  if (!Array.isArray(candidate.studySessions)) errors.push('Missing study session history.');
  if (!Array.isArray(candidate.activity)) errors.push('Missing activity history.');

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors: [], backup: candidate as JsonBackup };
}

/**
 * Merges a restored JSON backup's cards into the current library.
 * Backup cards are treated as an authoritative snapshot (content + progress),
 * matched by ID first, then by normalized Topic + Term. Local cards absent
 * from the backup are preserved, never silently deleted.
 */
export function mergeBackupCards(existingCards: Card[], backupCards: Card[], datasetId: string): Card[] {
  const existingById = new Map(existingCards.map((c) => [c.id, c]));
  const existingByTopicTerm = new Map(existingCards.map((c) => [`${c.topic.toLowerCase()}::${c.term.toLowerCase()}`, c]));
  const matched = new Set<string>();
  const result: Card[] = [];

  for (const backupCard of backupCards) {
    const key = `${backupCard.topic.toLowerCase()}::${backupCard.term.toLowerCase()}`;
    const existing = existingById.get(backupCard.id) ?? existingByTopicTerm.get(key);
    if (existing) matched.add(existing.id);
    result.push({ ...backupCard, datasetId, id: existing?.id ?? backupCard.id });
  }

  for (const existing of existingCards) {
    if (!matched.has(existing.id)) result.push(existing);
  }

  return result;
}
