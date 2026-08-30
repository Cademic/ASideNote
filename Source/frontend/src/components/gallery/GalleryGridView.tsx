import { useEffect, useState } from "react";
import {
  BookOpen,
  ClipboardList,
  FolderOpen,
  PenTool,
  Plus,
} from "lucide-react";
import { GalleryCard } from "./GalleryCard";
import {
  GALLERY_KIND_LABELS,
  type GalleryGroup,
} from "../../lib/gallery-filter";
import type { GalleryItem, GalleryKind } from "../../types/gallery";

const NEW_LABEL: Record<GalleryKind, string> = {
  project: "NEW PROJECT",
  noteboard: "NEW NOTEBOARD",
  chalkboard: "NEW CHALKBOARD",
  notebook: "NEW NOTEBOOK",
};

const KIND_ICON: Record<GalleryKind, typeof FolderOpen> = {
  project: FolderOpen,
  noteboard: ClipboardList,
  chalkboard: PenTool,
  notebook: BookOpen,
};

interface GalleryGridViewProps {
  groups: GalleryGroup[];
  /** Kinds to render a section for, in order — even when they currently have no items. */
  visibleKinds: GalleryKind[];
  /** True when a status / ownership / pinned / recent facet is narrowing results. */
  hasActiveNonKindFilter: boolean;
  onNew: (kind: GalleryKind) => void;
  notebookLimitReached: boolean;
  onRename: (item: GalleryItem) => void;
  onDelete: (item: GalleryItem) => void;
  onTogglePin: (item: GalleryItem) => void;
  onMoveToProject: (item: GalleryItem, projectId: string | null) => void;
  onLeave: (item: GalleryItem) => void;
  activeProjects: Array<{ id: string; name: string }>;
}

/** Sectioned-by-kind card grid. Every card is the same fixed size; each section leads with a "New X" tile. */
export function GalleryGridView({
  groups,
  visibleKinds,
  hasActiveNonKindFilter,
  onNew,
  notebookLimitReached,
  onRename,
  onDelete,
  onTogglePin,
  onMoveToProject,
  onLeave,
  activeProjects,
}: GalleryGridViewProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const groupByKind = new Map(groups.map((group) => [group.kind, group]));

  useEffect(() => {
    if (openMenuId === null) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-gallery-item-menu]")) return;
      setOpenMenuId(null);
    }
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [openMenuId]);

  return (
    <div className="flex flex-col gap-10">
      {visibleKinds.map((kind, index) => {
        const group = groupByKind.get(kind);
        const items = group?.items ?? [];
        const newDisabled = kind === "notebook" && notebookLimitReached;
        const Icon = KIND_ICON[kind];
        // A rule below the Projects section, separating it from the other features.
        const showDivider = kind === "project" && index < visibleKinds.length - 1;

        return (
          <section key={kind}>
            <div className="mb-4 flex items-center gap-2">
              <Icon className="h-4 w-4 text-foreground/50" />
              <h2 className="text-base font-semibold text-foreground">
                {GALLERY_KIND_LABELS[kind]}
              </h2>
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-foreground/50">
                {items.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              <button
                type="button"
                onClick={() => onNew(kind)}
                disabled={newDisabled}
                className="group flex h-72 flex-col items-center justify-center gap-3 border-2 border-dashed border-border bg-surface/30 text-xs font-medium uppercase tracking-wide text-foreground/50 transition-colors duration-150 hover:border-primary/50 hover:bg-surface/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-surface/30 disabled:hover:text-foreground/50 motion-reduce:transition-none"
              >
                <span className="flex h-10 w-10 items-center justify-center border-2 border-dashed border-foreground/25 transition-colors duration-150 group-hover:border-primary/50">
                  <Plus className="h-4 w-4" />
                </span>
                {NEW_LABEL[kind]}
              </button>

              {items.map((item) => (
                <GalleryCard
                  key={item.id}
                  item={item}
                  menuOpen={openMenuId === item.id}
                  onToggleMenu={() =>
                    setOpenMenuId((current) =>
                      current === item.id ? null : item.id,
                    )
                  }
                  onCloseMenu={() => setOpenMenuId(null)}
                  onOpenMenu={() => setOpenMenuId(item.id)}
                  onRename={onRename}
                  onDelete={onDelete}
                  onTogglePin={onTogglePin}
                  onMoveToProject={onMoveToProject}
                  onLeave={onLeave}
                  activeProjects={activeProjects}
                />
              ))}
            </div>

            {items.length === 0 && hasActiveNonKindFilter && (
              <p className="mt-3 text-xs text-foreground/40">
                No {GALLERY_KIND_LABELS[kind].toLowerCase()} match the current
                filters.
              </p>
            )}

            {showDivider && (
              <hr className="mt-10 border-t border-border" aria-hidden />
            )}
          </section>
        );
      })}
    </div>
  );
}
