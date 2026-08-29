/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchSearchIndex } from "../api/search-index";
import type { SearchIndexEntry } from "../lib/global-search";

export type SearchIndexStatus = "idle" | "loading" | "ready" | "error";

/** How long a built index is trusted before the next open rebuilds it. */
const INDEX_TTL_MS = 60_000;

interface GlobalSearchContextValue {
  entries: SearchIndexEntry[];
  status: SearchIndexStatus;
  isOpen: boolean;
  /** Bumps whenever something asks the search input to take focus (⌘K, button). */
  focusNonce: number;
  setOpen: (open: boolean) => void;
  /** Open the panel and pull focus to the input. */
  requestOpen: () => void;
  close: () => void;
  /** Build the index if it is missing or stale. Safe to call on every focus. */
  ensureIndex: () => void;
  /** Force a rebuild now (e.g. after creating content). */
  refresh: () => Promise<void>;
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | undefined>(undefined);

/** ⌘K belongs to the rich-text editors while the caret is inside one. */
function isInsideRichTextEditor(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest(".ProseMirror") !== null;
}

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<SearchIndexEntry[]>([]);
  const [status, setStatus] = useState<SearchIndexStatus>("idle");
  const [isOpen, setIsOpen] = useState(false);
  const [focusNonce, setFocusNonce] = useState(0);

  const lastLoadedAtRef = useRef(0);
  const inflightRef = useRef<Promise<void> | null>(null);
  const statusRef = useRef<SearchIndexStatus>("idle");
  statusRef.current = status;

  const load = useCallback(async (): Promise<void> => {
    if (inflightRef.current) return inflightRef.current;

    const run = (async () => {
      if (statusRef.current !== "ready") setStatus("loading");
      try {
        const next = await fetchSearchIndex();
        setEntries(next);
        lastLoadedAtRef.current = Date.now();
        setStatus("ready");
      } catch {
        setStatus("error");
      } finally {
        inflightRef.current = null;
      }
    })();

    inflightRef.current = run;
    return run;
  }, []);

  const ensureIndex = useCallback(() => {
    if (inflightRef.current) return;
    const isStale = Date.now() - lastLoadedAtRef.current > INDEX_TTL_MS;
    if (statusRef.current === "ready" && !isStale) return;
    void load();
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  const setOpen = useCallback((open: boolean) => setIsOpen(open), []);
  const close = useCallback(() => setIsOpen(false), []);

  const requestOpen = useCallback(() => {
    setIsOpen(true);
    setFocusNonce((n) => n + 1);
    ensureIndex();
  }, [ensureIndex]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
      if (isInsideRichTextEditor(e.target)) return;
      e.preventDefault();
      requestOpen();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestOpen]);

  const value = useMemo<GlobalSearchContextValue>(
    () => ({
      entries,
      status,
      isOpen,
      focusNonce,
      setOpen,
      requestOpen,
      close,
      ensureIndex,
      refresh,
    }),
    [entries, status, isOpen, focusNonce, setOpen, requestOpen, close, ensureIndex, refresh],
  );

  return <GlobalSearchContext.Provider value={value}>{children}</GlobalSearchContext.Provider>;
}

export function useGlobalSearch(): GlobalSearchContextValue {
  const context = useContext(GlobalSearchContext);
  if (!context) {
    throw new Error("useGlobalSearch must be used within GlobalSearchProvider");
  }
  return context;
}
