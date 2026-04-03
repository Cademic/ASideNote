/** Padding from window edges when fitting dropdowns and panels. */
export const DROPDOWN_VIEWPORT_PADDING = 8;

/**
 * Clamp a fixed-position box so it stays fully inside the viewport.
 */
export function constrainFixedBox(
  left: number,
  top: number,
  width: number,
  height: number,
  padding = DROPDOWN_VIEWPORT_PADDING,
): { left: number; top: number } {
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  let l = left;
  let t = top;
  const maxW = Math.max(0, vw - 2 * padding);
  const maxH = Math.max(0, vh - 2 * padding);
  const w = Math.min(width, maxW);
  const h = Math.min(height, maxH);
  if (l < padding) l = padding;
  if (l + w > vw - padding) l = Math.max(padding, vw - padding - w);
  if (t < padding) t = padding;
  if (t + h > vh - padding) t = Math.max(padding, vh - padding - h);
  return { left: l, top: t };
}

/**
 * Nudge an absolutely positioned element (inside a relative parent) using transform
 * so its bounding box stays in the viewport. Resets transform/maxHeight first.
 */
export function nudgeAbsoluteElementIntoViewport(el: HTMLElement, padding = DROPDOWN_VIEWPORT_PADDING): void {
  el.style.transform = "";
  el.style.maxHeight = "";
  el.style.overflowY = "";
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let r = el.getBoundingClientRect();
  let tx = 0;
  let ty = 0;
  if (r.right > vw - padding) tx += vw - padding - r.right;
  if (r.left + tx < padding) tx += padding - (r.left + tx);
  if (r.bottom > vh - padding) ty += vh - padding - r.bottom;
  if (r.top + ty < padding) ty += padding - (r.top + ty);
  if (tx !== 0 || ty !== 0) {
    el.style.transform = `translate(${tx}px, ${ty}px)`;
  }
  r = el.getBoundingClientRect();
  const maxH = vh - 2 * padding;
  if (r.height > maxH) {
    el.style.maxHeight = `${maxH}px`;
    el.style.overflowY = "auto";
  }
}

/**
 * Fit a fixed-position element (left/top in px) after it has been placed; updates state via setPosition.
 */
export function fitFixedDropdownToViewport(
  el: HTMLElement,
  setPosition: (next: { left: number; top: number }) => void,
  padding = DROPDOWN_VIEWPORT_PADDING,
): void {
  const r = el.getBoundingClientRect();
  const { left, top } = constrainFixedBox(r.left, r.top, r.width, r.height, padding);
  if (Math.abs(left - r.left) > 0.5 || Math.abs(top - r.top) > 0.5) {
    setPosition({ left, top });
  }
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const maxH = vh - 2 * padding;
  if (r.height > maxH) {
    el.style.maxHeight = `${maxH}px`;
    el.style.overflowY = "auto";
  } else {
    el.style.maxHeight = "";
    el.style.overflowY = "";
  }
}
