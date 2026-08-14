import type { Criteria, Route } from "./types";

export interface Bookmark {
  id: string;
  name: string;
  origin: { lat: number; lon: number };
}

export interface HistoryEntry {
  id: string;
  route: Route;
  criteria: Criteria;
  timestamp: number;
  /** custom label set by the user; falls back to the derived street-name label when absent */
  name?: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const BOOKMARKS_KEY = "hkr.bookmarks.v1";
const HISTORY_KEY = "hkr.history.v1";

export const HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const HISTORY_CAP = 50;

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readJSON<T>(storage: StorageLike, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeJSON(storage: StorageLike, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — persistence is best-effort
  }
}

export function loadBookmarks(storage: StorageLike): Bookmark[] {
  return readJSON<Bookmark[]>(storage, BOOKMARKS_KEY, []);
}

export function saveBookmark(
  storage: StorageLike,
  bookmark: Bookmark,
): Bookmark[] {
  const all = loadBookmarks(storage);
  const next = [bookmark, ...all.filter((b) => b.id !== bookmark.id)];
  writeJSON(storage, BOOKMARKS_KEY, next);
  return next;
}

export function removeBookmark(storage: StorageLike, id: string): Bookmark[] {
  const next = loadBookmarks(storage).filter((b) => b.id !== id);
  writeJSON(storage, BOOKMARKS_KEY, next);
  return next;
}

export function renameBookmark(
  storage: StorageLike,
  id: string,
  name: string,
): Bookmark[] {
  const next = loadBookmarks(storage).map((b) =>
    b.id === id ? { ...b, name } : b,
  );
  writeJSON(storage, BOOKMARKS_KEY, next);
  return next;
}

export function pruneHistory(entries: HistoryEntry[], now: number): HistoryEntry[] {
  const cutoff = now - HISTORY_WINDOW_MS;
  const withinWindow = entries.filter((e) => e.timestamp >= cutoff);
  return withinWindow.slice(0, HISTORY_CAP);
}

export function loadHistory(storage: StorageLike): HistoryEntry[] {
  return readJSON<HistoryEntry[]>(storage, HISTORY_KEY, []);
}

export function saveHistoryEntry(
  storage: StorageLike,
  entry: HistoryEntry,
  now = Date.now(),
): HistoryEntry[] {
  const all = loadHistory(storage);
  const next = pruneHistory([entry, ...all.filter((e) => e.id !== entry.id)], now);
  writeJSON(storage, HISTORY_KEY, next);
  return next;
}

export function removeHistoryEntry(storage: StorageLike, id: string): HistoryEntry[] {
  const next = loadHistory(storage).filter((e) => e.id !== id);
  writeJSON(storage, HISTORY_KEY, next);
  return next;
}

export function renameHistoryEntry(
  storage: StorageLike,
  id: string,
  name: string,
): HistoryEntry[] {
  const next = loadHistory(storage).map((e) =>
    e.id === id ? { ...e, name } : e,
  );
  writeJSON(storage, HISTORY_KEY, next);
  return next;
}
