namespace ASideNote.Core.Entities;

/// <summary>
/// Flat folder within a project for categorizing boards and notebooks (not the user <see cref="Folder"/> used for board notes).
/// </summary>
public sealed class ProjectFolder
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Project? Project { get; set; }
    public ICollection<Board> Boards { get; set; } = new List<Board>();
    public ICollection<Notebook> Notebooks { get; set; } = new List<Notebook>();
}
