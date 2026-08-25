using FluentValidation;
using ASideNote.Application.DTOs.Notebooks;

namespace ASideNote.Application.Validators.Notebooks;

public sealed class CreateNotebookVersionRequestValidator : AbstractValidator<CreateNotebookVersionRequest>
{
    public CreateNotebookVersionRequestValidator()
    {
        RuleFor(x => x.Label)
            .MaximumLength(200).WithMessage("Label must not exceed 200 characters.")
            .When(x => x.Label is not null);
    }
}
