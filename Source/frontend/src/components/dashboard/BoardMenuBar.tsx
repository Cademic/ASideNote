import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Save, Upload, StickyNote as StickyNoteIcon, CreditCard, Image as ImageIcon, Check } from "lucide-react";
import { NoteToolbar } from "./NoteToolbar";
import { dividerClass, HoverSubmenu, menuItemClass } from "./boardMenuShared";
import {
  BoardMenuMobileEditToolkit,
  BoardMenuMobileInsertToolkit,
  BoardMenuMobileViewToolkit,
} from "./BoardMenuMobileToolkit";

const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200];

type OpenMenu = "file" | "edit" | "insert" | "view" | null;
export type BoardBackgroundTheme = "whiteboard" | "blackboard" | "default";

/** Active TipTap context for the sticky note / index card being edited (shown in the menu bar). */
export interface BoardRichTextToolbarState {
  sourceId: string;
  editor: Editor | null;
}

interface BoardMenuBarProps {
  boardType: "NoteBoard" | "ChalkBoard";
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onSaveToFile: () => void;
  onLoadFromFile: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onInsertStickyNote: () => void;
  onInsertIndexCard?: () => void;
  onInsertImage?: () => void;
  backgroundTheme: BoardBackgroundTheme;
  onBackgroundThemeChange: (theme: BoardBackgroundTheme) => void;
  autoEnlargeNotes: boolean;
  onAutoEnlargeNotesChange: (enabled: boolean) => void;
  /** When a note or index card is in edit mode, formatting controls appear in this bar. */
  richTextToolbar?: BoardRichTextToolbarState | null;
}

export function BoardMenuBar({
  boardType,
  zoom,
  onZoomChange,
  onSaveToFile,
  onLoadFromFile,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onInsertStickyNote,
  onInsertIndexCard,
  onInsertImage,
  backgroundTheme,
  onBackgroundThemeChange,
  autoEnlargeNotes,
  onAutoEnlargeNotesChange,
  richTextToolbar = null,
}: BoardMenuBarProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => setOpenMenu(null);

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

  const menuTriggerClass = (menu: OpenMenu) =>
    `px-3 py-1.5 text-sm transition-colors rounded-md ${
      openMenu === menu
        ? "bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200"
        : "text-foreground/80 hover:bg-amber-100/50 hover:text-foreground dark:hover:bg-amber-900/20"
    }`;

  const dropdownClass =
    "absolute left-0 top-full z-50 mt-1 min-w-[200px] max-w-[280px] overflow-visible rounded-lg border border-border bg-background py-1 shadow-xl";

  return (
    <div
      ref={menuBarRef}
      data-board-menu-bar
      className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 px-2 py-1.5"
    >
      <div className="flex flex-shrink-0 flex-wrap items-center gap-1">
      {/* File */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === "file" ? null : "file")}
          className={menuTriggerClass("file")}
        >
          File
        </button>
        {openMenu === "file" && (
          <div className={dropdownClass}>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                closeMenu();
                onSaveToFile();
              }}
            >
              <Save className="h-3.5 w-3.5" />
              Save to file
            </button>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                closeMenu();
                onLoadFromFile();
              }}
            >
              <Upload className="h-3.5 w-3.5" />
              Load from file
            </button>
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
          <div className={dropdownClass}>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                closeMenu();
                onUndo();
              }}
              disabled={!canUndo}
            >
              Undo
              <span className="ml-auto text-xs text-foreground/50">Ctrl+Z</span>
            </button>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                closeMenu();
                onRedo();
              }}
              disabled={!canRedo}
            >
              Redo
              <span className="ml-auto text-xs text-foreground/50">Ctrl+Y</span>
            </button>
            <BoardMenuMobileEditToolkit editor={richTextToolbar?.editor ?? null} closeMenu={closeMenu} />
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
          <div className={dropdownClass}>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                closeMenu();
                onInsertStickyNote();
              }}
            >
              <StickyNoteIcon className="h-3.5 w-3.5 text-yellow-500" />
              Sticky Note
            </button>
            {boardType === "NoteBoard" && onInsertIndexCard && (
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  closeMenu();
                  onInsertIndexCard();
                }}
              >
                <CreditCard className="h-3.5 w-3.5 text-sky-500" />
                Index Card
              </button>
            )}
            {boardType === "NoteBoard" && onInsertImage && (
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  closeMenu();
                  onInsertImage();
                }}
              >
                <ImageIcon className="h-3.5 w-3.5 text-emerald-500" />
                Image
              </button>
            )}
            <BoardMenuMobileInsertToolkit editor={richTextToolbar?.editor ?? null} closeMenu={closeMenu} />
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
          <div className={dropdownClass}>
            <HoverSubmenu label="Background">
              <button
                type="button"
                className={`${menuItemClass} ${backgroundTheme === "whiteboard" ? "bg-sky-50 dark:bg-sky-900/20" : ""}`}
                onClick={() => {
                  closeMenu();
                  onBackgroundThemeChange("whiteboard");
                }}
              >
                WhiteBoard
              </button>
              <button
                type="button"
                className={`${menuItemClass} ${backgroundTheme === "blackboard" ? "bg-sky-50 dark:bg-sky-900/20" : ""}`}
                onClick={() => {
                  closeMenu();
                  onBackgroundThemeChange("blackboard");
                }}
              >
                Blackboard
              </button>
              <div className={dividerClass} />
              <button
                type="button"
                className={`${menuItemClass} ${backgroundTheme === "default" ? "bg-sky-50 dark:bg-sky-900/20" : ""}`}
                onClick={() => {
                  closeMenu();
                  onBackgroundThemeChange("default");
                }}
              >
                Default
              </button>
            </HoverSubmenu>
            <div className={dividerClass} />
            <HoverSubmenu label="Zoom">
              {ZOOM_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`${menuItemClass} ${Math.round(zoom * 100) === p ? "bg-sky-50 dark:bg-sky-900/20" : ""}`}
                  onClick={() => {
                    closeMenu();
                    onZoomChange(p / 100);
                  }}
                >
                  {p}%
                </button>
              ))}
            </HoverSubmenu>
            <BoardMenuMobileViewToolkit editor={richTextToolbar?.editor ?? null} closeMenu={closeMenu} />
            <div className={dividerClass} />
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                closeMenu();
                onAutoEnlargeNotesChange(!autoEnlargeNotes);
              }}
            >
              <span
                className={`mr-2 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-current ${
                  autoEnlargeNotes ? "bg-primary text-primary-foreground" : "bg-transparent"
                }`}
              >
                {autoEnlargeNotes ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
              </span>
              Auto-enlarge notes on click
            </button>
          </div>
        )}
      </div>
      </div>

      <div className="hidden min-h-[38px] min-w-0 flex-1 overflow-x-auto border-l border-border/50 pl-2 dark:border-border/40 lg:flex lg:flex-col lg:justify-center">
        <div className="min-w-max [&>div]:border-b-0 [&>div]:pb-1 [&>div]:pt-0">
          <NoteToolbar editor={richTextToolbar?.editor ?? null} />
        </div>
      </div>
    </div>
  );
}
