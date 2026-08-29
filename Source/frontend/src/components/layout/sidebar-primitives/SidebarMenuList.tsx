import { type ComponentType } from "react";
import { SidebarMenuButton } from "./SidebarMenuButton";

export interface SidebarMenuItemDef {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}

interface SidebarMenuListProps {
  items: SidebarMenuItemDef[];
  isActive: (path: string) => boolean;
  expanded: boolean;
}

/**
 * Renders a list of sidebar nav rows. Hover feedback is a plain CSS background on
 * each row (see `SidebarMenuButton`) so it responds instantly to the pointer — the
 * previous Framer Motion shared-element (`layoutId`) highlight glided between rows
 * with a spring, which read as input lag. The persistent active-route accent
 * (amber/sky, applied inside `SidebarMenuButton` via `.sidebar-nav-active`) is
 * separate and always-on.
 */
export function SidebarMenuList({ items, isActive, expanded }: SidebarMenuListProps) {
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {items.map((item) => (
        <SidebarMenuButton
          key={item.to}
          to={item.to}
          icon={item.icon}
          label={item.label}
          isActive={isActive(item.to)}
          expanded={expanded}
        />
      ))}
    </nav>
  );
}
