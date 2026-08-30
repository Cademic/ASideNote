/**
 * localStorage-backed Gallery UI preferences: view mode, filter facets, sort.
 * Every read is wrapped so a private window / disabled storage / malformed value
 * falls back to a sane default. Keys use the `asidenote.*` prefix to match the
 * other persistent UI state (`asidenote.theme`, `asidenote.sidebar.*`).
 */
import type {
  GalleryFilterState,
  GalleryKind,
  GalleryProjectStatus,
  GallerySortDir,
  GallerySortKey,
  GallerySortState,
} from "../types/gallery";

export type GalleryViewMode = "grid" | "list";

export const GALLERY_VIEWMODE_KEY = "asidenote.gallery.viewMode";
export const GALLERY_FILTERS_KEY = "asidenote.gallery.filters";
export const GALLERY_SORT_KEY = "asidenote.gallery.sort";

export const DEFAULT_VIEWMODE: GalleryViewMode = "grid";

const ALL_KINDS: GalleryKind[] = [
  "project",
  "noteboard",
  "chalkboard",
  "notebook",
];
const ALL_STATUSES: GalleryProjectStatus[] = [
  "Active",
  "Completed",
  "Archived",
];
const ALL_OWNERSHIP: Array<"owned" | "shared"> = ["owned", "shared"];
const RECENT_WINDOWS = [1, 7, 30] as const;

/**
 * Default = every checkbox ticked. Filtering only narrows once a facet becomes a
 * non-empty *proper subset* of its options, so the fully-selected default reads
 * as "no filter applied" (see `activeFilterCount` / `isDefaultFilterState`).
 */
export const DEFAULT_FILTERS: GalleryFilterState = {
  kinds: [...ALL_KINDS],
  projectStatuses: [...ALL_STATUSES],
  ownership: [...ALL_OWNERSHIP],
  pinnedOnly: false,
  recentWithinDays: null,
};

export const DEFAULT_SORT: GallerySortState = { key: "modified", dir: "desc" };
const ALL_SORT_KEYS: GallerySortKey[] = [
  "name",
  "type",
  "status",
  "owner",
  "modified",
  "created",
  "pinned",
];
const ALL_SORT_DIRS: GallerySortDir[] = ["asc", "desc"];

/** Keep only known options, in canonical order (also dedupes). */
function keepKnown<T>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value)) return [];
  return allowed.filter((option) => value.includes(option));
}

/** A present array is sanitised; a missing key falls back to "all selected". */
function facet<T>(
  value: unknown,
  allowed: readonly T[],
  fallback: readonly T[],
): T[] {
  if (value === undefined) return [...fallback];
  return keepKnown(value, allowed);
}

export function validateFilterState(raw: unknown): GalleryFilterState {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ...DEFAULT_FILTERS };
  }
  const obj = raw as Record<string, unknown>;
  const recent =
    RECENT_WINDOWS.find((window) => window === obj.recentWithinDays) ?? null;
  return {
    kinds: facet(obj.kinds, ALL_KINDS, DEFAULT_FILTERS.kinds),
    projectStatuses: facet(
      obj.projectStatuses,
      ALL_STATUSES,
      DEFAULT_FILTERS.projectStatuses,
    ),
    ownership: facet(obj.ownership, ALL_OWNERSHIP, DEFAULT_FILTERS.ownership),
    pinnedOnly: obj.pinnedOnly === true,
    recentWithinDays: recent,
  };
}

export function validateSort(raw: unknown): GallerySortState {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ...DEFAULT_SORT };
  }
  const obj = raw as Record<string, unknown>;
  const key = ALL_SORT_KEYS.find((candidate) => candidate === obj.key);
  const dir = ALL_SORT_DIRS.find((candidate) => candidate === obj.dir);
  if (!key || !dir) return { ...DEFAULT_SORT };
  return { key, dir };
}

/** True when every facet is at its default (all options selected, no toggles). */
export function isDefaultFilterState(filters: GalleryFilterState): boolean {
  return (
    filters.kinds.length === ALL_KINDS.length &&
    filters.projectStatuses.length === ALL_STATUSES.length &&
    filters.ownership.length === ALL_OWNERSHIP.length &&
    !filters.pinnedOnly &&
    filters.recentWithinDays === null
  );
}

/** A multi-select facet narrows only when it is a non-empty proper subset. */
function isSubsetNarrowing(selected: unknown[], total: number): boolean {
  return selected.length > 0 && selected.length < total;
}

/** True when a status / ownership / pinned / recent facet is narrowing results. */
export function hasNonTypeNarrowing(filters: GalleryFilterState): boolean {
  return (
    filters.pinnedOnly ||
    filters.recentWithinDays !== null ||
    isSubsetNarrowing(filters.projectStatuses, ALL_STATUSES.length) ||
    isSubsetNarrowing(filters.ownership, ALL_OWNERSHIP.length)
  );
}

/** Count of narrowing facet groups — drives the Filter button badge. */
export function activeFilterCount(filters: GalleryFilterState): number {
  let count = 0;
  if (isSubsetNarrowing(filters.kinds, ALL_KINDS.length)) count += 1;
  if (isSubsetNarrowing(filters.projectStatuses, ALL_STATUSES.length)) count += 1;
  if (isSubsetNarrowing(filters.ownership, ALL_OWNERSHIP.length)) count += 1;
  if (filters.pinnedOnly) count += 1;
  if (filters.recentWithinDays !== null) count += 1;
  return count;
}

export function readViewMode(): GalleryViewMode {
  try {
    const stored = window.localStorage.getItem(GALLERY_VIEWMODE_KEY);
    return stored === "grid" || stored === "list" ? stored : DEFAULT_VIEWMODE;
  } catch {
    return DEFAULT_VIEWMODE;
  }
}

export function writeViewMode(mode: GalleryViewMode): void {
  try {
    window.localStorage.setItem(GALLERY_VIEWMODE_KEY, mode);
  } catch {
    // ignore — private mode / storage disabled
  }
}

export function readFilters(): GalleryFilterState {
  try {
    const stored = window.localStorage.getItem(GALLERY_FILTERS_KEY);
    if (!stored) return { ...DEFAULT_FILTERS };
    return validateFilterState(JSON.parse(stored));
  } catch {
    return { ...DEFAULT_FILTERS };
  }
}

export function writeFilters(filters: GalleryFilterState): void {
  try {
    window.localStorage.setItem(GALLERY_FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // ignore
  }
}

export function readSort(): GallerySortState {
  try {
    const stored = window.localStorage.getItem(GALLERY_SORT_KEY);
    if (!stored) return { ...DEFAULT_SORT };
    return validateSort(JSON.parse(stored));
  } catch {
    return { ...DEFAULT_SORT };
  }
}

export function writeSort(sort: GallerySortState): void {
  try {
    window.localStorage.setItem(GALLERY_SORT_KEY, JSON.stringify(sort));
  } catch {
    // ignore
  }
}
