namespace ASideNote.Application.DTOs.Projects;

public sealed class UpdateProjectFolderRequest
{
    public string? Name { get; set; }
    public int? SortOrder { get; set; }

    /// <summary>
    /// When set (and different from the folder's current project), moves the folder — and
    /// every board/notebook inside it — to this project. Requires Editor rights on both
    /// the source and target projects.
    /// </summary>
    public Guid? TargetProjectId { get; set; }
}
