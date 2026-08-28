import { useState, type ComponentType } from "react";
import { motion } from "framer-motion";
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
 * Renders a list of sidebar nav rows with a shared, spring-animated hover highlight
 * (Framer Motion `layoutId` shared-element technique — only one highlight element
 * exists in the tree at a time, so it glides between items on hover instead of
 * popping in/out). The persistent active-route accent (amber/sky, applied inside
 * `SidebarMenuButton` via `.sidebar-nav-active`) stays separate and always-on.
 */
export function SidebarMenuList({ items, isActive, expanded }: SidebarMenuListProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {items.map((item) => (
        <div
          key={item.to}
          className="relative"
          onMouseEnter={() => setHoveredKey(item.to)}
          onMouseLeave={() => setHoveredKey(null)}
        >
          {hoveredKey === item.to && (
            <motion.div
              layoutId="sidebar-menu-highlight"
              className="absolute inset-0 rounded-lg bg-foreground/[0.04] dark:bg-foreground/[0.06]"
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
            />
          )}
          <SidebarMenuButton
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={isActive(item.to)}
            expanded={expanded}
          />
        </div>
      ))}
    </nav>
  );
}
