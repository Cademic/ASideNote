namespace ASideNote.Core.Entities;

public sealed class UserPreferences
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Theme { get; set; } = "System";
    public string? EmailNotificationsJson { get; set; }
    public bool HasCompletedTutorial { get; set; }
    public bool ShowHolidays { get; set; } = true;
    public DateTime UpdatedAt { get; set; }

    public User? User { get; set; }
}
