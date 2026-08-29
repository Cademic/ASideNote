using FluentValidation;
using ASideNote.Application.DTOs.Admin;

namespace ASideNote.Application.Validators.Admin;

public sealed class UpdateUserRoleRequestValidator : AbstractValidator<UpdateUserRoleRequest>
{
    public UpdateUserRoleRequestValidator()
    {
        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Role is required.")
            .Must(role => role is "User" or "Admin")
            .WithMessage("Role must be 'User' or 'Admin'.");
    }
}
