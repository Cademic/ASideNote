namespace ASideNote.Application.DTOs.Boards;

public sealed class BoardSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string BoardType { get; set; } = string.Empty;
    public Guid? ProjectId { get; set; }
    public Guid? ProjectFolderId { get; set; }
    public bool IsPinned { get; set; }
    public DateTime? PinnedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int NoteCount { get; set; }
    public int IndexCardCount { get; set; }
}
