using ASideNote.Application.DTOs.Boards;
using ASideNote.Application.DTOs.Notebooks;
using ASideNote.Application.DTOs.Notes;

namespace ASideNote.Application.DTOs.Projects;

public sealed class ProjectDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? Deadline { get; set; }
    public string Status { get; set; } = string.Empty;
    public int Progress { get; set; }
    public bool AutoProgressEnabled { get; set; }
    public string Color { get; set; } = "violet";
    /// <summary>Always true in current product; per-user visibility uses personal overrides.</summary>
    public bool ShowEventsOnMainCalendar { get; set; } = true;
    /// <summary>Your personal override for this project timeline; null means show (default on).</summary>
    public bool? MyShowOnPersonalCalendar { get; set; }
    public Guid OwnerId { get; set; }
    public string OwnerUsername { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public IReadOnlyList<ProjectMemberDto> Members { get; set; } = Array.Empty<ProjectMemberDto>();
    public IReadOnlyList<ProjectFolderDto> Folders { get; set; } = Array.Empty<ProjectFolderDto>();
    public IReadOnlyList<BoardSummaryDto> Boards { get; set; } = Array.Empty<BoardSummaryDto>();
    public IReadOnlyList<NotebookSummaryDto> Notebooks { get; set; } = Array.Empty<NotebookSummaryDto>();
    public IReadOnlyList<NoteSummaryDto> Notes { get; set; } = Array.Empty<NoteSummaryDto>();
}
