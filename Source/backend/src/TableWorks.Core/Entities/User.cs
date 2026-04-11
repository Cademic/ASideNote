using System.ComponentModel.DataAnnotations;

namespace ASideNote.Core.Entities;

public sealed class User
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }

    /// <summary>Last throttled user interaction or app-open bump (UTC).</summary>
    public DateTime? LastActivityAt { get; set; }

    /// <summary>Last presence heartbeat while the client session is on the app (UTC).</summary>
    public DateTime? LastPresenceAt { get; set; }

    public bool IsActive { get; set; } = true;

    // Email verification
    public bool IsEmailVerified { get; set; }
    public DateTime? EmailVerifiedAt { get; set; }

    // Profile
    public string? ProfilePictureKey { get; set; }
    [MaxLength(200)]
    public string? Bio { get; set; }
    public DateTime? UsernameChangedAt { get; set; }

    /// <summary>When set, the user is soft-deleted and excluded from all queries.</summary>
    public DateTime? DeletedAt { get; set; }

    /// <summary>Total bytes of stored images (R2).</summary>
    public long StorageUsedBytes { get; set; }

    /// <summary>Storage limit in bytes (default 500 MB).</summary>
    public long StorageLimitBytes { get; set; } = 524_288_000;

    public UserPreferences? Preferences { get; set; }
    public ICollection<Note> Notes { get; set; } = new List<Note>();
    public ICollection<IndexCard> IndexCards { get; set; } = new List<IndexCard>();
    public ICollection<Project> OwnedProjects { get; set; } = new List<Project>();
    public ICollection<ProjectMember> ProjectMemberships { get; set; } = new List<ProjectMember>();
    public ICollection<Folder> Folders { get; set; } = new List<Folder>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public ICollection<BoardConnection> BoardConnections { get; set; } = new List<BoardConnection>();
    public ICollection<Board> Boards { get; set; } = new List<Board>();
    public ICollection<Drawing> Drawings { get; set; } = new List<Drawing>();
    public ICollection<CalendarEvent> CalendarEvents { get; set; } = new List<CalendarEvent>();
    public ICollection<ExternalLogin> ExternalLogins { get; set; } = new List<ExternalLogin>();
    public ICollection<UserPinnedProject> PinnedProjects { get; set; } = new List<UserPinnedProject>();
    public ICollection<FriendRequest> SentFriendRequests { get; set; } = new List<FriendRequest>();
    public ICollection<FriendRequest> ReceivedFriendRequests { get; set; } = new List<FriendRequest>();
    public ICollection<Notebook> Notebooks { get; set; } = new List<Notebook>();
    public ICollection<UserStorageItem> StorageItems { get; set; } = new List<UserStorageItem>();
}
