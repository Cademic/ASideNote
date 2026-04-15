/**
 * Fixed position for a portal dropdown below the ellipsis trigger, right-aligned
 * to the trigger (matches dashboard card menus). Used in sidebar row layout so
 * the menu is not clipped by overflow on scrollable sidebar sections.
 */
export function getSidebarEllipsisMenuAnchor(
  triggerEl: HTMLElement,
  menuWidthPx: number,
): { x: number; y: number } {
  const rect = triggerEl.getBoundingClientRect();
  const padding = 8;
  const x = Math.min(
    Math.max(padding, rect.right - menuWidthPx),
    window.innerWidth - menuWidthPx - padding,
  );
  return { x, y: rect.bottom + 4 };
}
