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
    private static readonly Regex OrderKeywordRegex = new(@"\b(order confirm(?:ed|ation)?|your order|order number|order id|booking\s+(?:confirm(?:ed|ation)?|id)|shipped|out for delivery|delivered)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex AmountRegex = new(@"(?:(?:INR|Rs\.?|₹)\s*)(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)|((?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?)\s*(?:INR|Rs\.?|₹)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    // Itemised bills repeat per-item prices, so a labelled total must win over the first amount seen.
    private static readonly Regex TotalAmountRegex = new(@"\b(?:total\s+paid|paid\s+via[^₹\n]*|grand\s+total|order\s+total|amount\s+paid|total)\b[^\d₹]{0,20}(?:(?:INR|Rs\.?|₹)\s*((?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?)|((?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?)\s*(?:INR|Rs\.?|₹))", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex OrderNumberRegex = new(@"(?:order\s*(?:(?:number|no|id)\s*)?|booking\s*id|confirmation\s*#?)\s*[:#-]?\s*([A-Za-z0-9\-]{5,30})", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex DateRegex = new(@"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{2,4})\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex TicketTitleRegex = new(@"(?<name>[A-Za-z][A-Za-z0-9 &'().:+\-]{3,100})\s+\((?:UA|U|A)\d{2}\+?\)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex TicketQuantityRegex = new(@"\b(\d{1,3})\s+tickets?\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex QuantityLabelRegex = new(@"^quantity\s*:\s*(\d{1,3})(?:\s+(?:INR|Rs\.?|₹)\s*(\d+(?:\.\d+)?))?$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex AmazonQuantityItemRegex = new(@"(?:^|\n)\s*\*?\s*(?<name>[A-Za-z][^\n]{5,200}?)\s*\n\s*Quantity\s*:\s*(?<qty>\d{1,3})\s*\n\s*(?<amt>\d+(?:\.\d+)?)\s*(?:INR|Rs\.?|₹)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

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
        var lines = EmailTextNormalizer.SplitSentences(text).ToList();

        var ticketTitle = TicketTitleRegex.Match(text);
        var ticketQuantity = TicketQuantityRegex.Match(text);
        var ticketAmount = Regex.Match(text, @"\b(?:ticket\s+amount|amount\s+paid)\b[^\d₹]{0,20}(?:INR|Rs\.?|₹)\s*(\d+(?:\.\d+)?)", RegexOptions.IgnoreCase);
        if (ticketTitle.Success && ticketQuantity.Success)
        {
            items.Add(new OrderItem
            {
                Name = ticketTitle.Groups["name"].Value.Trim(),
                Quantity = int.Parse(ticketQuantity.Groups[1].Value, CultureInfo.InvariantCulture),
                Amount = ticketAmount.Success ? decimal.Parse(ticketAmount.Groups[1].Value, CultureInfo.InvariantCulture) : null,
                LineNumber = ++lineNumber
            });
        }

        foreach (Match match in AmazonQuantityItemRegex.Matches(text))
        {
            items.Add(new OrderItem
            {
                Name = match.Groups["name"].Value.Trim(),
                Quantity = int.Parse(match.Groups["qty"].Value, CultureInfo.InvariantCulture),
                Amount = decimal.Parse(match.Groups["amt"].Value, CultureInfo.InvariantCulture),
                LineNumber = ++lineNumber
            });
        }

        for (var i = 0; i < lines.Count; i++)
        {
            var line = lines[i];
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

            var quantityLabel = QuantityLabelRegex.Match(candidate);
            if (quantityLabel.Success && i + 1 < lines.Count)
            {
                var nextLine = lines[++i].Trim().TrimStart('*').Trim();
                if (!NonItemLines.Any(x => nextLine.StartsWith(x, StringComparison.OrdinalIgnoreCase)))
                {
                    items.Add(new OrderItem
                    {
                        Name = nextLine,
                        Quantity = int.TryParse(quantityLabel.Groups[1].Value, out var labeledQuantity) ? labeledQuantity : 1,
                        LineNumber = ++lineNumber
                    });
                    continue;
                }
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

        var amountRaw = (amountMatch.Groups[1].Success ? amountMatch.Groups[1].Value : amountMatch.Groups[2].Value).Replace(",", string.Empty);
        if (!decimal.TryParse(amountRaw, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var amount)) return false;

        order.TotalAmount = Math.Round(amount, 2, MidpointRounding.AwayFromZero);
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
