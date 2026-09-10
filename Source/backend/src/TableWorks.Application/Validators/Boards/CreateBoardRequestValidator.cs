using FluentValidation;
using ASideNote.Application.DTOs.Boards;

namespace ASideNote.Application.Validators.Boards;

public sealed class CreateBoardRequestValidator : AbstractValidator<CreateBoardRequest>
{
    private static readonly HashSet<string> ValidBoardTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "NoteBoard",
        "ChalkBoard",
        "Calendar"
    };

    public CreateBoardRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Board name is required.")
            .MaximumLength(50).WithMessage("Board name must not exceed 50 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Description must not exceed 500 characters.")
            .When(x => x.Description is not null);

        RuleFor(x => x.BoardType)
            .NotEmpty().WithMessage("Board type is required.")
            .Must(t => ValidBoardTypes.Contains(t)).WithMessage("Board type must be one of: NoteBoard, ChalkBoard, Calendar.");
    }
}
