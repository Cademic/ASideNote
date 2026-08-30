import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  FolderOpen,
  MoreHorizontal,
  PenTool,
  Pin,
  Users,
} from "lucide-react";
import { GalleryItemMenu } from "./GalleryItemMenu";
import { GALLERY_KIND_LABELS_SINGULAR } from "../../lib/gallery-filter";
import { formatRelativeDate } from "../../lib/format-relative-date";
import {
  constrainFixedBox,
  DROPDOWN_VIEWPORT_PADDING,
} from "../../lib/dropdown-viewport";
import type { GalleryItem, GalleryKind } from "../../types/gallery";

const KIND_ICON: Record<
  GalleryKind,
  { icon: typeof FolderOpen; className: string }
> = {
  project: { icon: FolderOpen, className: "text-violet-500" },
  noteboard: { icon: ClipboardList, className: "text-amber-500" },
  chalkboard: { icon: PenTool, className: "text-slate-500" },
  notebook: { icon: BookOpen, className: "text-amber-500" },
};

const STATUS_BADGE: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
  Completed: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200",
  Archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

/** Approx menu width (`w-52`) — used to right-align it under the kebab button. */
const MENU_WIDTH = 208;

interface GalleryListRowProps {
  item: GalleryItem;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  /** Right-click request — force the menu open. */
  onOpenMenu: () => void;
  onRename: (item: GalleryItem) => void;
  onDelete: (item: GalleryItem) => void;
  onTogglePin: (item: GalleryItem) => void;
  onMoveToProject: (item: GalleryItem, projectId: string | null) => void;
  onLeave: (item: GalleryItem) => void;
  activeProjects: Array<{ id: string; name: string }>;
}

export function GalleryListRow({
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
}: GalleryListRowProps) {
  const navigate = useNavigate();
  const { icon: Icon, className: iconClass } = KIND_ICON[item.kind];
  const isShared = item.ownership === "shared";
  const ProjectIcon = isShared ? Users : FolderOpen;

  const kebabRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });

  // Clamp the portalled menu inside the viewport once it has rendered.
  useLayoutEffect(() => {
    if (!menuOpen || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const { left, top } = constrainFixedBox(
      anchor.x,
      anchor.y,
      rect.width,
      rect.height,
      DROPDOWN_VIEWPORT_PADDING,
    );
    if (left !== anchor.x || top !== anchor.y) setAnchor({ x: left, y: top });
  }, [menuOpen, anchor.x, anchor.y]);

  function openFromKebab() {
    const rect = kebabRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ x: rect.right - MENU_WIDTH, y: rect.bottom + 4 });
    onToggleMenu();
  }

  function openFromContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    setAnchor({ x: event.clientX, y: event.clientY });
    onOpenMenu();
  }

  return (
    <tr
      className="group cursor-pointer text-sm"
      onClick={() => navigate(item.to)}
      onContextMenu={openFromContextMenu}
    >
      <td className="max-w-0 py-2 pl-4 pr-3">
        <div className="flex items-center gap-2.5">
          <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium text-foreground group-hover:underline">
                {item.name}
              </span>
              {item.isPinned && (
                <Pin className="h-3 w-3 shrink-0 text-amber-500" aria-label="Pinned" />
              )}
              {item.kind === "project" && isShared && (
                <Users
                  className="h-3 w-3 shrink-0 text-sky-500"
                  aria-label="Shared with you"
                />
              )}
            </div>
            {item.projectName && (
              <div className="flex items-center gap-1 text-xs text-foreground/40">
                <ProjectIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.projectName}</span>
                {isShared && (
                  <span className="shrink-0 text-sky-500">· shared</span>
                )}
              </div>
            )}
          </div>
        </div>
      </td>

      <td className="whitespace-nowrap px-3 py-2.5 text-foreground/60">
        {GALLERY_KIND_LABELS_SINGULAR[item.kind]}
      </td>

      <td className="whitespace-nowrap px-3 py-2.5">
        {item.projectStatus ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              STATUS_BADGE[item.projectStatus] ?? "bg-surface text-foreground/60"
            }`}
          >
            {item.projectStatus}
          </span>
        ) : (
          <span className="text-foreground/30">—</span>
        )}
      </td>

      <td className="whitespace-nowrap px-3 py-2.5 text-foreground/60">
        {item.ownership === "shared" ? (item.ownerLabel ?? "Shared") : "Me"}
      </td>

      <td className="whitespace-nowrap px-3 py-2.5 text-foreground/60">
        {formatRelativeDate(item.updatedAt)}
      </td>

      <td className="whitespace-nowrap px-3 py-2.5 text-foreground/50">
        {formatRelativeDate(item.createdAt)}
      </td>

      <td
        className="w-10 py-2.5 pr-4 text-right"
        data-gallery-item-menu
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={kebabRef}
          type="button"
          onClick={openFromKebab}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Actions for ${item.name}`}
          className="rounded-md p-1 text-foreground/40 opacity-0 transition-opacity hover:bg-foreground/10 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {menuOpen &&
          createPortal(
            <div
              ref={menuRef}
              data-gallery-item-menu
              className="fixed z-[100]"
              style={{ left: anchor.x, top: anchor.y }}
            >
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
            </div>,
            document.body,
          )}
      </td>
    </tr>
  );
}
