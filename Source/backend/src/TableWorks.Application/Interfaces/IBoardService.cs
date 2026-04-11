using ASideNote.Application.DTOs.Boards;
using ASideNote.Application.DTOs.Common;

namespace ASideNote.Application.Interfaces;

public interface IBoardService
{
    Task<PaginatedResponse<BoardSummaryDto>> GetBoardsAsync(Guid userId, BoardListQuery query, CancellationToken cancellationToken = default);
    Task<BoardSummaryDto> GetBoardByIdAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    Task<BoardSummaryDto> CreateBoardAsync(Guid userId, CreateBoardRequest request, CancellationToken cancellationToken = default);
    Task UpdateBoardAsync(Guid userId, Guid boardId, UpdateBoardRequest request, CancellationToken cancellationToken = default);
    Task DeleteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    Task AddBoardToProjectAsync(Guid userId, Guid projectId, Guid boardId, CancellationToken cancellationToken = default);
    Task RemoveBoardFromProjectAsync(Guid userId, Guid projectId, Guid boardId, CancellationToken cancellationToken = default);
    Task SetBoardProjectFolderAsync(Guid userId, Guid projectId, Guid boardId, Guid? folderId, CancellationToken cancellationToken = default);
    Task<string?> GetProjectRoleAsync(Guid userId, Guid projectId, CancellationToken cancellationToken = default);
    Task TogglePinAsync(Guid userId, Guid boardId, bool isPinned, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<BoardSummaryDto>> GetPinnedBoardsAsync(Guid userId, CancellationToken cancellationToken = default);
}
