namespace ASideNote.Application.DTOs.Users;

public sealed class UpdatePresenceRequest
{
    /// <summary>Periodic ping while the SPA is open.</summary>
    public bool Heartbeat { get; set; }

    /// <summary>User interaction or app open — updates both activity and presence.</summary>
    public bool Interaction { get; set; }

    /// <summary>User left the site or logged out — clears presence only.</summary>
    public bool Leave { get; set; }
}
