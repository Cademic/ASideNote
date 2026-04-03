import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Users } from "lucide-react";
import { getColorForUserId } from "../../lib/presenceColors";
import type { BoardPresenceUser } from "../layout/AppLayout";

/** Sidebar panel when the board hub is connected — shows who is on the board. */
export function BoardConnectedUsersSidebar({
  users,
  expanded,
}: {
  users: BoardPresenceUser[];
  expanded: boolean;
}) {
  if (users.length === 0) return null;

  if (!expanded) {
    return (
      <div
        className="flex flex-col items-center gap-1 border-t border-border/40 px-2 py-2"
        title={`${users.length} connected: ${users.map((u) => u.displayName).join(", ")}`}
        aria-label="Connected users on this board"
      >
        <Users className="h-5 w-5 shrink-0 text-foreground/45" aria-hidden />
        <div className="flex max-w-full flex-wrap justify-center gap-0.5">
          {users.slice(0, 8).map((u) => (
            <span
              key={u.userId}
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: getColorForUserId(u.userId) }}
              title={u.displayName}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border/40 px-3 py-2" aria-label="Connected users on this board">
      <div className="mb-1.5 flex items-center gap-1.5 px-0 text-[10px] font-semibold uppercase tracking-wider text-foreground/35">
        <Users className="h-3 w-3" aria-hidden />
        Connected
      </div>
      <div className="flex max-h-36 flex-col gap-1 overflow-y-auto scrollbar-thin pr-0.5">
        {users.map((u) => (
          <div key={u.userId} className="flex min-w-0 items-center gap-2 text-sm text-foreground/85">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getColorForUserId(u.userId) }}
              aria-hidden
            />
            <span className="truncate" title={u.displayName}>
              {u.displayName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BoardConnectedUsersProps {
  users: BoardPresenceUser[];
}

const userItemClass =
  "flex items-center gap-2 px-3 py-2 text-sm text-foreground/90 hover:bg-amber-50 dark:hover:bg-amber-900/20";

export function BoardConnectedUsers({ users }: BoardConnectedUsersProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<
    { x: "left" | "right"; y: "top" | "bottom" }
  >({ x: "right", y: "bottom" });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!dropdownOpen || !buttonRef.current || !dropdownRef.current) return;
    const button = buttonRef.current.getBoundingClientRect();
    const dropdown = dropdownRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;

    let x: "left" | "right" = "right";
    let y: "top" | "bottom" = "bottom";

    // Horizontal: right-aligned by default; flip to left if dropdown would overflow left edge
    const rightAlignedLeft = button.right - dropdown.width;
    const leftAlignedRight = button.left + dropdown.width;
    if (rightAlignedLeft < pad && leftAlignedRight <= vw - pad) x = "left";
    else if (leftAlignedRight > vw - pad && rightAlignedLeft >= pad) x = "right";

    // Vertical: below by default; flip to above if dropdown would overflow bottom
    const belowTop = button.bottom + 4;
    const aboveBottom = button.top - dropdown.height - 4;
    if (belowTop + dropdown.height > vh - pad && aboveBottom >= pad) y = "top";
    else if (aboveBottom < pad && belowTop + dropdown.height <= vh - pad) y = "bottom";

    setDropdownPosition({ x, y });
  }, [dropdownOpen]);

  useEffect(() => {
    if (!dropdownOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [dropdownOpen]);

  if (users.length === 0) return null;

  const dropdownClasses = [
    "absolute z-50 min-w-[160px] max-w-[220px] overflow-hidden rounded-lg border border-border bg-background py-1 shadow-xl",
    dropdownPosition.x === "right" ? "right-0" : "left-0",
    dropdownPosition.y === "bottom" ? "top-full mt-1" : "bottom-full mb-1",
  ].join(" ");

  return (
    <div ref={containerRef} className="flex shrink-0" aria-label="Connected users on this board">
      {/* Full list: visible on md and up */}
      <div className="hidden md:flex items-center gap-2 overflow-hidden rounded-lg border border-border/50 bg-background/80 px-2 py-1.5">
        {users.map((u) => (
          <div
            key={u.userId}
            className="flex items-center gap-1.5 min-w-0 max-w-[120px] sm:max-w-[140px]"
            title={u.displayName}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getColorForUserId(u.userId) }}
              aria-hidden
            />
            <span className="truncate text-xs text-foreground/80">{u.displayName}</span>
          </div>
        ))}
      </div>

      {/* Icon button + dropdown: visible below md */}
      <div className="relative flex md:hidden">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-amber-100/50 dark:hover:bg-amber-900/20"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          aria-label="Connected users"
          title={`${users.length} user${users.length === 1 ? "" : "s"} online`}
        >
          <Users className="h-5 w-5 text-foreground/70" />
          <span className="sr-only">{users.length} online</span>
        </button>
        {dropdownOpen && (
          <div ref={dropdownRef} className={dropdownClasses} role="menu">
            {users.map((u) => (
              <div key={u.userId} className={userItemClass} role="menuitem">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: getColorForUserId(u.userId) }}
                  aria-hidden
                />
                <span className="truncate">{u.displayName}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
