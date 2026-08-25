using FluentValidation;
using ASideNote.Application.DTOs.Notebooks;

namespace ASideNote.Application.Validators.Notebooks;

public sealed class UpdateNotebookRequestValidator : AbstractValidator<UpdateNotebookRequest>
{
    public UpdateNotebookRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Notebook name is required.")
            .MaximumLength(100).WithMessage("Notebook name must not exceed 100 characters.");
    }
}
