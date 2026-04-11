namespace ASideNote.Application.DTOs.Notebooks;

public sealed class NotebookDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsPinned { get; set; }
    public DateTime? PinnedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? ProjectFolderId { get; set; }
    /// <summary>TipTap/ProseMirror document JSON.</summary>
    public string ContentJson { get; set; } = "{\"type\":\"doc\",\"content\":[]}";
}
