/**
 * True when an event target is a text-editing surface (input, textarea, or
 * contenteditable). Global keyboard shortcuts use this to avoid firing while the
 * user is typing.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true;
  return target.isContentEditable;
}
