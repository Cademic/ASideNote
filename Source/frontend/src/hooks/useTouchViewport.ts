import { useEffect, useRef } from "react";

interface UseTouchViewportOptions {
  resolutionFactor?: number;
  minZoom?: number;
  maxZoom?: number;
  onTouchPanStart?: () => void;
  onTouchPanEnd?: () => void;
  /** Applied before onViewportChange and used when updating gesture baseline (avoids drift vs parent clamp). */
  normalizeViewport?: (zoom: number, panX: number, panY: number) => { zoom: number; panX: number; panY: number };
  contentMinX?: number;
  contentMinY?: number;
}

export function useTouchViewport(
  viewportRef: React.RefObject<HTMLDivElement>,
  zoom: number,
  panX: number,
  panY: number,
  onViewportChange: (zoom: number, panX: number, panY: number) => void,
  options: UseTouchViewportOptions = {},
) {
  const {
    resolutionFactor = 1,
    minZoom = 0.25,
    maxZoom = 2.0,
    onTouchPanStart,
    onTouchPanEnd,
    normalizeViewport,
    contentMinX,
    contentMinY,
  } = options;

  const touchModeRef = useRef<"pinch" | null>(null);
  const touchStartRef = useRef<
    | {
        type: "pinch";
        d0: number;
        centerX: number;
        centerY: number;
        zoom: number;
        panX: number;
        panY: number;
        anchorWorldX: number;
        anchorWorldY: number;
      }
    | null
  >(null);

  // Keep refs updated with current values
  const zoomRef = useRef(zoom);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  const onViewportChangeRef = useRef(onViewportChange);
  const normalizeViewportRef = useRef(normalizeViewport);

  useEffect(() => {
    zoomRef.current = zoom;
    panXRef.current = panX;
    panYRef.current = panY;
    onViewportChangeRef.current = onViewportChange;
    normalizeViewportRef.current = normalizeViewport;
  }, [zoom, panX, panY, onViewportChange, normalizeViewport]);

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function getDistance(t1: Touch, t2: Touch): number {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  }

  function getMidpoint(t1: Touch, t2: Touch, rect: DOMRect): { x: number; y: number } {
    return {
      x: (t1.clientX + t2.clientX) / 2 - rect.left,
      y: (t1.clientY + t2.clientY) / 2 - rect.top,
    };
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function handleTouchStart(e: TouchEvent) {
      const touches = e.touches;
      const touchCount = touches.length;

      // Only handle 2-finger gestures (pan and pinch zoom)
      // 1-finger touches pass through for drawing and moving sticky notes
      if (touchCount === 2) {
        // Prevent default and stop propagation to prevent canvas from receiving these touches
        e.preventDefault();
        e.stopPropagation();
        
        const t1 = touches[0];
        const t2 = touches[1];
        const d0 = getDistance(t1, t2);
        const rect1 = viewport!.getBoundingClientRect();
        const midpoint = getMidpoint(t1, t2, rect1);

        // Start directly in pinch mode so zoom is always anchored to the fingers.
        touchModeRef.current = "pinch";
        const startZoom = zoomRef.current;
        const startPanX = panXRef.current;
        const startPanY = panYRef.current;
        const anchorWorldX =
          resolutionFactor === 1 && contentMinX != null
            ? (midpoint.x + contentMinX * (startZoom + 1)) / startZoom - startPanX
            : midpoint.x / (startZoom / resolutionFactor) - startPanX;
        const anchorWorldY =
          resolutionFactor === 1 && contentMinY != null
            ? (midpoint.y + contentMinY * (startZoom + 1)) / startZoom - startPanY
            : midpoint.y / (startZoom / resolutionFactor) - startPanY;
        touchStartRef.current = {
          type: "pinch",
          d0,
          centerX: midpoint.x,
          centerY: midpoint.y,
          zoom: startZoom,
          panX: startPanX,
          panY: startPanY,
          anchorWorldX,
          anchorWorldY,
        };
        onTouchPanStart?.();
      } else if (touchCount === 1 && touchModeRef.current !== null) {
        // If we had a 2-finger gesture and one finger lifted, end it
        if (touchModeRef.current === "pinch") {
          onTouchPanEnd?.();
        }
        touchModeRef.current = null;
        touchStartRef.current = null;
      }
    }

    function handleTouchMove(e: TouchEvent) {
      const touches = e.touches;
      const touchCount = touches.length;
      const mode = touchModeRef.current;
      const start = touchStartRef.current;

      // Only handle 2-finger gestures
      if (!mode || !start || touchCount !== 2) {
        // If we're not handling a gesture, don't prevent default (let 1-finger touches pass through)
        return;
      }

      // Prevent default scrolling/zooming when we're handling 2-finger gesture
      // Also stop propagation to prevent canvas from receiving these touches
      e.preventDefault();
      e.stopPropagation();

      const t1 = touches[0];
      const t2 = touches[1];
      const rect2 = viewport!.getBoundingClientRect();
      const currentDistance = getDistance(t1, t2);
      const currentMidpoint = getMidpoint(t1, t2, rect2);
      if (mode === "pinch" && start.type === "pinch") {
        // Unified two-finger transform: pinch zoom + two-finger pan around the live midpoint.
        const scale = currentDistance / start.d0;
        const newZoom = clamp(start.zoom * scale, minZoom, maxZoom);

        // Keep the same board-space anchor under the current midpoint.
        if (resolutionFactor === 1 && contentMinX != null && contentMinY != null) {
          const anchoredPanX =
            (currentMidpoint.x + contentMinX * (newZoom + 1)) / newZoom - start.anchorWorldX;
          const anchoredPanY =
            (currentMidpoint.y + contentMinY * (newZoom + 1)) / newZoom - start.anchorWorldY;
          const anchored = { panX: anchoredPanX, panY: anchoredPanY };
          const norm = normalizeViewportRef.current?.(newZoom, anchored.panX, anchored.panY) ?? {
            zoom: newZoom,
            panX: anchored.panX,
            panY: anchored.panY,
          };
          onViewportChangeRef.current(norm.zoom, norm.panX, norm.panY);
          touchStartRef.current = {
            type: "pinch",
            d0: currentDistance,
            centerX: currentMidpoint.x,
            centerY: currentMidpoint.y,
            zoom: norm.zoom,
            panX: norm.panX,
            panY: norm.panY,
            anchorWorldX: start.anchorWorldX,
            anchorWorldY: start.anchorWorldY,
          };
        } else if (resolutionFactor === 1) {
          const newPanX = currentMidpoint.x / newZoom - start.anchorWorldX;
          const newPanY = currentMidpoint.y / newZoom - start.anchorWorldY;
          const norm = normalizeViewportRef.current?.(newZoom, newPanX, newPanY) ?? {
            zoom: newZoom,
            panX: newPanX,
            panY: newPanY,
          };
          onViewportChangeRef.current(norm.zoom, norm.panX, norm.panY);
          touchStartRef.current = {
            type: "pinch",
            d0: currentDistance,
            centerX: currentMidpoint.x,
            centerY: currentMidpoint.y,
            zoom: norm.zoom,
            panX: norm.panX,
            panY: norm.panY,
            anchorWorldX: start.anchorWorldX,
            anchorWorldY: start.anchorWorldY,
          };
        } else {
          const newVpScale = newZoom / resolutionFactor;
          const newPanX = currentMidpoint.x / newVpScale - start.anchorWorldX;
          const newPanY = currentMidpoint.y / newVpScale - start.anchorWorldY;
          const norm = normalizeViewportRef.current?.(newZoom, newPanX, newPanY) ?? {
            zoom: newZoom,
            panX: newPanX,
            panY: newPanY,
          };
          onViewportChangeRef.current(norm.zoom, norm.panX, norm.panY);
          touchStartRef.current = {
            type: "pinch",
            d0: currentDistance,
            centerX: currentMidpoint.x,
            centerY: currentMidpoint.y,
            zoom: norm.zoom,
            panX: norm.panX,
            panY: norm.panY,
            anchorWorldX: start.anchorWorldX,
            anchorWorldY: start.anchorWorldY,
          };
        }
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      const touches = e.touches;
      const touchCount = touches.length;

      if (touchCount < 2) {
        // Less than 2 fingers - end gesture (1 finger or 0 fingers)
        // Prevent default and stop propagation if we were handling a gesture
        if (touchModeRef.current === "pinch") {
          e.preventDefault();
          e.stopPropagation();
          onTouchPanEnd?.();
        }
        touchModeRef.current = null;
        touchStartRef.current = null;
      } else if (touchCount === 2 && touchModeRef.current === "pinch") {
        // Still have 2 fingers but one was lifted - prevent default to avoid canvas interference
        e.preventDefault();
        e.stopPropagation();
      }
      // If touchCount >= 2, we still have 2+ fingers, so keep the gesture active
    }

    // Use capture phase to intercept events before they reach child elements (like canvas)
    viewport.addEventListener("touchstart", handleTouchStart, { passive: false, capture: true });
    viewport.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });
    viewport.addEventListener("touchend", handleTouchEnd, { passive: false, capture: true });
    viewport.addEventListener("touchcancel", handleTouchEnd, { passive: false, capture: true });

    return () => {
      viewport.removeEventListener("touchstart", handleTouchStart);
      viewport.removeEventListener("touchmove", handleTouchMove);
      viewport.removeEventListener("touchend", handleTouchEnd);
      viewport.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [viewportRef, resolutionFactor, minZoom, maxZoom, onTouchPanStart, onTouchPanEnd, contentMinX, contentMinY]);
}
