import { useCallback, useEffect, useState } from "react";

const AUTO_ENLARGE_STORAGE_KEY = "board-auto-enlarge-note-on-click";

export function useAutoEnlargeNoteSetting() {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(AUTO_ENLARGE_STORAGE_KEY);
      return stored !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    function onChange() {
      try {
        const stored = localStorage.getItem(AUTO_ENLARGE_STORAGE_KEY);
        setValue(stored !== "false");
      } catch {
        setValue(true);
      }
    }
    window.addEventListener("board-auto-enlarge-change", onChange);
    return () => window.removeEventListener("board-auto-enlarge-change", onChange);
  }, []);

  const toggle = useCallback(() => {
    const next = !value;
    setValue(next);
    try {
      localStorage.setItem(AUTO_ENLARGE_STORAGE_KEY, String(next));
      window.dispatchEvent(new Event("board-auto-enlarge-change"));
    } catch {
      setValue(true);
    }
  }, [value]);

  return [value, toggle] as const;
}
