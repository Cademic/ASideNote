import type {
  BoardSummaryDto,
  NotebookSummaryDto,
  ProjectSummaryDto,
} from "./index";

/** The four top-level content types the Gallery lists. */
export type GalleryKind = "project" | "noteboard" | "chalkboard" | "notebook";

export type GalleryOwnership = "owned" | "shared" | "unknown";

export type GalleryProjectStatus = "Active" | "Completed" | "Archived";

/**
 * Normalized view model for one Gallery entry. Built from the three list DTOs by
 * `toGalleryItems` (`src/lib/gallery-item.ts`). `raw` is the original DTO, passed
 * straight through to the reused `ProjectCard` / `BoardCard` / `NotebookCard`.
 */
export interface GalleryItem {
  kind: GalleryKind;
  id: string;
  name: string;
  /** Detail-route target, e.g. `/boards/:id` or `/chalkboards/:id`. */
  to: string;
  createdAt: string;
  /** ISO. Projects fall back to `createdAt` — their summary DTO omits `updatedAt`. */
  updatedAt: string;
  isPinned: boolean;
  pinnedAt: string | null;
  /** Non-null only for `kind === "project"`. */
  projectStatus: GalleryProjectStatus | null;
  ownership: GalleryOwnership;
  /** `ownerUsername` for projects; `null` for boards / notebooks. */
  ownerLabel: string | null;
  /** `project.color`; `null` otherwise (grid tile then falls back to palette-by-id). */
  color: string | null;
  description: string | null;
  /** `boardCount` | `noteCount + indexCardCount` | `null`. */
  itemCount: number | null;
  /** Parent project id for boards / notebooks; `null` for projects and unfiled items. */
  projectId: string | null;
  /** Parent project name for boards / notebooks in a project; `null` otherwise. */
  projectName: string | null;
  raw: ProjectSummaryDto | BoardSummaryDto | NotebookSummaryDto;
}

export interface GalleryFilterState {
  /** Empty array = all kinds. */
  kinds: GalleryKind[];
  /** Empty array = all statuses. Only narrows `kind === "project"`. */
  projectStatuses: GalleryProjectStatus[];
  /** Empty array = any ownership. */
  ownership: Array<Exclude<GalleryOwnership, "unknown">>;
  pinnedOnly: boolean;
  /** `null` = any age. */
  recentWithinDays: 1 | 7 | 30 | null;
}

export type GallerySortKey =
  | "name"
  | "type"
  | "status"
  | "owner"
  | "modified"
  | "created"
  | "pinned";

export type GallerySortDir = "asc" | "desc";

export interface GallerySortState {
  key: GallerySortKey;
  dir: GallerySortDir;
}
