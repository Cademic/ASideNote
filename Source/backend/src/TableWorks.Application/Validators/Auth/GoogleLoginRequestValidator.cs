using FluentValidation;
using ASideNote.Application.DTOs.Auth;

namespace ASideNote.Application.Validators.Auth;

public sealed class GoogleLoginRequestValidator : AbstractValidator<GoogleLoginRequest>
{
    public GoogleLoginRequestValidator()
    {
        RuleFor(x => x.IdToken)
            .NotEmpty().WithMessage("IdToken is required.");
    }
}
