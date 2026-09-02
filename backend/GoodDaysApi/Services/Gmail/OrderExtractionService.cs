using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using GoodDaysApi.Models;

namespace GoodDaysApi.Services.Gmail;

public interface IOrderExtractionService
{
    bool TryExtract(string subject, string snippet, string body, out Order order);
}

public class OrderExtractionService : IOrderExtractionService
{
    private static readonly Regex OrderKeywordRegex = new(@"\b(order confirm(?:ed|ation)?|your order|order number|order id|shipped|out for delivery|delivered)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex AmountRegex = new(@"(?:(?:INR|Rs\.?|₹)\s*)(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex OrderNumberRegex = new(@"order\s*(?:number|no|id)\s*[:#-]?\s*([A-Za-z0-9\-]{5,30})", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex DateRegex = new(@"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly string[] KnownMerchants = { "Amazon", "Flipkart", "Myntra", "Swiggy", "Zomato", "Ajio", "Nykaa", "BigBasket" };

    public bool TryExtract(string subject, string snippet, string body, out Order order)
    {
        var text = string.Join(" ", new[] { subject, snippet, body }.Where(x => !string.IsNullOrWhiteSpace(x)));
        order = new Order();

        if (!OrderKeywordRegex.IsMatch(text)) return false;

        var amountMatch = AmountRegex.Match(text);
        if (!amountMatch.Success) return false;

        var amountRaw = amountMatch.Groups[1].Value.Replace(",", string.Empty);
        if (!decimal.TryParse(amountRaw, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var amount)) return false;

        order.TotalAmount = amount;
        order.Currency = "INR";

        var merchant = KnownMerchants.FirstOrDefault(m => text.Contains(m, StringComparison.OrdinalIgnoreCase));
        if (merchant == null) return false; // do not guess an unknown merchant
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
            amount = order.TotalAmount,
            orderNumber = order.OrderNumber,
            orderDate = order.OrderDate
        });

        return true;
    }
}
