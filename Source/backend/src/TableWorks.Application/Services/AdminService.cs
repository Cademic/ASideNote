using Microsoft.EntityFrameworkCore;
using ASideNote.Application.DTOs.Admin;
using ASideNote.Application.DTOs.Common;
using ASideNote.Application.DTOs.Notes;
using ASideNote.Application.DTOs.Projects;
using ASideNote.Application.DTOs.Tags;
using ASideNote.Application.Interfaces;
using ASideNote.Core.Entities;
using ASideNote.Core.Interfaces;

namespace ASideNote.Application.Services;

public sealed class AdminService : IAdminService
{
    private readonly IRepository<User> _userRepo;
    private readonly IRepository<Note> _noteRepo;
    private readonly IRepository<AuditLog> _auditLogRepo;
    private readonly IRepository<Project> _projectRepo;
    private readonly IRepository<Board> _boardRepo;
    private readonly IRepository<Notebook> _notebookRepo;
    private readonly IRepository<CalendarEvent> _calendarEventRepo;
    private readonly IRepository<FriendRequest> _friendRequestRepo;
    private readonly IUnitOfWork _unitOfWork;

    public AdminService(
        IRepository<User> userRepo,
        IRepository<Note> noteRepo,
        IRepository<AuditLog> auditLogRepo,
        IRepository<Project> projectRepo,
        IRepository<Board> boardRepo,
        IRepository<Notebook> notebookRepo,
        IRepository<CalendarEvent> calendarEventRepo,
        IRepository<FriendRequest> friendRequestRepo,
        IUnitOfWork unitOfWork)
    {
        _userRepo = userRepo;
        _noteRepo = noteRepo;
        _auditLogRepo = auditLogRepo;
        _projectRepo = projectRepo;
        _boardRepo = boardRepo;
        _notebookRepo = notebookRepo;
        _calendarEventRepo = calendarEventRepo;
        _friendRequestRepo = friendRequestRepo;
        _unitOfWork = unitOfWork;
    }

    public async Task<PaginatedResponse<AdminUserDto>> GetUsersAsync(AdminUserListQuery query, CancellationToken cancellationToken = default)
    {
        var q = _userRepo.Query()
            .Include(u => u.Notes)
            .Include(u => u.OwnedProjects)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
            q = q.Where(u => u.Username.Contains(query.Search) || u.Email.Contains(query.Search));

        if (!string.IsNullOrWhiteSpace(query.Role))
            q = q.Where(u => u.Role == query.Role);

        if (query.IsActive.HasValue)
            q = q.Where(u => u.IsActive == query.IsActive.Value);

        var total = await q.CountAsync(cancellationToken);

        var users = await q
            .OrderByDescending(u => u.CreatedAt)
            .Skip((query.Page - 1) * query.Limit)
            .Take(query.Limit)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var items = users.Select(u => new AdminUserDto
        {
            Id = u.Id,
            Username = u.Username,
            Email = u.Email,
            Role = u.Role,
            IsActive = u.IsActive,
            CreatedAt = u.CreatedAt,
            LastLoginAt = u.LastLoginAt,
            Stats = new AdminUserStatsDto
            {
                NoteCount = u.Notes.Count,
                ProjectCount = u.OwnedProjects.Count
            }
        }).ToList();

        return new PaginatedResponse<AdminUserDto>
        {
            Items = items,
            Page = query.Page,
            Limit = query.Limit,
            Total = total
        };
    }

    public async Task<AdminStatsDto> GetAdminStatsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var last24h = now.AddHours(-24);
        var last7d = now.AddDays(-7);

        var totalUsers = await _userRepo.Query().CountAsync(cancellationToken);
        var activeUsersCount = await _userRepo.Query().CountAsync(u => u.IsActive, cancellationToken);
        var usersActiveLast24h = await _userRepo.Query().CountAsync(u => u.LastLoginAt.HasValue && u.LastLoginAt.Value >= last24h, cancellationToken);
        var usersActiveLast7d = await _userRepo.Query().CountAsync(u => u.LastLoginAt.HasValue && u.LastLoginAt.Value >= last7d, cancellationToken);

        return new AdminStatsDto
        {
            TotalUsers = totalUsers,
            ActiveUsersCount = activeUsersCount,
            UsersActiveLast24h = usersActiveLast24h,
            UsersActiveLast7d = usersActiveLast7d
        };
    }

    public async Task<AdminAnalyticsDto> GetAdminAnalyticsAsync(CancellationToken cancellationToken = default)
    {
        var eventsCount = await _calendarEventRepo.Query().CountAsync(cancellationToken);
        var noteBoardsCount = await _boardRepo.Query().CountAsync(b => b.BoardType == "NoteBoard", cancellationToken);
        var chalkBoardsCount = await _boardRepo.Query().CountAsync(b => b.BoardType == "ChalkBoard", cancellationToken);
        var notebooksCount = await _notebookRepo.Query().CountAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var creationByMonth = new List<AdminPeriodCountDto>();
        var loginsByMonth = new List<AdminPeriodCountDto>();

        for (var i = 11; i >= 0; i--)
        {
            var date = now.AddMonths(-i);
            var year = date.Year;
            var month = date.Month;
            var periodLabel = date.ToString("MMM yyyy");

            var startOfMonth = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
            var endOfMonth = startOfMonth.AddMonths(1);

            var usersCreatedInMonth = await _userRepo.Query()
                .CountAsync(u => u.CreatedAt >= startOfMonth && u.CreatedAt < endOfMonth, cancellationToken);
            creationByMonth.Add(new AdminPeriodCountDto { Period = periodLabel, Count = usersCreatedInMonth });

            var usersLoggedInMonth = await _userRepo.Query()
                .CountAsync(u => u.LastLoginAt.HasValue && u.LastLoginAt.Value >= startOfMonth && u.LastLoginAt.Value < endOfMonth, cancellationToken);
            loginsByMonth.Add(new AdminPeriodCountDto { Period = periodLabel, Count = usersLoggedInMonth });
        }

        return new AdminAnalyticsDto
        {
            CreationCounts = new AdminCreationCountsDto
            {
                EventsCount = eventsCount,
                NoteBoardsCount = noteBoardsCount,
                ChalkBoardsCount = chalkBoardsCount,
                NotebooksCount = notebooksCount
            },
            UserCreationByMonth = creationByMonth,
            UserLoginsByMonth = loginsByMonth
        };
    }

    public async Task<AdminUserDetailDto> GetUserDetailAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepo.Query()
            .Include(u => u.Notes).ThenInclude(n => n.NoteTags).ThenInclude(nt => nt.Tag)
            .Include(u => u.OwnedProjects).ThenInclude(p => p.Members)
            .Include(u => u.Boards)
            .Include(u => u.Notebooks)
            .Include(u => u.AuditLogs)
            .Include(u => u.SentFriendRequests).ThenInclude(f => f.Receiver)
            .Include(u => u.ReceivedFriendRequests).ThenInclude(f => f.Requester)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        var friends = new List<AdminFriendDto>();
        foreach (var f in user.SentFriendRequests.Where(x => x.Status == FriendRequestStatus.Accepted))
        {
            if (f.Receiver is null) continue;
            friends.Add(new AdminFriendDto { UserId = f.Receiver.Id, Username = f.Receiver.Username, LastLoginAt = f.Receiver.LastLoginAt });
        }
        foreach (var f in user.ReceivedFriendRequests.Where(x => x.Status == FriendRequestStatus.Accepted))
        {
            if (f.Requester is null) continue;
            friends.Add(new AdminFriendDto { UserId = f.Requester.Id, Username = f.Requester.Username, LastLoginAt = f.Requester.LastLoginAt });
        }
        friends = friends.DistinctBy(f => f.UserId).ToList();

        return new AdminUserDetailDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            Stats = new AdminUserStatsDto
            {
                NoteCount = user.Notes.Count,
                ProjectCount = user.OwnedProjects.Count
            },
            Notes = user.Notes.Take(20).Select(n => new NoteSummaryDto
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
            }).ToList(),
            Projects = user.OwnedProjects.Take(20).Select(p => new ProjectSummaryDto
            {
                Id = p.Id,
                Name = p.Name,
                Description = p.Description,
                StartDate = p.StartDate,
                EndDate = p.EndDate,
                Deadline = p.Deadline,
                Status = p.Status,
                Progress = p.Progress,
                OwnerId = p.OwnerId,
                MemberCount = p.Members.Count,
                CreatedAt = p.CreatedAt,
                ShowEventsOnMainCalendar = p.ShowEventsOnMainCalendar,
                MyShowOnPersonalCalendar = null
            }).ToList(),
            Boards = user.Boards.Take(20).Select(b => new AdminBoardSummaryDto
            {
                Id = b.Id,
                Name = b.Name,
                Description = b.Description,
                BoardType = b.BoardType,
                ProjectId = b.ProjectId,
                CreatedAt = b.CreatedAt
            }).ToList(),
            Notebooks = user.Notebooks.Take(20).Select(n => new AdminNotebookSummaryDto
            {
                Id = n.Id,
                Name = n.Name,
                ProjectId = n.ProjectId,
                CreatedAt = n.CreatedAt
            }).ToList(),
            ActivityLog = user.AuditLogs.OrderByDescending(a => a.Timestamp).Take(50).Select(a => new AuditLogDto
            {
                Id = a.Id,
                UserId = a.UserId,
                ActionType = a.ActionType,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                Details = a.DetailsJson,
                IpAddress = a.IpAddress,
                Timestamp = a.Timestamp
            }).ToList(),
            Friends = friends
        };
    }

    public async Task UpdateUserStatusAsync(Guid userId, UpdateUserStatusRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userRepo.GetByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        if (!request.IsActive && user.Role == "Admin")
            throw new InvalidOperationException("Cannot ban an admin account.");

        user.IsActive = request.IsActive;
        _userRepo.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateUserRoleAsync(Guid userId, UpdateUserRoleRequest request, CancellationToken cancellationToken = default)
    {
        var role = request.Role?.Trim() ?? string.Empty;
        if (role != "User" && role != "Admin")
            throw new ArgumentException("Role must be 'User' or 'Admin'.", nameof(request));

        var user = await _userRepo.GetByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        if (user.Role == "Admin" && role == "User")
        {
            var adminCount = await _userRepo.Query().CountAsync(u => u.Role == "Admin", cancellationToken);
            if (adminCount <= 1)
                throw new InvalidOperationException("Cannot demote the last admin.");
        }

        user.Role = role;
        _userRepo.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepo.GetByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        if (user.Role == "Admin")
            throw new InvalidOperationException("Cannot delete an admin account.");

        _userRepo.Delete(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveUserFriendAsync(Guid userId, Guid friendId, CancellationToken cancellationToken = default)
    {
        var request = await _friendRequestRepo.Query()
            .FirstOrDefaultAsync(f => (f.RequesterId == userId && f.ReceiverId == friendId) || (f.RequesterId == friendId && f.ReceiverId == userId), cancellationToken)
            ?? throw new KeyNotFoundException("Friend relationship not found.");
        if (request.Status != FriendRequestStatus.Accepted)
            throw new InvalidOperationException("These users are not friends.");

        request.Status = FriendRequestStatus.Rejected;
        request.RespondedAt = DateTime.UtcNow;
        _friendRequestRepo.Update(request);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteUserProjectAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        var project = await _projectRepo.GetByIdAsync(projectId, cancellationToken)
            ?? throw new KeyNotFoundException("Project not found.");
        _projectRepo.Delete(project);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteUserBoardAsync(Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _boardRepo.GetByIdAsync(boardId, cancellationToken)
            ?? throw new KeyNotFoundException("Board not found.");
        _boardRepo.Delete(board);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteUserNotebookAsync(Guid notebookId, CancellationToken cancellationToken = default)
    {
        var notebook = await _notebookRepo.GetByIdAsync(notebookId, cancellationToken)
            ?? throw new KeyNotFoundException("Notebook not found.");
        _notebookRepo.Delete(notebook);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<PaginatedResponse<AdminNoteDto>> GetNotesAsync(AdminNoteListQuery query, CancellationToken cancellationToken = default)
    {
        var q = _noteRepo.Query()
            .Include(n => n.User)
            .AsQueryable();

        if (query.UserId.HasValue)
            q = q.Where(n => n.UserId == query.UserId.Value);

        if (!string.IsNullOrWhiteSpace(query.Search))
            q = q.Where(n => n.Title != null && n.Title.Contains(query.Search));

        var total = await q.CountAsync(cancellationToken);

        var notes = await q
            .OrderByDescending(n => n.UpdatedAt)
            .Skip((query.Page - 1) * query.Limit)
            .Take(query.Limit)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var items = notes.Select(n => new AdminNoteDto
        {
            Id = n.Id,
            Title = n.Title,
            UserId = n.UserId,
            Username = n.User?.Username ?? string.Empty,
            CreatedAt = n.CreatedAt,
            UpdatedAt = n.UpdatedAt
        }).ToList();

        return new PaginatedResponse<AdminNoteDto>
        {
            Items = items,
            Page = query.Page,
            Limit = query.Limit,
            Total = total
        };
    }

    public async Task DeleteNoteAsync(Guid noteId, CancellationToken cancellationToken = default)
    {
        var note = await _noteRepo.GetByIdAsync(noteId, cancellationToken)
            ?? throw new KeyNotFoundException("Note not found.");

        _noteRepo.Delete(note);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<PaginatedResponse<AuditLogDto>> GetAuditLogsAsync(AuditLogListQuery query, CancellationToken cancellationToken = default)
    {
        var q = _auditLogRepo.Query().AsQueryable();

        if (query.UserId.HasValue)
            q = q.Where(a => a.UserId == query.UserId.Value);

        if (!string.IsNullOrWhiteSpace(query.ActionType))
            q = q.Where(a => a.ActionType == query.ActionType);

        if (query.StartDate.HasValue)
            q = q.Where(a => a.Timestamp >= query.StartDate.Value);

        if (query.EndDate.HasValue)
            q = q.Where(a => a.Timestamp <= query.EndDate.Value);

        var total = await q.CountAsync(cancellationToken);

        var logs = await q
            .OrderByDescending(a => a.Timestamp)
            .Skip((query.Page - 1) * query.Limit)
            .Take(query.Limit)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var items = logs.Select(a => new AuditLogDto
        {
            Id = a.Id,
            UserId = a.UserId,
            ActionType = a.ActionType,
            EntityType = a.EntityType,
            EntityId = a.EntityId,
            Details = a.DetailsJson,
            IpAddress = a.IpAddress,
            Timestamp = a.Timestamp
        }).ToList();

        return new PaginatedResponse<AuditLogDto>
        {
            Items = items,
            Page = query.Page,
            Limit = query.Limit,
            Total = total
        };
    }
}
