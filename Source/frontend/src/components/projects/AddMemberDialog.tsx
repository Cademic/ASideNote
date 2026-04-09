import { useEffect, useState } from "react";
import { X, UserPlus, Users } from "lucide-react";
import { addMember } from "../../api/projects";
import { getFriends } from "../../api/users";
import { getAvatarUrl } from "../../constants/avatars";
import type { FriendDto } from "../../types";

interface AddMemberDialogProps {
  isOpen: boolean;
  projectId: string;
  memberUserIds: string[];
  onClose: () => void;
  onAdded: () => void;
}

type Tab = "email" | "friends";

export function AddMemberDialog({
  isOpen,
  projectId,
  memberUserIds,
  onClose,
  onAdded,
}: AddMemberDialogProps) {
  const [tab, setTab] = useState<Tab>("email");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Viewer");
  const [friends, setFriends] = useState<FriendDto[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || tab !== "friends") return;
    setFriendsLoading(true);
    getFriends()
      .then(setFriends)
      .catch(() => setFriends([]))
      .finally(() => setFriendsLoading(false));
  }, [isOpen, tab]);

  async function handleSubmitByEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await addMember(projectId, { email: email.trim(), role });
      setEmail("");
      setRole("Viewer");
      onAdded();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to add member. Check the email and try again.";
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message ?? message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddFriend(friend: FriendDto) {
    setError(null);
    setAddingUserId(friend.id);
    try {
      await addMember(projectId, { userId: friend.id, role });
      onAdded();
      setFriends((prev) => prev.filter((f) => f.id !== friend.id));
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to add member.";
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message ?? message);
    } finally {
      setAddingUserId(null);
    }
  }

  function handleClose() {
    setTab("email");
    setEmail("");
    setRole("Viewer");
    setError(null);
    setAddingUserId(null);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-overlay-enter motion-reduce:animate-none"
        onClick={handleClose}
        onKeyDown={() => {}}
        role="presentation"
      />

      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-dialog-enter motion-reduce:animate-none">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-foreground/50 transition-colors hover:bg-background hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-foreground/60" />
          <h2 className="text-lg font-semibold text-foreground">
            Add Team Member
          </h2>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 border-b border-border/60 pb-2">
          <button
            type="button"
            onClick={() => { setTab("email"); setError(null); }}
            className={[
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "email"
                ? "bg-primary/10 text-primary"
                : "text-foreground/60 hover:bg-muted hover:text-foreground",
            ].join(" ")}
          >
            By email
          </button>
          <button
            type="button"
            onClick={() => { setTab("friends"); setError(null); }}
            className={[
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "friends"
                ? "bg-primary/10 text-primary"
                : "text-foreground/60 hover:bg-muted hover:text-foreground",
            ].join(" ")}
          >
            <Users className="h-4 w-4" />
            From friends
          </button>
        </div>

        {tab === "email" && (
          <form onSubmit={handleSubmitByEmail} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="member-email"
                className="mb-1.5 block text-xs font-medium text-foreground/60"
              >
                Email Address
              </label>
              <input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                autoFocus
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 text-[10px] text-foreground/40">
                The user must already have a ASideNote account.
              </p>
            </div>

            <RolePicker role={role} setRole={setRole} />

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/60 transition-colors hover:bg-background hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!email.trim() || isSubmitting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Adding..." : "Add Member"}
              </button>
            </div>
          </form>
        )}

        {tab === "friends" && (
          <div className="flex flex-col gap-4">
            <RolePicker role={role} setRole={setRole} />
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border/60 bg-background/50">
              {friendsLoading ? (
                <div className="p-4 text-center text-sm text-foreground/50">
                  Loading friends…
                </div>
              ) : friends.length === 0 ? (
                <div className="p-4 text-center text-sm text-foreground/50">
                  No friends yet. Add friends from your profile, or use the email tab.
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {friends.map((f) => {
                    const isAdded = memberUserIds.includes(f.id);
                    return (
                      <li
                        key={f.id}
                        className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
                          isAdded ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                            {getAvatarUrl(f.profilePictureKey) ? (
                              <img
                                src={getAvatarUrl(f.profilePictureKey)!}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-medium text-foreground/60">
                                {f.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="truncate text-sm font-medium text-foreground">
                            {f.username}
                          </span>
                        </div>
                        {isAdded ? (
                          <span className="flex-shrink-0 rounded-lg bg-foreground/10 px-3 py-1.5 text-xs font-medium text-foreground/50">
                            ADDED
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={addingUserId === f.id}
                            onClick={() => handleAddFriend(f)}
                            className="flex-shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                          >
                            {addingUserId === f.id ? "Adding…" : "Add"}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/60 transition-colors hover:bg-background hover:text-foreground"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RolePicker({
  role,
  setRole,
}: {
  role: string;
  setRole: (r: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-foreground/60">
        Permission Level
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setRole("Viewer")}
          className={[
            "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors duration-150 motion-reduce:transition-none",
            role === "Viewer"
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-foreground/60 hover:border-foreground/30",
          ].join(" ")}
        >
          <span className="font-medium">Viewer</span>
          <span className="text-[10px] text-foreground/40">
            Can view boards
          </span>
        </button>
        <button
          type="button"
          onClick={() => setRole("Editor")}
          className={[
            "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors duration-150 motion-reduce:transition-none",
            role === "Editor"
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-foreground/60 hover:border-foreground/30",
          ].join(" ")}
        >
          <span className="font-medium">Editor</span>
          <span className="text-[10px] text-foreground/40">
            Can edit boards
          </span>
        </button>
      </div>
    </div>
  );
}
