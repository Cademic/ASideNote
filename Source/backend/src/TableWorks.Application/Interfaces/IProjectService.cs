using ASideNote.Application.DTOs.Projects;

namespace ASideNote.Application.Interfaces;

public interface IProjectService
{
    Task<IReadOnlyList<ProjectSummaryDto>> GetProjectsAsync(Guid userId, ProjectListQuery query, CancellationToken cancellationToken = default);
    Task<ProjectDetailDto> CreateProjectAsync(Guid userId, CreateProjectRequest request, CancellationToken cancellationToken = default);
    Task<ProjectDetailDto> GetProjectByIdAsync(Guid userId, Guid projectId, CancellationToken cancellationToken = default);
    Task UpdateProjectAsync(Guid userId, Guid projectId, UpdateProjectRequest request, CancellationToken cancellationToken = default);
    Task UpdateMyProjectCalendarPreferenceAsync(Guid userId, Guid projectId, UpdateMyProjectCalendarPreferenceRequest request, CancellationToken cancellationToken = default);
    Task DeleteProjectAsync(Guid userId, Guid projectId, CancellationToken cancellationToken = default);
    Task AddMemberAsync(Guid userId, Guid projectId, AddMemberRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProjectMemberDto>> GetMembersAsync(Guid userId, Guid projectId, CancellationToken cancellationToken = default);
    Task UpdateMemberRoleAsync(Guid userId, Guid projectId, Guid memberId, UpdateMemberRoleRequest request, CancellationToken cancellationToken = default);
    Task RemoveMemberAsync(Guid userId, Guid projectId, Guid memberId, CancellationToken cancellationToken = default);
    Task LeaveProjectAsync(Guid userId, Guid projectId, CancellationToken cancellationToken = default);
    Task TransferOwnershipAsync(Guid userId, Guid projectId, TransferOwnershipRequest request, CancellationToken cancellationToken = default);
    Task ToggleProjectPinAsync(Guid userId, Guid projectId, bool isPinned, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProjectSummaryDto>> GetPinnedProjectsAsync(Guid userId, CancellationToken cancellationToken = default);
}
