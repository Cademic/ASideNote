namespace ASideNote.Core.Entities;

public sealed class ProjectMember
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
    public string Role { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
    public Guid? InvitedByUserId { get; set; }
    /// <summary>
    /// Member override for main/dashboard calendar. When null, the project default (ShowEventsOnMainCalendar) applies.
    /// </summary>
    public bool? ShowOnPersonalCalendar { get; set; }

    public Project? Project { get; set; }
    public User? User { get; set; }
}
