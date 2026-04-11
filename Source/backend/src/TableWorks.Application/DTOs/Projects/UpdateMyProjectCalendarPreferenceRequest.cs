namespace ASideNote.Application.DTOs.Projects;

/// <summary>
/// Personal calendar preference for the current user on this project.
/// Null clears the override so the project default (ShowEventsOnMainCalendar) applies.
/// </summary>
public sealed class UpdateMyProjectCalendarPreferenceRequest
{
    public bool? ShowOnPersonalCalendar { get; set; }
}
