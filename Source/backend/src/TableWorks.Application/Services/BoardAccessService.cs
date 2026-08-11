using Microsoft.EntityFrameworkCore;
using ASideNote.Application.Interfaces;
using ASideNote.Core.Entities;
using ASideNote.Core.Interfaces;

namespace ASideNote.Application.Services;

public sealed class BoardAccessService : IBoardAccessService
{
    private readonly IRepository<Board> _boardRepo;
    private readonly IRepository<Project> _projectRepo;
    private readonly IRepository<ProjectMember> _memberRepo;

    public BoardAccessService(
        IRepository<Board> boardRepo,
        IRepository<Project> projectRepo,
        IRepository<ProjectMember> memberRepo)
    {
        _boardRepo = boardRepo;
        _projectRepo = projectRepo;
        _memberRepo = memberRepo;
    }

    public async Task<bool> HasReadAccessAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _boardRepo.Query()
            .Where(b => b.Id == boardId)
            .Select(b => new { b.UserId, b.ProjectId })
            .AsNoTracking()
            .FirstOrDefaultAsync(cancellationToken);

        if (board is null) return false;
        if (board.UserId == userId) return true;
        if (!board.ProjectId.HasValue) return false;

        var role = await GetProjectRoleAsync(userId, board.ProjectId.Value, cancellationToken);
        return role is not null;
    }

    public async Task<bool> HasWriteAccessAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _boardRepo.Query()
            .Where(b => b.Id == boardId)
            .Select(b => new { b.UserId, b.ProjectId })
            .AsNoTracking()
            .FirstOrDefaultAsync(cancellationToken);

        if (board is null) return false;
        if (board.UserId == userId) return true;
        if (!board.ProjectId.HasValue) return false;

        var role = await GetProjectRoleAsync(userId, board.ProjectId.Value, cancellationToken);
        return role is "Owner" or "Editor";
    }

    public async Task<string> GetRoleAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _boardRepo.Query()
            .Where(b => b.Id == boardId)
            .Select(b => new { b.UserId, b.ProjectId })
            .AsNoTracking()
            .FirstOrDefaultAsync(cancellationToken);

        if (board is null) return "Viewer";
        if (board.UserId == userId) return "Owner";
        if (!board.ProjectId.HasValue) return "Viewer";

        var role = await GetProjectRoleAsync(userId, board.ProjectId.Value, cancellationToken);
        return role ?? "Viewer";
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
}
