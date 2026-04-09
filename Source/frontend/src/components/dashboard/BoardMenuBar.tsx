import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Save,
  Upload,
  StickyNote as StickyNoteIcon,
  CreditCard,
  Image as ImageIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { NoteToolbar } from "./NoteToolbar";
import { dividerClass, HoverSubmenu, menuItemClass } from "./boardMenuShared";
import {
  BoardMenuMobileEditToolkit,
  BoardMenuMobileInsertToolkit,
  BoardMenuMobileViewToolkit,
} from "./BoardMenuMobileToolkit";
import { nudgeAbsoluteElementIntoViewport } from "../../lib/dropdown-viewport";

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
  /** NoteBoard: jump viewport to previous/next sticky note in creation order. */
  onNavigatePreviousNote?: () => void;
  onNavigateNextNote?: () => void;
  noteNavigationDisabled?: boolean;
  chalkTools?: ReactNode;
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
  onNavigatePreviousNote,
  onNavigateNextNote,
  noteNavigationDisabled = false,
  chalkTools,
}: BoardMenuBarProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chalkToolsPage, setChalkToolsPage] = useState(0);
  const [isCompactToolsViewport, setIsCompactToolsViewport] = useState<boolean>(() => window.innerWidth < 1024);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);
  const chalkTouchStartXRef = useRef<number | null>(null);
  const chalkTouchStartYRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (!openMenu || isCollapsed) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (menuBarRef.current?.contains(t)) return;
      // TipTap toolbar panels are portaled to document.body; still treat as part of the bar.
      if ((e.target as Element).closest?.("[data-board-toolbar-portal]")) return;
      closeMenu();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openMenu, isCollapsed]);

  useEffect(() => {
    if (isCollapsed) setOpenMenu(null);
  }, [isCollapsed]);

  useEffect(() => {
    function onResize() {
      setIsCompactToolsViewport(window.innerWidth < 1024);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const maxPage = isCompactToolsViewport ? 4 : 1;
    setChalkToolsPage((prev) => Math.min(prev, maxPage));
  }, [isCompactToolsViewport]);

  function goToPrevChalkToolsPage() {
    setChalkToolsPage((prev) => Math.max(0, prev - 1));
  }

  function goToNextChalkToolsPage() {
    const maxPage = isCompactToolsViewport ? 4 : 1;
    setChalkToolsPage((prev) => Math.min(maxPage, prev + 1));
  }

  function handleChalkToolsTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const touch = e.changedTouches[0];
    if (!touch) return;
    chalkTouchStartXRef.current = touch.clientX;
    chalkTouchStartYRef.current = touch.clientY;
  }

  function handleChalkToolsTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    const startX = chalkTouchStartXRef.current;
    const startY = chalkTouchStartYRef.current;
    chalkTouchStartXRef.current = null;
    chalkTouchStartYRef.current = null;
    if (startX == null || startY == null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaY) > 40) return;
    if (deltaX < 0) {
      goToNextChalkToolsPage();
    }
    else goToPrevChalkToolsPage();
  }

  const menuTriggerClass = (menu: OpenMenu) =>
    `px-3 py-1.5 text-sm transition-colors rounded-md ${
      openMenu === menu
        ? "bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200"
        : "text-foreground/80 hover:bg-amber-100/50 hover:text-foreground dark:hover:bg-amber-900/20"
    }`;

  const dropdownClass =
    "absolute left-0 top-full z-50 mt-1 min-w-[200px] max-w-[min(280px,calc(100vw-1rem))] overflow-visible rounded-lg border border-border bg-background py-1 shadow-xl";
  const showCompactChalkTools = boardType === "ChalkBoard" && Boolean(chalkTools) && isCompactToolsViewport;

  const noteToolbarExpandedClass = [
    "min-h-[38px] min-w-0 flex-1 overflow-x-auto border-l border-border/50 pl-2 dark:border-border/40",
    showCompactChalkTools ? "flex flex-col justify-center" : "hidden lg:flex lg:flex-col lg:justify-center",
  ].join(" ");

  const collapsibleMenusClassName = [
    "w-full min-h-0 transition-[max-height,opacity] duration-300 ease-in-out motion-reduce:transition-none motion-reduce:duration-0",
    // overflow-hidden clips absolutely positioned dropdowns; only use it while collapsed.
    isCollapsed
      ? "max-h-0 overflow-hidden opacity-0 pointer-events-none"
      : "max-h-[min(70vh,28rem)] overflow-visible opacity-100",
  ].join(" ");

  return (
    <div
      ref={menuBarRef}
      data-board-menu-bar
      className="relative flex min-w-0 w-full flex-1 flex-col px-2 pb-6 pt-1.5"
    >
      <div className={collapsibleMenusClassName}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      {!showCompactChalkTools ? (
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
          <div ref={dropdownPanelRef} className={dropdownClass}>
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
            <BoardMenuMobileEditToolkit editor={richTextToolbar?.editor ?? null} />
            <BoardMenuMobileInsertToolkit editor={richTextToolbar?.editor ?? null} />
            <BoardMenuMobileViewToolkit editor={richTextToolbar?.editor ?? null} />
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
            <BoardMenuMobileEditToolkit editor={richTextToolbar?.editor ?? null} />
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
            <BoardMenuMobileInsertToolkit editor={richTextToolbar?.editor ?? null} />
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
            {onNavigatePreviousNote && onNavigateNextNote && (
              <>
                <div className={dividerClass} />
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/45">
                  Notes
                </p>
                <button
                  type="button"
                  className={menuItemClass}
                  disabled={noteNavigationDisabled}
                  onClick={() => {
                    closeMenu();
                    onNavigatePreviousNote();
                  }}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous note
                </button>
                <button
                  type="button"
                  className={menuItemClass}
                  disabled={noteNavigationDisabled}
                  onClick={() => {
                    closeMenu();
                    onNavigateNextNote();
                  }}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  Next note
                </button>
              </>
            )}
            <BoardMenuMobileViewToolkit editor={richTextToolbar?.editor ?? null} />
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
      ) : null}

      <div className={noteToolbarExpandedClass}>
        {boardType === "ChalkBoard" && chalkTools ? (
          <div className="relative min-w-0 w-full">
            <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                onClick={goToPrevChalkToolsPage}
                disabled={chalkToolsPage === 0}
                title="Previous tools"
                aria-label="Previous tools"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-foreground/65 transition-colors hover:bg-foreground/10 hover:text-foreground disabled:cursor-default disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div
                className="min-w-0 flex-1 overflow-hidden touch-pan-y"
                onTouchStart={handleChalkToolsTouchStart}
                onTouchEnd={handleChalkToolsTouchEnd}
              >
                <div
                  className="flex transition-transform duration-300 ease-out motion-reduce:transition-none"
                  style={{ transform: `translateX(-${chalkToolsPage * 100}%)` }}
                >
                  {isCompactToolsViewport ? (
                    <div className="w-full shrink-0 min-w-0 overflow-x-auto scrollbar-hide">
                      <div className="flex min-w-0 flex-nowrap items-center justify-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide [&>*]:shrink-0">
                        <button
                          type="button"
                          onClick={() => setOpenMenu(openMenu === "file" ? null : "file")}
                          className={menuTriggerClass("file")}
                        >
                          File
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenu(openMenu === "edit" ? null : "edit")}
                          className={menuTriggerClass("edit")}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenu(openMenu === "insert" ? null : "insert")}
                          className={menuTriggerClass("insert")}
                        >
                          Insert
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenu(openMenu === "view" ? null : "view")}
                          className={menuTriggerClass("view")}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="w-full shrink-0 min-w-0 overflow-x-auto scrollbar-hide">
                    <div className="min-w-max">
                      {chalkTools}
                    </div>
                  </div>
                  {isCompactToolsViewport ? (
                    <>
                      <div className="w-full shrink-0 min-w-0 overflow-x-auto scrollbar-hide">
                        <div className="min-w-max [&>div]:border-b-0 [&>div]:pb-1 [&>div]:pt-0">
                          <NoteToolbar editor={richTextToolbar?.editor ?? null} segment="primary" />
                        </div>
                      </div>
                      <div className="w-full shrink-0 min-w-0 overflow-x-auto scrollbar-hide">
                        <div className="min-w-max [&>div]:border-b-0 [&>div]:pb-1 [&>div]:pt-0">
                          <NoteToolbar editor={richTextToolbar?.editor ?? null} segment="secondary" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full shrink-0 min-w-0 [&>div]:border-b-0 [&>div]:pb-1 [&>div]:pt-0">
                      <NoteToolbar editor={richTextToolbar?.editor ?? null} />
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={goToNextChalkToolsPage}
                disabled={chalkToolsPage === (isCompactToolsViewport ? 4 : 1)}
                title="Next tools"
                aria-label="Next tools"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-foreground/65 transition-colors hover:bg-foreground/10 hover:text-foreground disabled:cursor-default disabled:opacity-35"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="min-w-max [&>div]:border-b-0 [&>div]:pb-1 [&>div]:pt-0">
            <NoteToolbar editor={richTextToolbar?.editor ?? null} />
          </div>
        )}
      </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[100] flex justify-center">
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          title={isCollapsed ? "Expand menu" : "Minimize menu"}
          aria-label={isCollapsed ? "Expand menu" : "Minimize menu"}
          className="pointer-events-auto flex h-7 min-w-7 translate-y-1/2 items-center justify-center rounded-md border border-border/50 bg-[linear-gradient(180deg,#fffef7_0%,#fffdf2_100%)] px-2 text-foreground/75 shadow-sm transition-colors hover:bg-foreground/5 dark:bg-[linear-gradient(180deg,hsl(222,22%,17%)_0%,hsl(222,22%,15%)_100%)]"
        >
          {isCollapsed ? <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={2.5} /> : <ChevronUp className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
}
