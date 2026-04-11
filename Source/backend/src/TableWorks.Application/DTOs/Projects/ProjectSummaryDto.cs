namespace ASideNote.Application.DTOs.Projects;

public class ProjectSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? Deadline { get; set; }
    public string Status { get; set; } = string.Empty;
    public int Progress { get; set; }
    public string Color { get; set; } = "violet";
    public Guid OwnerId { get; set; }
    public string OwnerUsername { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    public int MemberCount { get; set; }
    public int BoardCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsPinned { get; set; }
    public DateTime? PinnedAt { get; set; }

    /// <summary>Legacy column; always true. Visibility is per-user via <see cref="MyShowOnPersonalCalendar"/>.</summary>
    public bool ShowEventsOnMainCalendar { get; set; } = true;

    /// <summary>Per-user timeline override; null means show (project column is on).</summary>
    public bool? MyShowOnPersonalCalendar { get; set; }
}
