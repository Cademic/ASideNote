import { useEffect, useRef, useState } from "react";
import { User, UserPlus, UserMinus, Clock, Crown, Pencil, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { getColorForUserId } from "../../lib/presenceColors";
import { getFriendStatus, sendFriendRequest, removeFriend } from "../../api/users";
import type { BoardPresenceUser } from "../../hooks/useBoardRealtime";
import type { FriendStatusDto } from "../../types";

interface BoardPresenceButtonProps {
  users: BoardPresenceUser[];
  /** Only render when the board is actually backed by the realtime hub (a server others can join). */
  isHubConnected: boolean;
  currentUserId: string | undefined;
}

/** Grace period before closing on mouseleave, so the cursor has time to cross the gap onto the popup. */
const CLOSE_DELAY_MS = 300;

/** Small floating icon in the bottom-right corner of a board; hover/click reveals who's connected. */
export function BoardPresenceButton({ users, isHubConnected, currentUserId }: BoardPresenceButtonProps) {
  const [open, setOpen] = useState(false);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, FriendStatusDto["status"]>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelScheduledClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };
  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimeoutRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  useEffect(() => cancelScheduledClose, []);

  const others = users.filter((u) => u.userId !== currentUserId);

  useEffect(() => {
    if (!open || others.length === 0) return;
    let cancelled = false;
    others.forEach((u) => {
      if (friendStatuses[u.userId] !== undefined) return;
      getFriendStatus(u.userId)
        .then((res) => {
          if (!cancelled) setFriendStatuses((prev) => ({ ...prev, [u.userId]: res.status }));
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, users]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        cancelScheduledClose();
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!isHubConnected || users.length === 0) return null;

  async function handleAddFriend(userId: string) {
    setFriendStatuses((prev) => ({ ...prev, [userId]: "PendingSent" }));
    try {
      await sendFriendRequest({ receiverId: userId });
    } catch {
      setFriendStatuses((prev) => ({ ...prev, [userId]: "None" }));
    }
  }

  async function handleRemoveFriend(userId: string) {
    setFriendStatuses((prev) => ({ ...prev, [userId]: "None" }));
    try {
      await removeFriend(userId);
    } catch {
      setFriendStatuses((prev) => ({ ...prev, [userId]: "Friends" }));
    }
  }

  return (
    <div
      ref={containerRef}
      className="group absolute bottom-3 right-3 z-30"
      onMouseEnter={() => {
        cancelScheduledClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => {
          cancelScheduledClose();
          setOpen((o) => !o);
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground/70 shadow-md backdrop-blur transition-colors hover:bg-amber-100/60 dark:hover:bg-amber-900/30"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${users.length} user${users.length === 1 ? "" : "s"} connected to this board`}
        title={`${users.length} connected`}
      >
        <User className="h-4.5 w-4.5" aria-hidden />
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold leading-none text-white">
          {users.length}
        </span>
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 mb-2 w-64 max-w-[80vw] overflow-hidden rounded-lg border border-border bg-background py-1 shadow-xl"
          role="menu"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
            Connected ({users.length})
          </div>
          <div className="max-h-64 overflow-y-auto scrollbar-thin">
            {users.map((u) => {
              const isSelf = u.userId === currentUserId;
              const status = friendStatuses[u.userId];
              return (
                <div key={u.userId} className="flex items-center gap-2 px-3 py-1.5" role="menuitem">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: getColorForUserId(u.userId) }}
                    aria-hidden
                  />
                  <Link
                    to={`/profile/${encodeURIComponent(u.displayName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-sm text-foreground/90 hover:underline"
                    title={`View ${u.displayName}'s profile`}
                  >
                    {u.displayName}
                    {isSelf ? " (you)" : ""}
                  </Link>
                  <RoleBadge role={u.role} />
                  {!isSelf && (
                    <FriendAction status={status} onAdd={() => handleAddFriend(u.userId)} onRemove={() => handleRemoveFriend(u.userId)} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const ROLE_META = {
  Owner: { icon: Crown, label: "Owner", title: "Owns this board" },
  Editor: { icon: Pencil, label: "Editor", title: "Can edit this board" },
  Viewer: { icon: Eye, label: "Viewer", title: "Can view this board" },
} as const;

function RoleBadge({ role }: { role: BoardPresenceUser["role"] }) {
  const { icon: Icon, label, title } = ROLE_META[role ?? "Viewer"];
  return (
    <span
      className="flex shrink-0 items-center gap-1 rounded-full bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium text-foreground/60"
      title={title}
    >
      <Icon className="h-2.5 w-2.5" aria-hidden />
      {label}
    </span>
  );
}

function FriendAction({
  status,
  onAdd,
  onRemove,
}: {
  status: FriendStatusDto["status"] | undefined;
  onAdd: () => void;
  onRemove: () => void;
}) {
  if (status === undefined) return <span className="h-5 w-5 shrink-0" aria-hidden />;

  if (status === "Friends") {
    return (
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-foreground/50 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
        title="Remove friend"
        aria-label="Remove friend"
      >
        <UserMinus className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (status === "None") {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="shrink-0 rounded p-1 text-foreground/50 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30"
        title="Add friend"
        aria-label="Add friend"
      >
        <UserPlus className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (status === "PendingSent") {
    return (
      <span className="shrink-0 p-1 text-foreground/30" title="Friend request sent">
        <Clock className="h-3.5 w-3.5" />
      </span>
    );
  }

  // PendingReceived / Self: no action here — manage from the profile page.
  return null;
}
