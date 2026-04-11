namespace ASideNote.Application.DTOs.Users;

public sealed class FriendDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? ProfilePictureKey { get; set; }
    public DateTime? LastLoginAt { get; set; }
    /// <summary>Last throttled interaction or app-open (UTC), for &quot;last active&quot; when inactive.</summary>
    public DateTime? LastActivityAt { get; set; }
    /// <summary>active, idle, or inactive (server-computed).</summary>
    public string PresenceStatus { get; set; } = "inactive";
}
