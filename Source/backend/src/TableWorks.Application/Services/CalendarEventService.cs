using Microsoft.EntityFrameworkCore;
using ASideNote.Application.DTOs.CalendarEvents;
using ASideNote.Application.Interfaces;
using ASideNote.Core.Entities;
using ASideNote.Core.Interfaces;

namespace ASideNote.Application.Services;

public sealed class CalendarEventService : ICalendarEventService
{
    private readonly IRepository<CalendarEvent> _eventRepo;
    private readonly IRepository<Project> _projectRepo;
    private readonly IUnitOfWork _unitOfWork;

    public CalendarEventService(IRepository<CalendarEvent> eventRepo, IRepository<Project> projectRepo, IUnitOfWork unitOfWork)
    {
        _eventRepo = eventRepo;
        _projectRepo = projectRepo;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<CalendarEventDto>> GetEventsAsync(Guid userId, CalendarEventListQuery query, CancellationToken cancellationToken = default)
    {
        IQueryable<CalendarEvent> q;

        if (query.ProjectId.HasValue)
        {
            // Project calendar: show all events linked to this project (from any project member)
            // User must have access to the project (owner or member)
            var hasAccess = await _projectRepo.Query()
                .AnyAsync(p => p.Id == query.ProjectId.Value &&
                    (p.OwnerId == userId || p.Members.Any(m => m.UserId == userId)), cancellationToken);
            if (!hasAccess)
                return Array.Empty<CalendarEventDto>();

            q = _eventRepo.Query().Where(e => e.ProjectId == query.ProjectId.Value);
        }
        else
        {
            // Main/dashboard calendar: own events + project events where the user opted in (per-user + default)
            q = _eventRepo.Query()
                .Include(e => e.Project)
                .ThenInclude(p => p!.Members)
                .Where(e =>
                    e.UserId == userId
                    || (e.ProjectId != null
                        && e.Project != null
                        && (e.Project.OwnerId == userId || e.Project.Members.Any(m => m.UserId == userId))));
        }

        // For recurring events we need a wider fetch window: any recurring event whose
        // start is <= query.To could produce instances inside the range.
        if (query.From.HasValue)
        {
            var from = query.From.Value;
            q = q.Where(e =>
                e.StartDate >= from
                || (e.EndDate != null && e.EndDate >= from)
                || e.RecurrenceFrequency != null);
        }

        if (query.To.HasValue)
        {
            var to = query.To.Value;
            q = q.Where(e => e.StartDate <= to);
        }

        var events = await q
            .OrderBy(e => e.StartDate)
            .ThenBy(e => e.CreatedAt)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        if (!query.ProjectId.HasValue)
        {
            events = events.Where(e =>
            {
                if (e.UserId == userId) return true;
                if (e.ProjectId is null || e.Project is null) return false;
                return ProjectEventVisibleOnUserMainCalendar(e.Project, userId);
            }).ToList();
        }

        // Expand recurring events into materialized instances within the requested range
        var result = new List<CalendarEventDto>();
        foreach (var e in events)
        {
            if (e.RecurrenceFrequency is null)
            {
                result.Add(MapToDto(e));
            }
            else
            {
                result.AddRange(ExpandRecurring(e, query.From, query.To));
            }
        }

        return result.OrderBy(d => d.StartDate).ThenBy(d => d.CreatedAt).ToList();
    }

    public async Task<CalendarEventDto> CreateEventAsync(Guid userId, CreateCalendarEventRequest request, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var entity = new CalendarEvent
        {
            UserId = userId,
            ProjectId = request.ProjectId,
            Title = request.Title,
            Description = request.Description,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            IsAllDay = request.IsAllDay,
            Color = request.Color,
            EventType = request.EventType,
            RecurrenceFrequency = request.RecurrenceFrequency,
            RecurrenceInterval = request.RecurrenceInterval,
            RecurrenceEndDate = request.RecurrenceEndDate,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await _eventRepo.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(entity);
    }

    public async Task<CalendarEventDto> GetEventByIdAsync(Guid userId, Guid eventId, CancellationToken cancellationToken = default)
    {
        var entity = await _eventRepo.Query()
            .Include(e => e.Project)
            .ThenInclude(p => p!.Members)
            .Where(e => e.Id == eventId)
            .AsNoTracking()
            .FirstOrDefaultAsync(cancellationToken);

        if (entity is null)
            throw new KeyNotFoundException($"Calendar event {eventId} not found.");

        // Allow access if user owns the event or is a project member (for project-linked events)
        var hasAccess = entity.UserId == userId
            || (entity.ProjectId != null
                && entity.Project != null
                && (entity.Project.OwnerId == userId || entity.Project.Members.Any(m => m.UserId == userId)));

        if (!hasAccess)
            throw new KeyNotFoundException($"Calendar event {eventId} not found.");

        return MapToDto(entity);
    }

    public async Task UpdateEventAsync(Guid userId, Guid eventId, UpdateCalendarEventRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await _eventRepo.Query()
            .Where(e => e.Id == eventId && e.UserId == userId)
            .FirstOrDefaultAsync(cancellationToken);

        if (entity is null)
            throw new KeyNotFoundException($"Calendar event {eventId} not found.");

        entity.Title = request.Title;
        entity.Description = request.Description;
        entity.StartDate = request.StartDate;
        entity.EndDate = request.EndDate;
        entity.IsAllDay = request.IsAllDay;
        entity.Color = request.Color;
        entity.EventType = request.EventType;
        entity.RecurrenceFrequency = request.RecurrenceFrequency;
        entity.RecurrenceInterval = request.RecurrenceInterval;
        entity.RecurrenceEndDate = request.RecurrenceEndDate;
        entity.UpdatedAt = DateTime.UtcNow;

        _eventRepo.Update(entity);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteEventAsync(Guid userId, Guid eventId, CancellationToken cancellationToken = default)
    {
        var entity = await _eventRepo.Query()
            .Where(e => e.Id == eventId && e.UserId == userId)
            .FirstOrDefaultAsync(cancellationToken);

        if (entity is null)
            throw new KeyNotFoundException($"Calendar event {eventId} not found.");

        _eventRepo.Delete(entity);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static bool ProjectEventVisibleOnUserMainCalendar(Project p, Guid userId)
    {
        if (p.OwnerId == userId)
            return p.OwnerShowOnPersonalCalendar ?? p.ShowEventsOnMainCalendar;

        var m = p.Members.FirstOrDefault(x => x.UserId == userId);
        if (m is null) return false;
        return m.ShowOnPersonalCalendar ?? p.ShowEventsOnMainCalendar;
    }

    /* ── Recurrence expansion ──────────────────────────────── */

    private static IEnumerable<CalendarEventDto> ExpandRecurring(CalendarEvent e, DateTime? rangeFrom, DateTime? rangeTo)
    {
        var duration = e.EndDate.HasValue ? e.EndDate.Value - e.StartDate : TimeSpan.Zero;
        var interval = Math.Max(1, e.RecurrenceInterval);
        var hardStop = e.RecurrenceEndDate ?? rangeTo ?? e.StartDate.AddYears(2);
        var from = rangeFrom ?? DateTime.MinValue;
        var to = rangeTo ?? DateTime.MaxValue;

        // Limit to a sane number of instances to avoid runaway expansion
        const int maxInstances = 500;
        int count = 0;

        var instanceStart = e.StartDate;
        while (instanceStart <= hardStop && count < maxInstances)
        {
            var instanceEnd = duration > TimeSpan.Zero ? instanceStart + duration : (DateTime?)null;

            // Check if this instance overlaps the requested range
            var effectiveEnd = instanceEnd ?? instanceStart;
            if (effectiveEnd >= from && instanceStart <= to)
            {
                // Build a deterministic ID for this instance based on date offset
                var instanceId = DeriveInstanceId(e.Id, instanceStart);
                yield return new CalendarEventDto
                {
                    Id = instanceId,
                    ProjectId = e.ProjectId,
                    Title = e.Title,
                    Description = e.Description,
                    StartDate = instanceStart,
                    EndDate = instanceEnd,
                    IsAllDay = e.IsAllDay,
                    Color = e.Color,
                    EventType = e.EventType,
                    RecurrenceFrequency = e.RecurrenceFrequency,
                    RecurrenceInterval = e.RecurrenceInterval,
                    RecurrenceEndDate = e.RecurrenceEndDate,
                    RecurrenceSourceId = e.Id,
                    CreatedAt = e.CreatedAt,
                    UpdatedAt = e.UpdatedAt,
                };
                count++;
            }

            // Advance to the next occurrence
            instanceStart = e.RecurrenceFrequency switch
            {
                "Daily" => instanceStart.AddDays(interval),
                "Weekly" => instanceStart.AddDays(7 * interval),
                "Monthly" => instanceStart.AddMonths(interval),
                _ => hardStop.AddDays(1), // Break out for unknown frequency
            };
        }
    }

    /// <summary>
    /// Derives a deterministic GUID for a recurrence instance so the frontend
    /// receives a stable ID for the same occurrence across fetches.
    /// </summary>
    private static Guid DeriveInstanceId(Guid sourceId, DateTime instanceDate)
    {
        Span<byte> bytes = stackalloc byte[16];
        sourceId.TryWriteBytes(bytes);
        var dateTicks = instanceDate.Ticks;
        bytes[8] = (byte)(dateTicks >> 56);
        bytes[9] = (byte)(dateTicks >> 48);
        bytes[10] = (byte)(dateTicks >> 40);
        bytes[11] = (byte)(dateTicks >> 32);
        bytes[12] = (byte)(dateTicks >> 24);
        bytes[13] = (byte)(dateTicks >> 16);
        bytes[14] = (byte)(dateTicks >> 8);
        bytes[15] = (byte)dateTicks;
        return new Guid(bytes);
    }

    /* ── Mapping ───────────────────────────────────────────── */

    private static CalendarEventDto MapToDto(CalendarEvent e)
    {
        return new CalendarEventDto
        {
            Id = e.Id,
            ProjectId = e.ProjectId,
            Title = e.Title,
            Description = e.Description,
            StartDate = e.StartDate,
            EndDate = e.EndDate,
            IsAllDay = e.IsAllDay,
            Color = e.Color,
            EventType = e.EventType,
            RecurrenceFrequency = e.RecurrenceFrequency,
            RecurrenceInterval = e.RecurrenceInterval,
            RecurrenceEndDate = e.RecurrenceEndDate,
            RecurrenceSourceId = null,
            CreatedAt = e.CreatedAt,
            UpdatedAt = e.UpdatedAt,
        };
    }
}
