using Microsoft.EntityFrameworkCore;
using ASideNote.Application.DTOs.Projects;
using ASideNote.Application.Interfaces;
using ASideNote.Core.Entities;
using ASideNote.Core.Interfaces;

namespace ASideNote.Application.Services;

public sealed class ProjectFolderService : IProjectFolderService
{
    private readonly IRepository<ProjectFolder> _folderRepo;
    private readonly IRepository<Project> _projectRepo;
    private readonly IRepository<ProjectMember> _memberRepo;
    private readonly IRepository<Board> _boardRepo;
    private readonly IRepository<Notebook> _notebookRepo;
    private readonly IUnitOfWork _unitOfWork;

    public ProjectFolderService(
        IRepository<ProjectFolder> folderRepo,
        IRepository<Project> projectRepo,
        IRepository<ProjectMember> memberRepo,
        IRepository<Board> boardRepo,
        IRepository<Notebook> notebookRepo,
        IUnitOfWork unitOfWork)
    {
        _folderRepo = folderRepo;
        _projectRepo = projectRepo;
        _memberRepo = memberRepo;
        _boardRepo = boardRepo;
        _notebookRepo = notebookRepo;
        _unitOfWork = unitOfWork;
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

    private async Task EnsureCanViewAsync(Guid userId, Guid projectId, CancellationToken cancellationToken)
    {
        var role = await GetProjectRoleAsync(userId, projectId, cancellationToken);
        if (role is null)
            throw new UnauthorizedAccessException("Access denied.");
    }

    private async Task EnsureCanEditAsync(Guid userId, Guid projectId, CancellationToken cancellationToken)
    {
        var role = await GetProjectRoleAsync(userId, projectId, cancellationToken);
        if (role is null || role == "Viewer")
            throw new UnauthorizedAccessException("You do not have permission to modify folders in this project.");
    }

    public async Task<IReadOnlyList<ProjectFolderDto>> GetFoldersAsync(Guid userId, Guid projectId, CancellationToken cancellationToken = default)
    {
        await EnsureCanViewAsync(userId, projectId, cancellationToken);

        return await _folderRepo.Query()
            .Where(f => f.ProjectId == projectId)
            .OrderBy(f => f.SortOrder)
            .ThenBy(f => f.Name)
            .Select(f => new ProjectFolderDto
            {
                Id = f.Id,
                ProjectId = f.ProjectId,
                Name = f.Name,
                SortOrder = f.SortOrder,
                CreatedAt = f.CreatedAt,
                UpdatedAt = f.UpdatedAt
            })
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task<ProjectFolderDto> CreateFolderAsync(Guid userId, Guid projectId, CreateProjectFolderRequest request, CancellationToken cancellationToken = default)
    {
        await EnsureCanEditAsync(userId, projectId, cancellationToken);

        var name = (request.Name ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(name))
            throw new ArgumentException("Folder name is required.");

        // Idempotent: same name (case-insensitive) returns existing folder — avoids 409 on retries/double-submit.
        var existingSameName = await _folderRepo.Query()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                f => f.ProjectId == projectId && f.Name.ToLower() == name.ToLower(),
                cancellationToken);
        if (existingSameName is not null)
        {
            return new ProjectFolderDto
            {
                Id = existingSameName.Id,
                ProjectId = existingSameName.ProjectId,
                Name = existingSameName.Name,
                SortOrder = existingSameName.SortOrder,
                CreatedAt = existingSameName.CreatedAt,
                UpdatedAt = existingSameName.UpdatedAt
            };
        }

        var now = DateTime.UtcNow;
        int sortOrder;
        if (request.SortOrder.HasValue)
        {
            sortOrder = request.SortOrder.Value;
        }
        else
        {
            var max = await _folderRepo.Query()
                .Where(f => f.ProjectId == projectId)
                .Select(f => (int?)f.SortOrder)
                .MaxAsync(cancellationToken) ?? -1;
            sortOrder = max + 1;
        }

        var folder = new ProjectFolder
        {
            ProjectId = projectId,
            Name = name,
            SortOrder = sortOrder,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _folderRepo.AddAsync(folder, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new ProjectFolderDto
        {
            Id = folder.Id,
            ProjectId = folder.ProjectId,
            Name = folder.Name,
            SortOrder = folder.SortOrder,
            CreatedAt = folder.CreatedAt,
            UpdatedAt = folder.UpdatedAt
        };
    }

    public async Task UpdateFolderAsync(Guid userId, Guid projectId, Guid folderId, UpdateProjectFolderRequest request, CancellationToken cancellationToken = default)
    {
        await EnsureCanEditAsync(userId, projectId, cancellationToken);

        var folder = await _folderRepo.Query()
            .FirstOrDefaultAsync(f => f.Id == folderId && f.ProjectId == projectId, cancellationToken)
            ?? throw new KeyNotFoundException("Folder not found.");

        var isMove = request.TargetProjectId.HasValue && request.TargetProjectId.Value != projectId;
        var effectiveProjectId = isMove ? request.TargetProjectId!.Value : projectId;

        if (isMove)
            await EnsureCanEditAsync(userId, effectiveProjectId, cancellationToken);

        if (request.Name is not null)
        {
            var name = request.Name.Trim();
            if (string.IsNullOrEmpty(name))
                throw new ArgumentException("Folder name cannot be empty.");
            folder.Name = name;
        }

        // Name must be unique within the folder's (possibly new) project.
        if (request.Name is not null || isMove)
        {
            var finalName = folder.Name;
            var duplicate = await _folderRepo.Query()
                .AnyAsync(
                    f => f.ProjectId == effectiveProjectId && f.Id != folderId && f.Name.ToLower() == finalName.ToLower(),
                    cancellationToken);
            if (duplicate)
                throw new InvalidOperationException($"A folder named \"{finalName}\" already exists in this project.");
        }

        var now = DateTime.UtcNow;

        if (isMove)
        {
            var maxSort = await _folderRepo.Query()
                .Where(f => f.ProjectId == effectiveProjectId)
                .Select(f => (int?)f.SortOrder)
                .MaxAsync(cancellationToken) ?? -1;
            folder.ProjectId = effectiveProjectId;
            folder.SortOrder = maxSort + 1;

            var boards = await _boardRepo.Query()
                .Where(b => b.ProjectFolderId == folderId)
                .ToListAsync(cancellationToken);
            foreach (var b in boards)
            {
                b.ProjectId = effectiveProjectId;
                b.UpdatedAt = now;
                _boardRepo.Update(b);
            }

            var notebooks = await _notebookRepo.Query()
                .Where(n => n.ProjectFolderId == folderId)
                .ToListAsync(cancellationToken);
            foreach (var n in notebooks)
            {
                n.ProjectId = effectiveProjectId;
                n.UpdatedAt = now;
                _notebookRepo.Update(n);
            }
        }
        else if (request.SortOrder.HasValue)
        {
            folder.SortOrder = request.SortOrder.Value;
        }

        folder.UpdatedAt = now;
        _folderRepo.Update(folder);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteFolderAsync(Guid userId, Guid projectId, Guid folderId, CancellationToken cancellationToken = default)
    {
        await EnsureCanEditAsync(userId, projectId, cancellationToken);

        var folder = await _folderRepo.Query()
            .FirstOrDefaultAsync(f => f.Id == folderId && f.ProjectId == projectId, cancellationToken)
            ?? throw new KeyNotFoundException("Folder not found.");

        _folderRepo.Delete(folder);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
