import { describe, expect, test } from "vitest";
import { buildUpcomingItems } from "./dashboard-upcoming";
import type { CalendarEventDto, ProjectSummaryDto } from "../types";

const NOW = new Date("2026-03-10T09:00:00.000Z");

function makeEvent(overrides: Partial<CalendarEventDto> & { title: string; startDate: string }): CalendarEventDto {
  return {
    id: overrides.title,
    description: null,
    projectId: null,
    endDate: null,
    isAllDay: false,
    color: "#000",
    eventType: "general",
    recurrenceFrequency: null,
    recurrenceInterval: 1,
    recurrenceEndDate: null,
    recurrenceSourceId: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

function makeProject(overrides: Partial<ProjectSummaryDto> & { name: string }): ProjectSummaryDto {
  return {
    id: overrides.name,
    description: null,
    startDate: null,
    endDate: null,
    deadline: null,
    status: "active",
    progress: 0,
    color: "#000",
    ownerId: "u1",
    ownerUsername: "u1",
    userRole: "owner",
    memberCount: 1,
    boardCount: 0,
    createdAt: NOW.toISOString(),
    ...overrides,
  };
}

describe("buildUpcomingItems", () => {
  test("returns an empty array when there is nothing upcoming", () => {
    expect(buildUpcomingItems([], [], NOW)).toEqual([]);
  });

  test("merges events and project start dates in chronological order", () => {
    const events = [
      makeEvent({ title: "Later event", startDate: "2026-03-20T10:00:00.000Z" }),
      makeEvent({ title: "Sooner event", startDate: "2026-03-11T10:00:00.000Z" }),
    ];
    const projects = [makeProject({ name: "Project kickoff", startDate: "2026-03-15T00:00:00.000Z" })];

    const result = buildUpcomingItems(events, projects, NOW);

    expect(result.map((i) => i.title)).toEqual(["Sooner event", "Project kickoff", "Later event"]);
    expect(result[0].event?.title).toBe("Sooner event");
    expect(result[1].project?.name).toBe("Project kickoff");
  });

  test("drops items that start before the beginning of today", () => {
    const events = [
      makeEvent({ title: "Yesterday", startDate: "2026-03-09T10:00:00.000Z" }),
      makeEvent({ title: "Earlier today", startDate: "2026-03-10T06:00:00.000Z" }),
      makeEvent({ title: "Tomorrow", startDate: "2026-03-11T10:00:00.000Z" }),
    ];

    const result = buildUpcomingItems(events, [], NOW);

    // "Earlier today" is kept — the cutoff is the start of the day, not the current time.
    expect(result.map((i) => i.title)).toEqual(["Earlier today", "Tomorrow"]);
  });

  test("excludes projects the user hid from their personal calendar", () => {
    const projects = [
      makeProject({ name: "Visible", startDate: "2026-03-15T00:00:00.000Z", myShowOnPersonalCalendar: true }),
      makeProject({ name: "Hidden", startDate: "2026-03-16T00:00:00.000Z", myShowOnPersonalCalendar: false }),
      makeProject({ name: "No start date", startDate: null }),
    ];

    const result = buildUpcomingItems([], projects, NOW);

    expect(result.map((i) => i.title)).toEqual(["Visible"]);
  });
});
