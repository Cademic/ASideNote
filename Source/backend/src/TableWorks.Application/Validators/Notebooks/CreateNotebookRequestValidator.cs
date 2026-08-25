using FluentValidation;
using ASideNote.Application.DTOs.Notebooks;

namespace ASideNote.Application.Validators.Notebooks;

public sealed class CreateNotebookRequestValidator : AbstractValidator<CreateNotebookRequest>
{
    public CreateNotebookRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Notebook name is required.")
            .MaximumLength(100).WithMessage("Notebook name must not exceed 100 characters.");
    }
}
