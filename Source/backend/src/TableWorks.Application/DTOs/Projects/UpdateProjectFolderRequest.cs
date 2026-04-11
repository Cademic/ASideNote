namespace ASideNote.Application.DTOs.Projects;

public sealed class UpdateProjectFolderRequest
{
    public string? Name { get; set; }
    public int? SortOrder { get; set; }
}
