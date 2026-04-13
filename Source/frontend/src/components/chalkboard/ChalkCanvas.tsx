import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { Canvas, PencilBrush } from "fabric";

export interface ChalkCanvasHandle {
  setBrushColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setDrawingMode: (enabled: boolean) => void;
  setEraserMode: (enabled: boolean) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  toJSON: () => string;
  loadFromJSON: (json: string) => Promise<void>;
  applyViewport: (zoom: number, panX: number, panY: number) => void;
}

interface ChalkCanvasProps {
  isActive: boolean;
  brushColor?: string;
  brushSize?: number;
  zoom?: number;
  panX?: number;
  panY?: number;
  onChange?: () => void;
  /** Override background color (e.g. for WhiteBoard/Blackboard theme) */
  backgroundColor?: string;
}

export const CHALKBOARD_BG = "#2d4a3e";

export const RESOLUTION_FACTOR = 2;

const CHALK_JSON_VERSION = 2;

function scaleFabricJSON(obj: Record<string, unknown>, factor: number): void {
  if (obj.objects && Array.isArray(obj.objects)) {
    for (const item of obj.objects as Record<string, unknown>[]) {
      if (typeof item.left === "number") item.left *= factor;
      if (typeof item.top === "number") item.top *= factor;
      if (typeof item.width === "number") item.width *= factor;
      if (typeof item.height === "number") item.height *= factor;
      if (typeof item.strokeWidth === "number") item.strokeWidth *= factor;
      if (typeof item.fontSize === "number") item.fontSize *= factor;
      if (item.path && Array.isArray(item.path)) {
        for (const cmd of item.path as (string | number)[][]) {
          if (Array.isArray(cmd)) {
            for (let i = 1; i < cmd.length; i++) {
              if (typeof cmd[i] === "number") (cmd as number[])[i] *= factor;
            }
          }
        }
      }
      if (item.points && Array.isArray(item.points)) {
        for (const pt of item.points as { x: number; y: number }[]) {
          if (pt && typeof pt.x === "number") pt.x *= factor;
          if (pt && typeof pt.y === "number") pt.y *= factor;
        }
      }
    }
  }
  if (typeof obj.width === "number") obj.width *= factor;
  if (typeof obj.height === "number") obj.height *= factor;
}

export const ChalkCanvas = forwardRef<ChalkCanvasHandle, ChalkCanvasProps>(
  function ChalkCanvas(
    { isActive, brushColor = "#ffffff", brushSize = 3, zoom = 1, panX = 0, panY = 0, onChange, backgroundColor = CHALKBOARD_BG },
    ref,
  ) {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<Canvas | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const undoStackRef = useRef<string[]>([]);
    const redoStackRef = useRef<string[]>([]);
    const isLoadingRef = useRef(false);
    const isEraserRef = useRef(false);
    const currentColorRef = useRef(brushColor);
    const currentSizeRef = useRef(brushSize);
    const backgroundColorRef = useRef(backgroundColor);

    // Keep refs in sync
    currentColorRef.current = brushColor;
    currentSizeRef.current = brushSize;
    backgroundColorRef.current = backgroundColor;

    // Initialize fabric canvas
    useEffect(() => {
      if (!canvasElRef.current || fabricRef.current) return;

      const cw = containerRef.current?.clientWidth ?? 800;
      const ch = containerRef.current?.clientHeight ?? 600;
      const canvas = new Canvas(canvasElRef.current, {
        isDrawingMode: true,
        backgroundColor: backgroundColor,
        width: cw * RESOLUTION_FACTOR,
        height: ch * RESOLUTION_FACTOR,
        selection: false,
        enableRetinaScaling: true,
      });

      const brush = new PencilBrush(canvas);
      brush.color = currentColorRef.current;
      brush.width = currentSizeRef.current;
      brush.strokeLineCap = "round";
      brush.strokeLineJoin = "round";
      canvas.freeDrawingBrush = brush;

      fabricRef.current = canvas;

      // Save initial state to undo stack (with version for new format)
      const initObj = canvas.toJSON() as Record<string, unknown>;
      initObj._chalkVersion = CHALK_JSON_VERSION;
      undoStackRef.current = [JSON.stringify(initObj)];

      return () => {
        canvas.dispose();
        fabricRef.current = null;
      };
    // Init once; backgroundColor is synced without recreating the canvas (see effect below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listen for path:created to push undo state
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      function handlePathCreated() {
        if (isLoadingRef.current) return;
        const obj = canvas!.toJSON() as Record<string, unknown>;
        obj._chalkVersion = CHALK_JSON_VERSION;
        undoStackRef.current.push(JSON.stringify(obj));
        redoStackRef.current = [];
        onChange?.();
      }

      canvas.on("path:created", handlePathCreated);
      return () => {
        canvas.off("path:created", handlePathCreated);
      };
    }, [onChange]);

    // Resize canvas when container resizes
    useEffect(() => {
      const container = containerRef.current;
      const canvas = fabricRef.current;
      if (!container || !canvas) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            canvas.setDimensions({
              width: width * RESOLUTION_FACTOR,
              height: height * RESOLUTION_FACTOR,
            });
            canvas.renderAll();
          }
        }
      });

      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }, []);

    // Update background color when prop changes
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      canvas.backgroundColor = backgroundColor;
      canvas.renderAll();
    }, [backgroundColor]);

    // Sync fabric viewport transform with zoom/pan props
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const vpScale = zoom / RESOLUTION_FACTOR;
      canvas.setViewportTransform([
        vpScale, 0, 0, vpScale,
        vpScale * panX, vpScale * panY,
      ]);
      canvas.renderAll();
    }, [zoom, panX, panY]);

    // Toggle pointer events based on isActive
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      if (isActive) {
        canvas.isDrawingMode = true;
      }
    }, [isActive]);

    // Update brush color
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas?.freeDrawingBrush || isEraserRef.current) return;
      canvas.freeDrawingBrush.color = brushColor;
    }, [brushColor]);

    // Update brush size (fixed - virtual canvas keeps resolution constant)
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas?.freeDrawingBrush) return;
      canvas.freeDrawingBrush.width = brushSize;
    }, [brushSize]);

    const setBrushColor = useCallback((color: string) => {
      const canvas = fabricRef.current;
      if (!canvas?.freeDrawingBrush) return;
      isEraserRef.current = false;
      canvas.freeDrawingBrush.color = color;
      canvas.isDrawingMode = true;
    }, []);

    const setBrushSizeFn = useCallback((size: number) => {
      const canvas = fabricRef.current;
      if (!canvas?.freeDrawingBrush) return;
      canvas.freeDrawingBrush.width = size;
    }, []);

    const setDrawingMode = useCallback((enabled: boolean) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      canvas.isDrawingMode = enabled;
      if (enabled) {
        isEraserRef.current = false;
        canvas.freeDrawingBrush!.color = currentColorRef.current;
      }
    }, []);

    const setEraserMode = useCallback((enabled: boolean) => {
      const canvas = fabricRef.current;
      if (!canvas?.freeDrawingBrush) return;
      isEraserRef.current = enabled;
      if (enabled) {
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = backgroundColorRef.current;
        canvas.freeDrawingBrush.width = Math.max(currentSizeRef.current * 3, 20);
      } else {
        canvas.freeDrawingBrush.color = currentColorRef.current;
        canvas.freeDrawingBrush.width = currentSizeRef.current;
      }
    }, []);

    const applyViewport = useCallback((z: number, px: number, py: number) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const vpScale = z / RESOLUTION_FACTOR;
      canvas.setViewportTransform([
        vpScale, 0, 0, vpScale,
        vpScale * px, vpScale * py,
      ]);
      canvas.renderAll();
    }, []);

    const loadParsedJSON = useCallback(async (parsed: Record<string, unknown>) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const version = parsed._chalkVersion as number | undefined;
      if (version !== CHALK_JSON_VERSION) {
        scaleFabricJSON(parsed, RESOLUTION_FACTOR);
        parsed._chalkVersion = CHALK_JSON_VERSION;
      }
      await canvas.loadFromJSON(parsed);
    }, []);

    const undo = useCallback(() => {
      const canvas = fabricRef.current;
      if (!canvas || undoStackRef.current.length <= 1) return;

      const current = undoStackRef.current.pop()!;
      redoStackRef.current.push(current);

      const previous = undoStackRef.current[undoStackRef.current.length - 1];
      isLoadingRef.current = true;
      loadParsedJSON(JSON.parse(previous)).then(() => {
        canvas.renderAll();
        isLoadingRef.current = false;
        onChange?.();
      });
    }, [onChange, loadParsedJSON]);

    const redo = useCallback(() => {
      const canvas = fabricRef.current;
      if (!canvas || redoStackRef.current.length === 0) return;

      const next = redoStackRef.current.pop()!;
      undoStackRef.current.push(next);

      isLoadingRef.current = true;
      loadParsedJSON(JSON.parse(next)).then(() => {
        canvas.renderAll();
        isLoadingRef.current = false;
        onChange?.();
      });
    }, [onChange, loadParsedJSON]);

    const clear = useCallback(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const bg = backgroundColorRef.current;
      canvas.clear();
      canvas.backgroundColor = bg;
      canvas.renderAll();

      const obj = canvas.toJSON() as Record<string, unknown>;
      obj._chalkVersion = CHALK_JSON_VERSION;
      undoStackRef.current.push(JSON.stringify(obj));
      redoStackRef.current = [];
      onChange?.();
    }, [onChange]);

    const toJSON = useCallback(() => {
      const canvas = fabricRef.current;
      if (!canvas) return "{}";
      const obj = canvas.toJSON() as Record<string, unknown>;
      obj._chalkVersion = CHALK_JSON_VERSION;
      return JSON.stringify(obj);
    }, []);

    const loadFromJSON = useCallback(async (json: string) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      isLoadingRef.current = true;
      try {
        const parsed = JSON.parse(json) as Record<string, unknown>;
        await loadParsedJSON(parsed);
        parsed._chalkVersion = CHALK_JSON_VERSION;
        canvas.backgroundColor = backgroundColorRef.current;
        canvas.renderAll();
        undoStackRef.current = [JSON.stringify(parsed)];
        redoStackRef.current = [];
      } catch {
        // If JSON is invalid, keep the current state
      } finally {
        isLoadingRef.current = false;
      }
    }, [loadParsedJSON]);

    useImperativeHandle(
      ref,
      () => ({
        setBrushColor,
        setBrushSize: setBrushSizeFn,
        setDrawingMode,
        setEraserMode,
        undo,
        redo,
        clear,
        toJSON,
        loadFromJSON,
        applyViewport,
      }),
      [setBrushColor, setBrushSizeFn, setDrawingMode, setEraserMode, undo, redo, clear, toJSON, loadFromJSON, applyViewport],
    );

    return (
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden"
        style={{
          pointerEvents: isActive ? "auto" : "none",
          backgroundColor,
        }}
      >
        <canvas
          ref={canvasElRef}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>
    );
  },
);
