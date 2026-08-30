import { describe, expect, test } from "vitest";
import {
  bucketByRecency,
  bucketForDate,
  GALLERY_BUCKET_ORDER,
} from "./gallery-buckets";

// Wednesday, 2026-03-11 14:00 local.
const NOW = new Date(2026, 2, 11, 14, 0, 0);

function at(y: number, m: number, d: number, h = 12): string {
  return new Date(y, m, d, h).toISOString();
}

describe("bucketForDate", () => {
  test("earlier today -> today", () => {
    expect(bucketForDate(at(2026, 2, 11, 1), NOW)).toBe("today");
  });

  test("yesterday -> yesterday", () => {
    expect(bucketForDate(at(2026, 2, 10), NOW)).toBe("yesterday");
  });

  test("earlier this week (Sun/Mon) -> thisWeek", () => {
    // Week starts Sunday 2026-03-08.
    expect(bucketForDate(at(2026, 2, 9), NOW)).toBe("thisWeek");
    expect(bucketForDate(at(2026, 2, 8), NOW)).toBe("thisWeek");
  });

  test("previous week -> lastWeek", () => {
    expect(bucketForDate(at(2026, 2, 5), NOW)).toBe("lastWeek");
    expect(bucketForDate(at(2026, 2, 1), NOW)).toBe("lastWeek");
  });

  test("earlier this month but before last week -> thisMonth", () => {
    // Last week started 2026-03-01; nothing this March is before it, so use
    // a case where lastWeekStart is in February.
    const now = new Date(2026, 2, 25, 9);
    // Week starts Sun 2026-03-22, last week Sun 2026-03-15.
    expect(bucketForDate(at(2026, 2, 3), now)).toBe("thisMonth");
  });

  test("last calendar month -> lastMonth", () => {
    expect(bucketForDate(at(2026, 1, 14), NOW)).toBe("lastMonth");
  });

  test("earlier this year -> thisYear", () => {
    expect(bucketForDate(at(2026, 0, 5), NOW)).toBe("thisYear");
  });

  test("previous year and older -> older", () => {
    expect(bucketForDate(at(2025, 11, 31), NOW)).toBe("older");
    expect(bucketForDate(at(2019, 5, 1), NOW)).toBe("older");
  });

  test("unparseable date -> older", () => {
    expect(bucketForDate("not-a-date", NOW)).toBe("older");
  });
});

describe("bucketByRecency", () => {
  test("returns only non-empty buckets, in canonical order, order preserved", () => {
    const items = [
      { id: "b", d: at(2026, 1, 14) }, // lastMonth
      { id: "a", d: at(2026, 2, 11, 2) }, // today
      { id: "c", d: at(2026, 1, 2) }, // lastMonth
      { id: "d", d: at(2020, 0, 1) }, // older
    ];
    const buckets = bucketByRecency(items, (i) => i.d, NOW);
    expect(buckets.map((x) => x.id)).toEqual(["today", "lastMonth", "older"]);
    expect(buckets.find((x) => x.id === "lastMonth")?.items.map((i) => i.id)).toEqual([
      "b",
      "c",
    ]);
  });

  test("empty input -> no buckets", () => {
    expect(bucketByRecency([], () => "", NOW)).toEqual([]);
  });

  test("bucket order matches GALLERY_BUCKET_ORDER", () => {
    const items = GALLERY_BUCKET_ORDER.map((_, index) => ({
      id: String(index),
      d: [
        at(2026, 2, 11, 1),
        at(2026, 2, 10),
        at(2026, 2, 9),
        at(2026, 2, 3),
        // no clean "thisMonth" case with NOW in early March; skip
        at(2026, 1, 20),
        at(2026, 1, 5),
        at(2026, 0, 3),
        at(2024, 0, 1),
      ][index],
    }));
    const buckets = bucketByRecency(items, (i) => i.d, NOW);
    const orderIndex = buckets.map((b) => GALLERY_BUCKET_ORDER.indexOf(b.id));
    expect(orderIndex).toEqual([...orderIndex].sort((x, y) => x - y));
  });
});
