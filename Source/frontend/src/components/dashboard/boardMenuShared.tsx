import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

export const menuItemClass =
  "w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-900/20 flex items-center gap-2";
export const menuItemWithSubmenuClass =
  "w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-900/20 flex items-center justify-between gap-2";
export const dividerClass = "my-1 border-t border-border/50";
export const submenuClass =
  "absolute left-full top-0 -ml-1 pl-1 z-[60] min-w-[160px] rounded-lg border border-border bg-background py-1 shadow-xl";

export function HoverSubmenu({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  useEffect(() => () => clearCloseTimer(), []);
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
