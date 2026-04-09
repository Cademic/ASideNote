import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Users,
  Settings,
  Plus,
  Trash2,
  Calendar,
  Crown,
  Eye,
  Pencil,
  PenTool,
  FolderOpen,
  CalendarClock,
  LogOut,
  UserCog,
  X,
} from "lucide-react";
import {
  getProjectById,
  updateProject,
  deleteProject,
  leaveProject,
  transferProjectOwnership,
  addBoardToProject,
  removeBoardFromProject,
  addNotebookToProject,
  removeNotebookFromProject,
} from "../api/projects";
import axios from "axios";
import { createBoard } from "../api/boards";
import { createNotebook, getNotebooks } from "../api/notebooks";
import { BoardCard } from "../components/dashboard/BoardCard";
import { NotebookCard } from "../components/notebooks/NotebookCard";
import { CreateBoardDialog } from "../components/dashboard/CreateBoardDialog";
import { ConfirmDialog } from "../components/dashboard/ConfirmDialog";
import { ProjectCalendar } from "../components/calendar/ProjectCalendar";
import { MemberList } from "../components/projects/MemberList";
import { AddMemberDialog } from "../components/projects/AddMemberDialog";
import { AddExistingBoardDialog } from "../components/projects/AddExistingBoardDialog";
import { AddExistingNotebookDialog } from "../components/projects/AddExistingNotebookDialog";
import { CreateNotebookDialog } from "../components/notebooks/CreateNotebookDialog";
import type {
  ProjectDetailDto,
  BoardSummaryDto,
  NotebookSummaryDto,
  ProjectMemberDto,
} from "../types";
import { useOutletContext } from "react-router-dom";
import type { AppLayoutContext } from "../components/layout/AppLayout";

type TabId = "calendar" | "boards" | "notebooks" | "members" | "settings";

const TABS: { id: TabId; label: string; icon: typeof ClipboardList }[] = [
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "boards", label: "Boards", icon: ClipboardList },
  { id: "notebooks", label: "Notebooks", icon: BookOpen },
  { id: "members", label: "Members", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];

const STATUS_OPTIONS = ["Active", "Completed", "Archived"];

const PROJECT_COLOR_MAP: Record<string, { iconBg: string; iconText: string; progress: string }> = {
  violet:  { iconBg: "bg-violet-100 dark:bg-violet-900/30",  iconText: "text-violet-600 dark:text-violet-400",  progress: "bg-violet-500 dark:bg-violet-400" },
  sky:     { iconBg: "bg-sky-100 dark:bg-sky-900/30",        iconText: "text-sky-600 dark:text-sky-400",        progress: "bg-sky-500 dark:bg-sky-400" },
  amber:   { iconBg: "bg-amber-100 dark:bg-amber-900/30",    iconText: "text-amber-600 dark:text-amber-400",    progress: "bg-amber-500 dark:bg-amber-400" },
  rose:    { iconBg: "bg-rose-100 dark:bg-rose-900/30",      iconText: "text-rose-600 dark:text-rose-400",      progress: "bg-rose-500 dark:bg-rose-400" },
  emerald: { iconBg: "bg-emerald-100 dark:bg-emerald-900/30", iconText: "text-emerald-600 dark:text-emerald-400", progress: "bg-emerald-500 dark:bg-emerald-400" },
  orange:  { iconBg: "bg-orange-100 dark:bg-orange-900/30",  iconText: "text-orange-600 dark:text-orange-400",  progress: "bg-orange-500 dark:bg-orange-400" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toInputDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { openNotebook, setBoardName } = useOutletContext<AppLayoutContext>();

  const [project, setProject] = useState<ProjectDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("calendar");
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [createBoardError, setCreateBoardError] = useState<string | null>(null);
  const [isAddExistingBoardOpen, setIsAddExistingBoardOpen] = useState(false);
  const [isCreateNotebookOpen, setIsCreateNotebookOpen] = useState(false);
  const [createNotebookError, setCreateNotebookError] = useState<string | null>(null);
  const [isAddExistingNotebookOpen, setIsAddExistingNotebookOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const   [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const   [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<ProjectMemberDto | null>(
    null,
  );
  const [removeBoardTarget, setRemoveBoardTarget] = useState<BoardSummaryDto | null>(null);
  const [removeNotebookTarget, setRemoveNotebookTarget] = useState<NotebookSummaryDto | null>(null);
  const [userNotebookTotal, setUserNotebookTotal] = useState(0);

  // Tab strip scroll (arrows when tabs overflow on small screens)
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [hasTabOverflow, setHasTabOverflow] = useState(false);

  const updateTabScrollState = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth;
    setHasTabOverflow(overflow);
    setCanScrollLeft(overflow && scrollLeft > 0);
    setCanScrollRight(overflow && scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    updateTabScrollState();
    const ro = new ResizeObserver(updateTabScrollState);
    ro.observe(el);
    el.addEventListener("scroll", updateTabScrollState);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateTabScrollState);
    };
  }, [updateTabScrollState]);

  function scrollTabs(direction: "left" | "right") {
    const el = tabsScrollRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.6;
    el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
  }

  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function scrollTabIntoCenter(tabId: TabId) {
    const container = tabsScrollRef.current;
    const tabEl = tabButtonRefs.current[tabId];
    if (!container || !tabEl) return;
    const { scrollWidth, clientWidth } = container;
    if (scrollWidth <= clientWidth) return;
    const tabLeft = tabEl.offsetLeft;
    const tabWidth = tabEl.offsetWidth;
    const desiredScroll = tabLeft - clientWidth / 2 + tabWidth / 2;
    const maxScroll = scrollWidth - clientWidth;
    container.scrollTo({
      left: Math.max(0, Math.min(desiredScroll, maxScroll)),
      behavior: "smooth",
    });
  }

  function handleTabClick(tabId: TabId) {
    setActiveTab(tabId);
    requestAnimationFrame(() => scrollTabIntoCenter(tabId));
  }

  // Settings form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("violet");
  const [editStatus, setEditStatus] = useState("Active");
  const [editProgress, setEditProgress] = useState(0);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editShowEventsOnMainCalendar, setEditShowEventsOnMainCalendar] =
    useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isOwner = project?.userRole === "Owner";
  const isEditor = project?.userRole === "Editor";
  const canEdit = isOwner || isEditor;

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      setError(null);
      const data = await getProjectById(projectId);
      setProject(data);
      // Populate settings form
      setEditName(data.name);
      setEditDescription(data.description ?? "");
      setEditColor(data.color ?? "violet");
      setEditStatus(data.status);
      setEditProgress(data.progress);
      setEditStartDate(toInputDate(data.startDate));
      setEditEndDate(toInputDate(data.endDate));
      setEditDeadline(data.deadline ? toInputDate(data.deadline) : "");
      setEditShowEventsOnMainCalendar(data.showEventsOnMainCalendar ?? false);
    } catch {
      setError("Failed to load project.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    setBoardName(project?.name ?? null);
    return () => setBoardName(null);
  }, [project?.name, setBoardName]);

  useEffect(() => {
    if (!projectId) return;
    getNotebooks({ limit: 1 })
      .then((r) => setUserNotebookTotal(r.total))
      .catch(() => {});
  }, [projectId]);

  async function handleCreateBoard(
    name: string,
    description: string,
    boardType: string,
  ) {
    if (!projectId) return;
    try {
      setCreateBoardError(null);
      const created = await createBoard({
        name,
        description: description || undefined,
        boardType,
        projectId,
      });
      setProject((prev) =>
        prev ? { ...prev, boards: [...prev.boards, created] } : prev,
      );
      setIsCreateBoardOpen(false);
      const path =
        created.boardType === "ChalkBoard"
          ? `/chalkboards/${created.id}`
          : `/boards/${created.id}`;
      navigate(path);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setCreateBoardError(err.response.data?.message ?? "A board with that name already exists.");
      } else {
        setCreateBoardError("Failed to create board. Please try again.");
        console.error("Failed to create board:", err);
      }
    }
  }

  async function handleAddExistingBoard(boardId: string) {
    if (!projectId) return;
    try {
      await addBoardToProject(projectId, boardId);
      await fetchProject();
      setIsAddExistingBoardOpen(false);
    } catch (err) {
      console.error("Failed to add board to project:", err);
    }
  }

  function handleRemoveBoard(boardId: string) {
    const board = project?.boards.find((b) => b.id === boardId) ?? null;
    if (board) setRemoveBoardTarget(board);
  }

  async function confirmRemoveBoard() {
    if (!removeBoardTarget || !projectId) return;
    const boardId = removeBoardTarget.id;
    setRemoveBoardTarget(null);
    setProject((prev) =>
      prev
        ? { ...prev, boards: prev.boards.filter((b) => b.id !== boardId) }
        : prev,
    );
    try {
      await removeBoardFromProject(projectId, boardId);
    } catch {
      fetchProject();
    }
  }

  async function handleCreateNotebook(name: string) {
    if (!projectId) return;
    try {
      setCreateNotebookError(null);
      const created = await createNotebook({ name, projectId });
      setProject((prev) =>
        prev
          ? { ...prev, notebooks: [...(prev.notebooks ?? []), created] }
          : prev,
      );
      setIsCreateNotebookOpen(false);
      openNotebook(created.id);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setCreateNotebookError(err.response.data?.message ?? "Maximum 5 notebooks allowed. Delete one to create another.");
      } else {
        setCreateNotebookError("Failed to create notebook. Please try again.");
        console.error("Failed to create notebook:", err);
      }
    }
  }

  async function handleAddExistingNotebook(notebookId: string) {
    if (!projectId) return;
    try {
      await addNotebookToProject(projectId, notebookId);
      await fetchProject();
      setIsAddExistingNotebookOpen(false);
    } catch (err) {
      console.error("Failed to add notebook to project:", err);
    }
  }

  function handleRemoveNotebook(notebookId: string) {
    const notebook = project?.notebooks?.find((n) => n.id === notebookId) ?? null;
    if (notebook) setRemoveNotebookTarget(notebook);
  }

  async function confirmRemoveNotebook() {
    if (!removeNotebookTarget || !projectId) return;
    const notebookId = removeNotebookTarget.id;
    setRemoveNotebookTarget(null);
    setProject((prev) =>
      prev
        ? { ...prev, notebooks: (prev.notebooks ?? []).filter((n) => n.id !== notebookId) }
        : prev,
    );
    try {
      await removeNotebookFromProject(projectId, notebookId);
    } catch {
      fetchProject();
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !isOwner) return;
    setIsSaving(true);
    try {
      await updateProject(projectId, {
        name: editName,
        description: editDescription || undefined,
        color: editColor,
        startDate: editStartDate || undefined,
        endDate: editEndDate || undefined,
        deadline: editDeadline || undefined,
        status: editStatus,
        progress: editProgress,
        showEventsOnMainCalendar: editShowEventsOnMainCalendar,
      });
      await fetchProject();
    } catch {
      // Silently fail
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteProject() {
    if (!projectId) return;
    setDeleteConfirmOpen(false);
    try {
      await deleteProject(projectId);
      navigate("/projects");
    } catch {
      // Silently fail
    }
  }

  function handleLeaveProject() {
    setLeaveConfirmOpen(true);
  }

  async function confirmLeaveProject() {
    if (!projectId) return;
    setLeaveConfirmOpen(false);
    try {
      await leaveProject(projectId);
      navigate("/projects");
    } catch {
      // Silently fail
    }
  }

  function handleTransferOwnership(member: ProjectMemberDto) {
    setTransferTarget(member);
  }

  async function confirmTransferOwnership() {
    if (!projectId || !transferTarget) return;
    const newOwnerId = transferTarget.userId;
    setTransferTarget(null);
    try {
      await transferProjectOwnership(projectId, newOwnerId);
      await fetchProject();
    } catch {
      // Silently fail
    }
  }

  function handleMemberAdded() {
    fetchProject();
    setIsAddMemberOpen(false);
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-foreground/60">Loading project...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-sm text-red-500">
            {error ?? "Project not found."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/projects")}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const RoleIcon = isOwner ? Crown : isEditor ? Pencil : Eye;
  const roleLabel = project.userRole;
  const projectColors = PROJECT_COLOR_MAP[project.color] ?? PROJECT_COLOR_MAP.violet;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Back nav */}
        <button
          type="button"
          onClick={() => navigate("/projects")}
          className="mb-4 flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </button>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${projectColors.iconBg}`}>
              <FolderOpen className={`h-6 w-6 ${projectColors.iconText}`} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {project.name}
              </h1>
              {project.description && (
                <p className="mt-0.5 text-sm text-foreground/50">
                  {project.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {/* Status badge */}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    project.status === "Active"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : project.status === "Completed"
                        ? "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400"
                  }`}
                >
                  {project.status}
                </span>
                {/* Role badge */}
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                  <RoleIcon className="h-3 w-3" />
                  {roleLabel}
                </span>
                {/* Owner */}
                <span className="flex items-center gap-1 text-[10px] text-foreground/40">
                  <Crown className="h-3 w-3 text-amber-500/60" />
                  {project.ownerUsername}
                </span>
                {/* Dates */}
                <span className="flex items-center gap-1 text-[10px] text-foreground/40">
                  <Calendar className="h-3 w-3" />
                  {project.startDate && project.endDate
                    ? `${formatDate(project.startDate)} \u2014 ${formatDate(project.endDate)}`
                    : "Indefinite"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {project.progress > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-foreground/50">
              <span>Progress</span>
              <span>{project.progress}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-foreground/5">
              <div
                className={`h-full rounded-full ${projectColors.progress} transition-[width] duration-[600ms] ease-spring motion-reduce:transition-none`}
                style={{ width: `${Math.min(project.progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Tabs — scrollable with arrows when screen is narrow */}
        <div className="relative mb-6">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollTabs("left")}
              aria-label="Scroll tabs left"
              className="absolute left-0 top-0 z-10 flex h-full w-8 items-center justify-center border-r border-border/40 bg-background/95 text-foreground/70 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)] transition-colors hover:bg-foreground/5 hover:text-foreground dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollTabs("right")}
              aria-label="Scroll tabs right"
              className="absolute right-0 top-0 z-10 flex h-full w-8 items-center justify-center border-l border-border/40 bg-background/95 text-foreground/70 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.08)] transition-colors hover:bg-foreground/5 hover:text-foreground dark:shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.3)]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
          <div
            ref={tabsScrollRef}
            className={[
              "flex gap-1 overflow-x-auto scroll-smooth scrollbar-hide py-px",
              hasTabOverflow && "pl-8 pr-8",
            ].filter(Boolean).join(" ")}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => { tabButtonRefs.current[tab.id] = el; }}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className={[
                    "flex flex-shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none",
                    isActive
                      ? "border-violet-500 text-violet-600 dark:text-violet-400"
                      : "border-transparent text-foreground/50 hover:text-foreground",
                  ].join(" ")}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.id === "boards" && (
                    <span className="ml-1 rounded-full bg-foreground/5 px-1.5 py-0.5 text-[10px]">
                      {project.boards.length}
                    </span>
                  )}
                  {tab.id === "notebooks" && (
                    <span className="ml-1 rounded-full bg-foreground/5 px-1.5 py-0.5 text-[10px]">
                      {(project.notebooks ?? []).length}
                    </span>
                  )}
                  {tab.id === "members" && (
                    <span className="ml-1 rounded-full bg-foreground/5 px-1.5 py-0.5 text-[10px]">
                      {project.members.length + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "calendar" && (
          <ProjectCalendar
            projectId={project.id}
            projectName={project.name}
            startDate={project.startDate}
            endDate={project.endDate}
            deadline={project.deadline}
            color={project.color}
          />
        )}

        {activeTab === "boards" && (
          <BoardsTab
            boards={project.boards}
            canEdit={canEdit}
            onCreateBoard={() => setIsCreateBoardOpen(true)}
            onAddExisting={() => setIsAddExistingBoardOpen(true)}
            onRemoveBoard={handleRemoveBoard}
          />
        )}

        {activeTab === "notebooks" && (
          <NotebooksTab
            notebooks={project.notebooks ?? []}
            canEdit={canEdit}
            canCreateNotebook={userNotebookTotal < 5}
            onCreateNotebook={() => setIsCreateNotebookOpen(true)}
            onAddExisting={() => setIsAddExistingNotebookOpen(true)}
            onRemoveNotebook={handleRemoveNotebook}
            onOpenNotebook={openNotebook}
          />
        )}

        {activeTab === "members" && (
          <MembersTab
            project={project}
            isOwner={isOwner}
            onAddMember={() => setIsAddMemberOpen(true)}
            onMemberChanged={fetchProject}
          />
        )}

        {activeTab === "settings" && (
          <SettingsTab
            isOwner={isOwner}
            members={project.members}
            editName={editName}
            editDescription={editDescription}
            editColor={editColor}
            editStatus={editStatus}
            editProgress={editProgress}
            editStartDate={editStartDate}
            editEndDate={editEndDate}
            editDeadline={editDeadline}
            editShowEventsOnMainCalendar={editShowEventsOnMainCalendar}
            isSaving={isSaving}
            onNameChange={setEditName}
            onDescriptionChange={setEditDescription}
            onColorChange={setEditColor}
            onStatusChange={setEditStatus}
            onProgressChange={setEditProgress}
            onStartDateChange={setEditStartDate}
            onEndDateChange={setEditEndDate}
            onDeadlineChange={setEditDeadline}
            onShowEventsOnMainCalendarChange={setEditShowEventsOnMainCalendar}
            onSave={handleSaveSettings}
            onDelete={() => setDeleteConfirmOpen(true)}
            onLeave={handleLeaveProject}
            onTransferOwnership={handleTransferOwnership}
          />
        )}
      </div>

      {/* Dialogs */}
      <CreateBoardDialog
        isOpen={isCreateBoardOpen}
        error={createBoardError}
        onClose={() => { setIsCreateBoardOpen(false); setCreateBoardError(null); }}
        onCreateBoard={handleCreateBoard}
        onCreateProject={() => { /* no-op */ }}
      />

      <AddExistingBoardDialog
        isOpen={isAddExistingBoardOpen}
        projectBoardIds={project.boards.map((b) => b.id)}
        onClose={() => setIsAddExistingBoardOpen(false)}
        onAdd={handleAddExistingBoard}
      />

      <CreateNotebookDialog
        isOpen={isCreateNotebookOpen}
        error={createNotebookError}
        onClose={() => { setIsCreateNotebookOpen(false); setCreateNotebookError(null); }}
        onCreate={handleCreateNotebook}
      />

      <AddExistingNotebookDialog
        isOpen={isAddExistingNotebookOpen}
        projectNotebookIds={(project.notebooks ?? []).map((n) => n.id)}
        onClose={() => setIsAddExistingNotebookOpen(false)}
        onAdd={handleAddExistingNotebook}
      />

      <AddMemberDialog
        isOpen={isAddMemberOpen}
        projectId={projectId ?? ""}
        memberUserIds={
          project
            ? [project.ownerId, ...project.members.map((m) => m.userId)]
            : []
        }
        onClose={() => setIsAddMemberOpen(false)}
        onAdded={handleMemberAdded}
      />

      <ConfirmDialog
        isOpen={removeBoardTarget !== null}
        title="Remove Board from Project"
        message={`Remove "${removeBoardTarget?.name ?? "this board"}" from the project? The board itself will not be deleted.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={confirmRemoveBoard}
        onCancel={() => setRemoveBoardTarget(null)}
      />

      <ConfirmDialog
        isOpen={removeNotebookTarget !== null}
        title="Remove Notebook from Project"
        message={`Remove "${removeNotebookTarget?.name ?? "this notebook"}" from the project? The notebook itself will not be deleted.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={confirmRemoveNotebook}
        onCancel={() => setRemoveNotebookTarget(null)}
      />

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Delete Project"
        message={`Are you sure you want to delete "${project.name}"? Boards and notebooks will be unlinked but not deleted.`}
        confirmLabel="Delete Project"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={leaveConfirmOpen}
        title="Leave Project"
        message={`Are you sure you want to leave "${project.name}"? You can be re-invited to rejoin later.`}
        confirmLabel="Leave Project"
        cancelLabel="Stay"
        variant="danger"
        onConfirm={confirmLeaveProject}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={transferTarget !== null}
        title="Transfer Ownership"
        message={`Transfer ownership of "${project.name}" to ${transferTarget?.username ?? "this member"}? You will become an Editor and they will become the owner.`}
        confirmLabel="Transfer"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmTransferOwnership}
        onCancel={() => setTransferTarget(null)}
      />
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

interface BoardsTabProps {
  boards: BoardSummaryDto[];
  canEdit: boolean;
  onCreateBoard: () => void;
  onAddExisting: () => void;
  onRemoveBoard: (id: string) => void;
}

function BoardsTab({ boards, canEdit, onCreateBoard, onAddExisting, onRemoveBoard }: BoardsTabProps) {
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = typeFilter
    ? boards.filter((b) => b.boardType === typeFilter)
    : boards;

  const boardTypes = [
    { value: "", label: "All", icon: ClipboardList },
    { value: "NoteBoard", label: "Note Boards", icon: ClipboardList },
    { value: "ChalkBoard", label: "Chalk Boards", icon: PenTool },
  ];

  return (
    <div>
      {/* Filter + Add */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {boardTypes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTypeFilter(t.value)}
              className={[
                "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 motion-reduce:transition-none",
                typeFilter === t.value
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                  : "text-foreground/50 hover:bg-foreground/5 hover:text-foreground",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddExisting}
              className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground/70 transition-[colors,box-shadow] duration-150 hover:border-violet-400 hover:text-violet-600 hover:shadow-sm dark:hover:text-violet-400 motion-reduce:transition-none"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Add Existing
            </button>
            <button
              type="button"
              onClick={onCreateBoard}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none"
            >
              <Plus className="h-3.5 w-3.5" />
              New Board
            </button>
          </div>
        )}
      </div>

      {/* Board grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-background/40 py-14">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
            <ClipboardList className="h-5 w-5 text-foreground/30" />
          </div>
          <p className="mb-4 text-sm text-foreground/40">
            {typeFilter ? "No boards match this filter" : "No boards in this project yet"}
          </p>
          {canEdit && !typeFilter && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onAddExisting}
                className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground/60 transition-[colors,box-shadow] duration-150 hover:border-violet-400 hover:text-violet-600 hover:shadow-sm dark:hover:text-violet-400 motion-reduce:transition-none"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Add Existing Board
              </button>
              <button
                type="button"
                onClick={onCreateBoard}
                className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground/60 transition-[colors,box-shadow] duration-150 hover:border-primary/40 hover:text-primary hover:shadow-sm motion-reduce:transition-none"
              >
                <Plus className="h-3.5 w-3.5" />
                Create New Board
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              onDelete={canEdit ? onRemoveBoard : () => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NotebooksTabProps {
  notebooks: NotebookSummaryDto[];
  canEdit: boolean;
  canCreateNotebook: boolean;
  onCreateNotebook: () => void;
  onAddExisting: () => void;
  onRemoveNotebook: (id: string) => void;
  onOpenNotebook: (id: string) => void;
}

function NotebooksTab({
  notebooks,
  canEdit,
  canCreateNotebook,
  onCreateNotebook,
  onAddExisting,
  onRemoveNotebook,
  onOpenNotebook,
}: NotebooksTabProps) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          Notebooks ({notebooks.length})
        </h3>
        {canEdit && (
          <div className="flex items-center gap-2">
            {!canCreateNotebook && (
              <span className="text-xs text-foreground/50">
                Maximum 5 notebooks. Delete one to create another.
              </span>
            )}
            <button
              type="button"
              onClick={onAddExisting}
              className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground/70 transition-[colors,box-shadow] duration-150 hover:border-amber-400 hover:text-amber-600 hover:shadow-sm dark:hover:text-amber-400 motion-reduce:transition-none"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Add Existing
            </button>
            <button
              type="button"
              onClick={onCreateNotebook}
              disabled={!canCreateNotebook}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none"
            >
              <Plus className="h-3.5 w-3.5" />
              New Notebook
            </button>
          </div>
        )}
      </div>

      {notebooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-background/40 py-14">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
            <BookOpen className="h-5 w-5 text-foreground/30" />
          </div>
          <p className="mb-4 text-sm text-foreground/40">
            No notebooks in this project yet
          </p>
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              {!canCreateNotebook && (
                <span className="w-full text-xs text-foreground/50">
                  Maximum 5 notebooks. Delete one to create another.
                </span>
              )}
              <button
                type="button"
                onClick={onAddExisting}
                className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground/60 transition-[colors,box-shadow] duration-150 hover:border-amber-400 hover:text-amber-600 hover:shadow-sm dark:hover:text-amber-400 motion-reduce:transition-none"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Add Existing Notebook
              </button>
              <button
                type="button"
                onClick={onCreateNotebook}
                disabled={!canCreateNotebook}
                className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground/60 transition-[colors,box-shadow] duration-150 hover:border-primary/40 hover:text-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
              >
                <Plus className="h-3.5 w-3.5" />
                Create New Notebook
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {notebooks.map((notebook) => (
            <NotebookCard
              key={notebook.id}
              notebook={notebook}
              onOpen={onOpenNotebook}
              onRemoveFromProject={canEdit ? onRemoveNotebook : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MembersTabProps {
  project: ProjectDetailDto;
  isOwner: boolean;
  onAddMember: () => void;
  onMemberChanged: () => void;
}

function MembersTab({ project, isOwner, onAddMember, onMemberChanged }: MembersTabProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Team Members ({project.members.length + 1})
        </h3>
        {isOwner && (
          <button
            type="button"
            onClick={onAddMember}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Member
          </button>
        )}
      </div>
      <MemberList
        projectId={project.id}
        ownerId={project.ownerId}
        ownerUsername={project.ownerUsername}
        members={project.members}
        isOwner={isOwner}
        onChanged={onMemberChanged}
      />
    </div>
  );
}

const PROJECT_COLORS = [
  { value: "violet", label: "Violet", bg: "bg-violet-400", ring: "ring-violet-500" },
  { value: "sky", label: "Sky", bg: "bg-sky-400", ring: "ring-sky-500" },
  { value: "amber", label: "Amber", bg: "bg-amber-400", ring: "ring-amber-500" },
  { value: "rose", label: "Rose", bg: "bg-rose-400", ring: "ring-rose-500" },
  { value: "emerald", label: "Emerald", bg: "bg-emerald-400", ring: "ring-emerald-500" },
  { value: "orange", label: "Orange", bg: "bg-orange-400", ring: "ring-orange-500" },
];

interface SettingsTabProps {
  isOwner: boolean;
  members: ProjectMemberDto[];
  editName: string;
  editDescription: string;
  editColor: string;
  editStatus: string;
  editProgress: number;
  editStartDate: string;
  editEndDate: string;
  editDeadline: string;
  editShowEventsOnMainCalendar: boolean;
  isSaving: boolean;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onProgressChange: (v: number) => void;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onDeadlineChange: (v: string) => void;
  onShowEventsOnMainCalendarChange: (v: boolean) => void;
  onSave: (e: React.FormEvent) => void;
  onDelete: () => void;
  onLeave: () => void;
  onTransferOwnership: (member: ProjectMemberDto) => void;
}

function SettingsTab({
  isOwner,
  members,
  editName,
  editDescription,
  editColor,
  editStatus,
  editProgress,
  editStartDate,
  editEndDate,
  editDeadline,
  editShowEventsOnMainCalendar,
  isSaving,
  onNameChange,
  onDescriptionChange,
  onColorChange,
  onStatusChange,
  onProgressChange,
  onStartDateChange,
  onEndDateChange,
  onDeadlineChange,
  onShowEventsOnMainCalendarChange,
  onSave,
  onDelete,
  onLeave,
  onTransferOwnership,
}: SettingsTabProps) {
  const readOnly = !isOwner;
  const [transferPopupOpen, setTransferPopupOpen] = useState(false);

  return (
    <div className="max-w-lg">
      {readOnly && (
        <p className="mb-4 rounded-lg border border-foreground/10 bg-foreground/5 px-4 py-2 text-xs text-foreground/60">
          Only the project owner can change these settings.
        </p>
      )}
      <form onSubmit={onSave} className="flex flex-col gap-4">
        {/* Name */}
        <div>
          <label
            htmlFor="settings-name"
            className="mb-1.5 block text-xs font-medium text-foreground/60"
          >
            Project Name
          </label>
          <input
            id="settings-name"
            type="text"
            value={editName}
            onChange={(e) => onNameChange(e.target.value)}
            maxLength={100}
            readOnly={readOnly}
            disabled={readOnly}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-default disabled:opacity-70"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="settings-desc"
            className="mb-1.5 block text-xs font-medium text-foreground/60"
          >
            Description
          </label>
          <textarea
            id="settings-desc"
            value={editDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            maxLength={500}
            rows={3}
            readOnly={readOnly}
            disabled={readOnly}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-default disabled:opacity-70"
          />
        </div>

        {/* Color */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground/60">
            Color
          </label>
          <div className="flex gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => !readOnly && onColorChange(c.value)}
                disabled={readOnly}
                title={c.label}
                className={`h-7 w-7 rounded-full ${c.bg} transition-[transform,opacity,box-shadow] duration-150 ease-spring motion-reduce:transition-none ${
                  editColor === c.value
                    ? `ring-2 ${c.ring} ring-offset-2 ring-offset-background scale-110`
                    : "opacity-60 hover:opacity-100 hover:scale-105"
                } disabled:cursor-default disabled:opacity-70`}
              />
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label
            htmlFor="settings-status"
            className="mb-1.5 block text-xs font-medium text-foreground/60"
          >
            Status
          </label>
          <select
            id="settings-status"
            value={editStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            disabled={readOnly}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-default disabled:opacity-70"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Progress */}
        <div>
          <label
            htmlFor="settings-progress"
            className="mb-1.5 block text-xs font-medium text-foreground/60"
          >
            Progress ({editProgress}%)
          </label>
          <input
            id="settings-progress"
            type="range"
            min={0}
            max={100}
            value={editProgress}
            onChange={(e) => onProgressChange(Number(e.target.value))}
            disabled={readOnly}
            className="w-full accent-violet-500 disabled:cursor-default disabled:opacity-70"
          />
        </div>

        {/* Time constraints toggle */}
        <TimeConstraintsBlock
          editStartDate={editStartDate}
          editEndDate={editEndDate}
          editDeadline={editDeadline}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
          onDeadlineChange={onDeadlineChange}
          readOnly={readOnly}
        />

        {/* Show events on main calendar */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <label className="text-xs font-medium text-foreground/60">
              Calendar visibility
            </label>
            <p className="mt-0.5 text-xs text-foreground/50">
              Show project events on members&apos; main and dashboard calendars
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={editShowEventsOnMainCalendar}
            disabled={readOnly}
            onClick={() => !readOnly && onShowEventsOnMainCalendarChange(!editShowEventsOnMainCalendar)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-default disabled:opacity-70 ${
              readOnly ? "cursor-default" : "cursor-pointer"
            } ${editShowEventsOnMainCalendar ? "bg-primary" : "bg-foreground/20"}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                editShowEventsOnMainCalendar ? "translate-x-5" : "translate-x-0.5"
              }`}
              aria-hidden
            />
          </button>
        </div>

        {/* Save - owners only */}
        {isOwner && (
          <button
            type="submit"
            disabled={isSaving || !editName.trim()}
            className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </form>

      {/* Transfer ownership - owners only, when project has members */}
      {isOwner && members.length > 0 && (
        <div className="mt-10 rounded-lg border border-amber-200 p-4 dark:border-amber-900/40">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <UserCog className="h-4 w-4" />
            Transfer Ownership
          </h4>
          <p className="mt-1 text-xs text-foreground/50">
            Transfer ownership to another project member. You will become an
            Editor and they will become the owner.
          </p>
          <TransferOwnershipPopup
            members={members}
            isOpen={transferPopupOpen}
            onClose={() => setTransferPopupOpen(false)}
            onSelectMember={(member) => {
              setTransferPopupOpen(false);
              onTransferOwnership(member);
            }}
          />
          <button
            type="button"
            onClick={() => setTransferPopupOpen(true)}
            className="mt-3 flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-900/40"
          >
            <Crown className="h-3.5 w-3.5" />
            Transfer
          </button>
        </div>
      )}

      {/* Danger zone - owners: Delete; non-owners: Leave */}
      <div className="mt-10 rounded-lg border border-red-200 p-4 dark:border-red-900/40">
        <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">
          Danger Zone
        </h4>
        {isOwner ? (
          <>
            <p className="mt-1 text-xs text-foreground/50">
              Deleting this project will unlink all boards and notebooks. The
              boards and notebooks themselves will not be deleted.
            </p>
            <button
              type="button"
              onClick={onDelete}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Project
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-foreground/50">
              Leave this project. You can be re-invited to rejoin later.
            </p>
            <button
              type="button"
              onClick={onLeave}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
            >
              <LogOut className="h-3.5 w-3.5" />
              Leave Project
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* -- Transfer Ownership Popup --------------------------------- */

interface TransferOwnershipPopupProps {
  members: ProjectMemberDto[];
  isOpen: boolean;
  onClose: () => void;
  onSelectMember: (member: ProjectMemberDto) => void;
}

function TransferOwnershipPopup({
  members,
  isOpen,
  onClose,
  onSelectMember,
}: TransferOwnershipPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={() => {}}
        role="presentation"
      />
      <div className="relative mx-4 w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-foreground/50 transition-colors hover:bg-background hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="pr-8 text-base font-semibold text-foreground">
          Transfer ownership to
        </h3>
        <p className="mt-1 text-xs text-foreground/50">
          Select a project member to become the new owner.
        </p>
        <ul className="mt-4 divide-y divide-border/60">
          {members.map((member) => (
            <li key={member.userId}>
              <button
                type="button"
                onClick={() => onSelectMember(member)}
                className="flex w-full items-center gap-3 px-2 py-3 text-left transition-colors hover:bg-foreground/[0.04]"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-foreground/10">
                  <span className="text-xs font-medium text-foreground/70">
                    {member.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {member.username}
                  </span>
                  {member.email && (
                    <span className="block truncate text-xs text-foreground/50">
                      {member.email}
                    </span>
                  )}
                </div>
                <Crown className="h-4 w-4 flex-shrink-0 text-amber-500/60" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* -- Time Constraints Block (used in Settings tab) ------------ */

interface TimeConstraintsBlockProps {
  editStartDate: string;
  editEndDate: string;
  editDeadline: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onDeadlineChange: (v: string) => void;
  readOnly?: boolean;
}

function TimeConstraintsBlock({
  editStartDate,
  editEndDate,
  editDeadline,
  onStartDateChange,
  onEndDateChange,
  onDeadlineChange,
  readOnly = false,
}: TimeConstraintsBlockProps) {
  const hasConstraints = !!(editStartDate || editEndDate);

  function handleToggle(checked: boolean) {
    if (!readOnly && !checked) {
      onStartDateChange("");
      onEndDateChange("");
      onDeadlineChange("");
    }
  }

  return (
    <>
      <label
        htmlFor="settings-time-constraints"
        className={`flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 transition-colors ${readOnly ? "cursor-default opacity-70" : "cursor-pointer hover:bg-foreground/[0.02]"}`}
      >
        <input
          id="settings-time-constraints"
          type="checkbox"
          checked={hasConstraints}
          onChange={(e) => handleToggle(e.target.checked)}
          disabled={readOnly}
          className="h-4 w-4 rounded border-border text-primary accent-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-default"
        />
        <CalendarClock className="h-4 w-4 text-foreground/40" />
        <span className="text-sm font-medium text-foreground/70">
          {hasConstraints ? "Time constraints enabled" : "No time constraints (indefinite)"}
        </span>
      </label>

      {hasConstraints && (
        <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-foreground/[0.01] p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="settings-start"
                className="mb-1.5 block text-xs font-medium text-foreground/60"
              >
                Start Date
              </label>
              <input
                id="settings-start"
                type="date"
                value={editStartDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                disabled={readOnly}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-default disabled:opacity-70"
              />
            </div>
            <div>
              <label
                htmlFor="settings-end"
                className="mb-1.5 block text-xs font-medium text-foreground/60"
              >
                End Date
              </label>
              <input
                id="settings-end"
                type="date"
                value={editEndDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                disabled={readOnly}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-default disabled:opacity-70"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="settings-deadline"
              className="mb-1.5 block text-xs font-medium text-foreground/60"
            >
              Deadline <span className="text-foreground/30">(optional)</span>
            </label>
            <input
              id="settings-deadline"
              type="date"
              value={editDeadline}
              onChange={(e) => onDeadlineChange(e.target.value)}
              disabled={readOnly}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-default disabled:opacity-70"
            />
          </div>
        </div>
      )}
    </>
  );
}
