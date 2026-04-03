import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Printer, Upload, ChevronRight, Search, Link as LinkIcon } from "lucide-react";
import type { NotebookVersionDto } from "../../types";
import { nudgeAbsoluteElementIntoViewport } from "../../lib/dropdown-viewport";

const FONT_FAMILIES = [
  { label: "Sans", value: "Inter, ui-sans-serif, system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, Cambria, 'Times New Roman', serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times", value: "Times, 'Times New Roman', serif" },
];

const FONT_SIZE_PRESETS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

const ZOOM_PRESETS = [50, 75, 90, 100, 125, 150, 175, 200];

const LINE_SPACING_PRESETS = [
  { label: "1.0", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "2.0", value: "2" },
];

const STYLE_OPTIONS = [
  { value: "0", label: "Normal text" },
  { value: "1", label: "Title" },
  { value: "2", label: "Subtitle" },
  { value: "3", label: "Heading 3" },
  { value: "4", label: "Heading 4" },
  { value: "5", label: "Heading 5" },
  { value: "6", label: "Heading 6" },
];

type OpenMenu = "file" | "edit" | "format" | "insert" | "view" | null;

interface NotebookMenuBarProps {
  editor: Editor | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onPrint: () => void;
  onExport: (format: string) => void;
  onSaveAsHtml: () => void;
  onSaveAsJson: () => void;
  onImportClick: () => void;
  onFileMenuOpen?: () => void;
  exporting: boolean;
  versions: NotebookVersionDto[];
  savingVersion: boolean;
  onSaveVersion: () => void;
  onRestoreVersion: (versionId: string) => void;
  formatVersionDate: (createdAt: string) => string;
  /** Called when user chooses Insert → Image → Upload from computer (opens file picker). */
  onInsertImageUpload?: () => void;
}

const menuItemClass =
  "w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-900/20 flex items-center gap-2";
const menuItemWithSubmenuClass =
  "w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-900/20 flex items-center justify-between gap-2";
const menuSectionClass = "px-2 py-1 text-xs font-medium text-foreground/60";
const dividerClass = "my-1 border-t border-border/50";
const submenuClass =
  "absolute left-full top-0 z-[60] min-w-[160px] max-w-[min(320px,calc(100vw-1rem))] -ml-3 rounded-lg border border-border bg-background py-1 pl-2 shadow-xl";

function HoverSubmenu({
  label,
  children,
  menuItemWithSubmenuClass,
  submenuClass,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  menuItemWithSubmenuClass: string;
  submenuClass: string;
}) {
  const [open, setOpen] = useState(false);
  const submenuRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  useEffect(() => () => clearCloseTimer(), []);

  useLayoutEffect(() => {
    if (!open || !submenuRef.current) return;
    const el = submenuRef.current;
    const run = () => nudgeAbsoluteElementIntoViewport(el);
    run();
    const ro = new ResizeObserver(run);
    ro.observe(el);
    window.addEventListener("resize", run);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [open]);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        clearCloseTimer();
        setOpen(true);
      }}
      onMouseLeave={() => {
        closeTimerRef.current = setTimeout(() => setOpen(false), 150);
      }}
    >
      <div className={menuItemWithSubmenuClass}>
        {label}
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
      </div>
      {open && (
        <div
          ref={submenuRef}
          className={submenuClass}
          onMouseEnter={() => {
            clearCloseTimer();
            setOpen(true);
          }}
          onMouseLeave={() => {
            closeTimerRef.current = setTimeout(() => setOpen(false), 150);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function FileExportSubmenu({
  onExport,
  exporting,
  closeMenu,
  menuItemClass,
  menuItemWithSubmenuClass,
  submenuClass,
}: {
  onExport: (fmt: string) => void;
  exporting: boolean;
  closeMenu: () => void;
  menuItemClass: string;
  menuItemWithSubmenuClass: string;
  submenuClass: string;
}) {
  const formats = [
    { fmt: "pdf" as const, label: "PDF" },
    { fmt: "txt" as const, label: "Plain text (.txt)" },
    { fmt: "md" as const, label: "Markdown (.md)" },
    { fmt: "html" as const, label: "HTML" },
    { fmt: "docx" as const, label: "Word (.docx)" },
  ];
  return (
    <HoverSubmenu
      label="Export"
      menuItemWithSubmenuClass={menuItemWithSubmenuClass}
      submenuClass={submenuClass}
    >
      {formats.map(({ fmt, label }) => (
        <button
          key={fmt}
          type="button"
          className={menuItemClass}
          onClick={() => { closeMenu(); onExport(fmt); }}
          disabled={exporting}
        >
          {label}
        </button>
      ))}
    </HoverSubmenu>
  );
}

function FileSaveSubmenu({
  onSaveAsHtml,
  onSaveAsJson,
  closeMenu,
  menuItemClass,
  menuItemWithSubmenuClass,
  submenuClass,
}: {
  onSaveAsHtml: () => void;
  onSaveAsJson: () => void;
  closeMenu: () => void;
  menuItemClass: string;
  menuItemWithSubmenuClass: string;
  submenuClass: string;
}) {
  return (
    <HoverSubmenu
      label="Save for editing"
      menuItemWithSubmenuClass={menuItemWithSubmenuClass}
      submenuClass={submenuClass}
    >
      <button type="button" className={menuItemClass} onClick={() => { closeMenu(); onSaveAsHtml(); }}>
        Save as HTML
      </button>
      <button type="button" className={menuItemClass} onClick={() => { closeMenu(); onSaveAsJson(); }}>
        Save as JSON
      </button>
    </HoverSubmenu>
  );
}

export function NotebookMenuBar({
  editor,
  zoom,
  onZoomChange,
  onPrint,
  onExport,
  onSaveAsHtml,
  onSaveAsJson,
  onImportClick,
  onFileMenuOpen,
  exporting,
  versions,
  savingVersion,
  onSaveVersion,
  onRestoreVersion,
  formatVersionDate,
  onInsertImageUpload,
}: NotebookMenuBarProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [linkPopupOpen, setLinkPopupOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const menuBarRef = useRef<HTMLDivElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  /** Selection when Format menu was opened; restored when applying font size so it applies to the right text. */
  const formatMenuSelectionRef = useRef<{ from: number; to: number } | null>(null);

  const closeMenu = () => setOpenMenu(null);

  useLayoutEffect(() => {
    if (!openMenu || !dropdownPanelRef.current) return;
    const el = dropdownPanelRef.current;
    const run = () => nudgeAbsoluteElementIntoViewport(el);
    run();
    const ro = new ResizeObserver(run);
    ro.observe(el);
    window.addEventListener("resize", run);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [openMenu]);

  const openLinkPopup = () => {
    closeMenu();
    setLinkUrl(editor?.getAttributes("link").href ?? "");
    setLinkPopupOpen(true);
    setTimeout(() => linkInputRef.current?.focus(), 0);
  };

  const applyLink = () => {
    if (linkUrl.trim()) {
      editor?.chain().focus().setLink({ href: linkUrl.trim() }).run();
    } else {
      editor?.chain().focus().unsetLink().run();
    }
    setLinkUrl("");
    setLinkPopupOpen(false);
  };

  const closeLinkPopup = () => {
    setLinkPopupOpen(false);
    setLinkUrl("");
  };

  useEffect(() => {
    if (!openMenu) return;
    function onPointerDown(e: PointerEvent) {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openMenu]);

  if (!editor) return null;

  const menuTriggerClass = (menu: OpenMenu) =>
    `px-3 py-1.5 text-sm transition-colors rounded-md ${
      openMenu === menu
        ? "bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200"
        : "text-foreground/80 hover:bg-amber-100/50 hover:text-foreground dark:hover:bg-amber-900/20"
    }`;

  const dropdownClass =
    "absolute left-0 top-full z-50 mt-1 min-w-[200px] max-w-[min(320px,calc(100vw-1rem))] overflow-visible rounded-lg border border-border bg-background py-1 shadow-xl";

  const captureFormatSelection = () => {
    const sel = editor?.state.selection;
    if (sel) formatMenuSelectionRef.current = { from: sel.from, to: sel.to };
  };

  return (
    <div
      ref={menuBarRef}
      className="flex items-center gap-1 px-2 py-1.5"
      onMouseEnter={captureFormatSelection}
    >
      {/* File */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            const willOpen = openMenu !== "file";
            setOpenMenu(willOpen ? "file" : null);
            if (willOpen) onFileMenuOpen?.();
          }}
          disabled={exporting}
          className={menuTriggerClass("file")}
        >
          File
        </button>
        {openMenu === "file" && (
          <div ref={dropdownPanelRef} className={dropdownClass}>
            <div className={menuSectionClass}>Print</div>
            <button type="button" className={menuItemClass} onClick={() => { closeMenu(); onPrint(); }}>
              <Printer className="h-3.5 w-3.5" />
              Print / Save as PDF
            </button>
            <div className={dividerClass} />
            <FileExportSubmenu
              onExport={onExport}
              exporting={exporting}
              closeMenu={closeMenu}
              menuItemClass={menuItemClass}
              menuItemWithSubmenuClass={menuItemWithSubmenuClass}
              submenuClass={submenuClass}
            />
            <div className={dividerClass} />
            <FileSaveSubmenu
              onSaveAsHtml={onSaveAsHtml}
              onSaveAsJson={onSaveAsJson}
              closeMenu={closeMenu}
              menuItemClass={menuItemClass}
              menuItemWithSubmenuClass={menuItemWithSubmenuClass}
              submenuClass={submenuClass}
            />
            <div className={dividerClass} />
            <div className={menuSectionClass}>Import</div>
            <button type="button" className={menuItemClass} onClick={() => { closeMenu(); onImportClick(); }}>
              <Upload className="h-3.5 w-3.5" />
              Import from file (.json)
            </button>
            <div className={dividerClass} />
            <div className={menuSectionClass}>Version history</div>
            <button
              type="button"
              className={menuItemClass}
              onClick={onSaveVersion}
              disabled={savingVersion}
            >
              {savingVersion ? "Saving…" : "Save version"}
            </button>
            <div className="overflow-y-auto max-h-48 px-2 py-1">
              {versions.length === 0 ? (
                <p className="text-xs text-foreground/60 py-2">No versions yet.</p>
              ) : (
                <ul className="space-y-1">
                  {versions.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20">
                      <span className="min-w-0 truncate text-foreground/80">
                        {formatVersionDate(v.createdAt)}{v.label ? ` — ${v.label}` : ""}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-amber-100/50 dark:hover:bg-amber-900/20"
                        onClick={() => { closeMenu(); onRestoreVersion(v.id); }}
                      >
                        Restore
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === "edit" ? null : "edit")}
          className={menuTriggerClass("edit")}
        >
          Edit
        </button>
        {openMenu === "edit" && (
          <div ref={dropdownPanelRef} className={dropdownClass}>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => { closeMenu(); editor.chain().focus().undo().run(); }}
              disabled={!editor.can().undo()}
            >
              Undo
              <span className="ml-auto text-xs text-foreground/50">Ctrl+Z</span>
            </button>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => { closeMenu(); editor.chain().focus().redo().run(); }}
              disabled={!editor.can().redo()}
            >
              Redo
              <span className="ml-auto text-xs text-foreground/50">Ctrl+Y</span>
            </button>
            <div className={dividerClass} />
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                closeMenu();
                editor.commands.focus();
                document.execCommand("cut");
              }}
            >
              Cut
            </button>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                closeMenu();
                editor.commands.focus();
                document.execCommand("copy");
              }}
            >
              Copy
            </button>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                closeMenu();
                editor.commands.focus();
                document.execCommand("paste");
              }}
            >
              Paste
            </button>
            <div className={dividerClass} />
            <button
              type="button"
              className={menuItemClass}
              onClick={() => { closeMenu(); editor.chain().focus().selectAll().run(); }}
            >
              Select all
            </button>
            <div className={dividerClass} />
            <button
              type="button"
              className={menuItemClass}
              onClick={() => { closeMenu(); editor.chain().focus().clearNodes().unsetAllMarks().run(); }}
            >
              Clear formatting
            </button>
          </div>
        )}
      </div>

      {/* Format */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => {
            if (openMenu !== "format") {
              const sel = editor?.state.selection;
              if (sel) formatMenuSelectionRef.current = { from: sel.from, to: sel.to };
            }
            e.preventDefault();
            setOpenMenu(openMenu === "format" ? null : "format");
          }}
          className={menuTriggerClass("format")}
        >
          Format
        </button>
        {openMenu === "format" && (
          <div ref={dropdownPanelRef} className={dropdownClass}>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => { closeMenu(); editor.chain().focus().toggleBold().run(); }}
            >
              Bold
            </button>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => { closeMenu(); editor.chain().focus().toggleItalic().run(); }}
            >
              Italic
            </button>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => { closeMenu(); editor.chain().focus().toggleUnderline().run(); }}
            >
              Underline
            </button>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => { closeMenu(); editor.chain().focus().toggleStrike().run(); }}
            >
              Strikethrough
            </button>
            <div className={dividerClass} />
            <HoverSubmenu
              label="Text style"
              menuItemWithSubmenuClass={menuItemWithSubmenuClass}
              submenuClass={submenuClass}
            >
              {STYLE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={menuItemClass}
                  onClick={() => {
                    closeMenu();
                    if (o.value === "0") editor.chain().focus().setParagraph().run();
                    else editor.chain().focus().toggleHeading({ level: parseInt(o.value, 10) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
                  }}
                >
                  {o.label}
                </button>
              ))}
            </HoverSubmenu>
            <div className={dividerClass} />
            <HoverSubmenu
              label="Font"
              menuItemWithSubmenuClass={menuItemWithSubmenuClass}
              submenuClass={submenuClass}
            >
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={menuItemClass}
                  onClick={() => { closeMenu(); editor.chain().focus().setFontFamily(f.value).run(); }}
                >
                  {f.label}
                </button>
              ))}
            </HoverSubmenu>
            <div className={dividerClass} />
            <HoverSubmenu
              label="Font size"
              menuItemWithSubmenuClass={menuItemWithSubmenuClass}
              submenuClass={submenuClass}
            >
              <div className="flex flex-wrap gap-1 px-2 py-1">
                {FONT_SIZE_PRESETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded px-2 py-1 text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const size = s;
                      const saved = formatMenuSelectionRef.current;
                      if (saved) {
                        editor
                          .chain()
                          .focus()
                          .setTextSelection({ from: saved.from, to: saved.to })
                          .setFontSize(`${size}px`)
                          .run();
                        formatMenuSelectionRef.current = null;
                      } else {
                        editor.chain().focus().setFontSize(`${size}px`).run();
                      }
                      requestAnimationFrame(() => closeMenu());
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </HoverSubmenu>
            <div className={dividerClass} />
            <button
              type="button"
              className={menuItemClass}
              onClick={() => { closeMenu(); editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run(); }}
            >
              Highlight
            </button>
            <div className={dividerClass} />
            <HoverSubmenu
              label="Alignment"
              menuItemWithSubmenuClass={menuItemWithSubmenuClass}
              submenuClass={submenuClass}
            >
              <button type="button" className={menuItemClass} onClick={() => { closeMenu(); editor.chain().focus().setTextAlign("left").run(); }}>
                Align left
              </button>
              <button type="button" className={menuItemClass} onClick={() => { closeMenu(); editor.chain().focus().setTextAlign("center").run(); }}>
                Align center
              </button>
              <button type="button" className={menuItemClass} onClick={() => { closeMenu(); editor.chain().focus().setTextAlign("right").run(); }}>
                Align right
              </button>
              <button type="button" className={menuItemClass} onClick={() => { closeMenu(); editor.chain().focus().setTextAlign("justify").run(); }}>
                Justify
              </button>
            </HoverSubmenu>
            <div className={dividerClass} />
            <HoverSubmenu
              label="Line spacing"
              menuItemWithSubmenuClass={menuItemWithSubmenuClass}
              submenuClass={submenuClass}
            >
              {LINE_SPACING_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={menuItemClass}
                  onClick={() => { closeMenu(); editor.chain().focus().setLineHeight(p.value).run(); }}
                >
                  {p.label}
                </button>
              ))}
            </HoverSubmenu>
            <div className={dividerClass} />
            <button
              type="button"
              className={menuItemClass}
              onClick={() => { closeMenu(); editor.chain().focus().clearNodes().unsetAllMarks().run(); }}
            >
              Clear formatting
            </button>
          </div>
        )}
      </div>

      {/* Insert */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === "insert" ? null : "insert")}
          className={menuTriggerClass("insert")}
        >
          Insert
        </button>
        {openMenu === "insert" && (
          <div ref={dropdownPanelRef} className={dropdownClass}>
            <HoverSubmenu
              label="Image"
              menuItemWithSubmenuClass={menuItemWithSubmenuClass}
              submenuClass={submenuClass}
            >
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  closeMenu();
                  onInsertImageUpload?.();
                }}
                disabled={!onInsertImageUpload}
              >
                <Upload className="h-3.5 w-3.5 shrink-0" />
                Upload from computer
              </button>
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  closeMenu();
                  const q = window.prompt("Search for images");
                  if (q?.trim()) window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q.trim())}`, "_blank", "noopener,noreferrer");
                }}
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                Search the web
              </button>
              <div className={dividerClass} />
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  closeMenu();
                  const url = window.prompt("Image URL");
                  if (url?.trim()) editor.chain().focus().setImage({ src: url.trim() }).run();
                }}
              >
                <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                By URL
              </button>
            </HoverSubmenu>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => { closeMenu(); editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }}
            >
              Table
            </button>
            <button
              type="button"
              className={menuItemClass}
              onClick={openLinkPopup}
            >
              Link
            </button>
            <div className={dividerClass} />
            <HoverSubmenu
              label="Lists"
              menuItemWithSubmenuClass={menuItemWithSubmenuClass}
              submenuClass={submenuClass}
            >
              <button type="button" className={menuItemClass} onClick={() => { closeMenu(); editor.chain().focus().toggleBulletList().run(); }}>
                Bullet list
              </button>
              <button type="button" className={menuItemClass} onClick={() => { closeMenu(); editor.chain().focus().toggleOrderedList().run(); }}>
                Numbered list
              </button>
              <button type="button" className={menuItemClass} onClick={() => { closeMenu(); editor.chain().focus().toggleTaskList().run(); }}>
                Checklist
              </button>
            </HoverSubmenu>
            <div className={dividerClass} />
            <button
              type="button"
              className={menuItemClass}
              onClick={() => { closeMenu(); editor.chain().focus().setHorizontalRule().run(); }}
            >
              Horizontal rule
            </button>
          </div>
        )}
      </div>

      {/* View */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === "view" ? null : "view")}
          className={menuTriggerClass("view")}
        >
          View
        </button>
        {openMenu === "view" && (
          <div ref={dropdownPanelRef} className={dropdownClass}>
            <HoverSubmenu
              label="Zoom"
              menuItemWithSubmenuClass={menuItemWithSubmenuClass}
              submenuClass={submenuClass}
            >
              {ZOOM_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`${menuItemClass} ${Math.round(zoom * 100) === p ? "bg-sky-50 dark:bg-sky-900/20" : ""}`}
                  onClick={() => { closeMenu(); onZoomChange(p / 100); }}
                >
                  {p}%
                </button>
              ))}
            </HoverSubmenu>
          </div>
        )}
      </div>

      {/* Link URL popup */}
      {linkPopupOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
          onClick={closeLinkPopup}
          role="dialog"
          aria-modal="true"
          aria-label="Insert link"
        >
          <div
            className="min-w-[320px] rounded-lg border border-border bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <label htmlFor="link-url-input" className="mb-2 block text-sm font-medium text-foreground">
              Link URL
            </label>
            <input
              ref={linkInputRef}
              id="link-url-input"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyLink();
                if (e.key === "Escape") closeLinkPopup();
              }}
              placeholder="https://..."
              className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeLinkPopup}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyLink}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Set link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
