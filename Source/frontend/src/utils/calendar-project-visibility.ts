import type { ProjectSummaryDto } from "../types";

/** Timeline on main/dashboard calendars: on unless the user opted out (`myShowOnPersonalCalendar === false`). */
export function isProjectVisibleOnUserCalendar(p: ProjectSummaryDto): boolean {
  return (p.myShowOnPersonalCalendar ?? true) === true;
}
