namespace ASideNote.Application.Helpers;

/// <summary>
/// Verifies uploaded image bytes actually match their declared content type, since the
/// browser-supplied Content-Type header is client-controlled and can be spoofed.
/// </summary>
public static class ImageMagicBytes
{
    /// <summary>Largest header any supported format needs to inspect.</summary>
    public const int RequiredHeaderBytes = 12;

    public static bool MatchesDeclaredType(ReadOnlySpan<byte> header, string contentType) => contentType switch
    {
        "image/jpeg" => header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
        "image/png" => header.Length >= 8 &&
            header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
            header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A,
        "image/gif" => header.Length >= 6 &&
            header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38 &&
            (header[4] == 0x37 || header[4] == 0x39) && header[5] == 0x61,
        "image/webp" => header.Length >= 12 &&
            header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
            header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50,
        _ => false
    };
}
