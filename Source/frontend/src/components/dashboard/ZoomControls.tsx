import { ZoomIn, ZoomOut, Maximize, Crosshair } from "lucide-react";

const DEFAULT_MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.0;

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onReset: () => void;
  onCenterView?: () => void;
  /** When set (e.g. chalkboard fit-to-board), zoom out cannot go below this */
  minZoom?: number;
}

export function ZoomControls({ zoom, onZoomChange, onReset, onCenterView, minZoom = DEFAULT_MIN_ZOOM }: ZoomControlsProps) {
  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.max(minZoom, Math.min(MAX_ZOOM, Math.round(newZoom * 100) / 100));
    onZoomChange(clamped);
  };

  return (
    <div className="flex flex-nowrap items-center gap-2 rounded-xl border border-border bg-surface/90 backdrop-blur-sm shadow-lg px-3 py-2">
      <button
        type="button"
        onClick={() => handleZoomChange(zoom - 0.1)}
        className="shrink-0 rounded p-1 text-foreground/70 transition-colors hover:bg-background hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        disabled={zoom <= minZoom}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <ZoomOut className="h-4 w-4" />
      </button>

      <div className="hidden sm:flex min-w-[4rem] shrink items-center gap-1.5 w-24 md:w-32 lg:w-40">
        <input
          type="range"
          min={minZoom}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
          className="min-w-0 flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-foreground/10 accent-primary"
          aria-label="Zoom level"
        />
        <span className="shrink-0 text-xs font-medium text-foreground/70 min-w-[2.5rem] text-right">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <button
        type="button"
        onClick={() => handleZoomChange(zoom + 0.1)}
        disabled={zoom >= MAX_ZOOM}
        title="Zoom in"
        className="shrink-0 rounded p-1 text-foreground/70 transition-colors hover:bg-background hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Zoom in"
      >
        <ZoomIn className="h-4 w-4" />
      </button>

      <div className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden />

      {onCenterView && (
        <button
          type="button"
          onClick={onCenterView}
          title="Center view"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-foreground/60 hover:bg-background hover:text-foreground transition-colors"
        >
          <Crosshair className="h-3.5 w-3.5" />
        </button>
      )}

      <button
        type="button"
        onClick={onReset}
        title="Reset zoom"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-foreground/60 hover:bg-background hover:text-foreground transition-colors"
      >
        <Maximize className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
