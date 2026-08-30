import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { ChevronRight } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getPinnedBoards, toggleBoardPin, createBoard } from "../../api/boards";
import {
  getPinnedProjects,
  toggleProjectPin,
  createProject,
} from "../../api/projects";
import {
  getNotebooks,
  getPinnedNotebooks,
  toggleNotebookPin,
  createNotebook,
} from "../../api/notebooks";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import {
  CreateBoardDialog,
  type CreateDialogTab,
} from "../dashboard/CreateBoardDialog";
import { SidebarProvider, useSidebar } from "./sidebar-primitives";
import { GlobalSearchProvider } from "../../context/GlobalSearchContext";
import { useSidebarWorkspaceActions } from "./useSidebarWorkspaceActions";
import { useAuth } from "../../context/AuthContext";
import { usePreferences } from "../../context/PreferencesContext";
import { useTutorial } from "../../context/TutorialContext";
import { useSessionPresence } from "../../hooks/useSessionPresence";
import { TutorialOverlay } from "../tutorial/TutorialOverlay";
import type { BoardPresenceUser } from "../../hooks/useBoardRealtime";
import type {
  BoardSummaryDto,
  NotebookSummaryDto,
  ProjectSummaryDto,
} from "../../types";

export type { BoardPresenceUser };

/** Must match mobile drawer `duration-300` so the open-arrow waits for slide-out to finish */
const MOBILE_DRAWER_TRANSITION_MS = 300;

export interface OpenedBoard {
  id: string;
  name: string;
  boardType: string;
}

export interface AppLayoutContext {
  setBoardName: (name: string | null) => void;
  openBoard: (board: OpenedBoard) => void;
  closeBoard: (id: string) => void;
  openedBoards: OpenedBoard[];
  /** Connected users on the current board (when on a board route). Cleared when leaving board. */
  connectedUsers: BoardPresenceUser[];
  setBoardPresence: (users: BoardPresenceUser[]) => void;
  refreshPinnedBoards: () => void;
  refreshPinnedProjects: () => void;
  openNotebook: (id: string) => void;
  refreshPinnedNotebooks: () => void;
  /** Desktop only: true when sidebar is expanded (user-resizable width), false when collapsed (w-16). */
  isSidebarOpen: boolean;
  /**
   * The board type mounted in the dashboard's Active Canvas ("NoteBoard" /
   * "ChalkBoard"), or null when none is live. Non-null makes the sidebar show
   * board tools; "ChalkBoard" narrows them to the sticky-note tool.
   */
  dashboardActiveBoardType: "NoteBoard" | "ChalkBoard" | null;
  setDashboardActiveBoardType: (type: "NoteBoard" | "ChalkBoard" | null) => void;
  /**
   * Opens the shared create dialog in place — no navigation. Driven from the
   * sidebar rail "Create" button and the Gallery "New" affordances. Pass a tab
   * to pre-select Board / Project / Notebook.
   */
  requestCreate: (tab?: CreateDialogTab) => void;
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <GlobalSearchProvider>
        <AppLayoutInner />
      </GlobalSearchProvider>
    </SidebarProvider>
  );
}

function AppLayoutInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  useSessionPresence(isAuthenticated);
  const { preferences, isLoading: preferencesLoading } = usePreferences();
  const tutorial = useTutorial();
  const tutorialTriggeredRef = useRef(false);
  const {
    open: isSidebarOpen,
    openMobile,
    setOpenMobile,
    isMobile,
    toggleSidebar,
  } = useSidebar();
  const [boardName, setBoardName] = useState<string | null>(null);
  const [connectedUsers, setBoardPresence] = useState<BoardPresenceUser[]>([]);
  const [openedBoards, setOpenedBoards] = useState<OpenedBoard[]>([]);
  const [pinnedBoards, setPinnedBoards] = useState<BoardSummaryDto[]>([]);
  const [pinnedProjects, setPinnedProjects] = useState<ProjectSummaryDto[]>([]);
  const [pinnedNotebooks, setPinnedNotebooks] = useState<NotebookSummaryDto[]>(
    [],
  );
  const [dashboardActiveBoardType, setDashboardActiveBoardType] = useState<
    "NoteBoard" | "ChalkBoard" | null
  >(null);

  // Shared create dialog — hosted here so "Create" opens on whatever page the
  // user is on (no redirect to the dashboard).
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createInitialTab, setCreateInitialTab] =
    useState<CreateDialogTab>("board");
  const [createBoardError, setCreateBoardError] = useState<string | null>(null);
  const [createNotebookError, setCreateNotebookError] = useState<string | null>(
    null,
  );
  const [notebookCount, setNotebookCount] = useState(0);

  const requestCreate = useCallback((tab?: CreateDialogTab) => {
    // `tab` may arrive as a click event when wired straight to onClick — only
    // honour a real tab value.
    setCreateInitialTab(
      tab === "project" || tab === "notebook" || tab === "board"
        ? tab
        : "board",
    );
    setCreateBoardError(null);
    setCreateNotebookError(null);
    setIsCreateOpen(true);
  }, []);

  const closeCreate = useCallback(() => {
    setIsCreateOpen(false);
    setCreateBoardError(null);
    setCreateNotebookError(null);
  }, []);

  // Refresh the notebook cap hint whenever the dialog opens.
  useEffect(() => {
    if (!isCreateOpen) return;
    let cancelled = false;
    getNotebooks({ limit: 1 })
      .then((result) => {
        if (!cancelled) setNotebookCount(result.total ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isCreateOpen]);

  const handleCreateBoard = useCallback(
    async (name: string, description: string, boardType: string) => {
      try {
        setCreateBoardError(null);
        const created = await createBoard({
          name,
          description: description || undefined,
          boardType,
        });
        setIsCreateOpen(false);
        navigate(
          created.boardType === "ChalkBoard"
            ? `/chalkboards/${created.id}`
            : `/boards/${created.id}`,
        );
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          setCreateBoardError(
            err.response.data?.message ??
              "A board with that name already exists.",
          );
        } else {
          setCreateBoardError("Failed to create board. Please try again.");
          console.error("Failed to create board:", err);
        }
      }
    },
    [navigate],
  );

  const handleCreateProject = useCallback(
    async (
      name: string,
      description: string,
      color: string,
      startDate?: string,
      endDate?: string,
      deadline?: string,
    ) => {
      try {
        setCreateBoardError(null);
        const created = await createProject({
          name,
          description: description || undefined,
          color,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          deadline: deadline || undefined,
        });
        setIsCreateOpen(false);
        navigate(`/projects/${created.id}`);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          setCreateBoardError(
            err.response.data?.message ??
              "A project with that name already exists.",
          );
        } else {
          setCreateBoardError("Failed to create project. Please try again.");
          console.error("Failed to create project:", err);
        }
      }
    },
    [navigate],
  );

  const handleCreateNotebook = useCallback(
    async (name: string) => {
      try {
        setCreateNotebookError(null);
        const created = await createNotebook({ name });
        setNotebookCount((count) => count + 1);
        setIsCreateOpen(false);
        navigate(`/notebooks/${created.id}`);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          setCreateNotebookError(
            err.response.data?.message ??
              "Maximum 5 notebooks allowed. Delete one to create another.",
          );
        } else {
          setCreateNotebookError(
            "Failed to create notebook. Please try again.",
          );
          console.error("Failed to create notebook:", err);
        }
      }
    },
    [navigate],
  );

  /** For board-page open-arrow: delay showing until drawer close animation ends */
  const prevSidebarOpenForArrowRef = useRef(openMobile);
  const [boardOpenArrowVisible, setBoardOpenArrowVisible] = useState(true);

  /* ── Close mobile drawer on route change ──────────── */
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, location.pathname, setOpenMobile]);

  /* ── Board page: show chevron only after drawer finishes sliding closed ─ */
  useEffect(() => {
    const isNoteBoardRoute = /^\/boards\/[^/]+$/.test(location.pathname);
    const isChalkBoardRoute = /^\/chalkboards\/[^/]+$/.test(location.pathname);
    const onBoardDetail = isNoteBoardRoute || isChalkBoardRoute;

    if (!onBoardDetail || !isMobile) {
      setBoardOpenArrowVisible(true);
      prevSidebarOpenForArrowRef.current = openMobile;
      return;
    }

    if (openMobile) {
      setBoardOpenArrowVisible(false);
      prevSidebarOpenForArrowRef.current = true;
      return;
    }

    if (prevSidebarOpenForArrowRef.current === true) {
      prevSidebarOpenForArrowRef.current = false;
      const id = window.setTimeout(() => {
        setBoardOpenArrowVisible(true);
      }, MOBILE_DRAWER_TRANSITION_MS);
      return () => clearTimeout(id);
    }

    prevSidebarOpenForArrowRef.current = false;
    setBoardOpenArrowVisible(true);
  }, [isMobile, openMobile, location.pathname]);

  const openBoard = useCallback((board: OpenedBoard) => {
    setOpenedBoards((prev) => {
      // Update if already open (name may have changed), otherwise add
      const exists = prev.find((b) => b.id === board.id);
      if (exists) {
        return prev.map((b) => (b.id === board.id ? board : b));
      }
      return [...prev, board];
    });
  }, []);

  const closeBoard = useCallback((id: string) => {
    setOpenedBoards((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const refreshPinnedBoards = useCallback(async () => {
    try {
      const result = await getPinnedBoards();
      setPinnedBoards(result);
    } catch {
      // Fail silently
    }
  }, []);

  const refreshPinnedProjects = useCallback(async () => {
    try {
      const result = await getPinnedProjects();
      setPinnedProjects(result);
    } catch {
      // Fail silently
    }
  }, []);

  const refreshPinnedNotebooks = useCallback(async () => {
    try {
      const result = await getPinnedNotebooks();
      setPinnedNotebooks(result);
    } catch {
      // Fail silently
    }
  }, []);

  const openNotebook = useCallback(
    (id: string) => {
      navigate(`/notebooks/${id}`);
    },
    [navigate],
  );

  const handleUnpinBoard = useCallback(
    async (id: string) => {
      try {
        await toggleBoardPin(id, false);
        await refreshPinnedBoards();
      } catch {
        // Fail silently
      }
    },
    [refreshPinnedBoards],
  );

  const handleUnpinProject = useCallback(
    async (id: string) => {
      try {
        await toggleProjectPin(id, false);
        await refreshPinnedProjects();
      } catch {
        // Fail silently
      }
    },
    [refreshPinnedProjects],
  );

  const handleUnpinNotebook = useCallback(
    async (id: string) => {
      try {
        await toggleNotebookPin(id, false);
        await refreshPinnedNotebooks();
      } catch {
        // Fail silently
      }
    },
    [refreshPinnedNotebooks],
  );

  const sidebarWorkspace = useSidebarWorkspaceActions({
    isAuthenticated: Boolean(isAuthenticated),
    openedBoards,
    closeBoard,
    openNotebook,
    refreshPinnedBoards,
    refreshPinnedProjects,
    refreshPinnedNotebooks,
  });

  // Clear presence when leaving board or notebook editor routes
  useEffect(() => {
    const onBoard =
      /^\/boards\/[^/]+$/.test(location.pathname) ||
      /^\/chalkboards\/[^/]+$/.test(location.pathname);
    const onNotebookEditor = /^\/notebooks\/[^/]+$/.test(location.pathname);
    if (!onBoard && !onNotebookEditor) {
      setBoardPresence([]);
    }
  }, [location.pathname]);

  // Fetch pinned boards, projects, and notebooks when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    refreshPinnedBoards();
    refreshPinnedProjects();
    refreshPinnedNotebooks();
  }, [
    isAuthenticated,
    refreshPinnedBoards,
    refreshPinnedProjects,
    refreshPinnedNotebooks,
  ]);

  // Auto-start the onboarding tour once for new users, from their first landing on
  // the dashboard or gallery (never hijacks other routes they navigate to directly).
  useEffect(() => {
    if (tutorialTriggeredRef.current) return;
    if (preferencesLoading || !preferences) return;
    if (preferences.hasCompletedTutorial) return;
    if (tutorial.isActive) return;
    if (location.pathname !== "/dashboard" && location.pathname !== "/gallery")
      return;

    tutorialTriggeredRef.current = true;
    if (location.pathname !== "/gallery") {
      navigate("/gallery", { replace: true });
    }
    tutorial.start();
  }, [preferences, preferencesLoading, location.pathname, tutorial, navigate]);

  // Advance past "board-title" once navigation lands on the new board's detail page,
  // i.e. once the user has actually named and submitted the board.
  useEffect(() => {
    if (!tutorial.isActive || tutorial.currentStep?.id !== "board-title")
      return;
    if (/^\/boards\/[^/]+$/.test(location.pathname)) {
      tutorial.advanceStep();
    }
  }, [location.pathname, tutorial]);

  // Onboarding "create a board" step: opening the shared create dialog is the
  // step's fallback action; once it is open, advance to "board-title".
  useEffect(
    () => tutorial.registerAction("create-board", () => requestCreate("board")),
    [tutorial, requestCreate],
  );
  useEffect(() => {
    if (!isCreateOpen || !tutorial.isActive) return;
    if (tutorial.currentStep?.id === "create-board") tutorial.advanceStep();
  }, [isCreateOpen, tutorial]);

  // The "add a sticky note" / "add an index card" steps spotlight sidebar tools, which are
  // hidden behind the mobile drawer by default — open it so the target is actually visible.
  useEffect(() => {
    if (!tutorial.isActive) return;
    if (
      tutorial.currentStep?.id !== "add-note" &&
      tutorial.currentStep?.id !== "add-card"
    )
      return;
    if (isMobile && !openMobile) {
      setOpenMobile(true);
    }
  }, [tutorial, isMobile, openMobile, setOpenMobile]);

  const outletContext: AppLayoutContext = {
    setBoardName,
    openBoard,
    closeBoard,
    openedBoards,
    connectedUsers,
    setBoardPresence,
    refreshPinnedBoards,
    refreshPinnedProjects,
    openNotebook,
    refreshPinnedNotebooks,
    isSidebarOpen,
    dashboardActiveBoardType,
    setDashboardActiveBoardType,
    requestCreate,
  };

  /** Note or chalk board detail — hide global navbar for maximum canvas space */
  const isNoteBoardRoute = /^\/boards\/[^/]+$/.test(location.pathname);
  const isChalkBoardRoute = /^\/chalkboards\/[^/]+$/.test(location.pathname);
  const isBoardDetailRoute = isNoteBoardRoute || isChalkBoardRoute;
  /** Dashboard renders its own edge-to-edge panel layout — no page padding or scroll. */
  const isDashboardRoute = location.pathname === "/dashboard";

  return (
    <div className="app-editorial flex h-screen [height:100dvh] overflow-hidden bg-background text-foreground">
      <TutorialOverlay />
      {sidebarWorkspace.dialogs}
      <CreateBoardDialog
        isOpen={isCreateOpen}
        error={createBoardError}
        createNotebookError={createNotebookError}
        canCreateNotebook={notebookCount < 5}
        initialTab={createInitialTab}
        onClose={() => {
          closeCreate();
          if (tutorial.isActive && tutorial.currentStep?.id === "board-title") {
            tutorial.retreatStep();
          }
        }}
        onCreateBoard={handleCreateBoard}
        onCreateProject={handleCreateProject}
        onCreateNotebook={handleCreateNotebook}
      />
      {/* Desktop: sidebar in flow; mobile: sidebar only as overlay when open */}
      {!isMobile && (
        <Sidebar
          isDrawer={false}
          openedBoards={openedBoards}
          onCloseBoard={closeBoard}
          pinnedBoards={pinnedBoards}
          pinnedProjects={pinnedProjects}
          pinnedNotebooks={pinnedNotebooks}
          onUnpinBoard={handleUnpinBoard}
          onUnpinProject={handleUnpinProject}
          onUnpinNotebook={handleUnpinNotebook}
          getProjectCardProps={sidebarWorkspace.getProjectCardProps}
          getBoardCardProps={sidebarWorkspace.getBoardCardProps}
          getNotebookCardProps={sidebarWorkspace.getNotebookCardProps}
          onRenameProject={sidebarWorkspace.renameProject}
          onRenameBoard={sidebarWorkspace.renameBoard}
          onRenameNotebook={sidebarWorkspace.renameNotebook}
          resolveBoardDto={sidebarWorkspace.resolveBoardDto}
          dashboardBoardToolsActive={dashboardActiveBoardType !== null}
          dashboardActiveBoardIsChalk={dashboardActiveBoardType === "ChalkBoard"}
          onRequestCreate={requestCreate}
        />
      )}
      {isMobile && (
        <>
          <button
            type="button"
            tabIndex={-1}
            className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ease-out motion-reduce:transition-none ${
              openMobile
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0"
            }`}
            onClick={toggleSidebar}
            aria-label="Close menu"
          />
          <div
            className={`fixed left-0 top-0 bottom-0 z-50 w-60 border-r border-[var(--land-rule)] transition-transform duration-300 ease-out motion-reduce:transition-none ${
              openMobile
                ? "translate-x-0 pointer-events-auto"
                : "-translate-x-full pointer-events-none"
            }`}
            aria-hidden={!openMobile}
          >
            <Sidebar
              isDrawer
              openedBoards={openedBoards}
              onCloseBoard={closeBoard}
              pinnedBoards={pinnedBoards}
              pinnedProjects={pinnedProjects}
              pinnedNotebooks={pinnedNotebooks}
              onUnpinBoard={handleUnpinBoard}
              onUnpinProject={handleUnpinProject}
              onUnpinNotebook={handleUnpinNotebook}
              getProjectCardProps={sidebarWorkspace.getProjectCardProps}
              getBoardCardProps={sidebarWorkspace.getBoardCardProps}
              getNotebookCardProps={sidebarWorkspace.getNotebookCardProps}
              onRenameProject={sidebarWorkspace.renameProject}
              onRenameBoard={sidebarWorkspace.renameBoard}
              onRenameNotebook={sidebarWorkspace.renameNotebook}
              resolveBoardDto={sidebarWorkspace.resolveBoardDto}
            />
          </div>
        </>
      )}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {!isBoardDetailRoute && (
          <Navbar
            boardName={boardName}
            connectedUsers={connectedUsers}
            onToggleSidebar={isMobile ? toggleSidebar : undefined}
            showMenuButton={isMobile}
          />
        )}
        <main
          className={
            isBoardDetailRoute
              ? "flex min-h-0 flex-1 flex-col overflow-hidden p-0"
              : isDashboardRoute
                ? "scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto p-0 lg:overflow-hidden"
                : "flex-1 overflow-auto p-4 bg-background"
          }
        >
          {isBoardDetailRoute || isDashboardRoute ? (
            <Outlet context={outletContext} />
          ) : (
            <div
              key={location.pathname}
              className="animate-page-enter motion-reduce:animate-none h-full"
            >
              <Outlet context={outletContext} />
            </div>
          )}
        </main>
        {isBoardDetailRoute && isMobile && boardOpenArrowVisible && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="fixed left-0 top-1/2 z-[100] flex -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-[var(--land-rule)] bg-[var(--land-paper)] py-3 pl-px pr-1 text-[var(--land-ink-2)] transition-opacity duration-200 hover:bg-[var(--land-cream)]"
            aria-label="Open sidebar"
          >
            <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}
