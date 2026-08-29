using Microsoft.EntityFrameworkCore;
using ASideNote.Application.DTOs.Projects;
using ASideNote.Application.Services;
using ASideNote.Core.Entities;
using ASideNote.Infrastructure.Data;
using ASideNote.Infrastructure.Repositories;
using Xunit;

namespace ASideNote.Tests;

public sealed class ProjectFolderServiceTests
{
    private static (ProjectFolderService Service, AppDbContext Db) CreateService()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new AppDbContext(options);

        var service = new ProjectFolderService(
            new Repository<ProjectFolder>(db),
            new Repository<Project>(db),
            new Repository<ProjectMember>(db),
            new Repository<Board>(db),
            new Repository<Notebook>(db),
            new UnitOfWork(db));

        return (service, db);
    }

    // Project/Board/Notebook/ProjectFolder/ProjectMember all carry a global query filter that
    // requires the owning User row to exist (see AppDbContext.OnModelCreating). Seed one per
    // owner id or the service sees no data and authorization checks fail spuriously.
    private static User NewUser(Guid id) => new()
    {
        Id = id,
        Username = $"user-{id:N}",
        Email = $"{id:N}@example.com",
        PasswordHash = "hash",
        Role = "User",
        CreatedAt = DateTime.UtcNow,
    };

    private static Project NewProject(Guid ownerId, string name) => new()
    {
        Id = Guid.NewGuid(),
        OwnerId = ownerId,
        Name = name,
        Status = "Active",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
    };

    [Fact]
    public async Task UpdateFolderAsync_MovesFolderAndItsBoards_ToTargetProject()
    {
        var (service, db) = CreateService();
        var userId = Guid.NewGuid();
        var source = NewProject(userId, "Source");
        var target = NewProject(userId, "Target");
        var folder = new ProjectFolder
        {
            Id = Guid.NewGuid(),
            ProjectId = source.Id,
            Name = "Docs",
            SortOrder = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var board = new Board
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ProjectId = source.Id,
            ProjectFolderId = folder.Id,
            Name = "Board A",
            BoardType = "NoteBoard",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var notebook = new Notebook
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ProjectId = source.Id,
            ProjectFolderId = folder.Id,
            Name = "Notebook A",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.AddRange(NewUser(userId), source, target, folder, board, notebook);
        await db.SaveChangesAsync();

        await service.UpdateFolderAsync(userId, source.Id, folder.Id, new UpdateProjectFolderRequest
        {
            TargetProjectId = target.Id,
        });

        Assert.Equal(target.Id, (await db.Set<ProjectFolder>().FindAsync(folder.Id))!.ProjectId);
        Assert.Equal(target.Id, (await db.Set<Board>().FindAsync(board.Id))!.ProjectId);
        Assert.Equal(folder.Id, (await db.Set<Board>().FindAsync(board.Id))!.ProjectFolderId);
        Assert.Equal(target.Id, (await db.Set<Notebook>().FindAsync(notebook.Id))!.ProjectId);
    }

    [Fact]
    public async Task UpdateFolderAsync_Throws_WhenUserLacksAccessToTargetProject()
    {
        var (service, db) = CreateService();
        var userId = Guid.NewGuid();
        var strangerId = Guid.NewGuid();
        var source = NewProject(userId, "Source");
        var target = NewProject(strangerId, "Someone else's");
        var folder = new ProjectFolder
        {
            Id = Guid.NewGuid(),
            ProjectId = source.Id,
            Name = "Docs",
            SortOrder = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.AddRange(NewUser(userId), NewUser(strangerId), source, target, folder);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.UpdateFolderAsync(userId, source.Id, folder.Id, new UpdateProjectFolderRequest
            {
                TargetProjectId = target.Id,
            }));
    }
}
