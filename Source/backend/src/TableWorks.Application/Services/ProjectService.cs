using Microsoft.EntityFrameworkCore;
using ASideNote.Application.DTOs.Boards;
using ASideNote.Application.DTOs.Notebooks;
using ASideNote.Application.DTOs.Notes;
using ASideNote.Application.DTOs.Projects;
using ASideNote.Application.DTOs.Tags;
using ASideNote.Application.Interfaces;
using ASideNote.Core.Entities;
using ASideNote.Core.Interfaces;

namespace ASideNote.Application.Services;

public sealed class ProjectService : IProjectService
{
    private readonly IRepository<Project> _projectRepo;
    private readonly IRepository<ProjectMember> _memberRepo;
    private readonly IRepository<User> _userRepo;
    private readonly IRepository<UserPinnedProject> _pinnedRepo;
    private readonly IUnitOfWork _unitOfWork;

    public ProjectService(
        IRepository<Project> projectRepo,
        IRepository<ProjectMember> memberRepo,
        IRepository<User> userRepo,
        IRepository<UserPinnedProject> pinnedRepo,
        IUnitOfWork unitOfWork)
    {
        _projectRepo = projectRepo;
        _memberRepo = memberRepo;
        _userRepo = userRepo;
        _pinnedRepo = pinnedRepo;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<ProjectSummaryDto>> GetProjectsAsync(Guid userId, ProjectListQuery query, CancellationToken cancellationToken = default)
    {
        try
        {
            return await GetProjectsWithPinningAsync(userId, query, cancellationToken);
        }
        catch (DbUpdateException)
        {
            return await GetProjectsWithoutPinningAsync(userId, query, cancellationToken);
        }
        catch (InvalidOperationException)
        {
            return await GetProjectsWithoutPinningAsync(userId, query, cancellationToken);
        }
        catch (Exception ex) when (IsPinningTableMissing(ex))
        {
            return await GetProjectsWithoutPinningAsync(userId, query, cancellationToken);
        }
    }

    private static bool IsPinningTableMissing(Exception ex)
    {
        var msg = ex.Message + (ex.InnerException?.Message ?? "");
        return msg.Contains("UserPinnedProjects", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("does not exist", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<IReadOnlyList<ProjectSummaryDto>> GetProjectsWithPinningAsync(Guid userId, ProjectListQuery query, CancellationToken cancellationToken)
    {
        var q = _projectRepo.Query()
            .Include(p => p.Owner)
            .Include(p => p.Members)
            .Include(p => p.Boards)
            .Include(p => p.PinnedByUsers)
            .Where(p => p.OwnerId == userId || p.Members.Any(m => m.UserId == userId))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(p => p.Status == query.Status);

        q = query.SortBy?.ToLowerInvariant() switch
        {
            "createdat" => query.SortOrder == "asc" ? q.OrderBy(p => p.CreatedAt) : q.OrderByDescending(p => p.CreatedAt),
            "startdate" => query.SortOrder == "asc" ? q.OrderBy(p => p.StartDate) : q.OrderByDescending(p => p.StartDate),
            "enddate" => query.SortOrder == "asc" ? q.OrderBy(p => p.EndDate) : q.OrderByDescending(p => p.EndDate),
            _ => query.SortOrder == "asc" ? q.OrderBy(p => p.UpdatedAt) : q.OrderByDescending(p => p.UpdatedAt),
        };

        var projects = await q.AsNoTracking().ToListAsync(cancellationToken);

        return projects.Select(p =>
        {
            var pin = p.PinnedByUsers?.FirstOrDefault(x => x.UserId == userId);
            return MapToSummary(p, userId, pin != null, pin?.PinnedAt);
        }).ToList();
    }

    private async Task<IReadOnlyList<ProjectSummaryDto>> GetProjectsWithoutPinningAsync(Guid userId, ProjectListQuery query, CancellationToken cancellationToken)
    {
        var q = _projectRepo.Query()
            .Include(p => p.Owner)
            .Include(p => p.Members)
            .Include(p => p.Boards)
            .Where(p => p.OwnerId == userId || p.Members.Any(m => m.UserId == userId))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(p => p.Status == query.Status);

        q = query.SortBy?.ToLowerInvariant() switch
        {
            "createdat" => query.SortOrder == "asc" ? q.OrderBy(p => p.CreatedAt) : q.OrderByDescending(p => p.CreatedAt),
            "startdate" => query.SortOrder == "asc" ? q.OrderBy(p => p.StartDate) : q.OrderByDescending(p => p.StartDate),
            "enddate" => query.SortOrder == "asc" ? q.OrderBy(p => p.EndDate) : q.OrderByDescending(p => p.EndDate),
            _ => query.SortOrder == "asc" ? q.OrderBy(p => p.UpdatedAt) : q.OrderByDescending(p => p.UpdatedAt),
        };

        var projects = await q.AsNoTracking().ToListAsync(cancellationToken);
        return projects.Select(p => MapToSummary(p, userId, false, null)).ToList();
    }

    private static ProjectSummaryDto MapToSummary(Project p, Guid userId, bool isPinned, DateTime? pinnedAt)
    {
        return new ProjectSummaryDto
        {
            Id = p.Id,
            Name = p.Name,
            Description = p.Description,
            StartDate = p.StartDate,
            EndDate = p.EndDate,
            Deadline = p.Deadline,
            Status = p.Status,
            Progress = p.Progress,
            Color = p.Color,
            OwnerId = p.OwnerId,
            OwnerUsername = p.Owner?.Username ?? string.Empty,
            UserRole = p.OwnerId == userId ? "Owner" : (p.Members.FirstOrDefault(m => m.UserId == userId)?.Role ?? "Viewer"),
            MemberCount = p.Members.Count,
            BoardCount = p.Boards.Count,
            CreatedAt = p.CreatedAt,
            IsPinned = isPinned,
            PinnedAt = pinnedAt
        };
    }

    public async Task<ProjectDetailDto> CreateProjectAsync(Guid userId, CreateProjectRequest request, CancellationToken cancellationToken = default)
    {
        var nameExists = await _projectRepo.Query()
            .AnyAsync(p => p.OwnerId == userId && p.Name == request.Name, cancellationToken);
        if (nameExists)
            throw new InvalidOperationException($"You already have a project named \"{request.Name}\".");

        var now = DateTime.UtcNow;
        var project = new Project
        {
            OwnerId = userId,
            Name = request.Name,
            Description = request.Description,
            StartDate = request.StartDate.HasValue
                ? DateTime.SpecifyKind(request.StartDate.Value, DateTimeKind.Utc)
                : null,
            EndDate = request.EndDate.HasValue
                ? DateTime.SpecifyKind(request.EndDate.Value, DateTimeKind.Utc)
                : null,
            Deadline = request.Deadline.HasValue
                ? DateTime.SpecifyKind(request.Deadline.Value, DateTimeKind.Utc)
                : null,
            Status = "Active",
            Progress = 0,
            Color = request.Color ?? "violet",
            CreatedAt = now,
            UpdatedAt = now
        };

        await _projectRepo.AddAsync(project, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetProjectByIdAsync(userId, project.Id, cancellationToken);
    }

    public async Task<ProjectDetailDto> GetProjectByIdAsync(Guid userId, Guid projectId, CancellationToken cancellationToken = default)
    {
        var project = await _projectRepo.Query()
            .Include(p => p.Owner)
            .Include(p => p.Members).ThenInclude(m => m.User)
            .Include(p => p.Boards)
            .Include(p => p.Notebooks)
            .Include(p => p.ProjectFolders)
            .Include(p => p.Notes).ThenInclude(n => n.NoteTags).ThenInclude(nt => nt.Tag)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken)
            ?? throw new KeyNotFoundException("Project not found.");

        if (project.OwnerId != userId && !project.Members.Any(m => m.UserId == userId))
            throw new UnauthorizedAccessException("Access denied.");

        var userRole = project.OwnerId == userId
            ? "Owner"
            : (project.Members.FirstOrDefault(m => m.UserId == userId)?.Role ?? "Viewer");

        return new ProjectDetailDto
        {
            Id = project.Id,
            Name = project.Name,
            Description = project.Description,
            StartDate = project.StartDate,
            EndDate = project.EndDate,
            Deadline = project.Deadline,
            Status = project.Status,
            Progress = project.Progress,
            Color = project.Color,
            ShowEventsOnMainCalendar = project.ShowEventsOnMainCalendar,
            MyShowOnPersonalCalendar = project.OwnerId == userId
                ? project.OwnerShowOnPersonalCalendar
                : project.Members.FirstOrDefault(m => m.UserId == userId)?.ShowOnPersonalCalendar,
            OwnerId = project.OwnerId,
            OwnerUsername = project.Owner?.Username ?? string.Empty,
            UserRole = userRole,
            CreatedAt = project.CreatedAt,
            Members = project.Members.Select(m => new ProjectMemberDto
            {
                UserId = m.UserId,
                Username = m.User?.Username ?? string.Empty,
                Email = m.User?.Email ?? string.Empty,
                Role = m.Role,
                JoinedAt = m.JoinedAt
            }).ToList(),
            Folders = project.ProjectFolders
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
                }).ToList(),
            Boards = project.Boards.Select(b => new BoardSummaryDto
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
                UpdatedAt = b.UpdatedAt
            }).ToList(),
            Notebooks = project.Notebooks.Select(n => new NotebookSummaryDto
            {
                Id = n.Id,
                Name = n.Name,
                ProjectId = n.ProjectId,
                ProjectFolderId = n.ProjectFolderId,
                IsPinned = n.IsPinned,
                PinnedAt = n.PinnedAt,
                CreatedAt = n.CreatedAt,
                UpdatedAt = n.UpdatedAt
            }).ToList(),
            Notes = project.Notes.Select(n => new NoteSummaryDto
            {
                Id = n.Id,
                Title = n.Title,
                FolderId = n.FolderId,
                ProjectId = n.ProjectId,
                Tags = n.NoteTags.Select(nt => new TagDto
                {
                    Id = nt.Tag!.Id,
                    Name = nt.Tag.Name,
                    Color = nt.Tag.Color
                }).ToList(),
                CreatedAt = n.CreatedAt,
                UpdatedAt = n.UpdatedAt
            }).ToList()
        };
    }

    public async Task UpdateProjectAsync(Guid userId, Guid projectId, UpdateProjectRequest request, CancellationToken cancellationToken = default)
    {
        var project = await _projectRepo.Query()
            .FirstOrDefaultAsync(p => p.Id == projectId && p.OwnerId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Project not found or access denied.");

        project.Name = request.Name;
        project.Description = request.Description;
        project.StartDate = request.StartDate.HasValue
            ? DateTime.SpecifyKind(request.StartDate.Value, DateTimeKind.Utc)
            : null;
        project.EndDate = request.EndDate.HasValue
            ? DateTime.SpecifyKind(request.EndDate.Value, DateTimeKind.Utc)
            : null;
        project.Deadline = request.Deadline.HasValue
            ? DateTime.SpecifyKind(request.Deadline.Value, DateTimeKind.Utc)
            : null;
        project.Status = request.Status;
        project.Progress = request.Progress;
        project.Color = request.Color ?? project.Color;
        if (request.ShowEventsOnMainCalendar.HasValue)
            project.ShowEventsOnMainCalendar = request.ShowEventsOnMainCalendar.Value;
        project.UpdatedAt = DateTime.UtcNow;

        _projectRepo.Update(project);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateMyProjectCalendarPreferenceAsync(
        Guid userId,
        Guid projectId,
        UpdateMyProjectCalendarPreferenceRequest request,
        CancellationToken cancellationToken = default)
    {
        var project = await _projectRepo.Query()
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken)
            ?? throw new KeyNotFoundException("Project not found.");

        if (project.OwnerId == userId)
        {
            project.OwnerShowOnPersonalCalendar = request.ShowOnPersonalCalendar;
            project.UpdatedAt = DateTime.UtcNow;
            _projectRepo.Update(project);
        }
        else
        {
            var member = await _memberRepo.Query()
                .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == userId, cancellationToken);
            if (member is null)
                throw new UnauthorizedAccessException("Access denied.");

            member.ShowOnPersonalCalendar = request.ShowOnPersonalCalendar;
            _memberRepo.Update(member);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteProjectAsync(Guid userId, Guid projectId, CancellationToken cancellationToken = default)
    {
        var project = await _projectRepo.Query()
            .FirstOrDefaultAsync(p => p.Id == projectId && p.OwnerId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Project not found or access denied.");

        _projectRepo.Delete(project);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task AddMemberAsync(Guid userId, Guid projectId, AddMemberRequest request, CancellationToken cancellationToken = default)
    {
        var project = await _projectRepo.Query()
            .FirstOrDefaultAsync(p => p.Id == projectId && p.OwnerId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Project not found or access denied.");

        User? invitedUser = null;
        if (request.UserId.HasValue)
        {
            invitedUser = await _userRepo.GetByIdAsync(request.UserId.Value, cancellationToken);
        }
        if (invitedUser is null && !string.IsNullOrWhiteSpace(request.Email))
        {
            invitedUser = await _userRepo.Query()
                .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);
        }
        if (invitedUser is null)
            throw new KeyNotFoundException("User not found. Provide an email or select a friend.");

        var alreadyMember = await _memberRepo.Query()
            .AnyAsync(m => m.ProjectId == projectId && m.UserId == invitedUser.Id, cancellationToken);
        if (alreadyMember)
            throw new InvalidOperationException("User is already a member of this project.");

        var member = new ProjectMember
        {
            ProjectId = projectId,
            UserId = invitedUser.Id,
            Role = request.Role,
            JoinedAt = DateTime.UtcNow,
            InvitedByUserId = userId
        };

        await _memberRepo.AddAsync(member, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ProjectMemberDto>> GetMembersAsync(Guid userId, Guid projectId, CancellationToken cancellationToken = default)
    {
        var hasAccess = await _projectRepo.Query()
            .AnyAsync(p => p.Id == projectId &&
                (p.OwnerId == userId || p.Members.Any(m => m.UserId == userId)), cancellationToken);
        if (!hasAccess)
            throw new KeyNotFoundException("Project not found or access denied.");

        var members = await _memberRepo.Query()
            .Include(m => m.User)
            .Where(m => m.ProjectId == projectId)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return members.Select(m => new ProjectMemberDto
        {
            UserId = m.UserId,
            Username = m.User?.Username ?? string.Empty,
            Email = m.User?.Email ?? string.Empty,
            Role = m.Role,
            JoinedAt = m.JoinedAt
        }).ToList();
    }

    public async Task UpdateMemberRoleAsync(Guid userId, Guid projectId, Guid memberId, UpdateMemberRoleRequest request, CancellationToken cancellationToken = default)
    {
        var isOwner = await _projectRepo.Query()
            .AnyAsync(p => p.Id == projectId && p.OwnerId == userId, cancellationToken);
        if (!isOwner)
            throw new UnauthorizedAccessException("Only the project owner can update member roles.");

        var member = await _memberRepo.Query()
            .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == memberId, cancellationToken)
            ?? throw new KeyNotFoundException("Member not found.");

        member.Role = request.Role;
        _memberRepo.Update(member);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveMemberAsync(Guid userId, Guid projectId, Guid memberId, CancellationToken cancellationToken = default)
    {
        var isOwner = await _projectRepo.Query()
            .AnyAsync(p => p.Id == projectId && p.OwnerId == userId, cancellationToken);
        if (!isOwner)
            throw new UnauthorizedAccessException("Only the project owner can remove members.");

        var member = await _memberRepo.Query()
            .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == memberId, cancellationToken)
            ?? throw new KeyNotFoundException("Member not found.");

        _memberRepo.Delete(member);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task LeaveProjectAsync(Guid userId, Guid projectId, CancellationToken cancellationToken = default)
    {
        var project = await _projectRepo.Query()
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken)
            ?? throw new KeyNotFoundException("Project not found.");

        if (project.OwnerId == userId)
            throw new InvalidOperationException("Project owners cannot leave. Delete the project or transfer ownership instead.");

        var member = await _memberRepo.Query()
            .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("You are not a member of this project.");

        _memberRepo.Delete(member);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task TransferOwnershipAsync(Guid userId, Guid projectId, TransferOwnershipRequest request, CancellationToken cancellationToken = default)
    {
        var project = await _projectRepo.Query()
            .Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.Id == projectId && p.OwnerId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Project not found or access denied.");

        if (request.NewOwnerId == userId)
            throw new InvalidOperationException("You already own this project.");

        var newOwnerMembership = project.Members.FirstOrDefault(m => m.UserId == request.NewOwnerId)
            ?? throw new InvalidOperationException("The new owner must be an existing project member.");

        var previousOwnerId = project.OwnerId;

        // Remove new owner from members (they become owner)
        _memberRepo.Delete(newOwnerMembership);

        // Add previous owner as a member (Editor) so they retain access
        var previousOwnerMember = new ProjectMember
        {
            ProjectId = projectId,
            UserId = previousOwnerId,
            Role = "Editor",
            JoinedAt = DateTime.UtcNow,
            InvitedByUserId = request.NewOwnerId
        };
        await _memberRepo.AddAsync(previousOwnerMember, cancellationToken);

        // Transfer ownership
        project.OwnerId = request.NewOwnerId;
        project.UpdatedAt = DateTime.UtcNow;
        _projectRepo.Update(project);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task ToggleProjectPinAsync(Guid userId, Guid projectId, bool isPinned, CancellationToken cancellationToken = default)
    {
        try
        {
            var hasAccess = await _projectRepo.Query()
                .AnyAsync(p => p.Id == projectId && (p.OwnerId == userId || p.Members.Any(m => m.UserId == userId)), cancellationToken);
            if (!hasAccess)
                throw new KeyNotFoundException("Project not found.");

            var existing = await _pinnedRepo.Query()
                .FirstOrDefaultAsync(x => x.UserId == userId && x.ProjectId == projectId, cancellationToken);

            if (isPinned)
            {
                if (existing == null)
                {
                    await _pinnedRepo.AddAsync(new UserPinnedProject
                    {
                        UserId = userId,
                        ProjectId = projectId,
                        PinnedAt = DateTime.UtcNow
                    }, cancellationToken);
                    await _unitOfWork.SaveChangesAsync(cancellationToken);
                }
            }
            else
            {
                if (existing != null)
                {
                    _pinnedRepo.Delete(existing);
                    await _unitOfWork.SaveChangesAsync(cancellationToken);
                }
            }
        }
        catch (KeyNotFoundException)
        {
            throw;
        }
        catch (Exception ex) when (IsPinningTableMissing(ex))
        {
            // UserPinnedProjects table does not exist (migration not applied); no-op so API returns 200
        }
    }

    public async Task<IReadOnlyList<ProjectSummaryDto>> GetPinnedProjectsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            var pinned = await _pinnedRepo.Query()
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.PinnedAt)
                .Select(x => x.ProjectId)
                .ToListAsync(cancellationToken);

            if (pinned.Count == 0)
                return Array.Empty<ProjectSummaryDto>();

            var projects = await _projectRepo.Query()
                .Include(p => p.Owner)
                .Include(p => p.Members)
                .Include(p => p.Boards)
                .Include(p => p.PinnedByUsers)
                .Where(p => pinned.Contains(p.Id) && (p.OwnerId == userId || p.Members.Any(m => m.UserId == userId)))
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            var order = pinned.Select((id, i) => (id, i)).ToDictionary(x => x.id, x => x.i);
            return projects
                .OrderBy(p => order.GetValueOrDefault(p.Id, int.MaxValue))
                .Select(p =>
                {
                    var pin = p.PinnedByUsers?.FirstOrDefault(x => x.UserId == userId);
                    return MapToSummary(p, userId, true, pin?.PinnedAt);
                })
                .ToList();
        }
        catch (DbUpdateException)
        {
            return Array.Empty<ProjectSummaryDto>();
        }
        catch (InvalidOperationException)
        {
            return Array.Empty<ProjectSummaryDto>();
        }
        catch (Exception ex) when (IsPinningTableMissing(ex))
        {
            return Array.Empty<ProjectSummaryDto>();
        }
    }
}
