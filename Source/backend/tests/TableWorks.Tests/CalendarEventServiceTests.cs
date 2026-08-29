using Microsoft.EntityFrameworkCore;
using ASideNote.Application.DTOs.CalendarEvents;
using ASideNote.Application.Services;
using ASideNote.Core.Entities;
using ASideNote.Infrastructure.Data;
using ASideNote.Infrastructure.Repositories;
using Xunit;

namespace ASideNote.Tests;

public sealed class CalendarEventServiceTests
{
    private static (CalendarEventService Service, Guid UserId, Guid ProjectId) CreateService(DateTime? projectEndDate)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var dbContext = new AppDbContext(options);

        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        // Project/CalendarEvent have global query filters that require the owning User row to exist
        // (see AppDbContext.OnModelCreating). Without it every query is filtered out and the
        // service's end-date validation silently no-ops.
        dbContext.Set<User>().Add(new User
        {
            Id = userId,
            Username = "calendaruser",
            Email = "calendar@example.com",
            PasswordHash = "hash",
            Role = "User",
            CreatedAt = DateTime.UtcNow,
        });
        dbContext.Set<Project>().Add(new Project
        {
            Id = projectId,
            OwnerId = userId,
            Name = "Timed project",
            Status = "Active",
            StartDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            EndDate = projectEndDate,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        dbContext.SaveChanges();

        var service = new CalendarEventService(
            new Repository<CalendarEvent>(dbContext),
            new Repository<Project>(dbContext),
            new UnitOfWork(dbContext));

        return (service, userId, projectId);
    }

    private static CreateCalendarEventRequest NewRequest(Guid projectId, DateTime start, DateTime? end = null) => new()
    {
        ProjectId = projectId,
        Title = "Milestone",
        StartDate = start,
        EndDate = end,
        IsAllDay = true,
        Color = "sky",
        EventType = "Event",
    };

    [Fact]
    public async Task CreateEventAsync_Throws_WhenEventStartsAfterProjectEndDate()
    {
        var (service, userId, projectId) = CreateService(new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc));

        var request = NewRequest(projectId, new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc));

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateEventAsync(userId, request));
    }

    [Fact]
    public async Task CreateEventAsync_Throws_WhenEventEndDateExtendsPastProjectEndDate()
    {
        var (service, userId, projectId) = CreateService(new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc));

        var request = NewRequest(
            projectId,
            new DateTime(2026, 6, 29, 12, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 7, 2, 12, 0, 0, DateTimeKind.Utc));

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateEventAsync(userId, request));
    }

    [Fact]
    public async Task CreateEventAsync_Succeeds_WhenAllDayEventFallsOnProjectEndDate()
    {
        var (service, userId, projectId) = CreateService(new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc));

        // All-day events use the noon-UTC convention; same calendar day as project end is allowed.
        var request = NewRequest(projectId, new DateTime(2026, 6, 30, 12, 0, 0, DateTimeKind.Utc));

        var result = await service.CreateEventAsync(userId, request);

        Assert.Equal(projectId, result.ProjectId);
    }

    [Fact]
    public async Task CreateEventAsync_Succeeds_WhenProjectHasNoEndDate()
    {
        var (service, userId, projectId) = CreateService(projectEndDate: null);

        var request = NewRequest(projectId, new DateTime(2030, 1, 1, 12, 0, 0, DateTimeKind.Utc));

        var result = await service.CreateEventAsync(userId, request);

        Assert.Equal(projectId, result.ProjectId);
    }

    [Fact]
    public async Task CreateEventAsync_Succeeds_ForPersonalEventWithNoProject()
    {
        var (service, userId, _) = CreateService(new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc));

        var request = new CreateCalendarEventRequest
        {
            ProjectId = null,
            Title = "Personal",
            StartDate = new DateTime(2099, 1, 1, 12, 0, 0, DateTimeKind.Utc),
            IsAllDay = true,
            Color = "sky",
            EventType = "Event",
        };

        var result = await service.CreateEventAsync(userId, request);

        Assert.Null(result.ProjectId);
    }

    [Fact]
    public async Task CreateEventAsync_Throws_WhenRecurringEventHasNoRecurrenceEndDate()
    {
        var (service, userId, projectId) = CreateService(new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc));

        var request = NewRequest(projectId, new DateTime(2026, 2, 1, 12, 0, 0, DateTimeKind.Utc));
        request.RecurrenceFrequency = "Weekly";
        request.RecurrenceEndDate = null;

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateEventAsync(userId, request));
    }

    [Fact]
    public async Task CreateEventAsync_Throws_WhenRecurrenceEndDateExtendsPastProjectEndDate()
    {
        var (service, userId, projectId) = CreateService(new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc));

        var request = NewRequest(projectId, new DateTime(2026, 2, 1, 12, 0, 0, DateTimeKind.Utc));
        request.RecurrenceFrequency = "Weekly";
        request.RecurrenceEndDate = new DateTime(2026, 8, 1, 12, 0, 0, DateTimeKind.Utc);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateEventAsync(userId, request));
    }

    [Fact]
    public async Task CreateEventAsync_Succeeds_WhenRecurrenceEndsBeforeProjectEndDate()
    {
        var (service, userId, projectId) = CreateService(new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc));

        var request = NewRequest(projectId, new DateTime(2026, 2, 1, 12, 0, 0, DateTimeKind.Utc));
        request.RecurrenceFrequency = "Weekly";
        request.RecurrenceEndDate = new DateTime(2026, 5, 1, 12, 0, 0, DateTimeKind.Utc);

        var result = await service.CreateEventAsync(userId, request);

        Assert.Equal(projectId, result.ProjectId);
    }

    [Fact]
    public async Task UpdateEventAsync_Throws_WhenEditExtendsEventPastProjectEndDate()
    {
        var (service, userId, projectId) = CreateService(new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc));

        var created = await service.CreateEventAsync(
            userId, NewRequest(projectId, new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc)));

        var update = new UpdateCalendarEventRequest
        {
            Title = "Milestone",
            StartDate = new DateTime(2026, 7, 15, 12, 0, 0, DateTimeKind.Utc),
            IsAllDay = true,
            Color = "sky",
            EventType = "Event",
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateEventAsync(userId, created.Id, update));
    }
}
