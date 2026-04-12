using ASideNote.Application.DTOs.Users;

namespace ASideNote.Application.Interfaces;

public interface IUserService
{
    Task<UserProfileDto> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default);
    Task UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken = default);
    Task<UserPreferencesDto> GetPreferencesAsync(Guid userId, CancellationToken cancellationToken = default);
    Task UpdatePreferencesAsync(Guid userId, UpdatePreferencesRequest request, CancellationToken cancellationToken = default);
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default);
    Task DeleteAccountAsync(Guid userId, string? password, CancellationToken cancellationToken = default);

    Task<UserPublicDto?> GetPublicProfileAsync(Guid userId, Guid currentUserId, CancellationToken cancellationToken = default);
    Task<UserPublicDto?> GetPublicProfileByUsernameAsync(string username, Guid currentUserId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UserPublicDto>> SearchUsersAsync(Guid currentUserId, string query, int limit, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FriendDto>> GetFriendsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FriendRequestDto>> GetPendingReceivedRequestsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SentFriendRequestDto>> GetPendingSentRequestsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task SendFriendRequestAsync(Guid requesterId, Guid receiverId, CancellationToken cancellationToken = default);
    Task AcceptFriendRequestAsync(Guid userId, Guid requestId, CancellationToken cancellationToken = default);
    Task RejectFriendRequestAsync(Guid userId, Guid requestId, CancellationToken cancellationToken = default);
    Task CancelFriendRequestAsync(Guid userId, Guid requestId, CancellationToken cancellationToken = default);
    Task RemoveFriendAsync(Guid userId, Guid friendId, CancellationToken cancellationToken = default);
    Task<FriendStatusDto?> GetFriendStatusAsync(Guid currentUserId, Guid otherUserId, CancellationToken cancellationToken = default);

    Task RecordPresenceAsync(Guid userId, UpdatePresenceRequest request, CancellationToken cancellationToken = default);
}
