import type { CalendarEventDto, ProjectSummaryDto } from "../types";
import { isProjectVisibleOnUserCalendar } from "./calendar-project-visibility";

/**
 * A single row in the dashboard's "Upcoming" timeline. Exactly one of `event` / `project`
 * is set — `event` for a calendar event, `project` for a project's start date.
 */
export interface UpcomingItem {
  /** Epoch ms of the item's start — the timeline sort key. */
  startMs: number;
  title: string;
  event?: CalendarEventDto;
  project?: ProjectSummaryDto;
}

/**
 * Merge calendar events and project start dates into one chronologically-sorted list,
 * dropping anything that starts before the beginning of `now`'s day. Projects are
 * filtered through {@link isProjectVisibleOnUserCalendar} so the timeline matches the
 * calendar view.
 *
 * This generalizes the dashboard's former "next up" derive: the head of the returned
 * array is the next upcoming item.
 */
export function buildUpcomingItems(
  events: readonly CalendarEventDto[],
  projects: readonly ProjectSummaryDto[],
  now: Date = new Date(),
): UpcomingItem[] {
  // Calendar times are stored as UTC wall-clock, but that clock is the viewer's local one
  // (see CalendarEventItem.shortTime / UpcomingTimeline), so the cutoff is the UTC-midnight
  // epoch of the viewer's LOCAL current date.
  const cutoffMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  const items: UpcomingItem[] = [];

  for (const ev of events) {
    const startMs = new Date(ev.startDate).getTime();
    if (Number.isNaN(startMs) || startMs < cutoffMs) continue;
    items.push({ startMs, title: ev.title, event: ev });
  }

  for (const proj of projects) {
    if (!proj.startDate) continue;
    if (!isProjectVisibleOnUserCalendar(proj)) continue;
    const startMs = new Date(proj.startDate).getTime();
    if (Number.isNaN(startMs) || startMs < cutoffMs) continue;
    items.push({ startMs, title: proj.name, project: proj });
  }

  items.sort((a, b) => a.startMs - b.startMs);
  return items;
}
