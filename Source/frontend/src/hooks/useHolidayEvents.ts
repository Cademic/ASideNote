import { useMemo } from "react";
import { usePreferences } from "../context/PreferencesContext";
import { getHolidayEvents } from "../utils/holidays";
import type { CalendarEventDto } from "../types";

/**
 * Synthetic built-in holiday events for the given ISO date window, or an empty
 * list when the user has turned holidays off. While preferences are still
 * loading (or unavailable) holidays are shown, matching the on-by-default.
 */
export function useHolidayEvents(fromISO: string, toISO: string): CalendarEventDto[] {
  const { preferences } = usePreferences();
  const enabled = preferences?.showHolidays !== false;

  return useMemo(
    () => (enabled ? getHolidayEvents(fromISO, toISO) : []),
    [enabled, fromISO, toISO],
  );
}
