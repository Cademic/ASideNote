import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { nudgeAbsoluteElementIntoViewport } from "../../lib/dropdown-viewport";

export const menuItemClass =
  "w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-900/20 flex items-center gap-2";
export const menuItemWithSubmenuClass =
  "w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-900/20 flex items-center justify-between gap-2";
export const dividerClass = "my-1 border-t border-border/50";
/** Overlap parent column (-ml-3) so pointer path to the flyout does not hit “empty” space behind the menu. */
export const submenuClass =
  "absolute left-full top-0 z-[60] min-w-[160px] max-w-[min(320px,calc(100vw-1rem))] -ml-3 rounded-lg border border-border bg-background py-1 pl-2 shadow-xl";

export function HoverSubmenu({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
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
      data-board-menu-hover-submenu
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
