using FluentValidation.TestHelper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using ASideNote.Application.DTOs.Users;
using ASideNote.Application.Services;
using ASideNote.Application.Validators.Users;
using ASideNote.Core.Entities;
using ASideNote.Infrastructure.Data;
using ASideNote.Infrastructure.Repositories;
using Xunit;

namespace ASideNote.Tests;

public sealed class UserServiceTests
{
    private static (UserService Service, AppDbContext DbContext, Guid UserId) CreateService()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var dbContext = new AppDbContext(options);

        var userId = Guid.NewGuid();
        dbContext.Users.Add(new User
        {
            Id = userId,
            Username = "tutorialuser",
            Email = "tutorial@example.com",
            PasswordHash = "hash",
            Role = "User",
            CreatedAt = DateTime.UtcNow
        });
        dbContext.SaveChanges();

        var service = new UserService(
            new Repository<User>(dbContext),
            new Repository<UserPreferences>(dbContext),
            new Repository<RefreshToken>(dbContext),
            new Repository<FriendRequest>(dbContext),
            new UnitOfWork(dbContext),
            Mock.Of<ASideNote.Application.Interfaces.IPasswordHasher>(),
            Mock.Of<IConfiguration>());

        return (service, dbContext, userId);
    }

    [Fact]
    public async Task GetPreferencesAsync_NoRowYet_ReturnsHasCompletedTutorialFalse()
    {
        var (service, _, userId) = CreateService();

        var result = await service.GetPreferencesAsync(userId);

        Assert.False(result.HasCompletedTutorial);
    }

    [Fact]
    public async Task UpdatePreferencesAsync_SetsHasCompletedTutorial_WhenProvided()
    {
        var (service, _, userId) = CreateService();

        await service.UpdatePreferencesAsync(userId, new UpdatePreferencesRequest
        {
            Theme = "Dark",
            HasCompletedTutorial = true
        });

        var result = await service.GetPreferencesAsync(userId);
        Assert.True(result.HasCompletedTutorial);
    }

    [Fact]
    public async Task UpdatePreferencesAsync_PreservesHasCompletedTutorial_WhenOmitted()
    {
        var (service, _, userId) = CreateService();
        await service.UpdatePreferencesAsync(userId, new UpdatePreferencesRequest
        {
            Theme = "Dark",
            HasCompletedTutorial = true
        });

        await service.UpdatePreferencesAsync(userId, new UpdatePreferencesRequest
        {
            Theme = "Light"
        });

        var result = await service.GetPreferencesAsync(userId);
        Assert.True(result.HasCompletedTutorial);
        Assert.Equal("Light", result.Theme);
    }

    [Fact]
    public async Task GetPreferencesAsync_NoRowYet_ReturnsShowHolidaysTrue()
    {
        var (service, _, userId) = CreateService();

        var result = await service.GetPreferencesAsync(userId);

        Assert.True(result.ShowHolidays);
    }

    [Fact]
    public async Task UpdatePreferencesAsync_SetsShowHolidays_WhenProvided()
    {
        var (service, _, userId) = CreateService();

        await service.UpdatePreferencesAsync(userId, new UpdatePreferencesRequest
        {
            Theme = "System",
            ShowHolidays = false
        });

        var result = await service.GetPreferencesAsync(userId);
        Assert.False(result.ShowHolidays);
    }

    [Fact]
    public async Task UpdatePreferencesAsync_PreservesShowHolidays_WhenOmitted()
    {
        var (service, _, userId) = CreateService();
        await service.UpdatePreferencesAsync(userId, new UpdatePreferencesRequest
        {
            Theme = "System",
            ShowHolidays = false
        });

        await service.UpdatePreferencesAsync(userId, new UpdatePreferencesRequest
        {
            Theme = "Light"
        });

        var result = await service.GetPreferencesAsync(userId);
        Assert.False(result.ShowHolidays);
        Assert.Equal("Light", result.Theme);
    }

    [Fact]
    public void Validator_RejectsInvalidTheme_WithHasCompletedTutorialPresent()
    {
        var validator = new UpdatePreferencesRequestValidator();

        var result = validator.TestValidate(new UpdatePreferencesRequest
        {
            Theme = "NotAValidTheme",
            HasCompletedTutorial = true
        });

        result.ShouldHaveValidationErrorFor(x => x.Theme);
    }
}
