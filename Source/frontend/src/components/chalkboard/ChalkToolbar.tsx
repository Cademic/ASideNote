import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Pen,
  MousePointer2,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  StickyNote,
  Minus,
  Circle,
  GripVertical,
} from "lucide-react";

export type ChalkMode = "draw" | "select";
export type ChalkTool = "pen" | "eraser";

interface ChalkToolbarProps {
  mode: ChalkMode;
  tool: ChalkTool;
  brushColor: string;
  brushSize: number;
  onModeChange: (mode: ChalkMode) => void;
  onToolChange: (tool: ChalkTool) => void;
  onBrushColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onAddStickyNote: () => void;
}

const CHALK_COLORS = [
  { value: "#ffffff", label: "White" },
  { value: "#000000", label: "Black" },
  { value: "#fde68a", label: "Yellow" },
  { value: "#fca5a5", label: "Pink" },
  { value: "#93c5fd", label: "Blue" },
  { value: "#86efac", label: "Green" },
  { value: "#fdba74", label: "Orange" },
];

const BRUSH_SIZES = [
  { value: 2, label: "Fine", icon: Minus },
  { value: 5, label: "Medium", icon: Circle },
  { value: 10, label: "Thick", icon: Circle },
];

export function ChalkToolbar({
  mode,
  tool,
  brushColor,
  brushSize,
  onModeChange,
  onToolChange,
  onBrushColorChange,
  onBrushSizeChange,
  onUndo,
  onRedo,
  onClear,
  onAddStickyNote,
}: ChalkToolbarProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState<{ centerX: number; centerY: number } | null>(null);
  const [, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; centerX: number; centerY: number } | null>(null);
  const draggedRef = useRef(false);

  // Initialize position at bottom-center when container is ready
  useEffect(() => {
    const updatePosition = () => {
      const container = wrapperRef.current?.parentElement;
      if (!container) return;
      const cr = container.getBoundingClientRect();
      if (position === null) {
        setPosition({
          centerX: cr.width / 2,
          centerY: cr.height - 36,
        });
      }
    };
    updatePosition();
    const ro = new ResizeObserver(updatePosition);
    if (wrapperRef.current?.parentElement) ro.observe(wrapperRef.current.parentElement);
    return () => ro.disconnect();
  }, [position]);

  // Click outside to collapse
  useEffect(() => {
    if (!isExpanded) return;
    function handleClick(e: MouseEvent) {
      const wrapper = wrapperRef.current;
      if (wrapper && !wrapper.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    }
    document.addEventListener("pointerdown", handleClick, { capture: true });
    return () => document.removeEventListener("pointerdown", handleClick, { capture: true });
  }, [isExpanded]);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    draggedRef.current = false;
    if (position === null) return;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      centerX: position.centerX,
      centerY: position.centerY,
    };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [position]);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) draggedRef.current = true;
    const wrapper = wrapperRef.current;
    const container = wrapper?.parentElement;
    if (!wrapper || !container) return;
    const cr = container.getBoundingClientRect();
    const wr = wrapper.getBoundingClientRect();
    const halfW = wr.width / 2;
    const halfH = wr.height / 2;
    let newCenterX = dragStartRef.current.centerX + deltaX;
    let newCenterY = dragStartRef.current.centerY + deltaY;
    newCenterX = Math.max(halfW, Math.min(cr.width - halfW, newCenterX));
    newCenterY = Math.max(halfH, Math.min(cr.height - halfH, newCenterY));
    setPosition({ centerX: newCenterX, centerY: newCenterY });
  }, []);

  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    dragStartRef.current = null;
    setIsDragging(false);
  }, []);

  const handleCollapsedPointerUp = useCallback(
    (e: React.PointerEvent) => {
      handleDragEnd(e);
      if (!draggedRef.current) setIsExpanded(true);
    },
    [handleDragEnd],
  );

  function handleClear() {
    setShowClearConfirm(true);
  }

  function confirmClear() {
    setShowClearConfirm(false);
    onClear();
  }

  const scale = "scale-[0.85] sm:scale-100";
  const iconSize = "h-3.5 w-3.5 sm:h-4 sm:w-4";
  const btnSize = "h-6 w-6 sm:h-7 sm:w-7";
  const padSize = "px-2 py-1.5 sm:px-3 sm:py-2";

  return (
    <div
      ref={wrapperRef}
      className="absolute z-30 pointer-events-none"
      style={
        position !== null
          ? {
              left: position.centerX,
              top: position.centerY,
              transform: "translate(-50%, -50%)",
            }
          : { left: "50%", bottom: 36, transform: "translate(-50%, 0)" }
      }
    >
      <div
        ref={containerRef}
        className={`pointer-events-none flex items-center rounded-2xl border border-white/10 bg-gray-900/80 shadow-2xl backdrop-blur-md transition-all ${scale} ${padSize} ${isExpanded ? "gap-1" : "gap-0"}`}
      >
        {isExpanded ? (
          <>
            {/* Drag handle */}
            <div
              className={`pointer-events-auto flex cursor-grab items-center justify-center pr-1 ${btnSize} touch-none text-white/40 hover:text-white/60 active:cursor-grabbing`}
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
              title="Drag to move"
            >
              <GripVertical className={`${iconSize}`} />
            </div>
            <Divider />
            {/* Mode toggle */}
            <ToolButton
              active={mode === "select"}
              onClick={() => onModeChange("select")}
              title="Select mode (move sticky notes)"
              className={btnSize}
              iconClassName={iconSize}
            >
              <MousePointer2 />
            </ToolButton>
            <ToolButton
              active={mode === "draw" && tool === "pen"}
              onClick={() => {
                onModeChange("draw");
                onToolChange("pen");
              }}
              title="Pen tool"
              className={btnSize}
              iconClassName={iconSize}
            >
              <Pen />
            </ToolButton>
            <ToolButton
              active={mode === "draw" && tool === "eraser"}
              onClick={() => {
                onModeChange("draw");
                onToolChange("eraser");
              }}
              title="Eraser"
              className={btnSize}
              iconClassName={iconSize}
            >
              <Eraser />
            </ToolButton>

            <Divider />

            {/* Color palette */}
            {CHALK_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => {
                  onBrushColorChange(c.value);
                  if (mode !== "draw" || tool !== "pen") {
                    onModeChange("draw");
                    onToolChange("pen");
                  }
                }}
                className={[
                  `pointer-events-auto flex ${btnSize} items-center justify-center rounded-full transition-all`,
                  brushColor === c.value && mode === "draw" && tool === "pen"
                    ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900/80 scale-110"
                    : "hover:scale-110 opacity-80 hover:opacity-100",
                ].join(" ")}
              >
                <div
                  className={`h-3 w-3 min-h-3 min-w-3 shrink-0 sm:h-4 sm:min-h-4 sm:min-w-4 rounded-full border ${c.value.toLowerCase() === "#000000" ? "border-white/40" : "border-white/20"}`}
                  style={{ backgroundColor: c.value }}
                />
              </button>
            ))}

            <Divider />

            {/* Brush size */}
            {BRUSH_SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                title={s.label}
                onClick={() => onBrushSizeChange(s.value)}
                className={[
                  `pointer-events-auto flex ${btnSize} items-center justify-center rounded-lg transition-all`,
                  brushSize === s.value
                    ? "bg-white/20 text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/10",
                ].join(" ")}
              >
                <div
                  className="rounded-full bg-current"
                  style={{
                    width: `${Math.max(3, Math.min(s.value, 8))}px`,
                    height: `${Math.max(3, Math.min(s.value, 8))}px`,
                  }}
                />
              </button>
            ))}

            <Divider />

            {/* Undo / Redo */}
            <ToolButton onClick={onUndo} title="Undo" className={btnSize} iconClassName={iconSize}>
              <Undo2 />
            </ToolButton>
            <ToolButton onClick={onRedo} title="Redo" className={btnSize} iconClassName={iconSize}>
              <Redo2 />
            </ToolButton>

            <Divider />

            {/* Add Sticky Note */}
            <ToolButton
              onClick={onAddStickyNote}
              title="Add sticky note"
              className={`text-yellow-400/80 hover:text-yellow-300 ${btnSize}`}
              iconClassName={iconSize}
            >
              <StickyNote />
            </ToolButton>

            <Divider />

            {/* Clear */}
            <div className="relative">
              <ToolButton
                onClick={handleClear}
                title="Clear canvas"
                className={`text-red-400/60 hover:text-red-400 ${btnSize}`}
                iconClassName={iconSize}
              >
                <Trash2 />
              </ToolButton>

              {showClearConfirm && (
                <div className="pointer-events-auto absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-gray-900/95 p-3 shadow-xl backdrop-blur-md">
                  <p className="mb-2 text-xs font-medium text-white/80">
                    Clear entire canvas?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="rounded-md px-2.5 py-1 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmClear}
                      className="rounded-md bg-red-500/80 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-500"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            className={`pointer-events-auto flex ${btnSize} cursor-grab items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white active:cursor-grabbing`}
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleCollapsedPointerUp}
            onPointerCancel={handleDragEnd}
            title="Tools (click to expand, drag to move)"
          >
            <Pen className={iconSize} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Internal sub-components ────────────────────────────────────────── */

interface ToolButtonProps {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title: string;
  className?: string;
  iconClassName?: string;
}

function ToolButton({ children, active, onClick, title, className, iconClassName = "h-4 w-4" }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={[
        "pointer-events-auto flex items-center justify-center rounded-lg transition-all",
        active
          ? "bg-white/20 text-white shadow-inner"
          : "text-white/50 hover:text-white/80 hover:bg-white/10",
        className ?? "h-8 w-8",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {React.isValidElement(children) && children.type
        ? React.cloneElement(children as React.ReactElement<{ className?: string }>, {
            className: iconClassName,
          })
        : children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-6 w-px bg-white/10" />;
}
