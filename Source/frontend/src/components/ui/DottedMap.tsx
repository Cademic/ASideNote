import { useEffect, useMemo, useState, type SVGProps } from "react";
import { createMap } from "svg-dotted-map";

type Point = { x: number; y: number };

/**
 * Adapted from https://magicui.design/docs/components/dotted-map (no shadcn/`cn` dependency in
 * this repo). Marker support is dropped entirely — this repo only ever renders the background
 * dot field, never location pins.
 *
 * `createMap`'s point-in-polygon sampling is expensive (~0.3ms per sample — several hundred ms
 * at typical mapSamples, over a second at the default 5000) and was measured blocking the whole
 * page from painting on every navigation, even run in an effect after mount. Pass a precomputed
 * `points` array (see src/data/worldMapPoints.ts) to skip the runtime computation entirely; it's
 * only computed on the fly as a fallback for a `width`/`height`/`mapSamples` combination nothing
 * has precomputed yet, deferred to a post-mount effect so it doesn't block first paint.
 */
interface DottedMapProps extends SVGProps<SVGSVGElement> {
  /** Map viewBox width. @default 150 */
  width?: number;
  /** Map viewBox height. @default 75 */
  height?: number;
  /** Number of points sampled across the world outline — higher reads as denser/finer dots. Ignored when `points` is supplied. @default 5000 */
  mapSamples?: number;
  /** Precomputed dot positions (see src/data/worldMapPoints.ts). Skips the expensive runtime `createMap` call — use this whenever the map's width/height/mapSamples are fixed ahead of time. */
  mapPoints?: Point[];
  /** Radius of each dot. @default 0.2 */
  dotRadius?: number;
  /** Offset alternating rows by half a dot-step so the field reads less like a rigid grid. @default true */
  stagger?: boolean;
  className?: string;
}

export function DottedMap({
  width = 150,
  height = 75,
  mapSamples = 5000,
  mapPoints: suppliedPoints,
  dotRadius = 0.2,
  stagger = true,
  className = "",
  ...props
}: DottedMapProps) {
  const [computedPoints, setComputedPoints] = useState<Point[]>([]);

  useEffect(() => {
    if (suppliedPoints) return;
    setComputedPoints(createMap({ width, height, mapSamples }).points);
  }, [suppliedPoints, width, height, mapSamples]);

  const points = suppliedPoints ?? computedPoints;

  const { xStep, yToRowIndex } = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x);
    const rowMap = new Map<number, number>();
    let step = 0;
    let prevY = Number.NaN;
    let prevXInRow = Number.NaN;

    for (const p of sorted) {
      if (p.y !== prevY) {
        prevY = p.y;
        prevXInRow = Number.NaN;
        if (!rowMap.has(p.y)) rowMap.set(p.y, rowMap.size);
      }
      if (!Number.isNaN(prevXInRow)) {
        const delta = p.x - prevXInRow;
        if (delta > 0) step = step === 0 ? delta : Math.min(step, delta);
      }
      prevXInRow = p.x;
    }

    return { xStep: step || 1, yToRowIndex: rowMap };
  }, [points]);

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      className={`text-[var(--land-ink-3)] ${className}`}
      {...props}
    >
      {points.map((point, index) => {
        const rowIndex = yToRowIndex.get(point.y) ?? 0;
        const offsetX = stagger && rowIndex % 2 === 1 ? xStep / 2 : 0;
        return (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            cx={point.x + offsetX}
            cy={point.y}
            r={dotRadius}
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}
