/**
 * Pure ranking + grouping for the navbar global search. No React, no DOM — the
 * heavy lifting lives here so it can be unit-tested in isolation
 * (`global-search.test.ts`).
 */

export type SearchEntryKind =
  | "note"
  | "board"
  | "chalkboard"
  | "notebook"
  | "project"
  | "event";

export interface SearchIndexEntry {
  id: string;
  kind: SearchEntryKind;
  title: string;
  /** Secondary line: parent board / project name, event date, etc. */
  subtitle?: string;
  /** Plain-text body (note / card content, HTML stripped) — matched, and shown as a snippet. */
  body?: string;
  /** Extra haystack text that is matched but not shown (tags, description). */
  keywords?: string;
  /** Route to navigate to when the entry is chosen. */
  to: string;
}

/** Order groups appear in the results panel. */
export const GROUP_ORDER: SearchEntryKind[] = [
  "note",
  "board",
  "chalkboard",
  "notebook",
  "project",
  "event",
];

export const GROUP_LABELS: Record<SearchEntryKind, string> = {
  note: "Notes & cards",
  board: "Boards",
  chalkboard: "Chalk boards",
  notebook: "Notebooks",
  project: "Projects",
  event: "Events",
};

export interface SearchGroup {
  kind: SearchEntryKind;
  label: string;
  /** Entries after the per-group cap. */
  entries: SearchIndexEntry[];
  /** Match count before the cap, for a "showing 5 of N" hint. */
  total: number;
}

export interface GroupedResults {
  groups: SearchGroup[];
  /** Total matches across all groups (pre-cap). */
  total: number;
}

const DEFAULT_LIMIT_PER_GROUP = 5;

const SCORE_TITLE_EXACT = 100;
const SCORE_TITLE_PREFIX = 60;
const SCORE_TITLE_WORD_PREFIX = 40;
const SCORE_TITLE_SUBSTRING = 25;
const SCORE_OTHER_SUBSTRING = 10;
const SCORE_BODY_SUBSTRING = 6;

const DEFAULT_SNIPPET_LEN = 140;

/** Lowercase, split on any non-alphanumeric run, drop empties. */
export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** True when every token appears somewhere in `text` (case-insensitive). */
export function matchesTokens(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const haystack = text.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

/**
 * Relevance score for an entry against pre-tokenized query terms.
 * Returns `null` when any token fails to match — those entries are dropped.
 */
export function scoreEntry(entry: SearchIndexEntry, tokens: string[]): number | null {
  if (tokens.length === 0) return null;

  const title = entry.title.toLowerCase();
  const titleWords = title.split(/\s+/).filter(Boolean);
  const body = (entry.body ?? "").toLowerCase();
  const meta = `${(entry.subtitle ?? "").toLowerCase()} ${(entry.keywords ?? "").toLowerCase()}`;
  const haystack = `${title} ${meta} ${body}`;

  let score = 0;
  for (const token of tokens) {
    if (!haystack.includes(token)) return null;

    if (title === token) score += SCORE_TITLE_EXACT;
    else if (title.startsWith(token)) score += SCORE_TITLE_PREFIX;
    else if (titleWords.some((word) => word.startsWith(token))) score += SCORE_TITLE_WORD_PREFIX;
    else if (title.includes(token)) score += SCORE_TITLE_SUBSTRING;
    else if (meta.includes(token)) score += SCORE_OTHER_SUBSTRING;
    else score += SCORE_BODY_SUBSTRING;
  }

  // Bonus when the whole query matches the title contiguously.
  const joined = tokens.join(" ");
  if (title === joined) score += SCORE_TITLE_EXACT;
  else if (title.startsWith(joined)) score += SCORE_TITLE_PREFIX;
  else if (title.includes(joined)) score += SCORE_TITLE_SUBSTRING;

  // Nudge shorter (more precise) titles ahead of long ones on ties.
  score += Math.max(0, 12 - title.length / 8);

  return score;
}

export interface SearchEntriesOptions {
  /** Restrict to a single entity kind (filter chips). */
  kind?: SearchEntryKind | null;
  limitPerGroup?: number;
}

/** Filter → score → sort → group entries for a query. */
export function searchEntries(
  entries: SearchIndexEntry[],
  query: string,
  opts: SearchEntriesOptions = {},
): GroupedResults {
  const tokens = tokenize(query);
  if (tokens.length === 0) return { groups: [], total: 0 };

  const limitPerGroup = opts.limitPerGroup ?? DEFAULT_LIMIT_PER_GROUP;

  const scored: Array<{ entry: SearchIndexEntry; score: number }> = [];
  for (const entry of entries) {
    if (opts.kind && entry.kind !== opts.kind) continue;
    const score = scoreEntry(entry, tokens);
    if (score !== null) scored.push({ entry, score });
  }

  scored.sort(
    (a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title),
  );

  const byKind = new Map<SearchEntryKind, SearchIndexEntry[]>();
  for (const { entry } of scored) {
    const list = byKind.get(entry.kind) ?? [];
    list.push(entry);
    byKind.set(entry.kind, list);
  }

  const groups: SearchGroup[] = [];
  let total = 0;
  for (const kind of GROUP_ORDER) {
    const list = byKind.get(kind);
    if (!list || list.length === 0) continue;
    total += list.length;
    groups.push({
      kind,
      label: GROUP_LABELS[kind],
      entries: list.slice(0, limitPerGroup),
      total: list.length,
    });
  }

  return { groups, total };
}

/**
 * A short excerpt of `text` centered on the first matching token, with leading /
 * trailing ellipses when it is clipped. Falls back to a head slice when nothing
 * matches (e.g. the hit was in the title).
 */
export function buildSnippet(
  text: string,
  tokens: string[],
  maxLen = DEFAULT_SNIPPET_LEN,
): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";

  const lower = clean.toLowerCase();
  let hit = -1;
  for (const token of tokens) {
    const at = lower.indexOf(token);
    if (at !== -1 && (hit === -1 || at < hit)) hit = at;
  }

  if (hit === -1) {
    return clean.length > maxLen ? `${clean.slice(0, maxLen).trimEnd()}…` : clean;
  }

  const start = Math.max(0, hit - Math.floor(maxLen / 3));
  const end = Math.min(clean.length, start + maxLen);
  let snippet = clean.slice(start, end).trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < clean.length) snippet = `${snippet}…`;
  return snippet;
}
