using ASideNote.Application.DTOs.Projects;

namespace ASideNote.Application.Interfaces;

public interface IProjectFolderService
{
    Task<IReadOnlyList<ProjectFolderDto>> GetFoldersAsync(Guid userId, Guid projectId, CancellationToken cancellationToken = default);
    Task<ProjectFolderDto> CreateFolderAsync(Guid userId, Guid projectId, CreateProjectFolderRequest request, CancellationToken cancellationToken = default);
    Task UpdateFolderAsync(Guid userId, Guid projectId, Guid folderId, UpdateProjectFolderRequest request, CancellationToken cancellationToken = default);
    Task DeleteFolderAsync(Guid userId, Guid projectId, Guid folderId, CancellationToken cancellationToken = default);
}
