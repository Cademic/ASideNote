namespace ASideNote.Application.Validators;

/// <summary>
/// Fixed board extent (board-space pixels) that note, index-card, and board-image positions must
/// stay within. Mirrors BOARD_MIN_X/BOARD_MAX_X/BOARD_MIN_Y/BOARD_MAX_Y in the frontend's
/// NoteBoardPage.tsx — keep both in sync if this changes.
/// </summary>
public static class BoardBoundsConstants
{
    public const double MinX = -10000;
    public const double MaxX = 10000;
    public const double MinY = -10000;
    public const double MaxY = 10000;
}
