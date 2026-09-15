import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Calendar, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getCalendarEvents,
  deleteCalendarEvent,
} from "../api/calendar-events";
import {
  saveCalendarEventFromForm,
  type CalendarEventFormData,
} from "../utils/calendar-event-save";
import { getProjects } from "../api/projects";
import { CalendarGrid } from "../components/calendar/CalendarGrid";
import { CalendarTimeGrid } from "../components/calendar/CalendarTimeGrid";
import { CalendarYearView } from "../components/calendar/CalendarYearView";
import { CalendarAgendaView } from "../components/calendar/CalendarAgendaView";
import {
  CalendarViewMenu,
  type CalendarView,
} from "../components/calendar/CalendarViewMenu";
import { CreateEventDialog } from "../components/calendar/CreateEventDialog";
import { EventDetailsPopup } from "../components/calendar/EventDetailsPopup";
import type {
  CalendarEventDto,
  ProjectSummaryDto,
} from "../types";
import { resolveEventProjectName } from "../utils/calendar-event-project-name";
import { isProjectVisibleOnUserCalendar } from "../utils/calendar-project-visibility";
import { buildProjectMarkerEvents } from "../utils/calendar-project-markers";
import { useHolidayEvents } from "../hooks/useHolidayEvents";

function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/* ─── Date helpers ─────────────────────────────────────── */

function addDays(date: Date, n: number): Date {
  const r = new Date(date);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(date: Date): Date {
  const r = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  r.setDate(r.getDate() - r.getDay());
  return r;
}

/** Step `currentDate` forward (dir = 1) or back (dir = -1) by one unit of the active view. */
function stepDate(date: Date, view: CalendarView, dir: number): Date {
  switch (view) {
    case "day":
      return addDays(date, dir);
    case "week":
      return addDays(date, dir * 7);
    case "year":
      return new Date(date.getFullYear() + dir, date.getMonth(), 1);
    default:
      return new Date(date.getFullYear(), date.getMonth() + dir, 1);
  }
}

/** Header label for the active view — mirrors Google Calendar's title bar. */
function viewTitle(date: Date, view: CalendarView): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  if (view === "day") {
    return `${MONTH_NAMES[m]} ${date.getDate()}, ${y}`;
  }
  if (view === "week") {
    const s = startOfWeek(date);
    const e = addDays(s, 6);
    if (s.getFullYear() !== e.getFullYear()) {
      return `${MONTH_SHORT[s.getMonth()]} ${s.getFullYear()} – ${MONTH_SHORT[e.getMonth()]} ${e.getFullYear()}`;
    }
    if (s.getMonth() !== e.getMonth()) {
      return `${MONTH_SHORT[s.getMonth()]} – ${MONTH_SHORT[e.getMonth()]} ${y}`;
    }
    return `${MONTH_NAMES[m]} ${y}`;
  }
  if (view === "year") return `${y}`;
  return `${MONTH_NAMES[m]} ${y}`;
}

/** Wall-clock date is stored in the UTC fields (see calendar-event-save.ts). */
function eventUtcDate(iso: string): { y: number; m: number; d: number } {
  const dt = new Date(iso);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
}

export function CalendarsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const eventIdFromUrl = searchParams.get("eventId");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEventDto[]>([]);
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [view, setView] = useState<CalendarView>("week");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState<string>("");
  // "HH:MM" when the dialog was opened from an hour cell (timed item); "" for a
  // day / all-day-strip click (all-day item).
  const [dialogTime, setDialogTime] = useState<string>("");
  const [editingEvent, setEditingEvent] = useState<CalendarEventDto | null>(null);
  const [detailsEvent, setDetailsEvent] = useState<CalendarEventDto | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Fetch a window wide enough for the active view (plus margin for
      // multi-day items that start just outside it).
      let from: string;
      let to: string;
      if (eventIdFromUrl) {
        const now = new Date();
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        to = new Date(now.getFullYear() + 2, 11, 31).toISOString();
      } else if (view === "year") {
        from = new Date(year - 1, 11, 1).toISOString();
        to = new Date(year + 1, 1, 0).toISOString();
      } else if (view === "events") {
        from = new Date(year, month, 1).toISOString();
        to = new Date(year + 1, month + 1, 0).toISOString();
      } else {
        from = new Date(year, month - 1, 1).toISOString();
        to = new Date(year, month + 2, 0).toISOString();
      }

      const [eventsResult, projectsResult] = await Promise.all([
        getCalendarEvents({ from, to }),
        getProjects({ status: "Active" }).catch(() => [] as ProjectSummaryDto[]),
      ]);

      setEvents(eventsResult);
      setProjects(projectsResult);
    } catch {
      console.error("Failed to load calendar data");
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [currentDate, eventIdFromUrl, view]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When eventId is in URL, find the event and open details popup
  useEffect(() => {
    if (!eventIdFromUrl || events.length === 0) return;
    const event = events.find((e) => e.id === eventIdFromUrl || e.recurrenceSourceId === eventIdFromUrl);
    if (event) {
      setDetailsEvent(event);
      // Optionally navigate to the event's month
      const eventDate = new Date(event.startDate);
      setCurrentDate(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
      // Clear eventId from URL
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("eventId");
        return next;
      }, { replace: true });
    }
  }, [eventIdFromUrl, events, setSearchParams]);

  function handlePrev() {
    setCurrentDate((prev) => stepDate(prev, view, -1));
  }

  function handleNext() {
    setCurrentDate((prev) => stepDate(prev, view, 1));
  }

  function handleToday() {
    setCurrentDate(new Date());
  }

  /** Year-view / day-header click: focus that date in a more detailed view. */
  function handleSelectDate(date: Date, nextView: CalendarView = "day") {
    setCurrentDate(date);
    setView(nextView);
  }

  function handleClickDay(date: Date) {
    setEditingEvent(null);
    setDialogDate(toLocalDateStr(date));
    setDialogTime("");
    setDialogOpen(true);
  }

  /** Clicking an hour cell in the Day / Week grid — opens a timed item at that hour. */
  function handleClickTimeSlot(date: Date, hour: number) {
    setEditingEvent(null);
    setDialogDate(toLocalDateStr(date));
    setDialogTime(`${String(hour).padStart(2, "0")}:00`);
    setDialogOpen(true);
  }

  function handleClickEvent(event: CalendarEventDto) {
    // Project start/end markers link back to the project instead of opening the
    // (uneditable) event details popup.
    if (event.eventType === "Project" && event.projectId) {
      navigate(`/projects/${event.projectId}`);
      return;
    }
    setDetailsEvent(event);
  }

  function handleEditFromDetails() {
    if (!detailsEvent) return;
    setEditingEvent(detailsEvent);
    setDetailsEvent(null);
    setDialogDate("");
    setDialogTime("");
    setDialogOpen(true);
  }

  async function handleSave(data: CalendarEventFormData) {
    try {
      await saveCalendarEventFromForm(data, { editEvent: editingEvent });
      setDialogOpen(false);
      setEditingEvent(null);
      fetchData();
    } catch {
      console.error("Failed to save event");
    }
  }

  async function handleDelete() {
    if (!editingEvent) return;
    try {
      const eventId = editingEvent.recurrenceSourceId ?? editingEvent.id;
      await deleteCalendarEvent(eventId);
      setDialogOpen(false);
      setEditingEvent(null);
      fetchData();
    } catch {
      console.error("Failed to delete event");
    }
  }

  // Keyboard shortcuts — D / W / M / Y / A (Events) / T (Today), Google-style.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (dialogOpen || detailsEvent) return;
      switch (e.key.toLowerCase()) {
        case "d": setView("day"); break;
        case "w": setView("week"); break;
        case "m": setView("month"); break;
        case "y": setView("year"); break;
        case "a": case "e": setView("events"); break;
        case "t": setCurrentDate(new Date()); break;
        case "arrowleft": handlePrev(); break;
        case "arrowright": handleNext(); break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogOpen, detailsEvent, view]);

  // Built-in holidays for a window covering the active view (togglable in Settings).
  const [holidayFrom, holidayTo] = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    if (view === "year") {
      return [
        new Date(year - 1, 11, 1).toISOString(),
        new Date(year + 1, 1, 0).toISOString(),
      ];
    }
    if (view === "events") {
      return [
        new Date(year, month, 1).toISOString(),
        new Date(year + 1, month + 1, 0).toISOString(),
      ];
    }
    return [
      new Date(year, month - 1, 1).toISOString(),
      new Date(year, month + 2, 0).toISOString(),
    ];
  }, [currentDate, view]);
  const holidayEvents = useHolidayEvents(holidayFrom, holidayTo);

  const projectsOnCalendar = useMemo(
    () => projects.filter(isProjectVisibleOnUserCalendar),
    [projects],
  );

  // Notes / events linked to a project only belong on the personal calendar when
  // that project's "show on personal calendar" preference is enabled.
  const visibleProjectIds = useMemo(
    () => new Set(projectsOnCalendar.map((p) => p.id.toLowerCase())),
    [projectsOnCalendar],
  );

  // Projects show as two all-day markers — one on the start date, one on the end
  // date — rather than a bar spanning the whole range. Labelled with the project
  // name so they read like any other project-linked event ("Website: Start").
  const projectMarkerEvents = useMemo(
    () =>
      buildProjectMarkerEvents(projectsOnCalendar, {
        labelWithProjectName: true,
      }),
    [projectsOnCalendar],
  );

  const allEvents = useMemo(
    () => [
      ...events.filter(
        (e) =>
          !e.projectId || visibleProjectIds.has(e.projectId.toLowerCase()),
      ),
      ...projectMarkerEvents,
      ...holidayEvents,
    ],
    [events, visibleProjectIds, projectMarkerEvents, holidayEvents],
  );

  // projectId -> name, so views can label events with the project they belong to.
  const projectNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projects) map[p.id] = p.name;
    return map;
  }, [projects]);

  const weekDays = useMemo(() => {
    const s = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [currentDate]);

  // Count of events inside the currently visible range — shown as a count pill.
  const visibleEventCount = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const d = currentDate.getDate();
    const weekStart = startOfWeek(currentDate).getTime();
    const weekEnd = addDays(startOfWeek(currentDate), 6).getTime();
    const todayFloor = new Date(y, m, d).getTime();

    return allEvents.filter((e) => {
      const p = eventUtcDate(e.startDate);
      const evTime = new Date(p.y, p.m, p.d).getTime();
      switch (view) {
        case "day":
          return p.y === y && p.m === m && p.d === d;
        case "week":
          return evTime >= weekStart && evTime <= weekEnd;
        case "year":
          return p.y === y;
        case "events":
          return evTime >= todayFloor;
        default:
          return p.y === y && p.m === m;
      }
    }).length;
  }, [allEvents, currentDate, view]);

  if (isLoading && !hasLoadedOnce) {
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
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide sm:min-w-fit sm:flex-shrink-0">
              <div className="skeleton h-8 w-24 flex-shrink-0 rounded-lg" />
              <div className="skeleton h-8 w-28 flex-shrink-0 rounded-lg" />
            </div>
          </div>

          {/* section heading + calendar grid, matching the real layout */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="skeleton h-4 w-4" />
              <div className="skeleton h-5 w-32" />
              <div className="skeleton h-5 w-6 rounded-full" />
            </div>
            <div className="overflow-x-auto">
              <div className="grid min-w-[700px] grid-cols-7 overflow-hidden border border-border">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div key={i} className="skeleton m-px h-28" />
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="scrollbar-thin h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        {/* Header — same shape as the Gallery page */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900">
              <Calendar className="h-5 w-5 text-sky-600 dark:text-sky-200" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground">Calendar</h1>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2 overflow-x-auto scroll-smooth scrollbar-hide py-px sm:min-w-fit sm:flex-shrink-0">
            {/* Prev / Today / Next */}
            <div className="flex flex-shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous"
                className="rounded-lg border border-border p-1.5 text-foreground/50 transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:border-primary/40 hover:text-primary"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next"
                className="rounded-lg border border-border p-1.5 text-foreground/50 transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* View switcher — Day / Week / Month / Year / Events */}
            <CalendarViewMenu value={view} onChange={setView} />
          </div>
        </div>

        {/* Calendar section — icon + range heading + count pill, then the view */}
        <section>
          {/* Keyed so switching view (or navigating dates) cross-fades the content */}
          <div
            key={`${view}|${currentDate.toDateString()}`}
            className="animate-page-enter motion-reduce:animate-none"
          >
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-foreground/40" />
            <h2 className="text-sm font-semibold text-foreground">
              {viewTitle(currentDate, view)}
            </h2>
            <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs font-medium text-foreground/50">
              {visibleEventCount}
            </span>
          </div>

          {view === "month" && (
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                <CalendarGrid
                  currentDate={currentDate}
                  events={allEvents}
                  projects={[]}
                  onClickDay={handleClickDay}
                  onSelectDate={(d) => handleSelectDate(d, "day")}
                  onClickEvent={handleClickEvent}
                  projectNameMap={projectNameMap}
                />
              </div>
            </div>
          )}

          {view === "day" && (
            <CalendarTimeGrid
              days={[currentDate]}
              events={allEvents}
              onClickDay={handleClickDay}
              onClickTimeSlot={handleClickTimeSlot}
              onClickEvent={handleClickEvent}
              projectNameMap={projectNameMap}
            />
          )}

          {view === "week" && (
            <div className="overflow-x-auto">
              <div className="min-w-[820px]">
                <CalendarTimeGrid
                  days={weekDays}
                  events={allEvents}
                  onClickDay={handleClickDay}
                  onClickTimeSlot={handleClickTimeSlot}
                  onSelectDate={(d) => handleSelectDate(d, "day")}
                  onClickEvent={handleClickEvent}
                  projectNameMap={projectNameMap}
                />
              </div>
            </div>
          )}

          {view === "year" && (
            <CalendarYearView
              year={currentDate.getFullYear()}
              events={allEvents}
              projects={[]}
              onSelectDate={(d) => handleSelectDate(d, "month")}
            />
          )}

          {view === "events" && (
            <CalendarAgendaView
              events={allEvents}
              fromDate={currentDate}
              onClickEvent={handleClickEvent}
              projectNameMap={projectNameMap}
            />
          )}
          </div>

          {/* Legend */}
          {view !== "events" && (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-foreground/40">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-violet-400" />
                Projects
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
                Events
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />
                Notes
              </span>
              {holidayEvents.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
                  Holidays
                </span>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Event Details Popup */}
      {detailsEvent && (
        <EventDetailsPopup
          event={detailsEvent}
          projectName={resolveEventProjectName(detailsEvent, projectNameMap)}
          isOpen={!!detailsEvent}
          onClose={() => setDetailsEvent(null)}
          onEdit={handleEditFromDetails}
        />
      )}

      {/* Create/Edit Dialog */}
      <CreateEventDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSave}
        onDelete={editingEvent ? handleDelete : undefined}
        initialDate={dialogDate}
        initialTime={dialogTime || undefined}
        initialAllDay={dialogTime ? false : true}
        editEvent={editingEvent}
      />
    </div>
  );
}
