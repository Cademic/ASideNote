using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ASideNote.Application.Interfaces;
using ASideNote.Core.Entities;
using ASideNote.Core.Interfaces;
using System.Security.Claims;

namespace ASideNote.API.Hubs;

[Authorize]
public sealed class BoardHub : Hub
{
    public const string GroupPrefix = "board:";
    private readonly IBoardAccessService _boardAccess;
    private readonly IBoardPresenceService _presence;
    private readonly IRepository<User> _userRepo;
    private readonly ILogger<BoardHub> _logger;

    public BoardHub(
        IBoardAccessService boardAccess,
        IBoardPresenceService presence,
        IRepository<User> userRepo,
        ILogger<BoardHub> logger)
    {
        _boardAccess = boardAccess;
        _presence = presence;
        _userRepo = userRepo;
        _logger = logger;
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var boardIds = _presence.RemovePresence(Context.ConnectionId!);
        var userId = GetUserId();
        foreach (var boardId in boardIds)
        {
            if (userId.HasValue)
                await Clients.Group(GroupPrefix + boardId.ToString()).SendAsync("UserLeft", userId.Value);
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinBoard(Guid boardId)
    {
        var cancellationToken = Context.ConnectionAborted;
        var userId = GetUserId();
        if (userId is null)
        {
            _logger.LogWarning("JoinBoard: User not authenticated. Claims present: {HasUser}",
                Context.User != null);
            throw new HubException("Unauthorized");
        }

        var hasAccess = await _boardAccess.HasReadAccessAsync(userId.Value, boardId, cancellationToken);
        if (!hasAccess)
        {
            _logger.LogWarning("JoinBoard: User {UserId} has no read access to board {BoardId}", userId, boardId);
            throw new HubException("Access denied to this board.");
        }

        var role = await _boardAccess.GetRoleAsync(userId.Value, boardId, cancellationToken);

        await Groups.AddToGroupAsync(Context.ConnectionId, GroupPrefix + boardId.ToString(), cancellationToken);

        var displayName = await _userRepo.Query()
            .Where(u => u.Id == userId.Value)
            .Select(u => u.Username)
            .FirstOrDefaultAsync(cancellationToken) ?? userId.Value.ToString();

        _presence.AddPresence(boardId, Context.ConnectionId!, userId.Value, displayName, role);

        var presenceList = _presence.GetPresence(boardId)
            .Select(p => new { userId = p.UserId, displayName = p.DisplayName, role = p.Role })
            .ToList();
        await Clients.Caller.SendAsync("PresenceList", presenceList, cancellationToken);
        await Clients.OthersInGroup(GroupPrefix + boardId.ToString()).SendAsync("UserJoined", userId.Value, displayName, role, cancellationToken);

        _logger.LogDebug("JoinBoard: User {UserId} joined board {BoardId}", userId, boardId);
    }

    public async Task LeaveBoard(Guid boardId)
    {
        var cancellationToken = Context.ConnectionAborted;
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupPrefix + boardId.ToString(), cancellationToken);
        var leftUserId = _presence.LeaveBoard(boardId, Context.ConnectionId!);
        if (leftUserId.HasValue)
            await Clients.OthersInGroup(GroupPrefix + boardId.ToString()).SendAsync("UserLeft", leftUserId.Value, cancellationToken);
    }

    public async Task UserFocusingItem(Guid boardId, string itemType, string? itemId)
    {
        var userId = GetUserId();
        if (userId is null) return;
        var groupName = GroupPrefix + boardId.ToString();
        await Clients.OthersInGroup(groupName).SendAsync("UserFocusingItem", userId.Value, itemType ?? "", itemId);
    }

    public async Task CursorPosition(Guid boardId, double x, double y)
    {
        var userId = GetUserId();
        if (userId is null) return;
        var groupName = GroupPrefix + boardId.ToString();
        await Clients.OthersInGroup(groupName).SendAsync("CursorPosition", userId.Value, x, y);
    }

    /// <summary>Broadcast text cursor position within a note/card editor for collaborative editing.</summary>
    public async Task TextCursorPosition(Guid boardId, string itemType, string itemId, string field, int position)
    {
        var userId = GetUserId();
        if (userId is null) return;
        var groupName = GroupPrefix + boardId.ToString();
        await Clients.OthersInGroup(groupName).SendAsync("TextCursorPosition", userId.Value, itemType ?? "", itemId ?? "", field ?? "content", position);
    }

    private Guid? GetUserId()
    {
        var sub = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? Context.User?.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
