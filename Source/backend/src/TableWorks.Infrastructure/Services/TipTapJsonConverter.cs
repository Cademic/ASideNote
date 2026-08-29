using System.Net;
using System.Text;
using System.Text.Json;
using ASideNote.Application.Interfaces;

namespace ASideNote.Infrastructure.Services;

/// <summary>Converts TipTap/ProseMirror JSON document to HTML, plain text, or Markdown.</summary>
public static class TipTapJsonConverter
{
    /// <summary>Converts to HTML with optional image embedding. When embedImages is true, resolves image URLs to base64 data URLs.</summary>
    public static async Task<string> ToHtmlAsync(string contentJson, IImageResolver? resolver, bool embedImages, CancellationToken cancellationToken = default)
    {
        using var doc = JsonDocument.Parse(contentJson);
        var root = doc.RootElement;
        var sb = new StringBuilder();
        await AppendHtmlAsync(root, sb, embedImages ? resolver : null, cancellationToken);
        return sb.ToString();
    }

    public static string ToPlainText(string contentJson)
    {
        using var doc = JsonDocument.Parse(contentJson);
        var root = doc.RootElement;
        var sb = new StringBuilder();
        AppendText(root, sb);
        return sb.ToString();
    }

    /// <summary>Converts to Markdown with optional image embedding as base64 data URLs.</summary>
    public static async Task<string> ToMarkdownAsync(string contentJson, IImageResolver? resolver, bool embedImages, CancellationToken cancellationToken = default)
    {
        using var doc = JsonDocument.Parse(contentJson);
        var root = doc.RootElement;
        var sb = new StringBuilder();
        await AppendMarkdownAsync(root, sb, 0, embedImages ? resolver : null, cancellationToken);
        return sb.ToString();
    }

    private static async Task AppendHtmlAsync(JsonElement node, StringBuilder sb, IImageResolver? resolver, CancellationToken ct)
    {
        var type = node.TryGetProperty("type", out var t) ? t.GetString() : null;
        var content = node.TryGetProperty("content", out var c) ? c : (JsonElement?)null;

        switch (type)
        {
            case "doc":
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendHtmlAsync(child, sb, resolver, ct);
                break;
            case "paragraph":
                sb.Append("<p>");
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendHtmlAsync(child, sb, resolver, ct);
                sb.Append("</p>");
                break;
            case "heading":
                var level = node.TryGetProperty("attrs", out var hAttrs) && hAttrs.TryGetProperty("level", out var l) ? l.GetInt32() : 1;
                sb.Append($"<h{level}>");
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendHtmlAsync(child, sb, resolver, ct);
                sb.Append($"</h{level}>");
                break;
            case "image":
                var src = node.TryGetProperty("attrs", out var imgAttrs2) && imgAttrs2.TryGetProperty("src", out var srcProp2) ? srcProp2.GetString() ?? "" : "";
                var alt = imgAttrs2.TryGetProperty("alt", out var altProp2) ? altProp2.GetString() ?? "" : "";
                string imgSrc = src;
                if (resolver is not null && !string.IsNullOrWhiteSpace(src))
                {
                    var bytes = await resolver.GetImageBytesAsync(src, ct);
                    if (bytes is { Length: > 0 })
                    {
                        var mime = GetMimeFromUrl(src);
                        imgSrc = $"data:{mime};base64,{Convert.ToBase64String(bytes)}";
                    }
                }
                sb.Append($"<img src=\"{WebUtility.HtmlEncode(imgSrc)}\" alt=\"{WebUtility.HtmlEncode(alt)}\" />");
                break;
            case "bulletList":
                sb.Append("<ul>");
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendHtmlAsync(child, sb, resolver, ct);
                sb.Append("</ul>");
                break;
            case "orderedList":
                sb.Append("<ol>");
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendHtmlAsync(child, sb, resolver, ct);
                sb.Append("</ol>");
                break;
            case "listItem":
                sb.Append("<li>");
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendHtmlAsync(child, sb, resolver, ct);
                sb.Append("</li>");
                break;
            case "blockquote":
                sb.Append("<blockquote>");
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendHtmlAsync(child, sb, resolver, ct);
                sb.Append("</blockquote>");
                break;
            case "codeBlock":
                sb.Append("<pre><code>");
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendHtmlAsync(child, sb, resolver, ct);
                sb.Append("</code></pre>");
                break;
            case "text":
                var text = node.TryGetProperty("text", out var tx) ? tx.GetString() ?? "" : "";
                var marks = node.TryGetProperty("marks", out var m) ? m : (JsonElement?)null;
                var open = "";
                var close = "";
                if (marks.HasValue)
                    foreach (var mark in marks.Value.EnumerateArray())
                    {
                        var markType = mark.TryGetProperty("type", out var mt) ? mt.GetString() : null;
                        switch (markType)
                        {
                            case "bold": open += "<strong>"; close = "</strong>" + close; break;
                            case "italic": open += "<em>"; close = "</em>" + close; break;
                            case "underline": open += "<u>"; close = "</u>" + close; break;
                            case "link":
                                var href = mark.TryGetProperty("attrs", out var ma) && ma.TryGetProperty("href", out var h) ? h.GetString() ?? "" : "";
                                open += $"<a href=\"{WebUtility.HtmlEncode(href)}\">"; close = "</a>" + close;
                                break;
                            case "code": open += "<code>"; close = "</code>" + close; break;
                        }
                    }
                sb.Append(open).Append(WebUtility.HtmlEncode(text)).Append(close);
                break;
            case "hardBreak":
                sb.Append("<br/>");
                break;
            case "pageMargin":
                // Legacy page-break wrapper: output only its content (no wrapper element).
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendHtmlAsync(child, sb, resolver, ct);
                break;
            default:
                // Unknown block (e.g. custom nodes): recurse into content so text is not lost.
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendHtmlAsync(child, sb, resolver, ct);
                break;
        }
    }

    private static string GetMimeFromUrl(string url)
    {
        if (url.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            var semicolon = url.IndexOf(';');
            if (semicolon > 5)
                return url[5..semicolon];
        }
        return url.ToLowerInvariant() switch
        {
            var u when u.EndsWith(".png") => "image/png",
            var u when u.EndsWith(".gif") => "image/gif",
            var u when u.EndsWith(".webp") => "image/webp",
            var u when u.EndsWith(".svg") || u.EndsWith(".svgz") => "image/svg+xml",
            _ => "image/jpeg"
        };
    }

    private static void AppendText(JsonElement node, StringBuilder sb)
    {
        var type = node.TryGetProperty("type", out var t) ? t.GetString() : null;
        var content = node.TryGetProperty("content", out var c) ? c : (JsonElement?)null;

        switch (type)
        {
            case "doc":
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        AppendText(child, sb);
                break;
            case "paragraph":
            case "heading":
            case "listItem":
            case "blockquote":
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        AppendText(child, sb);
                sb.AppendLine();
                break;
            case "bulletList":
            case "orderedList":
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        AppendText(child, sb);
                break;
            case "text":
                sb.Append(node.TryGetProperty("text", out var tx) ? tx.GetString() ?? "" : "");
                break;
            case "hardBreak":
                sb.AppendLine();
                break;
            case "image":
                sb.Append("[Image]");
                break;
            case "codeBlock":
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        AppendText(child, sb);
                sb.AppendLine();
                break;
            default:
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        AppendText(child, sb);
                break;
        }
    }

    private static async Task AppendMarkdownAsync(JsonElement node, StringBuilder sb, int listLevel, IImageResolver? resolver, CancellationToken ct, string? listItemPrefix = null)
    {
        var type = node.TryGetProperty("type", out var t) ? t.GetString() : null;
        var content = node.TryGetProperty("content", out var c) ? c : (JsonElement?)null;

        switch (type)
        {
            case "doc":
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendMarkdownAsync(child, sb, 0, resolver, ct);
                break;
            case "paragraph":
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendMarkdownAsync(child, sb, 0, resolver, ct);
                sb.Append("\n\n");
                break;
            case "heading":
                var level = node.TryGetProperty("attrs", out var attrs) && attrs.TryGetProperty("level", out var l) ? l.GetInt32() : 1;
                sb.Append(new string('#', level)).Append(' ');
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendMarkdownAsync(child, sb, 0, resolver, ct);
                sb.Append("\n\n");
                break;
            case "image":
                var src = node.TryGetProperty("attrs", out var ia) && ia.TryGetProperty("src", out var sv) ? sv.GetString() ?? "" : "";
                var alt = ia.TryGetProperty("alt", out var av) ? av.GetString() ?? "image" : "image";
                string mdSrc = src;
                if (resolver is not null && !string.IsNullOrWhiteSpace(src))
                {
                    var bytes = await resolver.GetImageBytesAsync(src, ct);
                    if (bytes is { Length: > 0 })
                    {
                        var mime = GetMimeFromUrl(src);
                        mdSrc = $"data:{mime};base64,{Convert.ToBase64String(bytes)}";
                    }
                }
                sb.Append($"![{EscapeMarkdown(alt)}]({mdSrc})");
                break;
            case "text":
                var text = node.TryGetProperty("text", out var tx) ? tx.GetString() ?? "" : "";
                var marks = node.TryGetProperty("marks", out var m) ? m : (JsonElement?)null;
                if (marks.HasValue)
                    foreach (var mark in marks.Value.EnumerateArray())
                    {
                        var markType = mark.TryGetProperty("type", out var mt) ? mt.GetString() : null;
                        switch (markType)
                        {
                            case "bold": text = "**" + text + "**"; break;
                            case "italic": text = "_" + text + "_"; break;
                            case "code": text = "`" + text + "`"; break;
                            case "link":
                                var href = mark.TryGetProperty("attrs", out var ma) && ma.TryGetProperty("href", out var h) ? h.GetString() ?? "" : "";
                                text = $"[{text}]({href})";
                                break;
                        }
                    }
                sb.Append(EscapeMarkdown(text));
                break;
            case "bulletList":
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendMarkdownAsync(child, sb, listLevel + 1, resolver, ct, "- ");
                break;
            case "orderedList":
                if (content.HasValue)
                {
                    int i = 1;
                    foreach (var child in content.Value.EnumerateArray())
                    {
                        sb.Append(new string(' ', listLevel * 2)).Append(i++).Append(". ");
                        await AppendMarkdownAsync(child, sb, listLevel, resolver, ct, "");
                    }
                }
                break;
            case "listItem":
                if (listItemPrefix != "")
                    sb.Append(new string(' ', listLevel * 2)).Append(listItemPrefix ?? "- ");
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendMarkdownAsync(child, sb, listLevel, resolver, ct);
                sb.Append('\n');
                break;
            case "blockquote":
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                    {
                        sb.Append("> ");
                        await AppendMarkdownAsync(child, sb, listLevel, resolver, ct, null);
                    }
                break;
            case "codeBlock":
                sb.Append("\n```\n");
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendMarkdownAsync(child, sb, 0, resolver, ct, null);
                sb.Append("```\n\n");
                break;
            case "hardBreak":
                sb.Append("\n");
                break;
            default:
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendMarkdownAsync(child, sb, listLevel, resolver, ct, null);
                break;
        }
    }

    private static string EscapeMarkdown(string s)
    {
        if (string.IsNullOrEmpty(s)) return s;
        return s.Replace("\\", "\\\\").Replace("*", "\\*").Replace("_", "\\_").Replace("[", "\\[").Replace("]", "\\]");
    }
}
