import type { ReactNode } from "react";

import {
  getProjectItemDragPayload,
  setProjectItemDragData,
  type ProjectItemDragPayload,
} from "./projectItemDrag";

interface DraggableProjectItemProps {
  kind: "board" | "notebook";
  id: string;
  canEdit: boolean;
  onDragEnd?: () => void;
  children: ReactNode;
}

/** Wraps a board or notebook card so it can be dragged between project folders. */
export function DraggableProjectItem({
  kind,
  id,
  canEdit,
  onDragEnd,
  children,
}: DraggableProjectItemProps) {
  if (!canEdit) return <>{children}</>;

  return (
    <div
      draggable
      title="Drag to move to another folder"
      onDragStart={(e) => {
        e.stopPropagation();
        setProjectItemDragData(e, { kind, id });
        (e.currentTarget as HTMLDivElement).style.opacity = "0.55";
      }}
      onDragEnd={(e) => {
        (e.currentTarget as HTMLDivElement).style.opacity = "";
        onDragEnd?.();
      }}
      className="cursor-grab rounded-lg active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

interface FolderDropSurfaceProps {
  /** Unique key for drop highlight state */
  dropKey: string;
  highlightKey: string | null;
  onHighlight: (key: string | null) => void;
  onDropPayload: (payload: ProjectItemDragPayload) => void;
  className?: string;
  children: ReactNode;
}

/**
 * Drop target for a folder column or the unfiled area. Highlights while a project item is dragged over.
 */
export function FolderDropSurface({
  dropKey,
  highlightKey,
  onHighlight,
  onDropPayload,
  className = "",
  children,
}: FolderDropSurfaceProps) {
  return (
    <div
      className={[
        "rounded-xl transition-[box-shadow,background-color] duration-150 motion-reduce:transition-none",
        highlightKey === dropKey
          ? "bg-violet-50/80 ring-2 ring-violet-400/70 dark:bg-violet-950/25 dark:ring-violet-500/50"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onHighlight(dropKey);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        onHighlight(dropKey);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          onHighlight(null);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onHighlight(null);
        const p = getProjectItemDragPayload(e);
        if (p) onDropPayload(p);
      }}
    >
      {children}
    </div>
  );
}
