import type { Card, CardProgress, ColumnMapping, ImportRowResult, MergeReport, MergeReportEntry } from '@/types';
import { createDefaultProgress } from '@/types';
import { buildStableCardId, normalizeKey, randomIdFragment } from '@/utils/normalize';
import { rowToCardFields } from '@/services/excelService';
import { parseToISOOrNull } from '@/utils/date';
import { MIN_EASE_FACTOR } from '@/services/sm2Service';

/**
 * Attempts to derive a valid CardProgress purely from an imported row's progress columns.
 * Returns null if the row does not provide a complete/valid progress snapshot, in which case
 * the caller should fall back to whatever progress already exists locally.
 */
export function deriveProgressFromRow(fields: ReturnType<typeof rowToCardFields>): CardProgress | null {
  const hasAnyProgressValue = [
    fields.lastReviewedRaw,
    fields.correctRaw,
    fields.wrongRaw,
    fields.easeFactorRaw,
    fields.repetitionsRaw,
    fields.intervalRaw,
    fields.nextReviewRaw
  ].some((v) => v !== undefined && v !== null && String(v).trim() !== '');

  if (!hasAnyProgressValue) return null;

  const toNonNegativeInt = (v: unknown, fallback: number): number | null => {
    if (v === undefined || v === null || String(v).trim() === '') return fallback;
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n);
  };

  const correct = toNonNegativeInt(fields.correctRaw, 0);
  const wrong = toNonNegativeInt(fields.wrongRaw, 0);
  const repetitions = toNonNegativeInt(fields.repetitionsRaw, 0);
  const interval = toNonNegativeInt(fields.intervalRaw, 0);
  if (correct === null || wrong === null || repetitions === null || interval === null) return null;

  let easeFactor = 2.5;
  if (fields.easeFactorRaw !== undefined && fields.easeFactorRaw !== null && String(fields.easeFactorRaw).trim() !== '') {
    const n = typeof fields.easeFactorRaw === 'number' ? fields.easeFactorRaw : Number(fields.easeFactorRaw);
    if (!Number.isFinite(n) || n < MIN_EASE_FACTOR) return null;
    easeFactor = n;
  }

  const lastReviewed = parseToISOOrNull(fields.lastReviewedRaw);
  const nextReview = parseToISOOrNull(fields.nextReviewRaw);

  return { repetitions, easeFactor, interval, nextReview, lastReviewed, correct, wrong };
}

function contentEquals(a: Card, b: { topic: string; term: string; definition: string; example: string; notes: string; tags: string[] }) {
  return (
    a.topic === b.topic &&
    a.term === b.term &&
    a.definition === b.definition &&
    a.example === b.example &&
    a.notes === b.notes &&
    a.tags.join('|') === b.tags.join('|')
  );
}

export interface MergeInput {
  datasetId: string;
  existingCards: Card[];
  parsedRows: Record<string, unknown>[];
  rowResults: ImportRowResult[];
  mappings: ColumnMapping[];
}

export interface MergeOutput {
  cards: Card[];
  report: MergeReport;
}

/** Implements the smart-merge rules from the spec when (re-)importing an Excel file. */
export function mergeImportedCards({ datasetId, existingCards, parsedRows, rowResults, mappings }: MergeInput): MergeOutput {
  const existingById = new Map(existingCards.map((c) => [c.id, c]));
  const existingByKey = new Map(existingCards.map((c) => [buildStableCardId(c.topic, c.term), c]));
  const matchedExistingIds = new Set<string>();
  const entries: MergeReportEntry[] = [];
  const resultCards: Card[] = [];
  const seenKeysThisImport = new Map<string, string>(); // key -> term (for conflict messaging)

  parsedRows.forEach((row, index) => {
    const rowResult = rowResults[index];
    if (!rowResult || rowResult.status === 'invalid') return; // invalid rows are never merged

    const fields = rowToCardFields(row, mappings);
    if (!fields.term || !fields.definition) return;

    const explicitId = fields.id || undefined;
    const stableKey = buildStableCardId(fields.topic, fields.term);
    const dedupeKey = explicitId ? `id:${explicitId}` : `key:${stableKey}`;

    if (rowResult.status === 'duplicate') {
      entries.push({
        cardId: explicitId ?? stableKey,
        term: fields.term,
        topic: fields.topic || 'General',
        status: 'conflicted',
        detail: `Row ${rowResult.row} shares the same ${explicitId ? 'ID' : 'Topic + Term'} as an earlier row in this file and was not imported.`
      });
      return;
    }

    if (seenKeysThisImport.has(dedupeKey)) return;
    seenKeysThisImport.set(dedupeKey, fields.term);

    const existing = (explicitId && existingById.get(explicitId)) || existingByKey.get(stableKey) || undefined;
    const incomingProgress = deriveProgressFromRow(fields);

    const topic = fields.topic || 'General';
    const cardId = existing?.id ?? explicitId ?? stableKey ?? `card-${randomIdFragment()}`;

    if (existing) {
      matchedExistingIds.add(existing.id);
      const changed = !contentEquals(existing, { topic, term: fields.term, definition: fields.definition, example: fields.example, notes: fields.notes, tags: fields.tags });
      const finalProgress = incomingProgress ?? existing.progress;

      resultCards.push({
        id: cardId,
        datasetId,
        sourceRowIndex: index,
        topic,
        term: fields.term,
        definition: fields.definition,
        example: fields.example,
        notes: fields.notes,
        tags: fields.tags,
        originalRow: row,
        progress: finalProgress
      });

      entries.push({
        cardId,
        term: fields.term,
        topic,
        status: changed || incomingProgress ? 'updated' : 'preserved',
        detail: changed
          ? 'Content updated from the imported file; progress preserved from this browser unless the file also provided progress.'
          : incomingProgress
            ? 'Progress values from the imported file were applied.'
            : 'No changes detected; existing card preserved as-is.'
      });
    } else {
      resultCards.push({
        id: cardId,
        datasetId,
        sourceRowIndex: index,
        topic,
        term: fields.term,
        definition: fields.definition,
        example: fields.example,
        notes: fields.notes,
        tags: fields.tags,
        originalRow: row,
        progress: incomingProgress ?? createDefaultProgress()
      });
      entries.push({
        cardId,
        term: fields.term,
        topic,
        status: 'new',
        detail: 'This card is new and was added to your library.'
      });
    }
  });

  // Cards that existed locally but were not present (by id or key) in this import: keep them, report as missing.
  for (const existing of existingCards) {
    if (!matchedExistingIds.has(existing.id)) {
      resultCards.push(existing);
      entries.push({
        cardId: existing.id,
        term: existing.term,
        topic: existing.topic,
        status: 'missing',
        detail: 'Not found in the imported file. Kept in your library — it was not deleted.'
      });
    }
  }

  const report: MergeReport = {
    entries,
    newCount: entries.filter((e) => e.status === 'new').length,
    updatedCount: entries.filter((e) => e.status === 'updated').length,
    preservedCount: entries.filter((e) => e.status === 'preserved').length,
    conflictedCount: entries.filter((e) => e.status === 'conflicted').length,
    missingCount: entries.filter((e) => e.status === 'missing').length
  };

  return { cards: resultCards, report };
}

/** Normalizes just the key-building step, exposed for tests. */
export function keyFor(topic: string, term: string): string {
  return `${normalizeKey(topic) || 'general'}::${normalizeKey(term)}`;
}
