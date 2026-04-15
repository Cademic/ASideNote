import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addBoardToProject,
  addNotebookToProject,
  deleteProject,
  getProjects,
  leaveProject,
  removeBoardFromProject,
  removeNotebookFromProject,
  setBoardProjectFolder,
  setNotebookProjectFolder,
  toggleProjectPin,
  updateProject,
} from "../../api/projects";
import { deleteBoard, getBoardById, getBoards, toggleBoardPin, updateBoard } from "../../api/boards";
import { deleteNotebook, getNotebooks, toggleNotebookPin, updateNotebook } from "../../api/notebooks";
import type { BoardSummaryDto, NotebookSummaryDto, ProjectSummaryDto } from "../../types";
import { ConfirmDialog } from "../dashboard/ConfirmDialog";
import type { OpenedBoard } from "./AppLayout";

interface UseSidebarWorkspaceActionsParams {
  isAuthenticated: boolean;
  openedBoards: OpenedBoard[];
  closeBoard: (id: string) => void;
  openNotebook: (id: string) => void;
  refreshPinnedBoards: () => void;
  refreshPinnedProjects: () => void;
  refreshPinnedNotebooks: () => void;
}

export function useSidebarWorkspaceActions({
  isAuthenticated,
  openedBoards,
  closeBoard,
  openNotebook,
  refreshPinnedBoards,
  refreshPinnedProjects,
  refreshPinnedNotebooks,
}: UseSidebarWorkspaceActionsParams) {
  const [boards, setBoards] = useState<BoardSummaryDto[]>([]);
  const [activeProjects, setActiveProjects] = useState<ProjectSummaryDto[]>([]);
  const [notebooks, setNotebooks] = useState<NotebookSummaryDto[]>([]);
  const [boardCache, setBoardCache] = useState<Record<string, BoardSummaryDto>>({});

  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [projectRenameTarget, setProjectRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [projectRenameValue, setProjectRenameValue] = useState("");
  const [notebookRenameTarget, setNotebookRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [notebookRenameValue, setNotebookRenameValue] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<BoardSummaryDto | null>(null);
  const [projectDeleteTarget, setProjectDeleteTarget] = useState<ProjectSummaryDto | null>(null);
  const [projectLeaveTarget, setProjectLeaveTarget] = useState<ProjectSummaryDto | null>(null);
  const [notebookDeleteTarget, setNotebookDeleteTarget] = useState<NotebookSummaryDto | null>(null);

  const fetchWorkspace = useCallback(async () => {
    try {
      const [boardResult, projectResult, notebookResult] = await Promise.all([
        getBoards({ limit: 100 }),
        getProjects({ status: "Active" }).catch(() => [] as ProjectSummaryDto[]),
        getNotebooks({ limit: 100 }).catch(() => ({ items: [] as NotebookSummaryDto[], total: 0 })),
      ]);
      setBoards(boardResult.items);
      setActiveProjects(projectResult);
      setNotebooks(notebookResult.items);
    } catch {
      // keep prior data
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchWorkspace();
  }, [isAuthenticated, fetchWorkspace]);

  const activeProjectsSorted = useMemo(
    () =>
      [...activeProjects].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [activeProjects],
  );

  function resolveBoardDto(boardId: string): BoardSummaryDto | undefined {
    return boards.find((b) => b.id === boardId) ?? boardCache[boardId];
  }

  const openedBoardIdsMissingDto = useMemo(() => {
    const ids: string[] = [];
    for (const ob of openedBoards) {
      if (boards.some((b) => b.id === ob.id) || boardCache[ob.id]) continue;
      ids.push(ob.id);
    }
    return ids;
  }, [openedBoards, boards, boardCache]);

  useEffect(() => {
    if (!isAuthenticated || openedBoardIdsMissingDto.length === 0) return;
    for (const id of openedBoardIdsMissingDto) {
      void getBoardById(id)
        .then((b) => {
          setBoardCache((prev) => (prev[b.id] ? prev : { ...prev, [b.id]: b }));
        })
        .catch(() => {});
    }
  }, [isAuthenticated, openedBoardIdsMissingDto]);

  function handleRenameBoard(id: string, currentName: string) {
    setRenameTarget({ id, name: currentName });
    setRenameValue(currentName);
  }

  async function confirmRenameBoard() {
    if (!renameTarget || !renameValue.trim()) return;
    const { id } = renameTarget;
    const newName = renameValue.trim();
    setRenameTarget(null);
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, name: newName } : b)));
    setBoardCache((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, name: newName } };
    });
    try {
      await updateBoard(id, { name: newName });
    } catch {
      void fetchWorkspace();
    }
  }

  function handleDeleteBoard(id: string) {
    const board = boards.find((b) => b.id === id) ?? boardCache[id] ?? null;
    if (board) setDeleteTarget(board);
  }

  async function confirmDeleteBoard() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setBoards((prev) => prev.filter((b) => b.id !== id));
    setBoardCache((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    closeBoard(id);
    try {
      await deleteBoard(id);
    } catch {
      void fetchWorkspace();
    }
  }

  async function handleToggleBoardPin(id: string, isPinned: boolean) {
    setBoards((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, isPinned, pinnedAt: isPinned ? new Date().toISOString() : null } : b,
      ),
    );
    setBoardCache((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return {
        ...prev,
        [id]: { ...cur, isPinned, pinnedAt: isPinned ? new Date().toISOString() : null },
      };
    });
    try {
      await toggleBoardPin(id, isPinned);
      refreshPinnedBoards();
    } catch {
      void fetchWorkspace();
    }
  }

  async function handleMoveToProject(boardId: string, projectId: string, folderId?: string) {
    const board = boards.find((b) => b.id === boardId) ?? boardCache[boardId];
    if (folderId !== undefined) {
      if (board?.projectId === projectId) {
        try {
          await setBoardProjectFolder(projectId, boardId, { folderId });
          setBoards((prev) =>
            prev.map((b) =>
              b.id === boardId ? { ...b, projectFolderId: folderId } : b,
            ),
          );
          setBoardCache((prev) => {
            const cur = prev[boardId];
            if (!cur) return prev;
            return { ...prev, [boardId]: { ...cur, projectFolderId: folderId } };
          });
        } catch {
          void fetchWorkspace();
        }
        return;
      }
      try {
        await addBoardToProject(projectId, boardId);
        await setBoardProjectFolder(projectId, boardId, { folderId });
        setBoards((prev) =>
          prev.map((b) =>
            b.id === boardId ? { ...b, projectId, projectFolderId: folderId } : b,
          ),
        );
        setBoardCache((prev) => {
          const cur = prev[boardId];
          if (!cur) return prev;
          return { ...prev, [boardId]: { ...cur, projectId, projectFolderId: folderId } };
        });
      } catch {
        void fetchWorkspace();
      }
      return;
    }
    if (board?.projectId === projectId) {
      try {
        await removeBoardFromProject(projectId, boardId);
        setBoards((prev) =>
          prev.map((b) =>
            b.id === boardId ? { ...b, projectId: null, projectFolderId: null } : b,
          ),
        );
        setBoardCache((prev) => {
          const cur = prev[boardId];
          if (!cur) return prev;
          return { ...prev, [boardId]: { ...cur, projectId: null, projectFolderId: null } };
        });
      } catch {
        // ignore
      }
      return;
    }
    try {
      await addBoardToProject(projectId, boardId);
      await setBoardProjectFolder(projectId, boardId, { folderId: null });
      setBoards((prev) =>
        prev.map((b) =>
          b.id === boardId ? { ...b, projectId, projectFolderId: null } : b,
        ),
      );
      setBoardCache((prev) => {
        const cur = prev[boardId];
        if (!cur) return prev;
        return { ...prev, [boardId]: { ...cur, projectId, projectFolderId: null } };
      });
    } catch {
      void fetchWorkspace();
    }
  }

  function handleRenameProject(id: string, currentName: string) {
    setProjectRenameTarget({ id, name: currentName });
    setProjectRenameValue(currentName);
  }

  async function confirmRenameProject() {
    if (!projectRenameTarget || !projectRenameValue.trim()) return;
    const { id } = projectRenameTarget;
    const newName = projectRenameValue.trim();
    const project = activeProjects.find((p) => p.id === id);
    setProjectRenameTarget(null);
    setActiveProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: newName } : p)));
    try {
      await updateProject(id, {
        name: newName,
        status: project?.status ?? "Active",
        progress: project?.progress ?? 0,
      });
    } catch {
      void fetchWorkspace();
    }
  }

  async function handleToggleProjectPin(id: string, isPinned: boolean) {
    setActiveProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, isPinned, pinnedAt: isPinned ? new Date().toISOString() : undefined }
          : p,
      ),
    );
    try {
      await toggleProjectPin(id, isPinned);
      await refreshPinnedProjects();
    } catch {
      void fetchWorkspace();
    }
  }

  function handleDeleteProject(id: string) {
    const project = activeProjects.find((p) => p.id === id) ?? null;
    if (project) setProjectDeleteTarget(project);
  }

  async function confirmDeleteProject() {
    if (!projectDeleteTarget) return;
    const id = projectDeleteTarget.id;
    setProjectDeleteTarget(null);
    setActiveProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteProject(id);
      refreshPinnedProjects();
    } catch {
      void fetchWorkspace();
    }
  }

  function handleLeaveProject(id: string) {
    const project = activeProjects.find((p) => p.id === id) ?? null;
    if (project) setProjectLeaveTarget(project);
  }

  async function confirmLeaveProject() {
    if (!projectLeaveTarget) return;
    const id = projectLeaveTarget.id;
    setProjectLeaveTarget(null);
    setActiveProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await leaveProject(id);
      refreshPinnedProjects();
    } catch {
      void fetchWorkspace();
    }
  }

  function handleRenameNotebook(id: string, currentName: string) {
    setNotebookRenameTarget({ id, name: currentName });
    setNotebookRenameValue(currentName);
  }

  async function confirmRenameNotebook() {
    if (!notebookRenameTarget || !notebookRenameValue.trim()) return;
    const { id } = notebookRenameTarget;
    const newName = notebookRenameValue.trim();
    setNotebookRenameTarget(null);
    setNotebooks((prev) => prev.map((n) => (n.id === id ? { ...n, name: newName } : n)));
    try {
      await updateNotebook(id, { name: newName });
    } catch {
      void fetchWorkspace();
    }
  }

  async function handleToggleNotebookPin(id: string, isPinned: boolean) {
    setNotebooks((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, isPinned, pinnedAt: isPinned ? new Date().toISOString() : null } : n,
      ),
    );
    try {
      await toggleNotebookPin(id, isPinned);
      refreshPinnedNotebooks();
    } catch {
      void fetchWorkspace();
    }
  }

  function handleDeleteNotebook(id: string) {
    const notebook = notebooks.find((n) => n.id === id) ?? null;
    if (notebook) setNotebookDeleteTarget(notebook);
  }

  async function confirmDeleteNotebook() {
    if (!notebookDeleteTarget) return;
    const id = notebookDeleteTarget.id;
    setNotebookDeleteTarget(null);
    setNotebooks((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotebook(id);
      refreshPinnedNotebooks();
    } catch {
      void fetchWorkspace();
    }
  }

  async function handleAddNotebookToProject(
    notebookId: string,
    projectId: string,
    folderId?: string,
  ) {
    const notebook = notebooks.find((n) => n.id === notebookId);
    if (folderId !== undefined) {
      if (notebook?.projectId === projectId) {
        try {
          await setNotebookProjectFolder(projectId, notebookId, { folderId });
          setNotebooks((prev) =>
            prev.map((n) =>
              n.id === notebookId ? { ...n, projectFolderId: folderId } : n,
            ),
          );
        } catch {
          void fetchWorkspace();
        }
        return;
      }
      try {
        await addNotebookToProject(projectId, notebookId);
        await setNotebookProjectFolder(projectId, notebookId, { folderId });
        setNotebooks((prev) =>
          prev.map((n) =>
            n.id === notebookId ? { ...n, projectId, projectFolderId: folderId } : n,
          ),
        );
      } catch {
        void fetchWorkspace();
      }
      return;
    }
    if (notebook?.projectId === projectId) {
      try {
        await removeNotebookFromProject(projectId, notebookId);
        setNotebooks((prev) =>
          prev.map((n) =>
            n.id === notebookId ? { ...n, projectId: null, projectFolderId: null } : n,
          ),
        );
      } catch {
        // ignore
      }
      return;
    }
    try {
      await addNotebookToProject(projectId, notebookId);
      await setNotebookProjectFolder(projectId, notebookId, { folderId: null });
      setNotebooks((prev) =>
        prev.map((n) =>
          n.id === notebookId ? { ...n, projectId, projectFolderId: null } : n,
        ),
      );
    } catch {
      void fetchWorkspace();
    }
  }

  function getProjectCardProps() {
    return {
      onRename: handleRenameProject,
      onTogglePin: handleToggleProjectPin,
      onDelete: handleDeleteProject,
      onLeave: handleLeaveProject,
      onProjectUpdated: fetchWorkspace,
    };
  }

  function getBoardCardProps() {
    return {
      onDelete: handleDeleteBoard,
      onRename: handleRenameBoard,
      onMoveToProject: handleMoveToProject,
      onTogglePin: handleToggleBoardPin,
      activeProjects: activeProjectsSorted,
    };
  }

  function getNotebookCardProps() {
    return {
      onOpen: openNotebook,
      onRename: handleRenameNotebook,
      onTogglePin: handleToggleNotebookPin,
      onDelete: handleDeleteNotebook,
      onAddToProject: handleAddNotebookToProject,
      activeProjects: activeProjectsSorted,
    };
  }

  const dialogs = (
    <>
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Board"
        message={`Are you sure you want to delete "${deleteTarget?.name ?? "this board"}"? All notes and index cards inside will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={confirmDeleteBoard}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        isOpen={projectDeleteTarget !== null}
        title="Delete Project"
        message={`Are you sure you want to delete "${projectDeleteTarget?.name ?? "this project"}"? All boards will be unlinked but not deleted.`}
        confirmLabel="Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={confirmDeleteProject}
        onCancel={() => setProjectDeleteTarget(null)}
      />
      <ConfirmDialog
        isOpen={projectLeaveTarget !== null}
        title="Leave Project"
        message={`Are you sure you want to leave "${projectLeaveTarget?.name ?? "this project"}"? You can be re-invited to rejoin later.`}
        confirmLabel="Leave Project"
        cancelLabel="Stay"
        variant="danger"
        onConfirm={confirmLeaveProject}
        onCancel={() => setProjectLeaveTarget(null)}
      />
      <ConfirmDialog
        isOpen={notebookDeleteTarget !== null}
        title="Delete Notebook"
        message={`Are you sure you want to delete "${notebookDeleteTarget?.name ?? "this notebook"}"? All pages will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={confirmDeleteNotebook}
        onCancel={() => setNotebookDeleteTarget(null)}
      />

      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setRenameTarget(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Rename Board</h2>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void confirmRenameBoard();
              }}
              maxLength={100}
              className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRenameBoard()}
                disabled={!renameValue.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {projectRenameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setProjectRenameTarget(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Rename Project</h2>
            <input
              type="text"
              value={projectRenameValue}
              onChange={(e) => setProjectRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void confirmRenameProject();
              }}
              maxLength={100}
              className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProjectRenameTarget(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRenameProject()}
                disabled={!projectRenameValue.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {notebookRenameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setNotebookRenameTarget(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Rename Notebook</h2>
            <input
              type="text"
              value={notebookRenameValue}
              onChange={(e) => setNotebookRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void confirmRenameNotebook();
              }}
              maxLength={100}
              className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNotebookRenameTarget(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRenameNotebook()}
                disabled={!notebookRenameValue.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return {
    activeProjectsSorted,
    notebooks,
    resolveBoardDto,
    getProjectCardProps,
    getBoardCardProps,
    getNotebookCardProps,
    fetchWorkspace,
    dialogs,
  };
}
