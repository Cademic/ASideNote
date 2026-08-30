namespace ASideNote.Application.DTOs.Users;

public sealed class UpdatePreferencesRequest
{
    public string Theme { get; set; } = "System";
    public bool? HasCompletedTutorial { get; set; }
    public bool? ShowHolidays { get; set; }
}
