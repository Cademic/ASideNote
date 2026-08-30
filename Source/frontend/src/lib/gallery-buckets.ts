/**
 * Recency buckets for the Gallery details view — a File-Explorer-style grouping
 * of items by how recently they were touched (`updatedAt`). Pure + unit-tested.
 */
export type GalleryBucketId =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "older";

export const GALLERY_BUCKET_ORDER: GalleryBucketId[] = [
  "today",
  "yesterday",
  "thisWeek",
  "lastWeek",
  "thisMonth",
  "lastMonth",
  "thisYear",
  "older",
];

export const GALLERY_BUCKET_LABELS: Record<GalleryBucketId, string> = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "This Week",
  lastWeek: "Last Week",
  thisMonth: "This Month",
  lastMonth: "Last Month",
  thisYear: "This Year",
  older: "A Year Ago",
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Which recency bucket a timestamp falls into, relative to `now` (local time). */
export function bucketForDate(iso: string, now: Date = new Date()): GalleryBucketId {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "older";
  const when = new Date(parsed);

  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  // Week starts Sunday (matches Windows Explorer's locale-default grouping).
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - todayStart.getDay());
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  if (when >= todayStart) return "today";
  if (when >= yesterdayStart) return "yesterday";
  if (when >= weekStart) return "thisWeek";
  if (when >= lastWeekStart) return "lastWeek";
  if (when >= monthStart) return "thisMonth";
  if (when >= lastMonthStart) return "lastMonth";
  if (when >= yearStart) return "thisYear";
  return "older";
}

export interface GalleryBucket<T> {
  id: GalleryBucketId;
  label: string;
  items: T[];
}

/**
 * Partition items into non-empty recency buckets in `GALLERY_BUCKET_ORDER`,
 * preserving the incoming order within each bucket (so the caller's sort holds).
 */
export function bucketByRecency<T>(
  items: T[],
  getDate: (item: T) => string,
  now: Date = new Date(),
): Array<GalleryBucket<T>> {
  const byBucket = new Map<GalleryBucketId, T[]>();
  for (const item of items) {
    const id = bucketForDate(getDate(item), now);
    const list = byBucket.get(id) ?? [];
    list.push(item);
    byBucket.set(id, list);
  }
  return GALLERY_BUCKET_ORDER.filter((id) => byBucket.get(id)?.length).map(
    (id) => ({
      id,
      label: GALLERY_BUCKET_LABELS[id],
      items: byBucket.get(id) ?? [],
    }),
  );
}
