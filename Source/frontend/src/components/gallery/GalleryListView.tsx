import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { GalleryListRow } from "./GalleryListRow";
import { bucketByRecency } from "../../lib/gallery-buckets";
import type {
  GalleryItem,
  GallerySortKey,
  GallerySortState,
} from "../../types/gallery";

interface Column {
  key: GallerySortKey;
  label: string;
  /** Extra classes for the <th> / alignment. */
  className?: string;
}

const COLUMNS: Column[] = [
  { key: "name", label: "Name", className: "pl-4 pr-3" },
  { key: "type", label: "Type", className: "px-3" },
  { key: "status", label: "Status", className: "px-3" },
  { key: "owner", label: "Owner", className: "px-3" },
  { key: "modified", label: "Modified", className: "px-3" },
  { key: "created", label: "Created", className: "px-3" },
];

const TOTAL_COLS = COLUMNS.length + 1;

interface GalleryListViewProps {
  /** Already filtered + sorted. */
  items: GalleryItem[];
  sort: GallerySortState;
  onSortChange: (key: GallerySortKey) => void;
  openMenuId: string | null;
  onOpenMenuChange: (id: string | null) => void;
  onRename: (item: GalleryItem) => void;
  onDelete: (item: GalleryItem) => void;
  onTogglePin: (item: GalleryItem) => void;
  onMoveToProject: (item: GalleryItem, projectId: string | null) => void;
  onLeave: (item: GalleryItem) => void;
  activeProjects: Array<{ id: string; name: string }>;
}

interface GroupHeaderRowProps {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  first?: boolean;
}

function GroupHeaderRow({
  label,
  count,
  collapsed,
  onToggle,
  first,
}: GroupHeaderRowProps) {
  return (
    <tr>
      <td colSpan={TOTAL_COLS} className={`px-4 pb-1 ${first ? "pt-1" : "pt-6"}`}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-foreground/40 transition-colors hover:text-foreground/70"
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${collapsed ? "-rotate-90" : ""}`}
          />
          {label}
          <span className="font-normal normal-case text-foreground/30">
            ({count})
          </span>
        </button>
      </td>
    </tr>
  );
}

/**
 * Details view — File-Explorer style. Projects are pinned to the top as their
 * own group and separated by a rule; everything else is grouped into recency
 * buckets (Today, Yesterday, This Week, …) by when it was last touched. The
 * active column sort applies within each group.
 */
export function GalleryListView({
  items,
  sort,
  onSortChange,
  openMenuId,
  onOpenMenuChange,
  onRename,
  onDelete,
  onTogglePin,
  onMoveToProject,
  onLeave,
  activeProjects,
}: GalleryListViewProps) {
  useEffect(() => {
    if (openMenuId === null) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-gallery-item-menu]")) return;
      onOpenMenuChange(null);
    }
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [openMenuId, onOpenMenuChange]);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const toggleSection = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Bucket assignment is by `updatedAt`; `now` is fixed for the life of the view.
  const now = useMemo(() => new Date(), []);
  const projects = useMemo(
    () => items.filter((item) => item.kind === "project"),
    [items],
  );
  const buckets = useMemo(
    () =>
      bucketByRecency(
        items.filter((item) => item.kind !== "project"),
        (item) => item.updatedAt,
        now,
      ),
    [items, now],
  );

  const renderRow = (item: GalleryItem) => (
    <GalleryListRow
      key={item.id}
      item={item}
      menuOpen={openMenuId === item.id}
      onToggleMenu={() =>
        onOpenMenuChange(openMenuId === item.id ? null : item.id)
      }
      onCloseMenu={() => onOpenMenuChange(null)}
      onOpenMenu={() => onOpenMenuChange(item.id)}
      onRename={onRename}
      onDelete={onDelete}
      onTogglePin={onTogglePin}
      onMoveToProject={onMoveToProject}
      onLeave={onLeave}
      activeProjects={activeProjects}
    />
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-foreground/40">
            {COLUMNS.map((column) => {
              const active = sort.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={`py-2.5 font-semibold ${column.className ?? "px-3"}`}
                  aria-sort={
                    active
                      ? sort.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => onSortChange(column.key)}
                    className="flex items-center gap-1 uppercase hover:text-foreground"
                  >
                    {column.label}
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        active ? "opacity-100" : "opacity-0"
                      } ${active && sort.dir === "asc" ? "rotate-180" : ""}`}
                    />
                  </button>
                </th>
              );
            })}
            <th scope="col" className="w-10 py-2.5 pr-4">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td
                colSpan={TOTAL_COLS}
                className="px-4 py-10 text-center text-sm text-foreground/40"
              >
                Nothing to show here.
              </td>
            </tr>
          )}

          {projects.length > 0 && (
            <>
              <GroupHeaderRow
                label="Projects"
                count={projects.length}
                collapsed={collapsed.has("projects")}
                onToggle={() => toggleSection("projects")}
                first
              />
              {!collapsed.has("projects") && projects.map(renderRow)}
              {buckets.length > 0 && (
                <tr aria-hidden>
                  <td colSpan={TOTAL_COLS} className="px-4 py-2">
                    <hr className="border-t border-border" />
                  </td>
                </tr>
              )}
            </>
          )}

          {buckets.map((bucket, index) => (
            <Fragment key={bucket.id}>
              <GroupHeaderRow
                label={bucket.label}
                count={bucket.items.length}
                collapsed={collapsed.has(bucket.id)}
                onToggle={() => toggleSection(bucket.id)}
                first={index === 0 && projects.length === 0}
              />
              {!collapsed.has(bucket.id) && bucket.items.map(renderRow)}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
