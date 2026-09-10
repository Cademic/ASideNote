import { useEffect, useRef, useState } from "react";

interface DelayedLoadingOptions {
  /** Wait this long before showing the placeholder — fast loads never flash it. */
  delayMs?: number;
  /** Once shown, keep the placeholder up at least this long so it can't blink out. */
  minDurationMs?: number;
}

/**
 * Gates a loading placeholder (skeleton / spinner) so a quick load doesn't make
 * it flash. Returns `true` only after `loading` has stayed true for `delayMs`,
 * and then keeps returning `true` for at least `minDurationMs`.
 */
export function useDelayedLoading(
  loading: boolean,
  { delayMs = 220, minDurationMs = 450 }: DelayedLoadingOptions = {},
): boolean {
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  // Arm the show timer while loading; if loading ends first, the cleanup cancels
  // it and the placeholder is never shown.
  useEffect(() => {
    if (!loading || visible) return;
    const timer = window.setTimeout(() => {
      shownAtRef.current = Date.now();
      setVisible(true);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [loading, visible, delayMs]);

  // Once loading ends, hold the placeholder for the remainder of minDurationMs.
  useEffect(() => {
    if (loading || !visible) return;
    const elapsed = shownAtRef.current
      ? Date.now() - shownAtRef.current
      : minDurationMs;
    const timer = window.setTimeout(
      () => {
        setVisible(false);
        shownAtRef.current = null;
      },
      Math.max(0, minDurationMs - elapsed),
    );
    return () => window.clearTimeout(timer);
  }, [loading, visible, minDurationMs]);

  return visible;
}
