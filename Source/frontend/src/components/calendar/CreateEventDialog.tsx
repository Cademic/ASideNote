import { useEffect, useState } from "react";
import { X, Repeat } from "lucide-react";
import type { CalendarEventDto } from "../../types";

const EVENT_COLORS = [
  { value: "sky", label: "Sky", bg: "bg-sky-400", ring: "ring-sky-500" },
  { value: "amber", label: "Amber", bg: "bg-amber-400", ring: "ring-amber-500" },
  { value: "rose", label: "Rose", bg: "bg-rose-400", ring: "ring-rose-500" },
  { value: "emerald", label: "Emerald", bg: "bg-emerald-400", ring: "ring-emerald-500" },
  { value: "violet", label: "Violet", bg: "bg-violet-400", ring: "ring-violet-500" },
  { value: "orange", label: "Orange", bg: "bg-orange-400", ring: "ring-orange-500" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i % 12 || 12;
  const ampm = i < 12 ? "AM" : "PM";
  return { value: String(i).padStart(2, "0"), label: `${hour}:00 ${ampm}` };
});

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    isAllDay: boolean;
    color: string;
    eventType: string;
    startHour: string;
    endHour: string;
    recurrenceFrequency: string;
    recurrenceInterval: number;
    recurrenceEndDate: string;
  }) => void;
  onDelete?: () => void;
  initialDate?: string;
  editEvent?: CalendarEventDto | null;
  projectId?: string;
  /** Project date boundaries — when set, event dates are constrained to this range */
  projectStartDate?: string | null;
  projectEndDate?: string | null;
}

export function CreateEventDialog({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialDate,
  editEvent,
  projectStartDate,
  projectEndDate,
}: CreateEventDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startHour, setStartHour] = useState("09");
  const [endHour, setEndHour] = useState("10");
  const [isAllDay, setIsAllDay] = useState(true);
  const [color, setColor] = useState("sky");
  const [eventType, setEventType] = useState<"Event" | "Note">("Event");
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (editEvent) {
      setTitle(editEvent.title);
      setDescription(editEvent.description ?? "");
      setStartDate(formatDateForInput(editEvent.startDate));
      setEndDate(editEvent.endDate ? formatDateForInput(editEvent.endDate) : "");
      setStartHour(extractHour(editEvent.startDate));
      setEndHour(editEvent.endDate ? extractHour(editEvent.endDate) : "10");
      setIsAllDay(editEvent.isAllDay);
      setColor(editEvent.color);
      setEventType(editEvent.eventType as "Event" | "Note");
      setRecurrenceFrequency(editEvent.recurrenceFrequency ?? "");
      setRecurrenceInterval(editEvent.recurrenceInterval ?? 1);
      setRecurrenceEndDate(editEvent.recurrenceEndDate ? formatDateForInput(editEvent.recurrenceEndDate) : "");
    } else {
      setTitle("");
      setDescription("");
      setStartDate(initialDate ?? toLocalDateStr(new Date()));
      setEndDate("");
      setStartHour("09");
      setEndHour("10");
      setIsAllDay(true);
      setColor("sky");
      setEventType("Event");
      setRecurrenceFrequency("");
      setRecurrenceInterval(1);
      setRecurrenceEndDate("");
    }
  }, [isOpen, editEvent, initialDate]);

  // Compute date boundaries when inside a project calendar
  const minDate = projectStartDate ? formatDateForInput(projectStartDate) : undefined;
  const maxDate = projectEndDate ? formatDateForInput(projectEndDate) : undefined;

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    // Enforce project date boundaries
    if (minDate && startDate < minDate) return;
    if (maxDate && startDate > maxDate) return;
    if (maxDate && endDate && endDate > maxDate) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      isAllDay,
      color,
      eventType,
      startHour,
      endHour,
      recurrenceFrequency,
      recurrenceInterval,
      recurrenceEndDate,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 animate-overlay-enter motion-reduce:animate-none" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl max-h-[90vh] overflow-y-auto animate-dialog-enter motion-reduce:animate-none">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {editEvent ? "Edit Event" : "New Event"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground/40 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Event Type Toggle */}
          <div className="flex gap-1 rounded-lg bg-foreground/5 p-1">
            <button
              type="button"
              onClick={() => setEventType("Event")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-[colors,box-shadow] duration-150 motion-reduce:transition-none ${
                eventType === "Event"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-foreground/50 hover:text-foreground/70"
              }`}
            >
              Event
            </button>
            <button
              type="button"
              onClick={() => setEventType("Note")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-[colors,box-shadow] duration-150 motion-reduce:transition-none ${
                eventType === "Note"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-foreground/50 hover:text-foreground/70"
              }`}
            >
              Note
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/60">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={eventType === "Note" ? "Note title..." : "Event title..."}
              maxLength={200}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/60">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              maxLength={2000}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Project date constraint notice */}
          {minDate && maxDate && (
            <div className="rounded-lg bg-violet-50 px-3 py-2 text-[11px] text-violet-600 dark:bg-violet-950/20 dark:text-violet-400">
              Dates must be within the project timeframe ({minDate} – {maxDate})
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/60">
                {eventType === "Note" ? "Date" : "Start Date"}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={minDate}
                max={maxDate}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {eventType === "Event" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground/60">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={maxDate}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>

          {/* All Day Toggle */}
          {eventType === "Event" && (
            <label className="flex items-center gap-2 text-sm text-foreground/70">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              All day event
            </label>
          )}

          {/* Hourly Time Selectors (when not all-day) */}
          {eventType === "Event" && !isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground/60">
                  Start Time
                </label>
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground/60">
                  End Time
                </label>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Recurrence */}
          {eventType === "Event" && (
            <div className="rounded-lg border border-border/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground/60">
                <Repeat className="h-3.5 w-3.5" />
                Repeat
              </div>
              <select
                value={recurrenceFrequency}
                onChange={(e) => setRecurrenceFrequency(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Does not repeat</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>

              {recurrenceFrequency && (
                <div className="mt-3 flex flex-col gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground/60">
                      Every
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-xs text-foreground/50">
                        {recurrenceFrequency === "Daily" ? "day(s)" : recurrenceFrequency === "Weekly" ? "week(s)" : "month(s)"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground/60">
                      Until (optional)
                    </label>
                    <input
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      min={startDate}
                      max={maxDate}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Color */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground/60">
              Color
            </label>
            <div className="flex gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className={`h-7 w-7 rounded-full ${c.bg} transition-[transform,opacity,box-shadow] duration-150 ease-spring motion-reduce:transition-none ${
                    color === c.value
                      ? `ring-2 ${c.ring} ring-offset-2 ring-offset-background scale-110`
                      : "opacity-60 hover:opacity-100 hover:scale-105"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center justify-between">
            <div>
              {editEvent && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                {editEvent ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateForInput(isoStr: string): string {
  const d = new Date(isoStr);
  // Use UTC parts to avoid timezone shifting the date to the previous day
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extractHour(isoStr: string): string {
  const d = new Date(isoStr);
  return String(d.getUTCHours()).padStart(2, "0");
}
