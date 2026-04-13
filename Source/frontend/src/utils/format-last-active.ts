/**
 * Time from when the previous session ended (server UTC) to the current moment.
 * Recomputed whenever a tick changes (interval + visibility) so the display stays current.
 */
export function formatElapsedSincePreviousSessionEnd(sessionEndedAtIso: string): string {
  const endedAt = new Date(sessionEndedAtIso);
  const now = new Date();
  const diffMs = now.getTime() - endedAt.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMs < 0) return "Just now";
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return endedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
