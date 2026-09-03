using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using GoodDaysApi.Models;

namespace GoodDaysApi.Services.Gmail;

public interface IOrderExtractionService
{
    bool TryExtract(string subject, string snippet, string body, out Order order, string? from = null, IEnumerable<string>? trustedDomains = null);
    IReadOnlyList<OrderItem> ExtractItems(string subject, string snippet, string body);
}

public class OrderExtractionService : IOrderExtractionService
{
    private static readonly Regex OrderKeywordRegex = new(@"\b(order confirm(?:ed|ation)?|your order|order number|order id|shipped|out for delivery|delivered)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex AmountRegex = new(@"(?:(?:INR|Rs\.?|₹)\s*)(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    // Itemised bills repeat per-item prices, so a labelled total must win over the first amount seen.
    private static readonly Regex TotalAmountRegex = new(@"\b(?:total\s+paid|paid\s+via[^₹\n]*|grand\s+total|order\s+total|amount\s+paid|total)\b[^\d₹]{0,20}(?:INR|Rs\.?|₹)\s*(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex OrderNumberRegex = new(@"order\s*(?:number|no|id)\s*[:#-]?\s*([A-Za-z0-9\-]{5,30})", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex DateRegex = new(@"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex MerchantPhraseRegex = new(@"\b(?:from|by|seller|merchant)\s+([A-Za-z0-9][A-Za-z0-9\s&.'-]{2,50})\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly string[] KnownMerchants = { "Amazon", "Flipkart", "Myntra", "Swiggy", "Zomato", "Ajio", "Nykaa", "BigBasket", "BookMyShow", "Apollo" };

    // "Paya Shorba Full x1 ₹275" and "1 X Naan" are the two shapes food/retail receipts use.
    private static readonly Regex ItemWithAmountRegex = new(@"^(?<name>[A-Za-z][A-Za-z0-9 ()&'.,\-/]{2,80}?)\s*[xX×]\s*(?<qty>\d{1,3})\s*(?:INR|Rs\.?|₹)\s*(?<amt>\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*$", RegexOptions.Compiled);
    private static readonly Regex QuantityFirstRegex = new(@"^(?<qty>\d{1,3})\s*[xX×]\s*(?<name>[A-Za-z][A-Za-z0-9 ()&'.,\-/]{2,80})$", RegexOptions.Compiled);

    private static readonly string[] NonItemLines =
    {
        "total", "taxes", "delivery fee", "packaging", "platform fee", "discount", "paid via", "grand total",
        "order id", "bill details", "order journey", "amount", "paid to", "seller"
    };

    public IReadOnlyList<OrderItem> ExtractItems(string subject, string snippet, string body)
    {
        var text = EmailTextNormalizer.BuildSearchText(subject, snippet, body);
        var items = new List<OrderItem>();
        var lineNumber = 0;

        foreach (var line in EmailTextNormalizer.SplitSentences(text))
        {
            var candidate = line.Trim();
            if (candidate.Length < 3) continue;
            if (NonItemLines.Any(x => candidate.StartsWith(x, StringComparison.OrdinalIgnoreCase))) continue;

            var withAmount = ItemWithAmountRegex.Match(candidate);
            if (withAmount.Success)
            {
                items.Add(new OrderItem
                {
                    Name = withAmount.Groups["name"].Value.Trim(),
                    Quantity = int.TryParse(withAmount.Groups["qty"].Value, out var q) ? q : 1,
                    Amount = decimal.TryParse(withAmount.Groups["amt"].Value.Replace(",", string.Empty), NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var a) ? a : null,
                    LineNumber = ++lineNumber
                });
                continue;
            }

            var qtyFirst = QuantityFirstRegex.Match(candidate);
            if (qtyFirst.Success)
            {
                items.Add(new OrderItem
                {
                    Name = qtyFirst.Groups["name"].Value.Trim(),
                    Quantity = int.TryParse(qtyFirst.Groups["qty"].Value, out var q2) ? q2 : 1,
                    LineNumber = ++lineNumber
                });
            }
        }

        return items;
    }

    public bool TryExtract(string subject, string snippet, string body, out Order order, string? from = null, IEnumerable<string>? trustedDomains = null)
    {
        var text = EmailTextNormalizer.BuildSearchText(subject, snippet, body);
        order = new Order();

        if (!OrderKeywordRegex.IsMatch(text)) return false;

        var amountMatch = TotalAmountRegex.Match(text);
        if (!amountMatch.Success) amountMatch = AmountRegex.Match(text);
        if (!amountMatch.Success) return false;

        var amountRaw = amountMatch.Groups[1].Value.Replace(",", string.Empty);
        if (!decimal.TryParse(amountRaw, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var amount)) return false;

        order.TotalAmount = amount;
        order.Currency = "INR";

        var merchant = ExtractMerchant(text, from, trustedDomains);
        if (merchant == null) return false;
        order.Merchant = merchant;

        var orderNumberMatch = OrderNumberRegex.Match(text);
        if (orderNumberMatch.Success)
        {
            order.OrderNumber = orderNumberMatch.Groups[1].Value.Trim();
        }

        var dateMatch = DateRegex.Match(text);
        if (dateMatch.Success && DateTime.TryParse(dateMatch.Groups[1].Value, out var parsedDate))
        {
            order.OrderDate = DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc);
        }

        order.EvidenceJson = JsonSerializer.Serialize(new
        {
            merchant = order.Merchant,
            merchantSource = KnownMerchants.Contains(order.Merchant, StringComparer.OrdinalIgnoreCase) ? "EMAIL_TEXT" : "SENDER_DOMAIN",
            amount = order.TotalAmount,
            orderNumber = order.OrderNumber,
            orderDate = order.OrderDate
        });

        return true;
    }

    private static string? ExtractMerchant(string text, string? from, IEnumerable<string>? trustedDomains)
    {
        var known = KnownMerchants.FirstOrDefault(m => text.Contains(m, StringComparison.OrdinalIgnoreCase));
        if (known != null) return known;

        var phraseMatch = MerchantPhraseRegex.Match(text);
        if (phraseMatch.Success)
        {
            return phraseMatch.Groups[1].Value.Trim().TrimEnd('.', ',', ':');
        }

        if (string.IsNullOrWhiteSpace(from)) return null;
        var emailMatch = Regex.Match(from, @"@([A-Za-z0-9.-]+)", RegexOptions.IgnoreCase);
        if (!emailMatch.Success) return null;

        var domain = emailMatch.Groups[1].Value.ToLowerInvariant();
        if (trustedDomains?.Any(d => domain.EndsWith(d, StringComparison.OrdinalIgnoreCase)) != true) return null;
        var root = domain.Split('.', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault(part =>
            part.Length > 2 && part is not "mail" and not "email" and not "notify" and not "noreply" and not "no-reply");

        if (string.IsNullOrWhiteSpace(root)) return null;
        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(root.Replace('-', ' '));
    }
}
