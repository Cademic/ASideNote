import { ChevronLeft, ChevronRight, Grid3X3, List } from "lucide-react";

export type CalendarLayout = "grid" | "timeline";

interface CalendarHeaderProps {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  /** When true, hides the Today control below the `sm` breakpoint (narrow / mobile). */
  hideTodayOnMobile?: boolean;
  layout?: CalendarLayout;
  onLayoutChange?: (layout: CalendarLayout) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function CalendarHeader({
  currentDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
  hideTodayOnMobile = false,
  layout,
  onLayoutChange,
}: CalendarHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      {/* Month / year + Today */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">
          {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button
          type="button"
          onClick={onToday}
          className={[
            "shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground/60 transition-colors hover:border-primary/40 hover:text-primary",
            hideTodayOnMobile ? "hidden sm:inline-flex" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          Today
        </button>
      </div>

      {/* Grid / Timeline + month navigation */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {layout && onLayoutChange && (
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => onLayoutChange("grid")}
              title="Month grid"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                layout === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground/50 hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange("timeline")}
              title="Weekly timeline"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                layout === "timeline"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground/50 hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Timeline
            </button>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPreviousMonth}
            className="rounded-lg p-1.5 text-foreground/50 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="rounded-lg p-1.5 text-foreground/50 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
