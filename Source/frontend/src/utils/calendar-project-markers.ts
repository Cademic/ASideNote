import type { CalendarEventDto, ProjectSummaryDto } from "../types";

/** Noon-UTC instant for a project date — matches how saved all-day events are pinned. */
function markerInstant(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}T12:00:00.000Z`;
}

interface BuildOptions {
  /**
   * How the project is identified on the marker:
   *  - `false` (default, main Calendar): the name is baked into the title
   *    (`"Website (Start)"`) because that surface never renders a separate
   *    project label.
   *  - `true` (dashboard timeline): the title is just `"Start"` / `"End"` and the
   *    project name rides on `projectName`, so it renders like any other
   *    project-linked event.
   */
  labelWithProjectName?: boolean;
}

/**
 * Synthetic all-day calendar events marking a project's start and end dates, so a
 * project shows as two day markers rather than a bar spanning its whole range.
 * Shared by the main Calendar and the dashboard timeline.
 *
 * Markers carry `eventType: "Project"` and an `id` of `project-<id>-start|end`;
 * callers key click handling off that to link back to the project instead of
 * opening the (uneditable) event details popup.
 */
export function buildProjectMarkerEvents(
  projects: readonly ProjectSummaryDto[],
  { labelWithProjectName = false }: BuildOptions = {},
): CalendarEventDto[] {
  const markers: CalendarEventDto[] = [];
  for (const p of projects) {
    const make = (
      source: string,
      endpoint: "Start" | "End",
      key: "start" | "end",
    ): CalendarEventDto => ({
      id: `project-${p.id}-${key}`,
      title: labelWithProjectName ? endpoint : `${p.name} (${endpoint})`,
      description: p.description ?? null,
      projectId: p.id,
      projectName: labelWithProjectName ? p.name : null,
      startDate: markerInstant(source),
      endDate: null,
      isAllDay: true,
      color: p.color || "violet",
      eventType: "Project",
      recurrenceFrequency: null,
      recurrenceInterval: 1,
      recurrenceEndDate: null,
      recurrenceSourceId: null,
      createdAt: p.createdAt,
      updatedAt: p.createdAt,
    });
    if (p.startDate) markers.push(make(p.startDate, "Start", "start"));
    if (p.endDate) markers.push(make(p.endDate, "End", "end"));
  }
  return markers;
}
