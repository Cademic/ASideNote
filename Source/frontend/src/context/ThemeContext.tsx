/* eslint-disable react-refresh/only-export-components */
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

export type EffectiveTheme = "light" | "dark";

interface ThemeContextValue {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  effectiveTheme: EffectiveTheme;
}

/** Resolves theme mode to actual light/dark (for system: uses prefers-color-scheme). */
export function resolveTheme(mode: ThemeMode): EffectiveTheme {
  if (mode !== "system") {
    return mode;
  }
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const STORAGE_KEY = "asidenote.theme";
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const transitionTimerRef = useRef<number | null>(null);

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (storedValue === "light" || storedValue === "dark" || storedValue === "system") {
      return storedValue;
    }
    return "system";
  });

  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() =>
    resolveTheme(themeMode),
  );

  const applyThemeClass = useCallback((next: EffectiveTheme) => {
    const htmlElement = document.documentElement;
    htmlElement.classList.add("theme-transition");
    htmlElement.classList.toggle("dark", next === "dark");

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      htmlElement.classList.remove("theme-transition");
      transitionTimerRef.current = null;
    }, 220);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, themeMode);
    const next = resolveTheme(themeMode);
    setEffectiveTheme(next);
    applyThemeClass(next);
  }, [applyThemeClass, themeMode]);

  useEffect(() => {
    if (themeMode !== "system") {
      return;
    }

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange() {
      const isDark = query.matches;
      const next = isDark ? "dark" : "light";
      setEffectiveTheme(next);
      applyThemeClass(next);
    }
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [applyThemeClass, themeMode]);

  useEffect(
    () => () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    },
    [],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      setThemeMode,
      effectiveTheme,
    }),
    [themeMode, effectiveTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }

  return context;
}
