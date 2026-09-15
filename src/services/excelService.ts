import * as XLSX from 'xlsx';
import type { Card, ColumnMapping, ParsedWorkbookInfo } from '@/types';
import { CANONICAL_COLUMNS, PROGRESS_COLUMN_IDS } from '@/utils/validation';
import { parseTags, tagsToCell } from '@/utils/normalize';
import { formatDisplayDate } from '@/utils/date';

export class ExcelParseError extends Error {}

const SUPPORTED_EXTENSIONS = ['.xlsx', '.xls'];

export function isSupportedExcelFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Reads a File/ArrayBuffer into a SheetJS workbook. Dates are parsed as JS Date objects. */
export async function readWorkbookFromFile(file: File): Promise<{ workbook: XLSX.WorkBook; info: ParsedWorkbookInfo }> {
  if (!isSupportedExcelFile(file)) {
    throw new ExcelParseError('Unsupported file type. Please choose a .xlsx or .xls file.');
  }
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new ExcelParseError('The file could not be read. It may be corrupted or in use by another program.');
  }
  return { workbook: parseWorkbookFromBuffer(buffer), info: { sheetNames: [], fileName: file.name, fileSizeBytes: file.size } };
}

export function parseWorkbookFromBuffer(buffer: ArrayBuffer): XLSX.WorkBook {
  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new ExcelParseError('This workbook does not contain any sheets.');
    }
    return workbook;
  } catch (err) {
    if (err instanceof ExcelParseError) throw err;
    throw new ExcelParseError('This file could not be parsed as an Excel workbook. It may be corrupted or password-protected.');
  }
}

export function getSheetNames(workbook: XLSX.WorkBook): string[] {
  return workbook.SheetNames;
}

/** Parses a sheet into an ordered header list and an array of row records, preserving column order. */
export function parseSheetRows(workbook: XLSX.WorkBook, sheetName: string): { headers: string[]; rows: Record<string, unknown>[] } {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { headers: [], rows: [] };
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  if (aoa.length === 0) return { headers: [], rows: [] };

  const rawHeaderRow = aoa[0] as unknown[];
  const headers = rawHeaderRow.map((h) => (h === null || h === undefined ? '' : String(h).trim()));
  const dataRows = aoa.slice(1) as unknown[][];

  const rows = dataRows.map((rowArr) => {
    const rec: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      if (!h) return;
      rec[h] = rowArr[i] ?? '';
    });
    return rec;
  });

  return { headers: headers.filter((h) => h !== ''), rows };
}

/** Converts one raw Excel row + its resolved mapping into a Card-shaped object (progress left as raw strings). */
export function rowToCardFields(row: Record<string, unknown>, mappings: ColumnMapping[]) {
  const getValue = (id: ColumnMapping['id']): unknown => {
    const mapping = mappings.find((m) => m.id === id);
    if (!mapping?.matchedHeader) return undefined;
    return row[mapping.matchedHeader];
  };
  return {
    id: getValue('ID') !== undefined ? String(getValue('ID') ?? '').trim() : '',
    topic: String(getValue('Topic') ?? '').trim(),
    term: String(getValue('Term') ?? '').trim(),
    definition: String(getValue('Definition') ?? '').trim(),
    example: String(getValue('Example') ?? '').trim(),
    notes: String(getValue('Notes') ?? '').trim(),
    tags: parseTags(getValue('Tags')),
    lastReviewedRaw: getValue('LastReviewed'),
    correctRaw: getValue('Correct'),
    wrongRaw: getValue('Wrong'),
    easeFactorRaw: getValue('EaseFactor'),
    repetitionsRaw: getValue('Repetitions'),
    intervalRaw: getValue('Interval'),
    nextReviewRaw: getValue('NextReview')
  };
}

/** Builds the final export column order: original columns first (in original order), then any missing canonical columns appended. */
export function resolveExportColumnOrder(originalColumnOrder: string[]): string[] {
  const order = [...originalColumnOrder];
  const normalizedExisting = new Set(order.map((h) => h.toLowerCase().trim()));
  for (const canonical of CANONICAL_COLUMNS) {
    const alreadyPresent = canonical.aliases.some((alias) => normalizedExisting.has(alias));
    if (!alreadyPresent) {
      order.push(canonical.id);
      normalizedExisting.add(canonical.id.toLowerCase());
    }
  }
  return order;
}

/** Finds which header name (existing) should hold a given canonical field, or falls back to the canonical name. */
function resolveHeaderNameFor(columnOrder: string[], canonicalId: ColumnMapping['id']): string {
  const canonical = CANONICAL_COLUMNS.find((c) => c.id === canonicalId)!;
  const match = columnOrder.find((h) => canonical.aliases.includes(h.toLowerCase().trim()) || h === canonicalId);
  return match ?? canonicalId;
}

/**
 * Builds the row objects (keyed by final export header names) for a set of cards,
 * merging each card's preserved originalRow (custom columns) with fresh content + progress values.
 */
export function cardsToExportRows(cards: Card[], columnOrder: string[]): Record<string, unknown>[] {
  const idHeader = resolveHeaderNameFor(columnOrder, 'ID');
  const topicHeader = resolveHeaderNameFor(columnOrder, 'Topic');
  const termHeader = resolveHeaderNameFor(columnOrder, 'Term');
  const definitionHeader = resolveHeaderNameFor(columnOrder, 'Definition');
  const exampleHeader = resolveHeaderNameFor(columnOrder, 'Example');
  const notesHeader = resolveHeaderNameFor(columnOrder, 'Notes');
  const tagsHeader = resolveHeaderNameFor(columnOrder, 'Tags');
  const lastReviewedHeader = resolveHeaderNameFor(columnOrder, 'LastReviewed');
  const correctHeader = resolveHeaderNameFor(columnOrder, 'Correct');
  const wrongHeader = resolveHeaderNameFor(columnOrder, 'Wrong');
  const easeFactorHeader = resolveHeaderNameFor(columnOrder, 'EaseFactor');
  const repetitionsHeader = resolveHeaderNameFor(columnOrder, 'Repetitions');
  const intervalHeader = resolveHeaderNameFor(columnOrder, 'Interval');
  const nextReviewHeader = resolveHeaderNameFor(columnOrder, 'NextReview');

  return cards.map((card) => {
    const row: Record<string, unknown> = { ...card.originalRow };
    row[idHeader] = card.id;
    row[topicHeader] = card.topic;
    row[termHeader] = card.term;
    row[definitionHeader] = card.definition;
    row[exampleHeader] = card.example;
    row[notesHeader] = card.notes;
    row[tagsHeader] = tagsToCell(card.tags);
    row[lastReviewedHeader] = card.progress.lastReviewed ? formatDisplayDate(card.progress.lastReviewed, 'yyyy-MM-dd') : '';
    row[correctHeader] = card.progress.correct;
    row[wrongHeader] = card.progress.wrong;
    row[easeFactorHeader] = Number(card.progress.easeFactor.toFixed(2));
    row[repetitionsHeader] = card.progress.repetitions;
    row[intervalHeader] = card.progress.interval;
    row[nextReviewHeader] = card.progress.nextReview ? formatDisplayDate(card.progress.nextReview, 'yyyy-MM-dd') : '';

    // Strip any internal-only keys that don't belong to the export schema.
    for (const key of Object.keys(row)) {
      if (!columnOrder.includes(key)) delete row[key];
    }
    return row;
  });
}

/**
 * Rebuilds a full workbook for export/direct-save: replaces ONLY the target sheet with
 * fresh card data + preserved column order, leaving every other sheet untouched.
 */
export function buildUpdatedWorkbook(
  originalWorkbook: XLSX.WorkBook | null,
  sheetName: string,
  columnOrder: string[],
  cards: Card[]
): XLSX.WorkBook {
  const rows = cardsToExportRows(cards, columnOrder);
  const aoa: unknown[][] = [columnOrder, ...rows.map((row) => columnOrder.map((h) => row[h] ?? ''))];
  const newSheet = XLSX.utils.aoa_to_sheet(aoa);

  if (originalWorkbook) {
    const sheets = { ...originalWorkbook.Sheets, [sheetName]: newSheet };
    const sheetNames = originalWorkbook.SheetNames.includes(sheetName)
      ? originalWorkbook.SheetNames
      : [...originalWorkbook.SheetNames, sheetName];
    return { ...originalWorkbook, Sheets: sheets, SheetNames: sheetNames };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, newSheet, sheetName);
  return workbook;
}

export function workbookToArrayBuffer(workbook: XLSX.WorkBook): ArrayBuffer {
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

export function triggerBrowserDownload(data: ArrayBuffer, fileName: string) {
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadJsonFile(data: string, fileName: string) {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const SAMPLE_TEMPLATE_HEADERS = [
  'ID', 'Topic', 'Term', 'Definition', 'Example', 'Notes', 'Tags',
  'LastReviewed', 'Correct', 'Wrong', 'EaseFactor', 'Repetitions', 'Interval', 'NextReview'
];

export function buildSampleTemplateWorkbook(): XLSX.WorkBook {
  const sampleRows = [
    ['', 'Java', 'polymorphism', 'The ability of an object to take many forms, typically via method overriding or interfaces.', 'Animal a = new Dog(); a.makeSound();', 'Core OOP pillar.', 'oop, java', '', 0, 0, 2.5, 0, 0, ''],
    ['', 'Data Structures & Algorithms', 'two pointers', 'A technique using two indices moving through a structure to reduce time complexity.', 'Find pair sum in a sorted array.', 'Great for sorted-array problems.', 'algorithms, pattern', '', 0, 0, 2.5, 0, 0, '']
  ];
  const sheet = XLSX.utils.aoa_to_sheet([SAMPLE_TEMPLATE_HEADERS, ...sampleRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Cards');
  return workbook;
}

export { PROGRESS_COLUMN_IDS };
