namespace ASideNote.Application.Interfaces;

/// <summary>
/// Provides read/write access checks for boards, including project-member access.
/// Use when authorizing access to board content (notes, index cards, connections, drawing).
/// </summary>
public interface IBoardAccessService
{
    /// <summary>True if the user may view the board and its content (owner or any project member).</summary>
    Task<bool> HasReadAccessAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);

    /// <summary>True if the user may modify the board and its content (owner or project Owner/Editor).</summary>
    Task<bool> HasWriteAccessAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);

    /// <summary>The user's role on this board: "Owner" (board creator or project owner), "Editor", or "Viewer"/other project role. Assumes the caller already has read access.</summary>
    Task<string> GetRoleAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
}
