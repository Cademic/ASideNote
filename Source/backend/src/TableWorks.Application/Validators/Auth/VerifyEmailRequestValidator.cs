using FluentValidation;
using ASideNote.Application.DTOs.Auth;

namespace ASideNote.Application.Validators.Auth;

public sealed class VerifyEmailRequestValidator : AbstractValidator<VerifyEmailRequest>
{
    public VerifyEmailRequestValidator()
    {
        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Token is required.");
    }
}
