using System.IO;
using System.Net;
using System.Text.Json;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using A = DocumentFormat.OpenXml.Drawing;
using DW = DocumentFormat.OpenXml.Drawing.Wordprocessing;
using PIC = DocumentFormat.OpenXml.Drawing.Pictures;
using ASideNote.Application.Interfaces;

namespace ASideNote.Infrastructure.Services;

/// <summary>Converts TipTap/ProseMirror JSON document to DOCX (Word) bytes.</summary>
public static class TipTapJsonToDocx
{
    public static async Task<byte[]> ToDocxAsync(string contentJson, IImageResolver imageResolver, CancellationToken cancellationToken)
    {
        using var stream = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(stream, WordprocessingDocumentType.Document))
        {
            var mainPart = doc.AddMainDocumentPart();
            mainPart.Document = new Document();
            var body = mainPart.Document.AppendChild(new Body());

            using (var jsonDoc = JsonDocument.Parse(contentJson))
            {
                var root = jsonDoc.RootElement;
                var type = root.TryGetProperty("type", out var t) ? t.GetString() : null;
                if (type == "doc" && root.TryGetProperty("content", out var content))
                {
                    foreach (var child in content.EnumerateArray())
                        await AppendToBodyAsync(child, body, mainPart, imageResolver, cancellationToken);
                }
            }

            mainPart.Document.Save();
        }

        return stream.ToArray();
    }

    private static Task AppendToBodyAsync(JsonElement node, OpenXmlElement body, MainDocumentPart mainPart, IImageResolver imageResolver, CancellationToken ct)
        => AppendToBodyAsyncInner(node, body, mainPart, imageResolver, ct);

    private static async Task AppendToBodyAsyncInner(JsonElement node, OpenXmlElement body, MainDocumentPart mainPart, IImageResolver imageResolver, CancellationToken ct)
    {
        var type = node.TryGetProperty("type", out var t) ? t.GetString() : null;
        var content = node.TryGetProperty("content", out var c) ? c : (JsonElement?)null;

        switch (type)
        {
            case "image":
                var src = node.TryGetProperty("attrs", out var imgAttrs) && imgAttrs.TryGetProperty("src", out var srcProp) ? srcProp.GetString() ?? "" : "";
                if (!string.IsNullOrWhiteSpace(src) && imageResolver is not null)
                {
                    var bytes = await imageResolver.GetImageBytesAsync(src, ct);
                    if (bytes is { Length: > 0 })
                    {
                        var imagePart = AddImagePartForUrl(mainPart, src);
                        await using var ms = new MemoryStream(bytes);
                        imagePart.FeedData(ms);
                        var relId = mainPart.GetIdOfPart(imagePart);
                        var drawing = CreateImageDrawing(relId);
                        body.AppendChild(new Paragraph(new Run(drawing)));
                    }
                }
                break;
            case "paragraph":
                var para = body.AppendChild(new Paragraph());
                if (content.HasValue)
                    AppendInlineContent(content.Value, para);
                break;
            case "heading":
                var level = node.TryGetProperty("attrs", out var hAttrs) && hAttrs.TryGetProperty("level", out var l) ? l.GetInt32() : 1;
                var headingPara = body.AppendChild(new Paragraph());
                if (content.HasValue)
                    AppendInlineContent(content.Value, headingPara, headingLevel: level);
                break;
            case "bulletList":
                if (content.HasValue)
                    foreach (var item in content.Value.EnumerateArray())
                        await AppendToBodyAsyncInner(item, body, mainPart, imageResolver, ct);
                break;
            case "orderedList":
                if (content.HasValue)
                    foreach (var item in content.Value.EnumerateArray())
                        await AppendToBodyAsyncInner(item, body, mainPart, imageResolver, ct);
                break;
            case "listItem":
                var liPara = body.AppendChild(new Paragraph());
                if (content.HasValue)
                {
                    foreach (var child in content.Value.EnumerateArray())
                    {
                        var childType = child.TryGetProperty("type", out var typeProp) ? typeProp.GetString() : null;
                        if (childType == "paragraph")
                        {
                            if (child.TryGetProperty("content", out var pc))
                                AppendInlineContent(pc, liPara);
                        }
                        else
                            await AppendToBodyAsyncInner(child, body, mainPart, imageResolver, ct);
                    }
                }
                break;
            case "blockquote":
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendToBodyAsyncInner(child, body, mainPart, imageResolver, ct);
                break;
            case "codeBlock":
                var codePara = body.AppendChild(new Paragraph());
                var codeRun = codePara.AppendChild(new Run());
                codeRun.AppendChild(new RunProperties(new RunFonts { Ascii = "Consolas", HighAnsi = "Consolas" }));
                if (content.HasValue)
                {
                    foreach (var child in content.Value.EnumerateArray())
                    {
                        if (child.TryGetProperty("text", out var codeText))
                            codeRun.AppendChild(new Text(WebUtility.HtmlDecode(codeText.GetString() ?? "")));
                    }
                }
                break;
            case "hardBreak":
                body.AppendChild(new Paragraph()).AppendChild(new Run()).AppendChild(new Break());
                break;
            default:
                if (content.HasValue)
                    foreach (var child in content.Value.EnumerateArray())
                        await AppendToBodyAsyncInner(child, body, mainPart, imageResolver, ct);
                break;
        }
    }

    private static ImagePart AddImagePartForUrl(MainDocumentPart mainPart, string url)
    {
        var partType = url.StartsWith("data:", StringComparison.OrdinalIgnoreCase)
            ? (url.IndexOf(';') > 5 ? url[5..url.IndexOf(';')].ToLowerInvariant() : "image/jpeg")
            : url.ToLowerInvariant().Contains(".png") ? "image/png"
            : url.ToLowerInvariant().Contains(".gif") ? "image/gif"
            : url.ToLowerInvariant().Contains(".webp") ? "image/webp"
            : "image/jpeg";
        return mainPart.AddImagePart(partType);
    }

    private static Drawing CreateImageDrawing(string relationshipId)
    {
        const long emuPerInch = 914400L;
        const long widthEmu = (long)(2.5 * emuPerInch);
        const long heightEmu = (long)(2.5 * emuPerInch);
        return new Drawing(
            new DW.Inline(
                new DW.Extent { Cx = widthEmu, Cy = heightEmu },
                new DW.EffectExtent { LeftEdge = 0L, TopEdge = 0L, RightEdge = 0L, BottomEdge = 0L },
                new DW.DocProperties { Id = (UInt32Value)1U, Name = "Image" },
                new DW.NonVisualGraphicFrameDrawingProperties(new A.GraphicFrameLocks { NoChangeAspect = true }),
                new A.Graphic(
                    new A.GraphicData(
                        new PIC.Picture(
                            new PIC.NonVisualPictureProperties(
                                new PIC.NonVisualDrawingProperties { Id = (UInt32Value)0U, Name = "Image" },
                                new PIC.NonVisualPictureDrawingProperties()),
                            new PIC.BlipFill(
                                new A.Blip { Embed = relationshipId, CompressionState = A.BlipCompressionValues.Print },
                                new A.Stretch(new A.FillRectangle())),
                            new PIC.ShapeProperties(
                                new A.Transform2D(
                                    new A.Offset { X = 0L, Y = 0L },
                                    new A.Extents { Cx = widthEmu, Cy = heightEmu }),
                                new A.PresetGeometry(new A.AdjustValueList()) { Preset = A.ShapeTypeValues.Rectangle })))
                    { Uri = "http://schemas.openxmlformats.org/drawingml/2006/picture" })
            )
            {
                DistanceFromTop = (UInt32Value)0U,
                DistanceFromBottom = (UInt32Value)0U,
                DistanceFromLeft = (UInt32Value)0U,
                DistanceFromRight = (UInt32Value)0U
            });
    }

    private static void AppendInlineContent(JsonElement content, OpenXmlElement parent, int? headingLevel = null)
    {
        foreach (var child in content.EnumerateArray())
        {
            var type = child.TryGetProperty("type", out var t) ? t.GetString() : null;
            if (type == "text")
            {
                var text = child.TryGetProperty("text", out var tx) ? tx.GetString() ?? "" : "";
                var run = parent.AppendChild(new Run());
                var runProps = run.AppendChild(new RunProperties());
                if (headingLevel.HasValue)
                {
                    runProps.AppendChild(new Bold());
                    runProps.AppendChild(new FontSize { Val = (headingLevel.Value switch { 1 => 48, 2 => 36, _ => 28 }).ToString() });
                }
                var marks = child.TryGetProperty("marks", out var m) ? m : (JsonElement?)null;
                if (marks.HasValue)
                {
                    foreach (var mark in marks.Value.EnumerateArray())
                    {
                        var markType = mark.TryGetProperty("type", out var mt) ? mt.GetString() : null;
                        switch (markType)
                        {
                            case "bold": runProps.AppendChild(new Bold()); break;
                            case "italic": runProps.AppendChild(new Italic()); break;
                            case "underline": runProps.AppendChild(new Underline { Val = UnderlineValues.Single }); break;
                            case "code":
                                runProps.AppendChild(new RunFonts { Ascii = "Consolas", HighAnsi = "Consolas" });
                                runProps.AppendChild(new VerticalTextAlignment { Val = VerticalPositionValues.Baseline });
                                break;
                            case "link":
                                var href = mark.TryGetProperty("attrs", out var ma) && ma.TryGetProperty("href", out var h) ? h.GetString() ?? "" : "";
                                if (!string.IsNullOrEmpty(href))
                                    runProps.AppendChild(new RunStyle { Val = "Hyperlink" });
                                break;
                        }
                    }
                }
                run.AppendChild(new Text(WebUtility.HtmlDecode(text)) { Space = SpaceProcessingModeValues.Preserve });
            }
            else if (type == "hardBreak")
            {
                parent.AppendChild(new Run()).AppendChild(new Break());
            }
        }
    }
}
