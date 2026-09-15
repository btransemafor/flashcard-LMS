/**
 * Normalizes a raw string for use as part of a stable card key:
 * - lowercases
 * - trims leading/trailing whitespace
 * - collapses internal whitespace runs into a single space
 * - applies Unicode NFKC normalization when available
 */
export function normalizeKey(raw: string | null | undefined): string {
  if (!raw) return '';
  let value = String(raw);
  if (typeof value.normalize === 'function') {
    value = value.normalize('NFKC');
  }
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Safe separator that is very unlikely to appear inside normal topic/term text. */
const KEY_SEPARATOR = '\u241F'; // Unicode "SYMBOL FOR UNIT SEPARATOR" — invisible in normal rendering

/** Builds a stable, deterministic card id from Topic + Term when no ID is provided. */
export function buildStableCardId(topic: string | null | undefined, term: string | null | undefined): string {
  const normalizedTopic = normalizeKey(topic) || 'general';
  const normalizedTerm = normalizeKey(term);
  return `${normalizedTopic}${KEY_SEPARATOR}${normalizedTerm}`;
}

/** Normalizes a column header for case-insensitive, whitespace-tolerant matching. */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Parses a Tags cell (comma or semicolon separated) into a clean string array. */
export function parseTags(raw: unknown): string[] {
  if (raw === null || raw === undefined) return [];
  const str = String(raw).trim();
  if (!str) return [];
  return str
    .split(/[;,]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function tagsToCell(tags: string[]): string {
  return tags.join(', ');
}

/** Generates a short random id fragment, used only when a stable key cannot be formed. */
export function randomIdFragment(): string {
  return Math.random().toString(36).slice(2, 10);
}
