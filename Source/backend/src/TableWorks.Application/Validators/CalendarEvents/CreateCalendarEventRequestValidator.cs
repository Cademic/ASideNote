using FluentValidation;
using ASideNote.Application.DTOs.CalendarEvents;

namespace ASideNote.Application.Validators.CalendarEvents;

public sealed class CreateCalendarEventRequestValidator : AbstractValidator<CreateCalendarEventRequest>
{
    private static readonly string[] ValidFrequencies = ["Daily", "Weekly", "Monthly"];

    public CreateCalendarEventRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required.")
            .MaximumLength(200).WithMessage("Title must not exceed 200 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters.")
            .When(x => x.Description is not null);

        RuleFor(x => x.Color)
            .NotEmpty().WithMessage("Color is required.")
            .MaximumLength(20).WithMessage("Color must not exceed 20 characters.");

        RuleFor(x => x.EventType)
            .NotEmpty().WithMessage("EventType is required.")
            .Must(t => t is "Event" or "Note").WithMessage("EventType must be 'Event' or 'Note'.");

        RuleFor(x => x.EndDate)
            .GreaterThanOrEqualTo(x => x.StartDate)
            .WithMessage("End date must be on or after start date.")
            .When(x => x.EndDate.HasValue);

        // Recurrence validation
        RuleFor(x => x.RecurrenceFrequency)
            .Must(f => ValidFrequencies.Contains(f))
            .WithMessage("RecurrenceFrequency must be 'Daily', 'Weekly', or 'Monthly'.")
            .When(x => x.RecurrenceFrequency is not null);

        RuleFor(x => x.RecurrenceInterval)
            .GreaterThanOrEqualTo(1).WithMessage("RecurrenceInterval must be at least 1.")
            .LessThanOrEqualTo(365).WithMessage("RecurrenceInterval must not exceed 365.");

        RuleFor(x => x.RecurrenceEndDate)
            .GreaterThanOrEqualTo(x => x.StartDate)
            .WithMessage("Recurrence end date must be on or after start date.")
            .When(x => x.RecurrenceEndDate.HasValue);
    }
}
