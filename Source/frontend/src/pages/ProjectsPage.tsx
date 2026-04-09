import { useCallback, useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import axios from "axios";
import {
  FolderOpen,
  Plus,
  Filter,
  PencilLine,
} from "lucide-react";
import type { AppLayoutContext } from "../components/layout/AppLayout";
import { getProjects, createProject, deleteProject, updateProject, toggleProjectPin, leaveProject } from "../api/projects";
import { ProjectCard } from "../components/projects/ProjectCard";
import { CreateProjectDialog } from "../components/projects/CreateProjectDialog";
import { ConfirmDialog } from "../components/dashboard/ConfirmDialog";
import type { ProjectSummaryDto } from "../types";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Completed", label: "Completed" },
  { value: "Archived", label: "Archived" },
];

export function ProjectsPage() {
  const navigate = useNavigate();
  const { refreshPinnedProjects } = useOutletContext<AppLayoutContext>();
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummaryDto | null>(
    null,
  );
  const [leaveTarget, setLeaveTarget] = useState<ProjectSummaryDto | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      setError(null);
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const result = await getProjects(params);
      setProjects(result);
    } catch {
      setError("Failed to load projects.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function handleCreate(
    name: string,
    description: string,
    color: string,
    startDate?: string,
    endDate?: string,
    deadline?: string,
  ) {
    try {
      setCreateError(null);
      const created = await createProject({
        name,
        description: description || undefined,
        color,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        deadline: deadline || undefined,
      });
      setProjects((prev) => [
        {
          id: created.id,
          name: created.name,
          description: created.description,
          startDate: created.startDate,
          endDate: created.endDate,
          deadline: created.deadline,
          status: created.status,
          progress: created.progress,
          color: created.color,
          ownerId: created.ownerId,
          ownerUsername: created.ownerUsername,
          userRole: created.userRole,
          memberCount: created.members.length,
          boardCount: created.boards.length,
          createdAt: created.createdAt,
        },
        ...prev,
      ]);
      setIsCreateOpen(false);
      navigate(`/projects/${created.id}`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setCreateError(err.response.data?.message ?? "A project with that name already exists.");
      } else {
        setCreateError("Failed to create project. Please try again.");
        console.error("Failed to create project:", err);
      }
    }
  }

  function handleDelete(id: string) {
    const project = projects.find((p) => p.id === id) ?? null;
    if (project) setDeleteTarget(project);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteProject(id);
      refreshPinnedProjects();
    } catch {
      fetchProjects();
    }
  }

  function handleLeave(id: string) {
    const project = projects.find((p) => p.id === id) ?? null;
    if (project) setLeaveTarget(project);
  }

  async function confirmLeave() {
    if (!leaveTarget) return;
    const id = leaveTarget.id;
    setLeaveTarget(null);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await leaveProject(id);
      refreshPinnedProjects();
    } catch {
      fetchProjects();
    }
  }

  function handleRenameProject(id: string, currentName: string) {
    setRenameTarget({ id, name: currentName });
    setRenameValue(currentName);
  }

  async function confirmRenameProject() {
    if (!renameTarget || !renameValue.trim()) return;
    const { id } = renameTarget;
    const newName = renameValue.trim();
    const project = projects.find((p) => p.id === id);
    setRenameTarget(null);
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p)),
    );
    try {
      await updateProject(id, {
        name: newName,
        status: project?.status ?? "Active",
        progress: project?.progress ?? 0,
      });
    } catch {
      fetchProjects();
    }
  }

  async function handleToggleProjectPin(id: string, isPinned: boolean) {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, isPinned, pinnedAt: isPinned ? new Date().toISOString() : undefined }
          : p,
      ),
    );
    try {
      await toggleProjectPin(id, isPinned);
      await refreshPinnedProjects();
    } catch {
      fetchProjects();
    }
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="skeleton h-8 w-32" />
            <div className="skeleton h-9 w-32" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="paper-card relative flex flex-col rounded-lg p-5 pt-7 h-40">
                <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-lg skeleton" />
                <div className="skeleton h-4 w-3/4 mb-3" />
                <div className="skeleton h-3 w-full mb-1" />
                <div className="skeleton h-3 w-2/3 mb-4" />
                <div className="skeleton h-2 w-full rounded-full mt-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-sm text-red-500">{error}</p>
          <button
            type="button"
            onClick={fetchProjects}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
              <FolderOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Projects</h1>
              <p className="text-sm text-foreground/50">
                Organize your boards into collaborative projects
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:-translate-y-0.5 hover:bg-amber-600 hover:shadow-md active:translate-y-0 active:scale-[0.98] dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </button>
        </div>

        {/* Status filter pills */}
        <div className="mb-6 flex items-center gap-2">
          <Filter className="h-4 w-4 text-foreground/40" />
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={[
                "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 motion-reduce:transition-none",
                statusFilter === filter.value
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                  : "text-foreground/50 hover:bg-foreground/5 hover:text-foreground",
              ].join(" ")}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Project grid */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-background/40 py-14">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
              <PencilLine className="h-5 w-5 text-foreground/30" />
            </div>
            <p className="mb-4 text-sm text-foreground/40">
              {statusFilter
                ? `No ${statusFilter.toLowerCase()} projects found`
                : "No projects yet"}
            </p>
            {!statusFilter && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground/60 transition-[colors,box-shadow] duration-150 hover:border-primary/40 hover:text-primary hover:shadow-sm motion-reduce:transition-none"
              >
                <Plus className="h-3.5 w-3.5" />
                Create your first project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onRename={handleRenameProject}
                onTogglePin={handleToggleProjectPin}
                onDelete={handleDelete}
                onLeave={handleLeave}
              />
            ))}
          </div>
        )}
      </div>

      <CreateProjectDialog
        isOpen={isCreateOpen}
        error={createError}
        onClose={() => { setIsCreateOpen(false); setCreateError(null); }}
        onCreate={handleCreate}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.name ?? "this project"}"? All boards will be unlinked but not deleted.`}
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

      {/* Rename Project Dialog */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setRenameTarget(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Rename Project</h2>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmRenameProject();
              }}
              maxLength={100}
              className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRenameProject}
                disabled={!renameValue.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
