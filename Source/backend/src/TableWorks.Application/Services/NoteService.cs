using Microsoft.EntityFrameworkCore;
using ASideNote.Application.DTOs.Common;
using ASideNote.Application.DTOs.Notes;
using ASideNote.Application.DTOs.Tags;
using ASideNote.Application.Helpers;
using ASideNote.Application.Interfaces;
using ASideNote.Core.Entities;
using ASideNote.Core.Interfaces;

namespace ASideNote.Application.Services;

public sealed class NoteService : INoteService
{
    private readonly IRepository<Note> _noteRepo;
    private readonly IRepository<NoteTag> _noteTagRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IImageStorageService _imageStorage;
    private readonly IUserStorageService _userStorage;
    private readonly IBoardAccessService _boardAccess;
    private readonly IBoardHubBroadcaster _boardHub;

    public NoteService(
        IRepository<Note> noteRepo,
        IRepository<NoteTag> noteTagRepo,
        IUnitOfWork unitOfWork,
        IImageStorageService imageStorage,
        IUserStorageService userStorage,
        IBoardAccessService boardAccess,
        IBoardHubBroadcaster boardHub)
    {
        _noteRepo = noteRepo;
        _noteTagRepo = noteTagRepo;
        _unitOfWork = unitOfWork;
        _imageStorage = imageStorage;
        _userStorage = userStorage;
        _boardAccess = boardAccess;
        _boardHub = boardHub;
    }

    public async Task<PaginatedResponse<NoteSummaryDto>> GetNotesAsync(Guid userId, NoteListQuery query, CancellationToken cancellationToken = default)
    {
        IQueryable<Note> q;

        if (query.BoardId.HasValue && await _boardAccess.HasReadAccessAsync(userId, query.BoardId.Value, cancellationToken))
        {
            q = _noteRepo.Query()
                .Where(n => n.BoardId == query.BoardId.Value && !n.IsArchived)
                .Include(n => n.NoteTags)
                    .ThenInclude(nt => nt.Tag)
                .AsQueryable();
        }
        else
        {
            q = _noteRepo.Query()
                .Where(n => n.UserId == userId && !n.IsArchived)
                .Include(n => n.NoteTags)
                    .ThenInclude(nt => nt.Tag)
                .AsQueryable();

            if (query.BoardId.HasValue)
                q = q.Where(n => n.BoardId == query.BoardId.Value);
        }

        if (query.FolderId.HasValue)
            q = q.Where(n => n.FolderId == query.FolderId.Value);

        if (query.ProjectId.HasValue)
            q = q.Where(n => n.ProjectId == query.ProjectId.Value);

        if (!string.IsNullOrWhiteSpace(query.TagIds))
        {
            var tagIdList = query.TagIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => Guid.TryParse(s.Trim(), out var g) ? g : (Guid?)null)
                .Where(g => g.HasValue)
                .Select(g => g!.Value)
                .ToList();

            if (tagIdList.Count > 0)
                q = q.Where(n => n.NoteTags.Any(nt => tagIdList.Contains(nt.TagId)));
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
            q = q.Where(n => n.Title != null && n.Title.Contains(query.Search));

        // Count before pagination
        var total = await q.CountAsync(cancellationToken);

        // Sorting
        q = query.SortBy?.ToLowerInvariant() switch
        {
            "createdat" => query.SortOrder == "asc" ? q.OrderBy(n => n.CreatedAt) : q.OrderByDescending(n => n.CreatedAt),
            "title" => query.SortOrder == "asc" ? q.OrderBy(n => n.Title) : q.OrderByDescending(n => n.Title),
            _ => query.SortOrder == "asc" ? q.OrderBy(n => n.UpdatedAt) : q.OrderByDescending(n => n.UpdatedAt),
        };

        // Pagination
        var notes = await q
            .Skip((query.Page - 1) * query.Limit)
            .Take(query.Limit)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var items = notes.Select(MapToSummary).ToList();

        return new PaginatedResponse<NoteSummaryDto>
        {
            Items = items,
            Page = query.Page,
            Limit = query.Limit,
            Total = total
        };
    }

    public async Task<NoteDetailDto> CreateNoteAsync(Guid userId, CreateNoteRequest request, CancellationToken cancellationToken = default)
    {
        if (request.BoardId.HasValue && !await _boardAccess.HasWriteAccessAsync(userId, request.BoardId.Value, cancellationToken))
            throw new UnauthorizedAccessException("You do not have permission to add notes to this board.");

        const double defaultStickyNoteSize = 270.0;
        var width = request.Width ?? request.Height ?? defaultStickyNoteSize;
        var height = request.Height ?? request.Width ?? defaultStickyNoteSize;

        var now = DateTime.UtcNow;
        var note = new Note
        {
            UserId = userId,
            Title = request.Title,
            Content = request.Content,
            FolderId = request.FolderId,
            ProjectId = request.ProjectId,
            BoardId = request.BoardId,
            PositionX = request.PositionX,
            PositionY = request.PositionY,
            Width = width,
            Height = height,
            Color = request.Color,
            Rotation = request.Rotation,
            CreatedAt = now,
            UpdatedAt = now,
            LastSavedAt = now
        };

        await _noteRepo.AddAsync(note, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Add tags
        if (request.TagIds.Count > 0)
        {
            foreach (var tagId in request.TagIds)
            {
                await _noteTagRepo.AddAsync(new NoteTag { NoteId = note.Id, TagId = tagId }, cancellationToken);
            }
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        if (note.BoardId.HasValue)
            await _boardHub.NotifyNoteAddedAsync(note.BoardId.Value, note.Id, cancellationToken);

        return await GetNoteByIdAsync(userId, note.Id, cancellationToken);
    }

    public async Task<NoteDetailDto> GetNoteByIdAsync(Guid userId, Guid noteId, CancellationToken cancellationToken = default)
    {
        var note = await _noteRepo.Query()
            .Include(n => n.NoteTags)
                .ThenInclude(nt => nt.Tag)
            .AsNoTracking()
            .FirstOrDefaultAsync(n => n.Id == noteId, cancellationToken)
            ?? throw new KeyNotFoundException("Note not found.");

        if (note.UserId != userId)
        {
            if (note.BoardId is null || !await _boardAccess.HasReadAccessAsync(userId, note.BoardId.Value, cancellationToken))
                throw new KeyNotFoundException("Note not found.");
        }

        return MapToDetail(note);
    }

    public async Task UpdateNoteAsync(Guid userId, Guid noteId, UpdateNoteRequest request, CancellationToken cancellationToken = default)
    {
        var note = await _noteRepo.Query()
            .Include(n => n.NoteTags)
            .FirstOrDefaultAsync(n => n.Id == noteId, cancellationToken)
            ?? throw new KeyNotFoundException("Note not found.");

        if (!await CanWriteNoteAsync(userId, note, cancellationToken))
            throw new KeyNotFoundException("Note not found.");


        note.Title = request.Title;
        note.Content = request.Content;
        note.FolderId = request.FolderId;
        note.PositionX = request.PositionX;
        note.PositionY = request.PositionY;
        note.Width = request.Width;
        note.Height = request.Height;
        note.Color = request.Color;
        note.Rotation = request.Rotation;
        note.UpdatedAt = DateTime.UtcNow;
        note.LastSavedAt = DateTime.UtcNow;
        _noteRepo.Update(note);

        // Replace tags
        var existingTags = note.NoteTags.ToList();
        foreach (var et in existingTags)
            _noteTagRepo.Delete(et);

        foreach (var tagId in request.TagIds)
            await _noteTagRepo.AddAsync(new NoteTag { NoteId = noteId, TagId = tagId }, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (note.BoardId.HasValue)
        {
            var payload = new { id = note.Id, positionX = note.PositionX, positionY = note.PositionY, title = note.Title, content = note.Content, width = note.Width, height = note.Height, color = note.Color, rotation = note.Rotation };
            await _boardHub.NotifyNoteUpdatedAsync(note.BoardId.Value, noteId, payload, cancellationToken);
        }
    }

    public async Task PatchNoteContentAsync(Guid userId, Guid noteId, PatchNoteRequest request, CancellationToken cancellationToken = default)
    {
        var note = await _noteRepo.Query()
            .FirstOrDefaultAsync(n => n.Id == noteId, cancellationToken)
            ?? throw new KeyNotFoundException("Note not found.");

        if (!await CanWriteNoteAsync(userId, note, cancellationToken))
            throw new KeyNotFoundException("Note not found.");

        if (request.Content is not null)
        {
            var oldUrls = HtmlImageUrls.GetImageUrls(note.Title ?? "").Concat(HtmlImageUrls.GetImageUrls(note.Content ?? "")).ToHashSet();
            var newUrls = HtmlImageUrls.GetImageUrls(request.PatchTitle ? (request.Title ?? "") : (note.Title ?? ""))
                .Concat(HtmlImageUrls.GetImageUrls(request.Content))
                .ToHashSet();
            var removedUrls = oldUrls.Except(newUrls).ToList();
            foreach (var url in removedUrls)
            {
                var key = await _imageStorage.DeleteByUrlIfOwnedAsync(url, cancellationToken);
                if (key is not null)
                    await _userStorage.RecordDeletionByKeyAsync(key, cancellationToken);
            }
        }

        if (request.PatchTitle)
            note.Title = request.Title;
        if (request.Content is not null)
            note.Content = request.Content;
        if (request.PositionX.HasValue)
            note.PositionX = request.PositionX;
        if (request.PositionY.HasValue)
            note.PositionY = request.PositionY;
        if (request.Width.HasValue)
            note.Width = request.Width;
        if (request.Height.HasValue)
            note.Height = request.Height;
        if (request.Color is not null)
            note.Color = request.Color;
        if (request.Rotation.HasValue)
            note.Rotation = request.Rotation;
        note.UpdatedAt = DateTime.UtcNow;
        note.LastSavedAt = DateTime.UtcNow;
        _noteRepo.Update(note);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (note.BoardId.HasValue)
        {
            var payload = new { id = note.Id, positionX = note.PositionX, positionY = note.PositionY, title = note.Title, content = note.Content, width = note.Width, height = note.Height, color = note.Color, rotation = note.Rotation };
            await _boardHub.NotifyNoteUpdatedAsync(note.BoardId.Value, noteId, payload, cancellationToken);
        }
    }

    public async Task DeleteNoteAsync(Guid userId, Guid noteId, CancellationToken cancellationToken = default)
    {
        var note = await _noteRepo.Query()
            .FirstOrDefaultAsync(n => n.Id == noteId, cancellationToken)
            ?? throw new KeyNotFoundException("Note not found.");

        if (!await CanWriteNoteAsync(userId, note, cancellationToken))
            throw new KeyNotFoundException("Note not found.");

        var urls = HtmlImageUrls.GetImageUrls(note.Title ?? "").Concat(HtmlImageUrls.GetImageUrls(note.Content ?? "")).ToList();
        foreach (var url in urls)
        {
            var key = await _imageStorage.DeleteByUrlIfOwnedAsync(url, cancellationToken);
            if (key is not null)
                await _userStorage.RecordDeletionByKeyAsync(key, cancellationToken);
        }

        var boardId = note.BoardId;
        _noteRepo.Delete(note);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (boardId.HasValue)
            await _boardHub.NotifyNoteDeletedAsync(boardId.Value, noteId, cancellationToken);
    }

    public async Task BulkActionAsync(Guid userId, BulkNoteRequest request, CancellationToken cancellationToken = default)
    {
        var candidates = await _noteRepo.Query()
            .Include(n => n.NoteTags)
            .Where(n => request.NoteIds.Contains(n.Id))
            .ToListAsync(cancellationToken);

        var notes = new List<Note>();
        foreach (var note in candidates)
        {
            if (await CanWriteNoteAsync(userId, note, cancellationToken))
                notes.Add(note);
        }

        switch (request.Action)
        {
            case "delete":
                foreach (var note in notes)
                    _noteRepo.Delete(note);
                break;

            case "move":
                foreach (var note in notes)
                {
                    note.FolderId = request.FolderId;
                    note.UpdatedAt = DateTime.UtcNow;
                    _noteRepo.Update(note);
                }
                break;

            case "tag":
                if (request.TagIds is not null)
                {
                    foreach (var note in notes)
                    {
                        foreach (var tagId in request.TagIds)
                        {
                            if (!note.NoteTags.Any(nt => nt.TagId == tagId))
                            {
                                await _noteTagRepo.AddAsync(new NoteTag { NoteId = note.Id, TagId = tagId }, cancellationToken);
                            }
                        }
                    }
                }
                break;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<bool> CanWriteNoteAsync(Guid userId, Note note, CancellationToken cancellationToken)
    {
        if (note.BoardId is null)
            return note.UserId == userId;
        return await _boardAccess.HasWriteAccessAsync(userId, note.BoardId.Value, cancellationToken);
    }

    private static NoteSummaryDto MapToSummary(Note note) => new()
    {
        Id = note.Id,
        Title = note.Title,
        Content = note.Content,
        FolderId = note.FolderId,
        ProjectId = note.ProjectId,
        Tags = note.NoteTags.Select(nt => new TagDto
        {
            Id = nt.Tag!.Id,
            Name = nt.Tag.Name,
            Color = nt.Tag.Color
        }).ToList(),
        CreatedAt = note.CreatedAt,
        UpdatedAt = note.UpdatedAt,
        PositionX = note.PositionX,
        PositionY = note.PositionY,
        Width = note.Width,
        Height = note.Height,
        Color = note.Color,
        Rotation = note.Rotation
    };

    private static NoteDetailDto MapToDetail(Note note) => new()
    {
        Id = note.Id,
        Title = note.Title,
        Content = note.Content,
        FolderId = note.FolderId,
        ProjectId = note.ProjectId,
        Tags = note.NoteTags.Select(nt => new TagDto
        {
            Id = nt.Tag!.Id,
            Name = nt.Tag.Name,
            Color = nt.Tag.Color
        }).ToList(),
        CreatedAt = note.CreatedAt,
        UpdatedAt = note.UpdatedAt,
        LastSavedAt = note.LastSavedAt,
        PositionX = note.PositionX,
        PositionY = note.PositionY,
        Width = note.Width,
        Height = note.Height,
        Color = note.Color,
        Rotation = note.Rotation
    };
}
