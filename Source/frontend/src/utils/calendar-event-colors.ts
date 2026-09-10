/**
 * Named calendar-event palette. The API stores an event's `color` as one of these keys;
 * every calendar surface (month grid, day/week time grid, agenda list, dashboard schedule)
 * resolves it through {@link resolveCalendarEventColor} so the event chips look identical
 * everywhere. Dark backgrounds keep a translucent tint so the blocks sit lightly over the
 * dark grid.
 */
export interface CalendarEventColorClasses {
  /** Background utility classes (light + dark). */
  bg: string;
  /** Foreground text utility classes (light + dark). */
  text: string;
  /** Border utility classes (light + dark) — the chip outline. */
  border: string;
  /** Solid dot / accent utility class. */
  dot: string;
}

const CALENDAR_EVENT_COLORS: Record<string, CalendarEventColorClasses> = {
  sky: {
    bg: "bg-sky-100 dark:bg-sky-950/50",
    text: "text-sky-800 dark:text-sky-200",
    border: "border-sky-400/60 dark:border-sky-600",
    dot: "bg-sky-500",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-950/50",
    text: "text-amber-800 dark:text-amber-200",
    border: "border-amber-400/60 dark:border-amber-600",
    dot: "bg-amber-500",
  },
  rose: {
    bg: "bg-rose-100 dark:bg-rose-950/50",
    text: "text-rose-800 dark:text-rose-200",
    border: "border-rose-400/60 dark:border-rose-600",
    dot: "bg-rose-500",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-950/50",
    text: "text-emerald-800 dark:text-emerald-200",
    border: "border-emerald-400/60 dark:border-emerald-600",
    dot: "bg-emerald-500",
  },
  violet: {
    bg: "bg-violet-100 dark:bg-violet-950/50",
    text: "text-violet-800 dark:text-violet-200",
    border: "border-violet-400/60 dark:border-violet-600",
    dot: "bg-violet-500",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-950/50",
    text: "text-orange-800 dark:text-orange-200",
    border: "border-orange-400/60 dark:border-orange-600",
    dot: "bg-orange-500",
  },
  // Reserved for the built-in holidays (see utils/holidays.ts).
  holiday: {
    bg: "bg-red-100 dark:bg-red-950/50",
    text: "text-red-800 dark:text-red-200",
    border: "border-red-400/60 dark:border-red-600",
    dot: "bg-red-500",
  },
};

export function resolveCalendarEventColor(
  color: string | null | undefined,
): CalendarEventColorClasses {
  return (color ? CALENDAR_EVENT_COLORS[color] : undefined) ?? CALENDAR_EVENT_COLORS.sky;
}
