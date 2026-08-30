import type { CalendarEventDto } from "../types";

/**
 * Built-in US holidays and common observances shown on every calendar surface
 * (togglable via the "Show holidays" preference). These are generated on the
 * client as synthetic {@link CalendarEventDto}s — they are never persisted and
 * never round-tripped through the create/update endpoints.
 */

export const HOLIDAY_EVENT_TYPE = "Holiday";
export const HOLIDAY_COLOR = "holiday";

/** True when an event is one of the synthetic built-in holidays (read-only). */
export function isHolidayEvent(event: { eventType: string }): boolean {
  return event.eventType === HOLIDAY_EVENT_TYPE;
}

/** Weekday numbers as returned by `Date.prototype.getDay()`. */
const SUN = 0;
const MON = 1;
const THU = 4;

/** The `n`-th `weekday` of a month (1-indexed), e.g. the 4th Thursday of November. */
function nthWeekdayOfMonth(
  year: number,
  monthIdx: number,
  weekday: number,
  n: number,
): Date {
  const firstWeekday = new Date(year, monthIdx, 1).getDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  return new Date(year, monthIdx, 1 + offset + (n - 1) * 7);
}

/** The last `weekday` of a month, e.g. the last Monday of May. */
function lastWeekdayOfMonth(year: number, monthIdx: number, weekday: number): Date {
  const lastDay = new Date(year, monthIdx + 1, 0);
  const offset = (lastDay.getDay() - weekday + 7) % 7;
  return new Date(year, monthIdx, lastDay.getDate() - offset);
}

interface HolidayDef {
  slug: string;
  title: string;
  /** Resolves to a local `Date` for the given year. */
  resolve: (year: number) => Date;
}

function fixed(slug: string, title: string, monthIdx: number, day: number): HolidayDef {
  return { slug, title, resolve: (year) => new Date(year, monthIdx, day) };
}

/** US federal holidays plus widely-observed days. Order is for readability only. */
export const US_HOLIDAYS: readonly HolidayDef[] = [
  fixed("new-years-day", "New Year's Day", 0, 1),
  { slug: "mlk-day", title: "Martin Luther King Jr. Day", resolve: (y) => nthWeekdayOfMonth(y, 0, MON, 3) },
  { slug: "presidents-day", title: "Presidents' Day", resolve: (y) => nthWeekdayOfMonth(y, 1, MON, 3) },
  fixed("valentines-day", "Valentine's Day", 1, 14),
  { slug: "mothers-day", title: "Mother's Day", resolve: (y) => nthWeekdayOfMonth(y, 4, SUN, 2) },
  { slug: "memorial-day", title: "Memorial Day", resolve: (y) => lastWeekdayOfMonth(y, 4, MON) },
  fixed("juneteenth", "Juneteenth", 5, 19),
  { slug: "fathers-day", title: "Father's Day", resolve: (y) => nthWeekdayOfMonth(y, 5, SUN, 3) },
  fixed("independence-day", "Independence Day", 6, 4),
  { slug: "labor-day", title: "Labor Day", resolve: (y) => nthWeekdayOfMonth(y, 8, MON, 1) },
  { slug: "indigenous-peoples-day", title: "Columbus Day / Indigenous Peoples' Day", resolve: (y) => nthWeekdayOfMonth(y, 9, MON, 2) },
  fixed("halloween", "Halloween", 9, 31),
  fixed("veterans-day", "Veterans Day", 10, 11),
  { slug: "thanksgiving", title: "Thanksgiving", resolve: (y) => nthWeekdayOfMonth(y, 10, THU, 4) },
  fixed("christmas-eve", "Christmas Eve", 11, 24),
  fixed("christmas-day", "Christmas Day", 11, 25),
  fixed("new-years-eve", "New Year's Eve", 11, 31),
];

/** `yyyy-MM-dd` from a local `Date`. */
function toDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Synthetic all-day calendar events for every built-in holiday falling within
 * `[fromISO, toISO]`. All-day events are pinned to noon UTC so they render on the
 * intended day in the viewer's timezone (matching `calendar-event-save.toDateUtc`).
 */
export function getHolidayEvents(fromISO: string, toISO: string): CalendarEventDto[] {
  const fromMs = Date.parse(fromISO);
  const toMs = Date.parse(toISO);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs > toMs) return [];

  const startYear = new Date(fromMs).getUTCFullYear();
  const endYear = new Date(toMs).getUTCFullYear();
  const events: CalendarEventDto[] = [];

  for (let year = startYear; year <= endYear; year++) {
    for (const def of US_HOLIDAYS) {
      const dateStr = toDateStr(def.resolve(year));
      const startDate = `${dateStr}T12:00:00.000Z`;
      const ms = Date.parse(startDate);
      if (ms < fromMs || ms > toMs) continue;

      events.push({
        id: `holiday:${dateStr}:${def.slug}`,
        title: def.title,
        description: null,
        projectId: null,
        projectName: null,
        startDate,
        endDate: null,
        isAllDay: true,
        color: HOLIDAY_COLOR,
        eventType: HOLIDAY_EVENT_TYPE,
        recurrenceFrequency: null,
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceSourceId: null,
        createdAt: startDate,
        updatedAt: startDate,
      });
    }
  }

  return events;
}
