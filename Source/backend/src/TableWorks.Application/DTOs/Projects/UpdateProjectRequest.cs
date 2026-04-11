namespace ASideNote.Application.DTOs.Projects;

public sealed class UpdateProjectRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? Deadline { get; set; }
    public string Status { get; set; } = string.Empty;
    public int Progress { get; set; }
    /// <summary>When null, the server keeps the current auto-progress flag and applies progress rules accordingly.</summary>
    public bool? AutoProgressEnabled { get; set; }
    public string? Color { get; set; }
    /// <summary>When true, project events appear on members' main/dashboard calendars.</summary>
    public bool? ShowEventsOnMainCalendar { get; set; }
}
