using FluentValidation;
using ASideNote.Application.DTOs.BoardConnections;

namespace ASideNote.Application.Validators.BoardConnections;

public sealed class CreateBoardConnectionRequestValidator : AbstractValidator<CreateBoardConnectionRequest>
{
    public CreateBoardConnectionRequestValidator()
    {
        RuleFor(x => x.FromItemId)
            .NotEmpty().WithMessage("FromItemId is required.")
            .MaximumLength(200).WithMessage("FromItemId must not exceed 200 characters.");

        RuleFor(x => x.ToItemId)
            .NotEmpty().WithMessage("ToItemId is required.")
            .MaximumLength(200).WithMessage("ToItemId must not exceed 200 characters.");
    }
}
