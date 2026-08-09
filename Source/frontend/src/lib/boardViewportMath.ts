/**
 * Screen <-> board (world) coordinate conversion for the cork-board / NoteBoardPage viewport.
 *
 * Centralizes the transform documented in boardViewportScroll.ts:
 *   screenX = zoom * (worldX + panX) - contentMinX * (zoom + 1)
 *
 * The `(zoom + 1)` term comes from CorkBoard's DOM applying `translate(-contentMin)` twice
 * (once in the scaled canvas wrapper, once again in an inner unscaled wrapper) - see
 * CorkBoard.tsx's canvas render tree. This module preserves that formula verbatim; it is a
 * behavior-preserving extraction, not a fix. ChalkBoardPage has the same double-translate DOM
 * shape but keeps contentMin pinned at (0, 0), so the (zoom+1) term is inert there and it uses
 * its own resolution-factor-based scale convention (see chalk* helpers in boardViewportScroll.ts)
 * - do not migrate ChalkBoardPage onto this module, they are independently-evolving systems that
 * only coincidentally share an algebraic shape.
 */

export interface BoardPoint {
  x: number;
  y: number;
}

/** Convert a point in viewport screen pixels to board (world) coordinates. */
export function corkScreenToWorld(
  screenX: number,
  screenY: number,
  zoom: number,
  panX: number,
  panY: number,
  contentMinX: number,
  contentMinY: number,
): BoardPoint {
  return {
    x: (screenX + contentMinX * (zoom + 1)) / zoom - panX,
    y: (screenY + contentMinY * (zoom + 1)) / zoom - panY,
  };
}

/** Inverse of corkScreenToWorld: convert a board (world) point to viewport screen pixels. */
export function corkWorldToScreen(
  worldX: number,
  worldY: number,
  zoom: number,
  panX: number,
  panY: number,
  contentMinX: number,
  contentMinY: number,
): BoardPoint {
  return {
    x: zoom * (worldX + panX) - contentMinX * (zoom + 1),
    y: zoom * (worldY + panY) - contentMinY * (zoom + 1),
  };
}

/**
 * Pan delta needed to keep the on-screen position stable when contentMin shifts
 * (e.g. after a note moves and the canvas bounding box grows/shrinks).
 */
export function corkPanDeltaForContentMinShift(
  dContentMinX: number,
  dContentMinY: number,
  zoom: number,
): { dPanX: number; dPanY: number } {
  return {
    dPanX: (dContentMinX * (zoom + 1)) / zoom,
    dPanY: (dContentMinY * (zoom + 1)) / zoom,
  };
}

/**
 * New pan so that the given board (world) point ends up at the viewport's screen center
 * (centerScreenX, centerScreenY). Equivalent to solving corkScreenToWorld for pan with
 * panX = panY = 0, then subtracting the target world point.
 */
export function corkPanToCenterWorldPoint(
  centerScreenX: number,
  centerScreenY: number,
  targetWorldX: number,
  targetWorldY: number,
  zoom: number,
  contentMinX: number,
  contentMinY: number,
): BoardPoint {
  const origin = corkScreenToWorld(centerScreenX, centerScreenY, zoom, 0, 0, contentMinX, contentMinY);
  return {
    x: origin.x - targetWorldX,
    y: origin.y - targetWorldY,
  };
}
