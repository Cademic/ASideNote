using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ASideNote.Application.Interfaces;
using ASideNote.Core.Entities;

namespace ASideNote.Infrastructure.Data;

public static class AppDbContextSeeder
{
    private static readonly Guid AdminUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");
    private static readonly Guid Admin1Id = Guid.Parse("00000000-0000-0000-0000-000000000005");
    private static readonly Guid Admin2Id = Guid.Parse("00000000-0000-0000-0000-000000000006");
    private static readonly Guid TestUser1Id = Guid.Parse("00000000-0000-0000-0000-000000000002");
    private static readonly Guid TestUser2Id = Guid.Parse("00000000-0000-0000-0000-000000000003");

    /// <summary>Shared password for seeded verified test users (localhost only).</summary>
    public const string TestUserPassword = "Password1!";

    public static async Task SeedAsync(AppDbContext dbContext, ILogger logger, IPasswordHasher? passwordHasher = null)
    {
        await SeedAdminUserAsync(dbContext, logger);
        if (passwordHasher is not null)
        {
            await SeedVerifiedAdminUsersAsync(dbContext, passwordHasher, logger);
            await SeedVerifiedTestUsersAsync(dbContext, passwordHasher, logger);
        }
        await dbContext.SaveChangesAsync();
    }

    private static async Task SeedVerifiedAdminUsersAsync(AppDbContext dbContext, IPasswordHasher passwordHasher, ILogger logger)
    {
        var passwordHash = passwordHasher.HashPassword(TestUserPassword);

        if (!await dbContext.Users.AnyAsync(u => u.Email == "admin1@localhost" || u.Username == "admin1"))
        {
            await dbContext.Users.AddAsync(new User
            {
                Id = Admin1Id,
                Username = "admin1",
                Email = "admin1@localhost",
                PasswordHash = passwordHash,
                Role = "Admin",
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                IsEmailVerified = true,
                EmailVerifiedAt = DateTime.UtcNow
            });
            await dbContext.UserPreferences.AddAsync(new UserPreferences
            {
                Id = Guid.NewGuid(),
                UserId = Admin1Id,
                Theme = "System",
                UpdatedAt = DateTime.UtcNow
            });
            logger.LogInformation("Seeded verified admin user: admin1@localhost (using shared local test password).");
        }

        if (!await dbContext.Users.AnyAsync(u => u.Email == "admin2@localhost" || u.Username == "admin2"))
        {
            await dbContext.Users.AddAsync(new User
            {
                Id = Admin2Id,
                Username = "admin2",
                Email = "admin2@localhost",
                PasswordHash = passwordHash,
                Role = "Admin",
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                IsEmailVerified = true,
                EmailVerifiedAt = DateTime.UtcNow
            });
            await dbContext.UserPreferences.AddAsync(new UserPreferences
            {
                Id = Guid.NewGuid(),
                UserId = Admin2Id,
                Theme = "System",
                UpdatedAt = DateTime.UtcNow
            });
            logger.LogInformation("Seeded verified admin user: admin2@localhost (using shared local test password).");
        }
    }

    private static async Task SeedVerifiedTestUsersAsync(AppDbContext dbContext, IPasswordHasher passwordHasher, ILogger logger)
    {
        var passwordHash = passwordHasher.HashPassword(TestUserPassword);

        if (!await dbContext.Users.AnyAsync(u => u.Email == "testuser1@localhost" || u.Username == "testuser1"))
        {
            await dbContext.Users.AddAsync(new User
            {
                Id = TestUser1Id,
                Username = "testuser1",
                Email = "testuser1@localhost",
                PasswordHash = passwordHash,
                Role = "User",
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                IsEmailVerified = true,
                EmailVerifiedAt = DateTime.UtcNow
            });
            await dbContext.UserPreferences.AddAsync(new UserPreferences
            {
                Id = Guid.NewGuid(),
                UserId = TestUser1Id,
                Theme = "System",
                UpdatedAt = DateTime.UtcNow
            });
            logger.LogInformation("Seeded verified test user: testuser1@localhost (using shared local test password).");
        }

        if (!await dbContext.Users.AnyAsync(u => u.Email == "testuser2@localhost" || u.Username == "testuser2"))
        {
            await dbContext.Users.AddAsync(new User
            {
                Id = TestUser2Id,
                Username = "testuser2",
                Email = "testuser2@localhost",
                PasswordHash = passwordHash,
                Role = "User",
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                IsEmailVerified = true,
                EmailVerifiedAt = DateTime.UtcNow
            });
            await dbContext.UserPreferences.AddAsync(new UserPreferences
            {
                Id = Guid.NewGuid(),
                UserId = TestUser2Id,
                Theme = "System",
                UpdatedAt = DateTime.UtcNow
            });
            logger.LogInformation("Seeded verified test user: testuser2@localhost (using shared local test password).");
        }
    }

    private static async Task SeedAdminUserAsync(AppDbContext dbContext, ILogger logger)
    {
        var adminExists = await dbContext.Users.AnyAsync(u =>
            u.Id == AdminUserId || u.Username == "admin" || u.Email == "admin@asidenote.local");

        if (adminExists)
        {
            logger.LogInformation("Admin user already exists – skipping seed.");
            return;
        }

        var adminUser = new User
        {
            Id = AdminUserId,
            Username = "admin",
            Email = "admin@asidenote.local",
            PasswordHash = string.Empty,
            Role = "Admin",
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        await dbContext.Users.AddAsync(adminUser);

        var adminPreferences = new UserPreferences
        {
            Id = Guid.NewGuid(),
            UserId = AdminUserId,
            Theme = "System",
            UpdatedAt = DateTime.UtcNow
        };

        await dbContext.UserPreferences.AddAsync(adminPreferences);

        logger.LogInformation("Seeded admin user (id: {AdminUserId}).", AdminUserId);
    }
}
