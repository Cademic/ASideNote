/**
 * Pure DTO → `GalleryItem` mapping for the unified Gallery page. No React, no
 * DOM — unit-tested in `gallery-filter.test.ts`.
 *
 * Ownership for boards / notebooks is derived from their parent project (their
 * summary DTOs carry no owner field): a board under a project the user owns is
 * "owned", under a shared project it is "shared", standalone resources are
 * "owned" (the list endpoints only return the caller's own standalone items),
 * and anything else is "unknown" (the filter treats "unknown" as "owned").
 */
import type {
  BoardSummaryDto,
  NotebookSummaryDto,
  ProjectSummaryDto,
} from "../types";
import type {
  GalleryItem,
  GalleryOwnership,
  GalleryProjectStatus,
} from "../types/gallery";

const PROJECT_STATUSES: GalleryProjectStatus[] = [
  "Active",
  "Completed",
  "Archived",
];

function normalizeStatus(status: string): GalleryProjectStatus | null {
  return PROJECT_STATUSES.find((candidate) => candidate === status) ?? null;
}

function isChalkboard(boardType: string): boolean {
  return boardType.toLowerCase() === "chalkboard";
}

function isProjectOwnedByUser(
  project: ProjectSummaryDto,
  currentUserId: string | null,
): boolean {
  return (
    (currentUserId != null && project.ownerId === currentUserId) ||
    project.userRole === "Owner"
  );
}

export interface ProjectLookup {
  owned: Set<string>;
  shared: Set<string>;
  nameById: Map<string, string>;
}

export function buildProjectLookup(
  projects: ProjectSummaryDto[],
  currentUserId: string | null,
): ProjectLookup {
  const owned = new Set<string>();
  const shared = new Set<string>();
  const nameById = new Map<string, string>();
  for (const project of projects) {
    (isProjectOwnedByUser(project, currentUserId) ? owned : shared).add(
      project.id,
    );
    nameById.set(project.id, project.name);
  }
  return { owned, shared, nameById };
}

function deriveOwnership(
  projectId: string | null | undefined,
  lookup: ProjectLookup,
): GalleryOwnership {
  if (projectId == null) return "owned";
  if (lookup.owned.has(projectId)) return "owned";
  if (lookup.shared.has(projectId)) return "shared";
  return "unknown";
}

export function projectToGalleryItem(
  project: ProjectSummaryDto,
  currentUserId: string | null,
): GalleryItem {
  return {
    kind: "project",
    id: project.id,
    name: project.name,
    to: `/projects/${project.id}`,
    createdAt: project.createdAt,
    // ProjectSummaryDto has no updatedAt — fall back to createdAt.
    updatedAt: project.createdAt,
    isPinned: project.isPinned ?? false,
    pinnedAt: project.pinnedAt ?? null,
    projectStatus: normalizeStatus(project.status),
    ownership: isProjectOwnedByUser(project, currentUserId) ? "owned" : "shared",
    ownerLabel: project.ownerUsername,
    color: project.color,
    description: project.description,
    itemCount: project.boardCount,
    projectId: null,
    projectName: null,
    raw: project,
  };
}

export function boardToGalleryItem(
  board: BoardSummaryDto,
  lookup: ProjectLookup,
): GalleryItem {
  const chalk = isChalkboard(board.boardType);
  const projectId = board.projectId ?? null;
  return {
    kind: chalk ? "chalkboard" : "noteboard",
    id: board.id,
    name: board.name,
    to: chalk ? `/chalkboards/${board.id}` : `/boards/${board.id}`,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
    isPinned: board.isPinned,
    pinnedAt: board.pinnedAt,
    projectStatus: null,
    ownership: deriveOwnership(projectId, lookup),
    ownerLabel: null,
    color: null,
    description: board.description,
    itemCount: board.noteCount + board.indexCardCount,
    projectId,
    projectName: projectId ? (lookup.nameById.get(projectId) ?? null) : null,
    raw: board,
  };
}

export function notebookToGalleryItem(
  notebook: NotebookSummaryDto,
  lookup: ProjectLookup,
): GalleryItem {
  const projectId = notebook.projectId ?? null;
  return {
    kind: "notebook",
    id: notebook.id,
    name: notebook.name,
    to: `/notebooks/${notebook.id}`,
    createdAt: notebook.createdAt,
    updatedAt: notebook.updatedAt,
    isPinned: notebook.isPinned,
    pinnedAt: notebook.pinnedAt,
    projectStatus: null,
    ownership: deriveOwnership(projectId, lookup),
    ownerLabel: null,
    color: null,
    description: null,
    itemCount: null,
    projectId,
    projectName: projectId ? (lookup.nameById.get(projectId) ?? null) : null,
    raw: notebook,
  };
}

export function toGalleryItems(
  projects: ProjectSummaryDto[],
  boards: BoardSummaryDto[],
  notebooks: NotebookSummaryDto[],
  currentUserId: string | null,
): GalleryItem[] {
  const lookup = buildProjectLookup(projects, currentUserId);
  return [
    ...projects.map((project) => projectToGalleryItem(project, currentUserId)),
    ...boards.map((board) => boardToGalleryItem(board, lookup)),
    ...notebooks.map((notebook) => notebookToGalleryItem(notebook, lookup)),
  ];
}
