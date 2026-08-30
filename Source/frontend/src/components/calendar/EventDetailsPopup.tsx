import { X, Pencil, Repeat, FileText, Calendar, PartyPopper } from "lucide-react";
import type { CalendarEventDto } from "../../types";

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  sky: { bg: "bg-sky-50 dark:bg-sky-950/30", text: "text-sky-700 dark:text-sky-300", border: "border-sky-300 dark:border-sky-700" },
  amber: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-300 dark:border-amber-700" },
  rose: { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300", border: "border-rose-300 dark:border-rose-700" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300 dark:border-emerald-700" },
  violet: { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", border: "border-violet-300 dark:border-violet-700" },
  orange: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-300", border: "border-orange-300 dark:border-orange-700" },
  holiday: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-300", border: "border-red-300 dark:border-red-700" },
};

// Times are persisted as the user's picked wall-clock in UTC (see CreateEventDialog /
// calendar-event-save), so every read here is UTC too or the displayed hour drifts.
function formatDateTime(isoStr: string, isAllDay: boolean): string {
  const d = new Date(isoStr);
  if (isAllDay) {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

const RECURRENCE_NOUNS: Record<string, string> = {
  Daily: "day",
  Weekly: "week",
  Monthly: "month",
};

function formatRecurrence(frequency: string | null, interval: number): string {
  const noun = frequency ? RECURRENCE_NOUNS[frequency] : undefined;
  if (!noun) return "Repeats";
  if (interval > 1) return `Repeats every ${interval} ${noun}s`;
  return `Repeats ${frequency!.toLowerCase()}`;
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

interface EventDetailsPopupProps {
  event: CalendarEventDto;
  projectName?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export function EventDetailsPopup({
  event,
  projectName,
  isOpen,
  onClose,
  onEdit,
}: EventDetailsPopupProps) {
  if (!isOpen) return null;

  const colors = COLOR_MAP[event.color] ?? COLOR_MAP.sky;
  const isNote = event.eventType === "Note";
  const isHoliday = event.eventType === "Holiday";
  const typeLabel = isHoliday ? "Holiday" : isNote ? "Note" : "Event";
  const hasRecurrence = !!(event.recurrenceFrequency && event.recurrenceFrequency.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-background shadow-xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-details-title"
      >
        {/* Header with Edit icon */}
        <div className="sticky top-0 flex items-start justify-between border-b border-border bg-background px-6 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${colors.bg} ${colors.text}`}
            >
              {isHoliday ? (
                <PartyPopper className="h-5 w-5" />
              ) : isNote ? (
                <FileText className="h-5 w-5" />
              ) : (
                <Calendar className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="event-details-title"
                className="text-lg font-semibold text-foreground truncate"
              >
                {event.title}
              </h2>
              <span className="text-xs font-medium text-foreground/50">
                {typeLabel}
                {projectName && (
                  <span className="ml-1"> • {projectName}</span>
                )}
              </span>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            {!isHoliday && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg p-2 text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-primary"
                title="Edit event"
                aria-label="Edit event"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-foreground/40 transition-colors hover:bg-foreground/5 hover:text-foreground"
              title="Close"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Details body */}
        <div className="px-6 py-4 space-y-4">
          {event.description && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/50">
                Description
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/50">
              {(isNote || isHoliday) && event.isAllDay ? "Date" : "Date & Time"}
            </h3>
            <div className="text-sm text-foreground">
              {event.isAllDay ? (
                <p>
                  {formatDateTime(event.startDate, true)}
                  {event.endDate && event.endDate !== event.startDate && (
                    <span>
                      {" "}– {formatDateTime(event.endDate, true)}
                    </span>
                  )}
                </p>
              ) : (
                <p>
                  {formatDateTime(event.startDate, false)}
                  {event.endDate && (
                    <span> – {formatTime(event.endDate)}</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {hasRecurrence && (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-foreground/[0.02] px-3 py-2">
              <Repeat className="h-4 w-4 text-foreground/50" />
              <div className="text-sm text-foreground">
                {formatRecurrence(event.recurrenceFrequency, event.recurrenceInterval)}
                {event.recurrenceEndDate && (
                  <span> until {formatDateTime(event.recurrenceEndDate, true)}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
