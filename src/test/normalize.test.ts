import { describe, expect, it } from 'vitest';
import { normalizeKey, buildStableCardId, normalizeHeader, parseTags } from '@/utils/normalize';

describe('normalizeKey', () => {
  it('lowercases, trims, and collapses whitespace', () => {
    expect(normalizeKey('  Hello   World  ')).toBe('hello world');
  });

  it('returns an empty string for null/undefined input', () => {
    expect(normalizeKey(null)).toBe('');
    expect(normalizeKey(undefined)).toBe('');
  });

  it('treats different whitespace runs as equal', () => {
    expect(normalizeKey('two   pointers')).toBe(normalizeKey('two pointers'));
  });
});

describe('buildStableCardId', () => {
  it('combines normalized topic and term', () => {
    const id1 = buildStableCardId('Java', 'Polymorphism');
    const id2 = buildStableCardId('java', '  polymorphism ');
    expect(id1).toBe(id2);
  });

  it('falls back to "general" when topic is missing', () => {
    const id = buildStableCardId('', 'align');
    expect(id).toBe(buildStableCardId('General', 'align'));
  });

  it('produces different ids for different terms', () => {
    expect(buildStableCardId('Java', 'polymorphism')).not.toBe(buildStableCardId('Java', 'inheritance'));
  });
});

describe('normalizeHeader', () => {
  it('normalizes case and whitespace for column matching', () => {
    expect(normalizeHeader('  Next Review ')).toBe('next review');
  });
});

describe('parseTags', () => {
  it('splits on commas and semicolons and trims entries', () => {
    expect(parseTags('java, oop ; basics')).toEqual(['java', 'oop', 'basics']);
  });

  it('returns an empty array for blank input', () => {
    expect(parseTags('')).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
  });
});
