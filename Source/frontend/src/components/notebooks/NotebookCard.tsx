import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, ChevronRight, FolderMinus, FolderOpen, MoreVertical, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import type { NotebookSummaryDto, ProjectSummaryDto } from "../../types";

interface NotebookCardProps {
  notebook: NotebookSummaryDto;
  onOpen: (id: string) => void;
  onRename?: (id: string, currentName: string) => void;
  onTogglePin?: (id: string, isPinned: boolean) => void;
  onDelete?: (id: string) => void;
  /** When in project context: removes notebook from project instead of deleting */
  onRemoveFromProject?: (id: string) => void;
  /** Add notebook to a project (dashboard context). */
  onAddToProject?: (notebookId: string, projectId: string) => void;
  /** Projects available for "Add to Project" (when onAddToProject is set). */
  activeProjects?: ProjectSummaryDto[];
}

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

export function NotebookCard({ notebook, onOpen, onRename, onTogglePin, onDelete, onRemoveFromProject, onAddToProject, activeProjects = [] }: NotebookCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<"ellipsis" | { x: number; y: number }>("ellipsis");
  const [showProjectList, setShowProjectList] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const portalMenuRef = useRef<HTMLDivElement>(null);
  const projectName = notebook.projectId
    ? activeProjects.find((p) => p.id === notebook.projectId)?.name
    : null;

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuAnchor("ellipsis");
    setShowProjectList(false);
  };

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inMenu = menuRef.current?.contains(target) ?? false;
      const inPortal = portalMenuRef.current?.contains(target) ?? false;
      if (!inMenu && !inPortal) {
        setMenuOpen(false);
        setMenuAnchor("ellipsis");
        setShowProjectList(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMenuAnchor("ellipsis");
        setShowProjectList(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const showMenu = Boolean(onRename ?? onTogglePin ?? onDelete ?? onRemoveFromProject ?? onAddToProject);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(notebook.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuAnchor({ x: e.clientX, y: e.clientY });
        setMenuOpen(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(notebook.id);
        }
      }}
      className={[
        "paper-card group relative flex cursor-pointer flex-col rounded-lg p-5 pt-7 text-left transition-[transform,box-shadow] duration-200 ease-out-smooth hover:-translate-y-1.5 hover:shadow-lg active:translate-y-0 active:shadow-md motion-reduce:transition-none motion-reduce:hover:transform-none focus:outline-none focus:ring-2 focus:ring-primary/20",
        menuOpen ? "z-50 overflow-visible" : "",
      ].join(" ")}
    >
      {/* Tape strip — reddish-brown / notebook cover */}
      <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-lg bg-amber-800/70 dark:bg-amber-900/60" />

      {notebook.isPinned && (
        <div className="absolute left-3 top-3 z-10">
          <Pin className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
        </div>
      )}

      {projectName && (
        <div
          className="absolute right-12 top-3 z-10 max-w-[9rem] truncate rounded bg-foreground/10 px-2 py-0.5 text-right text-[10px] font-medium text-foreground/60"
          title={projectName}
        >
          {projectName}
        </div>
      )}

      {/* Ellipsis menu */}
      <div
        ref={menuRef}
        className="absolute right-3 top-3 z-10"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setMenuAnchor("ellipsis");
            setMenuOpen((v) => !v);
            setShowProjectList(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              setMenuAnchor("ellipsis");
              setMenuOpen((v) => !v);
            }
          }}
          className="rounded-lg p-1 text-foreground/30 opacity-0 transition-[colors,opacity] duration-150 hover:bg-foreground/5 hover:text-foreground/60 group-hover:opacity-100 motion-reduce:transition-none"
          title="Notebook actions"
        >
          <MoreVertical className="h-4 w-4" />
        </div>

        {menuOpen && showMenu && menuAnchor === "ellipsis" && (
          <div className="absolute right-0 top-7 z-20 w-48 rounded-lg border border-border bg-background py-1 shadow-lg">
            {onRename && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onRename(notebook.id, notebook.name);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Rename
              </button>
            )}

            {onAddToProject && (
              <div
                className="relative"
                onMouseEnter={() => setShowProjectList(true)}
                onMouseLeave={() => setShowProjectList(false)}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProjectList((v) => !v);
                  }}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  Add to Project
                  <ChevronRight className="ml-auto h-3 w-3 text-foreground/30" />
                </button>

                {showProjectList && (
                  <div className="absolute left-full top-0 z-30 pl-1">
                    <div className="w-44 rounded-lg border border-border bg-background py-1 shadow-lg">
                      {activeProjects.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-foreground/40">
                          No active projects
                        </div>
                      ) : (
                        activeProjects.map((project) => (
                          <button
                            key={project.id}
                            type="button"
                            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition-colors hover:bg-foreground/5 ${
                              notebook.projectId === project.id
                                ? "text-primary"
                                : "text-foreground/70"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              closeMenu();
                              setShowProjectList(false);
                              onAddToProject(notebook.id, project.id);
                            }}
                          >
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: project.color || "#8b5cf6" }}
                            />
                            <span className="truncate">{project.name}</span>
                            {notebook.projectId === project.id && (
                              <span className="ml-auto text-[10px] text-foreground/40">Current</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {onTogglePin && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onTogglePin(notebook.id, !notebook.isPinned);
                }}
              >
                {notebook.isPinned ? (
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
            {onRemoveFromProject && (
              <>
                {showMenu && <div className="my-1 border-t border-border/50" />}
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    onRemoveFromProject(notebook.id);
                  }}
                >
                  <FolderMinus className="h-3.5 w-3.5" />
                  Remove from Project
                </button>
              </>
            )}
            {onDelete && !onRemoveFromProject && (
              <>
                {showMenu && <div className="my-1 border-t border-border/50" />}
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    onDelete(notebook.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </>
            )}
          </div>
        )}
        {menuOpen && showMenu && menuAnchor !== "ellipsis" &&
          createPortal(
            <div
              ref={portalMenuRef}
              className="fixed z-[100] w-48 rounded-lg border border-border bg-background py-1 shadow-lg"
              style={{ left: menuAnchor.x, top: menuAnchor.y }}
            >
              {onRename && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    onRename(notebook.id, notebook.name);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </button>
              )}
              {onAddToProject && (
                <div
                  className="relative"
                  onMouseEnter={() => setShowProjectList(true)}
                  onMouseLeave={() => setShowProjectList(false)}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProjectList((v) => !v);
                    }}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Add to Project
                    <ChevronRight className="ml-auto h-3 w-3 text-foreground/30" />
                  </button>
                  {showProjectList && (
                    <div className="absolute left-full top-0 z-30 pl-1">
                      <div className="w-44 rounded-lg border border-border bg-background py-1 shadow-lg">
                        {activeProjects.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-foreground/40">
                            No active projects
                          </div>
                        ) : (
                          activeProjects.map((project) => (
                            <button
                              key={project.id}
                              type="button"
                              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition-colors hover:bg-foreground/5 ${
                                notebook.projectId === project.id
                                  ? "text-primary"
                                  : "text-foreground/70"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                closeMenu();
                                onAddToProject(notebook.id, project.id);
                              }}
                            >
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: project.color || "#8b5cf6" }}
                              />
                              <span className="truncate">{project.name}</span>
                              {notebook.projectId === project.id && (
                                <span className="ml-auto text-[10px] text-foreground/40">Current</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {onTogglePin && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    onTogglePin(notebook.id, !notebook.isPinned);
                  }}
                >
                  {notebook.isPinned ? (
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
              {onRemoveFromProject && (
                <>
                  {showMenu && <div className="my-1 border-t border-border/50" />}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeMenu();
                      onRemoveFromProject(notebook.id);
                    }}
                  >
                    <FolderMinus className="h-3.5 w-3.5" />
                    Remove from Project
                  </button>
                </>
              )}
              {onDelete && !onRemoveFromProject && (
                <>
                  {showMenu && <div className="my-1 border-t border-border/50" />}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeMenu();
                      onDelete(notebook.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </>
              )}
            </div>,
            document.body,
          )}
      </div>

      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100/80 dark:bg-amber-900/30">
        <BookOpen className="h-5 w-5 text-foreground/60" />
      </div>

      <h3 className="mb-1 truncate pr-6 text-sm font-semibold text-foreground">
        {notebook.name}
      </h3>

      <div className="mt-auto flex items-center gap-3 border-t border-blue-200/25 pt-3 text-xs text-foreground/40 dark:border-blue-300/10">
        <span className="flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          Document
        </span>
        <span className="ml-auto">{formatRelativeDate(notebook.updatedAt)}</span>
      </div>
    </div>
  );
}
