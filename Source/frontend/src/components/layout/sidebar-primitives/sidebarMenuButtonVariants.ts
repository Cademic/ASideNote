import { cva, type VariantProps } from "class-variance-authority";

/**
 * Shared "row" look for sidebar nav items. Active-state amber/sky accent is layered
 * on separately via the `.sidebar-nav-active` CSS class in the consumer, not baked in
 * here, so it stays colocated with its existing definition in index.css.
 */
export const sidebarMenuButtonVariants = cva(
  "relative z-10 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default: "text-foreground/60 hover:text-foreground",
        ghost: "text-foreground/60 hover:text-foreground",
      },
      size: {
        default: "text-sm py-2",
        sm: "text-xs py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type SidebarMenuButtonVariants = VariantProps<typeof sidebarMenuButtonVariants>;
