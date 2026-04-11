namespace ASideNote.Application.DTOs.Projects;

/// <summary>
/// Per-user timeline on main/dashboard calendars. Null clears the override (timeline on by default).
/// </summary>
public sealed class UpdateMyProjectCalendarPreferenceRequest
{
    public bool? ShowOnPersonalCalendar { get; set; }
}
