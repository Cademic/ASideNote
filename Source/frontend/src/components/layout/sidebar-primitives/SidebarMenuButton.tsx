import { useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../../lib/cn";
import { sidebarMenuButtonVariants } from "./sidebarMenuButtonVariants";

interface SidebarMenuButtonProps {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  /** Resolved expanded state (desktop expanded OR mobile drawer) — computed once by the caller. */
  expanded: boolean;
  className?: string;
}

/**
 * Sidebar nav row. When collapsed to icon-only mode (`expanded === false`), hides the
 * label and shows a small hover tooltip instead — the hand-rolled equivalent of
 * animate-ui's collapsed-mode `tooltip` prop, without pulling in Radix Tooltip.
 */
export function SidebarMenuButton({ to, icon: Icon, label, isActive, expanded, className }: SidebarMenuButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <Link
      to={to}
      title={expanded ? undefined : label}
      onMouseEnter={() => !expanded && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => !expanded && setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      className={cn(
        sidebarMenuButtonVariants(),
        !isActive && "hover:bg-[var(--land-cream)]",
        isActive && "sidebar-nav-active bg-amber-50 text-amber-800 dark:bg-sky-950/40 dark:text-sky-300",
        !expanded && "justify-center",
        // The row is `relative z-10`, which is its own stacking context — so the
        // collapsed tooltip below can't escape it. Lift the whole row above board
        // chrome (CorkBoard top bar is z-30) while that tooltip is visible.
        !expanded && showTooltip && "z-[60]",
        className,
      )}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-amber-600 dark:text-sky-400")} />
      {expanded && <span>{label}</span>}
      {!expanded && showTooltip && (
        <span
          role="tooltip"
          className="sidebar-tooltip pointer-events-none absolute left-full top-1/2 z-[60] ml-2 -translate-y-1/2 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium animate-dropdown-pop"
        >
          {label}
        </span>
      )}
    </Link>
  );
}
