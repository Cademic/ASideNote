using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ASideNote.Application.DTOs.Projects;
using ASideNote.Application.Interfaces;

namespace ASideNote.API.Controllers;

[Authorize]
[ApiVersion("1.0")]
[ApiController]
[Route("api/v{version:apiVersion}/projects")]
public sealed class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;
    private readonly IProjectFolderService _projectFolderService;
    private readonly IBoardService _boardService;
    private readonly INotebookService _notebookService;
    private readonly ICurrentUserService _currentUserService;

    public ProjectsController(
        IProjectService projectService,
        IProjectFolderService projectFolderService,
        IBoardService boardService,
        INotebookService notebookService,
        ICurrentUserService currentUserService)
    {
        _projectService = projectService;
        _projectFolderService = projectFolderService;
        _boardService = boardService;
        _notebookService = notebookService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ProjectSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProjects([FromQuery] ProjectListQuery query, CancellationToken cancellationToken)
    {
        var result = await _projectService.GetProjectsAsync(_currentUserService.UserId, query, cancellationToken);
        return Ok(result);
    }

    /// <summary>Must be declared before [HttpGet("{id:guid}")] so GET api/v1/projects/pinned matches this action.</summary>
    [HttpGet("pinned", Order = 0)]
    [ProducesResponseType(typeof(IReadOnlyList<ProjectSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPinnedProjects(CancellationToken cancellationToken)
    {
        var result = await _projectService.GetPinnedProjectsAsync(_currentUserService.UserId, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(ProjectDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectRequest request, CancellationToken cancellationToken)
    {
        var result = await _projectService.CreateProjectAsync(_currentUserService.UserId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpGet("{id:guid}", Order = 1)]
    [ProducesResponseType(typeof(ProjectDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProject(Guid id, CancellationToken cancellationToken)
    {
        var result = await _projectService.GetProjectByIdAsync(_currentUserService.UserId, id, cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProject(Guid id, [FromBody] UpdateProjectRequest request, CancellationToken cancellationToken)
    {
        await _projectService.UpdateProjectAsync(_currentUserService.UserId, id, request, cancellationToken);
        return Ok();
    }

    /// <summary>Sets whether this project's events appear on the current user's personal (main/dashboard) calendar.</summary>
    [HttpPatch("{id:guid}/my-calendar")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateMyCalendarPreference(Guid id, [FromBody] UpdateMyProjectCalendarPreferenceRequest request, CancellationToken cancellationToken)
    {
        await _projectService.UpdateMyProjectCalendarPreferenceAsync(_currentUserService.UserId, id, request, cancellationToken);
        return Ok();
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteProject(Guid id, CancellationToken cancellationToken)
    {
        await _projectService.DeleteProjectAsync(_currentUserService.UserId, id, cancellationToken);
        return Ok();
    }

    [HttpPost("{id:guid}/members")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddMember(Guid id, [FromBody] AddMemberRequest request, CancellationToken cancellationToken)
    {
        await _projectService.AddMemberAsync(_currentUserService.UserId, id, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created);
    }

    [HttpGet("{id:guid}/members")]
    [ProducesResponseType(typeof(IReadOnlyList<ProjectMemberDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMembers(Guid id, CancellationToken cancellationToken)
    {
        var result = await _projectService.GetMembersAsync(_currentUserService.UserId, id, cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:guid}/members/{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateMemberRole(Guid id, Guid userId, [FromBody] UpdateMemberRoleRequest request, CancellationToken cancellationToken)
    {
        await _projectService.UpdateMemberRoleAsync(_currentUserService.UserId, id, userId, request, cancellationToken);
        return Ok();
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId, CancellationToken cancellationToken)
    {
        await _projectService.RemoveMemberAsync(_currentUserService.UserId, id, userId, cancellationToken);
        return Ok();
    }

    [HttpPost("{id:guid}/leave")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> LeaveProject(Guid id, CancellationToken cancellationToken)
    {
        await _projectService.LeaveProjectAsync(_currentUserService.UserId, id, cancellationToken);
        return Ok();
    }

    [HttpPost("{id:guid}/transfer")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TransferOwnership(Guid id, [FromBody] TransferOwnershipRequest request, CancellationToken cancellationToken)
    {
        await _projectService.TransferOwnershipAsync(_currentUserService.UserId, id, request, cancellationToken);
        return Ok();
    }

    [HttpGet("{id:guid}/folders")]
    [ProducesResponseType(typeof(IReadOnlyList<ProjectFolderDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFolders(Guid id, CancellationToken cancellationToken)
    {
        var result = await _projectFolderService.GetFoldersAsync(_currentUserService.UserId, id, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:guid}/folders")]
    [ProducesResponseType(typeof(ProjectFolderDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateFolder(Guid id, [FromBody] CreateProjectFolderRequest request, CancellationToken cancellationToken)
    {
        var result = await _projectFolderService.CreateFolderAsync(_currentUserService.UserId, id, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpPatch("{id:guid}/folders/{folderId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateFolder(Guid id, Guid folderId, [FromBody] UpdateProjectFolderRequest request, CancellationToken cancellationToken)
    {
        await _projectFolderService.UpdateFolderAsync(_currentUserService.UserId, id, folderId, request, cancellationToken);
        return Ok();
    }

    [HttpDelete("{id:guid}/folders/{folderId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteFolder(Guid id, Guid folderId, CancellationToken cancellationToken)
    {
        await _projectFolderService.DeleteFolderAsync(_currentUserService.UserId, id, folderId, cancellationToken);
        return Ok();
    }

    [HttpPatch("{id:guid}/boards/{boardId:guid}/folder")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetBoardFolder(Guid id, Guid boardId, [FromBody] SetProjectItemFolderRequest request, CancellationToken cancellationToken)
    {
        await _boardService.SetBoardProjectFolderAsync(_currentUserService.UserId, id, boardId, request.FolderId, cancellationToken);
        return Ok();
    }

    [HttpPatch("{id:guid}/notebooks/{notebookId:guid}/folder")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetNotebookFolder(Guid id, Guid notebookId, [FromBody] SetProjectItemFolderRequest request, CancellationToken cancellationToken)
    {
        await _notebookService.SetNotebookProjectFolderAsync(_currentUserService.UserId, id, notebookId, request.FolderId, cancellationToken);
        return Ok();
    }

    [HttpPost("{id:guid}/boards/{boardId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddBoardToProject(Guid id, Guid boardId, CancellationToken cancellationToken)
    {
        await _boardService.AddBoardToProjectAsync(_currentUserService.UserId, id, boardId, cancellationToken);
        return Ok();
    }

    [HttpDelete("{id:guid}/boards/{boardId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveBoardFromProject(Guid id, Guid boardId, CancellationToken cancellationToken)
    {
        await _boardService.RemoveBoardFromProjectAsync(_currentUserService.UserId, id, boardId, cancellationToken);
        return Ok();
    }

    [HttpPost("{id:guid}/notebooks/{notebookId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddNotebookToProject(Guid id, Guid notebookId, CancellationToken cancellationToken)
    {
        await _notebookService.AddNotebookToProjectAsync(_currentUserService.UserId, id, notebookId, cancellationToken);
        return Ok();
    }

    [HttpDelete("{id:guid}/notebooks/{notebookId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveNotebookFromProject(Guid id, Guid notebookId, CancellationToken cancellationToken)
    {
        await _notebookService.RemoveNotebookFromProjectAsync(_currentUserService.UserId, id, notebookId, cancellationToken);
        return Ok();
    }

    [HttpPut("{id:guid}/pin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TogglePin(Guid id, [FromBody] ProjectTogglePinRequest request, CancellationToken cancellationToken)
    {
        await _projectService.ToggleProjectPinAsync(_currentUserService.UserId, id, request.IsPinned, cancellationToken);
        return Ok();
    }
}

public sealed class ProjectTogglePinRequest
{
    public bool IsPinned { get; set; }
}
