using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ASideNote.Application.DTOs.Users;
using ASideNote.Application.Interfaces;
using ASideNote.Application.Utilities;
using ASideNote.Core.Entities;
using ASideNote.Core.Interfaces;

namespace ASideNote.Application.Services;

public sealed class UserService : IUserService
{
    /// <summary>Allowed profile picture keys (preset avatars). Must match frontend public/avatars/.</summary>
    private static readonly HashSet<string> AllowedProfilePictureKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "avatar-1", "avatar-2", "avatar-3", "avatar-4", "avatar-5", "avatar-6", "avatar-7", "avatar-8"
    };

    private const int BioMaxLength = 200;
    private const int UsernameChangeCooldownDays = 10;

    private readonly IRepository<User> _userRepo;
    private readonly IRepository<UserPreferences> _prefsRepo;
    private readonly IRepository<RefreshToken> _refreshTokenRepo;
    private readonly IRepository<FriendRequest> _friendRequestRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IConfiguration _configuration;

    public UserService(
        IRepository<User> userRepo,
        IRepository<UserPreferences> prefsRepo,
        IRepository<RefreshToken> refreshTokenRepo,
        IRepository<FriendRequest> friendRequestRepo,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        IConfiguration configuration)
    {
        _userRepo = userRepo;
        _prefsRepo = prefsRepo;
        _refreshTokenRepo = refreshTokenRepo;
        _friendRequestRepo = friendRequestRepo;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
    }

    public async Task<UserProfileDto> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepo.GetByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        var effectiveRole = GetEffectiveRole(user.Email, user.Role);

        return new UserProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            Role = effectiveRole,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            LastActivityAt = user.LastActivityAt,
            LastSessionEndAt = user.LastSessionEndAt,
            ProfilePictureKey = user.ProfilePictureKey,
            Bio = user.Bio,
            UsernameChangedAt = user.UsernameChangedAt
        };
    }

    private string GetEffectiveRole(string email, string dbRole)
    {
        var allowedEmails = _configuration.GetSection("Admin:AllowedEmails").Get<string[]>() ?? [];
        var adminEmails = new HashSet<string>(allowedEmails, StringComparer.OrdinalIgnoreCase);
        return adminEmails.Contains(email) ? "Admin" : dbRole;
    }

    public async Task UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userRepo.GetByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        // Validate profile picture key if provided
        if (request.ProfilePictureKey is not null)
        {
            if (request.ProfilePictureKey.Length > 0 && !AllowedProfilePictureKeys.Contains(request.ProfilePictureKey))
                throw new ArgumentException("Invalid profile picture key.");
            user.ProfilePictureKey = string.IsNullOrWhiteSpace(request.ProfilePictureKey) ? null : request.ProfilePictureKey;
        }

        // Validate bio length
        if (request.Bio is not null)
        {
            if (request.Bio.Length > BioMaxLength)
                throw new ArgumentException($"Bio must not exceed {BioMaxLength} characters.");
            user.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio;
        }

        // Check uniqueness for email
        if (user.Email != request.Email)
        {
            var emailExists = await _userRepo.Query()
                .AnyAsync(u => u.Email == request.Email && u.Id != userId, cancellationToken);
            if (emailExists)
                throw new InvalidOperationException("Email is already in use.");
            user.Email = request.Email;
        }

        // Username change with 10-day cooldown and case-insensitive uniqueness
        if (string.Equals(user.Username, request.Username, StringComparison.OrdinalIgnoreCase) == false)
        {
            var lastChange = user.UsernameChangedAt ?? user.CreatedAt;
            var daysSinceChange = (DateTime.UtcNow - lastChange).TotalDays;
            if (daysSinceChange < UsernameChangeCooldownDays)
                throw new InvalidOperationException(
                    $"Username can only be changed every {UsernameChangeCooldownDays} days. You can change it again in {Math.Ceiling(UsernameChangeCooldownDays - daysSinceChange)} day(s).");

            var usernameExists = await _userRepo.Query()
                .AnyAsync(u => u.Username.ToLower() == request.Username.Trim().ToLower() && u.Id != userId, cancellationToken);
            if (usernameExists)
                throw new InvalidOperationException("Username is already in use.");

            user.Username = request.Username.Trim();
            user.UsernameChangedAt = DateTime.UtcNow;
        }

        _userRepo.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserPreferencesDto> GetPreferencesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var prefs = await _prefsRepo.Query()
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        if (prefs is null)
        {
            return new UserPreferencesDto
            {
                Theme = "System"
            };
        }

        return new UserPreferencesDto
        {
            Theme = prefs.Theme,
            EmailNotifications = prefs.EmailNotificationsJson
        };
    }

    public async Task UpdatePreferencesAsync(Guid userId, UpdatePreferencesRequest request, CancellationToken cancellationToken = default)
    {
        var prefs = await _prefsRepo.Query()
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        if (prefs is null)
        {
            prefs = new UserPreferences
            {
                UserId = userId,
                Theme = request.Theme,
                UpdatedAt = DateTime.UtcNow
            };
            await _prefsRepo.AddAsync(prefs, cancellationToken);
        }
        else
        {
            prefs.Theme = request.Theme;
            prefs.UpdatedAt = DateTime.UtcNow;
            _prefsRepo.Update(prefs);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userRepo.GetByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        if (string.IsNullOrEmpty(user.PasswordHash))
            throw new InvalidOperationException("This account has no password (e.g. Google-only). Password change is not available.");

        if (!_passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
            throw new UnauthorizedAccessException("Current password is incorrect.");

        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        _userRepo.Update(user);

        var activeTokens = await _refreshTokenRepo.Query()
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var token in activeTokens)
        {
            token.RevokedAt = DateTime.UtcNow;
            _refreshTokenRepo.Update(token);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAccountAsync(Guid userId, string? password, CancellationToken cancellationToken = default)
    {
        var user = await _userRepo.GetByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        if (!string.IsNullOrEmpty(user.PasswordHash))
        {
            if (string.IsNullOrEmpty(password))
                throw new UnauthorizedAccessException("Password is required to delete your account.");
            if (!_passwordHasher.VerifyPassword(password, user.PasswordHash))
                throw new UnauthorizedAccessException("Password is incorrect.");
        }

        user.DeletedAt = DateTime.UtcNow;
        _userRepo.Update(user);

        var activeTokens = await _refreshTokenRepo.Query()
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var token in activeTokens)
        {
            token.RevokedAt = DateTime.UtcNow;
            _refreshTokenRepo.Update(token);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserPublicDto?> GetPublicProfileByUsernameAsync(string username, Guid currentUserId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(username)) return null;
        var normalized = username.Trim().ToLowerInvariant();
        var user = await _userRepo.Query()
            .FirstOrDefaultAsync(u => u.Username.ToLower() == normalized, cancellationToken);
        if (user is null) return null;
        return await GetPublicProfileAsync(user.Id, currentUserId, cancellationToken);
    }

    public async Task<UserPublicDto?> GetPublicProfileAsync(Guid userId, Guid currentUserId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepo.GetByIdAsync(userId, cancellationToken);
        if (user is null) return null;

        var friendCount = await _friendRequestRepo.Query()
            .CountAsync(f => (f.RequesterId == userId || f.ReceiverId == userId) && f.Status == FriendRequestStatus.Accepted, cancellationToken);

        return new UserPublicDto
        {
            Id = user.Id,
            Username = user.Username,
            ProfilePictureKey = user.ProfilePictureKey,
            Bio = user.Bio,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            FriendCount = friendCount,
            Role = user.Role
        };
    }

    public async Task<IReadOnlyList<UserPublicDto>> SearchUsersAsync(Guid currentUserId, string query, int limit, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query) || limit <= 0)
            return Array.Empty<UserPublicDto>();

        var q = query.Trim().ToLowerInvariant();
        var excludeUserIds = new HashSet<Guid> { currentUserId };

        // Exclude only friends and users with a pending request (either direction). Rejected requests do not exclude so users can find each other and send again.
        var friendOrPendingUserIds = await _friendRequestRepo.Query()
            .Where(f => (f.RequesterId == currentUserId || f.ReceiverId == currentUserId) && (f.Status == FriendRequestStatus.Accepted || f.Status == FriendRequestStatus.Pending))
            .Select(f => f.RequesterId == currentUserId ? f.ReceiverId : f.RequesterId)
            .Distinct()
            .ToListAsync(cancellationToken);
        foreach (var id in friendOrPendingUserIds)
            excludeUserIds.Add(id);

        var users = await _userRepo.Query()
            .Where(u => (u.Username.ToLower().Contains(q) || u.Email.ToLower().Contains(q)) && !excludeUserIds.Contains(u.Id))
            .OrderBy(u => u.Username)
            .Take(limit)
            .AsNoTracking()
            .Select(u => new UserPublicDto
            {
                Id = u.Id,
                Username = u.Username,
                ProfilePictureKey = u.ProfilePictureKey,
                Bio = u.Bio
            })
            .ToListAsync(cancellationToken);

        return users;
    }

    public async Task<IReadOnlyList<FriendDto>> GetFriendsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var accepted = await _friendRequestRepo.Query()
            .Where(f => (f.RequesterId == userId || f.ReceiverId == userId) && f.Status == FriendRequestStatus.Accepted)
            .Include(f => f.Requester)
            .Include(f => f.Receiver)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var friends = new List<FriendDto>();
        var now = DateTime.UtcNow;
        foreach (var f in accepted)
        {
            var other = f.RequesterId == userId ? f.Receiver : f.Requester;
            if (other is null) continue;
            var status = UserPresenceHelper.ComputePresenceStatus(other.LastPresenceAt, other.LastActivityAt, now);
            friends.Add(new FriendDto
            {
                Id = other.Id,
                Username = other.Username,
                ProfilePictureKey = other.ProfilePictureKey,
                LastLoginAt = other.LastLoginAt,
                LastActivityAt = other.LastActivityAt,
                PresenceStatus = status
            });
        }
        return friends
            .OrderBy(x => UserPresenceHelper.PresenceSortOrder(x.PresenceStatus))
            .ThenByDescending(x => x.LastActivityAt ?? DateTime.MinValue)
            .ToList();
    }

    public async Task RecordPresenceAsync(Guid userId, UpdatePresenceRequest request, CancellationToken cancellationToken = default)
    {
        if (!request.Leave && !request.Interaction && !request.Heartbeat)
            throw new ArgumentException("At least one of leave, interaction, or heartbeat must be true.");

        var user = await _userRepo.GetByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        if (request.Leave)
        {
            var endedAt = DateTime.UtcNow;
            user.LastPresenceAt = null;
            user.LastSessionEndAt = endedAt;
            _userRepo.Update(user);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return;
        }

        var now = DateTime.UtcNow;
        if (request.Interaction)
        {
            user.LastActivityAt = now;
            user.LastPresenceAt = now;
        }
        else
        {
            user.LastPresenceAt = now;
        }

        _userRepo.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<FriendRequestDto>> GetPendingReceivedRequestsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _friendRequestRepo.Query()
            .Where(f => f.ReceiverId == userId && f.Status == FriendRequestStatus.Pending)
            .OrderByDescending(f => f.CreatedAt)
            .Include(f => f.Requester)
            .AsNoTracking()
            .Select(f => new FriendRequestDto
            {
                Id = f.Id,
                RequesterId = f.RequesterId,
                RequesterUsername = f.Requester != null ? f.Requester.Username : "",
                RequesterProfilePictureKey = f.Requester != null ? f.Requester.ProfilePictureKey : null,
                CreatedAt = f.CreatedAt,
                Status = (int)f.Status
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SentFriendRequestDto>> GetPendingSentRequestsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _friendRequestRepo.Query()
            .Where(f => f.RequesterId == userId && f.Status == FriendRequestStatus.Pending)
            .OrderByDescending(f => f.CreatedAt)
            .Include(f => f.Receiver)
            .AsNoTracking()
            .Select(f => new SentFriendRequestDto
            {
                Id = f.Id,
                ReceiverId = f.ReceiverId,
                ReceiverUsername = f.Receiver != null ? f.Receiver.Username : "",
                ReceiverProfilePictureKey = f.Receiver != null ? f.Receiver.ProfilePictureKey : null,
                CreatedAt = f.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task SendFriendRequestAsync(Guid requesterId, Guid receiverId, CancellationToken cancellationToken = default)
    {
        if (requesterId == receiverId)
            throw new InvalidOperationException("You cannot send a friend request to yourself.");

        var receiver = await _userRepo.GetByIdAsync(receiverId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        var existing = await _friendRequestRepo.Query()
            .FirstOrDefaultAsync(f => (f.RequesterId == requesterId && f.ReceiverId == receiverId) || (f.RequesterId == receiverId && f.ReceiverId == requesterId), cancellationToken);
        if (existing is not null)
        {
            if (existing.Status == FriendRequestStatus.Accepted)
                throw new InvalidOperationException("You are already friends with this user.");
            if (existing.Status == FriendRequestStatus.Pending)
                throw new InvalidOperationException("A friend request already exists between you and this user.");
            // Rejected: reuse one row. Unique index is on (RequesterId, ReceiverId), so (A,B) and (B,A) can both exist.
            // If we flip direction we must not duplicate (B,A); consolidate to the row with the desired direction.
            var rowHasDesiredDirection = existing.RequesterId == requesterId && existing.ReceiverId == receiverId;
            if (rowHasDesiredDirection)
            {
                var toUpdate = await _friendRequestRepo.GetByIdAsync(existing.Id, cancellationToken)
                    ?? throw new KeyNotFoundException("Friend request not found.");
                toUpdate.Status = FriendRequestStatus.Pending;
                toUpdate.RespondedAt = null;
                toUpdate.CreatedAt = DateTime.UtcNow;
                _friendRequestRepo.Update(toUpdate);
            }
            else
            {
                // Flip direction: (receiverId, requesterId) -> (requesterId, receiverId). Avoid duplicate by using the row that already has (requesterId, receiverId) if it exists.
                var rowWithDesiredDirection = await _friendRequestRepo.Query()
                    .FirstOrDefaultAsync(f => f.RequesterId == requesterId && f.ReceiverId == receiverId, cancellationToken);
                if (rowWithDesiredDirection is not null)
                {
                    var toUpdate = await _friendRequestRepo.GetByIdAsync(rowWithDesiredDirection.Id, cancellationToken)
                        ?? throw new KeyNotFoundException("Friend request not found.");
                    toUpdate.Status = FriendRequestStatus.Pending;
                    toUpdate.RespondedAt = null;
                    toUpdate.CreatedAt = DateTime.UtcNow;
                    _friendRequestRepo.Update(toUpdate);
                    _friendRequestRepo.Delete(existing);
                }
                else
                {
                    var toUpdate = await _friendRequestRepo.GetByIdAsync(existing.Id, cancellationToken)
                        ?? throw new KeyNotFoundException("Friend request not found.");
                    toUpdate.RequesterId = requesterId;
                    toUpdate.ReceiverId = receiverId;
                    toUpdate.Status = FriendRequestStatus.Pending;
                    toUpdate.RespondedAt = null;
                    toUpdate.CreatedAt = DateTime.UtcNow;
                    _friendRequestRepo.Update(toUpdate);
                }
            }
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return;
        }

        var request = new FriendRequest
        {
            RequesterId = requesterId,
            ReceiverId = receiverId,
            Status = FriendRequestStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        await _friendRequestRepo.AddAsync(request, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task AcceptFriendRequestAsync(Guid userId, Guid requestId, CancellationToken cancellationToken = default)
    {
        var request = await _friendRequestRepo.GetByIdAsync(requestId, cancellationToken)
            ?? throw new KeyNotFoundException("Friend request not found.");
        if (request.ReceiverId != userId)
            throw new UnauthorizedAccessException("You can only accept requests sent to you.");
        if (request.Status != FriendRequestStatus.Pending)
            throw new InvalidOperationException("This request has already been responded to.");

        request.Status = FriendRequestStatus.Accepted;
        request.RespondedAt = DateTime.UtcNow;
        _friendRequestRepo.Update(request);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task RejectFriendRequestAsync(Guid userId, Guid requestId, CancellationToken cancellationToken = default)
    {
        var request = await _friendRequestRepo.GetByIdAsync(requestId, cancellationToken)
            ?? throw new KeyNotFoundException("Friend request not found.");
        if (request.ReceiverId != userId)
            throw new UnauthorizedAccessException("You can only reject requests sent to you.");
        if (request.Status != FriendRequestStatus.Pending)
            throw new InvalidOperationException("This request has already been responded to.");

        request.Status = FriendRequestStatus.Rejected;
        request.RespondedAt = DateTime.UtcNow;
        _friendRequestRepo.Update(request);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task CancelFriendRequestAsync(Guid userId, Guid requestId, CancellationToken cancellationToken = default)
    {
        var request = await _friendRequestRepo.GetByIdAsync(requestId, cancellationToken)
            ?? throw new KeyNotFoundException("Friend request not found.");
        if (request.RequesterId != userId)
            throw new UnauthorizedAccessException("You can only cancel requests you sent.");
        if (request.Status != FriendRequestStatus.Pending)
            throw new InvalidOperationException("This request has already been responded to.");

        request.Status = FriendRequestStatus.Rejected;
        request.RespondedAt = DateTime.UtcNow;
        _friendRequestRepo.Update(request);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveFriendAsync(Guid userId, Guid friendId, CancellationToken cancellationToken = default)
    {
        if (userId == friendId)
            throw new InvalidOperationException("You cannot remove yourself as a friend.");

        var request = await _friendRequestRepo.Query()
            .FirstOrDefaultAsync(f => (f.RequesterId == userId && f.ReceiverId == friendId) || (f.RequesterId == friendId && f.ReceiverId == userId), cancellationToken)
            ?? throw new KeyNotFoundException("Friend relationship not found.");
        if (request.Status != FriendRequestStatus.Accepted)
            throw new InvalidOperationException("You are not friends with this user.");

        request.Status = FriendRequestStatus.Rejected;
        request.RespondedAt = DateTime.UtcNow;
        _friendRequestRepo.Update(request);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<FriendStatusDto?> GetFriendStatusAsync(Guid currentUserId, Guid otherUserId, CancellationToken cancellationToken = default)
    {
        if (currentUserId == otherUserId)
            return new FriendStatusDto { Status = "Self" };

        var request = await _friendRequestRepo.Query()
            .Where(f => (f.RequesterId == currentUserId && f.ReceiverId == otherUserId) || (f.RequesterId == otherUserId && f.ReceiverId == currentUserId))
            .OrderByDescending(f => f.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (request is null)
            return new FriendStatusDto { Status = "None" };
        if (request.Status == FriendRequestStatus.Accepted)
            return new FriendStatusDto { Status = "Friends" };
        if (request.RequesterId == currentUserId)
            return new FriendStatusDto { Status = "PendingSent" };
        return new FriendStatusDto { Status = "PendingReceived" };
    }
}
