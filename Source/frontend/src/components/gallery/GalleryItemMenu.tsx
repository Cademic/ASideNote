import {
  ExternalLink,
  FolderInput,
  FolderMinus,
  LogOut,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import type { GalleryItem } from "../../types/gallery";

export interface GalleryItemMenuProps {
  item: GalleryItem;
  onClose: () => void;
  onRename: (item: GalleryItem) => void;
  onDelete: (item: GalleryItem) => void;
  onTogglePin: (item: GalleryItem) => void;
  onMoveToProject: (item: GalleryItem, projectId: string | null) => void;
  /** Projects only. */
  onLeave?: (item: GalleryItem) => void;
  activeProjects: Array<{ id: string; name: string }>;
  /** Positioning + width classes for the floating panel. */
  className?: string;
}

/** Shared kebab dropdown for a Gallery item — used by both the grid card and the details row. */
export function GalleryItemMenu({
  item,
  onClose,
  onRename,
  onDelete,
  onTogglePin,
  onMoveToProject,
  onLeave,
  activeProjects,
  className = "",
}: GalleryItemMenuProps) {
  const isProject = item.kind === "project";
  const canMoveToProject = !isProject;

  return (
    <div
      role="menu"
      data-gallery-item-menu
      className={`w-52 overflow-hidden border border-border bg-background py-1 text-left text-sm shadow-lg animate-dropdown-pop motion-reduce:animate-none ${className}`}
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          window.open(item.to, "_blank", "noopener,noreferrer");
        }}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-foreground/80 hover:bg-surface"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open in new tab
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          onRename(item);
        }}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-foreground/80 hover:bg-surface"
      >
        <Pencil className="h-3.5 w-3.5" />
        Rename
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          onTogglePin(item);
        }}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-foreground/80 hover:bg-surface"
      >
        {item.isPinned ? (
          <PinOff className="h-3.5 w-3.5" />
        ) : (
          <Pin className="h-3.5 w-3.5" />
        )}
        {item.isPinned ? "Unpin" : "Pin"}
      </button>

      {canMoveToProject && (
        <div className="border-t border-border/60 py-1">
          <p className="px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-foreground/40">
            Move to project
          </p>
          <div className="max-h-40 overflow-y-auto">
            {item.projectId && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onClose();
                  onMoveToProject(item, null);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-foreground/70 hover:bg-surface"
              >
                <FolderMinus className="h-3.5 w-3.5" />
                Remove from project
              </button>
            )}
            {activeProjects.length === 0 ? (
              <p className="px-3 py-1.5 text-xs text-foreground/40">
                No active projects
              </p>
            ) : (
              activeProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  role="menuitem"
                  disabled={project.id === item.projectId}
                  onClick={() => {
                    onClose();
                    onMoveToProject(item, project.id);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-foreground/70 hover:bg-surface disabled:opacity-40"
                >
                  <FolderInput className="h-3.5 w-3.5" />
                  <span className="truncate">{project.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="border-t border-border/60 pt-1">
        {isProject && onLeave && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              onLeave(item);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-foreground/70 hover:bg-surface"
          >
            <LogOut className="h-3.5 w-3.5" />
            Leave project
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onDelete(item);
          }}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
