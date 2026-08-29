using FluentValidation;
using ASideNote.Application.DTOs.Projects;

namespace ASideNote.Application.Validators.Projects;

public sealed class TransferOwnershipRequestValidator : AbstractValidator<TransferOwnershipRequest>
{
    public TransferOwnershipRequestValidator()
    {
        RuleFor(x => x.NewOwnerId)
            .NotEmpty().WithMessage("NewOwnerId is required.");
    }
}
