namespace ASideNote.Application.Utilities;

public static class UserPresenceHelper
{
    public const int PresenceStaleSeconds = 120;
    public const int IdleMinutes = 10;

    /// <summary>Returns "active", "idle", or "inactive" for API and UI.</summary>
    public static string ComputePresenceStatus(DateTime? lastPresenceAt, DateTime? lastActivityAt, DateTime nowUtc)
    {
        if (lastPresenceAt is null || (nowUtc - lastPresenceAt.Value).TotalSeconds > PresenceStaleSeconds)
            return "inactive";

        if (lastActivityAt is null || (nowUtc - lastActivityAt.Value).TotalMinutes > IdleMinutes)
            return "idle";

        return "active";
    }

    public static int PresenceSortOrder(string presenceStatus) =>
        presenceStatus switch
        {
            "active" => 0,
            "idle" => 1,
            _ => 2
        };
}
