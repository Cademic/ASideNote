import { useRef, useState } from "react";
import { useNudgeDropdownToViewport } from "../../lib/useDropdownViewport";
import {
  Crown,
  Eye,
  Pencil,
  UserMinus,
  ChevronDown,
} from "lucide-react";
import { updateMemberRole, removeMember } from "../../api/projects";
import { useAuth } from "../../context/AuthContext";
import type { ProjectMemberDto } from "../../types";

interface MemberListProps {
  projectId: string;
  ownerId: string;
  ownerUsername: string;
  members: ProjectMemberDto[];
  isOwner: boolean;
  onChanged: () => void;
}

const ROLE_CONFIG: Record<
  string,
  { icon: typeof Crown; label: string; className: string; bg: string }
> = {
  Owner: {
    icon: Crown,
    label: "Owner",
    className: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  Editor: {
    icon: Pencil,
    label: "Editor",
    className: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-100 dark:bg-sky-900/30",
  },
  Viewer: {
    icon: Eye,
    label: "Viewer",
    className: "text-foreground/50",
    bg: "bg-foreground/5",
  },
};

export function MemberList({
  projectId,
  ownerId,
  ownerUsername,
  members,
  isOwner,
  onChanged,
}: MemberListProps) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-1">
      {/* Owner row -- always first */}
      <OwnerRow ownerId={ownerId} ownerUsername={ownerUsername} currentUserId={user?.userId} />

      {/* Member rows */}
      {members.map((member) => (
        <MemberRow
          key={member.userId}
          projectId={projectId}
          member={member}
          isOwner={isOwner}
          isCurrentUser={member.userId === user?.userId}
          onChanged={onChanged}
        />
      ))}

      {members.length === 0 && (
        <p className="py-6 text-center text-sm text-foreground/40">
          No members added yet. Only the owner has access.
        </p>
      )}
    </div>
  );
}

/* ─── Owner Row ─────────────────────────────────────────────── */

interface OwnerRowProps {
  ownerId: string;
  ownerUsername: string;
  currentUserId?: string;
}

function OwnerRow({ ownerId, ownerUsername, currentUserId }: OwnerRowProps) {
  const isYou = ownerId === currentUserId;
  const config = ROLE_CONFIG.Owner;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-foreground/[0.02]">
      {/* Avatar */}
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${config.bg}`}
      >
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
          {ownerUsername.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {ownerUsername}
          </span>
          {isYou && (
            <span className="rounded-full bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium text-foreground/40">
              You
            </span>
          )}
        </div>
      </div>

      {/* Role badge */}
      <span
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${config.bg} ${config.className}`}
      >
        <Icon className="h-3 w-3" />
        Owner
      </span>
    </div>
  );
}

/* ─── Member Row ────────────────────────────────────────────── */

interface MemberRowProps {
  projectId: string;
  member: ProjectMemberDto;
  isOwner: boolean;
  isCurrentUser: boolean;
  onChanged: () => void;
}

function MemberRow({
  projectId,
  member,
  isOwner,
  isCurrentUser,
  onChanged,
}: MemberRowProps) {
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const roleMenuPanelRef = useRef<HTMLDivElement>(null);

  useNudgeDropdownToViewport(isRoleOpen, roleMenuPanelRef);

  const config = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.Viewer;
  const Icon = config.icon;

  async function handleRoleChange(newRole: string) {
    setIsRoleOpen(false);
    try {
      await updateMemberRole(projectId, member.userId, { role: newRole });
      onChanged();
    } catch {
      // Silently fail
    }
  }

  async function handleRemove() {
    setIsRemoving(true);
    try {
      await removeMember(projectId, member.userId);
      onChanged();
    } catch {
      setIsRemoving(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-foreground/[0.02]">
      {/* Avatar */}
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-foreground/5">
        <span className="text-xs font-semibold text-foreground/50">
          {member.username.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {member.username}
          </span>
          {isCurrentUser && (
            <span className="rounded-full bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium text-foreground/40">
              You
            </span>
          )}
        </div>
        <span className="truncate text-xs text-foreground/40">
          {member.email}
        </span>
      </div>

      {/* Role dropdown / badge */}
      {isOwner && !isCurrentUser ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsRoleOpen(!isRoleOpen)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-opacity duration-150 ${config.bg} ${config.className} hover:opacity-80 motion-reduce:transition-none`}
          >
            <Icon className="h-3 w-3" />
            {member.role}
            <ChevronDown className="h-3 w-3" />
          </button>

          {isRoleOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsRoleOpen(false)}
                onKeyDown={() => {}}
                role="presentation"
              />
              <div
                ref={roleMenuPanelRef}
                className="absolute right-0 top-full z-50 mt-1 max-h-[min(70vh,calc(100vh-2rem))] w-32 max-w-[min(8rem,calc(100vw-1rem))] overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg"
              >
                {(["Editor", "Viewer"] as const).map((role) => {
                  const rc = ROLE_CONFIG[role];
                  const RIcon = rc.icon;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleChange(role)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-foreground/5 ${
                        member.role === role
                          ? "font-semibold text-foreground"
                          : "text-foreground/60"
                      }`}
                    >
                      <RIcon className={`h-3 w-3 ${rc.className}`} />
                      {role}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        <span
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${config.bg} ${config.className}`}
        >
          <Icon className="h-3 w-3" />
          {member.role}
        </span>
      )}

      {/* Remove button */}
      {isOwner && !isCurrentUser && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isRemoving}
          title="Remove member"
          className="rounded-lg p-1.5 text-foreground/30 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950/20"
        >
          <UserMinus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
