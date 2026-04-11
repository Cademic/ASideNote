import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNudgeDropdownToViewport } from "../../lib/useDropdownViewport";
import { ChevronDown, Folder, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { ProjectFolderDto } from "../../types";

interface ProjectNamedFolderHeaderProps {
  folder: ProjectFolderDto;
  accent: "violet" | "amber";
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  itemCount: number;
  canEdit: boolean;
  isRenaming: boolean;
  renameDraft: string;
  onRenameDraftChange: (value: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onRenameStart: () => void;
  onDelete: () => void;
  renameError: string | null;
}

export function ProjectNamedFolderHeader({
  folder,
  accent,
  isCollapsed,
  onToggleCollapse,
  itemCount,
  canEdit,
  isRenaming,
  renameDraft,
  onRenameDraftChange,
  onRenameSubmit,
  onRenameCancel,
  onRenameStart,
  onDelete,
  renameError,
}: ProjectNamedFolderHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const folderMenuPanelRef = useRef<HTMLDivElement>(null);

  useNudgeDropdownToViewport(menuOpen, folderMenuPanelRef);

  const iconClass =
    accent === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : "text-violet-500";

  const saveClass =
    accent === "amber"
      ? "text-xs text-amber-700 hover:underline dark:text-amber-400"
      : "text-xs text-violet-600 hover:underline";

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      const el = menuRef.current;
      if (el && !el.contains(e.target as Node)) setMenuOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div
      className={
        accent === "amber"
          ? "mb-3 border-b border-amber-400/30 pb-2"
          : "mb-3 border-b border-border/40 pb-2"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="shrink-0 rounded-md p-1 text-foreground/50 transition-colors hover:bg-foreground/5 hover:text-foreground"
            title={isCollapsed ? "Expand folder" : "Collapse folder"}
            aria-expanded={!isCollapsed}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 ease-spring motion-reduce:transition-none ${
                isCollapsed ? "-rotate-90" : "rotate-0"
              }`}
              aria-hidden
            />
          </button>
          <Folder className={`h-4 w-4 shrink-0 ${iconClass}`} />
          {isRenaming ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <input
                type="text"
                value={renameDraft}
                onChange={(e) => onRenameDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onRenameSubmit();
                  if (e.key === "Escape") onRenameCancel();
                }}
                className="min-w-[6rem] max-w-xs rounded border border-border/80 bg-background px-2 py-0.5 text-sm font-semibold"
                autoFocus
              />
              <button type="button" className={saveClass} onClick={onRenameSubmit}>
                Save
              </button>
              <button
                type="button"
                className="text-xs text-foreground/50"
                onClick={onRenameCancel}
              >
                Cancel
              </button>
            </div>
          ) : (
            <h3 className="flex min-w-0 items-baseline gap-2 truncate text-sm font-semibold text-foreground">
              <span className="truncate">{folder.name}</span>
              <span className="shrink-0 text-xs font-normal text-foreground/45">
                ({itemCount})
              </span>
            </h3>
          )}
        </div>
        {canEdit && !isRenaming && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg p-1.5 text-foreground/40 transition-colors hover:bg-foreground/5 hover:text-foreground/70"
              title="Folder actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                ref={folderMenuPanelRef}
                className="absolute right-0 top-full z-30 mt-1 max-h-[min(70vh,calc(100vh-2rem))] w-44 max-w-[min(11rem,calc(100vw-1rem))] origin-top-right animate-dropdown-pop overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-lg motion-reduce:animate-none"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                  onClick={() => {
                    setMenuOpen(false);
                    onRenameStart();
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
                    setMenuOpen(false);
                    onDelete();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete folder
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {renameError && isRenaming && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{renameError}</p>
      )}
    </div>
  );
}

/** Animates folder content height (CSS grid 0fr → 1fr) open/close. */
export function CollapsibleFolderBody({
  isCollapsed,
  children,
}: {
  isCollapsed: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "grid transition-[grid-template-rows] duration-300 ease-spring motion-reduce:transition-none",
        isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
        /* Expanded: allow card ellipsis / flyout menus to paint outside the folder body */
        !isCollapsed && "overflow-visible",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Collapsed: clip for 0fr row. Expanded: visible so dropdowns are not cut off */}
      <div
        className={["min-h-0", isCollapsed ? "overflow-hidden" : "overflow-visible"].join(" ")}
      >
        <div
          className={[
            /* Padding so board/notebook card hover lift (-translate-y-1.5) + shadow are not clipped */
            "px-1 pt-3 pb-3 sm:px-2",
            "transition-opacity duration-300 ease-spring motion-reduce:transition-none",
            isCollapsed ? "opacity-0" : "opacity-100",
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
