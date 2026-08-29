using FluentValidation;
using ASideNote.Application.DTOs.Projects;

namespace ASideNote.Application.Validators.Projects;

public sealed class AddMemberRequestValidator : AbstractValidator<AddMemberRequest>
{
    public AddMemberRequestValidator()
    {
        RuleFor(x => x)
            .Must(x => x.UserId.HasValue || !string.IsNullOrWhiteSpace(x.Email))
            .WithMessage("Either Email or UserId is required.");

        RuleFor(x => x.Email)
            .EmailAddress().WithMessage("A valid email is required.")
            .When(x => !string.IsNullOrWhiteSpace(x.Email));

        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Role is required.")
            .Must(role => role is "Editor" or "Viewer")
            .WithMessage("Role must be 'Editor' or 'Viewer'.");
    }
}
