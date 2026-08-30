/**
 * Remembers the board the user most recently opened full-screen — a note board
 * (/boards/:id) or a chalkboard (/chalkboards/:id) — so the dashboard's Active
 * Canvas can re-show it on return.
 *
 * Stored per user id — a shared browser must not leak one account's last
 * board into another's dashboard. Best-effort: quota / private-mode failures
 * are swallowed, and callers fall back to their own default when nothing is
 * saved.
 */

function lastOpenedBoardStorageKey(userId: string): string {
  return `last-opened-board-${userId}`;
}

export function persistLastOpenedBoard(userId: string, boardId: string): void {
  if (!userId || !boardId) return;
  try {
    localStorage.setItem(lastOpenedBoardStorageKey(userId), boardId);
  } catch {
    // ignore quota / private mode
  }
}

export function readLastOpenedBoard(userId: string | null | undefined): string | null {
  if (!userId) return null;
  try {
    return localStorage.getItem(lastOpenedBoardStorageKey(userId));
  } catch {
    return null;
  }
}
