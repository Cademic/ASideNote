using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ASideNote.Application.DTOs.Boards;
using ASideNote.Application.DTOs.Common;
using ASideNote.Application.Helpers;
using ASideNote.Application.Interfaces;

namespace ASideNote.API.Controllers;

[Authorize]
[ApiVersion("1.0")]
[ApiController]
[Route("api/v{version:apiVersion}/boards")]
public sealed class BoardsController : ControllerBase
{
    private const long MaxImageSizeBytes = 5 * 1024 * 1024; // 5 MB
    private static readonly string[] AllowedImageTypes = { "image/jpeg", "image/png", "image/webp", "image/gif" };

    private readonly IBoardService _boardService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IImageStorageService _imageStorage;
    private readonly IUserStorageService _userStorage;

    public BoardsController(
        IBoardService boardService,
        ICurrentUserService currentUserService,
        IImageStorageService imageStorage,
        IUserStorageService userStorage)
    {
        _boardService = boardService;
        _currentUserService = currentUserService;
        _imageStorage = imageStorage;
        _userStorage = userStorage;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PaginatedResponse<BoardSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBoards([FromQuery] BoardListQuery query, CancellationToken cancellationToken)
    {
        var result = await _boardService.GetBoardsAsync(_currentUserService.UserId, query, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(BoardSummaryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateBoard([FromBody] CreateBoardRequest request, CancellationToken cancellationToken)
    {
        var result = await _boardService.CreateBoardAsync(_currentUserService.UserId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(BoardSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBoard(Guid id, CancellationToken cancellationToken)
    {
        var result = await _boardService.GetBoardByIdAsync(_currentUserService.UserId, id, cancellationToken);
        return Ok(result);
    }

    /// <summary>Upload an image for a board (notes/index cards). Returns the image URL to insert into content. Accepts JPEG, PNG, WebP, GIF; max 5MB.</summary>
    [HttpPost("{id:guid}/images")]
    [ProducesResponseType(typeof(BoardImageUploadResponse), StatusCodes.Status201Created)]
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
            _ = await _boardService.GetBoardByIdAsync(userId, id, cancellationToken);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }

        var sizeBytes = file.Length;
        if (!await _userStorage.CanUploadAsync(userId, sizeBytes, cancellationToken))
            return StatusCode(StatusCodes.Status413PayloadTooLarge, new { error = "StorageQuotaExceeded", message = "Storage quota exceeded. Delete some images to free space." });

        await using var stream = file.OpenReadStream();
        var result = await _imageStorage.UploadForBoardAsync(id, stream, contentType, cancellationToken);
        await _userStorage.RecordUploadAsync(userId, result.StorageKey, result.SizeBytes, cancellationToken);

        return StatusCode(StatusCodes.Status201Created, new BoardImageUploadResponse { Url = result.Url });
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateBoard(Guid id, [FromBody] UpdateBoardRequest request, CancellationToken cancellationToken)
    {
        await _boardService.UpdateBoardAsync(_currentUserService.UserId, id, request, cancellationToken);
        return Ok();
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteBoard(Guid id, CancellationToken cancellationToken)
    {
        await _boardService.DeleteBoardAsync(_currentUserService.UserId, id, cancellationToken);
        return Ok();
    }

    [HttpPut("{id:guid}/pin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TogglePin(Guid id, [FromBody] TogglePinRequest request, CancellationToken cancellationToken)
    {
        await _boardService.TogglePinAsync(_currentUserService.UserId, id, request.IsPinned, cancellationToken);
        return Ok();
    }

    [HttpGet("pinned")]
    [ProducesResponseType(typeof(IReadOnlyList<BoardSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPinnedBoards(CancellationToken cancellationToken)
    {
        var result = await _boardService.GetPinnedBoardsAsync(_currentUserService.UserId, cancellationToken);
        return Ok(result);
    }
}

public sealed class TogglePinRequest
{
    public bool IsPinned { get; set; }
}

public sealed class BoardImageUploadResponse
{
    public string Url { get; set; } = "";
}
