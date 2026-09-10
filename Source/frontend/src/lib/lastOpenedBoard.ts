/**
 * Remembers the board the user most recently opened full-screen — a note board
 * (/boards/:id) or a chalkboard (/chalkboards/:id).
 *
 * Stored per user id — a shared browser must not leak one account's last
 * board into another's. Best-effort: quota / private-mode failures are
 * swallowed.
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
