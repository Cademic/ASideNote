using Microsoft.EntityFrameworkCore;
using ASideNote.Application.DTOs.Boards;
using ASideNote.Application.DTOs.Common;
using ASideNote.Application.Interfaces;
using ASideNote.Core.Entities;
using ASideNote.Core.Interfaces;

namespace ASideNote.Application.Services;

public sealed class BoardService : IBoardService
{
    private readonly IRepository<Board> _boardRepo;
    private readonly IRepository<Note> _noteRepo;
    private readonly IRepository<IndexCard> _indexCardRepo;
    private readonly IRepository<BoardConnection> _connectionRepo;
    private readonly IRepository<Project> _projectRepo;
    private readonly IRepository<ProjectMember> _memberRepo;
    private readonly IRepository<ProjectFolder> _projectFolderRepo;
    private readonly IUnitOfWork _unitOfWork;

    public BoardService(
        IRepository<Board> boardRepo,
        IRepository<Note> noteRepo,
        IRepository<IndexCard> indexCardRepo,
        IRepository<BoardConnection> connectionRepo,
        IRepository<Project> projectRepo,
        IRepository<ProjectMember> memberRepo,
        IRepository<ProjectFolder> projectFolderRepo,
        IUnitOfWork unitOfWork)
    {
        _boardRepo = boardRepo;
        _noteRepo = noteRepo;
        _indexCardRepo = indexCardRepo;
        _connectionRepo = connectionRepo;
        _projectRepo = projectRepo;
        _memberRepo = memberRepo;
        _projectFolderRepo = projectFolderRepo;
        _unitOfWork = unitOfWork;
    }

    public async Task<PaginatedResponse<BoardSummaryDto>> GetBoardsAsync(Guid userId, BoardListQuery query, CancellationToken cancellationToken = default)
    {
        var q = _boardRepo.Query()
            .Where(b => b.UserId == userId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.BoardType))
            q = q.Where(b => b.BoardType == query.BoardType);

        if (query.ProjectId.HasValue)
            q = q.Where(b => b.ProjectId == query.ProjectId.Value);

        var total = await q.CountAsync(cancellationToken);

        q = query.SortBy?.ToLowerInvariant() switch
        {
            "createdat" => query.SortOrder == "asc" ? q.OrderBy(b => b.CreatedAt) : q.OrderByDescending(b => b.CreatedAt),
            "name" => query.SortOrder == "asc" ? q.OrderBy(b => b.Name) : q.OrderByDescending(b => b.Name),
            _ => query.SortOrder == "asc" ? q.OrderBy(b => b.UpdatedAt) : q.OrderByDescending(b => b.UpdatedAt),
        };

        var boards = await q
            .Skip((query.Page - 1) * query.Limit)
            .Take(query.Limit)
            .Select(b => new BoardSummaryDto
            {
                Id = b.Id,
                Name = b.Name,
                Description = b.Description,
                BoardType = b.BoardType,
                ProjectId = b.ProjectId,
                ProjectFolderId = b.ProjectFolderId,
                IsPinned = b.IsPinned,
                PinnedAt = b.PinnedAt,
                CreatedAt = b.CreatedAt,
                UpdatedAt = b.UpdatedAt,
                NoteCount = b.Notes.Count(n => !n.IsArchived),
                IndexCardCount = b.IndexCards.Count(ic => !ic.IsArchived)
            })
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return new PaginatedResponse<BoardSummaryDto>
        {
            Items = boards,
            Page = query.Page,
            Limit = query.Limit,
            Total = total
        };
    }

    public async Task<BoardSummaryDto> GetBoardByIdAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        // Single query: project DTO fields plus UserId/ProjectId for access check
        var result = await _boardRepo.Query()
            .Where(b => b.Id == boardId)
            .Select(b => new
            {
                b.UserId,
                b.ProjectId,
                Dto = new BoardSummaryDto
                {
                    Id = b.Id,
                    Name = b.Name,
                    Description = b.Description,
                    BoardType = b.BoardType,
                    ProjectId = b.ProjectId,
                    ProjectFolderId = b.ProjectFolderId,
                    IsPinned = b.IsPinned,
                    PinnedAt = b.PinnedAt,
                    CreatedAt = b.CreatedAt,
                    UpdatedAt = b.UpdatedAt,
                    NoteCount = b.Notes.Count(n => !n.IsArchived),
                    IndexCardCount = b.IndexCards.Count(ic => !ic.IsArchived)
                }
            })
            .AsNoTracking()
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("Board not found.");

        if (result.UserId != userId)
        {
            if (result.ProjectId.HasValue)
            {
                var role = await GetProjectRoleAsync(userId, result.ProjectId.Value, cancellationToken);
                if (role is null)
                    throw new KeyNotFoundException("Board not found.");
            }
            else
            {
                throw new KeyNotFoundException("Board not found.");
            }
        }

        return result.Dto;
    }

    public async Task<BoardSummaryDto> CreateBoardAsync(Guid userId, CreateBoardRequest request, CancellationToken cancellationToken = default)
    {
        // If creating in a project, verify the user has Editor or Owner access
        if (request.ProjectId.HasValue)
        {
            var role = await GetProjectRoleAsync(userId, request.ProjectId.Value, cancellationToken);
            if (role is null || role == "Viewer")
                throw new UnauthorizedAccessException("You do not have permission to create boards in this project.");
        }

        // Check for duplicate name within same user and board type
        var nameExists = await _boardRepo.Query()
            .AnyAsync(b => b.UserId == userId && b.BoardType == request.BoardType && b.Name == request.Name, cancellationToken);
        if (nameExists)
        {
            var typeLabel = request.BoardType == "NoteBoard" ? "note board" : request.BoardType == "ChalkBoard" ? "chalk board" : "board";
            throw new InvalidOperationException($"You already have a {typeLabel} named \"{request.Name}\".");
        }

        var now = DateTime.UtcNow;
        var board = new Board
        {
            UserId = userId,
            ProjectId = request.ProjectId,
            Name = request.Name,
            Description = request.Description,
            BoardType = request.BoardType,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _boardRepo.AddAsync(board, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetBoardByIdAsync(userId, board.Id, cancellationToken);
    }

    public async Task UpdateBoardAsync(Guid userId, Guid boardId, UpdateBoardRequest request, CancellationToken cancellationToken = default)
    {
        var board = await _boardRepo.Query()
            .FirstOrDefaultAsync(b => b.Id == boardId, cancellationToken)
            ?? throw new KeyNotFoundException("Board not found.");

        await EnsureWriteAccessAsync(userId, board, cancellationToken);

        board.Name = request.Name;
        board.Description = request.Description;
        board.UpdatedAt = DateTime.UtcNow;

        _boardRepo.Update(board);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _boardRepo.Query()
            .FirstOrDefaultAsync(b => b.Id == boardId, cancellationToken)
            ?? throw new KeyNotFoundException("Board not found.");

        await EnsureWriteAccessAsync(userId, board, cancellationToken);

        // Delete all items associated with this board
        var notes = await _noteRepo.Query()
            .Where(n => n.BoardId == boardId)
            .ToListAsync(cancellationToken);
        foreach (var note in notes)
            _noteRepo.Delete(note);

        var cards = await _indexCardRepo.Query()
            .Where(ic => ic.BoardId == boardId)
            .ToListAsync(cancellationToken);
        foreach (var card in cards)
            _indexCardRepo.Delete(card);

        var connections = await _connectionRepo.Query()
            .Where(c => c.BoardId == boardId)
            .ToListAsync(cancellationToken);
        foreach (var conn in connections)
            _connectionRepo.Delete(conn);

        _boardRepo.Delete(board);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task AddBoardToProjectAsync(Guid userId, Guid projectId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var role = await GetProjectRoleAsync(userId, projectId, cancellationToken);
        if (role is null || role == "Viewer")
            throw new UnauthorizedAccessException("You do not have permission to add boards to this project.");

        var board = await _boardRepo.Query()
            .FirstOrDefaultAsync(b => b.Id == boardId && b.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Board not found or you are not the board owner.");

        board.ProjectId = projectId;
        board.UpdatedAt = DateTime.UtcNow;

        _boardRepo.Update(board);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveBoardFromProjectAsync(Guid userId, Guid projectId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var role = await GetProjectRoleAsync(userId, projectId, cancellationToken);
        if (role is null || role == "Viewer")
            throw new UnauthorizedAccessException("You do not have permission to remove boards from this project.");

        var board = await _boardRepo.Query()
            .FirstOrDefaultAsync(b => b.Id == boardId && b.ProjectId == projectId, cancellationToken)
            ?? throw new KeyNotFoundException("Board not found in this project.");

        board.ProjectId = null;
        board.ProjectFolderId = null;
        board.UpdatedAt = DateTime.UtcNow;

        _boardRepo.Update(board);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task SetBoardProjectFolderAsync(Guid userId, Guid projectId, Guid boardId, Guid? folderId, CancellationToken cancellationToken = default)
    {
        var role = await GetProjectRoleAsync(userId, projectId, cancellationToken);
        if (role is null || role == "Viewer")
            throw new UnauthorizedAccessException("You do not have permission to move boards in this project.");

        var board = await _boardRepo.Query()
            .FirstOrDefaultAsync(b => b.Id == boardId && b.ProjectId == projectId, cancellationToken)
            ?? throw new KeyNotFoundException("Board not found in this project.");

        if (folderId.HasValue)
        {
            var folderOk = await _projectFolderRepo.Query()
                .AnyAsync(f => f.Id == folderId.Value && f.ProjectId == projectId, cancellationToken);
            if (!folderOk)
                throw new KeyNotFoundException("Folder not found.");
        }

        board.ProjectFolderId = folderId;
        board.UpdatedAt = DateTime.UtcNow;
        _boardRepo.Update(board);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task TogglePinAsync(Guid userId, Guid boardId, bool isPinned, CancellationToken cancellationToken = default)
    {
        var board = await _boardRepo.Query()
            .FirstOrDefaultAsync(b => b.Id == boardId && b.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Board not found.");

        board.IsPinned = isPinned;
        board.PinnedAt = isPinned ? DateTime.UtcNow : null;
        board.UpdatedAt = DateTime.UtcNow;

        _boardRepo.Update(board);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<BoardSummaryDto>> GetPinnedBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _boardRepo.Query()
            .Where(b => b.UserId == userId && b.IsPinned)
            .OrderBy(b => b.PinnedAt)
            .Select(b => new BoardSummaryDto
            {
                Id = b.Id,
                Name = b.Name,
                Description = b.Description,
                BoardType = b.BoardType,
                ProjectId = b.ProjectId,
                ProjectFolderId = b.ProjectFolderId,
                IsPinned = b.IsPinned,
                PinnedAt = b.PinnedAt,
                CreatedAt = b.CreatedAt,
                UpdatedAt = b.UpdatedAt,
                NoteCount = b.Notes.Count(n => !n.IsArchived),
                IndexCardCount = b.IndexCards.Count(ic => !ic.IsArchived)
            })
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Returns the user's effective role in a project: "Owner", "Editor", "Viewer", or null (no access).
    /// </summary>
    public async Task<string?> GetProjectRoleAsync(Guid userId, Guid projectId, CancellationToken cancellationToken = default)
    {
        var project = await _projectRepo.Query()
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project is null) return null;
        if (project.OwnerId == userId) return "Owner";

        var member = await _memberRepo.Query()
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == userId, cancellationToken);

        return member?.Role;
    }

    private async Task EnsureWriteAccessAsync(Guid userId, Board board, CancellationToken cancellationToken)
    {
        if (board.UserId == userId) return;

        if (board.ProjectId.HasValue)
        {
            var role = await GetProjectRoleAsync(userId, board.ProjectId.Value, cancellationToken);
            if (role is "Owner" or "Editor") return;
        }

        throw new UnauthorizedAccessException("You do not have permission to modify this board.");
    }
}
