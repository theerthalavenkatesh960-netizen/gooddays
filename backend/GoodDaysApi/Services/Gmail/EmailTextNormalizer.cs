using System.Net;
using System.Text.RegularExpressions;

namespace GoodDaysApi.Services.Gmail;

/// Converts raw Gmail payloads (often HTML) into plain sentences the extractors can reason about.
public static class EmailTextNormalizer
{
    private static readonly Regex ScriptStyleRegex = new(@"<(script|style)\b[^>]*>.*?</\1>", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);
    private static readonly Regex BlockBreakRegex = new(@"</(p|div|tr|table|li|h[1-6])\s*>|<br\s*/?>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex CellBreakRegex = new(@"</(td|th)\s*>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex TagRegex = new(@"<[^>]+>", RegexOptions.Compiled);
    private static readonly Regex WhitespaceRegex = new(@"[ \t\u00A0]+", RegexOptions.Compiled);
    private static readonly Regex BlankLineRegex = new(@"(\s*\r?\n\s*){2,}", RegexOptions.Compiled);

    // Bank alerts repeat the amount inside legal footers; keeping them causes duplicate/incorrect matches.
    private static readonly string[] FooterMarkers =
    {
        "this is a system generated",
        "system generated email",
        "please do not reply",
        "do not reply to this",
        "unsubscribe",
        "terms and conditions apply",
        "confidentiality notice",
        "disclaimer:",
        "if you have not performed this transaction",
        "report unauthorised",
        "report unauthorized",
        "never share your",
        "beware of fraud"
    };

    public static string Normalize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;

        var text = raw;
        if (LooksLikeHtml(text))
        {
            text = ScriptStyleRegex.Replace(text, " ");
            text = BlockBreakRegex.Replace(text, "\n");
            text = CellBreakRegex.Replace(text, " | ");
            text = TagRegex.Replace(text, " ");
        }

        text = WebUtility.HtmlDecode(text);
        text = text.Replace('\u20B9', '₹').Replace("\u00A0", " ");
        text = WhitespaceRegex.Replace(text, " ");
        text = BlankLineRegex.Replace(text, "\n");
        text = JoinLabelValueLines(text);

        return text.Trim();
    }

    // Structured bank alerts put "Transaction Amount:" and "INR 67547" on separate lines; rejoin them.
    private static string JoinLabelValueLines(string text)
    {
        var lines = text.Split('\n').Select(l => l.Trim()).Where(l => l.Length > 0).ToList();
        var merged = new List<string>();

        for (var i = 0; i < lines.Count; i++)
        {
            var line = lines[i];
            if (i + 1 < lines.Count && IsLabelLine(line))
            {
                merged.Add($"{line} {lines[i + 1]}");
                i++;
                continue;
            }

            merged.Add(line);
        }

        return string.Join("\n", merged);
    }

    private static bool IsLabelLine(string line)
    {
        if (line.Length > 60) return false;
        var trimmed = line.TrimEnd('*', ' ');
        return trimmed.EndsWith(':') && trimmed.Length > 1;
    }

    public static string StripFooter(string normalizedText)
    {
        if (string.IsNullOrWhiteSpace(normalizedText)) return string.Empty;

        var cutIndex = -1;
        foreach (var marker in FooterMarkers)
        {
            var index = normalizedText.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (index >= 0 && (cutIndex < 0 || index < cutIndex))
            {
                cutIndex = index;
            }
        }

        return cutIndex > 0 ? normalizedText[..cutIndex].Trim() : normalizedText;
    }

    public static string BuildSearchText(string? subject, string? snippet, string? body)
    {
        var parts = new[] { Normalize(subject), Normalize(snippet), StripFooter(Normalize(body)) }
            .Where(x => !string.IsNullOrWhiteSpace(x));
        return string.Join("\n", parts);
    }

    // "Rs." and similar abbreviations end in a period but must not split the sentence away from its amount.
    private static readonly Regex SentenceSplitRegex = new(
        @"(?<!\b(?:Rs|INR|No|Nos|Mr|Mrs|Ms|Dr|Jr|Sr|St|Ltd|Pvt|Inc|vs|etc|approx|Bal|Avl)\.)(?<=[.!?;])\s+|\r?\n+|\s\|\s",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static IReadOnlyList<string> SplitSentences(string normalizedText)
    {
        if (string.IsNullOrWhiteSpace(normalizedText)) return Array.Empty<string>();

        return SentenceSplitRegex.Split(normalizedText)
            .Select(x => x.Trim())
            .Where(x => x.Length > 0)
            .ToList();
    }

    private static bool LooksLikeHtml(string text)
    {
        return text.Contains('<') && Regex.IsMatch(text, @"<[a-zA-Z!/]");
    }
}
