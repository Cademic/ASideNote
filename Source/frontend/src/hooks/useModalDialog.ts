import { useId, useRef } from "react";
import { useFocusTrap } from "./useFocusTrap";

/**
 * One call to make a hand-rolled modal accessible: focus trap + focus restore +
 * body-scroll lock + Escape-to-close (via `useFocusTrap`), plus a generated id
 * to wire `aria-labelledby` to the dialog's heading.
 *
 * ```tsx
 * const { dialogRef, titleId, ariaProps } = useModalDialog(isOpen, onClose);
 * // <div ref={dialogRef} {...ariaProps} className="…panel…">
 * //   <h2 id={titleId}>Title</h2>
 * ```
 *
 * `moveFocusIn` defaults to false because these dialogs already `autoFocus`
 * their first field; pass true when a dialog has no autofocus target.
 */
export function useModalDialog(
  active: boolean,
  onClose: () => void,
  { moveFocusIn = false }: { moveFocusIn?: boolean } = {},
) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(dialogRef, { active, onEscape: onClose, moveFocusIn });

  return {
    dialogRef,
    titleId,
    ariaProps: {
      role: "dialog" as const,
      "aria-modal": true,
      "aria-labelledby": titleId,
    },
  };
}
