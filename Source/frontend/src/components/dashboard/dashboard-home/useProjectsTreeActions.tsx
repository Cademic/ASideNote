import { useState } from "react";
import {
  addBoardToProject,
  addNotebookToProject,
  deleteProject,
  deleteProjectFolder,
  leaveProject,
  removeBoardFromProject,
  removeNotebookFromProject,
  setBoardProjectFolder,
  setNotebookProjectFolder,
  toggleProjectPin,
  updateProjectFolder,
} from "../../../api/projects";
import { deleteBoard, toggleBoardPin } from "../../../api/boards";
import { deleteNotebook, toggleNotebookPin } from "../../../api/notebooks";
import type {
  BoardSummaryDto,
  NotebookSummaryDto,
  ProjectFolderDto,
  ProjectSummaryDto,
} from "../../../types";
import { ConfirmDialog } from "../ConfirmDialog";
import type { ProjectItemDragPayload } from "../../projects/projectItemDrag";

interface UseProjectsTreeActionsParams {
  /** All of the user's active projects — feeds the "Move to project" flyout and role checks. */
  projects: ProjectSummaryDto[];
  boards: BoardSummaryDto[];
  notebooks: NotebookSummaryDto[];
  /** Re-fetch the dashboard workspace after any mutation. */
  onChanged: () => void | Promise<void>;
}

/** Where a dragged item was dropped. */
export type ProjectsTreeDropTarget =
  | { type: "project-root"; projectId: string }
  | { type: "folder"; projectId: string; folderId: string }
  | { type: "folder-reorder"; projectId: string; folderSortOrder: number };

/**
 * Mutations for the dashboard Projects tree: pin, delete (with confirm), and drag/drop
 * moves. Inline rename is owned by the tree. Modeled on `useSidebarWorkspaceActions`
 * but driven off already-loaded data + an `onChanged` refetch rather than its own state.
 */
export function useProjectsTreeActions({
  projects,
  boards,
  notebooks,
  onChanged,
}: UseProjectsTreeActionsParams) {
  const [boardDeleteTarget, setBoardDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [notebookDeleteTarget, setNotebookDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<{ id: string; name: string; projectId: string } | null>(null);
  const [projectDeleteTarget, setProjectDeleteTarget] = useState<ProjectSummaryDto | null>(null);
  const [projectLeaveTarget, setProjectLeaveTarget] = useState<ProjectSummaryDto | null>(null);

  const refresh = () => void onChanged();

  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
    } finally {
      refresh();
    }
  }

  // --- Pin -------------------------------------------------------------------

  const handleToggleProjectPin = (id: string, isPinned: boolean) => run(() => toggleProjectPin(id, isPinned));
  const handleToggleBoardPin = (id: string, isPinned: boolean) => run(() => toggleBoardPin(id, isPinned));
  const handleToggleNotebookPin = (id: string, isPinned: boolean) => run(() => toggleNotebookPin(id, isPinned));

  // --- Delete / leave (confirm first) --------------------------------------

  function requestDeleteBoard(id: string) {
    setBoardDeleteTarget({ id, name: boards.find((b) => b.id === id)?.name ?? "this board" });
  }
  function requestDeleteNotebook(id: string) {
    setNotebookDeleteTarget({ id, name: notebooks.find((n) => n.id === id)?.name ?? "this notebook" });
  }
  function requestDeleteFolder(folder: ProjectFolderDto) {
    setFolderDeleteTarget({ id: folder.id, name: folder.name, projectId: folder.projectId });
  }
  function requestDeleteProject(id: string) {
    const project = projects.find((p) => p.id === id) ?? null;
    if (project) setProjectDeleteTarget(project);
  }
  function requestLeaveProject(id: string) {
    const project = projects.find((p) => p.id === id) ?? null;
    if (project) setProjectLeaveTarget(project);
  }

  // --- Drag / drop ------------------------------------------------------

  async function handleDrop(payload: ProjectItemDragPayload, target: ProjectsTreeDropTarget) {
    if (payload.kind === "folder") {
      if (
        target.type === "project-root" &&
        payload.sourceProjectId &&
        payload.sourceProjectId !== target.projectId
      ) {
        await run(() =>
          updateProjectFolder(payload.sourceProjectId!, payload.id, { targetProjectId: target.projectId }),
        );
      } else if (target.type === "folder-reorder" && payload.sourceProjectId === target.projectId) {
        await run(() =>
          updateProjectFolder(target.projectId, payload.id, { sortOrder: target.folderSortOrder }),
        );
      }
      return;
    }

    if (target.type === "folder-reorder") return; // only folders reorder
    const projectId = target.projectId;
    const folderId = target.type === "folder" ? target.folderId : null;
    const sameProject = payload.sourceProjectId === projectId;

    if (payload.kind === "board") {
      await run(async () => {
        if (!sameProject) await addBoardToProject(projectId, payload.id);
        await setBoardProjectFolder(projectId, payload.id, { folderId });
      });
    } else {
      await run(async () => {
        if (!sameProject) await addNotebookToProject(projectId, payload.id);
        await setNotebookProjectFolder(projectId, payload.id, { folderId });
      });
    }
  }

  // --- Board/notebook "Move to project" / "Add to folder" menu actions ---

  async function handleMoveBoardToProject(boardId: string, projectId: string, folderId?: string) {
    await moveItem("board", boardId, boards.find((b) => b.id === boardId)?.projectId ?? null, projectId, folderId);
  }
  async function handleAddNotebookToProject(notebookId: string, projectId: string, folderId?: string) {
    await moveItem("notebook", notebookId, notebooks.find((n) => n.id === notebookId)?.projectId ?? null, projectId, folderId);
  }

  /** "Add to folder" / "Remove from folder" within the item's current project. */
  const setBoardFolder = (boardId: string, folderId: string | null) => {
    const pid = boards.find((b) => b.id === boardId)?.projectId;
    if (pid) void run(() => setBoardProjectFolder(pid, boardId, { folderId }));
  };
  const setNotebookFolder = (notebookId: string, folderId: string | null) => {
    const pid = notebooks.find((n) => n.id === notebookId)?.projectId;
    if (pid) void run(() => setNotebookProjectFolder(pid, notebookId, { folderId }));
  };

  async function moveItem(
    kind: "board" | "notebook",
    id: string,
    currentProjectId: string | null,
    projectId: string,
    folderId?: string,
  ) {
    const add = kind === "board" ? addBoardToProject : addNotebookToProject;
    const remove = kind === "board" ? removeBoardFromProject : removeNotebookFromProject;
    const setFolder = kind === "board" ? setBoardProjectFolder : setNotebookProjectFolder;

    // Picking the current project row with no folder = unlink from the project.
    if (folderId === undefined && currentProjectId === projectId) {
      await run(() => remove(projectId, id));
      return;
    }
    await run(async () => {
      if (currentProjectId !== projectId) await add(projectId, id);
      await setFolder(projectId, id, { folderId: folderId ?? null });
    });
  }

  // --- Card prop bundles (onRename is added by the tree) ----------------

  const projectCardProps = {
    onTogglePin: handleToggleProjectPin,
    onDelete: requestDeleteProject,
    onLeave: requestLeaveProject,
    onProjectUpdated: refresh,
  };
  const boardCardProps = {
    onDelete: requestDeleteBoard,
    onMoveToProject: handleMoveBoardToProject,
    onTogglePin: handleToggleBoardPin,
    activeProjects: projects,
  };
  const notebookCardProps = {
    onDelete: requestDeleteNotebook,
    onAddToProject: handleAddNotebookToProject,
    onTogglePin: handleToggleNotebookPin,
    activeProjects: projects,
  };

  const dialogs = (
    <>
      <ConfirmDialog
        isOpen={boardDeleteTarget !== null}
        title="Delete Board"
        message={`Delete "${boardDeleteTarget?.name ?? "this board"}"? All notes and index cards inside will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={() => {
          const id = boardDeleteTarget?.id;
          setBoardDeleteTarget(null);
          if (id) void run(() => deleteBoard(id));
        }}
        onCancel={() => setBoardDeleteTarget(null)}
      />
      <ConfirmDialog
        isOpen={notebookDeleteTarget !== null}
        title="Delete Notebook"
        message={`Delete "${notebookDeleteTarget?.name ?? "this notebook"}"? All pages will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={() => {
          const id = notebookDeleteTarget?.id;
          setNotebookDeleteTarget(null);
          if (id) void run(() => deleteNotebook(id));
        }}
        onCancel={() => setNotebookDeleteTarget(null)}
      />
      <ConfirmDialog
        isOpen={folderDeleteTarget !== null}
        title="Delete folder"
        message={`Delete the folder "${folderDeleteTarget?.name ?? ""}"? Boards and notebooks inside it move back to the project, not deleted.`}
        confirmLabel="Delete folder"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={() => {
          const target = folderDeleteTarget;
          setFolderDeleteTarget(null);
          if (target) void run(() => deleteProjectFolder(target.projectId, target.id));
        }}
        onCancel={() => setFolderDeleteTarget(null)}
      />
      <ConfirmDialog
        isOpen={projectDeleteTarget !== null}
        title="Delete Project"
        message={`Delete "${projectDeleteTarget?.name ?? "this project"}"? Boards and notebooks will be unlinked but not deleted.`}
        confirmLabel="Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={() => {
          const id = projectDeleteTarget?.id;
          setProjectDeleteTarget(null);
          if (id) void run(() => deleteProject(id));
        }}
        onCancel={() => setProjectDeleteTarget(null)}
      />
      <ConfirmDialog
        isOpen={projectLeaveTarget !== null}
        title="Leave Project"
        message={`Leave "${projectLeaveTarget?.name ?? "this project"}"? You can be re-invited to rejoin later.`}
        confirmLabel="Leave Project"
        cancelLabel="Stay"
        variant="danger"
        onConfirm={() => {
          const id = projectLeaveTarget?.id;
          setProjectLeaveTarget(null);
          if (id) void run(() => leaveProject(id));
        }}
        onCancel={() => setProjectLeaveTarget(null)}
      />
    </>
  );

  return {
    projectCardProps,
    boardCardProps,
    notebookCardProps,
    setBoardFolder,
    setNotebookFolder,
    requestDeleteFolder,
    handleDrop,
    dialogs,
  };
}
