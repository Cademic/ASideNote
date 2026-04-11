using System.Data;
using System.Text.Json;
using System.Threading.RateLimiting;
using System.Text;
using Asp.Versioning;
using DotNetEnv;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Npgsql;
using Serilog;
using ASideNote.API.Middleware;
using ASideNote.Application.Interfaces;
using ASideNote.Application.Services;
using ASideNote.Core.Interfaces;
using ASideNote.Infrastructure.Data;
using ASideNote.Infrastructure.Repositories;
using ASideNote.Infrastructure.Services;

// ---------------------------------------------------------------------------
// Load .env file (development convenience – no-op if file doesn't exist)
// Search upward from the working directory to find the nearest .env file.
// ---------------------------------------------------------------------------
LoadEnvFile();

static void LoadEnvFile()
{
    var dir = Directory.GetCurrentDirectory();
    while (dir is not null)
    {
        var envPath = Path.Combine(dir, ".env");
        if (File.Exists(envPath))
        {
            Env.Load(envPath);
            return;
        }
        dir = Directory.GetParent(dir)?.FullName;
    }
    // No .env found – that's fine in production (env vars set by host).
}

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// Serilog
// ---------------------------------------------------------------------------
builder.Host.UseSerilog((context, loggerConfiguration) =>
{
    loggerConfiguration.ReadFrom.Configuration(context.Configuration);
    loggerConfiguration.WriteTo.Console();
});

// ---------------------------------------------------------------------------
// Controllers & API Explorer
// ---------------------------------------------------------------------------
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSignalR();

// ---------------------------------------------------------------------------
// API Versioning
// ---------------------------------------------------------------------------
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = new UrlSegmentApiVersionReader();
})
.AddApiExplorer(options =>
{
    // Use 'V' (major only) so URLs are /api/v1/... not /api/v1.0/... to match frontend and docs.
    options.GroupNameFormat = "'v'V";
    options.SubstituteApiVersionInUrl = true;
});

// ---------------------------------------------------------------------------
// Swagger / OpenAPI
// ---------------------------------------------------------------------------
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ASideNote API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter JWT token in the format: Bearer {token}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ---------------------------------------------------------------------------
// Database – PostgreSQL via EF Core (env-var overrides supported)
// ---------------------------------------------------------------------------
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = ResolveConnectionString(builder.Configuration);
    options.UseNpgsql(connectionString);
});

// ---------------------------------------------------------------------------
// CORS – environment-aware origin allowlist
// ---------------------------------------------------------------------------
builder.Services.AddCors(options =>
{
    const string localDevOrigin = "http://localhost:5173";
    var corsOrigins = Environment.GetEnvironmentVariable("CORS_ORIGINS");
    var fromEnv = !string.IsNullOrWhiteSpace(corsOrigins)
        ? corsOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        : Array.Empty<string>();
    var origins = fromEnv.Length > 0
        ? fromEnv.Union(new[] { localDevOrigin }, StringComparer.OrdinalIgnoreCase).ToArray()
        : new[] { localDevOrigin };

    options.AddPolicy("AllowedOrigins", policy =>
    {
        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ---------------------------------------------------------------------------
// JWT Authentication
// ---------------------------------------------------------------------------
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? jwtSection["Secret"]
    ?? (builder.Environment.IsDevelopment()
        ? "DEV_ONLY_FALLBACK_SECRET_CHANGE_IN_PRODUCTION_MIN_32_CHARS"
        : throw new InvalidOperationException("JWT_SECRET environment variable is required in non-development environments."));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };

        // SignalR: read JWT from query string (for WebSocket and HTTP negotiation)
        // The SignalR client sends token via accessTokenFactory which adds it to query string
        options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                // Read token from query string for SignalR hub requests (both HTTP negotiation and WebSocket)
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

// ---------------------------------------------------------------------------
// Google OAuth (optional – enabled when GOOGLE_CLIENT_ID is set)
// ---------------------------------------------------------------------------
var googleClientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID");
var googleClientSecret = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET");

if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    builder.Services.AddAuthentication()
        .AddGoogle("Google", googleOptions =>
        {
            googleOptions.ClientId = googleClientId;
            googleOptions.ClientSecret = googleClientSecret;
            googleOptions.CallbackPath = "/api/v1/auth/google-callback";
        });
}

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Auth endpoints: 10 requests per minute per IP
    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));

    // General API: 100 requests per minute per IP
    options.AddPolicy("general", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
});

// ---------------------------------------------------------------------------
// AutoMapper, FluentValidation, Health Checks
// ---------------------------------------------------------------------------
builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<ASideNote.Application.Validators.Auth.RegisterRequestValidator>();
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("postgres");

// ---------------------------------------------------------------------------
// HttpContext accessor & HttpClient
// ---------------------------------------------------------------------------
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();

// ---------------------------------------------------------------------------
// Repositories & Unit of Work
// ---------------------------------------------------------------------------
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// ---------------------------------------------------------------------------
// Infrastructure Services
// ---------------------------------------------------------------------------
builder.Services.AddSingleton<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

// ---------------------------------------------------------------------------
// Email Service (Resend)
// ---------------------------------------------------------------------------
var resendApiKey = Environment.GetEnvironmentVariable("RESEND_API_KEY");
if (!string.IsNullOrWhiteSpace(resendApiKey))
{
    builder.Services.AddOptions();
    builder.Services.AddHttpClient<Resend.ResendClient>();
    builder.Services.Configure<Resend.ResendClientOptions>(options =>
    {
        options.ApiToken = resendApiKey;
    });
    builder.Services.AddTransient<Resend.IResend, Resend.ResendClient>();
    builder.Services.AddScoped<IEmailService, ResendEmailService>();
}
else
{
    // Development fallback: log emails instead of sending
    builder.Services.AddScoped<IEmailService, ASideNote.Infrastructure.Services.ConsoleEmailService>();
}

// ---------------------------------------------------------------------------
// Application Services
// ---------------------------------------------------------------------------
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<INoteService, NoteService>();
builder.Services.AddScoped<IIndexCardService, IndexCardService>();
builder.Services.AddScoped<IBoardConnectionService, BoardConnectionService>();
builder.Services.AddScoped<IBoardImageService, BoardImageService>();
builder.Services.AddScoped<IBoardService, BoardService>();
builder.Services.AddScoped<IBoardAccessService, BoardAccessService>();
builder.Services.AddScoped<ASideNote.Application.Interfaces.IBoardHubBroadcaster, ASideNote.API.Services.BoardHubBroadcaster>();
builder.Services.AddSingleton<IBoardPresenceService, ASideNote.API.Services.BoardPresenceService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<IProjectFolderService, ProjectFolderService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<IFolderService, FolderService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IDrawingService, DrawingService>();
builder.Services.AddScoped<ICalendarEventService, CalendarEventService>();
builder.Services.AddScoped<INotebookService, NotebookService>();
builder.Services.AddScoped<INotebookAccessService, ASideNote.Application.Services.NotebookAccessService>();
builder.Services.AddScoped<INotebookExportService, NotebookExportService>();
builder.Services.AddScoped<ASideNote.Application.Interfaces.INotebookHubBroadcaster, ASideNote.API.Services.NotebookHubBroadcaster>();
builder.Services.AddSingleton<ASideNote.Application.Interfaces.INotebookPresenceService, ASideNote.API.Services.NotebookPresenceService>();
builder.Services.AddScoped<IUserStorageService, ASideNote.Infrastructure.Services.UserStorageService>();
builder.Services.AddScoped<IImageResolver, ASideNote.Infrastructure.Services.ImageResolverService>();

// ---------------------------------------------------------------------------
// R2 / Image Storage (optional – env: R2__AccessKeyId, R2__SecretAccessKey, R2__Bucket, R2__AccountId)
// ---------------------------------------------------------------------------
builder.Services.Configure<ASideNote.Infrastructure.Options.R2Options>(options =>
{
    builder.Configuration.GetSection("R2").Bind(options);
    options.AccessKeyId ??= Environment.GetEnvironmentVariable("R2_ACCESS_KEY_ID") ?? Environment.GetEnvironmentVariable("R2__AccessKeyId");
    options.SecretAccessKey ??= Environment.GetEnvironmentVariable("R2_SECRET_ACCESS_KEY") ?? Environment.GetEnvironmentVariable("R2__SecretAccessKey");
    options.Bucket ??= Environment.GetEnvironmentVariable("R2_BUCKET") ?? Environment.GetEnvironmentVariable("R2__Bucket");
    options.AccountId ??= Environment.GetEnvironmentVariable("R2_ACCOUNT_ID") ?? Environment.GetEnvironmentVariable("R2__AccountId");
    options.PublicBaseUrl ??= Environment.GetEnvironmentVariable("R2_PUBLIC_BASE_URL") ?? Environment.GetEnvironmentVariable("R2__PublicBaseUrl")
        ?? Environment.GetEnvironmentVariable("R2_PUBLIC_URL") ?? Environment.GetEnvironmentVariable("R2__PublicUrl");
});
var r2AccessKey = Environment.GetEnvironmentVariable("R2_ACCESS_KEY_ID") ?? Environment.GetEnvironmentVariable("R2__AccessKeyId") ?? builder.Configuration["R2:AccessKeyId"];
var r2SecretKey = Environment.GetEnvironmentVariable("R2_SECRET_ACCESS_KEY") ?? Environment.GetEnvironmentVariable("R2__SecretAccessKey") ?? builder.Configuration["R2:SecretAccessKey"];
var r2Bucket = Environment.GetEnvironmentVariable("R2_BUCKET") ?? Environment.GetEnvironmentVariable("R2__Bucket") ?? builder.Configuration["R2:Bucket"];
var r2AccountId = Environment.GetEnvironmentVariable("R2_ACCOUNT_ID") ?? Environment.GetEnvironmentVariable("R2__AccountId") ?? builder.Configuration["R2:AccountId"];
var r2Configured = !string.IsNullOrWhiteSpace(r2AccessKey) && !string.IsNullOrWhiteSpace(r2SecretKey) && !string.IsNullOrWhiteSpace(r2Bucket) && !string.IsNullOrWhiteSpace(r2AccountId);

if (r2Configured)
{
    builder.Services.AddSingleton<Amazon.S3.IAmazonS3>(sp =>
    {
        var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<ASideNote.Infrastructure.Options.R2Options>>().Value;
        var cfg = new Amazon.S3.AmazonS3Config
        {
            ServiceURL = $"https://{opts.AccountId}.r2.cloudflarestorage.com",
            ForcePathStyle = true
        };
        return new Amazon.S3.AmazonS3Client(opts.AccessKeyId, opts.SecretAccessKey, cfg);
    });
    builder.Services.AddSingleton<ASideNote.Infrastructure.Services.IR2ClientProvider, ASideNote.Infrastructure.Services.R2ClientProvider>();
    builder.Services.AddScoped<IImageStorageService, ASideNote.Infrastructure.Services.R2ImageStorageService>();
}
else
{
    builder.Services.AddSingleton<ASideNote.Infrastructure.Services.IR2ClientProvider, ASideNote.Infrastructure.Services.NullR2ClientProvider>();
    builder.Services.AddScoped<IImageStorageService, ASideNote.Infrastructure.Services.NoOpImageStorageService>();
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
var app = builder.Build();

// ---------------------------------------------------------------------------
// Migration status logging (always)
// ---------------------------------------------------------------------------
await LogMigrationStatusAsync(app);

// ---------------------------------------------------------------------------
// Optional dev-only auto-migrate
// ---------------------------------------------------------------------------
if (ShouldApplyMigrationsOnStartup(app))
{
    await ApplyMigrationsAsync(app);
}

// ---------------------------------------------------------------------------
// Migrate-only entry point: dotnet ASideNote.API.dll --migrate
// Used by Render Pre-Deploy Command to apply migrations before starting.
// ---------------------------------------------------------------------------
if (ShouldRunMigrateOnly(args))
{
    await RunMigrateOnlyAsync(app);
    return;
}

// ---------------------------------------------------------------------------
// Seed-only entry point: dotnet run --seed
// ---------------------------------------------------------------------------
if (ShouldRunSeedOnly(args))
{
    await SeedDatabaseAsync(app);
    return;
}

// ---------------------------------------------------------------------------
// Middleware pipeline
// ---------------------------------------------------------------------------

// Swagger: enabled in Development/Staging, restricted in Production
if (!app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseSerilogRequestLogging();
app.UseHttpsRedirection();

// Security headers
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";

    if (!app.Environment.IsDevelopment())
    {
        context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
    }

    await next();
});

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors("AllowedOrigins");

// SignalR: Extract token from query string and add to Authorization header for HTTP requests
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/hubs") && 
        string.IsNullOrEmpty(context.Request.Headers.Authorization))
    {
        var token = context.Request.Query["access_token"].FirstOrDefault();
        if (!string.IsNullOrEmpty(token))
        {
            context.Request.Headers.Authorization = $"Bearer {token}";
        }
    }
    await next();
});

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Health checks
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false // liveness: app is up, no dependency checks
});
app.MapHealthChecks("/health/ready"); // readiness: includes DB check

// Diagnostic: which database this instance is using (host + database name only). Development only to avoid info disclosure.
app.MapGet("/health/db", (AppDbContext db, IWebHostEnvironment env) =>
{
    if (env.IsProduction())
        return Results.NotFound();
    var conn = db.Database.GetDbConnection();
    var cs = conn?.ConnectionString;
    if (string.IsNullOrEmpty(cs))
        return Results.Json(new { host = (string?)null, database = (string?)null });
    try
    {
        var connBuilder = new NpgsqlConnectionStringBuilder(cs);
        return Results.Json(new { host = connBuilder.Host, database = connBuilder.Database });
    }
    catch
    {
        return Results.Json(new { host = (string?)null, database = (string?)null });
    }
}).AllowAnonymous();

app.MapControllers();
app.MapHub<ASideNote.API.Hubs.BoardHub>("/hubs/board");
app.MapHub<ASideNote.API.Hubs.NotebookHub>("/hubs/notebook");

app.Run();

// ==========================================================================
// Helper methods
// ==========================================================================

static string ResolveConnectionString(IConfiguration configuration)
{
    // Prefer Render-style full URL when Postgres is linked (INTERNAL_DATABASE_URL or DATABASE_URL).
    var databaseUrl = Environment.GetEnvironmentVariable("INTERNAL_DATABASE_URL")
        ?? Environment.GetEnvironmentVariable("DATABASE_URL");
    if (!string.IsNullOrWhiteSpace(databaseUrl))
    {
        // Convert URI to key-value format; Npgsql's internal use of DbConnectionStringBuilder expects key=value, not URI.
        if (databaseUrl.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase))
            databaseUrl = "postgresql://" + databaseUrl.Substring(11);
        try
        {
            var uri = new Uri(databaseUrl);
            var builder = new NpgsqlConnectionStringBuilder
            {
                Host = uri.Host,
                Port = uri.Port > 0 ? uri.Port : 5432,
                Database = uri.AbsolutePath.Length > 1 ? uri.AbsolutePath[1..].TrimEnd('/') : "postgres",
                Username = uri.UserInfo,
                Password = string.Empty,
                SslMode = Npgsql.SslMode.Prefer
            };
            if (!string.IsNullOrEmpty(uri.UserInfo))
            {
                var colonIndex = uri.UserInfo.IndexOf(':');
                if (colonIndex >= 0)
                {
                    builder.Username = Uri.UnescapeDataString(uri.UserInfo[..colonIndex]);
                    builder.Password = Uri.UnescapeDataString(uri.UserInfo[(colonIndex + 1)..]);
                }
                else
                    builder.Username = Uri.UnescapeDataString(uri.UserInfo);
            }
            if (uri.Query.Contains("sslmode=require", StringComparison.OrdinalIgnoreCase))
                builder.SslMode = Npgsql.SslMode.Require;
            return builder.ConnectionString;
        }
        catch
        {
            // If URI parse fails, return as-is and let Npgsql try (e.g. key=value string).
            return databaseUrl;
        }
    }

    var connectionString = configuration.GetConnectionString("DefaultConnection")
        ?? "Host=localhost;Port=5432;Database=asidenote;Username=postgres;Password=postgres";

    var connectionBuilder = new NpgsqlConnectionStringBuilder(connectionString);

    var host = Environment.GetEnvironmentVariable("DB_HOST");
    var portValue = Environment.GetEnvironmentVariable("DB_PORT");
    var database = Environment.GetEnvironmentVariable("DB_NAME");
    var username = Environment.GetEnvironmentVariable("DB_USER");
    var password = Environment.GetEnvironmentVariable("DB_PASSWORD");

    if (!string.IsNullOrWhiteSpace(host))
        connectionBuilder.Host = host;

    if (!string.IsNullOrWhiteSpace(portValue) && int.TryParse(portValue, out var port))
        connectionBuilder.Port = port;

    if (!string.IsNullOrWhiteSpace(database))
        connectionBuilder.Database = database;

    if (!string.IsNullOrWhiteSpace(username))
        connectionBuilder.Username = username;

    if (!string.IsNullOrWhiteSpace(password))
        connectionBuilder.Password = password;

    return connectionBuilder.ConnectionString;
}

static bool ShouldRunMigrateOnly(string[] args)
{
    return args.Any(a => a.Equals("--migrate", StringComparison.OrdinalIgnoreCase));
}

static bool ShouldRunSeedOnly(string[] args)
{
    return args.Any(a => a.Equals("--seed", StringComparison.OrdinalIgnoreCase));
}

static bool ShouldApplyMigrationsOnStartup(WebApplication app)
{
    var shouldApply = app.Configuration.GetValue("Database:ApplyMigrationsOnStartup", false);
    return shouldApply && app.Environment.IsDevelopment();
}

static async Task LogMigrationStatusAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
        .CreateLogger("DatabaseSetup");
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    try
    {
        var pendingMigrations = (await dbContext.Database.GetPendingMigrationsAsync()).ToList();

        if (pendingMigrations.Count == 0)
        {
            logger.LogInformation("Database migrations are up to date.");
        }
        else
        {
            logger.LogWarning(
                "Pending EF Core migrations detected ({Count}): {Migrations}",
                pendingMigrations.Count,
                string.Join(", ", pendingMigrations));
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Could not check migration status – is the database reachable?");
    }
}

static async Task ApplyMigrationsAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
        .CreateLogger("DatabaseSetup");
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await EnsureNotebooksMigrationHistoryConsistentAsync(dbContext, logger);
    logger.LogInformation("Applying EF Core migrations on startup (Development mode).");
    await dbContext.Database.MigrateAsync();
    logger.LogInformation("EF Core migrations applied successfully.");
}

static async Task RunMigrateOnlyAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
        .CreateLogger("DatabaseSetup");
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var pending = (await dbContext.Database.GetPendingMigrationsAsync()).ToList();

    if (pending.Count > 0)
    {
        logger.LogInformation(
            "Applying {Count} pending migration(s): {Migrations}",
            pending.Count,
            string.Join(", ", pending));
    }
    else
    {
        logger.LogInformation("No pending migrations. Database is up to date.");
    }

    await EnsureNotebooksMigrationHistoryConsistentAsync(dbContext, logger);
    // Always call MigrateAsync: applies any pending migrations (creates new tables); no-op if already up to date.
    await dbContext.Database.MigrateAsync();
    logger.LogInformation("Migrations complete.");
}

/// <summary>
/// If __EFMigrationsHistory says 20260215120000_AddNotebooksAndNotebookPages was applied
/// but the Notebooks table is missing (e.g. table was dropped or DB restored without tables),
/// remove that row so EF will re-apply the migration and create Notebooks/NotebookPages.
/// </summary>
static async Task EnsureNotebooksMigrationHistoryConsistentAsync(
    AppDbContext dbContext,
    Microsoft.Extensions.Logging.ILogger logger)
{
    const string notebooksMigrationId = "20260215120000_AddNotebooksAndNotebookPages";
    try
    {
        var conn = dbContext.Database.GetDbConnection();
        if (conn.State != ConnectionState.Open)
            await conn.OpenAsync();

        await using var checkTableCmd = conn.CreateCommand();
        checkTableCmd.CommandText = """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'Notebooks'
            )
            """;
        var tableExists = (bool)(await checkTableCmd.ExecuteScalarAsync() ?? false);

        if (tableExists)
            return;

        // Use literal in SQL (migration ID is a fixed constant, not user input) to avoid Npgsql parameter binding issues with DbCommand.
        var escapedId = notebooksMigrationId.Replace("'", "''", StringComparison.Ordinal);
        await using var checkHistoryCmd = conn.CreateCommand();
        checkHistoryCmd.CommandText = $"""
            SELECT 1 FROM "__EFMigrationsHistory"
            WHERE "MigrationId" = '{escapedId}'
            LIMIT 1
            """;
        var migrationInHistory = await checkHistoryCmd.ExecuteScalarAsync() != null;

        if (!migrationInHistory)
            return;

        var deleted = await dbContext.Database.ExecuteSqlRawAsync(
            """DELETE FROM "__EFMigrationsHistory" WHERE "MigrationId" = {0}""",
            notebooksMigrationId);
        if (deleted > 0)
            logger.LogWarning(
                "Removed migration {MigrationId} from __EFMigrationsHistory (Notebooks table was missing). It will be re-applied.",
                notebooksMigrationId);
    }
    catch (Exception ex)
    {
        logger.LogDebug(ex, "Could not check/fix Notebooks migration history consistency.");
    }
}

static async Task SeedDatabaseAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
        .CreateLogger("DatabaseSeeder");
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var passwordHasher = scope.ServiceProvider.GetService<IPasswordHasher>();

    logger.LogInformation("Running database seed...");
    await dbContext.Database.MigrateAsync();
    await AppDbContextSeeder.SeedAsync(dbContext, logger, passwordHasher);
    logger.LogInformation("Database seed completed.");
}
