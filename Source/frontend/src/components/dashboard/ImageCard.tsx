import { useEffect, useRef, useState } from "react";
import Draggable, { type DraggableEventHandler } from "react-draggable";
import { X, GripVertical } from "lucide-react";
import type { BoardImageSummaryDto } from "../../types";

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 150;
const MIN_SIZE = 60;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

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
}

export function ImageCard({
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
    setPosition({ x: data.x, y: data.y });
    onDragStop(image.id, data.x, data.y);
  };

  const resizeRef = useRef<{
    dir: ResizeDir;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  const listenersRef = useRef<{
    move: (e: MouseEvent) => void;
    up: () => void;
  } | null>(null);
  const lastResizeValuesRef = useRef<{ w: number; h: number; x: number; y: number } | null>(null);

  function startResize(dir: ResizeDir) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (listenersRef.current) {
        document.removeEventListener("mousemove", listenersRef.current.move);
        document.removeEventListener("mouseup", listenersRef.current.up);
      }

      resizeRef.current = {
        dir,
        startX: e.clientX,
        startY: e.clientY,
        startW: size.width,
        startH: size.height,
        startPosX: position.x,
        startPosY: position.y,
      };

      setIsResizing(true);

      function onMove(ev: MouseEvent) {
        const rs = resizeRef.current;
        if (!rs) return;

        const dx = (ev.clientX - rs.startX) / zoom;
        const dy = (ev.clientY - rs.startY) / zoom;

        let newW = rs.startW;
        let newH = rs.startH;
        let newX = rs.startPosX;
        let newY = rs.startPosY;

        if (rs.dir === "e" || rs.dir === "ne" || rs.dir === "se") {
          newW = Math.min(MAX_WIDTH, Math.max(MIN_SIZE, rs.startW + dx));
        }
        if (rs.dir === "w" || rs.dir === "nw" || rs.dir === "sw") {
          const proposed = rs.startW - dx;
          if (proposed >= MIN_SIZE && proposed <= MAX_WIDTH) {
            newW = proposed;
            newX = rs.startPosX + dx;
          } else if (proposed < MIN_SIZE) {
            newW = MIN_SIZE;
            newX = rs.startPosX + (rs.startW - MIN_SIZE);
          } else {
            newW = MAX_WIDTH;
            newX = rs.startPosX + (rs.startW - MAX_WIDTH);
          }
        }
        if (rs.dir === "s" || rs.dir === "se" || rs.dir === "sw") {
          newH = Math.min(MAX_HEIGHT, Math.max(MIN_SIZE, rs.startH + dy));
        }
        if (rs.dir === "n" || rs.dir === "ne" || rs.dir === "nw") {
          const proposed = rs.startH - dy;
          if (proposed >= MIN_SIZE && proposed <= MAX_HEIGHT) {
            newH = proposed;
            newY = rs.startPosY + dy;
          } else if (proposed < MIN_SIZE) {
            newH = MIN_SIZE;
            newY = rs.startPosY + (rs.startH - MIN_SIZE);
          } else {
            newH = MAX_HEIGHT;
            newY = rs.startPosY + (rs.startH - MAX_HEIGHT);
          }
        }

        lastResizeValuesRef.current = { w: newW, h: newH, x: newX, y: newY };
        setSize({ width: newW, height: newH });
        setPosition({ x: newX, y: newY });
      }

      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        listenersRef.current = null;
        let final = lastResizeValuesRef.current;
        lastResizeValuesRef.current = null;
        const rs = resizeRef.current;
        resizeRef.current = null;
        setIsResizing(false);

        if (!final && rs) {
          final = { w: rs.startW, h: rs.startH, x: rs.startPosX, y: rs.startPosY };
        }
        if (final) {
          const w = Math.round(final.w);
          const h = Math.round(final.h);
          const x = Math.round(final.x);
          const y = Math.round(final.y);
          setSize({ width: final.w, height: final.h });
          setPosition({ x: final.x, y: final.y });
          setTimeout(() => onResizeRef.current(image.id, w, h, x, y), 0);
        }
      }

      listenersRef.current = { move: onMove, up: onUp };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };
  }

  useEffect(() => {
    return () => {
      if (listenersRef.current) {
        document.removeEventListener("mousemove", listenersRef.current.move);
        document.removeEventListener("mouseup", listenersRef.current.up);
        listenersRef.current = null;
      }
    };
  }, []);

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
    >
      <div
        ref={nodeRef}
        data-board-item="image"
        className="absolute overflow-visible rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10"
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
            <div className="mx-4 rounded-lg bg-white dark:bg-gray-800 p-4 shadow-xl border border-black/10 dark:border-white/10">
              <p className="mb-3 text-sm font-medium text-gray-800 dark:text-gray-100">
                Delete this image?
              </p>
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                  }}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
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
