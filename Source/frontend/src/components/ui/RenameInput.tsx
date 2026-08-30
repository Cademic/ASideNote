interface RenameInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  /** Overrides the default input styling when a caller needs a different fit. */
  className?: string;
}

const DEFAULT_CLASS =
  "min-w-0 flex-1 rounded border border-[var(--land-rule)] bg-[var(--land-paper)] px-2 py-1 text-sm text-[var(--land-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--land-blue)]";

/**
 * Inline rename field: autofocuses, commits on Enter / blur, cancels on Escape.
 * Shared by the dashboard Projects tree and the sidebar workspace rows.
 */
export function RenameInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  className = DEFAULT_CLASS,
}: RenameInputProps) {
  return (
    <input
      autoFocus
      value={value}
      maxLength={100}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSubmit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={onSubmit}
      className={className}
    />
  );
}
