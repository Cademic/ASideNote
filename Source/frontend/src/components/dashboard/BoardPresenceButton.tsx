import { AvatarGroup } from "../ui/AvatarGroup";
import type { BoardPresenceUser } from "../../hooks/useBoardRealtime";

interface BoardPresenceButtonProps {
  users: BoardPresenceUser[];
  /** Only render when the board is actually backed by the realtime hub (a server others can join). */
  isHubConnected: boolean;
  currentUserId: string | undefined;
}

/** Stacked avatars in the bottom-right corner of a board; hovering/focusing an avatar reveals who's connected. */
export function BoardPresenceButton({ users, isHubConnected, currentUserId }: BoardPresenceButtonProps) {
  if (!isHubConnected || users.length === 0) return null;

  return (
    <div className="absolute bottom-3 right-3 z-30">
      <AvatarGroup
        users={users.map((u) => ({
          userId: u.userId,
          displayName: u.userId === currentUserId ? `${u.displayName} (you)` : u.displayName,
          profilePictureKey: u.profilePictureKey,
        }))}
        getProfileHref={(userId) => {
          const u = users.find((x) => x.userId === userId);
          return `/profile/${encodeURIComponent(u?.displayName ?? "")}`;
        }}
      />
    </div>
  );
}
