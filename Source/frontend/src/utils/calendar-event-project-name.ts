import type { CalendarEventDto } from "../types";

/** Project label for a calendar event: prefer API field, then id map (case-insensitive id match). */
export function resolveEventProjectName(
  event: CalendarEventDto,
  projectNameMap?: Record<string, string> | null,
): string | null {
  if (event.projectName) return event.projectName;
  if (!event.projectId || !projectNameMap) return null;
  const id = event.projectId;
  return projectNameMap[id] ?? projectNameMap[id.toLowerCase()] ?? null;
}
