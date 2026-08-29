import type { SearchIndexEntry } from "./global-search";

/**
 * Recently-typed queries and recently-opened results for the navbar search,
 * persisted per-browser. Every access is guarded so a blocked or full
 * localStorage (private windows, quota) degrades to "no history" rather than
 * throwing.
 */

const STORAGE_KEY = "asidenote.search.recents";
const MAX_QUERIES = 5;
const MAX_ENTRIES = 8;

export type RecentItem =
  | { type: "query"; text: string }
  | { type: "entry"; entry: SearchIndexEntry };

interface RecentsShape {
  queries: string[];
  entries: SearchIndexEntry[];
}

const EMPTY: RecentsShape = { queries: [], entries: [] };

function read(): RecentsShape {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<RecentsShape>;
    return {
      queries: Array.isArray(parsed.queries) ? parsed.queries.filter((q) => typeof q === "string") : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries.filter(isEntry) : [],
    };
  } catch {
    return EMPTY;
  }
}

function write(next: RecentsShape): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — history is best-effort */
  }
}

function isEntry(value: unknown): value is SearchIndexEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === "string" && typeof entry.kind === "string" && typeof entry.to === "string";
}

/** Newest first, queries then entries interleaved by their own recency. */
export function getRecents(): RecentItem[] {
  const { queries, entries } = read();
  return [
    ...queries.map((text): RecentItem => ({ type: "query", text })),
    ...entries.map((entry): RecentItem => ({ type: "entry", entry })),
  ];
}

export function pushRecentQuery(text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  const current = read();
  const queries = [
    trimmed,
    ...current.queries.filter((q) => q.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_QUERIES);
  write({ ...current, queries });
}

export function pushRecentEntry(entry: SearchIndexEntry): void {
  const current = read();
  const entries = [
    entry,
    ...current.entries.filter((e) => !(e.kind === entry.kind && e.id === entry.id)),
  ].slice(0, MAX_ENTRIES);
  write({ ...current, entries });
}

/** Drop a single recent query or entry. */
export function removeRecent(item: RecentItem): void {
  const current = read();
  if (item.type === "query") {
    write({
      ...current,
      queries: current.queries.filter(
        (q) => q.toLowerCase() !== item.text.toLowerCase(),
      ),
    });
  } else {
    write({
      ...current,
      entries: current.entries.filter(
        (e) => !(e.kind === item.entry.kind && e.id === item.entry.id),
      ),
    });
  }
}

export function clearRecents(): void {
  write(EMPTY);
}
