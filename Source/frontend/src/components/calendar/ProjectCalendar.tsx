import { useCallback, useEffect, useState } from "react";
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../../api/calendar-events";
import { CalendarHeader, type CalendarLayout } from "./CalendarHeader";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarTimeline } from "./CalendarTimeline";
import { CreateEventDialog } from "./CreateEventDialog";
import { EventDetailsPopup } from "./EventDetailsPopup";
import type { CalendarEventDto, ProjectSummaryDto } from "../../types";

function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface ProjectCalendarProps {
  projectId: string;
  projectName: string;
  startDate: string | null;
  endDate: string | null;
  deadline: string | null;
  color: string;
}

export function ProjectCalendar({
  projectId,
  projectName,
  startDate,
  endDate,
  deadline,
  color,
}: ProjectCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEventDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [layout, setLayout] = useState<CalendarLayout>("grid");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState("");
  const [editingEvent, setEditingEvent] = useState<CalendarEventDto | null>(null);
  const [detailsEvent, setDetailsEvent] = useState<CalendarEventDto | null>(null);

  // Build a synthetic project for the grid to show the project's own date range
  const projectAsEntry: ProjectSummaryDto[] =
    startDate && endDate
      ? [
          {
            id: projectId,
            name: projectName,
            description: null,
            startDate,
            endDate,
            deadline,
            status: "Active",
            progress: 0,
            color: color && color.trim() ? color : "#6366f1",
            ownerId: "",
            ownerUsername: "",
            userRole: "",
            memberCount: 0,
            boardCount: 0,
            createdAt: "",
          } satisfies ProjectSummaryDto,
        ]
      : [];

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const from = new Date(year, month - 1, 1).toISOString();
      const to = new Date(year, month + 2, 0).toISOString();

      const result = await getCalendarEvents({ from, to, projectId });
      setEvents(result);
    } catch {
      console.error("Failed to load project calendar events");
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, projectId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  function handlePreviousMonth() {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  }

  function handleNextMonth() {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  }

  function handleToday() {
    setCurrentDate(new Date());
  }

  function handleClickDay(date: Date) {
    setEditingEvent(null);
    setDialogDate(toLocalDateStr(date));
    setDialogOpen(true);
  }

  function handleClickEvent(event: CalendarEventDto) {
    setDetailsEvent(event);
  }

  function handleEditFromDetails() {
    if (!detailsEvent) return;
    setEditingEvent(detailsEvent);
    setDetailsEvent(null);
    setDialogDate("");
    setDialogOpen(true);
  }

  async function handleSave(data: {
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

      const eventId = editingEvent?.recurrenceSourceId ?? editingEvent?.id;

      if (editingEvent && eventId) {
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
          projectId,
          startDate: startIso,
          endDate: endIso,
          isAllDay: data.isAllDay,
          color: data.color,
          eventType: data.eventType,
          ...recurrence,
        });
      }
      setDialogOpen(false);
      setEditingEvent(null);
      fetchEvents();
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
      fetchEvents();
    } catch {
      console.error("Failed to delete event");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs text-foreground/50">Loading calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Deadline indicator */}
      {deadline && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800/50 dark:bg-amber-950/20">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Deadline: {new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      )}

      <CalendarHeader
        currentDate={currentDate}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        hideTodayOnMobile
        layout={layout}
        onLayoutChange={setLayout}
      />

      {layout === "grid" ? (
        <CalendarGrid
          currentDate={currentDate}
          events={events}
          projects={projectAsEntry}
          onClickDay={handleClickDay}
          onClickEvent={handleClickEvent}
        />
      ) : (
        <CalendarTimeline
          currentDate={currentDate}
          events={events}
          projects={projectAsEntry}
          onClickDay={handleClickDay}
          onClickEvent={handleClickEvent}
        />
      )}

      {/* Event Details Popup */}
      {detailsEvent && (
        <EventDetailsPopup
          event={detailsEvent}
          projectName={projectName}
          isOpen={!!detailsEvent}
          onClose={() => setDetailsEvent(null)}
          onEdit={handleEditFromDetails}
        />
      )}

      <CreateEventDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSave}
        onDelete={editingEvent ? handleDelete : undefined}
        initialDate={dialogDate}
        editEvent={editingEvent}
        projectId={projectId}
        projectStartDate={startDate}
        projectEndDate={endDate}
      />
    </div>
  );
}
