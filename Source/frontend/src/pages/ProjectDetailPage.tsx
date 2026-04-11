import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  FolderOpen,
  Folder,
  CalendarClock,
  LogOut,
  UserCog,
  X,
  Layers,
  ChevronDown,
  PenTool,
  Filter,
} from "lucide-react";
import {
  getProjectById,
  updateProject,
  updateMyProjectCalendarPreference,
  deleteProject,
  leaveProject,
  transferProjectOwnership,
  addBoardToProject,
  removeBoardFromProject,
  addNotebookToProject,
  removeNotebookFromProject,
  createProjectFolder,
  updateProjectFolder,
  deleteProjectFolder,
  setBoardProjectFolder,
  setNotebookProjectFolder,
} from "../api/projects";
import axios from "axios";

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const data = err.response.data as { message?: string };
    if (typeof data.message === "string" && data.message.trim()) return data.message;
  }
  return fallback;
}
import { createBoard, deleteBoard, updateBoard } from "../api/boards";
import { createNotebook, deleteNotebook, getNotebooks, updateNotebook } from "../api/notebooks";
import { BoardCard } from "../components/dashboard/BoardCard";
import { NotebookCard } from "../components/notebooks/NotebookCard";
import { CreateBoardDialog } from "../components/dashboard/CreateBoardDialog";
import { ConfirmDialog } from "../components/dashboard/ConfirmDialog";
import { ProjectCalendar } from "../components/calendar/ProjectCalendar";
import { MemberList } from "../components/projects/MemberList";
import { AddMemberDialog } from "../components/projects/AddMemberDialog";
import { AddExistingBoardDialog } from "../components/projects/AddExistingBoardDialog";
import { AddExistingNotebookDialog } from "../components/projects/AddExistingNotebookDialog";
import { CreateProjectFolderDialog } from "../components/projects/CreateProjectFolderDialog";
import {
  CollapsibleFolderBody,
  ProjectNamedFolderHeader,
} from "../components/projects/ProjectNamedFolderHeader";
import { useNudgeDropdownToViewport } from "../lib/useDropdownViewport";
import {
  DraggableProjectItem,
  FolderDropSurface,
  type ProjectItemDragPayload,
} from "../components/projects/ProjectFolderDnD";
import { CreateNotebookDialog } from "../components/notebooks/CreateNotebookDialog";
import type {
  ProjectDetailDto,
  BoardSummaryDto,
  NotebookSummaryDto,
  ProjectMemberDto,
  ProjectFolderDto,
} from "../types";
import { useOutletContext } from "react-router-dom";
import type { AppLayoutContext } from "../components/layout/AppLayout";

type TabId = "calendar" | "content" | "members" | "settings";

const TABS: { id: TabId; label: string; icon: typeof ClipboardList }[] = [
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "content", label: "Boards & notebooks", icon: Layers },
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
  const {
    openNotebook,
    setBoardName,
    closeBoard,
    refreshPinnedBoards,
    refreshPinnedNotebooks,
  } = useOutletContext<AppLayoutContext>();

  const [project, setProject] = useState<ProjectDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("calendar");
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [createBoardDefaultType, setCreateBoardDefaultType] = useState("NoteBoard");
  const [createBoardError, setCreateBoardError] = useState<string | null>(null);
  const [isAddExistingBoardOpen, setIsAddExistingBoardOpen] = useState(false);
  const [addExistingBoardInitialTab, setAddExistingBoardInitialTab] = useState<
    "NoteBoard" | "ChalkBoard"
  >("NoteBoard");
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
  const [deleteBoardTarget, setDeleteBoardTarget] = useState<BoardSummaryDto | null>(null);
  const [deleteNotebookTarget, setDeleteNotebookTarget] = useState<NotebookSummaryDto | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<ProjectFolderDto | null>(null);
  const [userNotebookTotal, setUserNotebookTotal] = useState(0);
  const [renameBoardTarget, setRenameBoardTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameBoardValue, setRenameBoardValue] = useState("");
  const [renameNotebookTarget, setRenameNotebookTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameNotebookValue, setRenameNotebookValue] = useState("");

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
  const [patchingMyCalendar, setPatchingMyCalendar] = useState(false);

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

  function handleDeleteBoard(boardId: string) {
    const board = project?.boards.find((b) => b.id === boardId) ?? null;
    if (board) setDeleteBoardTarget(board);
  }

  async function confirmDeleteBoard() {
    if (!deleteBoardTarget) return;
    const id = deleteBoardTarget.id;
    setDeleteBoardTarget(null);
    setProject((prev) =>
      prev ? { ...prev, boards: prev.boards.filter((b) => b.id !== id) } : prev,
    );
    closeBoard(id);
    try {
      await deleteBoard(id);
      refreshPinnedBoards();
    } catch {
      fetchProject();
    }
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

  function handleDeleteNotebook(notebookId: string) {
    const notebook = project?.notebooks?.find((n) => n.id === notebookId) ?? null;
    if (notebook) setDeleteNotebookTarget(notebook);
  }

  async function confirmDeleteNotebook() {
    if (!deleteNotebookTarget) return;
    const id = deleteNotebookTarget.id;
    setDeleteNotebookTarget(null);
    setProject((prev) =>
      prev
        ? { ...prev, notebooks: (prev.notebooks ?? []).filter((n) => n.id !== id) }
        : prev,
    );
    try {
      await deleteNotebook(id);
      refreshPinnedNotebooks();
      getNotebooks({ limit: 1 })
        .then((r) => setUserNotebookTotal(r.total))
        .catch(() => {});
    } catch {
      fetchProject();
    }
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

  async function handleCreateFolder(name: string) {
    if (!projectId) return;
    await createProjectFolder(projectId, { name });
    await fetchProject();
  }

  async function handleRenameFolder(folderId: string, name: string) {
    if (!projectId) return;
    await updateProjectFolder(projectId, folderId, { name });
    await fetchProject();
  }

  async function confirmDeleteFolder() {
    if (!deleteFolderTarget || !projectId) return;
    const folderId = deleteFolderTarget.id;
    setDeleteFolderTarget(null);
    try {
      await deleteProjectFolder(projectId, folderId);
      await fetchProject();
    } catch (err) {
      console.error("Failed to delete folder:", err);
    }
  }

  async function handleSetBoardFolder(boardId: string, folderId: string | null) {
    if (!projectId) return;
    try {
      await setBoardProjectFolder(projectId, boardId, { folderId });
      await fetchProject();
    } catch (err) {
      console.error("Failed to move board:", err);
    }
  }

  async function handleSetNotebookFolder(notebookId: string, folderId: string | null) {
    if (!projectId) return;
    try {
      await setNotebookProjectFolder(projectId, notebookId, { folderId });
      await fetchProject();
    } catch (err) {
      console.error("Failed to move notebook:", err);
    }
  }

  function handleRenameBoard(id: string, currentName: string) {
    setRenameBoardTarget({ id, name: currentName });
    setRenameBoardValue(currentName);
  }

  async function confirmRenameBoard() {
    if (!renameBoardTarget || !renameBoardValue.trim()) return;
    const { id } = renameBoardTarget;
    const newName = renameBoardValue.trim();
    setRenameBoardTarget(null);
    setProject((prev) =>
      prev
        ? {
            ...prev,
            boards: prev.boards.map((b) => (b.id === id ? { ...b, name: newName } : b)),
          }
        : prev,
    );
    try {
      await updateBoard(id, { name: newName });
    } catch {
      fetchProject();
    }
  }

  function handleRenameNotebook(id: string, currentName: string) {
    setRenameNotebookTarget({ id, name: currentName });
    setRenameNotebookValue(currentName);
  }

  async function confirmRenameNotebook() {
    if (!renameNotebookTarget || !renameNotebookValue.trim()) return;
    const { id } = renameNotebookTarget;
    const newName = renameNotebookValue.trim();
    setRenameNotebookTarget(null);
    setProject((prev) =>
      prev
        ? {
            ...prev,
            notebooks: (prev.notebooks ?? []).map((n) =>
              n.id === id ? { ...n, name: newName } : n,
            ),
          }
        : prev,
    );
    try {
      await updateNotebook(id, { name: newName });
    } catch {
      fetchProject();
    }
  }

  async function handleMyCalendarPreference(next: boolean | null) {
    if (!projectId) return;
    setPatchingMyCalendar(true);
    try {
      await updateMyProjectCalendarPreference(projectId, {
        showOnPersonalCalendar: next,
      });
      await fetchProject();
    } catch {
      // Silently fail
    } finally {
      setPatchingMyCalendar(false);
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
                  {tab.id === "content" && (
                    <span className="ml-1 rounded-full bg-foreground/5 px-1.5 py-0.5 text-[10px]">
                      {project.boards.length + (project.notebooks ?? []).length}
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

        {activeTab === "content" && (
          <ProjectContentTab
            boards={project.boards}
            notebooks={project.notebooks ?? []}
            folders={project.folders ?? []}
            canEdit={canEdit}
            canCreateNotebook={userNotebookTotal < 5}
            onCreateBoard={(boardType) => {
              setCreateBoardDefaultType(boardType);
              setIsCreateBoardOpen(true);
            }}
            onAddExistingBoard={(initialTab) => {
              setAddExistingBoardInitialTab(initialTab);
              setIsAddExistingBoardOpen(true);
            }}
            onRemoveBoard={handleRemoveBoard}
            onCreateNotebook={() => setIsCreateNotebookOpen(true)}
            onAddExistingNotebook={() => setIsAddExistingNotebookOpen(true)}
            onRemoveNotebook={handleRemoveNotebook}
            onOpenNotebook={openNotebook}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={(f) => setDeleteFolderTarget(f)}
            onSetBoardFolder={handleSetBoardFolder}
            onSetNotebookFolder={handleSetNotebookFolder}
            onRenameBoard={canEdit ? handleRenameBoard : undefined}
            onDeleteBoard={canEdit ? handleDeleteBoard : undefined}
            onRenameNotebook={canEdit ? handleRenameNotebook : undefined}
            onDeleteNotebook={canEdit ? handleDeleteNotebook : undefined}
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
            projectDefaultShowOnMainCalendar={project.showEventsOnMainCalendar ?? false}
            myShowOnPersonalCalendar={project.myShowOnPersonalCalendar ?? null}
            patchingMyCalendar={patchingMyCalendar}
            onMyCalendarPreferenceChange={handleMyCalendarPreference}
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
        defaultBoardType={createBoardDefaultType}
        hideProjectTab
        onClose={() => { setIsCreateBoardOpen(false); setCreateBoardError(null); }}
        onCreateBoard={handleCreateBoard}
        onCreateProject={() => { /* no-op */ }}
      />

      <AddExistingBoardDialog
        isOpen={isAddExistingBoardOpen}
        initialTab={addExistingBoardInitialTab}
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
        isOpen={deleteBoardTarget !== null}
        title="Delete Board"
        message={`Are you sure you want to delete "${deleteBoardTarget?.name ?? "this board"}"? All notes and index cards inside will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={() => void confirmDeleteBoard()}
        onCancel={() => setDeleteBoardTarget(null)}
      />

      <ConfirmDialog
        isOpen={deleteNotebookTarget !== null}
        title="Delete Notebook"
        message={`Are you sure you want to delete "${deleteNotebookTarget?.name ?? "this notebook"}"? All pages will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={() => void confirmDeleteNotebook()}
        onCancel={() => setDeleteNotebookTarget(null)}
      />

      <ConfirmDialog
        isOpen={deleteFolderTarget !== null}
        title="Delete Folder"
        message={`Delete folder "${deleteFolderTarget?.name ?? ""}"? Items in this folder will move below the folders (not in a folder).`}
        confirmLabel="Delete Folder"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteFolder}
        onCancel={() => setDeleteFolderTarget(null)}
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

      {renameBoardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setRenameBoardTarget(null)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Rename Board</h2>
            <input
              type="text"
              value={renameBoardValue}
              onChange={(e) => setRenameBoardValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void confirmRenameBoard();
              }}
              maxLength={100}
              className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameBoardTarget(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRenameBoard()}
                disabled={!renameBoardValue.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {renameNotebookTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setRenameNotebookTarget(null)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Rename Notebook</h2>
            <input
              type="text"
              value={renameNotebookValue}
              onChange={(e) => setRenameNotebookValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void confirmRenameNotebook();
              }}
              maxLength={100}
              className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameNotebookTarget(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRenameNotebook()}
                disabled={!renameNotebookValue.trim()}
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

/* ─── Sub-components ──────────────────────────────────────── */

/** null = show all types */
type LineContentFilter = "NoteBoard" | "ChalkBoard" | "Notebook" | null;

interface ProjectContentTabProps {
  boards: BoardSummaryDto[];
  notebooks: NotebookSummaryDto[];
  folders: ProjectFolderDto[];
  canEdit: boolean;
  canCreateNotebook: boolean;
  onCreateBoard: (defaultBoardType: string) => void;
  onAddExistingBoard: (initialTab: "NoteBoard" | "ChalkBoard") => void;
  onRemoveBoard: (id: string) => void;
  onCreateNotebook: () => void;
  onAddExistingNotebook: () => void;
  onRemoveNotebook: (id: string) => void;
  onOpenNotebook: (id: string) => void;
  onCreateFolder: (name: string) => void | Promise<void>;
  onRenameFolder: (folderId: string, name: string) => void | Promise<void>;
  onDeleteFolder: (folder: ProjectFolderDto) => void;
  onSetBoardFolder: (boardId: string, folderId: string | null) => void | Promise<void>;
  onSetNotebookFolder: (notebookId: string, folderId: string | null) => void | Promise<void>;
  onRenameBoard?: (id: string, currentName: string) => void;
  onDeleteBoard?: (id: string) => void;
  onRenameNotebook?: (id: string, currentName: string) => void;
  onDeleteNotebook?: (id: string) => void;
}

function ProjectContentTab({
  boards,
  notebooks,
  folders,
  canEdit,
  canCreateNotebook,
  onCreateBoard,
  onAddExistingBoard,
  onRemoveBoard,
  onCreateNotebook,
  onAddExistingNotebook,
  onRemoveNotebook,
  onOpenNotebook,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onSetBoardFolder,
  onSetNotebookFolder,
  onRenameBoard,
  onDeleteBoard,
  onRenameNotebook,
  onDeleteNotebook,
}: ProjectContentTabProps) {
  const [lineFilter, setLineFilter] = useState<LineContentFilter>(null);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [newFolderError, setNewFolderError] = useState<string | null>(null);
  const [isSavingNewFolder, setIsSavingNewFolder] = useState(false);
  const [renameFolderError, setRenameFolderError] = useState<string | null>(null);
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Record<string, boolean>>({});
  const [openMenu, setOpenMenu] = useState<"addExisting" | "new" | null>(null);
  const [dropHighlightKey, setDropHighlightKey] = useState<string | null>(null);
  const addExistingMenuRef = useRef<HTMLDivElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const addExistingPanelRef = useRef<HTMLDivElement>(null);
  const newMenuPanelRef = useRef<HTMLDivElement>(null);

  useNudgeDropdownToViewport(openMenu === "addExisting", addExistingPanelRef);
  useNudgeDropdownToViewport(openMenu === "new", newMenuPanelRef);

  const clearDropHighlight = useCallback(() => setDropHighlightKey(null), []);

  function handleDropToFolder(
    targetFolderId: string | null,
    payload: ProjectItemDragPayload,
  ) {
    if (!canEdit) return;
    if (payload.kind === "board") {
      const b = boards.find((x) => x.id === payload.id);
      if (!b) return;
      if ((b.projectFolderId ?? null) === targetFolderId) return;
      void onSetBoardFolder(payload.id, targetFolderId);
    } else {
      const n = notebooks.find((x) => x.id === payload.id);
      if (!n) return;
      if ((n.projectFolderId ?? null) === targetFolderId) return;
      void onSetNotebookFolder(payload.id, targetFolderId);
    }
  }

  useEffect(() => {
    if (!openMenu) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        addExistingMenuRef.current?.contains(target) ||
        newMenuRef.current?.contains(target)
      ) {
        return;
      }
      setOpenMenu(null);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [openMenu]);

  const sortedFolders = useMemo(
    () =>
      [...folders].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [folders],
  );

  const filteredBoards = useMemo(() => {
    if (lineFilter === "Notebook") return [];
    if (lineFilter === "NoteBoard") {
      return boards.filter(
        (b) => b.boardType === "NoteBoard" || b.boardType === "Calendar",
      );
    }
    if (lineFilter === "ChalkBoard") {
      return boards.filter((b) => b.boardType === "ChalkBoard");
    }
    return boards;
  }, [boards, lineFilter]);

  const visibleNotebooks = useMemo(() => {
    if (lineFilter === "NoteBoard" || lineFilter === "ChalkBoard") return [];
    if (lineFilter === "Notebook") return notebooks;
    return notebooks;
  }, [notebooks, lineFilter]);

  const unfiledBoards = useMemo(
    () => filteredBoards.filter((b) => !b.projectFolderId),
    [filteredBoards],
  );

  const unfiledNotebooks = useMemo(
    () => visibleNotebooks.filter((n) => !n.projectFolderId),
    [visibleNotebooks],
  );

  function toggleFolderCollapsed(folderId: string) {
    setCollapsedFolderIds((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  }

  const hasVisibleContent = useMemo(() => {
    if (unfiledBoards.length > 0 || unfiledNotebooks.length > 0) return true;
    return sortedFolders.some((f) => {
      const b = filteredBoards.filter((x) => x.projectFolderId === f.id).length;
      const n = visibleNotebooks.filter((x) => x.projectFolderId === f.id).length;
      return b + n > 0;
    });
  }, [unfiledBoards, unfiledNotebooks, sortedFolders, filteredBoards, visibleNotebooks]);

  const boardFilterMismatch =
    (lineFilter === "NoteBoard" || lineFilter === "ChalkBoard") &&
    boards.length > 0 &&
    filteredBoards.length === 0;

  const LINE_FILTER_CHIPS: { id: LineContentFilter; label: string }[] = [
    { id: null, label: "All" },
    { id: "NoteBoard", label: "NoteBoard" },
    { id: "ChalkBoard", label: "Chalkboard" },
    { id: "Notebook", label: "Notebook" },
  ];

  async function createFolderFromDialog(name: string) {
    if (isSavingNewFolder) return;
    setNewFolderError(null);
    setIsSavingNewFolder(true);
    try {
      await onCreateFolder(name);
      setIsNewFolderDialogOpen(false);
    } catch (err) {
      setNewFolderError(getApiErrorMessage(err, "Could not create folder."));
    } finally {
      setIsSavingNewFolder(false);
    }
  }

  async function submitRename(folderId: string) {
    const name = renameDraft.trim();
    if (!name) return;
    setRenameFolderError(null);
    try {
      await onRenameFolder(folderId, name);
      setRenamingFolderId(null);
    } catch (err) {
      setRenameFolderError(getApiErrorMessage(err, "Could not rename folder."));
    }
  }

  function emptyFolderHint(): string {
    if (lineFilter === null) return "No boards or notebooks in this folder";
    if (lineFilter === "Notebook") return "No notebooks in this folder";
    return "No boards in this folder";
  }

  const totalLinked = boards.length + notebooks.length;
  const emptyProject = totalLinked === 0 && sortedFolders.length === 0;

  function renderNotebookCell(notebook: NotebookSummaryDto) {
    return (
      <DraggableProjectItem
        key={notebook.id}
        kind="notebook"
        id={notebook.id}
        canEdit={canEdit}
        onDragEnd={clearDropHighlight}
      >
        <NotebookCard
          notebook={notebook}
          onOpen={onOpenNotebook}
          onRename={onRenameNotebook}
          onRemoveFromProject={canEdit ? onRemoveNotebook : undefined}
          onDelete={onDeleteNotebook}
          projectFolders={sortedFolders}
          onSetProjectFolder={canEdit ? onSetNotebookFolder : undefined}
        />
      </DraggableProjectItem>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className="flex items-center gap-1.5 text-foreground/45"
          title="Filter by type"
        >
          <Filter className="h-4 w-4 shrink-0" aria-hidden />
          <span className="sr-only">Filter by type</span>
        </span>
        {LINE_FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id ?? "all"}
            type="button"
            onClick={() => setLineFilter(chip.id)}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 motion-reduce:transition-none",
              lineFilter === chip.id
                ? "bg-violet-100 text-violet-700 ring-1 ring-violet-400/50 dark:bg-violet-900/40 dark:text-violet-300 dark:ring-violet-500/40"
                : "text-foreground/50 hover:bg-foreground/5 hover:text-foreground",
            ].join(" ")}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground/60">
          {lineFilter === null && (
            <>
              {boards.length} board{boards.length === 1 ? "" : "s"},{" "}
              {notebooks.length} notebook{notebooks.length === 1 ? "" : "s"}
            </>
          )}
          {lineFilter === "NoteBoard" && (
            <>
              {filteredBoards.length} note board{filteredBoards.length === 1 ? "" : "s"}
            </>
          )}
          {lineFilter === "ChalkBoard" && (
            <>
              {filteredBoards.length} chalk board{filteredBoards.length === 1 ? "" : "s"}
            </>
          )}
          {lineFilter === "Notebook" && (
            <>
              {notebooks.length} notebook{notebooks.length === 1 ? "" : "s"}
            </>
          )}
        </p>
        {canEdit && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!canCreateNotebook && (
              <span className="w-full text-right text-xs text-foreground/50 sm:w-auto">
                Maximum 5 notebooks. Delete one to create another.
              </span>
            )}
            <CreateProjectFolderDialog
              isOpen={isNewFolderDialogOpen}
              error={newFolderError}
              isSaving={isSavingNewFolder}
              accent="violet"
              onClose={() => {
                setIsNewFolderDialogOpen(false);
                setNewFolderError(null);
              }}
              onCreate={(name) => createFolderFromDialog(name)}
            />
            <div className="relative" ref={addExistingMenuRef}>
              <button
                type="button"
                onClick={() => setOpenMenu((m) => (m === "addExisting" ? null : "addExisting"))}
                className="flex items-center gap-1 rounded-lg border border-border/80 bg-background px-3 py-2 text-xs font-semibold text-foreground/80 shadow-sm transition-[colors,box-shadow] duration-150 hover:border-violet-400/60 hover:text-violet-700 dark:hover:text-violet-300 motion-reduce:transition-none"
              >
                Add existing
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
              {openMenu === "addExisting" && (
                <div
                  ref={addExistingPanelRef}
                  className="absolute right-0 top-full z-30 mt-1 max-h-[min(70vh,calc(100vh-2rem))] min-w-[13.5rem] max-w-[min(13.5rem,calc(100vw-1rem))] overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-md dark:shadow-black/40"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground/90 transition-colors hover:bg-foreground/5"
                    onClick={() => {
                      setOpenMenu(null);
                      onAddExistingBoard("NoteBoard");
                    }}
                  >
                    <ClipboardList className="h-3.5 w-3.5 shrink-0 text-foreground/50" />
                    Note board
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground/90 transition-colors hover:bg-foreground/5"
                    onClick={() => {
                      setOpenMenu(null);
                      onAddExistingBoard("ChalkBoard");
                    }}
                  >
                    <PenTool className="h-3.5 w-3.5 shrink-0 text-foreground/50" />
                    Chalk board
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground/90 transition-colors hover:bg-foreground/5"
                    onClick={() => {
                      setOpenMenu(null);
                      onAddExistingNotebook();
                    }}
                  >
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-foreground/50" />
                    Notebook
                  </button>
                </div>
              )}
            </div>
            <div className="relative" ref={newMenuRef}>
              <button
                type="button"
                onClick={() => setOpenMenu((m) => (m === "new" ? null : "new"))}
                className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none"
              >
                <Plus className="h-3.5 w-3.5" />
                New
                <ChevronDown className="h-3.5 w-3.5 opacity-90" />
              </button>
              {openMenu === "new" && (
                <div
                  ref={newMenuPanelRef}
                  className="absolute right-0 top-full z-30 mt-1 max-h-[min(70vh,calc(100vh-2rem))] min-w-[13.5rem] max-w-[min(13.5rem,calc(100vw-1rem))] overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-md dark:shadow-black/40"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground/90 transition-colors hover:bg-foreground/5"
                    onClick={() => {
                      setOpenMenu(null);
                      onCreateBoard("NoteBoard");
                    }}
                  >
                    <ClipboardList className="h-3.5 w-3.5 shrink-0 text-foreground/50" />
                    Note board
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground/90 transition-colors hover:bg-foreground/5"
                    onClick={() => {
                      setOpenMenu(null);
                      onCreateBoard("ChalkBoard");
                    }}
                  >
                    <PenTool className="h-3.5 w-3.5 shrink-0 text-foreground/50" />
                    Chalk board
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!canCreateNotebook}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground/90 transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => {
                      setOpenMenu(null);
                      onCreateNotebook();
                    }}
                  >
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-foreground/50" />
                    Notebook
                  </button>
                  <div className="my-1 h-px bg-border/60" />
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground/90 transition-colors hover:bg-foreground/5"
                    onClick={() => {
                      setOpenMenu(null);
                      setNewFolderError(null);
                      setIsNewFolderDialogOpen(true);
                    }}
                  >
                    <Folder className="h-3.5 w-3.5 shrink-0 text-foreground/50" />
                    Folder
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {emptyProject ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-background/40 py-14">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
            <Layers className="h-5 w-5 text-foreground/30" />
          </div>
          <p className="mb-4 text-center text-sm text-foreground/40">
            No boards or notebooks in this project yet
          </p>
          {canEdit && (
            <p className="max-w-sm text-center text-xs text-foreground/45">
              Use <strong className="font-medium text-foreground/65">Add existing</strong> or{" "}
              <strong className="font-medium text-foreground/65">+ New</strong> in the bar above.
            </p>
          )}
        </div>
      ) : lineFilter === "Notebook" && notebooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-background/40 py-14">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
            <BookOpen className="h-5 w-5 text-foreground/30" />
          </div>
          <p className="mb-4 text-sm text-foreground/40">No notebooks in this project yet</p>
          {canEdit && (
            <p className="max-w-sm text-center text-xs text-foreground/45">
              {!canCreateNotebook && (
                <span className="mb-2 block text-foreground/50">
                  Maximum 5 notebooks. Delete one to create another.
                </span>
              )}
              Use <strong className="font-medium text-foreground/65">Add existing</strong> or{" "}
              <strong className="font-medium text-foreground/65">+ New</strong> above.
            </p>
          )}
        </div>
      ) : (lineFilter === "NoteBoard" || lineFilter === "ChalkBoard") && boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-background/40 py-14">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
            <ClipboardList className="h-5 w-5 text-foreground/30" />
          </div>
          <p className="mb-4 text-sm text-foreground/40">No boards in this project yet</p>
          {canEdit && (
            <p className="max-w-sm text-center text-xs text-foreground/45">
              Use <strong className="font-medium text-foreground/65">Add existing</strong> or{" "}
              <strong className="font-medium text-foreground/65">+ New</strong> above.
            </p>
          )}
        </div>
      ) : boardFilterMismatch && !hasVisibleContent ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-background/40 py-14">
          <p className="text-sm text-foreground/40">No boards match this filter</p>
        </div>
      ) : !hasVisibleContent ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-background/40 py-14">
          <p className="text-sm text-foreground/40">Nothing to show for this filter</p>
        </div>
      ) : (
        <div className="space-y-10">
          {boardFilterMismatch && hasVisibleContent && (
            <div className="rounded-lg border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100/90">
              No boards match this filter — other items below are unchanged.
            </div>
          )}

          {lineFilter !== "Notebook" &&
            boards.length === 0 &&
            sortedFolders.length > 0 &&
            notebooks.length > 0 && (
            <div className="rounded-xl border border-dashed border-violet-300/40 bg-violet-50/40 px-4 py-6 text-center dark:border-violet-500/20 dark:bg-violet-950/20">
              <p className="mb-1 text-sm text-foreground/70">
                No boards yet — use <strong className="font-medium">Add existing</strong> or{" "}
                <strong className="font-medium">+ New</strong> above, or your folders below.
              </p>
            </div>
          )}

          {(lineFilter === null || lineFilter === "Notebook") &&
            notebooks.length === 0 &&
            sortedFolders.length > 0 &&
            filteredBoards.length > 0 && (
            <div className="rounded-xl border border-dashed border-amber-300/50 bg-amber-50/50 px-4 py-6 text-center dark:border-amber-500/20 dark:bg-amber-950/20">
              <p className="mb-1 text-sm text-foreground/70">
                No notebooks yet — use <strong className="font-medium">Add existing</strong> or{" "}
                <strong className="font-medium">+ New</strong> above. Folders below are ready when you
                add some.
              </p>
              {canEdit && !canCreateNotebook && (
                <p className="mt-2 text-xs text-foreground/50">
                  Maximum 5 notebooks. Delete one to create another.
                </p>
              )}
            </div>
          )}

          {sortedFolders.map((folder) => {
            const boardsInFolder = filteredBoards.filter((b) => b.projectFolderId === folder.id);
            const notebooksInFolder = visibleNotebooks.filter(
              (n) => n.projectFolderId === folder.id,
            );
            const isCollapsed = Boolean(collapsedFolderIds[folder.id]);
            const count = boardsInFolder.length + notebooksInFolder.length;
            return (
              <section key={folder.id}>
                <ProjectNamedFolderHeader
                  folder={folder}
                  accent="violet"
                  isCollapsed={isCollapsed}
                  onToggleCollapse={() => toggleFolderCollapsed(folder.id)}
                  itemCount={count}
                  canEdit={canEdit}
                  isRenaming={renamingFolderId === folder.id}
                  renameDraft={renameDraft}
                  onRenameDraftChange={(value) => {
                    setRenameDraft(value);
                    setRenameFolderError(null);
                  }}
                  onRenameSubmit={() => void submitRename(folder.id)}
                  onRenameCancel={() => {
                    setRenamingFolderId(null);
                    setRenameFolderError(null);
                  }}
                  onRenameStart={() => {
                    setRenamingFolderId(folder.id);
                    setRenameDraft(folder.name);
                    setRenameFolderError(null);
                  }}
                  onDelete={() => onDeleteFolder(folder)}
                  renameError={renameFolderError}
                />
                <CollapsibleFolderBody isCollapsed={isCollapsed}>
                  {canEdit ? (
                    <FolderDropSurface
                      dropKey={`folder-${folder.id}`}
                      highlightKey={dropHighlightKey}
                      onHighlight={setDropHighlightKey}
                      onDropPayload={(p) => handleDropToFolder(folder.id, p)}
                      className={
                        count === 0
                          ? "min-h-[5rem] px-1 py-2 sm:px-2"
                          : "px-1 pb-0 sm:px-2"
                      }
                    >
                      {count === 0 ? (
                        <p className="text-xs text-foreground/40">{emptyFolderHint()}</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                          {boardsInFolder.map((board) => (
                            <DraggableProjectItem
                              key={board.id}
                              kind="board"
                              id={board.id}
                              canEdit={canEdit}
                              onDragEnd={clearDropHighlight}
                            >
                              <BoardCard
                                board={board}
                                onRename={onRenameBoard}
                                onRemoveFromProject={onRemoveBoard}
                                onDelete={onDeleteBoard}
                                projectFolders={sortedFolders}
                                onSetProjectFolder={onSetBoardFolder}
                              />
                            </DraggableProjectItem>
                          ))}
                          {notebooksInFolder.map((notebook) => renderNotebookCell(notebook))}
                        </div>
                      )}
                    </FolderDropSurface>
                  ) : count === 0 ? (
                    <p className="text-xs text-foreground/40">{emptyFolderHint()}</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {boardsInFolder.map((board) => (
                        <BoardCard
                          key={board.id}
                          board={board}
                          onRename={onRenameBoard}
                          onRemoveFromProject={undefined}
                          onDelete={onDeleteBoard}
                          projectFolders={sortedFolders}
                          onSetProjectFolder={undefined}
                        />
                      ))}
                      {notebooksInFolder.map((notebook) => (
                        <NotebookCard
                          key={notebook.id}
                          notebook={notebook}
                          onOpen={onOpenNotebook}
                          onRename={onRenameNotebook}
                          onRemoveFromProject={undefined}
                          onDelete={onDeleteNotebook}
                          projectFolders={sortedFolders}
                          onSetProjectFolder={undefined}
                        />
                      ))}
                    </div>
                  )}
                </CollapsibleFolderBody>
              </section>
            );
          })}

          {sortedFolders.length > 0 &&
            (canEdit ||
              unfiledBoards.length > 0 ||
              unfiledNotebooks.length > 0) && (
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-300/60 to-border dark:via-violet-500/25" />
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-foreground/45">
                  Not in a folder
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-violet-300/60 to-border dark:via-violet-500/25" />
              </div>
            )}

          {sortedFolders.length > 0 && canEdit && (
            <FolderDropSurface
              dropKey="unfiled"
              highlightKey={dropHighlightKey}
              onHighlight={setDropHighlightKey}
              onDropPayload={(p) => handleDropToFolder(null, p)}
              className={
                unfiledBoards.length > 0 || unfiledNotebooks.length > 0
                  ? ""
                  : "min-h-[5rem]"
              }
            >
              {unfiledBoards.length > 0 || unfiledNotebooks.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {unfiledBoards.map((board) => (
                    <DraggableProjectItem
                      key={board.id}
                      kind="board"
                      id={board.id}
                      canEdit={canEdit}
                      onDragEnd={clearDropHighlight}
                    >
                      <BoardCard
                        board={board}
                        onRename={onRenameBoard}
                        onRemoveFromProject={onRemoveBoard}
                        onDelete={onDeleteBoard}
                        projectFolders={sortedFolders}
                        onSetProjectFolder={onSetBoardFolder}
                      />
                    </DraggableProjectItem>
                  ))}
                  {unfiledNotebooks.map((notebook) => renderNotebookCell(notebook))}
                </div>
              ) : (
                <div className="flex min-h-[4rem] items-center justify-center rounded-lg border border-dashed border-border/60 px-3 py-4 text-center">
                  <p className="text-xs text-foreground/45">
                    Drop here to move items out of folders
                  </p>
                </div>
              )}
            </FolderDropSurface>
          )}

          {sortedFolders.length > 0 &&
            !canEdit &&
            (unfiledBoards.length > 0 || unfiledNotebooks.length > 0) && (
              <section>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {unfiledBoards.map((board) => (
                    <BoardCard
                      key={board.id}
                      board={board}
                      onRename={onRenameBoard}
                      onRemoveFromProject={undefined}
                      onDelete={onDeleteBoard}
                      projectFolders={sortedFolders}
                      onSetProjectFolder={undefined}
                    />
                  ))}
                  {unfiledNotebooks.map((notebook) => (
                    <NotebookCard
                      key={notebook.id}
                      notebook={notebook}
                      onOpen={onOpenNotebook}
                      onRename={onRenameNotebook}
                      onRemoveFromProject={undefined}
                      onDelete={onDeleteNotebook}
                      projectFolders={sortedFolders}
                      onSetProjectFolder={undefined}
                    />
                  ))}
                </div>
              </section>
            )}

          {sortedFolders.length === 0 &&
            (unfiledBoards.length > 0 || unfiledNotebooks.length > 0) && (
              <section>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {unfiledBoards.map((board) => (
                    <DraggableProjectItem
                      key={board.id}
                      kind="board"
                      id={board.id}
                      canEdit={canEdit}
                      onDragEnd={clearDropHighlight}
                    >
                      <BoardCard
                        board={board}
                        onRename={onRenameBoard}
                        onRemoveFromProject={canEdit ? onRemoveBoard : undefined}
                        onDelete={onDeleteBoard}
                        projectFolders={sortedFolders}
                        onSetProjectFolder={canEdit ? onSetBoardFolder : undefined}
                      />
                    </DraggableProjectItem>
                  ))}
                  {unfiledNotebooks.map((notebook) => renderNotebookCell(notebook))}
                </div>
              </section>
            )}
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
  projectDefaultShowOnMainCalendar: boolean;
  myShowOnPersonalCalendar: boolean | null;
  patchingMyCalendar: boolean;
  onMyCalendarPreferenceChange: (next: boolean | null) => void;
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
  projectDefaultShowOnMainCalendar,
  myShowOnPersonalCalendar,
  patchingMyCalendar,
  onMyCalendarPreferenceChange,
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

  const effectivePersonalCalendar =
    myShowOnPersonalCalendar ?? projectDefaultShowOnMainCalendar;

  function handlePersonalCalendarToggle() {
    const nextEffective = !effectivePersonalCalendar;
    const nextStored =
      nextEffective === projectDefaultShowOnMainCalendar
        ? null
        : nextEffective;
    onMyCalendarPreferenceChange(nextStored);
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6 rounded-lg border border-border bg-foreground/[0.02] px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <label className="text-xs font-medium text-foreground/60">
              Your personal calendar
            </label>
            <p className="mt-0.5 text-xs text-foreground/50">
              Show this project&apos;s events on your main and dashboard calendars. If you
              haven&apos;t set your own choice, the owner&apos;s default below applies.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={effectivePersonalCalendar}
            disabled={patchingMyCalendar}
            onClick={() => !patchingMyCalendar && handlePersonalCalendarToggle()}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-wait disabled:opacity-60 ${
              patchingMyCalendar ? "cursor-wait" : "cursor-pointer"
            } ${effectivePersonalCalendar ? "bg-primary" : "bg-foreground/20"}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                effectivePersonalCalendar ? "translate-x-5" : "translate-x-0.5"
              }`}
              aria-hidden
            />
          </button>
        </div>
      </div>

      {readOnly && (
        <p className="mb-4 rounded-lg border border-foreground/10 bg-foreground/5 px-4 py-2 text-xs text-foreground/60">
          Only the project owner can change project details below.
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

        {/* Default for members' personal calendars (owner only) */}
        {isOwner && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <label className="text-xs font-medium text-foreground/60">
                Default for members
              </label>
              <p className="mt-0.5 text-xs text-foreground/50">
                Default &quot;on&quot; or &quot;off&quot; for members who have not set their own
                personal calendar choice. Each member can override this for themselves above.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={editShowEventsOnMainCalendar}
              onClick={() => onShowEventsOnMainCalendarChange(!editShowEventsOnMainCalendar)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                editShowEventsOnMainCalendar ? "bg-primary" : "bg-foreground/20"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                  editShowEventsOnMainCalendar ? "translate-x-5" : "translate-x-0.5"
                }`}
                aria-hidden
              />
            </button>
          </div>
        )}

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
