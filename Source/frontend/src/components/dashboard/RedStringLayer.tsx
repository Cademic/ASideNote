import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { BoardConnectionDto } from "../../types";

interface PinPosition {
  x: number;
  y: number;
}

interface RedStringLayerProps {
  connections: BoardConnectionDto[];
  linkingFrom: string | null;
  mousePos: { x: number; y: number } | null;
  boardRef: React.RefObject<HTMLDivElement | null>;
  onDeleteConnection: (id: string) => void;
  zoom?: number;
}

/** Droop amount (px) for the catenary curve control point */
const DROOP_PX = 40;
const STRING_COLOR = "#dc2626";

/** Build a quadratic bezier path string with a catenary-style droop. */
function buildCatenaryPath(from: PinPosition, to: PinPosition): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dist = Math.abs(to.x - from.x);
  const droop = DROOP_PX * Math.min(1, dist / 300);
  return `M ${from.x} ${from.y} Q ${midX} ${midY + droop} ${to.x} ${to.y}`;
}

/**
 * Read the centre position of every pin relative to the red-string SVG viewport
 * (same space as path `d` coordinates). Pins are found under `boardEl`; the
 * reference rect must be the overlay SVG so coords match after the inner canvas
 * `translate(-contentMinX, -contentMinY)` wrapper.
 */
function readPinPositions(
  boardEl: HTMLDivElement,
  svgEl: SVGSVGElement | null,
  zoom = 1,
): Map<string, PinPosition> {
  const map = new Map<string, PinPosition>();
  if (!svgEl) return map;
  const origin = svgEl.getBoundingClientRect();
  const pins = boardEl.querySelectorAll<HTMLElement>("[data-pin-note-id]");
  pins.forEach((pin) => {
    const noteId = pin.getAttribute("data-pin-note-id");
    if (!noteId) return;
    const r = pin.getBoundingClientRect();
    map.set(noteId, {
      x: (r.left + r.width / 2 - origin.left) / zoom,
      y: (r.top + r.height / 2 - origin.top) / zoom,
    });
  });
  return map;
}

export const RedStringLayer = forwardRef<SVGSVGElement, RedStringLayerProps>(function RedStringLayer(
  {
    connections,
    linkingFrom,
    mousePos,
    boardRef,
    onDeleteConnection,
    zoom = 1,
  },
  ref,
) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const setSvgRef = useCallback(
    (el: SVGSVGElement | null) => {
      svgRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<SVGSVGElement | null>).current = el;
    },
    [ref],
  );
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);

  // Store latest props in refs so the rAF loop can read them without deps.
  const connectionsRef = useRef(connections);
  const linkingFromRef = useRef(linkingFrom);
  const mousePosRef = useRef(mousePos);
  const zoomRef = useRef(zoom);
  connectionsRef.current = connections;
  linkingFromRef.current = linkingFrom;
  mousePosRef.current = mousePos;
  zoomRef.current = zoom;

  // Deselect when clicking anywhere outside a string
  useEffect(() => {
    if (!selectedConnection) return;
    function onClickAway(e: MouseEvent) {
      const target = e.target as Element | null;
      // If the click is on the SVG hit-area or the delete button, let those handlers run
      if (target?.closest("[data-conn-hit]") || target?.closest("[data-delete-btn]")) return;
      setSelectedConnection(null);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [selectedConnection]);

  // Clear selection if the selected connection was removed
  useEffect(() => {
    if (selectedConnection && !connections.find((c) => c.id === selectedConnection)) {
      setSelectedConnection(null);
    }
  }, [connections, selectedConnection]);

  // Persistent rAF loop that reads pin positions from the DOM every frame and
  // writes directly to SVG path `d` attributes. This avoids React re-renders
  // entirely for position tracking, making the strings perfectly fluid.
  useEffect(() => {
    let rafId: number;

    function tick() {
      const svg = svgRef.current;
      const board = boardRef.current;
      if (!svg || !board) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const pins = readPinPositions(board, svg, zoomRef.current);
      const conns = connectionsRef.current;
      const linking = linkingFromRef.current;
      const mouse = mousePosRef.current;

      // Update established connection paths
      for (const conn of conns) {
        const from = pins.get(conn.fromItemId);
        const to = pins.get(conn.toItemId);
        // Each connection has two paths: hit-area and visible (data-conn-id)
        const visible = svg.querySelector<SVGPathElement>(
          `[data-conn-visible="${conn.id}"]`,
        );
        const hitArea = svg.querySelector<SVGPathElement>(
          `[data-conn-hit="${conn.id}"]`,
        );
        if (from && to) {
          const d = buildCatenaryPath(from, to);
          if (visible) visible.setAttribute("d", d);
          if (hitArea) hitArea.setAttribute("d", d);
        }
      }

      // Update in-progress linking line
      const linkPath = svg.querySelector<SVGPathElement>("[data-link-line]");
      if (linkPath && linking && mouse) {
        const from = pins.get(linking);
        if (from) {
          linkPath.setAttribute("d", buildCatenaryPath(from, mouse));
          linkPath.setAttribute("visibility", "visible");
        } else {
          linkPath.setAttribute("visibility", "hidden");
        }
      } else if (linkPath) {
        linkPath.setAttribute("visibility", "hidden");
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [boardRef]);

  // Nothing to render
  if (connections.length === 0 && !linkingFrom) return null;

  // For the selected string's delete button, compute position from pin positions.
  const selectedConn = selectedConnection
    ? connections.find((c) => c.id === selectedConnection)
    : null;

  let deleteButtonPos: { x: number; y: number; droop: number } | null = null;
  if (selectedConn && boardRef.current && svgRef.current) {
    const pins = readPinPositions(boardRef.current, svgRef.current, zoom);
    const from = pins.get(selectedConn.fromItemId);
    const to = pins.get(selectedConn.toItemId);
    if (from && to) {
      const dist = Math.abs(to.x - from.x);
      const droop = DROOP_PX * Math.min(1, dist / 300);
      deleteButtonPos = {
        x: (from.x + to.x) / 2,
        y: (from.y + to.y) / 2,
        droop,
      };
    }
  }

  return (
    <svg
      ref={setSvgRef}
      className="pointer-events-none absolute inset-0 z-[9999]"
      width="100%"
      height="100%"
      overflow="visible"
    >
      {/* Drop shadow filter for the string */}
      <defs>
        <filter id="string-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Established connections */}
      {connections.map((conn) => {
        const isSelected = selectedConnection === conn.id;
        return (
          <g key={conn.id}>
            {/* Invisible wider hit-area for click selection */}
            <path
              data-conn-hit={conn.id}
              d="M 0 0"
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              style={{ pointerEvents: "stroke", cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedConnection(isSelected ? null : conn.id);
              }}
            />
            {/* Visible string */}
            <path
              data-conn-visible={conn.id}
              d="M 0 0"
              fill="none"
              stroke={isSelected ? "#ef4444" : STRING_COLOR}
              strokeWidth={isSelected ? 3.5 : 2}
              strokeLinecap="round"
              opacity={isSelected ? 1 : 0.85}
              filter="url(#string-shadow)"
            />
            {/* Delete button on selected string */}
            {isSelected && deleteButtonPos && (
              <foreignObject
                x={deleteButtonPos.x - 12}
                y={deleteButtonPos.y + deleteButtonPos.droop - 12}
                width={24}
                height={24}
                className="pointer-events-auto"
              >
                <button
                  data-delete-btn=""
                  type="button"
                  onClick={() => onDeleteConnection(conn.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform hover:scale-110 hover:bg-red-700 focus:outline-none"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </foreignObject>
            )}
          </g>
        );
      })}

      {/* In-progress linking line (always present but hidden via attribute) */}
      <path
        data-link-line=""
        d="M 0 0"
        fill="none"
        stroke={STRING_COLOR}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="6 4"
        opacity={0.6}
        visibility="hidden"
      />
    </svg>
  );
});
