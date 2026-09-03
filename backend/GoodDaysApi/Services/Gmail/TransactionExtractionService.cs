using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using GoodDaysApi.Services.Gmail.Models;

namespace GoodDaysApi.Services.Gmail;

public class TransactionExtractionService : ITransactionExtractionService
{
    // Comma-grouped form must be tried before the plain form, otherwise \d{1,3} truncates "22666.00" to "226".
    private const string NumberPattern = @"(?:\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)";

    // Matches "Rs.1,249.00", "INR 1249", "₹1,249/-" and the suffix form "1,249.00 INR".
    private static readonly Regex AmountRegex = new(
        $@"(?:(?:INR|Rs\.?|₹)\s*({NumberPattern}))|(?:({NumberPattern})\s*(?:INR|Rs\.?|₹))",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex DebitRegex = new(@"\b(debited|debit|spent|charged|purchase|purchased|withdrawn|withdrawal|paid|payment\s+of|sent|added|loaded|top\s*up|used|swiped|transacted)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex CreditRegex = new(@"\b(credited|credit|received|refund(?:ed)?|deposited|salary|cashback)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex EventRegex = new(@"\b(transaction|authorization|declined|failed|reversed|pending)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex MerchantRegex = new(@"\b(?:at|to|towards)\s+(?:VPA\s+)?([A-Za-z0-9\-\.&' ]{2,40}?)(?=\s+(?:for|on|with|using|txn|ref|via|is|was|$))", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex MerchantLabelRegex = new(@"merchant\s*(?:name)?\s*[:\-]\s*([A-Za-z0-9\-\.&'* ]{2,40})", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex DocumentAmountRegex = new(
        $@"\b(?:transaction\s+amount|total\s+paid|amount\s+paid|paid\s+via[^\n]{{0,30}}|grand\s+total|order\s+total|amount)\b[^\d\n]{{0,20}}(?:INR|Rs\.?|₹)\s*{NumberPattern}",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex RefRegex = new(@"\b(?:ref(?:erence)?\s*(?:no|number)?|utr|rrn|txn(?:\s*id)?|transaction\s*(?:id|reference\s*(?:no|number)?))\b[\s.:#\-]*(?:is\s+)?([A-Za-z0-9\-]{6,30})", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex DateRegex = new(@"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}[- ][A-Za-z]{3,9}[- ]\d{2,4})\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex Last4Regex = new(@"(?:ending(?:\s+(?:with|in))?|ends\s+with|last\s*4(?:\s*digits)?|a\s*/\s*c|account|card|no\.?|number|[xX*]{2,})\s*[-#:]?\s*[xX*]{0,16}\s*(\d{4})\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex WalletRegex = new(@"\b(amazon\s*pay|paytm|phonepe|mobikwik|freecharge|wallet|balance)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    // UPI handles end in a scheme suffix (axl, ybl, okhdfcbank) rather than a domain, so no dot is required.
    private static readonly Regex VpaRegex = new(@"\b([A-Za-z0-9._\-]{2,}@[A-Za-z][A-Za-z0-9.\-]{1,})\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex CounterpartyParenRegex = new(@"\(\s*(?:VPA\s*[:\-]?\s*)?([A-Za-z][A-Za-z0-9 .&'\-]{3,60}?)\s*\)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex SenderLabelRegex = new(@"\b(?:sender|payer|received\s+from|from)\s*[:\-]\s*([A-Za-z][A-Za-z0-9 .&'\-]{2,60})", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex TowardsRegex = new(@"\b(?:towards|paid\s+to|payment\s+to|deposited\s+to|transferred\s+to)\s+(?:VPA\s+)?([A-Za-z0-9][A-Za-z0-9 .&'\-/]{2,60})", RegexOptions.IgnoreCase | RegexOptions.Compiled);

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

    public bool TryExtract(string subject, string snippet, string body, out ExtractedTransaction transaction, string? from = null)
    {
        transaction = new ExtractedTransaction();
        var fullText = EmailTextNormalizer.BuildSearchText(subject, snippet, body);
        if (string.IsNullOrWhiteSpace(fullText) || IsNonTransaction(fullText)) return false;

        var anchor = FindAnchorSentences(fullText).FirstOrDefault();
        if (anchor != null && TryBuildTransaction(anchor, fullText, out transaction, from)) return true;

        return TryBuildFromDocument(fullText, from, out transaction);
    }

    // The anchor is the sentence that actually states the money movement; surrounding text is only fallback evidence.
    private static List<string> FindAnchorSentences(string fullText)
    {
        return EmailTextNormalizer.SplitSentences(fullText)
            .Select(TrimBalanceTail)
            .Where(sentence =>
                !string.IsNullOrWhiteSpace(sentence)
                && AmountRegex.IsMatch(sentence)
                && (DebitRegex.IsMatch(sentence) || CreditRegex.IsMatch(sentence) || EventRegex.IsMatch(sentence)))
            .ToList();
    }

    private static bool TryBuildTransaction(string anchor, string fullText, out ExtractedTransaction transaction, string? from = null)
    {
        transaction = new ExtractedTransaction();

        if (!TryReadAmount(anchor, out var amount)) return false;

        transaction.Amount = amount;
        transaction.Currency = "INR";
        transaction.ConfidenceScore = 0.30m;

        var hasDebit = DebitRegex.IsMatch(anchor);
        var hasCredit = CreditRegex.IsMatch(anchor);
        if (!hasDebit && !hasCredit && !EventRegex.IsMatch(anchor)) return false;

        transaction.Direction = hasCredit && !hasDebit ? "CREDIT" : "DEBIT";
        transaction.TransactionType = InferTransactionType(anchor, transaction.Direction);
        transaction.TransactionStatus = InferStatus(anchor);
        transaction.ConfidenceScore += 0.25m;

        // "deposited to X from your account" moves money out even though the verb reads like a credit.
        if (Regex.IsMatch(anchor, @"\b(?:deposited|transferred|sent|paid|added)\s+to\b", RegexOptions.IgnoreCase)
            && Regex.IsMatch(anchor, @"\bfrom\s+(?:your\s+)?(?:account|a\s*/\s*c|bank)", RegexOptions.IgnoreCase))
        {
            transaction.Direction = "DEBIT";
            transaction.TransactionType = "TRANSFER";
            transaction.SuggestedCategory = "Transfer";
        }

        // Instrument wording often sits in the anchor, but banks sometimes state it once in a header line.
        var instrumentType = InferInstrumentType(anchor);
        if (instrumentType is "UNKNOWN" or "CARD_UNSPECIFIED")
        {
            var fallback = InferInstrumentType(fullText);
            if (fallback is not "UNKNOWN" and not "CARD_UNSPECIFIED") instrumentType = fallback;
        }

        if (instrumentType is "UNKNOWN" or "CARD_UNSPECIFIED") return false;
        transaction.InstrumentType = instrumentType;
        transaction.ConfidenceScore += 0.20m;

        var last4Match = Last4Regex.Match(anchor);
        if (!last4Match.Success) last4Match = Last4Regex.Match(fullText);
        if (last4Match.Success) transaction.InstrumentLast4 = last4Match.Groups[1].Value;

        ApplyInstrumentFlow(anchor, transaction, fullText);

        var merchantMatch = MerchantRegex.Match(anchor);
        if (merchantMatch.Success)
        {
            transaction.Merchant = CleanMerchant(merchantMatch.Groups[1].Value);
            transaction.ConfidenceScore += 0.10m;
        }
        else
        {
            var labelled = MerchantLabelRegex.Match(fullText);
            if (labelled.Success)
            {
                transaction.Merchant = CleanMerchant(labelled.Groups[1].Value);
                transaction.ConfidenceScore += 0.10m;
            }
        }

        var refMatch = RefRegex.Match(anchor);
        if (!refMatch.Success) refMatch = RefRegex.Match(fullText);
        if (refMatch.Success)
        {
            transaction.ReferenceNumber = refMatch.Groups[1].Value.Trim();
            transaction.ConfidenceScore += 0.05m;
        }

        var parsedDate = ReadDate(anchor) ?? ReadDate(fullText);
        if (parsedDate.HasValue)
        {
            transaction.TransactionDateUtc = parsedDate.Value;
            transaction.ConfidenceScore += 0.05m;
        }

        var provider = ProviderKeywords.FirstOrDefault(k => fullText.Contains(k, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(provider))
        {
            transaction.ProviderOrBank = provider;
            transaction.ConfidenceScore += 0.05m;
        }

        transaction.SuggestedCategory = InferCategory(anchor, transaction.Direction);
        if (!string.Equals(transaction.SuggestedCategory, "Other", StringComparison.OrdinalIgnoreCase))
        {
            transaction.ConfidenceScore += 0.05m;
        }

        ApplyIssuerKnowledge(transaction, fullText, from);
        ApplyCounterparty(transaction, anchor, fullText);

        transaction.EvidenceJson = JsonSerializer.Serialize(new
        {
            anchor,
            amount = transaction.Amount,
            merchant = transaction.Merchant,
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

    public IReadOnlyList<ExtractedTransaction> ExtractMany(string subject, string snippet, string body, string? from = null)
    {
        var fullText = EmailTextNormalizer.BuildSearchText(subject, snippet, body);
        if (string.IsNullOrWhiteSpace(fullText) || IsNonTransaction(fullText)) return Array.Empty<ExtractedTransaction>();

        var results = new List<ExtractedTransaction>();
        foreach (var anchor in FindAnchorSentences(fullText))
        {
            if (TryBuildTransaction(anchor, fullText, out var transaction, from)
                && results.All(x => x.Amount != transaction.Amount || x.Direction != transaction.Direction))
            {
                results.Add(transaction);
            }
        }

        if (results.Count == 0 && TryBuildFromDocument(fullText, from, out var fallback))
        {
            results.Add(fallback);
        }

        return results;
    }

    // Table-style receipts split the verb and the amount across rows, so fall back to a labelled document scan.
    private static bool TryBuildFromDocument(string fullText, string? from, out ExtractedTransaction transaction)
    {
        transaction = new ExtractedTransaction();

        var scrubbed = string.Join("\n", EmailTextNormalizer.SplitSentences(fullText)
            .Select(TrimBalanceTail)
            .Where(x => !string.IsNullOrWhiteSpace(x)));

        if (!DebitRegex.IsMatch(scrubbed) && !CreditRegex.IsMatch(scrubbed)) return false;

        var labelled = DocumentAmountRegex.Match(scrubbed);
        var amountText = labelled.Success ? labelled.Value : scrubbed;
        if (!TryReadAmount(amountText, out var amount)) return false;

        var instrument = InferInstrumentType(scrubbed);
        if (instrument is "UNKNOWN" or "CARD_UNSPECIFIED") instrument = InferInstrumentFromSender(from);
        if (instrument is "UNKNOWN" or "CARD_UNSPECIFIED") return false;

        transaction.Amount = amount;
        transaction.Currency = "INR";
        transaction.Direction = CreditRegex.IsMatch(scrubbed) && !DebitRegex.IsMatch(scrubbed) ? "CREDIT" : "DEBIT";
        transaction.TransactionType = InferTransactionType(scrubbed, transaction.Direction);
        transaction.TransactionStatus = InferStatus(scrubbed);
        transaction.InstrumentType = instrument;
        transaction.SourceInstrumentType = instrument;
        transaction.ConfidenceScore = 0.72m;

        var last4 = Last4Regex.Match(scrubbed);
        if (last4.Success) transaction.InstrumentLast4 = last4.Groups[1].Value;

        var merchant = MerchantLabelRegex.Match(scrubbed);
        if (!merchant.Success) merchant = MerchantRegex.Match(scrubbed);
        if (merchant.Success) transaction.Merchant = CleanMerchant(merchant.Groups[1].Value);

        var reference = RefRegex.Match(scrubbed);
        if (reference.Success) transaction.ReferenceNumber = reference.Groups[1].Value.Trim();

        transaction.TransactionDateUtc = ReadDate(scrubbed);
        transaction.ProviderOrBank = ExtractWalletName(scrubbed) ?? InferProviderFromSender(from);
        transaction.SuggestedCategory = InferCategory(scrubbed, transaction.Direction);
        ApplyIssuerKnowledge(transaction, scrubbed, from);
        ApplyCounterparty(transaction, scrubbed, scrubbed);

        transaction.EvidenceJson = JsonSerializer.Serialize(new
        {
            mode = "document-fallback",
            amount = transaction.Amount,
            merchant = transaction.Merchant,
            instrument = transaction.InstrumentType,
            direction = transaction.Direction,
            status = transaction.TransactionStatus
        });

        return true;
    }

    private static string InferInstrumentFromSender(string? from)
    {
        if (string.IsNullOrWhiteSpace(from)) return "UNKNOWN";
        return Regex.IsMatch(from, @"amazon|paytm|phonepe|mobikwik|freecharge", RegexOptions.IgnoreCase)
            ? "WALLET"
            : "UNKNOWN";
    }

    // Recognised issuers fill gaps the body text leaves open and confirm the format is a trusted one.
    private static void ApplyIssuerKnowledge(ExtractedTransaction transaction, string fullText, string? from)
    {
        if (IssuerProfiles.HasMandateReference(fullText) && transaction.Direction == "DEBIT")
        {
            transaction.TransactionType = "BILL_PAYMENT";
            if (string.Equals(transaction.SuggestedCategory, "Other", StringComparison.OrdinalIgnoreCase))
            {
                transaction.SuggestedCategory = "EMI";
            }
        }

        var profile = IssuerProfiles.Resolve(from);
        if (profile == null) return;

        transaction.ProviderOrBank ??= profile.Institution;

        if (transaction.InstrumentType is "UNKNOWN" or "CARD_UNSPECIFIED" && profile.DefaultInstrumentType != null)
        {
            transaction.InstrumentType = profile.DefaultInstrumentType;
            transaction.SourceInstrumentType ??= profile.DefaultInstrumentType;
        }

        if (profile.DefaultTransactionType != null && transaction.TransactionType is "PURCHASE" or "OTHER")
        {
            transaction.TransactionType = profile.DefaultTransactionType;
        }

        if (profile.DefaultCategory != null && string.Equals(transaction.SuggestedCategory, "Other", StringComparison.OrdinalIgnoreCase))
        {
            transaction.SuggestedCategory = profile.DefaultCategory;
        }

        transaction.ConfidenceScore = Math.Min(0.98m, transaction.ConfidenceScore + 0.05m);
    }

    private static string? InferProviderFromSender(string? from)
    {
        if (string.IsNullOrWhiteSpace(from)) return null;
        if (Regex.IsMatch(from, @"amazon", RegexOptions.IgnoreCase)) return "Amazon Pay";
        if (Regex.IsMatch(from, @"paytm", RegexOptions.IgnoreCase)) return "Paytm";
        if (Regex.IsMatch(from, @"phonepe", RegexOptions.IgnoreCase)) return "PhonePe";
        return null;
    }

    private static bool TryReadAmount(string text, out decimal amount)
    {
        amount = 0;
        var match = AmountRegex.Match(text);
        if (!match.Success) return false;

        var raw = match.Groups[1].Success ? match.Groups[1].Value : match.Groups[2].Value;
        raw = raw.Replace(",", string.Empty);
        return decimal.TryParse(raw, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out amount) && amount > 0;
    }

    private static string InferStatus(string anchor)
    {
        if (Regex.IsMatch(anchor, @"\b(declined|failed|unsuccessful)\b", RegexOptions.IgnoreCase)) return "FAILED";
        if (Regex.IsMatch(anchor, @"\b(reversed|reversal)\b", RegexOptions.IgnoreCase)) return "REVERSED";
        if (Regex.IsMatch(anchor, @"\b(pending|authoriz(?:ed|ation)|authoris(?:ed|ation)|on hold)\b", RegexOptions.IgnoreCase)) return "PENDING";
        return "COMPLETED";
    }

    // Who the money actually went to or came from, which is more meaningful than the raw merchant token.
    private static void ApplyCounterparty(ExtractedTransaction transaction, string anchor, string fullText)
    {
        var vpa = VpaRegex.Match(anchor);
        if (!vpa.Success) vpa = VpaRegex.Match(fullText);
        if (vpa.Success) transaction.CounterpartyIdentifier = vpa.Groups[1].Value.Trim();

        var named = CounterpartyParenRegex.Match(anchor);
        if (named.Success && !named.Groups[1].Value.Contains('@'))
        {
            transaction.CounterpartyName = CleanMerchant(named.Groups[1].Value);
        }

        if (transaction.CounterpartyName == null)
        {
            var sender = SenderLabelRegex.Match(fullText);
            if (sender.Success) transaction.CounterpartyName = CleanMerchant(sender.Groups[1].Value);
        }

        if (transaction.CounterpartyName == null)
        {
            var towards = TowardsRegex.Match(anchor);
            if (towards.Success)
            {
                var value = towards.Groups[1].Value.Split('/')[0];
                if (!value.Contains('@')) transaction.CounterpartyName = CleanMerchant(value);
            }
        }

        transaction.CounterpartyName ??= transaction.Merchant;
        transaction.Merchant ??= transaction.CounterpartyName;
    }

    /// Human-readable label such as "FLIPKART IN · Axis Credit Card ••3949".
    public static string BuildDisplayTitle(
        string? merchantOrCounterparty,
        string? institution,
        string? instrumentType,
        string? last4,
        string transactionType,
        string direction)
    {
        var who = string.IsNullOrWhiteSpace(merchantOrCounterparty)
            ? DescribeTransactionType(transactionType, direction)
            : merchantOrCounterparty.Trim();

        var instrument = DescribeInstrument(institution, instrumentType, last4);
        return string.IsNullOrWhiteSpace(instrument) ? who : $"{who} · {instrument}";
    }

    public static string DescribeInstrument(string? institution, string? instrumentType, string? last4)
    {
        var kind = instrumentType switch
        {
            "CREDIT_CARD" => "Credit Card",
            "DEBIT_CARD" => "Debit Card",
            "BANK_ACCOUNT" => "A/c",
            "UPI" => "UPI",
            "WALLET" => "Wallet",
            "CASH" => "Cash",
            _ => null
        };

        var parts = new[]
        {
            string.IsNullOrWhiteSpace(institution) ? null : institution.Trim(),
            kind,
            string.IsNullOrWhiteSpace(last4) ? null : $"••{last4}"
        }.Where(x => !string.IsNullOrWhiteSpace(x));

        return string.Join(" ", parts);
    }

    private static string DescribeTransactionType(string transactionType, string direction) => transactionType switch
    {
        "TRANSFER" => "Transfer",
        "REFUND" => "Refund",
        "SALARY" => "Salary",
        "WITHDRAWAL" => "Cash withdrawal",
        "BILL_PAYMENT" => "Auto-debit",
        "PAYMENT" => "Payment",
        "DEPOSIT" => "Deposit",
        _ => direction == "CREDIT" ? "Money received" : "Payment"
    };

    private static string CleanMerchant(string raw)
    {
        var cleaned = raw.Trim().Trim('*', '-', ':', '.', ' ');
        return cleaned.Length > 60 ? cleaned[..60].Trim() : cleaned;
    }

    // Indian alerts use dd-MM-yy, dd-MMM-yyyy and "16 Mar 2026"; invariant explicit formats avoid US month/day flips.
    private static readonly string[] DateFormats =
    {
        "dd-MM-yy", "d-M-yy", "dd-MM-yyyy", "d-M-yyyy",
        "dd/MM/yy", "d/M/yy", "dd/MM/yyyy", "d/M/yyyy",
        "dd-MMM-yyyy", "d-MMM-yyyy", "dd-MMM-yy", "d-MMM-yy",
        "dd MMM yyyy", "d MMM yyyy", "dd MMMM yyyy", "d MMMM yyyy"
    };

    private static DateTime? ReadDate(string text)
    {
        foreach (Match match in DateRegex.Matches(text))
        {
            var value = match.Groups[1].Value.Trim();
            if (DateTime.TryParseExact(value, DateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            {
                return DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
            }
        }

        return null;
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

    // Whole email is not a financial event at all.
    private static bool IsNonTransaction(string text)
    {
        var exclusions = new[] { "one time password", "verify your login", "loan offer", "pre-approved", "apply now", "cashback offer", "limited period offer" };
        if (exclusions.Any(x => text.Contains(x, StringComparison.OrdinalIgnoreCase))) return true;
        return Regex.IsMatch(text, @"\bOTP\b", RegexOptions.IgnoreCase);
    }

    // Only this sentence is a balance/limit/due figure; the rest of the email may still hold a real transaction.
    private static readonly string[] BalancePhrases =
    {
        "minimum amount due", "min amount due", "total amount due", "amount due", "payment due date", "due date",
        "credit limit", "available limit", "available credit", "available balance", "avl bal", "avl. bal",
        "available bal", "closing balance", "statement balance", "outstanding balance", "current balance",
        "updated amazon pay balance", "wallet balance", "balance is", "your balance", "gifts, cashbacks"
    };

    // A single line often holds the transaction and then the balance; keep the part before the balance phrase.
    private static string TrimBalanceTail(string sentence)
    {
        var cut = -1;
        foreach (var phrase in BalancePhrases)
        {
            var index = sentence.IndexOf(phrase, StringComparison.OrdinalIgnoreCase);
            if (index >= 0 && (cut < 0 || index < cut)) cut = index;
        }

        if (cut < 0) return sentence;
        return cut == 0 ? string.Empty : sentence[..cut].TrimEnd(' ', ',', ';', '-');
    }

    // Cards and accounts are the funding instrument; UPI/VPA is only the rail, so it must never outrank them.
    private static string InferInstrumentType(string text)
    {
        if (Regex.IsMatch(text, @"\b(?:credit\s+card|card\s+account)\b", RegexOptions.IgnoreCase)) return "CREDIT_CARD";
        if (Regex.IsMatch(text, @"\bdebit\s+card\b", RegexOptions.IgnoreCase)) return "DEBIT_CARD";
        if (Regex.IsMatch(text, @"\b(?:bank|savings|current)\s+account\b|\baccount\s+(?:no|number|ending|is|has|was|\d)|\ba\s*/\s*c\b|\bac\s*(?:no|number)\b|\bacct\b", RegexOptions.IgnoreCase)) return "BANK_ACCOUNT";
        if (Regex.IsMatch(text, @"\b(?:amazon\s*pay|paytm|phonepe|mobikwik|freecharge)\s+(?:wallet|balance)\b|\bwallet\b", RegexOptions.IgnoreCase)) return "WALLET";
        if (Regex.IsMatch(text, @"\bupi\b|\bvpa\b|\butr\b", RegexOptions.IgnoreCase)) return "UPI";
        if (Regex.IsMatch(text, @"\bcard\b", RegexOptions.IgnoreCase)) return "CARD_UNSPECIFIED";
        return "UNKNOWN";
    }

    private static void ApplyInstrumentFlow(string text, ExtractedTransaction transaction, string fullText)
    {
        var walletName = ExtractWalletName(text) ?? ExtractWalletName(fullText);
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
