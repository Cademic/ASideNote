/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SidebarState = "expanded" | "collapsed";

interface SidebarContextValue {
  /** Desktop collapse state, derived from `open`. */
  state: SidebarState;
  /** Desktop: true when expanded, false when collapsed to icon rail (w-16). */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Mobile: true when the overlay drawer is open. Independent of desktop `open`. */
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  /** Toggles `open` on desktop, `openMobile` on mobile. */
  toggleSidebar: () => void;
  /** Desktop expanded width in px. Persisted; adjustable by dragging the rail. */
  width: number;
  /** Sets the expanded width, clamped to [MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH]. */
  setWidth: (width: number) => void;
  /** True while the user is dragging the rail — consumers suppress width transitions. */
  isResizing: boolean;
  setResizing: (resizing: boolean) => void;
}

/** Tailwind `lg` breakpoint — below this: sidebar becomes hamburger drawer. */
const SIDEBAR_BREAKPOINT = 1024;

const STORAGE_KEY = "asidenote.sidebar.collapsed";
const WIDTH_STORAGE_KEY = "asidenote.sidebar.width";

/** Desktop expanded-width bounds (px). Default matches the former fixed `w-60` (15rem). */
export const MIN_SIDEBAR_WIDTH = 180;
export const MAX_SIDEBAR_WIDTH = 480;
export const DEFAULT_SIDEBAR_WIDTH = 240;
/** Collapsed icon-rail width (`w-16` = 4rem) — reported through the `--sidebar-width` var. */
const COLLAPSED_SIDEBAR_WIDTH = 64;

function clampWidth(value: number): number {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(value)));
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true;
  return target.isContentEditable;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [open, setOpen] = useState<boolean>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") return false;
    if (stored === "false") return true;
    return window.innerWidth >= SIDEBAR_BREAKPOINT;
  });
  const [openMobile, setOpenMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < SIDEBAR_BREAKPOINT);
  const [width, setWidthState] = useState<number>(() => {
    const stored = Number(window.localStorage.getItem(WIDTH_STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? clampWidth(stored) : DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizing, setResizing] = useState(false);

  const setWidth = useCallback((next: number) => {
    setWidthState(clampWidth(next));
  }, []);

  /* ── Mobile vs desktop breakpoint watcher ──────────── */
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${SIDEBAR_BREAKPOINT}px)`);
    function handleChange(e: MediaQueryListEvent | MediaQueryList) {
      setIsMobile(!e.matches);
    }
    handleChange(mql);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  /* ── Persist desktop collapse state ──────────── */
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(!open));
  }, [open]);

  /* ── Persist desktop width once the drag settles ──────────── */
  useEffect(() => {
    if (isResizing) return;
    window.localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
  }, [width, isResizing]);

  /* ── Publish the live width so fixed-position siblings can track it ──────────── */
  useEffect(() => {
    const px = open ? `${width}px` : `${COLLAPSED_SIDEBAR_WIDTH}px`;
    document.documentElement.style.setProperty("--sidebar-width", px);
  }, [open, width]);

  /* ── Freeze selection / unify cursor while dragging the rail ──────────── */
  useEffect(() => {
    if (!isResizing) return;
    const { body } = document;
    const prevUserSelect = body.style.userSelect;
    const prevCursor = body.style.cursor;
    body.style.userSelect = "none";
    body.style.cursor = "col-resize";
    return () => {
      body.style.userSelect = prevUserSelect;
      body.style.cursor = prevCursor;
    };
  }, [isResizing]);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile((value) => !value);
    } else {
      setOpen((value) => !value);
    }
  }, [isMobile]);

  /* ── Cmd/Ctrl+B global shortcut ──────────── */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "b" || !(e.metaKey || e.ctrlKey)) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      toggleSidebar();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const value = useMemo<SidebarContextValue>(
    () => ({
      state: open ? "expanded" : "collapsed",
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
      width,
      setWidth,
      isResizing,
      setResizing,
    }),
    [open, openMobile, isMobile, toggleSidebar, width, setWidth, isResizing],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}
