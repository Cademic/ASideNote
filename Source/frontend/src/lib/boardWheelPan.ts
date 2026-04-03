/**
 * When false, the board may handle wheel as pan/zoom; when true, let the browser scroll/focus the field.
 */
export function isWheelOverEditableText(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "textarea, input:not([type='hidden']):not([type='checkbox']):not([type='radio']), select, [contenteditable='true']",
    ),
  );
}

/** Normalize WheelEvent deltas to pixels (handles LINE / PAGE deltaMode). */
export function wheelEventDeltaPixels(e: WheelEvent, sizeEl: HTMLElement): { dx: number; dy: number } {
  let sx = 1;
  let sy = 1;
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    sx = sy = 16;
  } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    sx = sizeEl.clientWidth;
    sy = sizeEl.clientHeight;
  }
  return { dx: e.deltaX * sx, dy: e.deltaY * sy };
}
