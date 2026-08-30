import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Images, Plus } from "lucide-react";
import type { AppLayoutContext } from "../components/layout/AppLayout";
import { useGalleryItems } from "../hooks/useGalleryItems";
import {
  GALLERY_KIND_LABELS,
  GALLERY_KIND_LABELS_SINGULAR,
  GALLERY_KIND_ORDER,
  filterGalleryItems,
  groupGalleryItemsByKind,
  sortGalleryItems,
} from "../lib/gallery-filter";
import {
  hasNonTypeNarrowing,
  readFilters,
  readSort,
  readViewMode,
  writeFilters,
  writeSort,
  writeViewMode,
  type GalleryViewMode,
} from "../lib/gallery-prefs";
import { GalleryViewToggle } from "../components/gallery/GalleryViewToggle";
import { GalleryFilterPanel } from "../components/gallery/GalleryFilterPanel";
import { GalleryGridView } from "../components/gallery/GalleryGridView";
import { GalleryListView } from "../components/gallery/GalleryListView";
import { ConfirmDialog } from "../components/dashboard/ConfirmDialog";
import type { CreateDialogTab } from "../components/dashboard/CreateBoardDialog";
import { GalleryRenameDialog } from "../components/gallery/GalleryRenameDialog";
import type {
  GalleryItem,
  GalleryKind,
  GallerySortKey,
} from "../types/gallery";

type RenameKind = "project" | "board" | "notebook";

/** Which tab of the shared create dialog a given Gallery section maps to. */
function kindToCreateTab(kind: GalleryKind): CreateDialogTab {
  if (kind === "project") return "project";
  if (kind === "notebook") return "notebook";
  return "board";
}

/** Descending is the natural default for time / pinned columns. */
function defaultDirFor(key: GallerySortKey): "asc" | "desc" {
  return key === "modified" || key === "created" || key === "pinned"
    ? "desc"
    : "asc";
}

export function GalleryPage() {
  const { requestCreate } = useOutletContext<AppLayoutContext>();

  const gallery = useGalleryItems();

  const [viewMode, setViewMode] = useState<GalleryViewMode>(() =>
    readViewMode(),
  );
  const [filters, setFilters] = useState(() => readFilters());
  const [sort, setSort] = useState(() => readSort());

  useEffect(() => {
    writeViewMode(viewMode);
  }, [viewMode]);
  useEffect(() => {
    writeFilters(filters);
  }, [filters]);
  useEffect(() => {
    writeSort(sort);
  }, [sort]);

  // --- dialogs ------------------------------------------------------------
  const [renameTarget, setRenameTarget] = useState<{
    kind: RenameKind;
    id: string;
    name: string;
    description: string;
    kindLabel: string;
    /** Notebooks carry no description on the backend. */
    canEditDescription: boolean;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<GalleryItem | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // --- derived views ----------------------------------------------------
  const filtered = useMemo(
    () => filterGalleryItems(gallery.items, filters),
    [gallery.items, filters],
  );
  const groups = useMemo(() => groupGalleryItemsByKind(filtered), [filtered]);
  const sortedItems = useMemo(
    () => sortGalleryItems(filtered, sort.key, sort.dir),
    [filtered, sort],
  );
  const visibleKinds = useMemo(
    () =>
      GALLERY_KIND_ORDER.filter(
        (kind) => filters.kinds.length === 0 || filters.kinds.includes(kind),
      ),
    [filters.kinds],
  );
  const hasActiveNonKindFilter = hasNonTypeNarrowing(filters);

  // --- rename / delete / leave / pin / move ----------------------------
  const requestRename = useCallback((item: GalleryItem) => {
    const kind: RenameKind =
      item.kind === "project"
        ? "project"
        : item.kind === "notebook"
          ? "notebook"
          : "board";
    setRenameTarget({
      kind,
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      kindLabel: GALLERY_KIND_LABELS_SINGULAR[item.kind],
      canEditDescription: item.kind !== "notebook",
    });
  }, []);

  async function confirmRename(newName: string, newDescription: string) {
    if (!renameTarget) return;
    const { kind, id, canEditDescription } = renameTarget;
    const description = canEditDescription ? newDescription : undefined;
    setRenameTarget(null);
    if (kind === "project")
      await gallery.projects.rename(id, newName, description);
    else if (kind === "board")
      await gallery.boards.rename(id, newName, description);
    else await gallery.notebooks.rename(id, newName);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const item = deleteTarget;
    setDeleteTarget(null);
    if (item.kind === "project") await gallery.projects.remove(item.id);
    else if (item.kind === "notebook") await gallery.notebooks.remove(item.id);
    else await gallery.boards.remove(item.id);
  }

  async function confirmLeave() {
    if (!leaveTarget) return;
    const id = leaveTarget.id;
    setLeaveTarget(null);
    await gallery.projects.leave(id);
  }

  const togglePin = useCallback(
    (item: GalleryItem) => {
      const next = !item.isPinned;
      if (item.kind === "project") gallery.projects.togglePin(item.id, next);
      else if (item.kind === "notebook")
        gallery.notebooks.togglePin(item.id, next);
      else gallery.boards.togglePin(item.id, next);
    },
    [gallery.projects, gallery.notebooks, gallery.boards],
  );

  const moveToProject = useCallback(
    (item: GalleryItem, projectId: string | null) => {
      // Passing the current project id triggers the "remove" branch in the hook.
      const target = projectId ?? item.projectId;
      if (!target || item.kind === "project") return;
      if (item.kind === "notebook") {
        gallery.notebooks.addToProject(item.id, target);
      } else {
        gallery.boards.moveToProject(item.id, target);
      }
    },
    [gallery.notebooks, gallery.boards],
  );

  const requestDelete = useCallback(
    (item: GalleryItem) => setDeleteTarget(item),
    [],
  );
  const requestLeave = useCallback(
    (item: GalleryItem) => setLeaveTarget(item),
    [],
  );

  function handleSortChange(key: GallerySortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: defaultDirFor(key) },
    );
  }

  // --- loading / error -------------------------------------------------
  if (gallery.isLoading) {
    return (
      <div className="h-full overflow-y-auto bg-background">
        <div className="mx-auto max-w-[1600px] px-6 py-8">
          {/* header — icon tile + title/subtitle, then the action row */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-3 w-56" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="skeleton h-8 w-16 rounded-lg" />
              <div className="skeleton h-8 w-20 rounded-lg" />
              <div className="skeleton h-8 w-40 rounded-lg" />
            </div>
          </div>

          {/* two placeholder sections, matching the real sectioned grid */}
          <div className="flex flex-col gap-10">
            {[0, 1].map((section) => (
              <section key={section}>
                <div className="mb-4 flex items-center gap-2">
                  <div className="skeleton h-4 w-4" />
                  <div className="skeleton h-5 w-28" />
                  <div className="skeleton h-5 w-6 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  <div className="h-72 border-2 border-dashed border-border" />
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="skeleton h-52 self-end" />
                  ))}
                </div>
                {section === 0 && (
                  <hr className="mt-10 border-t border-border" aria-hidden />
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (gallery.error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-sm text-red-500">{gallery.error}</p>
          <button
            type="button"
            onClick={() => gallery.refetchAll()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900">
              <Images className="h-5 w-5 text-amber-600 dark:text-amber-200" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground">Gallery</h1>
              <p className="truncate text-sm text-foreground/50">
                Projects, boards and notebooks in one place
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-px sm:flex-shrink-0">
            <button
              type="button"
              data-tutorial-target="new-board-button"
              onClick={() => requestCreate()}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>

            <div className="flex-shrink-0">
              <GalleryFilterPanel
                filters={filters}
                onChange={setFilters}
                matchCount={filtered.length}
                totalCount={gallery.items.length}
              />
            </div>
            <div className="flex-shrink-0">
              <GalleryViewToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </div>

        {gallery.notebookLimitReached && (
          <p className="mb-4 text-xs text-foreground/50">
            Maximum 5 notebooks. Delete one to create another.
          </p>
        )}

        {gallery.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface py-20 text-center">
            <p className="mb-4 text-sm text-foreground/60">
              Nothing here yet. Create your first project, board or notebook.
            </p>
            <button
              type="button"
              onClick={() => requestCreate()}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground/70 hover:border-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Get started
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <GalleryGridView
            groups={groups}
            visibleKinds={visibleKinds}
            hasActiveNonKindFilter={hasActiveNonKindFilter}
            onNew={(kind) => requestCreate(kindToCreateTab(kind))}
            notebookLimitReached={gallery.notebookLimitReached}
            onRename={requestRename}
            onDelete={requestDelete}
            onTogglePin={togglePin}
            onMoveToProject={moveToProject}
            onLeave={requestLeave}
            activeProjects={gallery.activeProjects}
          />
        ) : (
          <GalleryListView
            items={sortedItems}
            sort={sort}
            onSortChange={handleSortChange}
            openMenuId={openMenuId}
            onOpenMenuChange={setOpenMenuId}
            onRename={requestRename}
            onDelete={requestDelete}
            onTogglePin={togglePin}
            onMoveToProject={moveToProject}
            onLeave={requestLeave}
            activeProjects={gallery.activeProjects}
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={`Delete ${deleteTarget ? GALLERY_KIND_LABELS[deleteTarget.kind].replace(/s$/, "") : "item"}`}
        message={`Are you sure you want to delete "${deleteTarget?.name ?? "this item"}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={leaveTarget !== null}
        title="Leave Project"
        message={`Are you sure you want to leave "${leaveTarget?.name ?? "this project"}"? You can be re-invited to rejoin later.`}
        confirmLabel="Leave Project"
        cancelLabel="Stay"
        variant="danger"
        onConfirm={confirmLeave}
        onCancel={() => setLeaveTarget(null)}
      />

      <GalleryRenameDialog
        isOpen={renameTarget !== null}
        kindLabel={renameTarget?.kindLabel ?? "Item"}
        initialName={renameTarget?.name ?? ""}
        initialDescription={renameTarget?.description ?? ""}
        showDescription={renameTarget?.canEditDescription ?? false}
        onConfirm={confirmRename}
        onCancel={() => setRenameTarget(null)}
      />
    </div>
  );
}
