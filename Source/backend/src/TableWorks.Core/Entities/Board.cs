namespace ASideNote.Core.Entities;

public sealed class Board
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? ProjectFolderId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string BoardType { get; set; } = "NoteBoard";
    public bool IsPinned { get; set; }
    public DateTime? PinnedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User? User { get; set; }
    public Project? Project { get; set; }
    public ProjectFolder? ProjectFolder { get; set; }
    public ICollection<Note> Notes { get; set; } = new List<Note>();
    public ICollection<IndexCard> IndexCards { get; set; } = new List<IndexCard>();
    public ICollection<BoardImage> BoardImages { get; set; } = new List<BoardImage>();
    public ICollection<BoardConnection> BoardConnections { get; set; } = new List<BoardConnection>();
    public Drawing? Drawing { get; set; }
}
