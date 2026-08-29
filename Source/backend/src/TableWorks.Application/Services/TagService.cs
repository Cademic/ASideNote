using Microsoft.EntityFrameworkCore;
using ASideNote.Application.DTOs.Tags;
using ASideNote.Application.Interfaces;
using ASideNote.Core.Entities;
using ASideNote.Core.Interfaces;

namespace ASideNote.Application.Services;

public sealed class TagService : ITagService
{
    private readonly IRepository<Tag> _tagRepo;
    private readonly IUnitOfWork _unitOfWork;

    public TagService(IRepository<Tag> tagRepo, IUnitOfWork unitOfWork)
    {
        _tagRepo = tagRepo;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<TagDto>> GetTagsAsync(CancellationToken cancellationToken = default)
    {
        return await _tagRepo.Query()
            .Select(t => new TagDto
            {
                Id = t.Id,
                Name = t.Name,
                Color = t.Color,
                NoteCount = t.NoteTags.Count
            })
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task<TagDto> CreateTagAsync(CreateTagRequest request, CancellationToken cancellationToken = default)
    {
        var exists = await _tagRepo.Query()
            .AnyAsync(t => t.Name == request.Name, cancellationToken);
        if (exists)
            throw new InvalidOperationException("A tag with this name already exists.");

        var tag = new Tag
        {
            Name = request.Name,
            Color = request.Color,
            CreatedAt = DateTime.UtcNow
        };

        await _tagRepo.AddAsync(tag, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new TagDto
        {
            Id = tag.Id,
            Name = tag.Name,
            Color = tag.Color,
            NoteCount = 0
        };
    }

    public async Task DeleteTagAsync(Guid tagId, CancellationToken cancellationToken = default)
    {
        var tag = await _tagRepo.GetByIdAsync(tagId, cancellationToken)
            ?? throw new KeyNotFoundException("Tag not found.");

        _tagRepo.Delete(tag);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
