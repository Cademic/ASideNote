namespace ASideNote.Application.DTOs.CalendarEvents;

public sealed class CalendarEventDto
{
    public Guid Id { get; set; }
    public Guid? ProjectId { get; set; }
    /// <summary>When <see cref="ProjectId"/> is set, the linked project name for display (e.g. on calendars).</summary>
    public string? ProjectName { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsAllDay { get; set; }
    public string Color { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string? RecurrenceFrequency { get; set; }
    public int RecurrenceInterval { get; set; } = 1;
    public DateTime? RecurrenceEndDate { get; set; }
    /// <summary>When non-null this DTO is a materialized recurrence instance; value is the parent event ID.</summary>
    public Guid? RecurrenceSourceId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
