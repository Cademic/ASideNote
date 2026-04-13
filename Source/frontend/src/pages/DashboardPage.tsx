import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { AppLayoutContext } from "../components/layout/AppLayout";
import {
  Plus,
  ClipboardList,
  Calendar,
  CalendarDays,
  FolderOpen,
  BookOpen,
  Clock,
  PencilLine,
  ArrowRight,
  Users,
} from "lucide-react";
import axios from "axios";
import { getBoards, createBoard, deleteBoard, updateBoard, toggleBoardPin } from "../api/boards";
import {
  getProjects,
  createProject,
  addBoardToProject,
  addNotebookToProject,
  removeBoardFromProject,
  removeNotebookFromProject,
  setBoardProjectFolder,
  setNotebookProjectFolder,
  updateProject,
  toggleProjectPin,
  deleteProject,
  leaveProject,
} from "../api/projects";
import { getNotebooks, createNotebook, deleteNotebook, updateNotebook, toggleNotebookPin } from "../api/notebooks";
import { getFriends, getProfile } from "../api/users";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent,
} from "../api/calendar-events";
import { BoardCard } from "../components/dashboard/BoardCard";
import { MiniCalendar } from "../components/dashboard/MiniCalendar";
import { ProjectCard } from "../components/projects/ProjectCard";
import { NotebookCard } from "../components/notebooks/NotebookCard";
import { CreateNotebookDialog } from "../components/notebooks/CreateNotebookDialog";
import { ConfirmDialog } from "../components/dashboard/ConfirmDialog";
import { CreateBoardDialog } from "../components/dashboard/CreateBoardDialog";
import { CreateEventDialog } from "../components/calendar/CreateEventDialog";
import { EventDetailsPopup } from "../components/calendar/EventDetailsPopup";
import { useAuth } from "../context/AuthContext";
import type { BoardSummaryDto, CalendarEventDto, FriendDto, NotebookSummaryDto, ProjectSummaryDto } from "../types";
import { resolveEventProjectName } from "../utils/calendar-event-project-name";
import { isProjectVisibleOnUserCalendar } from "../utils/calendar-project-visibility";
import { formatElapsedSincePreviousSessionEnd } from "../utils/format-last-active";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTodaySticky(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { closeBoard, refreshPinnedBoards, refreshPinnedProjects, openNotebook, refreshPinnedNotebooks } = useOutletContext<AppLayoutContext>();
  const [boards, setBoards] = useState<BoardSummaryDto[]>([]);
  const [activeProjects, setActiveProjects] = useState<ProjectSummaryDto[]>([]);
  const [notebooks, setNotebooks] = useState<NotebookSummaryDto[]>([]);
  const [totalNotebooks, setTotalNotebooks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createBoardError, setCreateBoardError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BoardSummaryDto | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [projectRenameTarget, setProjectRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [projectRenameValue, setProjectRenameValue] = useState("");
  const [projectDeleteTarget, setProjectDeleteTarget] = useState<ProjectSummaryDto | null>(null);
  const [projectLeaveTarget, setProjectLeaveTarget] = useState<ProjectSummaryDto | null>(null);
  const [isCreateNotebookOpen, setIsCreateNotebookOpen] = useState(false);
  const [createNotebookError, setCreateNotebookError] = useState<string | null>(null);
  const [notebookRenameTarget, setNotebookRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [notebookRenameValue, setNotebookRenameValue] = useState("");
  const [notebookDeleteTarget, setNotebookDeleteTarget] = useState<NotebookSummaryDto | null>(null);
  const [friends, setFriends] = useState<FriendDto[]>([]);
  const [lastSessionEndedAt, setLastSessionEndedAt] = useState<string | null>(null);
  /** Bumps on an interval and when the tab becomes visible so elapsed time is always relative to "now". */
  const [lastActiveTick, setLastActiveTick] = useState(0);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventDto[]>([]);
  const [detailsEvent, setDetailsEvent] = useState<CalendarEventDto | null>(null);
  const [calendarEventDialogOpen, setCalendarEventDialogOpen] = useState(false);
  const [calendarEventDialogDate, setCalendarEventDialogDate] = useState("");
  const [editingCalendarEvent, setEditingCalendarEvent] = useState<CalendarEventDto | null>(null);

  const refreshCalendarEvents = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = new Date(today);
    future.setDate(future.getDate() + 90);
    try {
      const result = await getCalendarEvents({
        from: today.toISOString(),
        to: future.toISOString(),
      });
      setCalendarEvents(result);
    } catch {
      setCalendarEvents([]);
    }
  }, []);

  const fetchBoards = useCallback(async () => {
    try {
      setError(null);
      const [boardResult, projectResult, notebookResult] = await Promise.all([
        getBoards({ limit: 100 }),
        getProjects({ status: "Active" }).catch(() => [] as ProjectSummaryDto[]),
        getNotebooks({ limit: 100 }).catch(() => ({ items: [] as NotebookSummaryDto[], total: 0 })),
      ]);
      setBoards(boardResult.items);
      setActiveProjects(projectResult);
      setNotebooks(notebookResult.items);
      setTotalNotebooks(notebookResult.total ?? 0);
    } catch {
      setError("Failed to load boards.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** After project prefs change (e.g. personal calendar visibility), reload projects and calendar events so the dashboard mini-calendar updates immediately. */
  const refreshProjectsAndCalendar = useCallback(async () => {
    await fetchBoards();
    await refreshCalendarEvents();
  }, [fetchBoards, refreshCalendarEvents]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    getFriends().then(setFriends).catch(() => setFriends([]));
    getProfile()
      .then((p) => setLastSessionEndedAt(p.lastSessionEndAt ?? null))
      .catch(() => setLastSessionEndedAt(null));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setLastActiveTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      void getProfile()
        .then((p) => setLastSessionEndedAt(p.lastSessionEndAt ?? null))
        .catch(() => {});
      setLastActiveTick((t) => t + 1);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    void refreshCalendarEvents();
  }, [refreshCalendarEvents]);

  function handleEditFromEventDetails() {
    if (!detailsEvent) return;
    setEditingCalendarEvent(detailsEvent);
    setDetailsEvent(null);
    setCalendarEventDialogDate("");
    setCalendarEventDialogOpen(true);
  }

  async function handleCalendarEventSave(data: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    isAllDay: boolean;
    color: string;
    eventType: string;
    startHour: string;
    endHour: string;
    recurrenceFrequency: string;
    recurrenceInterval: number;
    recurrenceEndDate: string;
  }) {
    try {
      const toDateUtc = (dateStr: string, hour: string, allDay: boolean) =>
        allDay ? `${dateStr}T12:00:00.000Z` : `${dateStr}T${hour}:00:00.000Z`;

      const startIso = toDateUtc(data.startDate, data.startHour, data.isAllDay);
      const endIso = data.endDate
        ? toDateUtc(data.endDate, data.endHour, data.isAllDay)
        : undefined;

      const recurrence = data.recurrenceFrequency
        ? {
            recurrenceFrequency: data.recurrenceFrequency,
            recurrenceInterval: data.recurrenceInterval,
            recurrenceEndDate: data.recurrenceEndDate
              ? `${data.recurrenceEndDate}T12:00:00.000Z`
              : undefined,
          }
        : {
            recurrenceFrequency: undefined,
            recurrenceInterval: 1,
            recurrenceEndDate: undefined,
          };

      const eventId = editingCalendarEvent?.recurrenceSourceId ?? editingCalendarEvent?.id;

      if (editingCalendarEvent && eventId) {
        await updateCalendarEvent(eventId, {
          title: data.title,
          description: data.description || undefined,
          startDate: startIso,
          endDate: endIso,
          isAllDay: data.isAllDay,
          color: data.color,
          eventType: data.eventType,
          ...recurrence,
        });
      } else {
        await createCalendarEvent({
          title: data.title,
          description: data.description || undefined,
          startDate: startIso,
          endDate: endIso,
          isAllDay: data.isAllDay,
          color: data.color,
          eventType: data.eventType,
          ...recurrence,
        });
      }
      setCalendarEventDialogOpen(false);
      setEditingCalendarEvent(null);
      await refreshCalendarEvents();
    } catch {
      console.error("Failed to save calendar event");
    }
  }

  async function handleCalendarEventDelete() {
    if (!editingCalendarEvent) return;
    try {
      const eventId = editingCalendarEvent.recurrenceSourceId ?? editingCalendarEvent.id;
      await deleteCalendarEvent(eventId);
      setCalendarEventDialogOpen(false);
      setEditingCalendarEvent(null);
      await refreshCalendarEvents();
    } catch {
      console.error("Failed to delete calendar event");
    }
  }

  async function handleCreateBoard(name: string, description: string, boardType: string) {
    try {
      setCreateBoardError(null);
      const created = await createBoard({
        name,
        description: description || undefined,
        boardType,
      });
      setBoards((prev) => [created, ...prev]);
      setIsCreateOpen(false);
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

  async function handleCreateProject(
    name: string,
    description: string,
    color: string,
    startDate?: string,
    endDate?: string,
    deadline?: string,
  ) {
    try {
      setCreateBoardError(null);
      const created = await createProject({
        name,
        description: description || undefined,
        color,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        deadline: deadline || undefined,
      });
      navigate(`/projects/${created.id}`);
      setIsCreateOpen(false);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setCreateBoardError(err.response.data?.message ?? "A project with that name already exists.");
      } else {
        setCreateBoardError("Failed to create project. Please try again.");
        console.error("Failed to create project:", err);
      }
    }
  }

  function handleDelete(id: string) {
    const board = boards.find((b) => b.id === id) ?? null;
    if (board) setDeleteTarget(board);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setBoards((prev) => prev.filter((b) => b.id !== id));
    closeBoard(id);
    try {
      await deleteBoard(id);
    } catch {
      fetchBoards();
    }
  }

  function handleRename(id: string, currentName: string) {
    setRenameTarget({ id, name: currentName });
    setRenameValue(currentName);
  }

  async function confirmRename() {
    if (!renameTarget || !renameValue.trim()) return;
    const { id } = renameTarget;
    const newName = renameValue.trim();
    setRenameTarget(null);
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, name: newName } : b)));
    try {
      await updateBoard(id, { name: newName });
    } catch {
      fetchBoards();
    }
  }

  async function handleMoveToProject(boardId: string, projectId: string, folderId?: string) {
    const board = boards.find((b) => b.id === boardId);
    if (folderId !== undefined) {
      if (board?.projectId === projectId) {
        try {
          await setBoardProjectFolder(projectId, boardId, { folderId });
          setBoards((prev) =>
            prev.map((b) =>
              b.id === boardId ? { ...b, projectFolderId: folderId } : b,
            ),
          );
        } catch {
          console.error("Failed to set board folder");
          fetchBoards();
        }
        return;
      }
      try {
        await addBoardToProject(projectId, boardId);
        await setBoardProjectFolder(projectId, boardId, { folderId });
        setBoards((prev) =>
          prev.map((b) =>
            b.id === boardId ? { ...b, projectId, projectFolderId: folderId } : b,
          ),
        );
      } catch {
        console.error("Failed to move board to project folder");
        fetchBoards();
      }
      return;
    }
    if (board?.projectId === projectId) {
      try {
        await removeBoardFromProject(projectId, boardId);
        setBoards((prev) =>
          prev.map((b) =>
            b.id === boardId ? { ...b, projectId: null, projectFolderId: null } : b,
          ),
        );
      } catch {
        console.error("Failed to remove board from project");
      }
      return;
    }
    try {
      await addBoardToProject(projectId, boardId);
      await setBoardProjectFolder(projectId, boardId, { folderId: null });
      setBoards((prev) =>
        prev.map((b) =>
          b.id === boardId ? { ...b, projectId, projectFolderId: null } : b,
        ),
      );
    } catch {
      console.error("Failed to move board to project");
      fetchBoards();
    }
  }

  async function handleAddNotebookToProject(
    notebookId: string,
    projectId: string,
    folderId?: string,
  ) {
    const notebook = notebooks.find((n) => n.id === notebookId);
    if (folderId !== undefined) {
      if (notebook?.projectId === projectId) {
        try {
          await setNotebookProjectFolder(projectId, notebookId, { folderId });
          setNotebooks((prev) =>
            prev.map((n) =>
              n.id === notebookId ? { ...n, projectFolderId: folderId } : n,
            ),
          );
        } catch {
          console.error("Failed to set notebook folder");
          fetchBoards();
        }
        return;
      }
      try {
        await addNotebookToProject(projectId, notebookId);
        await setNotebookProjectFolder(projectId, notebookId, { folderId });
        setNotebooks((prev) =>
          prev.map((n) =>
            n.id === notebookId ? { ...n, projectId, projectFolderId: folderId } : n,
          ),
        );
      } catch {
        console.error("Failed to add notebook to project folder");
        fetchBoards();
      }
      return;
    }
    if (notebook?.projectId === projectId) {
      try {
        await removeNotebookFromProject(projectId, notebookId);
        setNotebooks((prev) =>
          prev.map((n) =>
            n.id === notebookId ? { ...n, projectId: null, projectFolderId: null } : n,
          ),
        );
      } catch {
        console.error("Failed to remove notebook from project");
      }
      return;
    }
    try {
      await addNotebookToProject(projectId, notebookId);
      await setNotebookProjectFolder(projectId, notebookId, { folderId: null });
      setNotebooks((prev) =>
        prev.map((n) =>
          n.id === notebookId ? { ...n, projectId, projectFolderId: null } : n,
        ),
      );
    } catch {
      console.error("Failed to add notebook to project");
      fetchBoards();
    }
  }

  async function handleTogglePin(id: string, isPinned: boolean) {
    setBoards((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, isPinned, pinnedAt: isPinned ? new Date().toISOString() : null } : b,
      ),
    );
    try {
      await toggleBoardPin(id, isPinned);
      refreshPinnedBoards();
    } catch {
      fetchBoards();
    }
  }

  function handleRenameProject(id: string, currentName: string) {
    setProjectRenameTarget({ id, name: currentName });
    setProjectRenameValue(currentName);
  }

  async function confirmRenameProject() {
    if (!projectRenameTarget || !projectRenameValue.trim()) return;
    const { id } = projectRenameTarget;
    const newName = projectRenameValue.trim();
    const project = activeProjects.find((p) => p.id === id);
    setProjectRenameTarget(null);
    setActiveProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p)),
    );
    try {
      await updateProject(id, {
        name: newName,
        status: project?.status ?? "Active",
        progress: project?.progress ?? 0,
      });
    } catch {
      fetchBoards();
    }
  }

  async function handleToggleProjectPin(id: string, isPinned: boolean) {
    setActiveProjects((prev) =>
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
      fetchBoards();
    }
  }

  function handleDeleteProject(id: string) {
    const project = activeProjects.find((p) => p.id === id) ?? null;
    if (project) setProjectDeleteTarget(project);
  }

  async function confirmDeleteProject() {
    if (!projectDeleteTarget) return;
    const id = projectDeleteTarget.id;
    setProjectDeleteTarget(null);
    setActiveProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteProject(id);
      refreshPinnedProjects();
    } catch {
      fetchBoards();
    }
  }

  function handleLeaveProject(id: string) {
    const project = activeProjects.find((p) => p.id === id) ?? null;
    if (project) setProjectLeaveTarget(project);
  }

  async function confirmLeaveProject() {
    if (!projectLeaveTarget) return;
    const id = projectLeaveTarget.id;
    setProjectLeaveTarget(null);
    setActiveProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await leaveProject(id);
      refreshPinnedProjects();
    } catch {
      fetchBoards();
    }
  }

  async function handleCreateNotebook(name: string) {
    try {
      setCreateNotebookError(null);
      const created = await createNotebook({ name });
      setNotebooks((prev) => [created, ...prev]);
      setTotalNotebooks((t) => t + 1);
      setIsCreateNotebookOpen(false);
      setIsCreateOpen(false); // close Get Started modal if it was used
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

  function handleRenameNotebook(id: string, currentName: string) {
    setNotebookRenameTarget({ id, name: currentName });
    setNotebookRenameValue(currentName);
  }

  async function confirmRenameNotebook() {
    if (!notebookRenameTarget || !notebookRenameValue.trim()) return;
    const { id } = notebookRenameTarget;
    const newName = notebookRenameValue.trim();
    setNotebookRenameTarget(null);
    setNotebooks((prev) => prev.map((n) => (n.id === id ? { ...n, name: newName } : n)));
    try {
      await updateNotebook(id, { name: newName });
    } catch {
      fetchBoards();
    }
  }

  async function handleToggleNotebookPin(id: string, isPinned: boolean) {
    setNotebooks((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, isPinned, pinnedAt: isPinned ? new Date().toISOString() : null } : n,
      ),
    );
    try {
      await toggleNotebookPin(id, isPinned);
      refreshPinnedNotebooks();
    } catch {
      fetchBoards();
    }
  }

  function handleDeleteNotebook(id: string) {
    const notebook = notebooks.find((n) => n.id === id) ?? null;
    if (notebook) setNotebookDeleteTarget(notebook);
  }

  async function confirmDeleteNotebook() {
    if (!notebookDeleteTarget) return;
    const id = notebookDeleteTarget.id;
    setNotebookDeleteTarget(null);
    setNotebooks((prev) => prev.filter((n) => n.id !== id));
    setTotalNotebooks((t) => Math.max(0, t - 1));
    try {
      await deleteNotebook(id);
      refreshPinnedNotebooks();
    } catch {
      fetchBoards();
    }
  }

  /** Boards sorted by last updated (opened recently) */
  const allBoards = useMemo(
    () => [...boards].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [boards],
  );

  /** Projects sorted by most recently created/updated (opened recently) */
  const activeProjectsSorted = useMemo(
    () =>
      [...activeProjects].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [activeProjects],
  );

  const projectsOnCalendar = useMemo(
    () => activeProjectsSorted.filter(isProjectVisibleOnUserCalendar),
    [activeProjectsSorted],
  );

  /** Notebooks sorted by last updated */
  const notebooksSorted = useMemo(
    () => [...notebooks].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [notebooks],
  );

  const nextUpcoming = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    type Candidate = { startMs: number; title: string; event?: CalendarEventDto; project?: ProjectSummaryDto };
    const candidates: Candidate[] = [];

    for (const ev of calendarEvents) {
      const start = new Date(ev.startDate).getTime();
      if (start >= todayMs) {
        candidates.push({ startMs: start, title: ev.title, event: ev });
      }
    }
    for (const proj of activeProjects) {
      if (!isProjectVisibleOnUserCalendar(proj)) continue;
      if (proj.startDate) {
        const start = new Date(proj.startDate).getTime();
        if (start >= todayMs) {
          candidates.push({ startMs: start, title: proj.name, project: proj });
        }
      }
    }

    if (candidates.length === 0) return { display: "No upcoming events", event: undefined, project: undefined };
    candidates.sort((a, b) => a.startMs - b.startMs);
    const first = candidates[0];
    return { display: first.title, event: first.event, project: first.project };
  }, [calendarEvents, activeProjects]);

  const friendsOnline = useMemo(
    () => friends.filter((f) => f.presenceStatus === "active" || f.presenceStatus === "idle").length,
    [friends],
  );

  const projectNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of activeProjects) {
      map[p.id] = p.name;
    }
    return map;
  }, [activeProjects]);

  const lastActiveDisplay = useMemo(() => {
    void lastActiveTick;
    if (!lastSessionEndedAt) return "—";
    return formatElapsedSincePreviousSessionEnd(lastSessionEndedAt);
  }, [lastSessionEndedAt, lastActiveTick]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-foreground/60">Loading your workspace...</span>
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
            onClick={fetchBoards}
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
        {/* ── Welcome Notepad ───────────────────────────── */}
        <div className="notepad-card mb-8">
          <div className="notepad-spiral-strip" />
          <div className="notepad-body relative px-8 py-6 sm:px-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {getGreeting()}, {user?.username ?? "there"}
                </h1>
                <p className="notepad-ruled-line mt-2 max-w-md pb-1.5 text-sm text-foreground/50">
                  Your workspace is ready. What would you like to create today?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:bg-amber-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
              >
                <Plus className="h-4 w-4" />
                <span>Get Started</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Quick Stats — Sticky Notes ─────────────────── */}
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatSticky
            color="yellow"
            icon={CalendarDays}
            label="Today's Date"
            value={formatTodaySticky()}
            rotation={-2}
            onClick={() => navigate("/calendar")}
          />
          <StatSticky
            color="rose"
            icon={Calendar}
            label="Next Up"
            value={nextUpcoming.display}
            rotation={1.5}
            onClick={
              nextUpcoming.event
                ? () => setDetailsEvent(nextUpcoming.event!)
                : nextUpcoming.project
                  ? () => navigate(`/projects/${nextUpcoming.project!.id}`)
                  : undefined
            }
          />
          <StatSticky
            color="sky"
            icon={Users}
            label="Friends Online"
            value={friendsOnline.toString()}
            rotation={-1}
            onClick={() => navigate("/profile")}
          />
          <StatSticky
            color="green"
            icon={Clock}
            label="Last Active"
            value={lastActiveDisplay}
            valueTooltip={
              lastSessionEndedAt
                ? `Previous session ended: ${new Date(lastSessionEndedAt).toLocaleString()}`
                : undefined
            }
            rotation={2}
          />
        </div>

        {/* ── Calendar ──────────────────────────────────── */}
        <NotebookSection
          icon={Calendar}
          title="Calendar"
          count={0}
          accentColor="sky"
        >
          <MiniCalendar projects={projectsOnCalendar} />
        </NotebookSection>

        {/* ── Active Projects ────────────────────────────── */}
        <NotebookSection
          icon={FolderOpen}
          title="Projects"
          count={activeProjectsSorted.length}
          accentColor="violet"
        >
          {activeProjectsSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-background/40 py-14">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
                <FolderOpen className="h-5 w-5 text-foreground/30" />
              </div>
              <p className="mb-4 text-sm text-foreground/40">
                No active projects yet
              </p>
              <button
                type="button"
                onClick={() => navigate("/projects")}
                className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground/60 transition-[colors,box-shadow] duration-150 hover:border-primary/40 hover:text-primary hover:shadow-sm motion-reduce:transition-none"
              >
                <Plus className="h-3.5 w-3.5" />
                Create your first project
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {activeProjectsSorted.slice(0, 3).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onRename={handleRenameProject}
                    onTogglePin={handleToggleProjectPin}
                    onDelete={handleDeleteProject}
                    onLeave={handleLeaveProject}
                    onProjectUpdated={refreshProjectsAndCalendar}
                  />
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/projects")}
                  className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground/60 transition-[colors,box-shadow] duration-150 hover:border-violet-400 hover:text-violet-600 hover:shadow-sm dark:hover:text-violet-400 motion-reduce:transition-none"
                >
                  View All Projects
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </NotebookSection>

        {/* ── Notebooks ─────────────────────────────────── */}
        <NotebookSection
          icon={BookOpen}
          title="Notebooks"
          count={notebooksSorted.length}
          accentColor="amber"
        >
          {notebooksSorted.length === 0 ? (
            <BlankPageEmpty
              message="No notebooks yet"
              actionLabel="Create your first notebook"
              onAction={() => navigate("/notebooks")}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {notebooksSorted.slice(0, 6).map((notebook) => (
                  <NotebookCard
                    key={notebook.id}
                    notebook={notebook}
                    onOpen={openNotebook}
                    onRename={handleRenameNotebook}
                    onTogglePin={handleToggleNotebookPin}
                    onDelete={handleDeleteNotebook}
                    onAddToProject={handleAddNotebookToProject}
                    activeProjects={activeProjectsSorted}
                  />
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/notebooks")}
                  className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-amber-400 hover:text-amber-900 hover:border-amber-400/50 dark:hover:bg-amber-500/20 dark:hover:text-amber-300 dark:hover:border-amber-500/30"
                >
                  View all Notebooks
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </NotebookSection>

        {/* ── Boards (Note + Chalk) ─────────────────────── */}
        <NotebookSection
          icon={ClipboardList}
          title="Boards"
          count={allBoards.length}
          accentColor="amber"
        >
          {allBoards.length === 0 ? (
            <BlankPageEmpty
              message="No boards yet"
              actionLabel="Create your first board"
              onAction={() => setIsCreateOpen(true)}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {allBoards.slice(0, 6).map((board) => (
                  <BoardCard
                    key={board.id}
                    board={board}
                    onDelete={handleDelete}
                    onRename={handleRename}
                    onMoveToProject={handleMoveToProject}
                    onTogglePin={handleTogglePin}
                    activeProjects={activeProjectsSorted}
                  />
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/boards")}
                  className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-amber-400 hover:text-amber-900 hover:border-amber-400/50 dark:hover:bg-amber-500/20 dark:hover:text-amber-300 dark:hover:border-amber-500/30"
                >
                  View All Boards
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </NotebookSection>
      </div>

      <CreateBoardDialog
        isOpen={isCreateOpen}
        error={createBoardError}
        createNotebookError={createNotebookError}
        canCreateNotebook={totalNotebooks < 5}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateBoardError(null);
          setCreateNotebookError(null);
        }}
        onCreateBoard={handleCreateBoard}
        onCreateProject={handleCreateProject}
        onCreateNotebook={handleCreateNotebook}
      />

      <CreateNotebookDialog
        isOpen={isCreateNotebookOpen}
        error={createNotebookError}
        onClose={() => { setIsCreateNotebookOpen(false); setCreateNotebookError(null); }}
        onCreate={handleCreateNotebook}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Board"
        message={`Are you sure you want to delete "${deleteTarget?.name ?? "this board"}"? All notes and index cards inside will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={projectDeleteTarget !== null}
        title="Delete Project"
        message={`Are you sure you want to delete "${projectDeleteTarget?.name ?? "this project"}"? All boards will be unlinked but not deleted.`}
        confirmLabel="Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={confirmDeleteProject}
        onCancel={() => setProjectDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={projectLeaveTarget !== null}
        title="Leave Project"
        message={`Are you sure you want to leave "${projectLeaveTarget?.name ?? "this project"}"? You can be re-invited to rejoin later.`}
        confirmLabel="Leave Project"
        cancelLabel="Stay"
        variant="danger"
        onConfirm={confirmLeaveProject}
        onCancel={() => setProjectLeaveTarget(null)}
      />

      <ConfirmDialog
        isOpen={notebookDeleteTarget !== null}
        title="Delete Notebook"
        message={`Are you sure you want to delete "${notebookDeleteTarget?.name ?? "this notebook"}"? All pages will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={confirmDeleteNotebook}
        onCancel={() => setNotebookDeleteTarget(null)}
      />

      {detailsEvent && (
        <EventDetailsPopup
          event={detailsEvent}
          projectName={resolveEventProjectName(detailsEvent, projectNameMap)}
          isOpen={!!detailsEvent}
          onClose={() => setDetailsEvent(null)}
          onEdit={handleEditFromEventDetails}
        />
      )}

      <CreateEventDialog
        isOpen={calendarEventDialogOpen}
        onClose={() => {
          setCalendarEventDialogOpen(false);
          setEditingCalendarEvent(null);
        }}
        onSave={handleCalendarEventSave}
        onDelete={editingCalendarEvent ? handleCalendarEventDelete : undefined}
        initialDate={calendarEventDialogDate}
        editEvent={editingCalendarEvent}
      />

      {/* Rename Board Dialog */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setRenameTarget(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Rename Board</h2>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmRename();
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
                onClick={confirmRename}
                disabled={!renameValue.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Project Dialog */}
      {projectRenameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setProjectRenameTarget(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Rename Project</h2>
            <input
              type="text"
              value={projectRenameValue}
              onChange={(e) => setProjectRenameValue(e.target.value)}
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
                onClick={() => setProjectRenameTarget(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRenameProject}
                disabled={!projectRenameValue.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Notebook Dialog */}
      {notebookRenameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setNotebookRenameTarget(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Rename Notebook</h2>
            <input
              type="text"
              value={notebookRenameValue}
              onChange={(e) => setNotebookRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmRenameNotebook();
              }}
              maxLength={100}
              className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNotebookRenameTarget(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRenameNotebook}
                disabled={!notebookRenameValue.trim()}
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

/* ─── Sub-components ───────────────────────────────────── */

/* -- Stat Sticky Note ----------------------------------------- */

const STICKY_BG: Record<string, string> = {
  yellow: "bg-amber-100 dark:bg-amber-950/40",
  rose: "bg-rose-100 dark:bg-rose-950/40",
  sky: "bg-sky-100 dark:bg-sky-950/40",
  green: "bg-emerald-100 dark:bg-emerald-950/40",
};

const STICKY_ACCENT: Record<string, string> = {
  yellow: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
  sky: "text-sky-600 dark:text-sky-400",
  green: "text-emerald-600 dark:text-emerald-400",
};

interface StatStickyProps {
  color: "yellow" | "rose" | "sky" | "green";
  icon: typeof BookOpen;
  label: string;
  value: string;
  rotation: number;
  onClick?: () => void;
  /** Shown on hover when the value is visually clipped */
  valueTooltip?: string;
}

function StatSticky({ color, icon: Icon, label, value, rotation, onClick, valueTooltip }: StatStickyProps) {
  const baseClassName = `stat-sticky flex min-h-[7.5rem] w-full min-w-0 flex-col items-center justify-center overflow-hidden px-3 py-5 sm:px-4 ${STICKY_BG[color]}`;
  const style = { transform: `rotate(${rotation}deg)` };
  const tip = valueTooltip ?? value;
  const content = (
    <>
      <Icon className={`mb-1.5 h-4 w-4 shrink-0 ${STICKY_ACCENT[color]}`} />
      <span
        className={`line-clamp-2 w-full min-w-0 max-w-full break-words px-0.5 text-center text-lg font-bold leading-tight sm:text-xl md:text-2xl ${STICKY_ACCENT[color]}`}
      >
        {value}
      </span>
      <span className="mt-1 max-w-full truncate px-0.5 text-center text-[11px] font-medium text-foreground/45">
        {label}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={tip.length > 0 ? tip : undefined}
        className={`${baseClassName} cursor-pointer transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2`}
        style={style}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={baseClassName} style={style} title={tip.length > 0 ? tip : undefined}>
      {content}
    </div>
  );
}

/* -- Notebook Section ----------------------------------------- */

const SECTION_ACCENT: Record<string, string> = {
  amber: "border-l-amber-400 dark:border-l-amber-500",
  violet: "border-l-violet-400 dark:border-l-violet-500",
  emerald: "border-l-emerald-400 dark:border-l-emerald-500",
  sky: "border-l-sky-400 dark:border-l-sky-500",
};

interface NotebookSectionProps {
  icon: typeof ClipboardList;
  title: string;
  count: number;
  accentColor: string;
  badge?: string;
  children: React.ReactNode;
}

function NotebookSection({
  icon: Icon,
  title,
  count,
  accentColor,
  badge,
  children,
}: NotebookSectionProps) {
  return (
    <section className="mb-10">
      <div
        className={`mb-4 flex items-center gap-2.5 border-l-[3px] pl-3 ${
          SECTION_ACCENT[accentColor] ?? ""
        }`}
      >
        <Icon className="h-5 w-5 text-foreground/50" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs font-medium text-foreground/40">
          {count}
        </span>
        {badge && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

/* -- Blank Page Empty State ----------------------------------- */

interface BlankPageEmptyProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
}

function BlankPageEmpty({ message, actionLabel, onAction }: BlankPageEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-background/40 py-14">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
        <PencilLine className="h-5 w-5 text-foreground/30" />
      </div>
      <p className="mb-4 text-sm text-foreground/40">{message}</p>
      <button
        type="button"
        onClick={onAction}
        className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground/60 transition-[colors,box-shadow] duration-150 hover:border-primary/40 hover:text-primary hover:shadow-sm motion-reduce:transition-none"
      >
        <Plus className="h-3.5 w-3.5" />
        {actionLabel}
      </button>
    </div>
  );
}

