using FluentValidation;
using ASideNote.Application.DTOs.Projects;

namespace ASideNote.Application.Validators.Projects;

public sealed class UpdateMemberRoleRequestValidator : AbstractValidator<UpdateMemberRoleRequest>
{
    public UpdateMemberRoleRequestValidator()
    {
        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Role is required.")
            .Must(role => role is "Editor" or "Viewer")
            .WithMessage("Role must be 'Editor' or 'Viewer'.");
    }
}
