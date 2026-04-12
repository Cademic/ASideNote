namespace ASideNote.Application.DTOs.Users;

public sealed class UserProfileDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    /// <summary>Last throttled interaction or app-open (UTC).</summary>
    public DateTime? LastActivityAt { get; set; }

    /// <summary>When the previous session ended (UTC); used for &quot;time since last session&quot;.</summary>
    public DateTime? LastSessionEndAt { get; set; }

    public string? ProfilePictureKey { get; set; }
    public string? Bio { get; set; }
    public DateTime? UsernameChangedAt { get; set; }
}
