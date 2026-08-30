import { describe, expect, test } from "vitest";
import { getHolidayEvents, isHolidayEvent } from "./holidays";

/** Find one generated holiday by its title within a window. */
function holidayOn(from: string, to: string, title: string) {
  return getHolidayEvents(from, to).find((e) => e.title === title);
}

describe("getHolidayEvents", () => {
  test("resolves fixed-date holidays (Christmas Day 2026 → Dec 25)", () => {
    const christmas = holidayOn(
      "2026-12-01T00:00:00.000Z",
      "2026-12-31T23:59:59.000Z",
      "Christmas Day",
    );
    expect(christmas?.startDate).toBe("2026-12-25T12:00:00.000Z");
  });

  test("resolves nth-weekday holidays", () => {
    const window: [string, string] = [
      "2026-01-01T00:00:00.000Z",
      "2026-12-31T23:59:59.000Z",
    ];
    // 4th Thursday of November 2026
    expect(holidayOn(...window, "Thanksgiving")?.startDate).toBe(
      "2026-11-26T12:00:00.000Z",
    );
    // 3rd Monday of January 2026
    expect(
      holidayOn(...window, "Martin Luther King Jr. Day")?.startDate,
    ).toBe("2026-01-19T12:00:00.000Z");
  });

  test("resolves last-weekday holidays (Memorial Day 2026 → last Mon of May)", () => {
    const memorialDay = holidayOn(
      "2026-05-01T00:00:00.000Z",
      "2026-05-31T23:59:59.000Z",
      "Memorial Day",
    );
    expect(memorialDay?.startDate).toBe("2026-05-25T12:00:00.000Z");
  });

  test("only returns holidays inside the requested window, across a year boundary", () => {
    const events = getHolidayEvents(
      "2026-12-20T00:00:00.000Z",
      "2027-01-05T00:00:00.000Z",
    );
    const titles = events.map((e) => e.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        "Christmas Eve",
        "Christmas Day",
        "New Year's Eve",
        "New Year's Day",
      ]),
    );
    // Thanksgiving (late Nov) is outside the window.
    expect(titles).not.toContain("Thanksgiving");
    // Every event's instant is within the window.
    for (const e of events) {
      const ms = Date.parse(e.startDate);
      expect(ms).toBeGreaterThanOrEqual(Date.parse("2026-12-20T00:00:00.000Z"));
      expect(ms).toBeLessThanOrEqual(Date.parse("2027-01-05T00:00:00.000Z"));
    }
  });

  test("emits read-only synthetic all-day events", () => {
    const [event] = getHolidayEvents(
      "2026-07-01T00:00:00.000Z",
      "2026-07-31T00:00:00.000Z",
    );
    expect(event.eventType).toBe("Holiday");
    expect(isHolidayEvent(event)).toBe(true);
    expect(event.isAllDay).toBe(true);
    expect(event.id.startsWith("holiday:")).toBe(true);
    expect(event.startDate.endsWith("T12:00:00.000Z")).toBe(true);
    expect(event.projectId).toBeNull();
  });

  test("returns [] for an inverted or invalid range", () => {
    expect(
      getHolidayEvents("2026-12-31T00:00:00.000Z", "2026-01-01T00:00:00.000Z"),
    ).toEqual([]);
    expect(getHolidayEvents("not-a-date", "also-not")).toEqual([]);
  });
});
