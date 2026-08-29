import type {
  BoardSummaryDto,
  IndexCardSummaryDto,
  NoteSummaryDto,
} from "../types";
import type { SearchIndexEntry } from "../lib/global-search";
import { getBoards } from "./boards";
import { getNotebooks } from "./notebooks";
import { getProjects } from "./projects";
import { getCalendarEvents } from "./calendar-events";
import { getNotes } from "./notes";
import { getIndexCards } from "./index-cards";

const LIST_LIMIT = 200;
const BOARD_ITEM_LIMIT = 100;
/** Fan out note/card title fetches over at most this many boards. */
const NOTE_FANOUT_BOARD_CAP = 12;
const NOTE_FANOUT_BATCH = 4;
const NOTE_TITLE_MAX_LEN = 80;
const NOTE_BODY_MAX_LEN = 400;

export interface FetchSearchIndexOptions {
  /** Include note & index-card titles via a capped per-board fan-out. Default true. */
  includeNoteTitles?: boolean;
}

/**
 * Builds the in-memory index the navbar search ranks against. Every source is
 * fetched best-effort — a failing endpoint drops its slice rather than the whole
 * index.
 */
export async function fetchSearchIndex(
  opts: FetchSearchIndexOptions = {},
): Promise<SearchIndexEntry[]> {
  const includeNoteTitles = opts.includeNoteTitles ?? true;

  const [boards, notebooks, projects, events] = await Promise.all([
    getBoards({ limit: LIST_LIMIT }).then((r) => r.items).catch(() => []),
    getNotebooks({ limit: LIST_LIMIT }).then((r) => r.items).catch(() => []),
    getProjects().catch(() => []),
    getCalendarEvents(calendarWindow()).catch(() => []),
  ]);

  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const entries: SearchIndexEntry[] = [];

  for (const board of boards) {
    const chalk = isChalkboard(board);
    entries.push({
      id: board.id,
      kind: chalk ? "chalkboard" : "board",
      title: board.name,
      subtitle:
        board.description?.trim() ||
        (board.projectId ? projectNameById.get(board.projectId) : undefined),
      to: chalk ? `/chalkboards/${board.id}` : `/boards/${board.id}`,
    });
  }

  for (const nb of notebooks) {
    entries.push({
      id: nb.id,
      kind: "notebook",
      title: nb.name,
      subtitle: nb.projectId ? projectNameById.get(nb.projectId) : undefined,
      to: `/notebooks/${nb.id}`,
    });
  }

  for (const project of projects) {
    entries.push({
      id: project.id,
      kind: "project",
      title: project.name,
      subtitle: project.description?.trim() || undefined,
      keywords: project.status,
      to: `/projects/${project.id}`,
    });
  }

  for (const event of events) {
    entries.push({
      id: event.id,
      kind: "event",
      title: event.title,
      subtitle: formatEventDate(event.startDate),
      keywords:
        [event.description ?? "", event.projectName ?? ""].join(" ").trim() || undefined,
      to: `/calendar?eventId=${encodeURIComponent(event.id)}`,
    });
  }

  if (includeNoteTitles && boards.length > 0) {
    entries.push(...(await fetchNoteTitleEntries(boards)));
  }

  return entries;
}

function isChalkboard(board: BoardSummaryDto): boolean {
  return board.boardType?.toLowerCase() === "chalkboard";
}

/** −1 year … +2 years, matching the deep-link range CalendarsPage uses. */
function calendarWindow(): Record<string, string> {
  const now = new Date();
  return {
    from: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString(),
    to: new Date(now.getFullYear() + 2, 11, 31).toISOString(),
  };
}

function formatEventDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function fetchNoteTitleEntries(
  boards: BoardSummaryDto[],
): Promise<SearchIndexEntry[]> {
  const targets = boards
    .filter((b) => !isChalkboard(b) && b.noteCount + b.indexCardCount > 0)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, NOTE_FANOUT_BOARD_CAP);

  const entries: SearchIndexEntry[] = [];
  for (let i = 0; i < targets.length; i += NOTE_FANOUT_BATCH) {
    const batch = targets.slice(i, i + NOTE_FANOUT_BATCH);
    const results = await Promise.all(
      batch.map((board) =>
        fetchBoardNoteEntries(board).catch(() => [] as SearchIndexEntry[]),
      ),
    );
    for (const result of results) entries.push(...result);
  }
  return entries;
}

async function fetchBoardNoteEntries(
  board: BoardSummaryDto,
): Promise<SearchIndexEntry[]> {
  const notes =
    board.noteCount > 0
      ? (await getNotes({ boardId: board.id, limit: BOARD_ITEM_LIMIT }).catch(() => null))
          ?.items ?? []
      : [];
  const cards =
    board.indexCardCount > 0
      ? (await getIndexCards({ boardId: board.id, limit: BOARD_ITEM_LIMIT }).catch(
          () => null,
        ))?.items ?? []
      : [];

  const toEntry = (item: NoteSummaryDto | IndexCardSummaryDto): SearchIndexEntry | null => {
    // Both title and content are rich text in this app — strip markup from each.
    const explicitTitle = htmlToPlainText(item.title ?? "");
    const body = htmlToPlainText(item.content ?? "");
    if (!explicitTitle && !body) return null; // nothing to match or show

    const title = explicitTitle || truncate(body, NOTE_TITLE_MAX_LEN) || "Untitled note";
    return {
      id: item.id,
      kind: "note",
      title,
      subtitle: `in ${board.name}`,
      body: body ? truncate(body, NOTE_BODY_MAX_LEN) : undefined,
      keywords: item.tags.map((t) => t.name).join(" ") || undefined,
      // Deep-link: open the board and focus/highlight this item.
      to: `/boards/${board.id}?focus=${encodeURIComponent(item.id)}`,
    };
  };

  return [...notes, ...cards]
    .map(toEntry)
    .filter((entry): entry is SearchIndexEntry => entry !== null);
}

/**
 * Turn note / index-card HTML content into plain text. Runs the decode-and-strip
 * pass twice so double-encoded content (stored as `&lt;p&gt;…`) also comes out
 * clean, then collapses whitespace.
 */
function htmlToPlainText(raw: string): string {
  if (!raw) return "";
  let text = raw;
  for (let pass = 0; pass < 2; pass++) {
    text =
      typeof document !== "undefined"
        ? new DOMParser().parseFromString(text, "text/html").body.textContent ?? ""
        : text.replace(/<[^>]*>/g, " ");
    if (!/[<>]/.test(text)) break;
  }
  return text.replace(/\s+/g, " ").trim();
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
