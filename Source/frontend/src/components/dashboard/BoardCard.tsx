import { useEffect, useRef, useState } from "react";
import {
  useFixedPortalInViewport,
  useNudgeDropdownToViewport,
  useSubmenuFlyoutPosition,
} from "../../lib/useDropdownViewport";
import { ProjectMoveFlyout } from "./ProjectMoveFlyout";
import { createPortal } from "react-dom";
import {
  StickyNote,
  CreditCard,
  ClipboardList,
  Calendar,
  PenTool,
  MoreVertical,
  Pencil,
  Folder,
  FolderMinus,
  FolderOpen,
  Pin,
  PinOff,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import type { BoardSummaryDto, ProjectSummaryDto } from "../../types";
import { getSidebarEllipsisMenuAnchor } from "../../lib/sidebar-menu-anchor";

interface BoardCardProps {
  board: BoardSummaryDto;
  /** Permanent delete. Can be combined with `onRemoveFromProject` (e.g. project tab). */
  onDelete?: (id: string) => void;
  /** Project tab: unlink board from project without deleting it. */
  onRemoveFromProject?: (id: string) => void;
  onRename?: (id: string, currentName: string) => void;
  onMoveToProject?: (boardId: string, projectId: string, folderId?: string) => void;
  /** Project tab: move board between folders within the project. */
  projectFolders?: { id: string; name: string }[];
  onSetProjectFolder?: (boardId: string, folderId: string | null) => void;
  onTogglePin?: (id: string, isPinned: boolean) => void;
  activeProjects?: ProjectSummaryDto[];
  /** Compact row for sidebar — same ellipsis / context menu as dashboard cards. */
  layout?: "card" | "sidebarRow";
  /** When `layout="sidebarRow"`, hide the label when the sidebar is collapsed (icon-only). */
  sidebarShowLabel?: boolean;
}

const BOARD_TYPE_CONFIG: Record<
  string,
  { icon: typeof StickyNote; label: string; tapeColor: string; iconBg: string }
> = {
  NoteBoard: {
    icon: ClipboardList,
    label: "Note Board",
    tapeColor: "bg-amber-400/60 dark:bg-amber-500/40",
    iconBg: "bg-amber-100/80 dark:bg-amber-900/30",
  },
  ChalkBoard: {
    icon: PenTool,
    label: "Chalk Board",
    tapeColor: "bg-slate-400/60 dark:bg-slate-500/40",
    iconBg: "bg-slate-100/80 dark:bg-slate-900/30",
  },
  Calendar: {
    icon: Calendar,
    label: "Calendar",
    tapeColor: "bg-sky-400/60 dark:bg-sky-500/40",
    iconBg: "bg-sky-100/80 dark:bg-sky-900/30",
  },
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function getBoardRoute(board: BoardSummaryDto): string {
  if (board.boardType === "ChalkBoard") return `/chalkboards/${board.id}`;
  return `/boards/${board.id}`;
}

export function BoardCard({
  board,
  onDelete,
  onRemoveFromProject,
  onRename,
  onMoveToProject,
  projectFolders = [],
  onSetProjectFolder,
  onTogglePin,
  activeProjects = [],
  layout = "card",
  sidebarShowLabel = true,
}: BoardCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const config = BOARD_TYPE_CONFIG[board.boardType] ?? BOARD_TYPE_CONFIG.NoteBoard;
  const Icon = config.icon;
  const projectName = board.projectId
    ? activeProjects.find((p) => p.id === board.projectId)?.name
    : null;
  const boardPath = getBoardRoute(board);
  const isBoardRouteActive = location.pathname === boardPath;
  const isSidebarRow = layout === "sidebarRow";
  const menuDropdownTopClass = isSidebarRow ? "top-full mt-0.5" : "top-7";
  /** w-48 — must match portal / inline panel width for sidebar ellipsis positioning */
  const SIDEBAR_MENU_WIDTH_PX = 192;
  const showMenuActions = Boolean(
    onRename ?? onMoveToProject ?? onSetProjectFolder ?? onTogglePin,
  );
  const hasEllipsisMenu = Boolean(
    onRename ??
      onSetProjectFolder ??
      onRemoveFromProject ??
      onDelete ??
      onMoveToProject ??
      onTogglePin,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<"ellipsis" | { x: number; y: number }>("ellipsis");
  const [showProjectList, setShowProjectList] = useState(false);
  const [showFolderList, setShowFolderList] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const ellipsisMenuPanelRef = useRef<HTMLDivElement>(null);
  const portalMenuRef = useRef<HTMLDivElement>(null);
  const folderSubmenuAnchorRef = useRef<HTMLDivElement>(null);
  const folderFlyoutPortalRef = useRef<HTMLDivElement>(null);
  const projectSubmenuAnchorRef = useRef<HTMLDivElement>(null);
  const projectFlyoutPortalRef = useRef<HTMLDivElement>(null);
  const projectNestedFlyoutPortalRef = useRef<HTMLDivElement>(null);
  const folderHoverTimerRef = useRef<number | null>(null);
  const projectHoverTimerRef = useRef<number | null>(null);

  function clearFolderHoverTimer() {
    if (folderHoverTimerRef.current != null) {
      window.clearTimeout(folderHoverTimerRef.current);
      folderHoverTimerRef.current = null;
    }
  }
  function scheduleFolderClose() {
    clearFolderHoverTimer();
    folderHoverTimerRef.current = window.setTimeout(() => {
      folderHoverTimerRef.current = null;
      setShowFolderList(false);
    }, 150);
  }
  function clearProjectHoverTimer() {
    if (projectHoverTimerRef.current != null) {
      window.clearTimeout(projectHoverTimerRef.current);
      projectHoverTimerRef.current = null;
    }
  }
  function scheduleProjectClose() {
    clearProjectHoverTimer();
    projectHoverTimerRef.current = window.setTimeout(() => {
      projectHoverTimerRef.current = null;
      setShowProjectList(false);
    }, 150);
  }

  useNudgeDropdownToViewport(
    menuOpen && menuAnchor === "ellipsis" && !isSidebarRow,
    ellipsisMenuPanelRef,
  );
  useFixedPortalInViewport(menuOpen && menuAnchor !== "ellipsis", portalMenuRef);

  const folderFlyoutPos = useSubmenuFlyoutPosition(showFolderList, folderSubmenuAnchorRef);
  useFixedPortalInViewport(showFolderList, folderFlyoutPortalRef);

  const closeMenu = () => {
    clearFolderHoverTimer();
    clearProjectHoverTimer();
    setMenuOpen(false);
    setMenuAnchor("ellipsis");
    setShowProjectList(false);
    setShowFolderList(false);
  };

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inMenu = menuRef.current?.contains(target) ?? false;
      const inPortal = portalMenuRef.current?.contains(target) ?? false;
      const inFolderFlyout = folderFlyoutPortalRef.current?.contains(target) ?? false;
      const inProjectFlyout = projectFlyoutPortalRef.current?.contains(target) ?? false;
      const inProjectNestedFlyout =
        projectNestedFlyoutPortalRef.current?.contains(target) ?? false;
      if (!inMenu && !inPortal && !inFolderFlyout && !inProjectFlyout && !inProjectNestedFlyout) {
        setMenuOpen(false);
        setMenuAnchor("ellipsis");
        setShowProjectList(false);
        setShowFolderList(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMenuAnchor("ellipsis");
        setShowProjectList(false);
        setShowFolderList(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    return () => {
      if (folderHoverTimerRef.current != null) window.clearTimeout(folderHoverTimerRef.current);
      if (projectHoverTimerRef.current != null) window.clearTimeout(projectHoverTimerRef.current);
    };
  }, []);

  return (
    <div
      role={isSidebarRow ? undefined : "button"}
      tabIndex={isSidebarRow ? undefined : 0}
      onClick={isSidebarRow ? undefined : () => navigate(boardPath)}
      onContextMenu={(e) => {
        if (!hasEllipsisMenu) return;
        e.preventDefault();
        e.stopPropagation();
        setMenuAnchor({ x: e.clientX, y: e.clientY });
        setMenuOpen(true);
      }}
      onKeyDown={
        isSidebarRow
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(boardPath);
              }
            }
      }
      className={[
        isSidebarRow
          ? [
              "group relative flex w-full min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150 motion-reduce:transition-none",
              isBoardRouteActive
                ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                : "text-foreground/60 hover:bg-foreground/[0.04] hover:text-foreground",
            ].join(" ")
          : "paper-card group relative flex cursor-pointer flex-col rounded-lg p-5 pt-7 text-left transition-[transform,box-shadow] duration-200 ease-out-smooth hover:-translate-y-1.5 hover:shadow-lg active:translate-y-0 active:shadow-md motion-reduce:transition-none motion-reduce:hover:transform-none focus:outline-none focus:ring-2 focus:ring-primary/20",
        menuOpen ? "z-50 overflow-visible" : "",
      ].join(" ")}
    >
      {isSidebarRow ? (
        <div
          role="button"
          tabIndex={0}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left outline-none focus:ring-2 focus:ring-primary/20 rounded-md"
          onClick={() => navigate(boardPath)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate(boardPath);
            }
          }}
        >
          {board.isPinned && (
            <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
          )}
          <Icon
            className={`h-4 w-4 shrink-0 ${
              isBoardRouteActive ? "text-amber-600 dark:text-amber-400" : "text-foreground/40"
            }`}
          />
          {sidebarShowLabel && (
            <span className="min-w-0 flex-1 truncate text-xs font-medium">{board.name}</span>
          )}
        </div>
      ) : (
        <>
          {/* Colored tape strip at top */}
          <div
            className={`absolute inset-x-0 top-0 h-1.5 rounded-t-lg ${config.tapeColor}`}
          />

          {/* Pin indicator */}
          {board.isPinned && (
            <div className="absolute left-3 top-3 z-10">
              <Pin className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
            </div>
          )}

          {/* Project name (top right when board is in a project) */}
          {projectName && (
            <div
              className="absolute right-12 top-3 z-10 max-w-[9rem] truncate rounded bg-foreground/10 px-2 py-0.5 text-right text-[10px] font-medium text-foreground/60"
              title={projectName}
            >
              {projectName}
            </div>
          )}
        </>
      )}

      {/* Ellipsis menu button */}
      {hasEllipsisMenu && (
      <div
        ref={menuRef}
        className={
          isSidebarRow
            ? "relative z-10 shrink-0"
            : "absolute right-3 top-3 z-10"
        }
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setShowProjectList(false);
            setShowFolderList(false);
            if (isSidebarRow) {
              const trigger = e.currentTarget as HTMLElement;
              if (menuOpen) {
                setMenuOpen(false);
                setMenuAnchor("ellipsis");
              } else {
                setMenuAnchor(getSidebarEllipsisMenuAnchor(trigger, SIDEBAR_MENU_WIDTH_PX));
                setMenuOpen(true);
              }
              return;
            }
            setMenuAnchor("ellipsis");
            setMenuOpen((v) => !v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              setShowProjectList(false);
              setShowFolderList(false);
              if (isSidebarRow) {
                const trigger = e.currentTarget as HTMLElement;
                if (menuOpen) {
                  setMenuOpen(false);
                  setMenuAnchor("ellipsis");
                } else {
                  setMenuAnchor(getSidebarEllipsisMenuAnchor(trigger, SIDEBAR_MENU_WIDTH_PX));
                  setMenuOpen(true);
                }
                return;
              }
              setMenuAnchor("ellipsis");
              setMenuOpen((v) => !v);
            }
          }}
          className="rounded-lg p-1 text-foreground/30 opacity-0 transition-[colors,opacity] duration-150 hover:bg-foreground/5 hover:text-foreground/60 group-hover:opacity-100 motion-reduce:transition-none"
          title="Board actions"
        >
          <MoreVertical className="h-4 w-4" />
        </div>

        {/* Dropdown menu (dashboard cards only — sidebar uses fixed portal) */}
        {menuOpen && menuAnchor === "ellipsis" && !isSidebarRow && (
          <div
            ref={ellipsisMenuPanelRef}
            className={`absolute right-0 ${menuDropdownTopClass} z-20 max-h-[min(70vh,calc(100vh-2rem))] w-48 max-w-[min(12rem,calc(100vw-1rem))] overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-lg`}
          >
            {onRename && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onRename(board.id, board.name);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Rename
              </button>
            )}

            {onSetProjectFolder && (
              <div
                ref={folderSubmenuAnchorRef}
                className="relative"
                onMouseEnter={() => {
                  clearFolderHoverTimer();
                  setShowFolderList(true);
                  setShowProjectList(false);
                }}
                onMouseLeave={() => scheduleFolderClose()}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFolderHoverTimer();
                    setShowFolderList(true);
                    setShowProjectList(false);
                  }}
                >
                  <Folder className="h-3.5 w-3.5" />
                  Add to folder
                  <ChevronRight className="ml-auto h-3 w-3 text-foreground/30" />
                </button>
              </div>
            )}

            {onMoveToProject && (
            <div
              ref={projectSubmenuAnchorRef}
              className="relative"
              onMouseEnter={() => {
                clearProjectHoverTimer();
                setShowProjectList(true);
                setShowFolderList(false);
              }}
              onMouseLeave={() => scheduleProjectClose()}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                onClick={(e) => {
                  e.stopPropagation();
                  clearProjectHoverTimer();
                  setShowProjectList(true);
                  setShowFolderList(false);
                }}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Move to Project
                <ChevronRight className="ml-auto h-3 w-3 text-foreground/30" />
              </button>
            </div>
            )}

            {onTogglePin && (
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
              onClick={(e) => {
                e.stopPropagation();
                closeMenu();
                onTogglePin(board.id, !board.isPinned);
              }}
            >
              {board.isPinned ? (
                <>
                  <PinOff className="h-3.5 w-3.5" />
                  Unpin from Sidebar
                </>
              ) : (
                <>
                  <Pin className="h-3.5 w-3.5" />
                  Pin to Sidebar
                </>
              )}
            </button>
            )}

            {(showMenuActions || onRemoveFromProject || onDelete) && (
              <div className="my-1 border-t border-border/50" />
            )}

            {onRemoveFromProject && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onRemoveFromProject(board.id);
                }}
              >
                <FolderMinus className="h-3.5 w-3.5" />
                Remove from Project
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onDelete(board.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
        )}
        {menuOpen && menuAnchor !== "ellipsis" &&
          createPortal(
            <div
              ref={portalMenuRef}
              className="fixed z-[100] max-h-[min(70vh,calc(100vh-2rem))] w-48 max-w-[min(12rem,calc(100vw-1rem))] overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-lg"
              style={{ left: menuAnchor.x, top: menuAnchor.y }}
            >
              {onRename && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    onRename(board.id, board.name);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </button>
              )}
              {onSetProjectFolder && (
                <div
                  ref={folderSubmenuAnchorRef}
                  className="relative"
                  onMouseEnter={() => {
                    clearFolderHoverTimer();
                    setShowFolderList(true);
                    setShowProjectList(false);
                  }}
                  onMouseLeave={() => scheduleFolderClose()}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFolderHoverTimer();
                      setShowFolderList(true);
                      setShowProjectList(false);
                    }}
                  >
                    <Folder className="h-3.5 w-3.5" />
                    Add to folder
                    <ChevronRight className="ml-auto h-3 w-3 text-foreground/30" />
                  </button>
                </div>
              )}
              {onMoveToProject && (
                <div
                  ref={projectSubmenuAnchorRef}
                  className="relative"
                  onMouseEnter={() => {
                    clearProjectHoverTimer();
                    setShowProjectList(true);
                    setShowFolderList(false);
                  }}
                  onMouseLeave={() => scheduleProjectClose()}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearProjectHoverTimer();
                      setShowProjectList(true);
                      setShowFolderList(false);
                    }}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Move to Project
                    <ChevronRight className="ml-auto h-3 w-3 text-foreground/30" />
                  </button>
                </div>
              )}
              {onTogglePin && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    onTogglePin(board.id, !board.isPinned);
                  }}
                >
                  {board.isPinned ? (
                    <>
                      <PinOff className="h-3.5 w-3.5" />
                      Unpin from Sidebar
                    </>
                  ) : (
                    <>
                      <Pin className="h-3.5 w-3.5" />
                      Pin to Sidebar
                    </>
                  )}
                </button>
              )}
              {(showMenuActions || onRemoveFromProject || onDelete) && (
                <div className="my-1 border-t border-border/50" />
              )}
              {onRemoveFromProject && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    onRemoveFromProject(board.id);
                  }}
                >
                  <FolderMinus className="h-3.5 w-3.5" />
                  Remove from Project
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    onDelete(board.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              )}
            </div>,
            document.body,
          )}
      </div>
      )}

      {!isSidebarRow && (
        <>
          {/* Icon */}
          <div
            className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${config.iconBg}`}
          >
            <Icon className="h-5 w-5 text-foreground/60" />
          </div>

          {/* Name */}
          <h3 className="mb-1 truncate pr-6 text-sm font-semibold text-foreground">
            {board.name}
          </h3>

          {/* Description */}
          {board.description && (
            <p className="mb-3 line-clamp-2 text-xs text-foreground/50">
              {board.description}
            </p>
          )}

          {/* Footer — ruled-line separator */}
          <div className="mt-auto flex items-center gap-3 border-t border-blue-200/25 pt-3 text-xs text-foreground/40 dark:border-blue-300/10">
            <span className="flex items-center gap-1">
              <StickyNote className="h-3 w-3" />
              {board.noteCount}
            </span>
            <span className="flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              {board.indexCardCount}
            </span>
            <span className="ml-auto">{formatRelativeDate(board.updatedAt)}</span>
          </div>
        </>
      )}

      {showFolderList && folderFlyoutPos && onSetProjectFolder &&
        createPortal(
          <div
            ref={folderFlyoutPortalRef}
            className="fixed z-[200] max-h-56 w-48 overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-lg"
            style={{ top: folderFlyoutPos.top, left: folderFlyoutPos.left }}
            onMouseEnter={clearFolderHoverTimer}
            onMouseLeave={scheduleFolderClose}
          >
            {board.projectFolderId ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onSetProjectFolder(board.id, null);
                }}
              >
                <FolderMinus className="h-3.5 w-3.5 shrink-0" />
                Remove from folder
              </button>
            ) : projectFolders.length > 0 ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-primary transition-colors hover:bg-foreground/5"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onSetProjectFolder(board.id, null);
                }}
              >
                Not in a folder
                <span className="ml-auto text-[10px] text-foreground/40">Current</span>
              </button>
            ) : (
              <div className="px-3 py-2 text-xs text-foreground/40">No folders yet</div>
            )}
            {projectFolders.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition-colors hover:bg-foreground/5 ${
                  board.projectFolderId === f.id ? "text-primary" : "text-foreground/70"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onSetProjectFolder(board.id, f.id);
                }}
              >
                <span className="truncate">{f.name}</span>
                {board.projectFolderId === f.id && (
                  <span className="ml-auto shrink-0 text-[10px] text-foreground/40">Current</span>
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}

      {showProjectList && onMoveToProject && (
        <ProjectMoveFlyout
          show={showProjectList}
          anchorRef={projectSubmenuAnchorRef}
          flyoutPortalRef={projectFlyoutPortalRef}
          nestedFlyoutPortalRef={projectNestedFlyoutPortalRef}
          activeProjects={activeProjects}
          currentProjectId={board.projectId}
          currentFolderId={board.projectFolderId}
          onPick={(projectId, folderId) => onMoveToProject(board.id, projectId, folderId)}
          onClose={closeMenu}
          clearParentHoverTimer={clearProjectHoverTimer}
          scheduleParentClose={scheduleProjectClose}
        />
      )}
    </div>
  );
}
