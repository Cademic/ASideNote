/**
 * Maps between board pan (world + zoom) and native scroll position.
 *
 * Legacy CorkBoard transform: translate(-contentMin) scale(zoom) translate(panX, panY), giving
 *   screenX = zoom * (worldX + panX) - contentMinX * (zoom + 1)
 *
 * With pan removed from CSS and scroll encoding pan, we use a large origin offset so
 * scrollLeft/Top stay non-negative for typical pan ranges (scroll cannot be negative).
 */

export interface ScrollSize {
  scrollWidth: number;
  scrollHeight: number;
}

/** Padding origin so pan≈0 maps to a mid-range scroll position and pan can go positive or negative. */
export const BOARD_SCROLL_ORIGIN = 400_000;

export interface CorkScrollLayout extends ScrollSize {
  canvasLeft: number;
  canvasTop: number;
}

/** Inner scroll surface for CorkBoard / note board (scale = zoom). */
export function corkScrollInnerLayout(canvasWidth: number, canvasHeight: number, zoom: number): CorkScrollLayout {
  const o = BOARD_SCROLL_ORIGIN;
  return {
    scrollWidth: o * 2 + canvasWidth * zoom,
    scrollHeight: o * 2 + canvasHeight * zoom,
    canvasLeft: o,
    canvasTop: o,
  };
}

export function corkPanToScroll(panX: number, panY: number, zoom: number): { scrollLeft: number; scrollTop: number } {
  const o = BOARD_SCROLL_ORIGIN;
  return {
    scrollLeft: o - zoom * panX,
    scrollTop: o - zoom * panY,
  };
}

export function corkScrollToPan(scrollLeft: number, scrollTop: number, zoom: number): { panX: number; panY: number } {
  const o = BOARD_SCROLL_ORIGIN;
  return {
    panX: (o - scrollLeft) / zoom,
    panY: (o - scrollTop) / zoom,
  };
}

/**
 * Chalk board: CSS scale is zoom/RESOLUTION_FACTOR; Fabric uses the same pan units.
 * Same origin pattern with effective scale zoom/RF.
 */
export function chalkScrollInnerLayout(
  canvasWidth: number,
  canvasHeight: number,
  zoom: number,
  resolutionFactor: number,
): CorkScrollLayout {
  const o = BOARD_SCROLL_ORIGIN;
  const z = zoom / resolutionFactor;
  return {
    scrollWidth: o * 2 + canvasWidth * z,
    scrollHeight: o * 2 + canvasHeight * z,
    canvasLeft: o,
    canvasTop: o,
  };
}

export function chalkPanToScroll(
  panX: number,
  panY: number,
  zoom: number,
  resolutionFactor: number,
): { scrollLeft: number; scrollTop: number } {
  const o = BOARD_SCROLL_ORIGIN;
  return {
    scrollLeft: o - (zoom * panX) / resolutionFactor,
    scrollTop: o - (zoom * panY) / resolutionFactor,
  };
}

export function chalkScrollToPan(
  scrollLeft: number,
  scrollTop: number,
  zoom: number,
  resolutionFactor: number,
): { panX: number; panY: number } {
  const o = BOARD_SCROLL_ORIGIN;
  const rf = resolutionFactor;
  return {
    panX: ((o - scrollLeft) * rf) / zoom,
    panY: ((o - scrollTop) * rf) / zoom,
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
  return {
    panX:
      panX +
      (screenX + contentMinX * (newZoom + 1)) / newZoom -
      (screenX + contentMinX * (zoom + 1)) / zoom,
    panY:
      panY +
      (screenY + contentMinY * (newZoom + 1)) / newZoom -
      (screenY + contentMinY * (zoom + 1)) / zoom,
  };
}

/** Same idea as cork; matches ChalkBoard Ctrl+wheel / Fabric viewport math. */
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
  return {
    panX: panX + screenX * (1 / newVpScale - 1 / vpScale),
    panY: panY + screenY * (1 / newVpScale - 1 / vpScale),
  };
}
