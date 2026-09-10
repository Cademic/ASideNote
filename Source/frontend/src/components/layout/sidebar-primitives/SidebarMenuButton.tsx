import { type ComponentType } from "react";
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
 * label; the accessible name is carried by `aria-label`, and the native `title`
 * attribute supplies the browser's delayed hover tooltip.
 */
export function SidebarMenuButton({ to, icon: Icon, label, isActive, expanded, className }: SidebarMenuButtonProps) {
  return (
    <Link
      to={to}
      aria-label={expanded ? undefined : label}
      title={expanded ? undefined : label}
      className={cn(
        sidebarMenuButtonVariants(),
        "sidebar-nav-item",
        !isActive && "hover:bg-[var(--land-cream)]",
        isActive && "sidebar-nav-active bg-amber-50 text-amber-800 dark:bg-sky-950/40 dark:text-sky-300",
        !expanded && "justify-center",
        className,
      )}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-amber-600 dark:text-sky-400")} />
      {expanded && <span>{label}</span>}
    </Link>
  );
}
