namespace ASideNote.Application.Projects;

/// <summary>
/// Linear calendar-day progress between start and end (UTC dates).
/// </summary>
public static class ProjectAutoProgress
{
    public static int ComputePercent(DateTime? startUtc, DateTime? endUtc, DateTime utcNow)
    {
        if (!startUtc.HasValue || !endUtc.HasValue) return 0;

        var start = DateTime.SpecifyKind(startUtc.Value, DateTimeKind.Utc).Date;
        var end = DateTime.SpecifyKind(endUtc.Value, DateTimeKind.Utc).Date;
        var today = utcNow.Kind == DateTimeKind.Utc ? utcNow.Date : utcNow.ToUniversalTime().Date;

        if (today < start) return 0;
        if (today >= end) return 100;

        var totalDays = (end - start).TotalDays;
        if (totalDays <= 0) return 100;

        var elapsed = (today - start).TotalDays;
        var pct = elapsed / totalDays * 100.0;
        return (int)Math.Round(Math.Clamp(pct, 0, 100));
    }
}
