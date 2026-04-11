namespace ASideNote.Core.Entities;

public sealed class Notebook
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? ProjectFolderId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsPinned { get; set; }
    public DateTime? PinnedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>TipTap/ProseMirror document JSON (jsonb in DB).</summary>
    public string ContentJson { get; set; } = "{\"type\":\"doc\",\"content\":[]}";

    public User? User { get; set; }
    public Project? Project { get; set; }
    public ProjectFolder? ProjectFolder { get; set; }
}
