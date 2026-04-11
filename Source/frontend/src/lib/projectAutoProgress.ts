/**
 * Linear progress (0–100) by calendar day between start and end (ISO date strings, UTC).
 * Matches backend ProjectAutoProgress.ComputePercent.
 */
export function computeProjectAutoProgressPercent(
  startIso: string,
  endIso: string,
  now: Date = new Date(),
): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const startDay = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  if (today < startDay) return 0;
  if (today >= endDay) return 100;

  const totalMs = endDay - startDay;
  if (totalMs <= 0) return 100;

  const elapsed = today - startDay;
  return Math.round(Math.min(100, Math.max(0, (elapsed / totalMs) * 100)));
}
