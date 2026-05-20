using System.Globalization;
using System.Text.RegularExpressions;
using GoodDaysApi.Services.Gmail.Models;

namespace GoodDaysApi.Services.Gmail;

public class TransactionExtractionService : ITransactionExtractionService
{
    private static readonly Regex AmountRegex = new(
        @"(?:(?:INR|Rs\.?|₹)\s*)(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex DebitedRegex = new(@"\b(debited|spent|payment|paid)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex CreditedRegex = new(@"\b(credited|received|refund|deposited)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex MerchantRegex = new(@"\b(?:at|to|from)\s+([A-Za-z0-9\-\.\s]{2,40})", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex RefRegex = new(@"\b(?:ref(?:erence)?\s*(?:no|number)?|utr|txn(?:\s*id)?)\s*[:#-]?\s*([A-Za-z0-9\-]{6,30})", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex DateRegex = new(@"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly string[] ProviderKeywords =
    {
        "HDFC", "ICICI", "SBI", "AXIS", "KOTAK", "YES BANK", "PAYTM", "PHONEPE", "GPAY", "UPI", "AMEX"
    };

    private static readonly Dictionary<string, string> CategoryKeywordMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["swiggy"] = "Food",
        ["zomato"] = "Food",
        ["restaurant"] = "Food",
        ["food"] = "Food",
        ["uber"] = "Transport",
        ["ola"] = "Transport",
        ["metro"] = "Transport",
        ["fuel"] = "Fuel",
        ["petrol"] = "Fuel",
        ["diesel"] = "Fuel",
        ["airlines"] = "Travel",
        ["flight"] = "Travel",
        ["hotel"] = "Travel",
        ["amazon"] = "Shopping",
        ["flipkart"] = "Shopping",
        ["myntra"] = "Shopping",
        ["netflix"] = "Subscriptions",
        ["spotify"] = "Subscriptions",
        ["electricity"] = "Utilities",
        ["water bill"] = "Utilities",
        ["internet"] = "Internet",
        ["broadband"] = "Internet",
        ["pharmacy"] = "Medical",
        ["hospital"] = "Medical",
        ["gym"] = "Gym",
        ["tuition"] = "Education",
        ["book"] = "Books",
        ["coffee"] = "Coffee"
    };

    public bool TryExtract(string subject, string snippet, string body, out ExtractedTransaction transaction)
    {
        var text = string.Join(" ", new[] { subject, snippet, body }.Where(x => !string.IsNullOrWhiteSpace(x)));
        transaction = new ExtractedTransaction { RawSnippet = text.Length > 300 ? text[..300] : text };

        var amountMatch = AmountRegex.Match(text);
        if (!amountMatch.Success)
        {
            return false;
        }

        var amountRaw = amountMatch.Groups[1].Value.Replace(",", string.Empty);
        if (!decimal.TryParse(amountRaw, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var amount))
        {
            return false;
        }

        transaction.Amount = amount;
        transaction.Currency = "INR";
        transaction.ConfidenceScore = 0.45m;

        var hasDebit = DebitedRegex.IsMatch(text);
        var hasCredit = CreditedRegex.IsMatch(text);
        transaction.TransactionType = hasDebit ? "debit" : hasCredit ? "credit" : "debit";
        if (hasDebit || hasCredit) transaction.ConfidenceScore += 0.20m;

        var merchantMatch = MerchantRegex.Match(text);
        if (merchantMatch.Success)
        {
            transaction.Merchant = merchantMatch.Groups[1].Value.Trim();
            transaction.ConfidenceScore += 0.15m;
        }

        var refMatch = RefRegex.Match(text);
        if (refMatch.Success)
        {
            transaction.ReferenceNumber = refMatch.Groups[1].Value.Trim();
            transaction.ConfidenceScore += 0.10m;
        }

        var dateMatch = DateRegex.Match(text);
        if (dateMatch.Success && DateTime.TryParse(dateMatch.Groups[1].Value, out var parsedDate))
        {
            transaction.TransactionDateUtc = DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc);
            transaction.ConfidenceScore += 0.05m;
        }

        var provider = ProviderKeywords.FirstOrDefault(k => text.Contains(k, StringComparison.OrdinalIgnoreCase));
        transaction.ProviderOrBank = provider;
        if (!string.IsNullOrWhiteSpace(provider)) transaction.ConfidenceScore += 0.05m;

        transaction.SuggestedCategory = InferCategory(text, transaction.TransactionType);
        if (!string.Equals(transaction.SuggestedCategory, "Other", StringComparison.OrdinalIgnoreCase))
        {
            transaction.ConfidenceScore += 0.10m;
        }

        if (transaction.ConfidenceScore > 0.98m)
        {
            transaction.ConfidenceScore = 0.98m;
        }

        return true;
    }

    private static string InferCategory(string text, string transactionType)
    {
        if (string.Equals(transactionType, "credit", StringComparison.OrdinalIgnoreCase))
        {
            return "Other";
        }

        foreach (var pair in CategoryKeywordMap)
        {
            if (text.Contains(pair.Key, StringComparison.OrdinalIgnoreCase))
            {
                return pair.Value;
            }
        }

        return "Other";
    }
}
