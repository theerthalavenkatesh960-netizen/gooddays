using System.Text.Json;
using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Services.Gmail;

public interface IOrderMatchingService
{
    Task TryLinkOrderAsync(int userId, Order order, CancellationToken cancellationToken = default);
}

public class OrderMatchingService : IOrderMatchingService
{
    private readonly AppDbContext _db;

    public OrderMatchingService(AppDbContext db)
    {
        _db = db;
    }

    public async Task TryLinkOrderAsync(int userId, Order order, CancellationToken cancellationToken = default)
    {
        if (order.TotalAmount == null) return;

        var windowStart = (order.OrderDate ?? order.CreatedAt).AddDays(-3);
        var windowEnd = (order.OrderDate ?? order.CreatedAt).AddDays(7);

        var candidates = await _db.Expenses
            .Where(x => x.UserId == userId
                        && x.SourceType == "gmail"
                        && x.Amount == order.TotalAmount
                        && x.Date != null
                        && x.Date >= windowStart
                        && x.Date <= windowEnd)
            .ToListAsync(cancellationToken);

        if (candidates.Count == 0) return;

        // Only auto-link when exactly one plausible transaction exists; otherwise leave for manual review.
        if (candidates.Count > 1)
        {
            foreach (var candidate in candidates)
            {
                await AddLinkAsync(order, candidate, 0.40m, "AMOUNT_DATE_AMBIGUOUS", "NEEDS_REVIEW", cancellationToken);
            }
            return;
        }

        var match = candidates[0];
        var daysApart = Math.Abs(((order.OrderDate ?? order.CreatedAt) - (match.Date ?? match.CreatedAt)).TotalDays);
        var score = daysApart <= 3 ? 0.85m : 0.60m;
        var status = score >= 0.80m ? "VALIDATED" : "NEEDS_REVIEW";

        await AddLinkAsync(order, match, score, "AMOUNT_DATE", status, cancellationToken);
    }

    private async Task AddLinkAsync(Order order, Expense expense, decimal score, string method, string status, CancellationToken cancellationToken)
    {
        var exists = await _db.OrderTransactionLinks.AnyAsync(
            x => x.OrderId == order.Id && x.ExpenseId == expense.Id, cancellationToken);
        if (exists) return;

        _db.OrderTransactionLinks.Add(new OrderTransactionLink
        {
            OrderId = order.Id,
            ExpenseId = expense.Id,
            MatchScore = score,
            MatchMethod = method,
            Status = status,
            EvidenceJson = JsonSerializer.Serialize(new { orderAmount = order.TotalAmount, expenseAmount = expense.Amount, orderDate = order.OrderDate, expenseDate = expense.Date })
        });
        await _db.SaveChangesAsync(cancellationToken);
    }
}
