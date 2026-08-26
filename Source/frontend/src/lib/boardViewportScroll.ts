/**
 * Maps between board pan (world + zoom) and native scroll position.
 *
 * Legacy CorkBoard transform: translate(-contentMin) scale(zoom) translate(panX, panY), giving
 *   screenX = zoom * (worldX + panX) - contentMinX * (zoom + 1)
 * (see boardViewportMath.ts's corkScreenToWorld/corkWorldToScreen, which encode this same
 * formula as the single canonical implementation; corkZoomAroundScreenPoint below builds on it
 * rather than re-deriving it.)
 *
 * With pan removed from CSS and scroll encoding pan, the canvas is positioned at
 * left/top = contentMinX/contentMinY (instead of a fixed padding origin) and the scroll surface
 * is sized to exactly the canvas's rendered (zoomed) extent. That makes the canvas's own
 * left/top edge land at scroll position 0 and its bottom/right edge land at
 * scrollWidth/scrollHeight, so the native scrollbar's thumb-to-track ratio always reflects the
 * real pannable range with no dead runway — the browser's own scroll clamping (can't scroll
 * negative or past scrollWidth - clientWidth) does the board-containment job that a fixed large
 * origin used to need CorkBoard's scroll-sync layout effect to correct after the fact. That
 * effect (see clampScrollToCanvas in CorkBoard.tsx) is now a no-op safety net, not the primary
 * containment mechanism — kept for zoom-change transients, not removed.
 */

import { corkScreenToWorld } from "./boardViewportMath";

export interface ScrollSize {
  scrollWidth: number;
  scrollHeight: number;
}

export interface CorkScrollLayout extends ScrollSize {
  canvasLeft: number;
  canvasTop: number;
}

/** Inner scroll surface for CorkBoard / note board (scale = zoom), sized to exactly the pannable canvas extent. */
export function corkScrollInnerLayout(
  canvasWidth: number,
  canvasHeight: number,
  zoom: number,
  contentMinX: number,
  contentMinY: number,
): CorkScrollLayout {
  return {
    scrollWidth: canvasWidth * zoom,
    scrollHeight: canvasHeight * zoom,
    canvasLeft: contentMinX,
    canvasTop: contentMinY,
  };
}

export function corkPanToScroll(
  panX: number,
  panY: number,
  zoom: number,
  contentMinX: number,
  contentMinY: number,
): { scrollLeft: number; scrollTop: number } {
  return {
    scrollLeft: contentMinX - zoom * panX,
    scrollTop: contentMinY - zoom * panY,
  };
}

export function corkScrollToPan(
  scrollLeft: number,
  scrollTop: number,
  zoom: number,
  contentMinX: number,
  contentMinY: number,
): { panX: number; panY: number } {
  return {
    panX: (contentMinX - scrollLeft) / zoom,
    panY: (contentMinY - scrollTop) / zoom,
  };
}

/**
 * Keep the board point under (screenX, screenY) fixed when zoom changes.
 * screenX/Y are relative to the scroll viewport (same as Ctrl+wheel zoom in CorkBoard).
 */
export function corkZoomAroundScreenPoint(
  panX: number,
  panY: number,
  zoom: number,
  newZoom: number,
  screenX: number,
  screenY: number,
  contentMinX: number,
  contentMinY: number,
): { panX: number; panY: number } {
  const oldWorld = corkScreenToWorld(screenX, screenY, zoom, 0, 0, contentMinX, contentMinY);
  const newWorld = corkScreenToWorld(screenX, screenY, newZoom, 0, 0, contentMinX, contentMinY);
  return {
    panX: panX + (newWorld.x - oldWorld.x),
    panY: panY + (newWorld.y - oldWorld.y),
  };
}

/**
 * ChalkBoardPage equivalents of the cork* functions above, using chalk's own
 * resolution-factor-based scale convention (`vpScale = zoom / RESOLUTION_FACTOR`)
 * instead of a plain `zoom` scale. contentMin is always (0, 0) for chalk boards
 * (see ChalkBoardPage's fixed board bounds), so unlike the cork* versions there
 * is no contentMin offset term to carry around.
 *
 * Deliberately NOT unified with the cork* functions above — see the module
 * doc comment in boardViewportMath.ts for why ChalkBoardPage and CorkBoard are
 * independently-evolving systems that only coincidentally share an algebraic shape.
 */

/** Inner scroll surface for ChalkBoardPage (scale = zoom / resolutionFactor). */
export function chalkScrollInnerLayout(
  canvasWidth: number,
  canvasHeight: number,
  zoom: number,
  resolutionFactor: number,
): ScrollSize {
  const vpScale = zoom / resolutionFactor;
  return {
    scrollWidth: canvasWidth * vpScale,
    scrollHeight: canvasHeight * vpScale,
  };
}

export function chalkPanToScroll(
  panX: number,
  panY: number,
  zoom: number,
  resolutionFactor: number,
): { scrollLeft: number; scrollTop: number } {
  const vpScale = zoom / resolutionFactor;
  return {
    scrollLeft: -vpScale * panX,
    scrollTop: -vpScale * panY,
  };
}

export function chalkScrollToPan(
  scrollLeft: number,
  scrollTop: number,
  zoom: number,
  resolutionFactor: number,
): { panX: number; panY: number } {
  const vpScale = zoom / resolutionFactor;
  return {
    panX: -scrollLeft / vpScale,
    panY: -scrollTop / vpScale,
  };
}

/**
 * Keep the board point under (screenX, screenY) fixed when zoom changes, using
 * chalk's resolution-factor scale convention.
 */
export function chalkZoomAroundScreenPoint(
  panX: number,
  panY: number,
  zoom: number,
  newZoom: number,
  screenX: number,
  screenY: number,
  resolutionFactor: number,
): { panX: number; panY: number } {
  const vpScale = zoom / resolutionFactor;
  const newVpScale = newZoom / resolutionFactor;
  const worldX = screenX / vpScale - panX;
  const worldY = screenY / vpScale - panY;
  const newWorldX = screenX / newVpScale - panX;
  const newWorldY = screenY / newVpScale - panY;
  return {
    panX: panX + (newWorldX - worldX),
    panY: panY + (newWorldY - worldY),
  };
}
