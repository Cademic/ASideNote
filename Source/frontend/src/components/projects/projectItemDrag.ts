import type { DragEvent } from "react";

export const PROJECT_ITEM_DRAG_MIME = "application/x-asidenote-project-item";

export interface ProjectItemDragPayload {
  kind: "board" | "notebook";
  id: string;
}

export function setProjectItemDragData(e: DragEvent, payload: ProjectItemDragPayload) {
  e.dataTransfer.setData(PROJECT_ITEM_DRAG_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
}

export function getProjectItemDragPayload(e: DragEvent): ProjectItemDragPayload | null {
  try {
    const raw = e.dataTransfer.getData(PROJECT_ITEM_DRAG_MIME);
    if (!raw) return null;
    const p = JSON.parse(raw) as ProjectItemDragPayload;
    if (p.kind !== "board" && p.kind !== "notebook") return null;
    if (typeof p.id !== "string" || !p.id) return null;
    return p;
  } catch {
    return null;
  }
}
