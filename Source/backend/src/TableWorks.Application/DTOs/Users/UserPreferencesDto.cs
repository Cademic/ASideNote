namespace ASideNote.Application.DTOs.Users;

public sealed class UserPreferencesDto
{
    public string Theme { get; set; } = "System";
    public string? EmailNotifications { get; set; }
    public bool HasCompletedTutorial { get; set; }
    public bool ShowHolidays { get; set; } = true;
}
