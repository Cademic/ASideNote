import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { AppLayoutContext } from "../components/layout/AppLayout";
import {
  getBoards,
  updateBoard,
  deleteBoard,
  toggleBoardPin,
} from "../api/boards";
import {
  getNotebooks,
  updateNotebook,
  deleteNotebook,
  toggleNotebookPin,
} from "../api/notebooks";
import {
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  toggleProjectPin,
  leaveProject as leaveProjectApi,
  addBoardToProject,
  removeBoardFromProject,
  setBoardProjectFolder,
  addNotebookToProject,
  removeNotebookFromProject,
  setNotebookProjectFolder,
} from "../api/projects";
import { useResourceList } from "./useResourceList";
import { useAuth } from "../context/AuthContext";
import { toGalleryItems } from "../lib/gallery-item";
import type {
  BoardSummaryDto,
  NotebookSummaryDto,
  ProjectSummaryDto,
} from "../types";
import type { GalleryItem } from "../types/gallery";

/** Hard cap enforced by the backend; mirrored here for the disabled-button hint. */
export const NOTEBOOK_LIMIT = 5;

/** Fold `extra` into `base` by id, keeping the `base` copy on collisions. */
function mergeById<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const seen = new Set(base.map((item) => item.id));
  return [...base, ...extra.filter((item) => !seen.has(item.id))];
}

type SetItems<T> = React.Dispatch<React.SetStateAction<T[]>>;

interface KindActions<T> {
  items: T[];
  setItems: SetItems<T>;
  refetch: () => Promise<void>;
  rename: (id: string, name: string, description?: string) => Promise<void>;
  togglePin: (id: string, isPinned: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

interface ProjectActions extends KindActions<ProjectSummaryDto> {
  leave: (id: string) => Promise<void>;
}

interface BoardActions extends KindActions<BoardSummaryDto> {
  moveToProject: (
    boardId: string,
    projectId: string,
    folderId?: string,
  ) => Promise<void>;
}

interface NotebookActions extends KindActions<NotebookSummaryDto> {
  addToProject: (
    notebookId: string,
    projectId: string,
    folderId?: string,
  ) => Promise<void>;
}

export interface UseGalleryItemsResult {
  items: GalleryItem[];
  isLoading: boolean;
  error: string | null;
  refetchAll: () => Promise<void>;
  /** Active projects for the "move to project" menus on board / notebook cards. */
  activeProjects: ProjectSummaryDto[];
  totalNotebooks: number;
  notebookLimitReached: boolean;
  /** Adjust the tracked notebook count after a create / delete the hook didn't drive. */
  bumpNotebookTotal: (delta: number) => void;
  projects: ProjectActions;
  boards: BoardActions;
  notebooks: NotebookActions;
}

/**
 * Aggregates the three top-level content lists (projects, boards, notebooks) for
 * the unified Gallery page. Each list keeps its own `useResourceList` instance so
 * the optimistic rename / pin / delete behaviour of the pages this replaces is
 * preserved verbatim; `toGalleryItems` merges them into one `GalleryItem[]`.
 */
export function useGalleryItems(): UseGalleryItemsResult {
  const { user } = useAuth();
  const { refreshPinnedProjects, refreshPinnedBoards, refreshPinnedNotebooks } =
    useOutletContext<AppLayoutContext>();

  const [totalNotebooks, setTotalNotebooks] = useState(0);
  // Boards / notebooks that live under a project the user can access but doesn't
  // own — `/boards` and `/notebooks` only return the caller's own items, so these
  // are gathered from each project's detail payload.
  const [projectScopedBoards, setProjectScopedBoards] = useState<
    BoardSummaryDto[]
  >([]);
  const [projectScopedNotebooks, setProjectScopedNotebooks] = useState<
    NotebookSummaryDto[]
  >([]);
  // True until the shared-project detail fan-out has settled once — folded into
  // `isLoading` so a shared project's boards / notebooks appear with everything
  // else instead of popping in a beat later.
  const [scopedLoading, setScopedLoading] = useState(true);

  const projectsList = useResourceList<ProjectSummaryDto>({
    fetchList: () => getProjects(),
    loadErrorMessage: "Failed to load projects.",
    rename: {
      call: (id, name, item, description) =>
        updateProject(id, {
          name,
          description,
          status: item?.status ?? "Active",
          progress: item?.progress ?? 0,
        }),
    },
    pin: {
      call: toggleProjectPin,
      applyOptimistic: (project, isPinned) => ({
        ...project,
        isPinned,
        pinnedAt: isPinned ? new Date().toISOString() : undefined,
      }),
      onSuccess: refreshPinnedProjects,
    },
    remove: {
      call: deleteProject,
      onSuccess: refreshPinnedProjects,
    },
  });

  const boardsList = useResourceList<BoardSummaryDto>({
    fetchList: async () => (await getBoards({ limit: 200 })).items,
    loadErrorMessage: "Failed to load boards.",
    rename: {
      call: (id, name, _item, description) =>
        updateBoard(id, { name, description }),
    },
    pin: {
      call: toggleBoardPin,
      applyOptimistic: (board, isPinned) => ({
        ...board,
        isPinned,
        pinnedAt: isPinned ? new Date().toISOString() : null,
      }),
      onSuccess: refreshPinnedBoards,
    },
    remove: {
      call: deleteBoard,
      onSuccess: refreshPinnedBoards,
    },
  });

  const notebooksList = useResourceList<NotebookSummaryDto>({
    fetchList: async () => {
      const result = await getNotebooks({ limit: 200 });
      setTotalNotebooks(result.total);
      return result.items;
    },
    loadErrorMessage: "Failed to load notebooks.",
    rename: { call: (id, name) => updateNotebook(id, { name }) },
    pin: {
      call: toggleNotebookPin,
      applyOptimistic: (notebook, isPinned) => ({
        ...notebook,
        isPinned,
        pinnedAt: isPinned ? new Date().toISOString() : null,
      }),
      onSuccess: refreshPinnedNotebooks,
    },
    remove: {
      call: deleteNotebook,
      onOptimisticRemove: () =>
        setTotalNotebooks((total) => Math.max(0, total - 1)),
      onSuccess: refreshPinnedNotebooks,
    },
  });

  // Active projects for the "move to project" menus — derived from the list we
  // already loaded, no extra request.
  const activeProjects = useMemo(
    () => projectsList.items.filter((project) => project.status === "Active"),
    [projectsList.items],
  );

  // One detail call per *multi-member* project — those may hold boards / notebooks
  // added by other members that `/boards` + `/notebooks` (own-items only) omit.
  // Solo projects (memberCount <= 1) can't, so we skip them: this is what used to
  // make the page fan out one request per project and stream items in late.
  const projectsLoaded = !projectsList.isLoading;
  const sharedProjectIdsKey = projectsList.items
    .filter((project) => (project.memberCount ?? 0) > 1)
    .map((project) => project.id)
    .sort()
    .join(",");
  useEffect(() => {
    // Wait until we know the full project set before deciding what to fan out.
    if (!projectsLoaded) return;
    if (!sharedProjectIdsKey) {
      setProjectScopedBoards([]);
      setProjectScopedNotebooks([]);
      setScopedLoading(false);
      return;
    }
    let cancelled = false;
    setScopedLoading(true);
    const ids = sharedProjectIdsKey.split(",");
    Promise.all(ids.map((id) => getProjectById(id).catch(() => null)))
      .then((details) => {
        if (cancelled) return;
        const boards: BoardSummaryDto[] = [];
        const notebooks: NotebookSummaryDto[] = [];
        for (const detail of details) {
          if (!detail) continue;
          for (const board of detail.boards) {
            boards.push({ ...board, projectId: board.projectId ?? detail.id });
          }
          for (const notebook of detail.notebooks) {
            notebooks.push({
              ...notebook,
              projectId: notebook.projectId ?? detail.id,
            });
          }
        }
        setProjectScopedBoards(boards);
        setProjectScopedNotebooks(notebooks);
      })
      .catch(() => {
        if (cancelled) return;
        setProjectScopedBoards([]);
        setProjectScopedNotebooks([]);
      })
      .finally(() => {
        if (!cancelled) setScopedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectsLoaded, sharedProjectIdsKey]);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      projectsList.refetch(),
      boardsList.refetch(),
      notebooksList.refetch(),
    ]);
  }, [projectsList, boardsList, notebooksList]);

  const items = useMemo(
    () =>
      toGalleryItems(
        projectsList.items,
        mergeById(boardsList.items, projectScopedBoards),
        mergeById(notebooksList.items, projectScopedNotebooks),
        user?.userId ?? null,
      ),
    [
      projectsList.items,
      boardsList.items,
      notebooksList.items,
      projectScopedBoards,
      projectScopedNotebooks,
      user?.userId,
    ],
  );

  const leaveProject = useCallback(
    async (id: string) => {
      projectsList.setItems((prev) =>
        prev.filter((project) => project.id !== id),
      );
      try {
        await leaveProjectApi(id);
        refreshPinnedProjects();
      } catch {
        void projectsList.refetch();
      }
    },
    [projectsList, refreshPinnedProjects],
  );

  const moveBoardToProject = useCallback(
    async (boardId: string, projectId: string, folderId?: string) => {
      const board = boardsList.items.find(
        (candidate) => candidate.id === boardId,
      );
      const setBoards = boardsList.setItems;

      if (folderId !== undefined) {
        try {
          if (board?.projectId !== projectId) {
            await addBoardToProject(projectId, boardId);
          }
          await setBoardProjectFolder(projectId, boardId, { folderId });
          setBoards((prev) =>
            prev.map((candidate) =>
              candidate.id === boardId
                ? { ...candidate, projectId, projectFolderId: folderId }
                : candidate,
            ),
          );
        } catch {
          void boardsList.refetch();
        }
        return;
      }

      if (board?.projectId === projectId) {
        try {
          await removeBoardFromProject(projectId, boardId);
          setBoards((prev) =>
            prev.map((candidate) =>
              candidate.id === boardId
                ? { ...candidate, projectId: null, projectFolderId: null }
                : candidate,
            ),
          );
        } catch {
          void boardsList.refetch();
        }
        return;
      }

      try {
        await addBoardToProject(projectId, boardId);
        await setBoardProjectFolder(projectId, boardId, { folderId: null });
        setBoards((prev) =>
          prev.map((candidate) =>
            candidate.id === boardId
              ? { ...candidate, projectId, projectFolderId: null }
              : candidate,
          ),
        );
      } catch {
        void boardsList.refetch();
      }
    },
    [boardsList],
  );

  const addNotebookToProjectAction = useCallback(
    async (notebookId: string, projectId: string, folderId?: string) => {
      const notebook = notebooksList.items.find(
        (candidate) => candidate.id === notebookId,
      );
      const setNotebooks = notebooksList.setItems;

      if (folderId !== undefined) {
        try {
          if (notebook?.projectId !== projectId) {
            await addNotebookToProject(projectId, notebookId);
          }
          await setNotebookProjectFolder(projectId, notebookId, { folderId });
          setNotebooks((prev) =>
            prev.map((candidate) =>
              candidate.id === notebookId
                ? { ...candidate, projectId, projectFolderId: folderId }
                : candidate,
            ),
          );
        } catch {
          void notebooksList.refetch();
        }
        return;
      }

      if (notebook?.projectId === projectId) {
        try {
          await removeNotebookFromProject(projectId, notebookId);
          setNotebooks((prev) =>
            prev.map((candidate) =>
              candidate.id === notebookId
                ? { ...candidate, projectId: null, projectFolderId: null }
                : candidate,
            ),
          );
        } catch {
          void notebooksList.refetch();
        }
        return;
      }

      try {
        await addNotebookToProject(projectId, notebookId);
        await setNotebookProjectFolder(projectId, notebookId, {
          folderId: null,
        });
        setNotebooks((prev) =>
          prev.map((candidate) =>
            candidate.id === notebookId
              ? { ...candidate, projectId, projectFolderId: null }
              : candidate,
          ),
        );
      } catch {
        void notebooksList.refetch();
      }
    },
    [notebooksList],
  );

  const bumpNotebookTotal = useCallback((delta: number) => {
    setTotalNotebooks((total) => Math.max(0, total + delta));
  }, []);

  const isLoading =
    projectsList.isLoading ||
    boardsList.isLoading ||
    notebooksList.isLoading ||
    scopedLoading;
  const error = projectsList.error ?? boardsList.error ?? notebooksList.error;

  return {
    items,
    isLoading,
    error,
    refetchAll,
    activeProjects,
    totalNotebooks,
    notebookLimitReached: totalNotebooks >= NOTEBOOK_LIMIT,
    bumpNotebookTotal,
    projects: {
      items: projectsList.items,
      setItems: projectsList.setItems,
      refetch: projectsList.refetch,
      rename: async (id, name, description) => {
        await projectsList.renameItem?.(id, name, description);
      },
      togglePin: async (id, isPinned) => {
        await projectsList.togglePin?.(id, isPinned);
      },
      remove: projectsList.deleteItem,
      leave: leaveProject,
    },
    boards: {
      items: boardsList.items,
      setItems: boardsList.setItems,
      refetch: boardsList.refetch,
      rename: async (id, name, description) => {
        await boardsList.renameItem?.(id, name, description);
      },
      togglePin: async (id, isPinned) => {
        await boardsList.togglePin?.(id, isPinned);
      },
      remove: boardsList.deleteItem,
      moveToProject: moveBoardToProject,
    },
    notebooks: {
      items: notebooksList.items,
      setItems: notebooksList.setItems,
      refetch: notebooksList.refetch,
      rename: async (id, name) => {
        await notebooksList.renameItem?.(id, name);
      },
      togglePin: async (id, isPinned) => {
        await notebooksList.togglePin?.(id, isPinned);
      },
      remove: notebooksList.deleteItem,
      addToProject: addNotebookToProjectAction,
    },
  };
}
