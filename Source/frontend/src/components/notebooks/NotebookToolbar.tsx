import { useState, useRef, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { uploadNotebookImage } from "../../api/notebooks";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Type,
  Undo2,
  Redo2,
  Printer,
  FileDown,
  Minus,
  Plus,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Link as LinkIcon,
  Eraser,
  Table,
  ListChecks,
  List,
  ListOrdered,
  Image as ImageIcon,
  ChevronDown,
  Menu,
  ChevronRight,
} from "lucide-react";
import { FontFamilySearch } from "../dashboard/FontFamilySearch";
import { FontSizeSearch } from "../dashboard/FontSizeSearch";

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 72;
const FONT_SIZE_PRESETS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

const ZOOM_PRESETS = [50, 75, 90, 100, 125, 150, 175, 200];

const LINE_SPACING_PRESETS = [
  { label: "1.0", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "2.0", value: "2" },
  { label: "2.5", value: "2.5" },
  { label: "3.0", value: "3" },
];

// Word/Google Docs–style theme colors: 10 columns (base colors), 5 shades each (lighter → darker)
const THEME_COLORS_GRID: string[][] = [
  ["#000000", "#7f7f7f", "#bfbfbf", "#e6e6e6", "#ffffff"], // black / grayscale
  ["#1f4e79", "#2e75b6", "#5b9bd5", "#9dc3e6", "#d6dce4"], // dark blue
  ["#0d5c2e", "#217346", "#70ad47", "#a9d08e", "#e2efda"], // dark green
  ["#843c0c", "#c65911", "#ed7d31", "#f4b183", "#fce4d6"], // orange
  ["#5c2d1f", "#843c0c", "#c55a11", "#e2a173", "#f8cbad"], // brown
  ["#1f3864", "#2f5496", "#4472c4", "#8faadc", "#d6dce4"], // blue
  ["#375623", "#548235", "#70ad47", "#a9d08e", "#e2efda"], // green
  ["#2e75b6", "#5b9bd5", "#9dc3e6", "#bdd7ee", "#deebf7"], // light blue
  ["#203864", "#5b2c6f", "#7030a0", "#b4a7d6", "#e4dfec"], // purple
  ["#7f6000", "#bf8f00", "#ffc000", "#ffd966", "#fff2cc"], // gold / lime
];

// Standard colors: one row of common vibrant colors
const STANDARD_COLORS = [
  "#c00000", "#ff0000", "#ffc000", "#ffff00", "#92d050", "#00b050", "#00b0f0", "#0070c0", "#002060", "#7030a0",
];

const AUTOMATIC_COLOR = "automatic" as const;

const STYLE_OPTIONS = [
  { value: "0", label: "Normal text" },
  { value: "1", label: "Title" },
  { value: "2", label: "Subtitle" },
  { value: "3", label: "Heading 3" },
  { value: "4", label: "Heading 4" },
  { value: "5", label: "Heading 5" },
  { value: "6", label: "Heading 6" },
];

interface NotebookToolbarProps {
  editor: Editor | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  /** Notebook ID for image uploads (required for upload flow). */
  notebookId: string | undefined;
  /** Download current content as PDF. */
  onDownloadPdf?: () => void;
  /** True while PDF export is in progress. */
  pdfExporting?: boolean;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

function ToolbarButton({
  isActive,
  onClick,
  title,
  children,
  disabled,
}: {
  isActive?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={[
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        disabled
          ? "cursor-not-allowed text-gray-400 dark:text-gray-500"
          : isActive
            ? "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function parseFontSize(raw: string | undefined | null): number {
  if (!raw) return 12;
  const n = parseInt(String(raw).replace(/px$/, ""), 10);
  return Number.isNaN(n) ? 12 : n;
}


function normalizeHex(hex: string): string {
  const m = hex.replace(/^#/, "").trim();
  if (m.length === 6 && /^[0-9A-Fa-f]+$/.test(m)) return "#" + m;
  if (m.length === 3 && /^[0-9A-Fa-f]+$/.test(m))
    return "#" + m[0] + m[0] + m[1] + m[1] + m[2] + m[2];
  return hex;
}

function WordStyleColorPicker({
  editor,
  currentColor,
  isAutomatic,
  type,
  onClose,
}: {
  editor: Editor;
  currentColor: string;
  isAutomatic: boolean;
  type: "text" | "highlight";
  onClose: () => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [customColor, setCustomColor] = useState(currentColor);
  const [hexInput, setHexInput] = useState(currentColor.replace(/^#/, "").toUpperCase());

  function applyColor(color: string) {
    if (color === AUTOMATIC_COLOR) {
      if (type === "text") {
        editor.chain().focus().unsetColor().run();
      } else {
        editor.chain().focus().unsetHighlight().run();
      }
    } else {
      const hex = normalizeHex(color.startsWith("#") ? color : "#" + color);
      if (type === "text") {
        editor.chain().focus().setColor(hex).run();
      } else {
        editor.chain().focus().toggleHighlight({ color: hex }).run();
      }
    }
    onClose();
  }

  function handleCustomApply() {
    applyColor(hexInput);
  }

  return (
    <div
      className="absolute left-0 top-full z-50 mt-1 w-[248px] rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-600 dark:bg-gray-800"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="mb-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">Automatic</div>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          applyColor(AUTOMATIC_COLOR);
        }}
        className={`mb-3 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
          isAutomatic ? "bg-amber-50 dark:bg-amber-900/20" : ""
        }`}
      >
        <span
          className={`h-5 w-5 shrink-0 rounded border ${
            isAutomatic ? "border-gray-800 ring-1 ring-gray-400" : "border-gray-300 dark:border-gray-500"
          } ${type === "text" ? "bg-foreground" : "bg-gray-100 dark:bg-gray-700"}`}
        />
        <span>Automatic</span>
      </button>
      <div className="mb-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">Theme colors</div>
      <div className="grid grid-cols-10 gap-0.5">
        {Array.from({ length: 5 }, (_, rowIdx) =>
          THEME_COLORS_GRID.map((col, colIdx) => {
            const hex = col[rowIdx];
            return (
              <button
                key={`${rowIdx}-${colIdx}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyColor(hex);
                }}
                title={hex}
                className={`h-5 w-5 rounded-sm border transition-transform ${
                  currentColor.toLowerCase() === hex.toLowerCase()
                    ? "scale-110 border-gray-800 ring-1 ring-gray-400"
                    : "border-gray-300 hover:scale-105 dark:border-gray-500"
                }`}
                style={{ backgroundColor: hex }}
              />
            );
          }),
        ).flat()}
      </div>
      <div className="mb-2 mt-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">Standard colors</div>
      <div className="flex flex-wrap gap-0.5">
        {STANDARD_COLORS.map((hex) => (
          <button
            key={hex}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              applyColor(hex);
            }}
            className={`h-5 w-5 rounded-sm border transition-transform ${
              currentColor.toLowerCase() === hex.toLowerCase()
                ? "scale-110 border-gray-800 ring-1 ring-gray-400"
                : "border-gray-300 hover:scale-105 dark:border-gray-500"
            }`}
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
      <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-600">
        {!showCustom ? (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowCustom(true);
              setCustomColor(currentColor);
              setHexInput(currentColor.replace(/^#/, "").toUpperCase());
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <span className="inline-block h-4 w-4 rounded border border-gray-300 dark:border-gray-500" style={{ backgroundColor: currentColor }} />
            More colors…
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  const v = e.target.value;
                  setCustomColor(v);
                  setHexInput(v.replace(/^#/, "").toUpperCase());
                }}
                className="h-8 w-10 shrink-0 cursor-pointer rounded border border-gray-300 dark:border-gray-500"
              />
              <input
                type="text"
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value.toUpperCase())}
                onBlur={() => {
                  const normalized = normalizeHex(hexInput.startsWith("#") ? hexInput : "#" + hexInput);
                  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
                    setCustomColor(normalized);
                    setHexInput(normalized.replace(/^#/, "").toUpperCase());
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && handleCustomApply()}
                placeholder="Hex"
                className="h-8 flex-1 rounded border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              />
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCustomApply();
                }}
                className="flex-1 rounded bg-sky-100 px-2 py-1.5 text-sm font-medium text-sky-800 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:hover:bg-sky-900/60"
              >
                OK
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowCustom(false);
                }}
                className="rounded bg-gray-100 px-2 py-1.5 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FontSizeWithButtons({ editor }: { editor: Editor }) {
  const currentRaw = editor.getAttributes("textStyle").fontSize as string | undefined;
  const currentNum = parseFontSize(currentRaw);

  function applySize(num: number) {
    const clamped = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, num));
    editor.chain().focus().setFontSize(`${clamped}px`).run();
  }

  return (
    <div className="flex min-w-0 items-center rounded-md border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800">
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          applySize(currentNum - 1);
        }}
        disabled={currentNum <= MIN_FONT_SIZE}
        title="Decrease font size"
        className="flex h-8 w-7 shrink-0 items-center justify-center rounded-l-md border-r border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <div className="min-w-0 flex-1 px-0.5" onMouseDown={(e) => e.stopPropagation()}>
        <FontSizeSearch
          editor={editor}
          size="menu"
          variant="horizontal"
          presets={FONT_SIZE_PRESETS}
          minSize={MIN_FONT_SIZE}
          maxSize={MAX_FONT_SIZE}
          defaultSize={12}
          className="w-full min-w-0"
          inputClassName="h-8 w-full min-w-[3.25rem] border-0 bg-transparent text-center text-sm text-gray-700 shadow-none focus:outline-none focus:ring-0 dark:text-gray-200"
        />
      </div>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          applySize(currentNum + 1);
        }}
        disabled={currentNum >= MAX_FONT_SIZE}
        title="Increase font size"
        className="flex h-8 w-7 shrink-0 items-center justify-center rounded-r-md border-l border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function TextColorDropdown({ editor, currentColor, isAutomatic }: { editor: Editor; currentColor: string; isAutomatic: boolean }) {
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showPicker) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);
  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          setShowPicker(!showPicker);
        }}
        title="Text color"
        className="flex h-8 items-center gap-0.5 rounded-md border border-gray-200 px-1.5 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <Type className="h-4 w-4" />
        <span
          className={`h-3.5 w-3.5 rounded-sm border border-gray-300 dark:border-gray-500 ${isAutomatic ? "bg-foreground" : ""}`}
          style={isAutomatic ? undefined : { backgroundColor: currentColor }}
        />
      </button>
      {showPicker && (
        <WordStyleColorPicker
          editor={editor}
          currentColor={currentColor}
          isAutomatic={isAutomatic}
          type="text"
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function HighlightButton({
  editor,
  isHighlightActive,
  highlightColor: highlightColorProp,
}: {
  editor: Editor;
  isHighlightActive: boolean;
  highlightColor: string | undefined;
}) {
  const [showColors, setShowColors] = useState(false);
  const highlightColor = highlightColorProp || "#fef08a";
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showColors) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowColors(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColors]);
  return (
    <div ref={containerRef} className="flex items-center">
      <ToolbarButton
        isActive={isHighlightActive}
        onClick={() => {
          if (isHighlightActive) {
            editor.chain().focus().unsetHighlight().run();
          } else {
            editor.chain().focus().toggleHighlight({ color: highlightColor }).run();
          }
        }}
        title="Highlight"
      >
        <Highlighter className="h-4 w-4" />
      </ToolbarButton>
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setShowColors(!showColors);
          }}
          className="ml-0.5 h-8 w-6 rounded-md border border-gray-200 px-0.5 text-[10px] text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
          title="Highlight color"
        >
          <ChevronDown className="mx-auto h-3 w-3" />
        </button>
        {showColors && (
          <WordStyleColorPicker
            editor={editor}
            currentColor={highlightColor}
            isAutomatic={!isHighlightActive}
            type="highlight"
            onClose={() => setShowColors(false)}
          />
        )}
      </div>
    </div>
  );
}

function LinkButton({ editor, isLinkActive }: { editor: Editor; isLinkActive: boolean }) {
  const [showInput, setShowInput] = useState(false);
  const [url, setUrl] = useState("");

  function handleSetLink() {
    if (url.trim()) {
      editor.chain().focus().setLink({ href: url.trim() }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setUrl("");
    setShowInput(false);
  }

  const isLink = isLinkActive;

  return (
    <div className="relative">
      <ToolbarButton
        isActive={isLink}
        onClick={() => {
          if (isLink) {
            editor.chain().focus().unsetLink().run();
          } else {
            setUrl(editor.getAttributes("link").href || "");
            setShowInput(true);
          }
        }}
        title="Link"
      >
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
      {showInput && (
        <div
          className="absolute left-0 top-full z-50 mt-1 flex gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-600 dark:bg-gray-800"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSetLink();
              if (e.key === "Escape") {
                setShowInput(false);
                setUrl("");
              }
            }}
            placeholder="Enter URL"
            autoFocus
            className="h-8 w-48 rounded border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSetLink();
            }}
            className="rounded bg-sky-100 px-3 py-1.5 text-sm font-medium text-sky-800 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:hover:bg-sky-900/60"
          >
            Set
          </button>
        </div>
      )}
    </div>
  );
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const SMALL_IMAGE_THRESHOLD = 200 * 1024; // 200 KB - skip compression below this
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;

async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size <= SMALL_IMAGE_THRESHOLD) return file;
  try {
    return await imageCompression(file, {
      maxSizeMB: 5,
      maxWidthOrHeight: MAX_DIMENSION,
      useWebWorker: true,
      initialQuality: JPEG_QUALITY,
    });
  } catch {
    return file;
  }
}

function ImageButton({ editor, notebookId }: { editor: Editor; notebookId: string | undefined }) {
  const [showInput, setShowInput] = useState(false);
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSetImage(imageUrl: string) {
    if (imageUrl.trim()) {
      editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    }
    setUrl("");
    setShowInput(false);
    setUploadError(null);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setUploadError("Image must be 5MB or less.");
      return;
    }

    if (!notebookId) {
      setUploadError("Notebook context required for upload.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const toUpload = await compressImageIfNeeded(file);
      const { url: imageUrl } = await uploadNotebookImage(notebookId, toUpload);
      handleSetImage(imageUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative">
      <ToolbarButton
        onClick={() => setShowInput(!showInput)}
        title="Insert image"
      >
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>
      {showInput && (
        <div
          className="absolute left-0 top-full z-50 mt-1 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-600 dark:bg-gray-800"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSetImage(url);
              if (e.key === "Escape") {
                setShowInput(false);
                setUrl("");
              }
            }}
            placeholder="Image URL"
            autoFocus
            className="h-8 w-48 rounded border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSetImage(url);
              }}
              className="flex-1 rounded bg-gray-100 px-2 py-1.5 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Set URL
            </button>
            <label className={`flex flex-1 cursor-pointer items-center justify-center rounded px-2 py-1.5 text-sm ${
              uploading ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500" : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
            }`}>
              {uploading ? "Uploading…" : "Upload"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>
          </div>
          {uploadError && (
            <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>
          )}
        </div>
      )}
    </div>
  );
}

function TableOptionsButton({ editor }: { editor: Editor }) {
  const [showDialog, setShowDialog] = useState(false);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [withHeaderRow, setWithHeaderRow] = useState(true);

  function handleInsertTable() {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow }).run();
    setShowDialog(false);
  }

  return (
    <div className="relative">
      <ToolbarButton onClick={() => setShowDialog(true)} title="Insert table">
        <Table className="h-4 w-4" />
      </ToolbarButton>
      {showDialog && (
        <div
          className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-600 dark:bg-gray-800"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Table</div>
          <div className="mb-2 flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">Rows</label>
            <input
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => setRows(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
              className="h-8 w-16 rounded border border-gray-200 px-2 text-center text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          <div className="mb-2 flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">Columns</label>
            <input
              type="number"
              min={1}
              max={20}
              value={cols}
              onChange={(e) => setCols(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
              className="h-8 w-16 rounded border border-gray-200 px-2 text-center text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          <div className="mb-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="header-row"
              checked={withHeaderRow}
              onChange={(e) => setWithHeaderRow(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="header-row" className="text-xs text-gray-600 dark:text-gray-400">
              Header row
            </label>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleInsertTable();
              }}
              className="flex-1 rounded bg-sky-100 px-2 py-1.5 text-sm font-medium text-sky-800 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:hover:bg-sky-900/60"
            >
              Insert
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setShowDialog(false);
              }}
              className="flex-1 rounded bg-gray-100 px-2 py-1.5 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function NotebookToolbar({
  editor,
  zoom,
  onZoomChange,
  notebookId,
  onDownloadPdf,
  pdfExporting = false,
}: NotebookToolbarProps) {
  const activeState = useEditorState({
    editor,
    selector: (ctx) => {
      const ed = ctx.editor;
      if (!ed) return null;
      return {
        isBold: ed.isActive("bold"),
        isItalic: ed.isActive("italic"),
        isUnderline: ed.isActive("underline"),
        isStrike: ed.isActive("strike"),
        isHighlight: ed.isActive("highlight"),
        isLink: ed.isActive("link"),
        textAlignLeft: ed.isActive({ textAlign: "left" }),
        textAlignCenter: ed.isActive({ textAlign: "center" }),
        textAlignRight: ed.isActive({ textAlign: "right" }),
        textAlignJustify: ed.isActive({ textAlign: "justify" }),
        bulletList: ed.isActive("bulletList"),
        orderedList: ed.isActive("orderedList"),
        taskList: ed.isActive("taskList"),
        heading: ed.isActive("heading"),
        heading1: ed.isActive("heading", { level: 1 }),
        heading2: ed.isActive("heading", { level: 2 }),
        heading3: ed.isActive("heading", { level: 3 }),
        heading4: ed.isActive("heading", { level: 4 }),
        heading5: ed.isActive("heading", { level: 5 }),
        heading6: ed.isActive("heading", { level: 6 }),
        inTable: ed.isActive("table") || ed.isActive("tableRow") || ed.isActive("tableCell") || ed.isActive("tableHeader"),
        canUndo: ed.can().undo(),
        canRedo: ed.can().redo(),
        fontFamily: ed.getAttributes("textStyle").fontFamily as string | undefined,
        color: ed.getAttributes("textStyle").color as string | undefined,
        lineHeight: ed.getAttributes("textStyle").lineHeight as string | undefined,
        highlightColor: ed.getAttributes("highlight").color as string | undefined,
      };
    },
  });

  const isCompact = !useMediaQuery("(min-width: 768px)");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(isCompact ? null : "all");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) setOpenSection(isCompact ? null : "all");
  }, [menuOpen, isCompact]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  if (!editor) return null;
  const state = activeState ?? {
    isBold: false, isItalic: false, isUnderline: false, isStrike: false, isHighlight: false, isLink: false,
    textAlignLeft: false, textAlignCenter: false, textAlignRight: false, textAlignJustify: false,
    bulletList: false, orderedList: false, taskList: false, heading: false,
    heading1: false, heading2: false, heading3: false, heading4: false, heading5: false, heading6: false,
    inTable: false, canUndo: false, canRedo: false, fontFamily: undefined, color: undefined, lineHeight: undefined, highlightColor: undefined,
  };

  const currentColor = state.color ?? "#1f2937";
  const isInsideTable = state.inTable;

  const selectStyleValue =
    state.heading1 ? "1" : state.heading2 ? "2" : state.heading3 ? "3" :
    state.heading4 ? "4" : state.heading5 ? "5" : state.heading6 ? "6" : "0";

  const setStyle = (value: string) => {
    if (value === "0") {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = parseInt(value, 10) as 1 | 2 | 3 | 4 | 5 | 6;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  const selectClassName =
    "h-8 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200";

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  const DropdownSection = ({
    id,
    label,
    children,
  }: {
    id: string;
    label: string;
    children: React.ReactNode;
  }) =>
    isCompact ? (
      <div className="border-b border-gray-200 last:border-b-0 dark:border-gray-600">
        <button
          type="button"
          onClick={() => toggleSection(id)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {label}
          <ChevronRight
            className={`h-4 w-4 shrink-0 transition-transform ${openSection === id ? "rotate-90" : ""}`}
          />
        </button>
        {openSection === id && (
          <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
            {children}
          </div>
        )}
      </div>
    ) : (
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
        <div className="flex flex-wrap items-center gap-1">{children}</div>
      </div>
    );

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        title="Formatting menu"
        className="flex h-9 w-9 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
      >
        <Menu className="h-5 w-5" />
      </button>
      {menuOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[280px] max-w-[min(95vw,640px)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className={`max-h-[min(85vh,600px)] overflow-y-auto ${isCompact ? "py-1" : "space-y-4 p-4 md:grid md:grid-cols-2 md:gap-x-6"}`}
          >
            {/* Edit */}
            <DropdownSection id="edit" label="Edit">
              <ToolbarButton
                disabled={!state.canUndo}
                onClick={() => editor.chain().focus().undo().run()}
                title="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                disabled={!state.canRedo}
                onClick={() => editor.chain().focus().redo().run()}
                title="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => window.print()} title="Print">
                <Printer className="h-4 w-4" />
              </ToolbarButton>
              {onDownloadPdf && (
                <ToolbarButton
                  onClick={onDownloadPdf}
                  disabled={pdfExporting}
                  title="Download as PDF"
                >
                  <FileDown className="h-4 w-4" />
                </ToolbarButton>
              )}
              <div className="inline-flex items-center">
                <select
                  value={Math.round(zoom * 100)}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) onZoomChange(parseInt(v, 10) / 100);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Zoom"
                  className={selectClassName}
                >
                  {ZOOM_PRESETS.map((p) => (
                    <option key={p} value={p}>{p}%</option>
                  ))}
                  {!ZOOM_PRESETS.includes(Math.round(zoom * 100)) && (
                    <option value={Math.round(zoom * 100)}>{Math.round(zoom * 100)}%</option>
                  )}
                </select>
              </div>
            </DropdownSection>

            {/* Style & Font */}
            <DropdownSection id="style" label="Style & Font">
              <select
                value={selectStyleValue}
                onChange={(e) => setStyle(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                title="Text style"
                className={`${selectClassName} min-w-[120px]`}
              >
                {STYLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div onMouseDown={(e) => e.stopPropagation()} className="min-w-[10rem] max-w-[18rem]">
                <FontFamilySearch editor={editor} size="menu" variant="horizontal" />
              </div>
              <FontSizeWithButtons editor={editor} />
              <select
                value={state.lineHeight ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) editor.chain().focus().setLineHeight(v).run();
                  else editor.chain().focus().unsetLineHeight().run();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Line spacing"
                className={selectClassName}
              >
                <option value="">Default</option>
                {LINE_SPACING_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </DropdownSection>

            {/* Formatting */}
            <DropdownSection id="format" label="Formatting">
              <ToolbarButton
                isActive={state.isBold}
                onClick={() => editor.chain().focus().toggleBold().run()}
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                isActive={state.isItalic}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                isActive={state.isUnderline}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                title="Underline"
              >
                <Underline className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                isActive={state.isStrike}
                onClick={() => editor.chain().focus().toggleStrike().run()}
                title="Strikethrough"
              >
                <Strikethrough className="h-4 w-4" />
              </ToolbarButton>
              <TextColorDropdown editor={editor} currentColor={currentColor} isAutomatic={!state.color} />
              <HighlightButton editor={editor} isHighlightActive={state.isHighlight} highlightColor={state.highlightColor} />
              <LinkButton editor={editor} isLinkActive={state.isLink} />
              <ToolbarButton
                onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                title="Clear formatting"
              >
                <Eraser className="h-4 w-4" />
              </ToolbarButton>
            </DropdownSection>

            {/* Alignment */}
            <DropdownSection id="align" label="Alignment">
              <ToolbarButton
                isActive={state.textAlignLeft}
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
                title="Align left"
              >
                <AlignLeft className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                isActive={state.textAlignCenter}
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
                title="Align center"
              >
                <AlignCenter className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                isActive={state.textAlignRight}
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
                title="Align right"
              >
                <AlignRight className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                isActive={state.textAlignJustify}
                onClick={() => editor.chain().focus().setTextAlign("justify").run()}
                title="Justify"
              >
                <AlignJustify className="h-4 w-4" />
              </ToolbarButton>
            </DropdownSection>

            {/* Insert & Lists */}
            <DropdownSection id="insert" label="Insert & Lists">
              <ImageButton editor={editor} notebookId={notebookId} />
              <ToolbarButton
                isActive={state.bulletList}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                title="Bullet list"
              >
                <List className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                isActive={state.orderedList}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                title="Numbered list"
              >
                <ListOrdered className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                isActive={state.taskList}
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                title="Checklist"
              >
                <ListChecks className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Horizontal rule"
              >
                <Minus className="h-4 w-4" />
              </ToolbarButton>
              <TableOptionsButton editor={editor} />
            </DropdownSection>

            {/* Table Tools */}
            {isInsideTable && (
              <DropdownSection id="table" label="Table">
                <ToolbarButton
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  title="Add row"
                >
                  <span className="text-xs font-bold">+R</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().deleteRow().run()}
                  title="Delete row"
                >
                  <Trash2 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  title="Add column"
                >
                  <span className="text-xs font-bold">+C</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                  title="Delete column"
                >
                  <span className="flex items-center gap-0.5 text-xs font-bold">
                    <Trash2 className="h-3 w-3" />C
                  </span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  title="Delete table"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </ToolbarButton>
              </DropdownSection>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
