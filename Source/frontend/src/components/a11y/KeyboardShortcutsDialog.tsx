import { X } from "lucide-react";
import { useModalDialog } from "../../hooks/useModalDialog";

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type Shortcut = { keys: string[]; label: string };
type Group = { title: string; items: Shortcut[] };

const GROUPS: Group[] = [
  {
    title: "Global",
    items: [
      { keys: ["?"], label: "Show this shortcuts list" },
      { keys: ["Ctrl", "K"], label: "Open search / command palette" },
      { keys: ["Ctrl", "B"], label: "Toggle the sidebar" },
      { keys: ["Esc"], label: "Close a dialog, menu, or popup" },
      { keys: ["Tab"], label: "Move to the next control" },
    ],
  },
  {
    title: "Menus & lists",
    items: [
      { keys: ["↑", "↓"], label: "Move between menu / list items" },
      { keys: ["Home", "End"], label: "Jump to the first / last item" },
      { keys: ["Enter"], label: "Activate the focused item" },
      { keys: ["A–Z"], label: "Jump to an item by first letter (menus)" },
    ],
  },
  {
    title: "Calendar",
    items: [
      { keys: ["D"], label: "Day view" },
      { keys: ["W"], label: "Week view" },
      { keys: ["M"], label: "Month view" },
      { keys: ["Y"], label: "Year view" },
      { keys: ["A"], label: "Agenda / events view" },
      { keys: ["T"], label: "Jump to today" },
    ],
  },
  {
    title: "Boards",
    items: [
      { keys: ["Tab"], label: "Move focus to a note, card, or image" },
      { keys: ["↑", "↓", "←", "→"], label: "Move the focused item" },
      { keys: ["Shift", "+ arrow"], label: "Move the focused item in bigger steps" },
      { keys: ["Enter"], label: "Edit the focused note or card" },
      { keys: ["Delete"], label: "Delete the focused item" },
      { keys: ["Space"], label: "Hold to pan the board" },
      { keys: ["Ctrl", "Z / Y"], label: "Undo / redo" },
      { keys: ["Ctrl", "S"], label: "Save the board to a file" },
    ],
  },
];

/** Reference card of every keyboard shortcut in the app. Opened with `?`. */
export function KeyboardShortcutsDialog({
  isOpen,
  onClose,
}: KeyboardShortcutsDialogProps) {
  const { dialogRef, titleId, ariaProps } = useModalDialog(isOpen, onClose, {
    moveFocusIn: true,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 bg-black/50 animate-overlay-enter motion-reduce:animate-none"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        {...ariaProps}
        className="relative mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl animate-dialog-enter motion-reduce:animate-none"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold text-foreground">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-foreground/50 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground/40">
                {group.title}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {group.items.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="text-foreground/70">{item.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-foreground/70"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
