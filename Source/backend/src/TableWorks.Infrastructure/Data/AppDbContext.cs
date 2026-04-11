using Microsoft.EntityFrameworkCore;
using ASideNote.Core.Entities;

namespace ASideNote.Infrastructure.Data;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<NoteTag> NoteTags => Set<NoteTag>();
    public DbSet<Folder> Folders => Set<Folder>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<UserPreferences> UserPreferences => Set<UserPreferences>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<IndexCard> IndexCards => Set<IndexCard>();
    public DbSet<IndexCardTag> IndexCardTags => Set<IndexCardTag>();
    public DbSet<BoardConnection> BoardConnections => Set<BoardConnection>();
    public DbSet<Board> Boards => Set<Board>();
    public DbSet<BoardImage> BoardImages => Set<BoardImage>();
    public DbSet<Drawing> Drawings => Set<Drawing>();
    public DbSet<CalendarEvent> CalendarEvents => Set<CalendarEvent>();
    public DbSet<EmailVerificationToken> EmailVerificationTokens => Set<EmailVerificationToken>();
    public DbSet<ExternalLogin> ExternalLogins => Set<ExternalLogin>();
    public DbSet<UserPinnedProject> UserPinnedProjects => Set<UserPinnedProject>();
    public DbSet<FriendRequest> FriendRequests => Set<FriendRequest>();
    public DbSet<Notebook> Notebooks => Set<Notebook>();
    public DbSet<ProjectFolder> ProjectFolders => Set<ProjectFolder>();
    public DbSet<NotebookVersion> NotebookVersions => Set<NotebookVersion>();
    public DbSet<UserStorageItem> UserStorageItems => Set<UserStorageItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Enable uuid generation extension
        modelBuilder.HasPostgresExtension("uuid-ossp");

        // ----- User -----
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => x.Username).IsUnique();
            entity.HasQueryFilter(u => u.DeletedAt == null);
        });

        // ----- UserStorageItem -----
        modelBuilder.Entity<UserStorageItem>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
            entity.HasIndex(x => x.StorageKey).IsUnique();
            entity.HasIndex(x => x.UserId);

            entity.Property(x => x.StorageKey).HasMaxLength(512);

            entity.HasOne(x => x.User)
                .WithMany(x => x.StorageItems)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(i => Set<User>().Any(u => u.Id == i.UserId));
        });

        // ----- Board -----
        modelBuilder.Entity<Board>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.BoardType);
            entity.HasIndex(x => x.CreatedAt);
            entity.HasIndex(x => x.ProjectId);

            entity.HasOne(x => x.User)
                .WithMany(x => x.Boards)
                .HasForeignKey(x => x.UserId);

            entity.HasOne(x => x.Project)
                .WithMany(x => x.Boards)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(x => x.ProjectFolderId);

            entity.HasOne(x => x.ProjectFolder)
                .WithMany(x => x.Boards)
                .HasForeignKey(x => x.ProjectFolderId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(b => Set<User>().Any(u => u.Id == b.UserId));
        });

        // ----- BoardImage -----
        modelBuilder.Entity<BoardImage>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            entity.HasIndex(x => x.BoardId);
            entity.HasIndex(x => x.UserId);

            entity.Property(x => x.ImageUrl).HasMaxLength(2048).IsRequired();

            entity.HasOne(x => x.Board)
                .WithMany(x => x.BoardImages)
                .HasForeignKey(x => x.BoardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(bi => Set<User>().Any(u => u.Id == bi.UserId));
        });

        // ----- Notebook -----
        modelBuilder.Entity<Notebook>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.ProjectId);
            entity.HasIndex(x => x.CreatedAt);
            entity.HasIndex(x => x.UpdatedAt);

            entity.Property(x => x.ContentJson).HasColumnType("jsonb");

            entity.HasOne(x => x.User)
                .WithMany(x => x.Notebooks)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Project)
                .WithMany(x => x.Notebooks)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(x => x.ProjectFolderId);

            entity.HasOne(x => x.ProjectFolder)
                .WithMany(x => x.Notebooks)
                .HasForeignKey(x => x.ProjectFolderId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(n => Set<User>().Any(u => u.Id == n.UserId));
        });

        // ----- NotebookVersion -----
        modelBuilder.Entity<NotebookVersion>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            entity.HasIndex(x => x.NotebookId);
            entity.HasIndex(x => x.CreatedAt);

            entity.Property(x => x.ContentJson).HasColumnType("jsonb");

            entity.HasOne(x => x.Notebook)
                .WithMany()
                .HasForeignKey(x => x.NotebookId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ----- Note -----
        modelBuilder.Entity<Note>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            // Required indexes from proposal
            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.CreatedAt);
            entity.HasIndex(x => x.UpdatedAt);
            entity.HasIndex(x => x.FolderId);
            entity.HasIndex(x => x.ProjectId);
            entity.HasIndex(x => x.BoardId);

            entity.HasOne(x => x.User)
                .WithMany(x => x.Notes)
                .HasForeignKey(x => x.UserId);
            entity.HasOne(x => x.Folder)
                .WithMany(x => x.Notes)
                .HasForeignKey(x => x.FolderId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.Project)
                .WithMany(x => x.Notes)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.Board)
                .WithMany(x => x.Notes)
                .HasForeignKey(x => x.BoardId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(n => Set<User>().Any(u => u.Id == n.UserId));
        });

        // ----- Project -----
        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            // Required indexes from proposal
            entity.HasIndex(x => x.OwnerId);
            entity.HasIndex(x => x.StartDate);
            entity.HasIndex(x => x.EndDate);
            entity.HasIndex(x => x.Status);

            entity.HasOne(x => x.Owner)
                .WithMany(x => x.OwnedProjects)
                .HasForeignKey(x => x.OwnerId);

            entity.HasQueryFilter(p => Set<User>().Any(u => u.Id == p.OwnerId));
        });

        // ----- ProjectFolder -----
        modelBuilder.Entity<ProjectFolder>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            entity.HasIndex(x => x.ProjectId);
            entity.HasIndex(x => new { x.ProjectId, x.Name }).IsUnique();

            entity.Property(x => x.Name).HasMaxLength(128).IsRequired();

            entity.HasOne(x => x.Project)
                .WithMany(x => x.ProjectFolders)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ----- UserPinnedProject -----
        modelBuilder.Entity<UserPinnedProject>(entity =>
        {
            entity.HasKey(x => new { x.UserId, x.ProjectId });
            entity.HasIndex(x => new { x.UserId, x.ProjectId }).IsUnique();
            entity.Property(x => x.PinnedAt).IsRequired();

            entity.HasOne(x => x.User)
                .WithMany(x => x.PinnedProjects)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Project)
                .WithMany(x => x.PinnedByUsers)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(p => Set<User>().Any(u => u.Id == p.UserId));
        });

        // ----- ProjectMember -----
        modelBuilder.Entity<ProjectMember>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            // Composite unique index from proposal
            entity.HasIndex(x => new { x.ProjectId, x.UserId }).IsUnique();

            entity.HasOne(x => x.Project)
                .WithMany(x => x.Members)
                .HasForeignKey(x => x.ProjectId);
            entity.HasOne(x => x.User)
                .WithMany(x => x.ProjectMemberships)
                .HasForeignKey(x => x.UserId);

            entity.HasQueryFilter(p => Set<User>().Any(u => u.Id == p.UserId));
        });

        // ----- Tag -----
        modelBuilder.Entity<Tag>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
            entity.HasIndex(x => x.Name).IsUnique();
        });

        // ----- NoteTag -----
        modelBuilder.Entity<NoteTag>(entity =>
        {
            entity.HasKey(x => new { x.NoteId, x.TagId });
            entity.HasOne(x => x.Note)
                .WithMany(x => x.NoteTags)
                .HasForeignKey(x => x.NoteId);
            entity.HasOne(x => x.Tag)
                .WithMany(x => x.NoteTags)
                .HasForeignKey(x => x.TagId);
        });

        // ----- IndexCard -----
        modelBuilder.Entity<IndexCard>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.CreatedAt);
            entity.HasIndex(x => x.UpdatedAt);
            entity.HasIndex(x => x.FolderId);
            entity.HasIndex(x => x.ProjectId);
            entity.HasIndex(x => x.BoardId);

            entity.HasOne(x => x.User)
                .WithMany(x => x.IndexCards)
                .HasForeignKey(x => x.UserId);
            entity.HasOne(x => x.Folder)
                .WithMany(x => x.IndexCards)
                .HasForeignKey(x => x.FolderId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.Project)
                .WithMany(x => x.IndexCards)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.Board)
                .WithMany(x => x.IndexCards)
                .HasForeignKey(x => x.BoardId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(c => Set<User>().Any(u => u.Id == c.UserId));
        });

        // ----- IndexCardTag -----
        modelBuilder.Entity<IndexCardTag>(entity =>
        {
            entity.HasKey(x => new { x.IndexCardId, x.TagId });
            entity.HasOne(x => x.IndexCard)
                .WithMany(x => x.IndexCardTags)
                .HasForeignKey(x => x.IndexCardId);
            entity.HasOne(x => x.Tag)
                .WithMany(x => x.IndexCardTags)
                .HasForeignKey(x => x.TagId);
        });

        // ----- Folder -----
        modelBuilder.Entity<Folder>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            entity.HasOne(x => x.User)
                .WithMany(x => x.Folders)
                .HasForeignKey(x => x.UserId);
            entity.HasOne(x => x.ParentFolder)
                .WithMany(x => x.ChildFolders)
                .HasForeignKey(x => x.ParentFolderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasQueryFilter(f => Set<User>().Any(u => u.Id == f.UserId));
        });

        // ----- Notification -----
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            // Required indexes from proposal
            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.IsRead);
            entity.HasIndex(x => x.CreatedAt);

            entity.HasOne(x => x.User)
                .WithMany(x => x.Notifications)
                .HasForeignKey(x => x.UserId);

            entity.HasQueryFilter(n => Set<User>().Any(u => u.Id == n.UserId));
        });

        // ----- AuditLog -----
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            // Required indexes from proposal
            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.Timestamp);
            entity.HasIndex(x => x.ActionType);

            // JSONB for details column
            entity.Property(x => x.DetailsJson).HasColumnType("jsonb");

            entity.HasOne(x => x.User)
                .WithMany(x => x.AuditLogs)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(a => a.UserId == null || Set<User>().Any(u => u.Id == a.UserId));
        });

        // ----- RefreshToken -----
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasIndex(x => x.UserId);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(r => Set<User>().Any(u => u.Id == r.UserId));
        });

        // ----- BoardConnection -----
        modelBuilder.Entity<BoardConnection>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.BoardId);

            entity.Property(x => x.FromItemId).IsRequired();
            entity.Property(x => x.ToItemId).IsRequired();

            entity.HasOne(x => x.User)
                .WithMany(x => x.BoardConnections)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Board)
                .WithMany(x => x.BoardConnections)
                .HasForeignKey(x => x.BoardId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(b => Set<User>().Any(u => u.Id == b.UserId));
        });

        // ----- Drawing -----
        modelBuilder.Entity<Drawing>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            entity.HasIndex(x => x.BoardId).IsUnique();
            entity.HasIndex(x => x.UserId);

            entity.Property(x => x.CanvasJson).HasColumnType("text");

            entity.HasOne(x => x.Board)
                .WithOne(x => x.Drawing)
                .HasForeignKey<Drawing>(x => x.BoardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany(x => x.Drawings)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(d => Set<User>().Any(u => u.Id == d.UserId));
        });

        // ----- CalendarEvent -----
        modelBuilder.Entity<CalendarEvent>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.ProjectId);
            entity.HasIndex(x => x.StartDate);

            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(2000);
            entity.Property(x => x.Color).HasMaxLength(20).HasDefaultValue("sky");
            entity.Property(x => x.EventType).HasMaxLength(20).HasDefaultValue("Event");

            entity.Property(x => x.RecurrenceFrequency).HasMaxLength(20);
            entity.Property(x => x.RecurrenceInterval).HasDefaultValue(1);

            entity.HasOne(x => x.User)
                .WithMany(x => x.CalendarEvents)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Project)
                .WithMany()
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(e => Set<User>().Any(u => u.Id == e.UserId));
        });

        // ----- UserPreferences -----
        modelBuilder.Entity<UserPreferences>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
            entity.HasIndex(x => x.UserId).IsUnique();

            // JSONB for email notifications preferences
            entity.Property(x => x.EmailNotificationsJson).HasColumnType("jsonb");

            entity.HasOne(x => x.User)
                .WithOne(x => x.Preferences)
                .HasForeignKey<UserPreferences>(x => x.UserId);

            entity.HasQueryFilter(p => Set<User>().Any(u => u.Id == p.UserId));
        });

        // ----- EmailVerificationToken -----
        modelBuilder.Entity<EmailVerificationToken>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasIndex(x => x.UserId);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(t => Set<User>().Any(u => u.Id == t.UserId));
        });

        // ----- ExternalLogin -----
        modelBuilder.Entity<ExternalLogin>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            entity.HasIndex(x => new { x.Provider, x.ProviderUserId }).IsUnique();
            entity.HasIndex(x => x.UserId);

            entity.HasOne(x => x.User)
                .WithMany(x => x.ExternalLogins)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => Set<User>().Any(u => u.Id == e.UserId));
        });

        // ----- FriendRequest -----
        modelBuilder.Entity<FriendRequest>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

            entity.HasIndex(x => new { x.RequesterId, x.ReceiverId }).IsUnique();
            entity.HasIndex(x => x.ReceiverId);
            entity.HasIndex(x => x.CreatedAt);

            entity.Property(x => x.Status).HasConversion<int>();

            entity.HasOne(x => x.Requester)
                .WithMany(x => x.SentFriendRequests)
                .HasForeignKey(x => x.RequesterId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Receiver)
                .WithMany(x => x.ReceivedFriendRequests)
                .HasForeignKey(x => x.ReceiverId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(f => Set<User>().Any(u => u.Id == f.RequesterId) && Set<User>().Any(u => u.Id == f.ReceiverId));
        });
    }
}
