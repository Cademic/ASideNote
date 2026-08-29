using System.Text.Json;
using FluentValidation;
using ASideNote.Application.DTOs.Notebooks;

namespace ASideNote.Application.Validators.Notebooks;

public sealed class UpdateNotebookContentRequestValidator : AbstractValidator<UpdateNotebookContentRequest>
{
    public UpdateNotebookContentRequestValidator()
    {
        RuleFor(x => x.ContentJson)
            .NotEmpty().WithMessage("ContentJson is required.")
            .MaximumLength(5_000_000).WithMessage("ContentJson must not exceed 5,000,000 characters.")
            .Must(BeValidJson).WithMessage("ContentJson must be valid JSON.");
    }

    private static bool BeValidJson(string contentJson)
    {
        try
        {
            using var _ = JsonDocument.Parse(contentJson);
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
