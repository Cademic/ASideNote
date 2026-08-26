using FluentValidation;
using ASideNote.Application.DTOs.Notes;
using ASideNote.Application.Validators;

namespace ASideNote.Application.Validators.Notes;

public sealed class UpdateNoteRequestValidator : AbstractValidator<UpdateNoteRequest>
{
    public UpdateNoteRequestValidator()
    {
        RuleFor(x => x.Title)
            .MaximumLength(500).WithMessage("Title must not exceed 500 characters.");

        RuleFor(x => x.Content)
            .NotNull().WithMessage("Content is required.")
            .MaximumLength(5000).WithMessage("Content must not exceed 5000 characters.");

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
