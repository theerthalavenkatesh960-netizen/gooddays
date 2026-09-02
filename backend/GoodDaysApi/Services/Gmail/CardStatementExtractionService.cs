using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using GoodDaysApi.Models;

namespace GoodDaysApi.Services.Gmail;

public interface ICardStatementExtractionService
{
    bool TryExtract(string subject, string snippet, string body, out CardStatement statement);
}

public class CardStatementExtractionService : ICardStatementExtractionService
{
    private static readonly Regex StatementKeywordRegex = new(@"\b(statement|billing cycle|monthly statement)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex Last4Regex = new(@"(?:ending|ends|last\s*4|xxxx|\*{2,})\s*[-#:]?\s*(?:\*{0,4}|x{0,4})?(\d{4})\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex StatementBalanceRegex = new(@"statement\s+balance\s*[:\-]?\s*(?:INR|Rs\.?|₹)\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex MinDueRegex = new(@"minimum\s+(?:amount\s+)?due\s*[:\-]?\s*(?:INR|Rs\.?|₹)\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex TotalDueRegex = new(@"total\s+amount\s+due\s*[:\-]?\s*(?:INR|Rs\.?|₹)\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex AvailableLimitRegex = new(@"available\s+credit\s+limit\s*[:\-]?\s*(?:INR|Rs\.?|₹)\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex CreditLimitRegex = new(@"(?<!available\s)credit\s+limit\s*[:\-]?\s*(?:INR|Rs\.?|₹)\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex DueDateRegex = new(@"(?:payment\s+)?due\s+date\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex StatementDateRegex = new(@"statement\s+date\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly string[] IssuerKeywords = { "HDFC", "ICICI", "SBI", "AXIS", "KOTAK", "AMEX", "CITI" };

    public bool TryExtract(string subject, string snippet, string body, out CardStatement statement)
    {
        var text = string.Join(" ", new[] { subject, snippet, body }.Where(x => !string.IsNullOrWhiteSpace(x)));
        statement = new CardStatement();

        if (!StatementKeywordRegex.IsMatch(text)) return false;

        var hasAnyAmount = false;
        var confidence = 0.30m;

        var last4Match = Last4Regex.Match(text);
        if (last4Match.Success)
        {
            statement.CardLast4 = last4Match.Groups[1].Value;
            confidence += 0.15m;
        }

        var issuer = IssuerKeywords.FirstOrDefault(k => text.Contains(k, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(issuer))
        {
            statement.InstitutionName = issuer;
            confidence += 0.10m;
        }

        if (TryParseAmount(StatementBalanceRegex, text, out var statementBalance))
        {
            statement.StatementBalance = statementBalance;
            hasAnyAmount = true;
            confidence += 0.15m;
        }

        if (TryParseAmount(MinDueRegex, text, out var minDue))
        {
            statement.MinimumAmountDue = minDue;
            hasAnyAmount = true;
            confidence += 0.10m;
        }

        if (TryParseAmount(TotalDueRegex, text, out var totalDue))
        {
            statement.TotalAmountDue = totalDue;
            hasAnyAmount = true;
            confidence += 0.10m;
        }

        if (TryParseAmount(AvailableLimitRegex, text, out var availableLimit))
        {
            statement.AvailableCreditLimit = availableLimit;
            confidence += 0.05m;
        }

        if (TryParseAmount(CreditLimitRegex, text, out var creditLimit))
        {
            statement.CreditLimit = creditLimit;
            confidence += 0.05m;
        }

        if (!hasAnyAmount) return false;

        var statementDateMatch = StatementDateRegex.Match(text);
        if (statementDateMatch.Success && DateTime.TryParse(statementDateMatch.Groups[1].Value, out var statementDate))
        {
            statement.StatementDate = DateTime.SpecifyKind(statementDate, DateTimeKind.Utc);
        }

        var dueDateMatch = DueDateRegex.Match(text);
        if (dueDateMatch.Success && DateTime.TryParse(dueDateMatch.Groups[1].Value, out var dueDate))
        {
            statement.DueDate = DateTime.SpecifyKind(dueDate, DateTimeKind.Utc);
        }

        statement.ConfidenceScore = Math.Min(confidence, 0.98m);
        statement.EvidenceJson = JsonSerializer.Serialize(new
        {
            cardLast4 = statement.CardLast4,
            institution = statement.InstitutionName,
            statementBalance = statement.StatementBalance,
            minimumDue = statement.MinimumAmountDue,
            totalDue = statement.TotalAmountDue,
            availableLimit = statement.AvailableCreditLimit,
            creditLimit = statement.CreditLimit
        });

        return true;
    }

    private static bool TryParseAmount(Regex regex, string text, out decimal amount)
    {
        var match = regex.Match(text);
        if (!match.Success)
        {
            amount = 0;
            return false;
        }

        var raw = match.Groups[1].Value.Replace(",", string.Empty);
        return decimal.TryParse(raw, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out amount);
    }
}
