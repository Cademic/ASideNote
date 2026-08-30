import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Folder, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { RenameInput } from "../../ui/RenameInput";
import type {
  BoardSummaryDto,
  NotebookSummaryDto,
  ProjectFolderDto,
  ProjectSummaryDto,
} from "../../../types";
import { updateProject, updateProjectFolder } from "../../../api/projects";
import { updateBoard } from "../../../api/boards";
import { updateNotebook } from "../../../api/notebooks";
import { ProjectCard } from "../../projects/ProjectCard";
import { BoardCard } from "../BoardCard";
import { NotebookCard } from "../../notebooks/NotebookCard";
import {
  PROJECT_ITEM_DRAG_MIME,
  getProjectItemDragPayload,
  setProjectItemDragData,
  type ProjectItemDragPayload,
} from "../../projects/projectItemDrag";
import { useProjectsTreeActions } from "./useProjectsTreeActions";

interface ProjectsTreeProps {
  projects: ProjectSummaryDto[];
  folders: ProjectFolderDto[];
  boards: BoardSummaryDto[];
  notebooks: NotebookSummaryDto[];
  onOpenNotebook: (id: string) => void;
  /** Re-fetch the dashboard workspace after a rename / delete / move. */
  onWorkspaceChanged: () => void | Promise<void>;
}

const INDENT = 14;

type RenameKind = "project" | "folder" | "board" | "notebook";

function hasProjectItem(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes(PROJECT_ITEM_DRAG_MIME);
}

/** Plain wrapper that makes its child a project-item drag source. */
function DragItem({
  payload,
  disabled,
  children,
}: {
  payload: ProjectItemDragPayload;
  disabled?: boolean;
  children: ReactNode;
}) {
  if (disabled) return <>{children}</>;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        setProjectItemDragData(e, payload);
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

/** Highlights while a project item is dragged over; forwards the dropped payload. */
function TreeDropZone({
  dropId,
  highlightId,
  setHighlightId,
  disabled,
  onDropItem,
  className,
  children,
}: {
  dropId: string;
  highlightId: string | null;
  setHighlightId: (id: string | null) => void;
  disabled?: boolean;
  onDropItem: (payload: ProjectItemDragPayload) => void;
  className?: string;
  children: ReactNode;
}) {
  const active = !disabled && highlightId === dropId;
  return (
    <div
      className={[
        "rounded-md transition-colors motion-reduce:transition-none",
        active ? "bg-[var(--land-blue)]/10 ring-1 ring-inset ring-[var(--land-blue)]/40" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDragOver={(e) => {
        if (disabled || !hasProjectItem(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setHighlightId(dropId);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setHighlightId(null);
        }
      }}
      onDrop={(e) => {
        setHighlightId(null);
        if (disabled) return;
        const payload = getProjectItemDragPayload(e);
        if (!payload) return;
        e.preventDefault();
        e.stopPropagation();
        onDropItem(payload);
      }}
    >
      {children}
    </div>
  );
}

export function ProjectsTree({
  projects,
  folders,
  boards,
  notebooks,
  onOpenNotebook,
  onWorkspaceChanged,
}: ProjectsTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<{ kind: RenameKind; id: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [dropHighlight, setDropHighlight] = useState<string | null>(null);
  const [folderMenu, setFolderMenu] = useState<{ folder: ProjectFolderDto; x: number; y: number } | null>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);

  const actions = useProjectsTreeActions({ projects, boards, notebooks, onChanged: onWorkspaceChanged });

  useEffect(() => {
    if (!folderMenu) return;
    function onDown(e: MouseEvent) {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) setFolderMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFolderMenu(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [folderMenu]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  function startRename(kind: RenameKind, id: string, currentName: string) {
    setRenaming({ kind, id });
    setDraft(currentName);
  }
  function cancelRename() {
    setRenaming(null);
    setDraft("");
  }
  async function submitRename() {
    if (!renaming) return;
    const { kind, id } = renaming;
    const name = draft.trim();
    setRenaming(null);
    if (!name) return;
    try {
      if (kind === "project") {
        const p = projects.find((x) => x.id === id);
        if (p && name !== p.name) {
          await updateProject(id, {
            name,
            description: p.description ?? undefined,
            startDate: p.startDate ?? undefined,
            endDate: p.endDate ?? undefined,
            deadline: p.deadline ?? undefined,
            status: p.status,
            progress: p.progress,
            color: p.color,
          });
        }
      } else if (kind === "folder") {
        const f = folders.find((x) => x.id === id);
        if (f && name !== f.name) await updateProjectFolder(f.projectId, id, { name });
      } else if (kind === "board") {
        const b = boards.find((x) => x.id === id);
        if (b && name !== b.name) await updateBoard(id, { name });
      } else {
        const n = notebooks.find((x) => x.id === id);
        if (n && name !== n.name) await updateNotebook(id, { name });
      }
    } finally {
      void onWorkspaceChanged();
    }
  }

  const isRenaming = (kind: RenameKind, id: string) =>
    renaming?.kind === kind && renaming.id === id;

  function renderBoardLeaf(board: BoardSummaryDto, depth: number, canEdit: boolean) {
    const projectFolders = folders
      .filter((f) => f.projectId === board.projectId)
      .map((f) => ({ id: f.id, name: f.name }));
    return (
      <div key={`board:${board.id}`} style={{ paddingLeft: depth * INDENT }} className="flex items-center">
        <span className="w-5 shrink-0" aria-hidden />
        {isRenaming("board", board.id) ? (
          <RenameInput value={draft} onChange={setDraft} onSubmit={submitRename} onCancel={cancelRename} />
        ) : (
          <div className="min-w-0 flex-1">
            <DragItem
              payload={{ kind: "board", id: board.id, sourceProjectId: board.projectId ?? null }}
              disabled={!canEdit}
            >
              <BoardCard
                layout="sidebarRow"
                board={board}
                {...actions.boardCardProps}
                projectFolders={projectFolders}
                onSetProjectFolder={canEdit ? actions.setBoardFolder : undefined}
                onRename={canEdit ? (id, name) => startRename("board", id, name) : undefined}
              />
            </DragItem>
          </div>
        )}
      </div>
    );
  }

  function renderNotebookLeaf(nb: NotebookSummaryDto, depth: number, canEdit: boolean) {
    const projectFolders = folders
      .filter((f) => f.projectId === nb.projectId)
      .map((f) => ({ id: f.id, name: f.name }));
    return (
      <div key={`notebook:${nb.id}`} style={{ paddingLeft: depth * INDENT }} className="flex items-center">
        <span className="w-5 shrink-0" aria-hidden />
        {isRenaming("notebook", nb.id) ? (
          <RenameInput value={draft} onChange={setDraft} onSubmit={submitRename} onCancel={cancelRename} />
        ) : (
          <div className="min-w-0 flex-1">
            <DragItem
              payload={{ kind: "notebook", id: nb.id, sourceProjectId: nb.projectId ?? null }}
              disabled={!canEdit}
            >
              <NotebookCard
                layout="sidebarRow"
                notebook={nb}
                onOpen={onOpenNotebook}
                {...actions.notebookCardProps}
                projectFolders={projectFolders}
                onSetProjectFolder={canEdit ? actions.setNotebookFolder : undefined}
                onRename={canEdit ? (id, name) => startRename("notebook", id, name) : undefined}
              />
            </DragItem>
          </div>
        )}
      </div>
    );
  }

  function renderFolder(folder: ProjectFolderDto, canEdit: boolean) {
    const folderKey = `folder:${folder.id}`;
    const open = expanded.has(folderKey);
    const folderBoards = boards.filter((b) => b.projectFolderId === folder.id);
    const folderNotebooks = notebooks.filter((n) => n.projectFolderId === folder.id);
    const count = folderBoards.length + folderNotebooks.length;

    return (
      <div key={folder.id}>
        <TreeDropZone
          dropId={folderKey}
          highlightId={dropHighlight}
          setHighlightId={setDropHighlight}
          disabled={!canEdit}
          onDropItem={(payload) => {
            if (payload.kind === "folder") {
              void actions.handleDrop(payload, {
                type: "folder-reorder",
                projectId: folder.projectId,
                folderSortOrder: folder.sortOrder,
              });
            } else {
              void actions.handleDrop(payload, {
                type: "folder",
                projectId: folder.projectId,
                folderId: folder.id,
              });
            }
          }}
        >
          {isRenaming("folder", folder.id) ? (
            <div className="flex items-center" style={{ paddingLeft: INDENT }}>
              <span className="w-5 shrink-0" aria-hidden />
              <RenameInput value={draft} onChange={setDraft} onSubmit={submitRename} onCancel={cancelRename} />
            </div>
          ) : (
            <DragItem
              payload={{ kind: "folder", id: folder.id, sourceProjectId: folder.projectId }}
              disabled={!canEdit}
            >
              <div
                className="group flex items-center rounded-lg text-sm text-[var(--land-ink-2)] transition-colors duration-150 hover:bg-[var(--land-cream)] hover:text-[var(--land-ink)] motion-reduce:transition-none"
                style={{ paddingLeft: INDENT }}
                onContextMenu={(e) => {
                  if (!canEdit) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setFolderMenu({ folder, x: e.clientX, y: e.clientY });
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(folderKey)}
                  className="flex h-6 w-5 shrink-0 items-center justify-center text-[var(--land-ink-3)]"
                  aria-label={open ? "Collapse folder" : "Expand folder"}
                >
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => toggle(folderKey)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 py-1 pr-1 text-left"
                >
                  <Folder className="h-3.5 w-3.5 shrink-0 text-[var(--land-ink-3)]" aria-hidden />
                  <span className="min-w-0 max-w-full truncate">{folder.name}</span>
                  <span className="shrink-0 text-xs text-[var(--land-ink-3)]">({count})</span>
                </button>
                {canEdit && (
                  <button
                    type="button"
                    title="Folder actions"
                    aria-haspopup="menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setFolderMenu({ folder, x: r.right, y: r.bottom });
                    }}
                    className="mr-1 shrink-0 rounded p-1 text-[var(--land-ink-3)] opacity-0 transition-opacity hover:bg-[var(--land-cream)] hover:text-[var(--land-ink)] group-hover:opacity-100 motion-reduce:transition-none"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </DragItem>
          )}
        </TreeDropZone>

        {open && !isRenaming("folder", folder.id) && (
          <div className="flex flex-col">
            {folderBoards.map((b) => renderBoardLeaf(b, 2, canEdit))}
            {folderNotebooks.map((n) => renderNotebookLeaf(n, 2, canEdit))}
            {count === 0 && (
              <div
                className="py-1 text-xs italic text-[var(--land-ink-3)]"
                style={{ paddingLeft: 2 * INDENT + 20 }}
              >
                empty
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (projects.length === 0) {
    return <p className="px-3 py-3 text-sm text-[var(--land-ink-3)]">No active projects yet.</p>;
  }

  return (
    <div className="flex flex-col">
      {projects.map((project) => {
        const projKey = `project:${project.id}`;
        const projOpen = expanded.has(projKey);
        const canEdit = project.userRole !== "Viewer";
        const projFolders = folders
          .filter((f) => f.projectId === project.id)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
        const projBoards = boards.filter((b) => b.projectId === project.id);
        const projNotebooks = notebooks.filter((n) => n.projectId === project.id);
        const looseBoards = projBoards.filter((b) => !b.projectFolderId);
        const looseNotebooks = projNotebooks.filter((n) => !n.projectFolderId);

        return (
          <div key={project.id}>
            <TreeDropZone
              dropId={projKey}
              highlightId={dropHighlight}
              setHighlightId={setDropHighlight}
              disabled={!canEdit}
              onDropItem={(payload) =>
                void actions.handleDrop(payload, { type: "project-root", projectId: project.id })
              }
            >
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => toggle(projKey)}
                  className="flex h-6 w-5 shrink-0 items-center justify-center text-[var(--land-ink-3)]"
                  aria-label={projOpen ? "Collapse project" : "Expand project"}
                >
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${projOpen ? "rotate-90" : ""}`}
                  />
                </button>
                {isRenaming("project", project.id) ? (
                  <RenameInput
                    value={draft}
                    onChange={setDraft}
                    onSubmit={submitRename}
                    onCancel={cancelRename}
                  />
                ) : (
                  <div className="min-w-0 flex-1">
                    <ProjectCard
                      layout="sidebarRow"
                      project={project}
                      {...actions.projectCardProps}
                      onRename={(id, name) => startRename("project", id, name)}
                    />
                  </div>
                )}
              </div>
            </TreeDropZone>

            {projOpen && (
              <div className="flex flex-col">
                {projFolders.map((folder) => renderFolder(folder, canEdit))}
                {looseBoards.map((board) => renderBoardLeaf(board, 1, canEdit))}
                {looseNotebooks.map((nb) => renderNotebookLeaf(nb, 1, canEdit))}
                {projFolders.length === 0 &&
                  looseBoards.length === 0 &&
                  looseNotebooks.length === 0 && (
                    <div
                      className="py-1 text-xs italic text-[var(--land-ink-3)]"
                      style={{ paddingLeft: INDENT + 20 }}
                    >
                      no boards or notebooks
                    </div>
                  )}
              </div>
            )}
          </div>
        );
      })}

      {folderMenu &&
        createPortal(
          <div
            ref={folderMenuRef}
            className="fixed z-[100] w-44 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-border bg-background py-1 shadow-lg"
            style={{ left: folderMenu.x, top: folderMenu.y }}
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
              onClick={() => {
                const f = folderMenu.folder;
                setFolderMenu(null);
                startRename("folder", f.id, f.name);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={() => {
                const f = folderMenu.folder;
                setFolderMenu(null);
                actions.requestDeleteFolder(f);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete folder
            </button>
          </div>,
          document.body,
        )}

      {actions.dialogs}
    </div>
  );
}
