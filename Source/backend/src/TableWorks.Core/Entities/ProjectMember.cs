namespace ASideNote.Core.Entities;

public sealed class ProjectMember
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
    public string Role { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
    public Guid? InvitedByUserId { get; set; }
    /// <summary>Per-user timeline on main/dashboard calendars. Null = show (project default is on).</summary>
    public bool? ShowOnPersonalCalendar { get; set; }

    public Project? Project { get; set; }
    public User? User { get; set; }
}
