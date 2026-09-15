import { DEFAULT_UI_PREFERENCES, type UIPreferences } from '@/types';

const STORAGE_KEY = 'learning-playground:ui-preferences';

export function loadUIPreferences(): UIPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_UI_PREFERENCES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_UI_PREFERENCES, ...parsed, lastLibraryFilters: { ...DEFAULT_UI_PREFERENCES.lastLibraryFilters, ...(parsed?.lastLibraryFilters ?? {}) } };
  } catch {
    return DEFAULT_UI_PREFERENCES;
  }
}

export function saveUIPreferences(prefs: UIPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded) — fail silently, in-memory state still works.
  }
}
