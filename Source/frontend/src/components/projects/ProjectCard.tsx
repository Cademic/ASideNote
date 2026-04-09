import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FolderOpen,
  Users,
  ClipboardList,
  Trash2,
  Calendar,
  Crown,
  Eye,
  Pencil,
  MoreVertical,
  Pin,
  PinOff,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ProjectSummaryDto } from "../../types";

interface ProjectCardProps {
  project: ProjectSummaryDto;
  onDelete?: (id: string) => void;
  onRename?: (id: string, currentName: string) => void;
  onTogglePin?: (id: string, isPinned: boolean) => void;
  onLeave?: (id: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  Active: {
    label: "Active",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  Completed: {
    label: "Completed",
    className:
      "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400",
  },
  Archived: {
    label: "Archived",
    className:
      "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
  },
};

const ROLE_CONFIG: Record<string, { icon: typeof Crown; label: string; className: string }> = {
  Owner: {
    icon: Crown,
    label: "Owner",
    className: "text-amber-600 dark:text-amber-400",
  },
  Editor: {
    icon: Pencil,
    label: "Editor",
    className: "text-sky-600 dark:text-sky-400",
  },
  Viewer: {
    icon: Eye,
    label: "Viewer",
    className: "text-foreground/50",
  },
};

const COLOR_MAP: Record<string, { strip: string; iconBg: string; progress: string }> = {
  violet:  { strip: "bg-violet-400/60 dark:bg-violet-500/40",  iconBg: "bg-violet-100/80 dark:bg-violet-900/30",  progress: "bg-violet-500 dark:bg-violet-400" },
  sky:     { strip: "bg-sky-400/60 dark:bg-sky-500/40",        iconBg: "bg-sky-100/80 dark:bg-sky-900/30",        progress: "bg-sky-500 dark:bg-sky-400" },
  amber:   { strip: "bg-amber-400/60 dark:bg-amber-500/40",    iconBg: "bg-amber-100/80 dark:bg-amber-900/30",    progress: "bg-amber-500 dark:bg-amber-400" },
  rose:    { strip: "bg-rose-400/60 dark:bg-rose-500/40",      iconBg: "bg-rose-100/80 dark:bg-rose-900/30",      progress: "bg-rose-500 dark:bg-rose-400" },
  emerald: { strip: "bg-emerald-400/60 dark:bg-emerald-500/40", iconBg: "bg-emerald-100/80 dark:bg-emerald-900/30", progress: "bg-emerald-500 dark:bg-emerald-400" },
  orange:  { strip: "bg-orange-400/60 dark:bg-orange-500/40",  iconBg: "bg-orange-100/80 dark:bg-orange-900/30",  progress: "bg-orange-500 dark:bg-orange-400" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProjectCard({ project, onDelete, onRename, onTogglePin, onLeave }: ProjectCardProps) {
  const navigate = useNavigate();
  const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.Active;
  const roleConfig = ROLE_CONFIG[project.userRole] ?? ROLE_CONFIG.Viewer;
  const RoleIcon = roleConfig.icon;
  const isOwner = project.userRole === "Owner";
  const colors = COLOR_MAP[project.color] ?? COLOR_MAP.violet;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<"ellipsis" | { x: number; y: number }>("ellipsis");
  const menuRef = useRef<HTMLDivElement>(null);
  const portalMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inMenu = menuRef.current?.contains(target) ?? false;
      const inPortal = portalMenuRef.current?.contains(target) ?? false;
      if (!inMenu && !inPortal) {
        setMenuOpen(false);
        setMenuAnchor("ellipsis");
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMenuAnchor("ellipsis");
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuAnchor("ellipsis");
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/projects/${project.id}`)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuAnchor({ x: e.clientX, y: e.clientY });
        setMenuOpen(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/projects/${project.id}`);
        }
      }}
      className={[
        "paper-card group relative flex cursor-pointer flex-col rounded-lg p-5 pt-7 text-left transition-[transform,box-shadow] duration-200 ease-out-smooth hover:-translate-y-1.5 hover:shadow-lg active:translate-y-0 active:shadow-md motion-reduce:transition-none motion-reduce:hover:transform-none focus:outline-none focus:ring-2 focus:ring-primary/20",
        menuOpen ? "z-50 overflow-visible" : "",
      ].join(" ")}
    >
      {/* Colored tape strip at top */}
      <div className={`absolute inset-x-0 top-0 h-1.5 rounded-t-lg ${colors.strip}`} />

      {/* Pin indicator */}
      {project.isPinned && (
        <div className="absolute left-3 top-3 z-10">
          <Pin className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
        </div>
      )}

      {/* Ellipsis menu */}
      <div
        ref={menuRef}
        className="absolute right-3 top-3 z-10"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setMenuAnchor("ellipsis");
            setMenuOpen((v) => !v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              setMenuAnchor("ellipsis");
              setMenuOpen((v) => !v);
            }
          }}
          className="rounded-lg p-1 text-foreground/30 opacity-0 transition-[colors,opacity] duration-150 hover:bg-foreground/5 hover:text-foreground/60 group-hover:opacity-100 motion-reduce:transition-none"
          title="Project actions"
        >
          <MoreVertical className="h-4 w-4" />
        </div>

        {menuOpen && menuAnchor === "ellipsis" && (
          <div className="absolute right-0 top-7 z-20 w-48 rounded-lg border border-border bg-background py-1 shadow-lg">
            {onRename && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onRename(project.id, project.name);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Rename
              </button>
            )}
            {onTogglePin && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onTogglePin(project.id, !project.isPinned);
                }}
              >
                {project.isPinned ? (
                  <>
                    <PinOff className="h-3.5 w-3.5" />
                    Unpin from Sidebar
                  </>
                ) : (
                  <>
                    <Pin className="h-3.5 w-3.5" />
                    Pin to Sidebar
                  </>
                )}
              </button>
            )}
            {!isOwner && onLeave && (
              <>
                <div className="my-1 border-t border-border/50" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    onLeave(project.id);
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Leave Project
                </button>
              </>
            )}
            {isOwner && onDelete && (
              <>
                <div className="my-1 border-t border-border/50" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    onDelete(project.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </>
            )}
          </div>
        )}
        {menuOpen && menuAnchor !== "ellipsis" &&
          createPortal(
            <div
              ref={portalMenuRef}
              className="fixed z-[100] w-48 rounded-lg border border-border bg-background py-1 shadow-lg"
              style={{ left: menuAnchor.x, top: menuAnchor.y }}
            >
              {onRename && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    onRename(project.id, project.name);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </button>
              )}
              {onTogglePin && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    onTogglePin(project.id, !project.isPinned);
                  }}
                >
                  {project.isPinned ? (
                    <>
                      <PinOff className="h-3.5 w-3.5" />
                      Unpin from Sidebar
                    </>
                  ) : (
                    <>
                      <Pin className="h-3.5 w-3.5" />
                      Pin to Sidebar
                    </>
                  )}
                </button>
              )}
              {!isOwner && onLeave && (
                <>
                  <div className="my-1 border-t border-border/50" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeMenu();
                      onLeave(project.id);
                    }}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Leave Project
                  </button>
                </>
              )}
              {isOwner && onDelete && (
                <>
                  <div className="my-1 border-t border-border/50" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeMenu();
                      onDelete(project.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </>
              )}
            </div>,
            document.body,
          )}
      </div>

      {/* Icon & Role badge */}
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors.iconBg}`}>
          <FolderOpen className="h-5 w-5 text-foreground/60" />
        </div>
        <span
          className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${roleConfig.className}`}
        >
          <RoleIcon className="h-3 w-3" />
          {roleConfig.label}
        </span>
      </div>

      {/* Name */}
      <h3 className="mb-1 truncate pr-6 text-sm font-semibold text-foreground">
        {project.name}
      </h3>

      {/* Description */}
      {project.description && (
        <p className="mb-3 line-clamp-2 text-xs text-foreground/50">
          {project.description}
        </p>
      )}

      {/* Status & Date */}
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}
        >
          {status.label}
        </span>
        {project.deadline && (
          <span className="flex items-center gap-1 text-[10px] text-foreground/40">
            <Calendar className="h-3 w-3" />
            {formatDate(project.deadline)}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {project.progress > 0 && (
        <div className="mb-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
            <div
              className={`h-full rounded-full ${colors.progress} transition-[width] duration-[600ms] ease-spring motion-reduce:transition-none`}
              style={{ width: `${Math.min(project.progress, 100)}%` }}
            />
          </div>
          <span className="mt-0.5 text-[10px] text-foreground/30">
            {project.progress}% complete
          </span>
        </div>
      )}

      {/* Owner */}
      <div className="mb-3 flex items-center gap-1.5 text-[10px] text-foreground/40">
        <Crown className="h-3 w-3 text-amber-500/60" />
        <span className="truncate">{project.ownerUsername}</span>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center gap-3 border-t border-blue-200/25 pt-3 text-xs text-foreground/40 dark:border-blue-300/10">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {project.memberCount + 1}
        </span>
        <span className="flex items-center gap-1">
          <ClipboardList className="h-3 w-3" />
          {project.boardCount}
        </span>
        <span className="ml-auto">
          {project.startDate && project.endDate
            ? `${formatDate(project.startDate)} \u2014 ${formatDate(project.endDate)}`
            : "Indefinite"}
        </span>
      </div>
    </div>
  );
}
