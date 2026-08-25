using System.Net;
using Amazon.S3.Model;
using ASideNote.Application.Interfaces;
using ASideNote.Infrastructure.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ASideNote.Infrastructure.Services;

public sealed class ImageResolverService : IImageResolver
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly R2Options _r2Options;
    private readonly ILogger<ImageResolverService> _logger;
    private readonly IR2ClientProvider _r2Provider;

    public ImageResolverService(
        IHttpClientFactory httpClientFactory,
        IOptions<R2Options> r2Options,
        ILogger<ImageResolverService> logger,
        IR2ClientProvider r2Provider)
    {
        _httpClientFactory = httpClientFactory;
        _r2Options = r2Options.Value;
        _logger = logger;
        _r2Provider = r2Provider;
    }

    public async Task<byte[]?> GetImageBytesAsync(string url, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(url))
            return null;

        url = url.Trim();
        if (url.StartsWith("//", StringComparison.Ordinal))
            url = "https:" + url;

        if (url.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            return DecodeDataUrl(url);

        var s3 = _r2Provider.Client;
        if (_r2Options.IsConfigured && s3 is not null && IsOurR2Url(url))
        {
            var key = UrlToStorageKey(url);
            if (key is not null)
            {
                try
                {
                    var request = new GetObjectRequest
                    {
                        BucketName = _r2Options.Bucket!,
                        Key = key
                    };
                    using var response = await s3.GetObjectAsync(request, cancellationToken);
                    await using var ms = new MemoryStream();
                    await response.ResponseStream.CopyToAsync(ms, cancellationToken);
                    return ms.ToArray();
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Failed to fetch image from R2 for key {Key}", key);
                    return null;
                }
            }
        }

        return await FetchViaHttpAsync(url, cancellationToken);
    }

    private static byte[]? DecodeDataUrl(string dataUrl)
    {
        var commaIdx = dataUrl.IndexOf(',');
        if (commaIdx < 0)
            return null;
        var base64 = dataUrl[(commaIdx + 1)..];
        try
        {
            return Convert.FromBase64String(base64);
        }
        catch
        {
            return null;
        }
    }

    private bool IsOurR2Url(string url)
    {
        if (string.IsNullOrWhiteSpace(_r2Options.PublicBaseUrl))
            return url.Contains(_r2Options.Bucket ?? "", StringComparison.OrdinalIgnoreCase);
        var baseUrl = _r2Options.PublicBaseUrl.TrimEnd('/') + "/";
        return url.StartsWith(baseUrl, StringComparison.OrdinalIgnoreCase);
    }

    private string? UrlToStorageKey(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return null;
        string? key = null;
        if (!string.IsNullOrWhiteSpace(_r2Options.PublicBaseUrl))
        {
            var baseUrl = _r2Options.PublicBaseUrl.TrimEnd('/') + "/";
            if (url.StartsWith(baseUrl, StringComparison.OrdinalIgnoreCase))
                key = url[baseUrl.Length..].TrimStart('/').Split('?')[0];
        }
        if (key is null && !string.IsNullOrEmpty(_r2Options.Bucket) &&
            url.Contains($"/{_r2Options.Bucket}/", StringComparison.OrdinalIgnoreCase))
        {
            var idx = url.IndexOf($"/{_r2Options.Bucket}/", StringComparison.OrdinalIgnoreCase);
            key = url[(idx + _r2Options.Bucket!.Length + 2)..].Split('?')[0];
        }
        return string.IsNullOrEmpty(key) || !key.StartsWith("notebooks/", StringComparison.Ordinal) ? null : key;
    }

    private async Task<byte[]?> FetchViaHttpAsync(string url, CancellationToken cancellationToken)
    {
        if (!await IsSafePublicImageUrlAsync(url, cancellationToken))
        {
            _logger.LogDebug("Refused to fetch image from disallowed URL");
            return null;
        }

        try
        {
            using var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            var bytes = await client.GetByteArrayAsync(url, cancellationToken);
            return bytes;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to fetch image from URL");
            return null;
        }
    }

    // Blocks SSRF: only allow http/https URLs whose host resolves exclusively to
    // public IP addresses, so notebook content can't make the server reach internal
    // hosts, loopback, or cloud metadata endpoints (e.g. 169.254.169.254).
    private static async Task<bool> IsSafePublicImageUrlAsync(string url, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return false;

        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            return false;

        IPAddress[] addresses;
        try
        {
            addresses = IPAddress.TryParse(uri.Host, out var literal)
                ? [literal]
                : await Dns.GetHostAddressesAsync(uri.Host, cancellationToken);
        }
        catch
        {
            return false;
        }

        return addresses.Length > 0 && addresses.All(IsPublicAddress);
    }

    private static bool IsPublicAddress(IPAddress address)
    {
        if (IPAddress.IsLoopback(address) || address.IsIPv6LinkLocal || address.IsIPv6SiteLocal || address.IsIPv6Multicast)
            return false;

        if (address.IsIPv4MappedToIPv6)
            address = address.MapToIPv4();

        if (address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
        {
            var bytes = address.GetAddressBytes();
            return bytes[0] switch
            {
                10 => false, // 10.0.0.0/8
                127 => false, // 127.0.0.0/8
                169 when bytes[1] == 254 => false, // 169.254.0.0/16 (link-local incl. cloud metadata)
                172 when bytes[1] is >= 16 and <= 31 => false, // 172.16.0.0/12
                192 when bytes[1] == 168 => false, // 192.168.0.0/16
                0 => false, // 0.0.0.0/8
                _ => true
            };
        }

        // Reject IPv6 unique local addresses (fc00::/7) and anything not globally routable.
        var ipv6Bytes = address.GetAddressBytes();
        if ((ipv6Bytes[0] & 0xfe) == 0xfc)
            return false;

        return true;
    }
}
