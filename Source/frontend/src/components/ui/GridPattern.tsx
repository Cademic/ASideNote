import { useId, type SVGProps } from "react";

/** Adapted from https://magicui.design/docs/components/grid-pattern (no shadcn/`cn` dependency in this repo). */
interface GridPatternProps extends SVGProps<SVGSVGElement> {
  /** Tile width in pixels. @default 40 */
  width?: number;
  /** Tile height in pixels. @default 40 */
  height?: number;
  /** Offset applied to the pattern origin on the x-axis. @default -1 */
  x?: number;
  /** Offset applied to the pattern origin on the y-axis. @default -1 */
  y?: number;
  /** [col, row] coordinates of grid cells to highlight (filled) on top of the pattern. */
  squares?: Array<[x: number, y: number]>;
  /** SVG stroke-dasharray applied to each grid line — e.g. "4 2" for a dashed grid. @default "0" */
  strokeDasharray?: string;
  className?: string;
}

export function GridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = "0",
  squares,
  className = "",
  ...props
}: GridPatternProps) {
  const id = useId();

  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30 ${className}`}
      {...props}
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" strokeDasharray={strokeDasharray} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      {squares && (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([sx, sy]) => (
            <rect
              strokeWidth="0"
              key={`${sx}-${sy}`}
              width={width - 1}
              height={height - 1}
              x={sx * width + 1}
              y={sy * height + 1}
            />
          ))}
        </svg>
      )}
    </svg>
  );
}
