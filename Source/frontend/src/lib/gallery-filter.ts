/**
 * Pure filter / sort / group logic for the unified Gallery page. No React, no
 * DOM — unit-tested in `gallery-filter.test.ts`.
 */
import type {
  GalleryFilterState,
  GalleryItem,
  GalleryKind,
  GallerySortDir,
  GallerySortKey,
} from "../types/gallery";

export const GALLERY_KIND_ORDER: GalleryKind[] = [
  "project",
  "noteboard",
  "chalkboard",
  "notebook",
];

/** Plural section headings (grid view). */
export const GALLERY_KIND_LABELS: Record<GalleryKind, string> = {
  project: "Projects",
  noteboard: "Noteboards",
  chalkboard: "Chalkboards",
  notebook: "Notebooks",
};

/** Singular labels (list "Type" column). */
export const GALLERY_KIND_LABELS_SINGULAR: Record<GalleryKind, string> = {
  project: "Project",
  noteboard: "Noteboard",
  chalkboard: "Chalkboard",
  notebook: "Notebook",
};

const DAY_MS = 86_400_000;

const STATUS_SORT_ORDER: Record<string, number> = {
  Active: 0,
  Completed: 1,
  Archived: 2,
};
const STATUS_SORT_FALLBACK = 3;

/** "unknown" ownership is treated as "owned" for filtering + sorting. */
function effectiveOwnership(item: GalleryItem): "owned" | "shared" {
  return item.ownership === "shared" ? "shared" : "owned";
}

/** Apply every active facet (AND-combined). Empty facet = pass-through. */
export function filterGalleryItems(
  items: GalleryItem[],
  filters: GalleryFilterState,
  now: number = Date.now(),
): GalleryItem[] {
  return items.filter((item) => {
    if (filters.kinds.length > 0 && !filters.kinds.includes(item.kind)) {
      return false;
    }

    // Status only narrows projects; other kinds always pass this facet.
    if (
      filters.projectStatuses.length > 0 &&
      item.kind === "project" &&
      (item.projectStatus == null ||
        !filters.projectStatuses.includes(item.projectStatus))
    ) {
      return false;
    }

    if (
      filters.ownership.length > 0 &&
      !filters.ownership.includes(effectiveOwnership(item))
    ) {
      return false;
    }

    if (filters.pinnedOnly && !item.isPinned) {
      return false;
    }

    if (filters.recentWithinDays != null) {
      const timestamp = Date.parse(item.updatedAt);
      if (
        Number.isNaN(timestamp) ||
        now - timestamp > filters.recentWithinDays * DAY_MS
      ) {
        return false;
      }
    }

    return true;
  });
}

function ownerSortValue(item: GalleryItem): string {
  return effectiveOwnership(item) === "owned" ? "Me" : (item.ownerLabel ?? "");
}

function statusSortValue(item: GalleryItem): number {
  if (item.projectStatus == null) return STATUS_SORT_FALLBACK;
  return STATUS_SORT_ORDER[item.projectStatus] ?? STATUS_SORT_FALLBACK;
}

function compareBySortKey(
  a: GalleryItem,
  b: GalleryItem,
  key: GallerySortKey,
): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    case "type":
      return (
        GALLERY_KIND_ORDER.indexOf(a.kind) - GALLERY_KIND_ORDER.indexOf(b.kind)
      );
    case "status":
      return statusSortValue(a) - statusSortValue(b);
    case "owner":
      return ownerSortValue(a).localeCompare(ownerSortValue(b), undefined, {
        sensitivity: "base",
      });
    case "modified":
      return (Date.parse(a.updatedAt) || 0) - (Date.parse(b.updatedAt) || 0);
    case "created":
      return (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0);
    case "pinned":
      return Number(a.isPinned) - Number(b.isPinned);
    default:
      return 0;
  }
}

/** Stable sort: primary key (directional), then name, then id. */
export function sortGalleryItems(
  items: GalleryItem[],
  key: GallerySortKey,
  dir: GallerySortDir,
): GalleryItem[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const primary = compareBySortKey(a, b, key) * factor;
    if (primary !== 0) return primary;
    const byName = a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
    });
    if (byName !== 0) return byName;
    return a.id.localeCompare(b.id);
  });
}

export interface GalleryGroup {
  kind: GalleryKind;
  label: string;
  items: GalleryItem[];
}

/**
 * Bucket items by kind in `GALLERY_KIND_ORDER`, dropping empty kinds. Within a
 * group: pinned first, then most-recently-updated first (grid is not
 * column-sortable in v1).
 */
export function groupGalleryItemsByKind(items: GalleryItem[]): GalleryGroup[] {
  const byKind = new Map<GalleryKind, GalleryItem[]>();
  for (const item of items) {
    const list = byKind.get(item.kind) ?? [];
    list.push(item);
    byKind.set(item.kind, list);
  }

  const groups: GalleryGroup[] = [];
  for (const kind of GALLERY_KIND_ORDER) {
    const list = byKind.get(kind);
    if (!list || list.length === 0) continue;
    list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0);
    });
    groups.push({ kind, label: GALLERY_KIND_LABELS[kind], items: list });
  }
  return groups;
}
