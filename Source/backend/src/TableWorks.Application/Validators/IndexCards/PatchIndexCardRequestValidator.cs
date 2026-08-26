using FluentValidation;
using ASideNote.Application.DTOs.IndexCards;
using ASideNote.Application.Validators;

namespace ASideNote.Application.Validators.IndexCards;

public sealed class PatchIndexCardRequestValidator : AbstractValidator<PatchIndexCardRequest>
{
    public PatchIndexCardRequestValidator()
    {
        RuleFor(x => x.Title)
            .MaximumLength(500).WithMessage("Title must not exceed 500 characters.")
            .When(x => x.PatchTitle);

        RuleFor(x => x.Content)
            .MaximumLength(10000).WithMessage("Content must not exceed 10000 characters.")
            .When(x => x.Content is not null);

        RuleFor(x => x.Color)
            .MaximumLength(20).WithMessage("Color must not exceed 20 characters.")
            .When(x => x.Color is not null);

        RuleFor(x => x.PositionX)
            .InclusiveBetween(BoardBoundsConstants.MinX, BoardBoundsConstants.MaxX)
            .WithMessage($"PositionX must be between {BoardBoundsConstants.MinX} and {BoardBoundsConstants.MaxX}.")
            .When(x => x.PositionX.HasValue);

        RuleFor(x => x.PositionY)
            .InclusiveBetween(BoardBoundsConstants.MinY, BoardBoundsConstants.MaxY)
            .WithMessage($"PositionY must be between {BoardBoundsConstants.MinY} and {BoardBoundsConstants.MaxY}.")
            .When(x => x.PositionY.HasValue);
    }
}
