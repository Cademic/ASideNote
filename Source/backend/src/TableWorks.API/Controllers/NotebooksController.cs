using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ASideNote.Application.DTOs.Notebooks;
using ASideNote.Application.DTOs.Common;
using ASideNote.Application.Helpers;
using ASideNote.Application.Interfaces;

namespace ASideNote.API.Controllers;

[Authorize]
[ApiVersion("1.0")]
[ApiController]
[Route("api/v{version:apiVersion}/notebooks")]
public sealed class NotebooksController : ControllerBase
{
    private const long MaxImageSizeBytes = 5 * 1024 * 1024; // 5 MB
    private static readonly string[] AllowedImageTypes = { "image/jpeg", "image/png", "image/webp", "image/gif" };

    private readonly INotebookService _notebookService;
    private readonly INotebookExportService _exportService;
    private readonly IImageStorageService _imageStorage;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserStorageService _userStorage;

    public NotebooksController(
        INotebookService notebookService,
        INotebookExportService exportService,
        ICurrentUserService currentUserService,
        IImageStorageService imageStorage,
        IUserStorageService userStorage)
    {
        _notebookService = notebookService;
        _exportService = exportService;
        _currentUserService = currentUserService;
        _imageStorage = imageStorage;
        _userStorage = userStorage;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PaginatedResponse<NotebookSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNotebooks([FromQuery] NotebookListQuery query, CancellationToken cancellationToken)
    {
        var result = await _notebookService.GetNotebooksAsync(_currentUserService.UserId, query, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(NotebookSummaryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateNotebook([FromBody] CreateNotebookRequest request, CancellationToken cancellationToken)
    {
        var result = await _notebookService.CreateNotebookAsync(_currentUserService.UserId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpGet("pinned")]
    [ProducesResponseType(typeof(IReadOnlyList<NotebookSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPinnedNotebooks(CancellationToken cancellationToken)
    {
        var result = await _notebookService.GetPinnedNotebooksAsync(_currentUserService.UserId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(NotebookDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetNotebook(Guid id, CancellationToken cancellationToken)
    {
        var result = await _notebookService.GetNotebookByIdAsync(_currentUserService.UserId, id, cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateNotebook(Guid id, [FromBody] UpdateNotebookRequest request, CancellationToken cancellationToken)
    {
        await _notebookService.UpdateNotebookAsync(_currentUserService.UserId, id, request, cancellationToken);
        return Ok();
    }

    /// <summary>Upload an image for a notebook. Returns the image URL to insert into content. Accepts JPEG, PNG, WebP, GIF; max 5MB.</summary>
    [HttpPost("{id:guid}/images")]
    [ProducesResponseType(typeof(ImageUploadResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status413PayloadTooLarge)]
    [RequestSizeLimit(MaxImageSizeBytes)]
    public async Task<IActionResult> UploadImage(Guid id, IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "FileRequired", message = "No file provided." });

        if (file.Length > MaxImageSizeBytes)
            return BadRequest(new { error = "FileTooLarge", message = "Image must be 5MB or less." });

        var contentType = (file.ContentType ?? "").Trim().ToLowerInvariant();
        if (!AllowedImageTypes.Contains(contentType))
            return BadRequest(new { error = "InvalidImageType", message = "Only JPEG, PNG, WebP, and GIF images are allowed." });

        var header = new byte[ImageMagicBytes.RequiredHeaderBytes];
        await using (var headerStream = file.OpenReadStream())
        {
            await headerStream.ReadExactlyAsync(header.AsMemory(0, (int)Math.Min(header.Length, file.Length)), cancellationToken);
        }
        if (!ImageMagicBytes.MatchesDeclaredType(header, contentType))
            return BadRequest(new { error = "InvalidImageType", message = "File content does not match the declared image type." });

        var userId = _currentUserService.UserId;
        try
        {
            _ = await _notebookService.GetNotebookByIdAsync(userId, id, cancellationToken);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }

        var sizeBytes = file.Length;
        if (!await _userStorage.CanUploadAsync(userId, sizeBytes, cancellationToken))
            return StatusCode(StatusCodes.Status413PayloadTooLarge, new { error = "StorageQuotaExceeded", message = "Storage quota exceeded. Delete some images to free space." });

        await using var stream = file.OpenReadStream();
        var result = await _imageStorage.UploadAsync(id, stream, contentType, cancellationToken);
        await _userStorage.RecordUploadAsync(userId, result.StorageKey, result.SizeBytes, cancellationToken);

        return StatusCode(StatusCodes.Status201Created, new ImageUploadResponse { Url = result.Url });
    }

    [HttpPut("{id:guid}/content")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateNotebookContent(Guid id, [FromBody] UpdateNotebookContentRequest request, CancellationToken cancellationToken)
    {
        if (request is null)
            return BadRequest();
        await _notebookService.UpdateNotebookContentAsync(_currentUserService.UserId, id, request, cancellationToken);
        return Ok();
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteNotebook(Guid id, CancellationToken cancellationToken)
    {
        await _notebookService.DeleteNotebookAsync(_currentUserService.UserId, id, cancellationToken);
        return Ok();
    }

    [HttpPut("{id:guid}/pin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TogglePin(Guid id, [FromBody] NotebookTogglePinRequest request, CancellationToken cancellationToken)
    {
        await _notebookService.TogglePinAsync(_currentUserService.UserId, id, request.IsPinned, cancellationToken);
        return Ok();
    }

    /// <summary>Create a version snapshot of the notebook's current content.</summary>
    [HttpPost("{id:guid}/versions")]
    [ProducesResponseType(typeof(NotebookVersionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateVersion(Guid id, [FromBody] CreateNotebookVersionRequest? request, CancellationToken cancellationToken)
    {
        var result = await _notebookService.CreateVersionAsync(_currentUserService.UserId, id, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>List version history for the notebook (newest first).</summary>
    [HttpGet("{id:guid}/versions")]
    [ProducesResponseType(typeof(IReadOnlyList<NotebookVersionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetVersions(Guid id, CancellationToken cancellationToken)
    {
        var result = await _notebookService.GetVersionsAsync(_currentUserService.UserId, id, cancellationToken);
        return Ok(result);
    }

    /// <summary>Get a single version (includes ContentJson for preview/restore).</summary>
    [HttpGet("{id:guid}/versions/{versionId:guid}")]
    [ProducesResponseType(typeof(NotebookVersionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetVersion(Guid id, Guid versionId, CancellationToken cancellationToken)
    {
        var result = await _notebookService.GetVersionByIdAsync(_currentUserService.UserId, id, versionId, cancellationToken);
        if (result is null)
            return NotFound();
        return Ok(result);
    }

    /// <summary>Restore notebook content from a version.</summary>
    [HttpPost("{id:guid}/versions/{versionId:guid}/restore")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RestoreVersion(Guid id, Guid versionId, CancellationToken cancellationToken)
    {
        await _notebookService.RestoreVersionAsync(_currentUserService.UserId, id, versionId, cancellationToken);
        return Ok();
    }

    /// <summary>Export notebook as file (pdf, txt, md, html, docx). Returns 404 if not found or not owner.</summary>
    [HttpGet("{id:guid}/export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Export(Guid id, [FromQuery] string format, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(format))
            return BadRequest("Format is required.");
        var result = await _exportService.ExportAsync(_currentUserService.UserId, id, format.Trim(), cancellationToken);
        if (result is null)
            return NotFound();
        return File(result.Content, result.ContentType, result.FileName);
    }
}

public sealed class NotebookTogglePinRequest
{
    public bool IsPinned { get; set; }
}

public sealed class ImageUploadResponse
{
    public string Url { get; set; } = "";
}
