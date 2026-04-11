using ASideNote.Application.DTOs.Notebooks;
using ASideNote.Application.DTOs.Common;

namespace ASideNote.Application.Interfaces;

public interface INotebookService
{
    Task<PaginatedResponse<NotebookSummaryDto>> GetNotebooksAsync(Guid userId, NotebookListQuery query, CancellationToken cancellationToken = default);
    Task<NotebookDetailDto> GetNotebookByIdAsync(Guid userId, Guid notebookId, CancellationToken cancellationToken = default);
    Task<NotebookSummaryDto> CreateNotebookAsync(Guid userId, CreateNotebookRequest request, CancellationToken cancellationToken = default);
    Task UpdateNotebookAsync(Guid userId, Guid notebookId, UpdateNotebookRequest request, CancellationToken cancellationToken = default);
    Task UpdateNotebookContentAsync(Guid userId, Guid notebookId, UpdateNotebookContentRequest request, CancellationToken cancellationToken = default);
    Task DeleteNotebookAsync(Guid userId, Guid notebookId, CancellationToken cancellationToken = default);
    Task TogglePinAsync(Guid userId, Guid notebookId, bool isPinned, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<NotebookSummaryDto>> GetPinnedNotebooksAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddNotebookToProjectAsync(Guid userId, Guid projectId, Guid notebookId, CancellationToken cancellationToken = default);
    Task RemoveNotebookFromProjectAsync(Guid userId, Guid projectId, Guid notebookId, CancellationToken cancellationToken = default);
    Task SetNotebookProjectFolderAsync(Guid userId, Guid projectId, Guid notebookId, Guid? folderId, CancellationToken cancellationToken = default);

    Task<NotebookVersionDto> CreateVersionAsync(Guid userId, Guid notebookId, CreateNotebookVersionRequest? request = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<NotebookVersionDto>> GetVersionsAsync(Guid userId, Guid notebookId, CancellationToken cancellationToken = default);
    Task<NotebookVersionDto?> GetVersionByIdAsync(Guid userId, Guid notebookId, Guid versionId, CancellationToken cancellationToken = default);
    Task RestoreVersionAsync(Guid userId, Guid notebookId, Guid versionId, CancellationToken cancellationToken = default);
}
