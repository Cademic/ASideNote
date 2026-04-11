using System.Security.Cryptography;
using System.Text;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ASideNote.Application.DTOs.Auth;
using ASideNote.Application.DTOs.Users;
using ASideNote.Application.Interfaces;
using ASideNote.Core.Entities;
using ASideNote.Core.Interfaces;

namespace ASideNote.Application.Services;

public sealed class AuthService : IAuthService
{
    /// <summary>Default avatar keys for new users. Must match UserService.AllowedProfilePictureKeys and frontend.</summary>
    private static readonly string[] DefaultAvatarKeys = { "avatar-1", "avatar-2", "avatar-3", "avatar-4", "avatar-5", "avatar-6", "avatar-7", "avatar-8" };

    private static string GetRandomDefaultAvatarKey() =>
        DefaultAvatarKeys[RandomNumberGenerator.GetInt32(DefaultAvatarKeys.Length)];

    private static long GetStorageLimitBytesFromEnv()
    {
        var mb = Environment.GetEnvironmentVariable("USER_STORAGE_LIMIT_MB");
        if (string.IsNullOrWhiteSpace(mb) || !long.TryParse(mb, out var limitMb) || limitMb <= 0)
            return 524_288_000;
        return limitMb * 1024L * 1024L;
    }

    private readonly IRepository<User> _userRepo;
    private readonly IRepository<RefreshToken> _refreshTokenRepo;
    private readonly IRepository<EmailVerificationToken> _verificationTokenRepo;
    private readonly IRepository<ExternalLogin> _externalLoginRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthService> _logger;
    private readonly IUserService _userService;

    private static readonly string FrontendUrl =
        Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:5173";

    private static readonly string? GoogleClientId =
        Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID");

    public AuthService(
        IRepository<User> userRepo,
        IRepository<RefreshToken> refreshTokenRepo,
        IRepository<EmailVerificationToken> verificationTokenRepo,
        IRepository<ExternalLogin> externalLoginRepo,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IEmailService emailService,
        ILogger<AuthService> logger,
        IUserService userService)
    {
        _userRepo = userRepo;
        _refreshTokenRepo = refreshTokenRepo;
        _verificationTokenRepo = verificationTokenRepo;
        _externalLoginRepo = externalLoginRepo;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _emailService = emailService;
        _logger = logger;
        _userService = userService;
    }

    // -----------------------------------------------------------------------
    // Register (email/password) — creates unverified account, sends email
    // -----------------------------------------------------------------------
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var existingEmail = await _userRepo.Query()
            .AnyAsync(u => u.Email == request.Email, cancellationToken);
        if (existingEmail)
            throw new InvalidOperationException("A user with this email already exists.");

        var normalizedUsername = request.Username.Trim().ToLowerInvariant();
        var existingUsername = await _userRepo.Query()
            .AnyAsync(u => u.Username.ToLower() == normalizedUsername, cancellationToken);
        if (existingUsername)
            throw new InvalidOperationException("A user with this username already exists.");

        var user = new User
        {
            Username = request.Username,
            StorageLimitBytes = GetStorageLimitBytesFromEnv(),
            Email = request.Email,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            Role = "User",
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
            IsEmailVerified = false,
            ProfilePictureKey = GetRandomDefaultAvatarKey()
        };

        await _userRepo.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Send verification email
        await SendVerificationTokenAsync(user, cancellationToken);

        var accessToken = _tokenService.GenerateAccessToken(user);
        var rawRefreshToken = _tokenService.GenerateRefreshToken();

        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = _tokenService.HashRefreshToken(rawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        await _refreshTokenRepo.AddAsync(refreshTokenEntity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new AuthResponse
        {
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            IsEmailVerified = user.IsEmailVerified,
            ProfilePictureKey = user.ProfilePictureKey,
            Token = accessToken,
            RefreshToken = rawRefreshToken,
            ExpiresIn = _tokenService.AccessTokenExpirationMinutes * 60
        };
    }

    // -----------------------------------------------------------------------
    // Login (email/password)
    // -----------------------------------------------------------------------
    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userRepo.Query()
            .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        if (user is null || string.IsNullOrEmpty(user.PasswordHash) ||
            !_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Account is deactivated.");

        user.LastLoginAt = DateTime.UtcNow;
        _userRepo.Update(user);

        var accessToken = _tokenService.GenerateAccessToken(user);
        var rawRefreshToken = _tokenService.GenerateRefreshToken();

        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = _tokenService.HashRefreshToken(rawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        await _refreshTokenRepo.AddAsync(refreshTokenEntity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new AuthResponse
        {
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            IsEmailVerified = user.IsEmailVerified,
            ProfilePictureKey = user.ProfilePictureKey,
            Token = accessToken,
            RefreshToken = rawRefreshToken,
            ExpiresIn = _tokenService.AccessTokenExpirationMinutes * 60
        };
    }

    // -----------------------------------------------------------------------
    // Refresh
    // -----------------------------------------------------------------------
    public async Task<TokenResponse> RefreshAsync(RefreshRequest request, CancellationToken cancellationToken = default)
    {
        var tokenHash = _tokenService.HashRefreshToken(request.RefreshToken);

        var storedToken = await _refreshTokenRepo.Query()
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, cancellationToken);

        if (storedToken is null || storedToken.RevokedAt is not null || storedToken.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");

        if (storedToken.User is null || !storedToken.User.IsActive)
            throw new UnauthorizedAccessException("Account is deactivated.");

        // Revoke old token
        storedToken.RevokedAt = DateTime.UtcNow;

        // Create new tokens
        var newAccessToken = _tokenService.GenerateAccessToken(storedToken.User);
        var newRawRefreshToken = _tokenService.GenerateRefreshToken();
        var newTokenHash = _tokenService.HashRefreshToken(newRawRefreshToken);

        storedToken.ReplacedByTokenHash = newTokenHash;
        _refreshTokenRepo.Update(storedToken);

        var newRefreshTokenEntity = new RefreshToken
        {
            UserId = storedToken.UserId,
            TokenHash = newTokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        await _refreshTokenRepo.AddAsync(newRefreshTokenEntity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new TokenResponse
        {
            Token = newAccessToken,
            RefreshToken = newRawRefreshToken,
            ExpiresIn = _tokenService.AccessTokenExpirationMinutes * 60
        };
    }

    // -----------------------------------------------------------------------
    // Logout
    // -----------------------------------------------------------------------
    public async Task LogoutAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var activeTokens = await _refreshTokenRepo.Query()
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var token in activeTokens)
        {
            token.RevokedAt = DateTime.UtcNow;
            _refreshTokenRepo.Update(token);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        try
        {
            await _userService.RecordPresenceAsync(userId, new UpdatePresenceRequest { Leave = true }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to clear presence on logout for user {UserId}", userId);
        }
    }

    // -----------------------------------------------------------------------
    // Email verification
    // -----------------------------------------------------------------------
    public async Task VerifyEmailAsync(string token, CancellationToken cancellationToken = default)
    {
        var tokenHash = HashToken(token);

        var verificationToken = await _verificationTokenRepo.Query()
            .Include(vt => vt.User)
            .FirstOrDefaultAsync(vt => vt.TokenHash == tokenHash, cancellationToken);

        if (verificationToken is null)
            throw new InvalidOperationException("Invalid verification token.");

        if (verificationToken.ConsumedAt is not null)
            throw new InvalidOperationException("This verification link has already been used.");

        if (verificationToken.ExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("This verification link has expired. Please request a new one.");

        // Mark token as consumed
        verificationToken.ConsumedAt = DateTime.UtcNow;
        _verificationTokenRepo.Update(verificationToken);

        // Verify the user
        if (verificationToken.User is not null && !verificationToken.User.IsEmailVerified)
        {
            verificationToken.User.IsEmailVerified = true;
            verificationToken.User.EmailVerifiedAt = DateTime.UtcNow;
            _userRepo.Update(verificationToken.User);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Email verified for user {UserId}", verificationToken.UserId);
    }

    public async Task ResendVerificationAsync(string email, CancellationToken cancellationToken = default)
    {
        var user = await _userRepo.Query()
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

        // Silent success to prevent email enumeration
        if (user is null || user.IsEmailVerified)
            return;

        // Throttle: check if a token was sent in the last 2 minutes
        var recentToken = await _verificationTokenRepo.Query()
            .Where(vt => vt.UserId == user.Id && vt.ConsumedAt == null)
            .OrderByDescending(vt => vt.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (recentToken is not null && recentToken.CreatedAt > DateTime.UtcNow.AddMinutes(-2))
            throw new InvalidOperationException("Please wait before requesting another verification email.");

        await SendVerificationTokenAsync(user, cancellationToken);
    }

    // -----------------------------------------------------------------------
    // Google login/signup
    // -----------------------------------------------------------------------
    public async Task<AuthResponse> GoogleLoginAsync(string idToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(GoogleClientId))
            throw new InvalidOperationException("Google login is not configured.");

        GoogleJsonWebSignature.Payload payload;
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { GoogleClientId }
            };
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
        }
        catch (InvalidJwtException)
        {
            throw new UnauthorizedAccessException("Invalid Google token.");
        }

        if (!payload.EmailVerified)
            throw new UnauthorizedAccessException("Google account email is not verified.");

        var googleUserId = payload.Subject;
        var googleEmail = payload.Email;
        var googleName = payload.Name ?? payload.Email.Split('@')[0];

        // Check if we already have this Google account linked
        var existingLogin = await _externalLoginRepo.Query()
            .Include(el => el.User)
            .FirstOrDefaultAsync(el => el.Provider == "Google" && el.ProviderUserId == googleUserId, cancellationToken);

        User user;

        if (existingLogin?.User is not null)
        {
            // Returning Google user
            user = existingLogin.User;
        }
        else
        {
            // Check if a local account with this email exists
            var existingUser = await _userRepo.Query()
                .FirstOrDefaultAsync(u => u.Email == googleEmail, cancellationToken);

            if (existingUser is not null)
            {
                // Link Google to existing account (safe: Google email is verified)
                user = existingUser;

                // Auto-verify email if not already
                if (!user.IsEmailVerified)
                {
                    user.IsEmailVerified = true;
                    user.EmailVerifiedAt = DateTime.UtcNow;
                    _userRepo.Update(user);
                }

                var externalLogin = new ExternalLogin
                {
                    UserId = user.Id,
                    Provider = "Google",
                    ProviderUserId = googleUserId,
                    ProviderEmail = googleEmail,
                    CreatedAt = DateTime.UtcNow
                };
                await _externalLoginRepo.AddAsync(externalLogin, cancellationToken);
            }
            else
            {
                // Create new user from Google
                user = new User
                {
                    Username = await GenerateUniqueUsername(googleName, cancellationToken),
                    Email = googleEmail,
                    StorageLimitBytes = GetStorageLimitBytesFromEnv(),
                    PasswordHash = string.Empty, // No password for Google-only accounts
                    Role = "User",
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true,
                    IsEmailVerified = true, // Google emails are verified
                    EmailVerifiedAt = DateTime.UtcNow,
                    ProfilePictureKey = GetRandomDefaultAvatarKey()
                };

                await _userRepo.AddAsync(user, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                var externalLogin = new ExternalLogin
                {
                    UserId = user.Id,
                    Provider = "Google",
                    ProviderUserId = googleUserId,
                    ProviderEmail = googleEmail,
                    CreatedAt = DateTime.UtcNow
                };
                await _externalLoginRepo.AddAsync(externalLogin, cancellationToken);
            }
        }

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Account is deactivated.");

        user.LastLoginAt = DateTime.UtcNow;
        _userRepo.Update(user);

        var accessToken = _tokenService.GenerateAccessToken(user);
        var rawRefreshToken = _tokenService.GenerateRefreshToken();

        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = _tokenService.HashRefreshToken(rawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        await _refreshTokenRepo.AddAsync(refreshTokenEntity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Google login for user {UserId} ({Email})", user.Id, user.Email);

        return new AuthResponse
        {
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            IsEmailVerified = user.IsEmailVerified,
            ProfilePictureKey = user.ProfilePictureKey,
            Token = accessToken,
            RefreshToken = rawRefreshToken,
            ExpiresIn = _tokenService.AccessTokenExpirationMinutes * 60
        };
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------
    private async Task SendVerificationTokenAsync(User user, CancellationToken cancellationToken)
    {
        var rawToken = GenerateRandomToken();
        var tokenHash = HashToken(rawToken);

        var entity = new EmailVerificationToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            CreatedAt = DateTime.UtcNow
        };

        await _verificationTokenRepo.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var verificationUrl = $"{FrontendUrl}/verify-email?token={Uri.EscapeDataString(rawToken)}";

        try
        {
            await _emailService.SendVerificationEmailAsync(user.Email, user.Username, verificationUrl, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email for user {UserId}", user.Id);
            // Don't fail registration if email sending fails
        }
    }

    private static string GenerateRandomToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }

    private static string HashToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hash);
    }

    private async Task<string> GenerateUniqueUsername(string baseName, CancellationToken cancellationToken)
    {
        // Sanitize to alphanumeric + underscores
        var sanitized = new string(baseName.Where(c => char.IsLetterOrDigit(c) || c == '_').ToArray());
        if (string.IsNullOrWhiteSpace(sanitized) || sanitized.Length < 3)
            sanitized = "user";

        var candidate = sanitized;
        var attempt = 0;

        while (await _userRepo.Query().AnyAsync(u => u.Username.ToLower() == candidate.ToLower(), cancellationToken))
        {
            attempt++;
            candidate = $"{sanitized}{RandomNumberGenerator.GetInt32(1000, 9999)}";
            if (attempt > 10) candidate = $"user_{Guid.NewGuid():N}"[..16];
        }

        return candidate;
    }
}
