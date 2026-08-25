using FluentValidation;
using ASideNote.Application.DTOs.Auth;

namespace ASideNote.Application.Validators.Auth;

public sealed class RefreshRequestValidator : AbstractValidator<RefreshRequest>
{
    public RefreshRequestValidator()
    {
        RuleFor(x => x.RefreshToken)
            .NotEmpty().WithMessage("RefreshToken is required.");
    }
}
