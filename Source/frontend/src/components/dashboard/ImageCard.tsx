import { memo, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Draggable, { type DraggableEventHandler } from "react-draggable";
import { X, GripVertical } from "lucide-react";
import type { BoardImageSummaryDto } from "../../types";
import { useBoardItemResize, type ResizeDir } from "../../hooks/useBoardItemResize";

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 150;
const MIN_SIZE = 60;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;

const CURSOR_MAP: Record<ResizeDir, string> = {
  n: "cursor-ns-resize",
  s: "cursor-ns-resize",
  e: "cursor-ew-resize",
  w: "cursor-ew-resize",
  ne: "cursor-nesw-resize",
  sw: "cursor-nesw-resize",
  nw: "cursor-nwse-resize",
  se: "cursor-nwse-resize",
};

interface ImageCardProps {
  image: BoardImageSummaryDto;
  zIndex?: number;
  onDragStart?: (id: string) => void;
  onDragStop: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  /** When position is also provided, both size and position were updated (e.g. resize with n/w handles) - send single PATCH. */
  onResize: (id: string, width: number, height: number, positionX?: number, positionY?: number) => void;
  onBringToFront?: (id: string) => void;
  /** Called when the pin is pressed to start a red-string connection */
  onPinMouseDown?: (id: string) => void;
  /** True when another item is being linked (pin shows linking hover state) */
  isLinking?: boolean;
  /** Called when user right-clicks the image (for context menu). Call e.preventDefault() and e.stopPropagation() before showing menu. */
  onContextMenu?: (e: React.MouseEvent) => void;
  zoom?: number;
  /** Fixed board boundary (world coords) the image cannot be dragged past. */
  boardMinX?: number;
  boardMinY?: number;
  boardMaxX?: number;
  boardMaxY?: number;
}

function ImageCardComponent({
  image,
  zIndex = 0,
  onDragStart,
  onDragStop,
  onDelete,
  onResize,
  onBringToFront,
  onPinMouseDown,
  isLinking = false,
  onContextMenu,
  zoom = 1,
  boardMinX = -Infinity,
  boardMinY = -Infinity,
  boardMaxX = Infinity,
  boardMaxY = Infinity,
}: ImageCardProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [size, setSize] = useState({
    width: image.width ?? DEFAULT_WIDTH,
    height: image.height ?? DEFAULT_HEIGHT,
  });
  const [position, setPosition] = useState({
    x: image.positionX ?? 20,
    y: image.positionY ?? 20,
  });
  const [isResizing, setIsResizing] = useState(false);

  const onResizeRef = useRef(onResize);
  const onDragStopRef = useRef(onDragStop);
  onResizeRef.current = onResize;
  onDragStopRef.current = onDragStop;

  useEffect(() => {
    if (isResizing) return;
    setSize({
      width: image.width ?? DEFAULT_WIDTH,
      height: image.height ?? DEFAULT_HEIGHT,
    });
  }, [image.width, image.height, isResizing]);

  useEffect(() => {
    if (isResizing) return;
    setPosition({ x: image.positionX ?? 20, y: image.positionY ?? 20 });
  }, [image.positionX, image.positionY, isResizing]);

  const handleDragStop: DraggableEventHandler = (_e, data) => {
    // react-draggable reads props.position right after this callback returns and, in
    // controlled mode, snaps back to it if it hasn't updated yet — flushSync forces the
    // new position to commit synchronously so it doesn't revert-then-flash to the old spot.
    flushSync(() => {
      setPosition({ x: data.x, y: data.y });
    });
    onDragStop(image.id, data.x, data.y);
  };

  const { startResize } = useBoardItemResize({
    size,
    position,
    zoom,
    minWidth: MIN_SIZE,
    maxWidth: MAX_WIDTH,
    minHeight: MIN_SIZE,
    maxHeight: MAX_HEIGHT,
    setSize,
    setPosition,
    setIsResizing,
    onResizeEnd: (final) => {
      setTimeout(() => onResizeRef.current(image.id, final.width, final.height, final.x, final.y), 0);
    },
  });

  const edgeThickness = 6;

  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
      position={position}
      onStart={() => onDragStart?.(image.id)}
      onStop={handleDragStop}
      handle=".image-card-handle"
      scale={zoom}
      disabled={isResizing}
      bounds={{ left: boardMinX, top: boardMinY, right: boardMaxX - size.width, bottom: boardMaxY - size.height }}
    >
      <div
        ref={nodeRef}
        data-board-item="image"
        className="absolute overflow-visible rounded-lg shadow-lg bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 will-change-transform"
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          zIndex,
          transformOrigin: "center center",
          rotate: `${image.rotation ?? 0}deg`,
        }}
        onMouseDown={() => onBringToFront?.(image.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(e);
        }}
      >
        {/* Pin – interactive for red-string linking */}
        <div
          data-pin-note-id={image.id}
          className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 group/pin"
          onMouseDown={(e) => {
            if (!onPinMouseDown) return;
            e.stopPropagation();
            e.preventDefault();
            onPinMouseDown(image.id);
          }}
        >
          <div className="absolute -inset-2" />
          <div className="relative">
            {isLinking && (
              <span className="absolute inset-0 rounded-full animate-ripple-out motion-reduce:hidden" style={{ background: "rgb(248 113 113 / 0.5)" }} />
            )}
            <div
              className={[
                "relative h-4 w-4 rounded-full shadow-md border-2 border-white/60 transition-[transform] duration-150 ease-out-smooth bg-red-500 motion-reduce:transition-none",
                onPinMouseDown ? "cursor-pointer group-hover/pin:scale-150" : "",
                isLinking ? "group-hover/pin:scale-150 group-hover/pin:ring-2 group-hover/pin:ring-red-400" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          </div>
        </div>

        {/* Drag handle + delete */}
        <div className="image-card-handle absolute top-0 left-0 right-0 flex cursor-grab items-center justify-between rounded-t-lg bg-black/5 dark:bg-white/10 px-2 py-1 active:cursor-grabbing z-10">
          <GripVertical className="h-3.5 w-3.5 text-black/30 dark:text-white/50" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="rounded p-0.5 text-black/30 dark:text-white/50 transition-colors hover:bg-black/10 dark:hover:bg-white/20 hover:text-black/60 dark:hover:text-white/80"
            aria-label="Delete image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Image */}
        <div className="absolute inset-0 overflow-hidden rounded-lg pt-8">
          <img
            src={image.imageUrl}
            alt="Board image"
            className="h-full w-full object-contain pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Edge resize handles */}
        <div
          className={`absolute left-2 right-2 top-0 ${CURSOR_MAP.n}`}
          style={{ height: edgeThickness }}
          onMouseDown={startResize("n")}
        />
        <div
          className={`absolute left-2 right-2 bottom-0 ${CURSOR_MAP.s}`}
          style={{ height: edgeThickness }}
          onMouseDown={startResize("s")}
        />
        <div
          className={`absolute top-2 bottom-2 left-0 ${CURSOR_MAP.w}`}
          style={{ width: edgeThickness }}
          onMouseDown={startResize("w")}
        />
        <div
          className={`absolute top-2 bottom-2 right-0 ${CURSOR_MAP.e}`}
          style={{ width: edgeThickness }}
          onMouseDown={startResize("e")}
        />

        {/* Corner resize handles */}
        <div
          className={`absolute top-0 left-0 h-3 w-3 ${CURSOR_MAP.nw}`}
          onMouseDown={startResize("nw")}
        />
        <div
          className={`absolute top-0 right-0 h-3 w-3 ${CURSOR_MAP.ne}`}
          onMouseDown={startResize("ne")}
        />
        <div
          className={`absolute bottom-0 left-0 h-3 w-3 ${CURSOR_MAP.sw}`}
          onMouseDown={startResize("sw")}
        />
        <div
          className={`absolute bottom-0 right-0 h-3 w-3 ${CURSOR_MAP.se}`}
          onMouseDown={startResize("se")}
        />

        {/* Delete confirmation overlay */}
        {showDeleteConfirm && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center rounded-lg bg-black/40 dark:bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-4 rounded-lg bg-white dark:bg-zinc-800 p-4 shadow-xl border border-black/10 dark:border-white/10">
              <p className="mb-3 text-sm font-medium text-gray-800 dark:text-zinc-100">
                Delete this image?
              </p>
              <p className="mb-4 text-xs text-gray-500 dark:text-zinc-400">
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                  }}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-zinc-300 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                    onDelete(image.id);
                  }}
                  className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Draggable>
  );
}

// Board pages re-render on every unrelated realtime event (remote cursors, presence, etc.),
// which would otherwise recreate every image's JSX on each broadcast. Only re-render an image
// when its own data actually changed; callback props are treated as stable since the board's
// handlers read live data via refs rather than render-scoped closures.
export const ImageCard = memo(ImageCardComponent, (prev, next) => {
  return (
    prev.image === next.image &&
    prev.zIndex === next.zIndex &&
    prev.isLinking === next.isLinking &&
    prev.zoom === next.zoom
  );
});
