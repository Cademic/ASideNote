import type { MouseEvent } from "react";
import {
  LayoutDashboard,
  StickyNote,
  Image as ImageIcon,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Calendar,
  X,
  ClipboardList,
  PenTool,
  Pin,
  BookOpen,
  ShieldCheck,
  LayoutGrid,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { BoardPresenceUser, OpenedBoard } from "./AppLayout";
import { BoardConnectedUsersSidebar } from "../dashboard/BoardConnectedUsers";
import type { BoardSummaryDto, NotebookSummaryDto, ProjectSummaryDto } from "../../types";
import { ProjectCard } from "../projects/ProjectCard";
import { BoardCard } from "../dashboard/BoardCard";
import { NotebookCard } from "../notebooks/NotebookCard";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  /** When true, sidebar is shown as overlay drawer (mobile); no collapse chevron, show close button */
  isDrawer?: boolean;
  openedBoards: OpenedBoard[];
  onCloseBoard: (id: string) => void;
  pinnedBoards: BoardSummaryDto[];
  pinnedProjects: ProjectSummaryDto[];
  pinnedNotebooks: NotebookSummaryDto[];
  onUnpinBoard: (id: string) => void;
  onUnpinProject: (id: string) => void;
  onUnpinNotebook: (id: string) => void;
  /** When the board SignalR hub is connected, presence is shown here instead of the board toolbar. */
  connectedUsers: BoardPresenceUser[];
  boardHubConnected: boolean;
  getProjectCardProps: () => {
    onRename?: (id: string, currentName: string) => void;
    onTogglePin?: (id: string, isPinned: boolean) => void;
    onDelete?: (id: string) => void;
    onLeave?: (id: string) => void;
    onProjectUpdated?: () => void;
  };
  getBoardCardProps: () => {
    onDelete?: (id: string) => void;
    onRename?: (id: string, currentName: string) => void;
    onMoveToProject?: (boardId: string, projectId: string, folderId?: string) => void;
    onTogglePin?: (id: string, isPinned: boolean) => void;
    activeProjects?: ProjectSummaryDto[];
  };
  getNotebookCardProps: () => {
    onOpen: (id: string) => void;
    onRename?: (id: string, currentName: string) => void;
    onTogglePin?: (id: string, isPinned: boolean) => void;
    onDelete?: (id: string) => void;
    onAddToProject?: (notebookId: string, projectId: string, folderId?: string) => void;
    activeProjects?: ProjectSummaryDto[];
  };
  resolveBoardDto: (id: string) => BoardSummaryDto | undefined;
}

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/projects", icon: FolderOpen, label: "Projects" },
  { to: "/notebooks", icon: BookOpen, label: "Notebook" },
  { to: "/boards", icon: LayoutGrid, label: "Boards" },
];

const BOARD_TOOLS = [
  {
    type: "sticky-note",
    icon: StickyNote,
    label: "Sticky Note",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    swatchColor: "bg-yellow-400",
  },
  {
    type: "index-card",
    icon: CreditCard,
    label: "Index Card",
    iconColor: "text-sky-600 dark:text-sky-400",
    swatchColor: "bg-sky-400",
  },
  {
    type: "image-card",
    icon: ImageIcon,
    label: "Image",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    swatchColor: "bg-emerald-400",
  },
];

const BOARD_TYPE_ICON: Record<string, typeof ClipboardList> = {
  NoteBoard: ClipboardList,
  ChalkBoard: PenTool,
  Calendar: Calendar,
};

function getBoardPath(board: OpenedBoard): string {
  if (board.boardType === "ChalkBoard") return `/chalkboards/${board.id}`;
  return `/boards/${board.id}`;
}

export function Sidebar({
  isOpen,
  onToggle,
  isDrawer = false,
  openedBoards,
  onCloseBoard,
  pinnedBoards,
  pinnedProjects,
  pinnedNotebooks,
  onUnpinBoard,
  onUnpinProject,
  onUnpinNotebook,
  connectedUsers,
  boardHubConnected,
  getProjectCardProps,
  getBoardCardProps,
  getNotebookCardProps,
  resolveBoardDto,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isOnBoardPage = location.pathname.startsWith("/boards/");
  const isOnChalkBoardPage = location.pathname.startsWith("/chalkboards/") && location.pathname !== "/chalkboards";
  const isOnAnyBoardPage = isOnBoardPage || isOnChalkBoardPage;

  // Don't show pinned boards in the "Opened Boards" section
  const pinnedIds = new Set(pinnedBoards.map((b) => b.id));
  const filteredOpenedBoards = openedBoards.filter((b) => !pinnedIds.has(b.id));

  function isActive(path: string) {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    if (path === "/notebooks") return location.pathname === "/notebooks" || location.pathname.startsWith("/notebooks/");
    return location.pathname.startsWith(path);
  }

  function isBoardActive(board: OpenedBoard): boolean {
    const boardPath = getBoardPath(board);
    return location.pathname === boardPath;
  }

  function handleCloseBoard(e: MouseEvent, board: OpenedBoard) {
    e.preventDefault();
    e.stopPropagation();
    const wasActive = isBoardActive(board);
    onCloseBoard(board.id);
    // If closing the currently viewed board, navigate to dashboard
    if (wasActive) {
      navigate("/dashboard");
    }
  }

  const expanded = isDrawer || isOpen;

  return (
    <aside
      className={[
        "sidebar-surface relative flex h-screen flex-col transition-[width] duration-200 ease-out-smooth motion-reduce:transition-none",
        expanded ? "w-60" : "w-16",
      ].join(" ")}
    >
      {/* Brand — logo + close (drawer) */}
      <div
        className={[
          "sidebar-brand flex h-14 items-center px-4",
          isDrawer ? "justify-between" : "justify-center",
        ].join(" ")}
      >
        <Link
          to="/"
          className="flex shrink-0 items-center justify-center"
          title="ASideNote"
        >
          <img
            src={expanded ? "/asidenote-logo.png" : "/asidenote-logo-square.png"}
            alt="ASideNote"
            className={["shrink-0 object-contain", expanded ? "h-14 w-auto" : "h-12 w-12"].join(" ")}
          />
        </Link>
        {isDrawer && (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.label}
              to={item.to}
              title={item.label}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none",
                active
                  ? "sidebar-nav-active bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  : "text-foreground/60 hover:bg-foreground/[0.04] hover:text-foreground",
                !expanded && "justify-center",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <item.icon
                className={`h-5 w-5 flex-shrink-0 ${
                  active ? "text-amber-600 dark:text-amber-400" : ""
                }`}
              />
              {expanded && <span>{item.label}</span>}
            </Link>
          );
        })}
        {user?.role === "Admin" && (
          <Link
            to="/admin"
            title="Admin"
            className={[
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none",
              isActive("/admin")
                ? "sidebar-nav-active bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                : "text-foreground/60 hover:bg-foreground/[0.04] hover:text-foreground",
              !expanded && "justify-center",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <ShieldCheck
              className={`h-5 w-5 flex-shrink-0 ${
                isActive("/admin") ? "text-amber-600 dark:text-amber-400" : ""
              }`}
            />
            {expanded && <span>Admin</span>}
          </Link>
        )}
      </nav>

      {/* Pinned (projects, notebooks, boards) */}
      {(pinnedProjects.length > 0 || pinnedNotebooks.length > 0 || pinnedBoards.length > 0) && (
        <div className="flex flex-col border-t border-border/40 overflow-hidden">
          {expanded && (
            <span className="px-6 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/35 flex-shrink-0 flex items-center gap-1">
              <Pin className="h-3 w-3" />
              Pinned
            </span>
          )}
          {!isOpen && !isDrawer && (
            <span className="pt-3 pb-1 text-center text-[9px] font-semibold uppercase tracking-wider text-foreground/30 flex-shrink-0">
              <Pin className="mx-auto h-3 w-3" />
            </span>
          )}
          <div className="overflow-y-auto px-3 pb-2 flex flex-col gap-0.5 max-h-48 scrollbar-thin">
            {pinnedProjects.map((project) => (
              <div
                key={`project-${project.id}`}
                className={["group flex items-center gap-0.5", !expanded && "justify-center"].filter(Boolean).join(" ")}
              >
                <div className="min-w-0 flex-1">
                  <ProjectCard
                    layout="sidebarRow"
                    sidebarShowLabel={expanded}
                    project={project}
                    {...getProjectCardProps()}
                  />
                </div>
                {expanded && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onUnpinProject(project.id);
                    }}
                    className="flex-shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-foreground/10"
                    title="Unpin project"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {pinnedNotebooks.map((notebook) => (
              <div
                key={`notebook-${notebook.id}`}
                className={["group flex items-center gap-0.5", !expanded && "justify-center"].filter(Boolean).join(" ")}
              >
                <div className="min-w-0 flex-1">
                  <NotebookCard
                    layout="sidebarRow"
                    sidebarShowLabel={expanded}
                    notebook={notebook}
                    {...getNotebookCardProps()}
                  />
                </div>
                {expanded && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onUnpinNotebook(notebook.id);
                    }}
                    className="flex-shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-foreground/10"
                    title="Unpin notebook"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {pinnedBoards.map((board) => (
              <div
                key={`board-${board.id}`}
                className={["group flex items-center gap-0.5", !expanded && "justify-center"].filter(Boolean).join(" ")}
              >
                <div className="min-w-0 flex-1">
                  <BoardCard
                    layout="sidebarRow"
                    sidebarShowLabel={expanded}
                    board={board}
                    {...getBoardCardProps()}
                  />
                </div>
                {expanded && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onUnpinBoard(board.id);
                    }}
                    className="flex-shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-foreground/10"
                    title="Unpin board"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opened */}
      {filteredOpenedBoards.length > 0 && (
        <div className="flex flex-col border-t border-border/40 overflow-hidden">
          {expanded && (
            <span className="px-6 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/35 flex-shrink-0">
              Opened
            </span>
          )}
          {!isOpen && !isDrawer && (
            <span className="pt-3 pb-1 text-center text-[9px] font-semibold uppercase tracking-wider text-foreground/30 flex-shrink-0">
              Open
            </span>
          )}
          <div className="overflow-y-auto px-3 pb-2 flex flex-col gap-0.5 max-h-48 scrollbar-thin">
            {filteredOpenedBoards.map((board) => {
              const fullBoard = resolveBoardDto(board.id);
              if (!fullBoard) {
                const active = isBoardActive(board);
                const Icon = BOARD_TYPE_ICON[board.boardType] ?? ClipboardList;
                return (
                  <div
                    key={board.id}
                    className={["group flex items-center gap-0.5", !expanded && "justify-center"].filter(Boolean).join(" ")}
                  >
                    <Link
                      to={getBoardPath(board)}
                      title={board.name}
                      className={[
                        "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors duration-150 motion-reduce:transition-none",
                        active
                          ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                          : "text-foreground/60 hover:bg-foreground/[0.04] hover:text-foreground",
                        !expanded && "justify-center",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <Icon
                        className={`h-4 w-4 flex-shrink-0 ${
                          active ? "text-amber-600 dark:text-amber-400" : "text-foreground/40"
                        }`}
                      />
                      {expanded && (
                        <span className="flex-1 truncate text-xs font-medium">{board.name}</span>
                      )}
                    </Link>
                    {expanded && (
                      <button
                        type="button"
                        onClick={(e) => handleCloseBoard(e, board)}
                        className="flex-shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-foreground/10"
                        title="Close board"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              }
              return (
                <div
                  key={board.id}
                  className={["group flex items-center gap-0.5", !expanded && "justify-center"].filter(Boolean).join(" ")}
                >
                  <div className="min-w-0 flex-1">
                    <BoardCard
                      layout="sidebarRow"
                      sidebarShowLabel={expanded}
                      board={fullBoard}
                      {...getBoardCardProps()}
                    />
                  </div>
                  {expanded && (
                    <button
                      type="button"
                      onClick={(e) => handleCloseBoard(e, board)}
                      className="flex-shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-foreground/10"
                      title="Close board"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spacer to push board tools and user section to bottom */}
      <div className="flex-1" />

      {isOnAnyBoardPage && boardHubConnected && connectedUsers.length > 0 && (
        <BoardConnectedUsersSidebar users={connectedUsers} expanded={expanded} />
      )}

      {/* Board Tools — draggable stationery items */}
      {isOnAnyBoardPage && (
        <div className="border-t border-border/40 p-3">
          {expanded && (
            <span className="mb-1.5 block px-3 text-[10px] font-semibold uppercase tracking-wider text-foreground/35">
              Board Tools
            </span>
          )}
          <div className="flex flex-col gap-0.5">
            {(isOnChalkBoardPage
              ? BOARD_TOOLS.filter((t) => t.type === "sticky-note")
              : BOARD_TOOLS
            ).map((tool) => (
              <div
                key={tool.type}
                draggable="true"
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/board-item-type", tool.type);
                  e.dataTransfer.effectAllowed = "copy";
                  const iconEl = e.currentTarget.querySelector("svg");
                  if (iconEl) {
                    e.dataTransfer.setDragImage(iconEl, 12, 12);
                  }
                }}
                onClick={() => {
                  document.dispatchEvent(
                    new CustomEvent("board-tool-click", { detail: { type: tool.type } }),
                  );
                }}
                title={tool.label}
                className={[
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/60 transition-colors duration-150 hover:bg-foreground/[0.04] hover:text-foreground motion-reduce:transition-none",
                  !expanded && "justify-center",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="relative flex-shrink-0">
                  <tool.icon className={`h-5 w-5 ${tool.iconColor}`} />
                  <div
                    className={`sidebar-tool-swatch ${tool.swatchColor}`}
                  />
                </div>
                {expanded && <span>{tool.label}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User section */}
      <div className="border-t border-border/40 p-3">
        {expanded && user && (
          <button
            type="button"
            onClick={() => navigate(user?.username ? `/profile/${encodeURIComponent(user.username)}` : "/profile")}
            className="block w-full truncate px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground/35 transition-colors hover:text-foreground/60"
          >
            {user.username}
          </button>
        )}
      </div>

      {/* Collapse toggle — desktop only; drawer uses X in brand area */}
      {!isDrawer && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute -right-3 top-[4.25rem] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border/50 bg-amber-50 text-amber-700/60 shadow-sm transition-colors duration-150 hover:bg-amber-100 hover:text-amber-800 dark:bg-amber-950/60 dark:text-amber-400/60 dark:hover:bg-amber-900/50 dark:hover:text-amber-300 motion-reduce:transition-none"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? (
            <ChevronLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </aside>
  );
}
