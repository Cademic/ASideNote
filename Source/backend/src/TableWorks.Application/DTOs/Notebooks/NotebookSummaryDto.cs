namespace ASideNote.Application.DTOs.Notebooks;

public sealed class NotebookSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid? ProjectId { get; set; }
    public Guid? ProjectFolderId { get; set; }
    public bool IsPinned { get; set; }
    public DateTime? PinnedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
