namespace ASideNote.Application.DTOs.Projects;

public sealed class CreateProjectFolderRequest
{
    public string Name { get; set; } = string.Empty;
    public int? SortOrder { get; set; }
}
