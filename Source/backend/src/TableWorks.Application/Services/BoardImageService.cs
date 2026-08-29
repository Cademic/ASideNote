using Microsoft.EntityFrameworkCore;
using ASideNote.Application.DTOs.BoardImages;
using ASideNote.Application.Interfaces;
using ASideNote.Core.Entities;
using ASideNote.Core.Interfaces;

namespace ASideNote.Application.Services;

public sealed class BoardImageService : IBoardImageService
{
    private readonly IRepository<BoardImage> _imageRepo;
    private readonly IRepository<Board> _boardRepo;
    private readonly IRepository<Project> _projectRepo;
    private readonly IRepository<ProjectMember> _memberRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IImageStorageService _imageStorage;
    private readonly IUserStorageService _userStorage;
    private readonly IBoardHubBroadcaster _boardHub;

    public BoardImageService(
        IRepository<BoardImage> imageRepo,
        IRepository<Board> boardRepo,
        IRepository<Project> projectRepo,
        IRepository<ProjectMember> memberRepo,
        IUnitOfWork unitOfWork,
        IImageStorageService imageStorage,
        IUserStorageService userStorage,
        IBoardHubBroadcaster boardHub)
    {
        _imageRepo = imageRepo;
        _boardRepo = boardRepo;
        _projectRepo = projectRepo;
        _memberRepo = memberRepo;
        _unitOfWork = unitOfWork;
        _imageStorage = imageStorage;
        _userStorage = userStorage;
        _boardHub = boardHub;
    }

    public async Task<IReadOnlyList<BoardImageSummaryDto>> GetByBoardIdAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        await EnsureBoardReadAccessAsync(userId, boardId, cancellationToken);

        return await _imageRepo.Query()
            .Where(bi => bi.BoardId == boardId)
            .Select(bi => new BoardImageSummaryDto
            {
                Id = bi.Id,
                ImageUrl = bi.ImageUrl,
                PositionX = bi.PositionX,
                PositionY = bi.PositionY,
                Width = bi.Width,
                Height = bi.Height,
                Rotation = bi.Rotation
            })
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task<BoardImageSummaryDto> CreateAsync(Guid userId, Guid boardId, CreateBoardImageRequest request, CancellationToken cancellationToken = default)
    {
        await EnsureBoardWriteAccessAsync(userId, boardId, cancellationToken);

        var now = DateTime.UtcNow;
        var image = new BoardImage
        {
            BoardId = boardId,
            UserId = userId,
            ImageUrl = request.ImageUrl,
            PositionX = request.PositionX,
            PositionY = request.PositionY,
            Width = request.Width,
            Height = request.Height,
            Rotation = request.Rotation,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _imageRepo.AddAsync(image, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        var summary = MapToSummary(image);
        await _boardHub.NotifyImageCardAddedAsync(boardId, image.Id, summary, cancellationToken);

        return summary;
    }

    public async Task PatchAsync(Guid userId, Guid id, PatchBoardImageRequest request, CancellationToken cancellationToken = default)
    {
        var image = await _imageRepo.Query()
            .FirstOrDefaultAsync(bi => bi.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Board image not found.");

        await EnsureBoardWriteAccessAsync(userId, image.BoardId, cancellationToken);

        if (request.PositionX.HasValue)
            image.PositionX = request.PositionX.Value;
        if (request.PositionY.HasValue)
            image.PositionY = request.PositionY.Value;
        if (request.Width.HasValue)
            image.Width = request.Width;
        if (request.Height.HasValue)
            image.Height = request.Height;
        if (request.Rotation.HasValue)
            image.Rotation = request.Rotation;

        image.UpdatedAt = DateTime.UtcNow;
        _imageRepo.Update(image);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        var summary = MapToSummary(image);
        await _boardHub.NotifyImageCardUpdatedAsync(image.BoardId, image.Id, summary, cancellationToken);
    }

    public async Task DeleteAsync(Guid userId, Guid id, CancellationToken cancellationToken = default)
    {
        var image = await _imageRepo.Query()
            .FirstOrDefaultAsync(bi => bi.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Board image not found.");

        await EnsureBoardWriteAccessAsync(userId, image.BoardId, cancellationToken);

        var key = await _imageStorage.DeleteByUrlIfOwnedAsync(image.ImageUrl, cancellationToken);
        if (key is not null)
            await _userStorage.RecordDeletionByKeyAsync(key, cancellationToken);

        var boardId = image.BoardId;
        var imageId = image.Id;
        _imageRepo.Delete(image);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _boardHub.NotifyImageCardDeletedAsync(boardId, imageId, cancellationToken);
    }

    private async Task EnsureBoardReadAccessAsync(Guid userId, Guid boardId, CancellationToken cancellationToken)
    {
        var board = await _boardRepo.Query()
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == boardId, cancellationToken)
            ?? throw new KeyNotFoundException("Board not found.");

        if (board.UserId == userId) return;

        if (board.ProjectId.HasValue)
        {
            var role = await GetProjectRoleAsync(userId, board.ProjectId.Value, cancellationToken);
            if (role is not null) return;
        }

        throw new KeyNotFoundException("Board not found.");
    }

    private async Task EnsureBoardWriteAccessAsync(Guid userId, Guid boardId, CancellationToken cancellationToken)
    {
        var board = await _boardRepo.Query()
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == boardId, cancellationToken)
            ?? throw new KeyNotFoundException("Board not found.");

        if (board.UserId == userId) return;

        if (board.ProjectId.HasValue)
        {
            var role = await GetProjectRoleAsync(userId, board.ProjectId.Value, cancellationToken);
            if (role is "Owner" or "Editor") return;
        }

        throw new UnauthorizedAccessException("You do not have permission to modify this board.");
    }

    private async Task<string?> GetProjectRoleAsync(Guid userId, Guid projectId, CancellationToken cancellationToken)
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

    private static BoardImageSummaryDto MapToSummary(BoardImage image) => new()
    {
        Id = image.Id,
        ImageUrl = image.ImageUrl,
        PositionX = image.PositionX,
        PositionY = image.PositionY,
        Width = image.Width,
        Height = image.Height,
        Rotation = image.Rotation
    };
}
