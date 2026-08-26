using FluentValidation;
using ASideNote.Application.DTOs.BoardImages;
using ASideNote.Application.Validators;

namespace ASideNote.Application.Validators.BoardImages;

public sealed class PatchBoardImageRequestValidator : AbstractValidator<PatchBoardImageRequest>
{
    public PatchBoardImageRequestValidator()
    {
        RuleFor(x => x.Width)
            .GreaterThan(0).WithMessage("Width must be greater than 0.")
            .When(x => x.Width.HasValue);

        RuleFor(x => x.Height)
            .GreaterThan(0).WithMessage("Height must be greater than 0.")
            .When(x => x.Height.HasValue);

        RuleFor(x => x.Rotation)
            .InclusiveBetween(-360, 360).WithMessage("Rotation must be between -360 and 360.")
            .When(x => x.Rotation.HasValue);

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
