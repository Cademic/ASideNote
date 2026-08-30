import { LayoutGrid, List } from "lucide-react";
import type { GalleryViewMode } from "../../lib/gallery-prefs";

interface GalleryViewToggleProps {
  value: GalleryViewMode;
  onChange: (mode: GalleryViewMode) => void;
}

const OPTIONS: Array<{
  value: GalleryViewMode;
  label: string;
  icon: typeof LayoutGrid;
}> = [
  { value: "grid", label: "Thumbnails", icon: LayoutGrid },
  { value: "list", label: "Details", icon: List },
];

/**
 * File Explorer-style segmented control for the Gallery. Visual language matches
 * the calendar layout toggle (`CalendarHeader`).
 */
export function GalleryViewToggle({ value, onChange }: GalleryViewToggleProps) {
  return (
    <div
      className="flex overflow-hidden rounded-lg border border-border"
      role="group"
      aria-label="View mode"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            title={option.label}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground/50 hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
