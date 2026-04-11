import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Folder } from "lucide-react";
import {
  useFixedPortalInViewport,
  useSubmenuFlyoutPosition,
} from "../../lib/useDropdownViewport";
import { getProjectFolders } from "../../api/projects";
import type { ProjectSummaryDto } from "../../types";

interface ProjectMoveFlyoutProps {
  show: boolean;
  /** Anchor for the main project list panel (same as existing Move to Project flyout). */
  anchorRef: React.RefObject<HTMLElement | null>;
  flyoutPortalRef: React.RefObject<HTMLDivElement>;
  nestedFlyoutPortalRef: React.RefObject<HTMLDivElement>;
  activeProjects: ProjectSummaryDto[];
  /** Current project id of the board/notebook (for "Current" labels). */
  currentProjectId: string | null | undefined;
  /** Current folder within that project (optional). */
  currentFolderId: string | null | undefined;
  /** Row click: no folder. Folder row: third argument is folder id. */
  onPick: (projectId: string, folderId?: string) => void;
  onClose: () => void;
  clearParentHoverTimer: () => void;
  scheduleParentClose: () => void;
}

/**
 * Portaled project list + nested folder flyout (lazy-loaded per project on hover).
 */
export function ProjectMoveFlyout({
  show,
  anchorRef,
  flyoutPortalRef,
  nestedFlyoutPortalRef,
  activeProjects,
  currentProjectId,
  currentFolderId,
  onPick,
  onClose,
  clearParentHoverTimer,
  scheduleParentClose,
}: ProjectMoveFlyoutProps) {
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [folderCache, setFolderCache] = useState<
    Record<string, { id: string; name: string }[]>
  >({});
  const nestedRowRef = useRef<HTMLDivElement>(null);
  const nestedHoverTimerRef = useRef<number | null>(null);
  const folderCacheRef = useRef(folderCache);
  folderCacheRef.current = folderCache;

  function clearNestedHoverTimer() {
    if (nestedHoverTimerRef.current != null) {
      window.clearTimeout(nestedHoverTimerRef.current);
      nestedHoverTimerRef.current = null;
    }
  }

  function scheduleNestedClose() {
    clearNestedHoverTimer();
    nestedHoverTimerRef.current = window.setTimeout(() => {
      nestedHoverTimerRef.current = null;
      setHoveredProjectId(null);
    }, 150);
  }

  const mainPos = useSubmenuFlyoutPosition(show, anchorRef);
  const nestedFolders =
    hoveredProjectId != null ? folderCache[hoveredProjectId] : undefined;
  const nestedOpen =
    hoveredProjectId != null &&
    Array.isArray(nestedFolders) &&
    nestedFolders.length > 0;
  const nestedPos = useSubmenuFlyoutPosition(nestedOpen, nestedRowRef);
  useFixedPortalInViewport(show, flyoutPortalRef);
  useFixedPortalInViewport(nestedOpen, nestedFlyoutPortalRef);

  useEffect(() => {
    if (!show) {
      setHoveredProjectId(null);
      clearNestedHoverTimer();
    }
  }, [show]);

  useEffect(() => {
    if (!hoveredProjectId) return;
    if (folderCacheRef.current[hoveredProjectId] !== undefined) return;
    let cancelled = false;
    getProjectFolders(hoveredProjectId)
      .then((folders) => {
        if (cancelled) return;
        setFolderCache((prev) => {
          if (prev[hoveredProjectId] !== undefined) return prev;
          return {
            ...prev,
            [hoveredProjectId]: folders.map((f) => ({ id: f.id, name: f.name })),
          };
        });
      })
      .catch(() => {
        if (cancelled) return;
        setFolderCache((prev) => {
          if (prev[hoveredProjectId] !== undefined) return prev;
          return { ...prev, [hoveredProjectId]: [] };
        });
      });
    return () => {
      cancelled = true;
    };
  }, [hoveredProjectId]);

  useEffect(() => {
    return () => {
      if (nestedHoverTimerRef.current != null) {
        window.clearTimeout(nestedHoverTimerRef.current);
      }
    };
  }, []);

  if (!show || !mainPos) return null;

  return (
    <>
      {createPortal(
        <div
          ref={flyoutPortalRef}
          className="fixed z-[200] w-44 rounded-lg border border-border bg-background py-1 shadow-lg"
          style={{ top: mainPos.top, left: mainPos.left }}
          onMouseEnter={clearParentHoverTimer}
          onMouseLeave={scheduleParentClose}
        >
          {activeProjects.length === 0 ? (
            <div className="px-3 py-2 text-xs text-foreground/40">No active projects</div>
          ) : (
            activeProjects.map((project) => {
              const cached = folderCache[project.id];
              const hasFolders = Array.isArray(cached) && cached.length > 0;
              const loadingFolders =
                hoveredProjectId === project.id && cached === undefined;
              return (
                <div
                  key={project.id}
                  ref={hoveredProjectId === project.id ? nestedRowRef : undefined}
                  className="flex min-w-0 items-stretch"
                  onMouseEnter={() => {
                    clearNestedHoverTimer();
                    setHoveredProjectId(project.id);
                  }}
                  onMouseLeave={() => scheduleNestedClose()}
                >
                  <button
                    type="button"
                    title={
                      currentProjectId === project.id ? "Remove from this project" : undefined
                    }
                    className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition-colors hover:bg-foreground/5 ${
                      currentProjectId === project.id ? "text-primary" : "text-foreground/70"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                      onPick(project.id);
                    }}
                  >
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color || "#8b5cf6" }}
                    />
                    <span className="truncate">{project.name}</span>
                    {currentProjectId === project.id && (
                      <span className="ml-auto shrink-0 text-[10px] text-foreground/40">
                        Current
                      </span>
                    )}
                  </button>
                  {(hasFolders || loadingFolders) && (
                    <div className="flex shrink-0 items-center pr-1.5 text-foreground/30">
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>,
        document.body,
      )}
      {nestedOpen && nestedPos &&
        createPortal(
          <div
            ref={nestedFlyoutPortalRef}
            className="fixed z-[210] max-h-56 w-44 overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-lg"
            style={{ top: nestedPos.top, left: nestedPos.left }}
            onMouseEnter={() => {
              clearNestedHoverTimer();
              // Nested panel is portaled outside the main flyout; without this, leaving the
              // project list schedules the parent menu to close before the pointer reaches folders.
              clearParentHoverTimer();
            }}
            onMouseLeave={scheduleNestedClose}
          >
            {nestedFolders!.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition-colors hover:bg-foreground/5 ${
                  currentProjectId === hoveredProjectId &&
                  currentFolderId === f.id
                    ? "text-primary"
                    : "text-foreground/70"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onPick(hoveredProjectId!, f.id);
                }}
              >
                <Folder className="h-3.5 w-3.5 shrink-0 text-foreground/50" />
                <span className="truncate">{f.name}</span>
                {currentProjectId === hoveredProjectId &&
                  currentFolderId === f.id && (
                    <span className="ml-auto shrink-0 text-[10px] text-foreground/40">
                      Current
                    </span>
                  )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
