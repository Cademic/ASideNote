import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  FolderOpen,
  MoreVertical,
  PenTool,
  Pin,
  Users,
} from "lucide-react";
import { GalleryItemMenu } from "./GalleryItemMenu";
import { formatRelativeDate } from "../../lib/format-relative-date";
import type { ProjectSummaryDto } from "../../types";
import type { GalleryItem, GalleryKind } from "../../types/gallery";

/** Thumbnail treatment per kind: panel background + centred icon colour + optional pattern. */
const KIND_THUMB: Record<
  GalleryKind,
  {
    panel: string;
    icon: typeof FolderOpen;
    iconClass: string;
    pattern?: "grid" | "ruled";
  }
> = {
  noteboard: {
    panel: "bg-[#f2ecdd] dark:bg-[#2a2620]",
    icon: ClipboardList,
    iconClass: "text-amber-500/80",
    pattern: "grid",
  },
  chalkboard: {
    panel: "bg-slate-800 dark:bg-[#1c2128]",
    icon: PenTool,
    iconClass: "text-slate-300",
    pattern: "grid",
  },
  notebook: {
    panel: "bg-orange-50 dark:bg-[#2a231c]",
    icon: BookOpen,
    iconClass: "text-orange-400/90",
    pattern: "ruled",
  },
  project: {
    panel: "bg-violet-100 dark:bg-[#242130]",
    icon: FolderOpen,
    iconClass: "text-violet-500/80",
  },
};

/**
 * Project colour keyword -> the folder's two leaves. `back` is the back leaf +
 * raised tab, `front` is the front leaf, which carries the project's name /
 * description / meta directly on it.
 */
interface FolderColor {
  back: string;
  front: string;
}
const PROJECT_FOLDER: Record<string, FolderColor> = {
  violet: {
    back: "bg-violet-600 dark:bg-violet-800",
    front: "bg-violet-500 dark:bg-violet-700",
  },
  sky: {
    back: "bg-sky-600 dark:bg-sky-800",
    front: "bg-sky-500 dark:bg-sky-700",
  },
  amber: {
    back: "bg-amber-600 dark:bg-amber-700",
    front: "bg-amber-500 dark:bg-amber-600",
  },
  rose: {
    back: "bg-rose-600 dark:bg-rose-800",
    front: "bg-rose-500 dark:bg-rose-700",
  },
  emerald: {
    back: "bg-emerald-600 dark:bg-emerald-800",
    front: "bg-emerald-500 dark:bg-emerald-700",
  },
  orange: {
    back: "bg-orange-600 dark:bg-orange-700",
    front: "bg-orange-500 dark:bg-orange-600",
  },
};

/** Status pill swatches, tuned to sit on the coloured folder front. */
const FOLDER_STATUS_BADGE: Record<string, string> = {
  Active: "bg-white/90 text-emerald-700",
  Completed: "bg-white/90 text-sky-700",
  Archived: "bg-white/80 text-gray-700",
};

const PATTERN_STYLE: Record<"grid" | "ruled", React.CSSProperties> = {
  grid: {
    backgroundImage:
      "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
    backgroundSize: "18px 18px",
  },
  ruled: {
    backgroundImage:
      "linear-gradient(transparent 21px, currentColor 21px, currentColor 22px, transparent 22px)",
    backgroundSize: "100% 22px",
  },
};

interface GalleryCardProps {
  item: GalleryItem;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  /** Right-click / context-menu request — force the menu open. */
  onOpenMenu: () => void;
  onRename: (item: GalleryItem) => void;
  onDelete: (item: GalleryItem) => void;
  onTogglePin: (item: GalleryItem) => void;
  onMoveToProject: (item: GalleryItem, projectId: string | null) => void;
  onLeave?: (item: GalleryItem) => void;
  activeProjects: Array<{ id: string; name: string }>;
}

export function GalleryCard({
  item,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onOpenMenu,
  onRename,
  onDelete,
  onTogglePin,
  onMoveToProject,
  onLeave,
  activeProjects,
}: GalleryCardProps) {
  const navigate = useNavigate();
  const kindThumb = KIND_THUMB[item.kind];
  const Icon = kindThumb.icon;
  const isShared = item.ownership === "shared";
  const ProjectIcon = isShared ? Users : FolderOpen;

  const kebabButton = (className: string) => (
    <button
      type="button"
      onClick={onToggleMenu}
      data-gallery-item-menu
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      aria-label={`Actions for ${item.name}`}
      className={className}
    >
      <MoreVertical className="h-4 w-4" />
    </button>
  );

  const menu = menuOpen && (
    <div className="absolute right-2 top-11 z-30" data-gallery-item-menu>
      <GalleryItemMenu
        item={item}
        onClose={onCloseMenu}
        onRename={onRename}
        onDelete={onDelete}
        onTogglePin={onTogglePin}
        onMoveToProject={onMoveToProject}
        onLeave={onLeave}
        activeProjects={activeProjects}
      />
    </div>
  );

  // ── Project: the whole card is a file folder, with the info printed on its front leaf ──
  if (item.kind === "project") {
    const folder = PROJECT_FOLDER[item.color ?? ""] ?? PROJECT_FOLDER.violet;
    // Safe: `raw` is a ProjectSummaryDto whenever `kind === "project"`.
    const memberCount = (item.raw as ProjectSummaryDto).memberCount;
    const boardCount = item.itemCount ?? 0;
    const countChips = [
      boardCount > 0
        ? `${boardCount} board${boardCount === 1 ? "" : "s"}`
        : null,
      memberCount > 0
        ? `${memberCount} member${memberCount === 1 ? "" : "s"}`
        : null,
    ].filter((chip): chip is string => chip !== null);

    return (
      <div
        onContextMenu={(event) => {
          event.preventDefault();
          onOpenMenu();
        }}
        className="group relative flex h-52 flex-col self-end transition-transform duration-150 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:transform-none"
      >
        {/* tab + back leaf */}
        <span
          aria-hidden
          className={`absolute left-4 top-1.5 h-9 w-[46%] rounded-t-lg ${folder.back}`}
        />
        <span
          aria-hidden
          className={`absolute inset-x-0 top-8 bottom-0 rounded-t-lg ${folder.back}`}
        />

        {/* paper sheets peeking above the front leaf */}
        <span
          aria-hidden
          className="absolute inset-x-5 top-[42px] bottom-6 rounded-[3px] bg-[#fdfdf7] shadow-sm transition-transform duration-200 ease-out group-hover:-translate-y-2 dark:bg-neutral-300 motion-reduce:transition-none motion-reduce:group-hover:transform-none"
        />
        <span
          aria-hidden
          className="absolute inset-x-4 top-[48px] bottom-5 rounded-[3px] bg-[#f1ede0] transition-transform duration-200 ease-out group-hover:-translate-y-1 dark:bg-neutral-400 motion-reduce:transition-none motion-reduce:group-hover:transform-none"
        />

        {/* front leaf — click target, carries the project info */}
        <button
          type="button"
          onClick={() => navigate(item.to)}
          className={`absolute inset-x-0 top-14 bottom-0 flex flex-col rounded-t-lg ${folder.front} p-3.5 text-left shadow-[0_-6px_16px_rgba(0,0,0,0.22)] transition-shadow duration-150 group-hover:shadow-[0_-8px_22px_rgba(0,0,0,0.3)]`}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-t-lg bg-gradient-to-b from-white/10 via-transparent to-black/20"
          />

          <div className="relative flex items-start gap-1.5">
            {item.isPinned && (
              <Pin
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white"
                aria-label="Pinned"
              />
            )}
            <span className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-white">
              {item.name}
            </span>
            {isShared && (
              <Users
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/90"
                aria-label="Shared with you"
              />
            )}
          </div>

          {item.description && (
            <p className="relative mt-1.5 line-clamp-2 text-[11px] leading-snug text-white/80">
              {item.description}
            </p>
          )}

          {countChips.length > 0 && (
            <div className="relative mt-2 flex flex-wrap gap-1.5">
              {countChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/90"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}

          <div className="relative mt-auto flex items-center justify-between gap-2 pt-2 text-[11px] text-white/80">
            <span className="truncate">
              Edited {formatRelativeDate(item.updatedAt)}
            </span>
            {item.projectStatus && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${
                  FOLDER_STATUS_BADGE[item.projectStatus] ??
                  "bg-white/20 text-white"
                }`}
              >
                {item.projectStatus}
              </span>
            )}
          </div>
        </button>

        {kebabButton(
          "absolute right-2 top-2 z-20 rounded-md bg-black/25 p-1 text-white/85 opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/40 hover:text-white focus-visible:opacity-100 group-hover:opacity-100 aria-expanded:opacity-100",
        )}
        {menu}
      </div>
    );
  }

  // ── Every other kind: thumbnail panel on top, info panel below ──
  const countBadge =
    item.kind !== "notebook" && item.itemCount != null && item.itemCount > 0
      ? `${item.itemCount} item${item.itemCount === 1 ? "" : "s"}`
      : null;

  return (
    <div
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenMenu();
      }}
      className="group relative flex h-72 flex-col border border-border bg-background transition-[transform,box-shadow,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:transform-none"
    >
      <button
        type="button"
        onClick={() => navigate(item.to)}
        aria-label={`Open ${item.name}`}
        className={`relative flex h-40 w-full items-center justify-center overflow-hidden ${kindThumb.panel}`}
      >
        {kindThumb.pattern && (
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-0 ${kindThumb.iconClass} opacity-[0.12]`}
            style={PATTERN_STYLE[kindThumb.pattern]}
          />
        )}
        <Icon
          className={`h-9 w-9 transition-transform duration-150 ease-out group-hover:scale-110 motion-reduce:transform-none ${kindThumb.iconClass}`}
        />
      </button>

      {kebabButton(
        "absolute right-2 top-2 rounded-md bg-background/70 p-1 text-foreground/50 opacity-0 backdrop-blur-sm transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 aria-expanded:opacity-100",
      )}
      {menu}

      <button
        type="button"
        onClick={() => navigate(item.to)}
        className="flex flex-1 flex-col justify-between gap-2 overflow-hidden p-3 text-left"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-start gap-1.5">
            {item.isPinned && (
              <Pin
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500"
                aria-label="Pinned"
              />
            )}
            <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
              {item.name}
            </span>
          </div>
          {item.projectName && (
            <div className="flex items-center gap-1 text-[11px] text-foreground/45">
              <ProjectIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{item.projectName}</span>
              {isShared && (
                <span className="shrink-0 text-sky-500" title="Shared with you">
                  · shared
                </span>
              )}
            </div>
          )}
          {item.description && (
            <p className="line-clamp-2 text-[11px] leading-snug text-foreground/55">
              {item.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-foreground/50">
          <span className="truncate">
            Edited {formatRelativeDate(item.updatedAt)}
          </span>
          {countBadge ? (
            <span className="shrink-0 text-foreground/40">{countBadge}</span>
          ) : null}
        </div>
      </button>
    </div>
  );
}
