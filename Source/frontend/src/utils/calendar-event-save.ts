import { createCalendarEvent, updateCalendarEvent } from "../api/calendar-events";
import type { CalendarEventDto } from "../types";

/** Shape produced by {@link CreateEventDialog}'s `onSave` callback. */
export interface CalendarEventFormData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  color: string;
  eventType: string;
  /** "HH:MM" (24h) — used only when `isAllDay` is false. */
  startTime: string;
  /** "HH:MM" (24h) — used only when `isAllDay` is false. */
  endTime: string;
  recurrenceFrequency: string;
  recurrenceInterval: number;
  recurrenceEndDate: string;
}

/**
 * Combine a `yyyy-MM-dd` date with an `HH:MM` time into a UTC ISO string.
 * All-day items are pinned to noon UTC so they never drift to an adjacent
 * calendar day when rendered in the viewer's timezone.
 */
function toDateUtc(dateStr: string, time: string, isAllDay: boolean): string {
  return isAllDay
    ? `${dateStr}T12:00:00.000Z`
    : `${dateStr}T${time}:00.000Z`;
}

interface SaveOptions {
  editEvent?: CalendarEventDto | null;
  /** Attaches the new event to a project (create only). */
  projectId?: string;
}

/**
 * Persists a calendar event or note from the dialog form data — shared by the
 * main calendar, project calendars, and the dashboard mini calendars so the
 * date/time and recurrence handling stays identical everywhere.
 */
export async function saveCalendarEventFromForm(
  data: CalendarEventFormData,
  { editEvent, projectId }: SaveOptions = {},
): Promise<void> {
  const startDate = toDateUtc(data.startDate, data.startTime, data.isAllDay);
  const endDate = data.endDate
    ? toDateUtc(data.endDate, data.endTime, data.isAllDay)
    : undefined;

  const recurrence = data.recurrenceFrequency
    ? {
        recurrenceFrequency: data.recurrenceFrequency,
        recurrenceInterval: data.recurrenceInterval,
        recurrenceEndDate: data.recurrenceEndDate
          ? `${data.recurrenceEndDate}T12:00:00.000Z`
          : undefined,
      }
    : {
        recurrenceFrequency: undefined,
        recurrenceInterval: 1,
        recurrenceEndDate: undefined,
      };

  const payload = {
    title: data.title,
    description: data.description || undefined,
    startDate,
    endDate,
    isAllDay: data.isAllDay,
    color: data.color,
    eventType: data.eventType,
    ...recurrence,
  };

  // For recurring instances the source event carries the real ID.
  const eventId = editEvent?.recurrenceSourceId ?? editEvent?.id;

  if (editEvent && eventId) {
    await updateCalendarEvent(eventId, payload);
  } else {
    await createCalendarEvent(projectId ? { ...payload, projectId } : payload);
  }
}
