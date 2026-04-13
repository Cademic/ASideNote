import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { User, Calendar, Clock, PencilLine, UserPlus, Users, UserCheck, X, MoreVertical } from "lucide-react";
import {
  getProfile,
  getPublicProfile,
  getPublicProfileByUsername,
  getFriendStatus,
  getFriends,
  getFriendsOfUserByUsername,
  getPendingFriendRequests,
  getPendingSentFriendRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
} from "../api/users";
import { useAuth } from "../context/AuthContext";
import { getAvatarUrl } from "../constants/avatars";
import type {
  UserProfileDto,
  FriendDto,
  FriendRequestDto,
  SentFriendRequestDto,
  UserPublicDto,
} from "../types";
import { formatElapsedSincePreviousSessionEnd } from "../utils/format-last-active";

const STICKY_BG: Record<string, string> = {
  yellow: "bg-amber-100 dark:bg-amber-950/40",
  rose: "bg-rose-100 dark:bg-rose-950/40",
  sky: "bg-sky-100 dark:bg-sky-950/40",
  green: "bg-emerald-100 dark:bg-emerald-950/40",
};

const STICKY_ACCENT: Record<string, string> = {
  yellow: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
  sky: "text-sky-600 dark:text-sky-400",
  green: "text-emerald-600 dark:text-emerald-400",
};

const SECTION_ACCENT: Record<string, string> = {
  amber: "border-l-amber-400 dark:border-l-amber-500",
  violet: "border-l-violet-400 dark:border-l-violet-500",
  sky: "border-l-sky-400 dark:border-l-sky-500",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateTime(dateStr);
}

/** Friend "Last active" line: short relative time, then 1d, 2d, … (no full datetime). */
function formatFriendLastActive(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function PendingSentRequestRow({
  request,
  onCancel,
}: {
  request: SentFriendRequestDto;
  onCancel: () => Promise<void>;
}) {
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    setCancelling(true);
    try {
      await onCancel();
    } finally {
      setCancelling(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-amber-200/60 bg-white/60 px-3 py-2 dark:border-amber-800/40 dark:bg-background/40">
      <Link
        to={`/profile/${encodeURIComponent(request.receiverUsername)}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
          {getAvatarUrl(request.receiverProfilePictureKey) ? (
            <img
              src={getAvatarUrl(request.receiverProfilePictureKey)!}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-medium text-foreground/60">
              {request.receiverUsername.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">
            {request.receiverUsername}
          </span>
          <span className="text-xs text-foreground/50">
            {formatRelative(request.createdAt)}
          </span>
        </div>
      </Link>
      <button
        type="button"
        disabled={cancelling}
        onClick={handleCancel}
        className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:hover:border-red-800/50 disabled:opacity-50"
      >
        {cancelling ? "…" : "Cancel"}
      </button>
    </li>
  );
}

function PendingRequestRow({
  request,
  onAccept,
  onReject,
}: {
  request: FriendRequestDto;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}) {
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  async function handleAccept() {
    setAccepting(true);
    try {
      await onAccept();
    } finally {
      setAccepting(false);
    }
  }

  async function handleReject() {
    setRejecting(true);
    try {
      await onReject();
    } finally {
      setRejecting(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-amber-200/60 bg-white/60 px-3 py-2 dark:border-amber-800/40 dark:bg-background/40">
      <Link
        to={`/profile/${encodeURIComponent(request.requesterUsername)}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
          {getAvatarUrl(request.requesterProfilePictureKey) ? (
            <img
              src={getAvatarUrl(request.requesterProfilePictureKey)!}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-medium text-foreground/60">
              {request.requesterUsername.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">
            {request.requesterUsername}
          </span>
          <span className="text-xs text-foreground/50">
            {formatRelative(request.createdAt)}
          </span>
        </div>
      </Link>
      <div className="flex flex-shrink-0 gap-2">
        <button
          type="button"
          disabled={accepting || rejecting}
          onClick={handleAccept}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {accepting ? "…" : "Accept"}
        </button>
        <button
          type="button"
          disabled={accepting || rejecting}
          onClick={handleReject}
          className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
        >
          {rejecting ? "…" : "Reject"}
        </button>
      </div>
    </li>
  );
}

function FriendCard({
  friend: f,
  onUnadd,
  getAvatarUrl,
  showActions = true,
}: {
  friend: FriendDto;
  onUnadd: () => void;
  getAvatarUrl: (key: string | null) => string | null;
  showActions?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unadding, setUnadding] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [menuOpen]);

  const presence = f.presenceStatus ?? "inactive";

  async function handleUnadd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    setUnadding(true);
    try {
      await removeFriend(f.id);
      onUnadd();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        onUnadd();
      } else {
        throw err;
      }
    } finally {
      setUnadding(false);
    }
  }

  return (
    <li className="group relative">
      <Link
        to={`/profile/${encodeURIComponent(f.username)}`}
        className="flex items-center gap-3 rounded-lg border border-border/40 p-3 transition-colors hover:bg-muted/50"
      >
        <div className="relative h-10 w-10 flex-shrink-0">
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
            {getAvatarUrl(f.profilePictureKey) ? (
              <img
                src={getAvatarUrl(f.profilePictureKey)!}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-foreground/60">
                {f.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {(presence === "active" || presence === "idle") && (
            <span
              className={`pointer-events-none absolute -bottom-1 -right-1 z-10 h-4 w-4 rounded-full border-[3px] border-background shadow-md ring-1 ring-black/10 dark:ring-white/20 ${
                presence === "active" ? "bg-emerald-500" : "bg-amber-500"
              }`}
              title={presence === "active" ? "Active" : "Idle"}
              aria-hidden
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {f.username}
          </span>
          <span className="block truncate text-xs text-foreground/50">
            {presence === "active"
              ? "Active"
              : presence === "idle"
                ? "Idle"
                : f.lastActivityAt
                  ? `Last active ${formatFriendLastActive(f.lastActivityAt)}`
                  : f.lastLoginAt
                    ? `Last active ${formatFriendLastActive(f.lastLoginAt)}`
                    : "Never logged in"}
          </span>
        </div>
      </Link>
      {showActions && (
        <div
          ref={menuRef}
          className="absolute right-2 top-2 z-10"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="rounded-lg p-1 text-foreground/40 opacity-0 transition-[colors,opacity] duration-150 hover:bg-foreground/10 hover:text-foreground/60 group-hover:opacity-100 motion-reduce:transition-none"
            title="Friend options"
            aria-label="Friend options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-border bg-background py-1 shadow-lg">
              <Link
                to={`/profile/${encodeURIComponent(f.username)}`}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-foreground/80 transition-colors hover:bg-muted/50"
                onClick={() => setMenuOpen(false)}
              >
                <User className="h-3.5 w-3.5" />
                View Profile
              </Link>
              <button
                type="button"
                disabled={unadding}
                onClick={handleUnadd}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                {unadding ? "…" : "Unadd"}
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function StatSticky({
  color,
  icon: Icon,
  label,
  value,
  rotation,
}: {
  color: "yellow" | "rose" | "sky" | "green";
  icon: typeof User;
  label: string;
  value: string;
  rotation: number;
}) {
  return (
    <div
      className={`stat-sticky flex flex-col items-center justify-center px-4 py-5 ${STICKY_BG[color]}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <Icon className={`mb-1.5 h-4 w-4 ${STICKY_ACCENT[color]}`} />
      <span className={`text-lg font-bold leading-tight ${STICKY_ACCENT[color]}`}>{value}</span>
      <span className="mt-1 text-[11px] font-medium text-foreground/45">{label}</span>
    </div>
  );
}

function AddFriendDialog({
  isOpen,
  onClose,
  onSent,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserPublicDto[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const doSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearchError(null);
    setIsSearching(true);
    try {
      const list = await searchUsers(query.trim(), 15);
      setResults(list);
    } catch {
      setSearchError("Search failed.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(doSearch, 300);
    return () => clearTimeout(t);
  }, [isOpen, query, doSearch]);

  async function handleSendRequest(userId: string) {
    setSendingId(userId);
    try {
      await sendFriendRequest({ receiverId: userId });
      onSent();
      setResults((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      setSearchError("Could not send request.");
    } finally {
      setSendingId(null);
    }
  }

  function handleClose() {
    setQuery("");
    setResults([]);
    setSearchError(null);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        onKeyDown={() => {}}
        role="presentation"
      />
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-foreground/50 hover:bg-background hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-foreground/60" />
          <h2 className="text-lg font-semibold text-foreground">Add friend</h2>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or email..."
          className="mb-4 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40"
        />
        {searchError && (
          <p className="mb-2 text-sm text-red-500">{searchError}</p>
        )}
        <div className="max-h-64 overflow-y-auto rounded-lg border border-border/60 bg-background/50">
          {isSearching && query.trim() ? (
            <div className="p-4 text-center text-sm text-foreground/50">Searching…</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-foreground/50">
              {query.trim() ? "No users found." : "Type a username or email to search."}
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {results.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                      {getAvatarUrl(u.profilePictureKey) ? (
                        <img
                          src={getAvatarUrl(u.profilePictureKey)!}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-foreground/60">
                          {u.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="truncate text-sm font-medium text-foreground">
                      {u.username}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={sendingId === u.id}
                    onClick={() => handleSendRequest(u.id)}
                    className="flex-shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {sendingId === u.id ? "Sending…" : "Add friend"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { username: routeUsername } = useParams<{ username?: string }>();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [publicProfile, setPublicProfile] = useState<UserPublicDto | null>(null);
  const [friendStatus, setFriendStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [friends, setFriends] = useState<FriendDto[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequestDto[]>([]);
  const [pendingSentRequests, setPendingSentRequests] = useState<SentFriendRequestDto[]>([]);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [addFriendLoading, setAddFriendLoading] = useState(false);
  const [pendingRequestIdFromThem, setPendingRequestIdFromThem] = useState<string | null>(null);
  const [otherUserFriends, setOtherUserFriends] = useState<FriendDto[]>([]);
  /** Bumps on an interval and when the tab becomes visible so elapsed time matches the dashboard. */
  const [lastActiveTick, setLastActiveTick] = useState(0);

  const isOwnProfile = !routeUsername || (routeUsername && authUser?.username && routeUsername.toLowerCase() === authUser.username.toLowerCase());

  const loadFriendsAndRequests = useCallback(async () => {
    try {
      const [friendsList, requests, sentRequests] = await Promise.all([
        getFriends(),
        getPendingFriendRequests(),
        getPendingSentFriendRequests(),
      ]);
      setFriends(friendsList);
      setPendingRequests(requests);
      setPendingSentRequests(sentRequests);
    } catch {
      // Keep previous state on error
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (isOwnProfile) {
      getProfile()
        .then((data) => {
          if (!cancelled) setProfile(data);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load profile.");
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      setPublicProfile(null);
      setFriendStatus(null);
    } else if (routeUsername) {
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeUsername);
      const fetchProfile = isGuid
        ? getPublicProfile(routeUsername)
        : getPublicProfileByUsername(routeUsername);
      Promise.all([
        fetchProfile,
        getPendingFriendRequests(),
      ])
        .then(async ([pub, requests]) => {
          if (!pub || cancelled) return;
          if (isGuid && pub.username) {
            navigate(`/profile/${encodeURIComponent(pub.username)}`, { replace: true });
            return;
          }
          const [status] = await Promise.all([getFriendStatus(pub.id)]);
          if (cancelled) return;
          setPublicProfile(pub);
          setFriendStatus(status?.status ?? null);
          const fromThem = requests.find((r) => r.requesterId === pub.id);
          setPendingRequestIdFromThem(fromThem?.id ?? null);
        })
        .catch(() => {
          if (!cancelled) setError("User not found.");
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      setProfile(null);
    }
    return () => {
      cancelled = true;
    };
  }, [isOwnProfile, routeUsername, navigate]);

  useEffect(() => {
    if (!profile && !publicProfile) return;
    if (isOwnProfile && profile) loadFriendsAndRequests();
  }, [isOwnProfile, profile, publicProfile, loadFriendsAndRequests]);

  useEffect(() => {
    if (!routeUsername || !publicProfile || profile) return;
    setOtherUserFriends([]);
    let cancelled = false;
    getFriendsOfUserByUsername(routeUsername)
      .then((list) => {
        if (!cancelled) setOtherUserFriends(list);
      })
      .catch(() => {
        if (!cancelled) setOtherUserFriends([]);
      });
    return () => {
      cancelled = true;
    };
  }, [routeUsername, publicProfile, profile]);

  useEffect(() => {
    const id = window.setInterval(() => setLastActiveTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      setLastActiveTick((t) => t + 1);
      if (isOwnProfile) {
        void getProfile().then(setProfile).catch(() => {});
      } else if (routeUsername) {
        const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeUsername);
        const fetchProfile = isGuid
          ? getPublicProfile(routeUsername)
          : getPublicProfileByUsername(routeUsername);
        void fetchProfile
          .then((pub) => {
            if (pub) setPublicProfile(pub);
          })
          .catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isOwnProfile, routeUsername]);

  const lastSessionEndIso = profile?.lastSessionEndAt ?? publicProfile?.lastSessionEndAt ?? null;
  const lastActiveDisplay = useMemo(() => {
    void lastActiveTick;
    if (!lastSessionEndIso) return "—";
    return formatElapsedSincePreviousSessionEnd(lastSessionEndIso);
  }, [lastSessionEndIso, lastActiveTick]);

  function handleEditProfile() {
    navigate("/settings#profile");
  }

  // Redirect /profile to /profile/:username for consistent URLs
  if (!routeUsername && authUser?.username) {
    return (
      <Navigate to={`/profile/${encodeURIComponent(authUser.username)}`} replace />
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-foreground/50">Loading profile…</div>
      </div>
    );
  }

  if (error && !profile && !publicProfile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-sm text-red-500">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to profile
          </button>
        </div>
      </div>
    );
  }

  const isOtherUser = !!publicProfile && !profile;
  const displayProfile = profile ?? (publicProfile ? { id: publicProfile.id, username: publicProfile.username, profilePictureKey: publicProfile.profilePictureKey, bio: publicProfile.bio } : null);
  if (!displayProfile) return null;

  const avatarUrl = getAvatarUrl(displayProfile.profilePictureKey);
  const displayName = displayProfile.username || "User";
  const initial = displayName.charAt(0).toUpperCase();
  const bio = "bio" in displayProfile ? displayProfile.bio : (displayProfile as UserPublicDto).bio;

  async function handleAddFriend() {
    if (!publicProfile) return;
    setAddFriendLoading(true);
    try {
      await sendFriendRequest({ receiverId: publicProfile.id });
      setFriendStatus("PendingSent");
    } catch {
      // Keep state
    } finally {
      setAddFriendLoading(false);
    }
  }

  async function handleAcceptFromThem() {
    if (!pendingRequestIdFromThem) return;
    setAddFriendLoading(true);
    try {
      await acceptFriendRequest(pendingRequestIdFromThem);
      setFriendStatus("Friends");
      setPendingRequestIdFromThem(null);
    } finally {
      setAddFriendLoading(false);
    }
  }

  async function handleRejectFromThem() {
    if (!pendingRequestIdFromThem) return;
    setAddFriendLoading(true);
    try {
      await rejectFriendRequest(pendingRequestIdFromThem);
      setFriendStatus("None");
      setPendingRequestIdFromThem(null);
    } finally {
      setAddFriendLoading(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* ── Profile header (notepad card) ───────────────── */}
        <div className="notepad-card mb-8">
          <div className="notepad-spiral-strip" />
          <div className="notepad-body relative px-8 py-6 sm:px-12">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-amber-200 bg-amber-100 dark:border-amber-800 dark:bg-amber-900/40">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                      {initial}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                  {bio && (
                    <p className="notepad-ruled-line mt-2 max-w-md pb-1.5 text-sm text-foreground/70">
                      {bio}
                    </p>
                  )}
                  {!bio && (
                    <p className="notepad-ruled-line mt-2 max-w-md pb-1.5 text-sm text-foreground/50">
                      No bio yet.
                    </p>
                  )}
                </div>
              </div>
              {!isOtherUser ? (
                <button
                  type="button"
                  onClick={handleEditProfile}
                  className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:bg-amber-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
                >
                  <PencilLine className="h-4 w-4" />
                  <span>Edit profile</span>
                </button>
              ) : (
                <div className="flex flex-shrink-0 items-center gap-2">
                  {friendStatus === "None" && (
                    <button
                      type="button"
                      disabled={addFriendLoading}
                      onClick={handleAddFriend}
                      className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <UserPlus className="h-4 w-4" />
                      {addFriendLoading ? "Sending…" : "Add friend"}
                    </button>
                  )}
                  {friendStatus === "PendingSent" && (
                    <span className="rounded-lg border border-border bg-muted px-5 py-2.5 text-sm font-medium text-foreground/70">
                      Request sent
                    </span>
                  )}
                  {friendStatus === "Friends" && (
                    <span className="flex items-center gap-2 rounded-lg bg-emerald-100 px-5 py-2.5 text-sm font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                      <UserCheck className="h-4 w-4" />
                      Friends
                    </span>
                  )}
                  {friendStatus === "PendingReceived" && pendingRequestIdFromThem && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={addFriendLoading}
                        onClick={handleAcceptFromThem}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={addFriendLoading}
                        onClick={handleRejectFromThem}
                        className="rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick stats (sticky notes) - own profile or viewing another user ────────────────────────────────── */}
        {(profile || (isOtherUser && publicProfile)) && (
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatSticky
            color="yellow"
            icon={User}
            label="Member since"
            value={profile ? formatDate(profile.createdAt) : (publicProfile?.createdAt ? formatDate(publicProfile.createdAt) : "—")}
            rotation={-2}
          />
          <StatSticky
            color="rose"
            icon={Clock}
            label="Last Active"
            value={lastActiveDisplay}
            rotation={1.5}
          />
          <StatSticky
            color="sky"
            icon={Users}
            label="Friends"
            value={profile ? String(friends.length) : String(publicProfile?.friendCount ?? 0)}
            rotation={-1}
          />
          <StatSticky
            color="green"
            icon={Calendar}
            label="Role"
            value={profile ? profile.role : (publicProfile?.role ?? "—")}
            rotation={2}
          />
        </div>
        )}

        {/* ── Other user's friends (read-only) ───────────────────────────────────── */}
        {isOtherUser && publicProfile && (
        <section className="mb-10">
          <div
            className={`mb-4 flex items-center gap-2.5 border-l-[3px] pl-3 ${SECTION_ACCENT.sky}`}
          >
            <Users className="h-5 w-5 text-foreground/50" />
            <h2 className="text-base font-semibold text-foreground">Friends</h2>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/50 p-4">
            {otherUserFriends.length === 0 ? (
              <p className="text-center text-sm text-foreground/50">
                No friends yet.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[...otherUserFriends]
                  .sort((a, b) => {
                    const order = (s: string | undefined) =>
                      s === "active" ? 0 : s === "idle" ? 1 : 2;
                    const ao = order(a.presenceStatus ?? "inactive");
                    const bo = order(b.presenceStatus ?? "inactive");
                    if (ao !== bo) return ao - bo;
                    const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
                    const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
                    return bTime - aTime;
                  })
                  .map((f) => (
                    <FriendCard
                      key={f.id}
                      friend={f}
                      onUnadd={() => {}}
                      getAvatarUrl={getAvatarUrl}
                      showActions={false}
                    />
                  ))}
              </ul>
            )}
          </div>
        </section>
        )}

        {!isOtherUser && profile && (
        <>
        {/* ── About section ──────────────────────────────── */}
        <section className="mb-10">
          <div
            className={`mb-4 flex items-center gap-2.5 border-l-[3px] pl-3 ${SECTION_ACCENT.violet}`}
          >
            <User className="h-5 w-5 text-foreground/50" />
            <h2 className="text-base font-semibold text-foreground">About</h2>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/50 p-6">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-foreground/40">
                  Username
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">{profile.username}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-foreground/40">
                  Email
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-foreground/40">
                  Role
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">{profile.role}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-foreground/40">
                  Account created
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {formatDate(profile.createdAt)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ── Friends ───────────────────────────────────── */}
        <section className="mb-10">
          <div
            className={`mb-4 flex items-center justify-between gap-4 border-l-[3px] pl-3 ${SECTION_ACCENT.sky}`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="h-5 w-5 text-foreground/50" />
              <h2 className="text-base font-semibold text-foreground">Friends</h2>
            </div>
            <button
              type="button"
              onClick={() => setAddFriendOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <UserPlus className="h-4 w-4" />
              Add friend
            </button>
          </div>

          {pendingRequests.length > 0 && (
            <div className="mb-4 rounded-xl border-2 border-amber-300/60 bg-amber-50/80 p-4 dark:border-amber-600/50 dark:bg-amber-950/30">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <UserCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Friend requests
              </h3>
              <ul className="space-y-2">
                {pendingRequests.map((req) => (
                  <PendingRequestRow
                    key={req.id}
                    request={req}
                    onAccept={async () => {
                      await acceptFriendRequest(req.id);
                      await loadFriendsAndRequests();
                    }}
                    onReject={async () => {
                      await rejectFriendRequest(req.id);
                      await loadFriendsAndRequests();
                    }}
                  />
                ))}
              </ul>
            </div>
          )}

          {pendingSentRequests.length > 0 && (
            <div className="mb-4 rounded-xl border-2 border-amber-300/60 bg-amber-50/80 p-4 dark:border-amber-600/50 dark:bg-amber-950/30">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <UserPlus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Pending sent
              </h3>
              <ul className="space-y-2">
                {pendingSentRequests.map((req) => (
                  <PendingSentRequestRow
                    key={req.id}
                    request={req}
                    onCancel={async () => {
                      await cancelFriendRequest(req.id);
                      await loadFriendsAndRequests();
                    }}
                  />
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-background/50 p-4">
            {friends.length === 0 ? (
              <p className="text-center text-sm text-foreground/50">
                No friends yet. Use &quot;Add friend&quot; to search by username or email.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[...friends]
                  .sort((a, b) => {
                    const order = (s: string | undefined) =>
                      s === "active" ? 0 : s === "idle" ? 1 : 2;
                    const ao = order(a.presenceStatus ?? "inactive");
                    const bo = order(b.presenceStatus ?? "inactive");
                    if (ao !== bo) return ao - bo;
                    const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
                    const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
                    return bTime - aTime;
                  })
                  .map((f) => (
                    <FriendCard
                      key={f.id}
                      friend={f}
                      onUnadd={() => loadFriendsAndRequests()}
                      getAvatarUrl={getAvatarUrl}
                    />
                  ))}
              </ul>
            )}
          </div>
        </section>
        </>
        )}
      </div>

      {!isOtherUser && (
        <AddFriendDialog
          isOpen={addFriendOpen}
          onClose={() => setAddFriendOpen(false)}
          onSent={() => {
            loadFriendsAndRequests();
          }}
        />
      )}
    </div>
  );
}
