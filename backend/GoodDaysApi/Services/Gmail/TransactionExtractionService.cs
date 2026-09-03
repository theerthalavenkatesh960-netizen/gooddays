using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using GoodDaysApi.Services.Gmail.Models;

namespace GoodDaysApi.Services.Gmail;

public class TransactionExtractionService : ITransactionExtractionService
{
    private static readonly Regex AmountRegex = new(
        @"(?:(?:INR|Rs\.?|₹)\s*)(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex DebitRegex = new(@"\b(debited|spent|charged|purchase|purchased|withdrawn|paid|sent|added|loaded|top\s*up)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex CreditRegex = new(@"\b(credited|received|refund(?:ed)?|deposited|salary|cashback)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex EventRegex = new(@"\b(transaction|authorization|declined|failed|reversed|pending)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex MerchantRegex = new(@"\b(?:at|to)\s+([A-Za-z0-9\-\.\s]{2,40}?)(?=\s+(?:for|on|with|using|txn|ref|$))", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex RefRegex = new(@"\b(?:ref(?:erence)?\s*(?:no|number)?|utr|txn(?:\s*id)?)\s*[:#-]?\s*([A-Za-z0-9\-]{6,30})", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex DateRegex = new(@"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex Last4Regex = new(@"(?:ending|ends|last\s*4|xxxx|\*{2,})\s*[-#:]?\s*(?:\*{0,4}|x{0,4})?(\d{4})\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex WalletRegex = new(@"\b(amazon\s*pay|paytm|phonepe|mobikwik|freecharge|wallet|balance)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

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
        transaction = new ExtractedTransaction();

        if (string.IsNullOrWhiteSpace(text) || IsNonTransaction(text)) return false;

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
        transaction.ConfidenceScore = 0.30m;

        var hasDebit = DebitRegex.IsMatch(text);
        var hasCredit = CreditRegex.IsMatch(text);
        if (!hasDebit && !hasCredit && !EventRegex.IsMatch(text)) return false;
        transaction.Direction = hasCredit && !hasDebit ? "CREDIT" : "DEBIT";
        transaction.TransactionType = InferTransactionType(text, transaction.Direction);
        transaction.TransactionStatus = text.Contains("declined", StringComparison.OrdinalIgnoreCase) || text.Contains("failed", StringComparison.OrdinalIgnoreCase) ? "FAILED" :
            text.Contains("reversed", StringComparison.OrdinalIgnoreCase) ? "REVERSED" :
            text.Contains("pending", StringComparison.OrdinalIgnoreCase) || text.Contains("authorization", StringComparison.OrdinalIgnoreCase) ? "PENDING" : "COMPLETED";
        transaction.ConfidenceScore += 0.25m;

        transaction.InstrumentType = InferInstrumentType(text);
        if (transaction.InstrumentType == "UNKNOWN") return false;
        transaction.ConfidenceScore += 0.20m;

        var last4Match = Last4Regex.Match(text);
        if (last4Match.Success) transaction.InstrumentLast4 = last4Match.Groups[1].Value;

        ApplyInstrumentFlow(text, transaction);

        var merchantMatch = MerchantRegex.Match(text);
        if (merchantMatch.Success)
        {
            transaction.Merchant = merchantMatch.Groups[1].Value.Trim();
            transaction.ConfidenceScore += 0.10m;
        }

        var refMatch = RefRegex.Match(text);
        if (refMatch.Success)
        {
            transaction.ReferenceNumber = refMatch.Groups[1].Value.Trim();
            transaction.ConfidenceScore += 0.05m;
        }

        var dateMatch = DateRegex.Match(text);
        if (dateMatch.Success && DateTime.TryParse(dateMatch.Groups[1].Value, out var parsedDate))
        {
            transaction.TransactionDateUtc = DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc);
            transaction.ConfidenceScore += 0.05m;
        }

        var provider = ProviderKeywords.FirstOrDefault(k => text.Contains(k, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(provider))
        {
            transaction.ProviderOrBank = provider;
            transaction.ConfidenceScore += 0.05m;
        }

        transaction.SuggestedCategory = InferCategory(text, transaction.Direction);
        if (!string.Equals(transaction.SuggestedCategory, "Other", StringComparison.OrdinalIgnoreCase))
        {
            transaction.ConfidenceScore += 0.05m;
        }

        transaction.EvidenceJson = JsonSerializer.Serialize(new
        {
            amount = amountMatch.Value,
            merchant = merchantMatch.Success ? merchantMatch.Value : null,
            instrument = transaction.InstrumentType,
            last4 = transaction.InstrumentLast4,
            sourceInstrumentType = transaction.SourceInstrumentType,
            sourceInstrumentLast4 = transaction.SourceInstrumentLast4,
            destinationInstrumentType = transaction.DestinationInstrumentType,
            destinationInstrumentName = transaction.DestinationInstrumentName,
            reference = transaction.ReferenceNumber,
            direction = transaction.Direction,
            status = transaction.TransactionStatus
        });

        if (transaction.ConfidenceScore > 0.98m)
        {
            transaction.ConfidenceScore = 0.98m;
        }

        return true;
    }

    public IReadOnlyList<ExtractedTransaction> ExtractMany(string subject, string snippet, string body)
    {
        var text = string.Join(" ", new[] { subject, snippet, body }.Where(x => !string.IsNullOrWhiteSpace(x)));
        var matches = AmountRegex.Matches(text);
        if (matches.Count <= 1)
        {
            return TryExtract(subject, snippet, body, out var single)
                ? new[] { single }
                : Array.Empty<ExtractedTransaction>();
        }

        var results = new List<ExtractedTransaction>();
        var segments = Regex.Split(text, @"[.!?\r\n]+");
        foreach (var segment in segments.Where(x => AmountRegex.IsMatch(x)))
        {
            if (TryExtract(subject, string.Empty, segment, out var transaction)
                && results.All(x => x.EvidenceJson != transaction.EvidenceJson))
            {
                results.Add(transaction);
            }
        }

        return results;
    }

    private static string InferCategory(string text, string direction)
    {
        if (string.Equals(direction, "CREDIT", StringComparison.OrdinalIgnoreCase))
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

    private static bool IsNonTransaction(string text)
    {
        var exclusions = new[] { "minimum amount due", "total amount due", "payment due date", "credit limit", "available balance", "statement balance", "one time password", "otp", "verify your login", "loan offer", "apply now", "cashback offer" };
        return exclusions.Any(x => text.Contains(x, StringComparison.OrdinalIgnoreCase));
    }

    private static string InferInstrumentType(string text)
    {
        if (Regex.IsMatch(text, @"\b(?:amazon\s*pay|paytm|phonepe|mobikwik|freecharge)\s+(?:wallet|balance)\b|\bwallet\b", RegexOptions.IgnoreCase)) return "WALLET";
        if (Regex.IsMatch(text, @"\bupi\b|vpa|utr", RegexOptions.IgnoreCase)) return "UPI";
        if (Regex.IsMatch(text, @"\b(?:credit\s+card|card\s+account)\b", RegexOptions.IgnoreCase)) return "CREDIT_CARD";
        if (Regex.IsMatch(text, @"\bdebit\s+card\b", RegexOptions.IgnoreCase)) return "DEBIT_CARD";
        if (Regex.IsMatch(text, @"\b(?:bank|savings|current)\s+account\b|account\s+(?:number|ending|debited|credited)", RegexOptions.IgnoreCase)) return "BANK_ACCOUNT";
        return "UNKNOWN";
    }

    private static void ApplyInstrumentFlow(string text, ExtractedTransaction transaction)
    {
        var walletName = ExtractWalletName(text);
        var isWalletTopUp = walletName != null && Regex.IsMatch(text, @"\b(?:add(?:ed)?|load(?:ed)?|top\s*up|recharge(?:d)?)\b", RegexOptions.IgnoreCase);

        transaction.SourceInstrumentType = transaction.InstrumentType;
        transaction.SourceInstrumentLast4 = transaction.InstrumentLast4;

        if (isWalletTopUp)
        {
            var fundingInstrumentType = InferNonWalletInstrumentType(text);
            if (fundingInstrumentType != "UNKNOWN")
            {
                transaction.InstrumentType = fundingInstrumentType;
                transaction.SourceInstrumentType = fundingInstrumentType;
                transaction.SourceInstrumentLast4 = transaction.InstrumentLast4;
            }
            transaction.TransactionType = "TRANSFER";
            transaction.SuggestedCategory = "Transfer";
            transaction.DestinationInstrumentType = "WALLET";
            transaction.DestinationInstrumentName = walletName;
            if (transaction.InstrumentType == "WALLET")
            {
                transaction.Direction = "CREDIT";
            }
            return;
        }

        if (transaction.InstrumentType == "WALLET" && walletName != null)
        {
            transaction.ProviderOrBank = walletName;
            transaction.SourceInstrumentType = "WALLET";
        }
    }

    private static string? ExtractWalletName(string text)
    {
        var match = WalletRegex.Match(text);
        if (!match.Success) return null;
        var value = match.Groups[1].Value;
        if (value.Equals("balance", StringComparison.OrdinalIgnoreCase) || value.Equals("wallet", StringComparison.OrdinalIgnoreCase)) return "Wallet";
        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(value.ToLowerInvariant()).Replace("Pay", "Pay", StringComparison.Ordinal);
    }

    private static string InferNonWalletInstrumentType(string text)
    {
        if (Regex.IsMatch(text, @"\bupi\b|vpa|utr", RegexOptions.IgnoreCase)) return "UPI";
        if (Regex.IsMatch(text, @"\b(?:credit\s+card|card\s+account)\b", RegexOptions.IgnoreCase)) return "CREDIT_CARD";
        if (Regex.IsMatch(text, @"\bdebit\s+card\b", RegexOptions.IgnoreCase)) return "DEBIT_CARD";
        if (Regex.IsMatch(text, @"\b(?:bank|savings|current)\s+account\b|account\s+(?:number|ending|debited|credited)", RegexOptions.IgnoreCase)) return "BANK_ACCOUNT";
        return "UNKNOWN";
    }

    private static string InferTransactionType(string text, string direction)
    {
        if (Regex.IsMatch(text, @"\brefund(?:ed)?\b", RegexOptions.IgnoreCase)) return "REFUND";
        if (Regex.IsMatch(text, @"\breversed\b", RegexOptions.IgnoreCase)) return "REVERSAL";
        if (Regex.IsMatch(text, @"\b(?:card|credit card)\s+payment\b", RegexOptions.IgnoreCase)) return "PAYMENT";
        if (Regex.IsMatch(text, @"\b(?:salary|payroll)\b", RegexOptions.IgnoreCase)) return "SALARY";
        if (Regex.IsMatch(text, @"\b(?:withdrawn|cash withdrawal|atm)\b", RegexOptions.IgnoreCase)) return "WITHDRAWAL";
        if (Regex.IsMatch(text, @"\b(?:transfer|transferred)\b", RegexOptions.IgnoreCase)) return "TRANSFER";
        if (Regex.IsMatch(text, @"\b(?:fee|charge)\b", RegexOptions.IgnoreCase)) return "FEE";
        if (Regex.IsMatch(text, @"\b(?:bill|biller)\b", RegexOptions.IgnoreCase)) return "BILL_PAYMENT";
        return direction == "CREDIT" ? "DEPOSIT" : "PURCHASE";
    }
}
