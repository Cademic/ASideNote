/** Matches CorkBoard / chalk board zoom limits */
export const BOARD_VIEWPORT_MIN_ZOOM = 0.25;
export const BOARD_VIEWPORT_MAX_ZOOM = 2.0;

function clampZoom(z: number): number {
  return Math.min(BOARD_VIEWPORT_MAX_ZOOM, Math.max(BOARD_VIEWPORT_MIN_ZOOM, z));
}

export function boardViewportStorageKey(boardId: string): string {
  return `board-viewport-${boardId}`;
}

export function persistBoardViewport(boardId: string, zoom: number, panX: number, panY: number): void {
  try {
    localStorage.setItem(boardViewportStorageKey(boardId), JSON.stringify({ zoom, panX, panY }));
  } catch {
    // ignore quota / private mode
  }
}

export interface BoardViewportPartial {
  zoom?: number;
  panX?: number;
  panY?: number;
}

/** Parse saved JSON; clamps zoom when present. Returns partial fields for incremental restore. */
export function parseBoardViewportJson(raw: string | null): BoardViewportPartial {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { zoom?: unknown; panX?: unknown; panY?: unknown };
    const out: BoardViewportPartial = {};
    if (typeof parsed.zoom === "number" && Number.isFinite(parsed.zoom)) {
      out.zoom = clampZoom(parsed.zoom);
    }
    if (typeof parsed.panX === "number" && Number.isFinite(parsed.panX)) {
      out.panX = parsed.panX;
    }
    if (typeof parsed.panY === "number" && Number.isFinite(parsed.panY)) {
      out.panY = parsed.panY;
    }
    return out;
  } catch {
    return {};
  }
}

export function readBoardViewport(boardId: string): BoardViewportPartial {
  try {
    return parseBoardViewportJson(localStorage.getItem(boardViewportStorageKey(boardId)));
  } catch {
    return {};
  }
}
