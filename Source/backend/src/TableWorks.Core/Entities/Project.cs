namespace ASideNote.Core.Entities;

public sealed class Project
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? Deadline { get; set; }
    public string Status { get; set; } = string.Empty;
    public int Progress { get; set; }
    /// <summary>
    /// When true, <see cref="Progress"/> is derived from <see cref="StartDate"/> and <see cref="EndDate"/> (linear by calendar day, UTC).
    /// </summary>
    public bool AutoProgressEnabled { get; set; }
    public string Color { get; set; } = "violet";
    /// <summary>
    /// Legacy column: events are shown by default; per-user visibility is controlled by
    /// <see cref="OwnerShowOnPersonalCalendar"/> and member <see cref="ProjectMember.ShowOnPersonalCalendar"/>.
    /// Kept true for all projects (no UI to change).
    /// </summary>
    public bool ShowEventsOnMainCalendar { get; set; } = true;
    /// <summary>
    /// Owner-only override for their own main/dashboard calendar. When null, <see cref="ShowEventsOnMainCalendar"/> applies.
    /// </summary>
    public bool? OwnerShowOnPersonalCalendar { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User? Owner { get; set; }
    public ICollection<Board> Boards { get; set; } = new List<Board>();
    public ICollection<Notebook> Notebooks { get; set; } = new List<Notebook>();
    public ICollection<ProjectFolder> ProjectFolders { get; set; } = new List<ProjectFolder>();
    public ICollection<Note> Notes { get; set; } = new List<Note>();
    public ICollection<IndexCard> IndexCards { get; set; } = new List<IndexCard>();
    public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
    public ICollection<UserPinnedProject> PinnedByUsers { get; set; } = new List<UserPinnedProject>();
}
