using System.Text.RegularExpressions;

namespace GoodDaysApi.Services.Gmail;

/// Known sender formats, so mail from a recognised issuer parses deterministically instead of by guesswork.
public sealed record IssuerProfile(
    string SenderPattern,
    string Institution,
    string? DefaultInstrumentType = null,
    string? DefaultTransactionType = null,
    string? DefaultCategory = null);

public static class IssuerProfiles
{
    private static readonly IssuerProfile[] Profiles =
    {
        // HDFC auto-debit mandates (EMIs, SIPs) always arrive from the NACH mailer.
        new("nachautoemailer@hdfcbank", "HDFC", "BANK_ACCOUNT", "BILL_PAYMENT", "EMI"),
        new("alerts@hdfcbank", "HDFC", "BANK_ACCOUNT"),
        new("hdfcbank.net", "HDFC", "BANK_ACCOUNT"),
        new("onlinesbicard@sbicard.com", "SBI Card", "CREDIT_CARD"),
        new("sbicard.com", "SBI Card", "CREDIT_CARD"),
        new("alerts@axis.bank.in", "Axis"),
        new("axisbank.com", "Axis"),
        new("icicibank.com", "ICICI"),
        new("kotak.com", "Kotak"),
        new("payments-messages@amazon", "Amazon Pay", "WALLET"),
        new("amazonpay", "Amazon Pay", "WALLET"),
        new("paytm.com", "Paytm", "WALLET"),
        new("phonepe.com", "PhonePe", "WALLET")
    };

    public static IssuerProfile? Resolve(string? from)
    {
        if (string.IsNullOrWhiteSpace(from)) return null;
        return Profiles.FirstOrDefault(p => from.Contains(p.SenderPattern, StringComparison.OrdinalIgnoreCase));
    }

    // A UMRN is a registered mandate reference, so the debit is a recurring auto-payment rather than a purchase.
    public static bool HasMandateReference(string text) =>
        Regex.IsMatch(text, @"\bUMRN\b|\bNACH\b|\be-?mandate\b|\bauto\s*debit\b|\bECS\b", RegexOptions.IgnoreCase);
}
