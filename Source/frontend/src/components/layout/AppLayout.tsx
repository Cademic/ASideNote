import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getPinnedBoards, toggleBoardPin } from "../../api/boards";
import { getPinnedProjects, toggleProjectPin } from "../../api/projects";
import { getPinnedNotebooks, toggleNotebookPin } from "../../api/notebooks";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../context/AuthContext";
import { useSessionPresence } from "../../hooks/useSessionPresence";
import type { BoardSummaryDto, NotebookSummaryDto, ProjectSummaryDto } from "../../types";

/** Tailwind `lg` breakpoint — below this: sidebar becomes hamburger drawer */
const SIDEBAR_BREAKPOINT = 1024;

/** Must match mobile drawer `duration-300` so the open-arrow waits for slide-out to finish */
const MOBILE_DRAWER_TRANSITION_MS = 300;

export interface OpenedBoard {
  id: string;
  name: string;
  boardType: string;
}

export interface BoardPresenceUser {
  userId: string;
  displayName: string;
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
  /** Desktop only: true when sidebar is expanded (w-60), false when collapsed (w-16). */
  isSidebarOpen: boolean;
  /** SignalR hub joined the current board (project boards only); drives sidebar vs toolbar presence UI. */
  boardHubConnected: boolean;
  setBoardHubConnected: (connected: boolean) => void;
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  useSessionPresence(isAuthenticated);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= SIDEBAR_BREAKPOINT);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < SIDEBAR_BREAKPOINT);
  const [boardName, setBoardName] = useState<string | null>(null);
  const [connectedUsers, setBoardPresence] = useState<BoardPresenceUser[]>([]);
  const [boardHubConnected, setBoardHubConnected] = useState(false);
  const [openedBoards, setOpenedBoards] = useState<OpenedBoard[]>([]);
  const [pinnedBoards, setPinnedBoards] = useState<BoardSummaryDto[]>([]);
  const [pinnedProjects, setPinnedProjects] = useState<ProjectSummaryDto[]>([]);
  const [pinnedNotebooks, setPinnedNotebooks] = useState<NotebookSummaryDto[]>([]);

  /** Track whether the user has manually toggled the sidebar since the last
   *  automatic resize change. When the breakpoint triggers we reset this flag
   *  so the auto-behaviour takes over again on the next cross. */
  const userToggledRef = useRef(false);
  /** For board-page open-arrow: delay showing until drawer close animation ends */
  const prevSidebarOpenForArrowRef = useRef(isSidebarOpen);
  const [boardOpenArrowVisible, setBoardOpenArrowVisible] = useState(true);

  /* ── Mobile vs desktop: hamburger drawer vs inline sidebar ──────────── */
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${SIDEBAR_BREAKPOINT}px)`);

    function handleChange(e: MediaQueryListEvent | MediaQueryList) {
      const desktop = e.matches;
      setIsMobile(!desktop);
      userToggledRef.current = false;
      setIsSidebarOpen(desktop);
    }

    handleChange(mql);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  /* ── Close mobile drawer on route change ──────────── */
  useEffect(() => {
    if (isMobile) setIsSidebarOpen(false);
  }, [isMobile, location.pathname]);

  /* ── Board page: show chevron only after drawer finishes sliding closed ─ */
  useEffect(() => {
    const isNoteBoardRoute = /^\/boards\/[^/]+$/.test(location.pathname);
    const isChalkBoardRoute = /^\/chalkboards\/[^/]+$/.test(location.pathname);
    const onBoardDetail = isNoteBoardRoute || isChalkBoardRoute;

    if (!onBoardDetail || !isMobile) {
      setBoardOpenArrowVisible(true);
      prevSidebarOpenForArrowRef.current = isSidebarOpen;
      return;
    }

    if (isSidebarOpen) {
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
  }, [isMobile, isSidebarOpen, location.pathname]);

  function handleToggleSidebar() {
    userToggledRef.current = true;
    setIsSidebarOpen((value) => !value);
  }

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

  const handleUnpinBoard = useCallback(async (id: string) => {
    try {
      await toggleBoardPin(id, false);
      await refreshPinnedBoards();
    } catch {
      // Fail silently
    }
  }, [refreshPinnedBoards]);

  const handleUnpinProject = useCallback(async (id: string) => {
    try {
      await toggleProjectPin(id, false);
      await refreshPinnedProjects();
    } catch {
      // Fail silently
    }
  }, [refreshPinnedProjects]);

  const handleUnpinNotebook = useCallback(async (id: string) => {
    try {
      await toggleNotebookPin(id, false);
      await refreshPinnedNotebooks();
    } catch {
      // Fail silently
    }
  }, [refreshPinnedNotebooks]);

  // Clear presence when leaving board or notebook editor routes
  useEffect(() => {
    const onBoard = /^\/boards\/[^/]+$/.test(location.pathname) || /^\/chalkboards\/[^/]+$/.test(location.pathname);
    const onNotebookEditor = /^\/notebooks\/[^/]+$/.test(location.pathname);
    if (!onBoard && !onNotebookEditor) {
      setBoardPresence([]);
      setBoardHubConnected(false);
    }
  }, [location.pathname]);

  // Fetch pinned boards, projects, and notebooks when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    refreshPinnedBoards();
    refreshPinnedProjects();
    refreshPinnedNotebooks();
  }, [isAuthenticated, refreshPinnedBoards, refreshPinnedProjects, refreshPinnedNotebooks]);

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
    boardHubConnected,
    setBoardHubConnected,
  };

  /** Note or chalk board detail — hide global navbar for maximum canvas space */
  const isNoteBoardRoute = /^\/boards\/[^/]+$/.test(location.pathname);
  const isChalkBoardRoute = /^\/chalkboards\/[^/]+$/.test(location.pathname);
  const isBoardDetailRoute = isNoteBoardRoute || isChalkBoardRoute;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Desktop: sidebar in flow; mobile: sidebar only as overlay when open */}
      {!isMobile && (
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={handleToggleSidebar}
          isDrawer={false}
          openedBoards={openedBoards}
          onCloseBoard={closeBoard}
          pinnedBoards={pinnedBoards}
          pinnedProjects={pinnedProjects}
          pinnedNotebooks={pinnedNotebooks}
          onOpenNotebook={openNotebook}
          onUnpinBoard={handleUnpinBoard}
          onUnpinProject={handleUnpinProject}
          onUnpinNotebook={handleUnpinNotebook}
          connectedUsers={connectedUsers}
          boardHubConnected={boardHubConnected}
        />
      )}
      {isMobile && (
        <>
          <button
            type="button"
            tabIndex={-1}
            className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-out motion-reduce:transition-none ${
              isSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={handleToggleSidebar}
            aria-label="Close menu"
          />
          <div
            className={`fixed left-0 top-0 bottom-0 z-50 w-60 shadow-xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
              isSidebarOpen
                ? "translate-x-0 pointer-events-auto"
                : "-translate-x-full pointer-events-none"
            }`}
            aria-hidden={!isSidebarOpen}
          >
            <Sidebar
              isOpen={isSidebarOpen}
              onToggle={handleToggleSidebar}
              isDrawer
              openedBoards={openedBoards}
              onCloseBoard={closeBoard}
              pinnedBoards={pinnedBoards}
              pinnedProjects={pinnedProjects}
              pinnedNotebooks={pinnedNotebooks}
              onOpenNotebook={openNotebook}
              onUnpinBoard={handleUnpinBoard}
              onUnpinProject={handleUnpinProject}
              onUnpinNotebook={handleUnpinNotebook}
              connectedUsers={connectedUsers}
              boardHubConnected={boardHubConnected}
            />
          </div>
        </>
      )}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {!isBoardDetailRoute && (
          <Navbar
            boardName={boardName}
            connectedUsers={connectedUsers}
            onToggleSidebar={isMobile ? handleToggleSidebar : undefined}
            showMenuButton={isMobile}
          />
        )}
        <main
          className={
            isBoardDetailRoute
              ? isNoteBoardRoute
                ? "flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4"
                : "flex min-h-0 flex-1 flex-col overflow-hidden p-0"
              : "flex-1 overflow-auto p-4"
          }
        >
          {isBoardDetailRoute ? (
            <Outlet context={outletContext} />
          ) : (
            <div key={location.key} className="animate-page-enter motion-reduce:animate-none h-full">
              <Outlet context={outletContext} />
            </div>
          )}
        </main>
        {isBoardDetailRoute && isMobile && boardOpenArrowVisible && (
          <button
            type="button"
            onClick={handleToggleSidebar}
            className="fixed left-0 top-1/2 z-[100] flex -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-foreground/15 bg-background/95 py-3 pl-px pr-1 text-foreground/80 shadow-sm backdrop-blur-sm transition-opacity duration-200 hover:bg-foreground/5"
            aria-label="Open sidebar"
          >
            <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}
