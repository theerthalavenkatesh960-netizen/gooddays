using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CardsController : ControllerBase
{
    private readonly AppDbContext _db;

    public CardsController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/cards/user/{userId}
    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserCards(int userId)
    {
        var cards = await _db.CreditCards
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();
        return Ok(cards);
    }

    // GET /api/cards/user/{userId}/instruments
    [HttpGet("user/{userId}/instruments")]
    public async Task<IActionResult> GetUserInstruments(int userId)
    {
        var instrumentExpenses = await _db.Expenses
            .Where(e => e.UserId == userId
                        && e.SourceType == "gmail"
                        && (e.PaymentInstrumentType == "WALLET"
                            || e.PaymentInstrumentType == "BANK_ACCOUNT"
                            || e.PaymentInstrumentType == "UPI"
                            || e.SourceInstrumentType == "WALLET"
                            || e.DestinationInstrumentType == "WALLET"))
            .OrderByDescending(e => e.Date ?? e.CreatedAt)
            .ToListAsync();

        var instruments = instrumentExpenses
            .GroupBy(GetInstrumentKey)
            .Select(g => new
            {
                name = g.Key,
                type = ResolveInstrumentType(g.First()),
                topUps = g.Where(e => e.DestinationInstrumentType == "WALLET").Sum(e => e.Amount),
                spends = g.Where(e => e.SourceInstrumentType == "WALLET" && e.Direction == "DEBIT").Sum(e => e.Amount),
                refunds = g.Where(e => e.PaymentInstrumentType == "WALLET" && e.Direction == "CREDIT").Sum(e => e.Amount),
                estimatedBalance = g.Where(e => e.DestinationInstrumentType == "WALLET").Sum(e => e.Amount)
                    + g.Where(e => e.PaymentInstrumentType == "WALLET" && e.Direction == "CREDIT").Sum(e => e.Amount)
                    - g.Where(e => e.SourceInstrumentType == "WALLET" && e.Direction == "DEBIT").Sum(e => e.Amount),
                debits = g.Where(e => e.Direction == "DEBIT").Sum(e => e.Amount),
                credits = g.Where(e => e.Direction == "CREDIT").Sum(e => e.Amount),
                last4 = g.First().InstrumentLast4,
                transactionCount = g.Count(),
                latestActivity = g.Max(e => e.Date ?? e.CreatedAt),
                recentTransactions = g.Take(5).Select(e => new
                {
                    e.Id,
                    e.Description,
                    e.Amount,
                    e.Category,
                    e.Date,
                    e.Direction,
                    e.TransactionType,
                    e.SourceInstrumentType,
                    e.DestinationInstrumentType,
                    e.DestinationInstrumentName
                })
            })
            .OrderByDescending(w => w.latestActivity)
            .ToList();

        return Ok(instruments);
    }

    private static string GetInstrumentKey(Expense expense)
    {
        if (expense.DestinationInstrumentType == "WALLET") return expense.DestinationInstrumentName ?? "Wallet";
        if (expense.SourceInstrumentType == "WALLET") return expense.InstitutionName ?? "Wallet";
        if (expense.PaymentInstrumentType == "UPI") return expense.InstitutionName ?? "UPI";
        if (expense.PaymentInstrumentType == "BANK_ACCOUNT") return $"{expense.InstitutionName ?? "Bank Account"} {expense.InstrumentLast4 ?? string.Empty}".Trim();
        return expense.InstitutionName ?? expense.PaymentInstrumentType ?? "Instrument";
    }

    private static string ResolveInstrumentType(Expense expense)
    {
        if (expense.DestinationInstrumentType == "WALLET" || expense.SourceInstrumentType == "WALLET") return "WALLET";
        return expense.PaymentInstrumentType ?? "OTHER";
    }

    // GET /api/cards/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetCard(Guid id)
    {
        var card = await _db.CreditCards.FindAsync(id);
        if (card == null) return NotFound();
        return Ok(card);
    }

    // POST /api/cards
    [HttpPost]
    public async Task<IActionResult> CreateCard([FromBody] CreateCardRequest req)
    {
        var card = new CreditCard
        {
            UserId = req.UserId,
            Name = req.Name,
            Issuer = req.Issuer ?? "Other",
            Last4Digits = req.Last4Digits,
            CreditLimit = req.CreditLimit,
            BillingCycleStartDate = req.BillingCycleStartDate,
            BillingCycleEndDate = req.BillingCycleEndDate,
            RewardsRate = req.RewardsRate ?? 0,
            RewardPointsBalance = req.RewardPointsBalance ?? 0,
            CurrentBalance = req.CurrentBalance ?? 0,
            Status = req.Status ?? "active"
        };
        _db.CreditCards.Add(card);
        await _db.SaveChangesAsync();
        return Ok(card);
    }

    // PUT /api/cards/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCard(Guid id, [FromBody] UpdateCardRequest req)
    {
        var card = await _db.CreditCards.FindAsync(id);
        if (card == null) return NotFound();

        if (req.Name != null) card.Name = req.Name;
        if (req.Issuer != null) card.Issuer = req.Issuer;
        if (req.Last4Digits != null) card.Last4Digits = req.Last4Digits;
        if (req.CreditLimit.HasValue) card.CreditLimit = req.CreditLimit.Value;
        if (req.BillingCycleStartDate.HasValue) card.BillingCycleStartDate = req.BillingCycleStartDate.Value;
        if (req.BillingCycleEndDate.HasValue) card.BillingCycleEndDate = req.BillingCycleEndDate.Value;
        if (req.RewardsRate.HasValue) card.RewardsRate = req.RewardsRate.Value;
        if (req.CurrentBalance.HasValue) card.CurrentBalance = req.CurrentBalance.Value;
        if (req.RewardPointsBalance.HasValue) card.RewardPointsBalance = req.RewardPointsBalance.Value;
        if (req.Status != null) card.Status = req.Status;
        card.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(card);
    }

    // DELETE /api/cards/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCard(Guid id)
    {
        var card = await _db.CreditCards.FindAsync(id);
        if (card == null) return NotFound();

        _db.CreditCards.Remove(card);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // GET /api/cards/{id}/expenses
    [HttpGet("{id}/expenses")]
    public async Task<IActionResult> GetCardExpenses(Guid id, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var cardExists = await _db.CreditCards.AnyAsync(c => c.Id == id);
        if (!cardExists) return NotFound();

        IQueryable<CardExpense> query = _db.CardExpenses
            .Where(ce => ce.CardId == id)
            .Include(ce => ce.Expense);

        if (startDate.HasValue)
            query = query.Where(ce => ce.Expense!.Date >= startDate);
        if (endDate.HasValue)
            query = query.Where(ce => ce.Expense!.Date <= endDate);

        var expenses = await query
            .OrderByDescending(ce => ce.Expense!.Date)
            .Select(ce => ce.Expense)
            .ToListAsync();
        return Ok(expenses);
    }

    // GET /api/cards/{id}/statements
    [HttpGet("{id}/statements")]
    public async Task<IActionResult> GetCardStatements(Guid id)
    {
        var cardExists = await _db.CreditCards.AnyAsync(c => c.Id == id);
        if (!cardExists) return NotFound();

        var statements = await _db.CardStatements
            .Where(s => s.CardId == id)
            .OrderByDescending(s => s.StatementDate ?? s.CreatedAt)
            .ToListAsync();
        return Ok(statements);
    }

    // GET /api/cards/{id}/orders
    [HttpGet("{id}/orders")]
    public async Task<IActionResult> GetCardOrders(Guid id)
    {
        var cardExists = await _db.CreditCards.AnyAsync(c => c.Id == id);
        if (!cardExists) return NotFound();

        var expenseIds = await _db.CardExpenses
            .Where(ce => ce.CardId == id)
            .Select(ce => ce.ExpenseId)
            .ToListAsync();

        var orders = await _db.OrderTransactionLinks
            .Where(link => expenseIds.Contains(link.ExpenseId))
            .Include(link => link.Order)
            .Include(link => link.Expense)
            .OrderByDescending(link => link.Order!.OrderDate ?? link.Order!.CreatedAt)
            .Select(link => new
            {
                link.Id,
                link.Status,
                link.MatchScore,
                link.MatchMethod,
                Order = link.Order,
                ExpenseId = link.ExpenseId,
                ExpenseAmount = link.Expense!.Amount,
                ExpenseDate = link.Expense!.Date
            })
            .ToListAsync();
        return Ok(orders);
    }

    // GET /api/cards/{id}/analytics
    [HttpGet("{id}/analytics")]
    public async Task<IActionResult> GetCardAnalytics(Guid id, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var card = await _db.CreditCards.FindAsync(id);
        if (card == null) return NotFound();

        IQueryable<CardExpense> query = _db.CardExpenses
            .Where(ce => ce.CardId == id)
            .Include(ce => ce.Expense);

        if (startDate.HasValue)
            query = query.Where(ce => ce.Expense!.Date >= startDate);
        if (endDate.HasValue)
            query = query.Where(ce => ce.Expense!.Date <= endDate);

        var cardExpenses = await query.ToListAsync();

        // Group by category
        var byCategory = cardExpenses
            .Where(ce => ce.Expense != null)
            .GroupBy(ce => ce.Expense!.Category ?? "Uncategorized")
            .Select(g => new
            {
                category = g.Key,
                total = g.Sum(ce => ce.Expense!.Amount),
                count = g.Count()
            })
            .OrderByDescending(x => x.total)
            .ToList();

        var totalSpending = cardExpenses.Sum(ce => ce.Expense?.Amount ?? 0);
        var transactionCount = cardExpenses.Count;

        return Ok(new
        {
            card = new
            {
                card.Id,
                card.Name,
                card.Issuer,
                card.CreditLimit,
                card.CurrentBalance,
                card.RewardPointsBalance
            },
            totalSpending,
            transactionCount,
            byCategory,
            startDate,
            endDate
        });
    }
}

public record CreateCardRequest(
    int UserId,
    string Name,
    string? Issuer,
    string? Last4Digits,
    decimal? CreditLimit,
    int? BillingCycleStartDate,
    int? BillingCycleEndDate,
    decimal? RewardsRate,
    int? RewardPointsBalance,
    decimal? CurrentBalance,
    string? Status
);

public record UpdateCardRequest(
    string? Name,
    string? Issuer,
    string? Last4Digits,
    decimal? CreditLimit,
    int? BillingCycleStartDate,
    int? BillingCycleEndDate,
    decimal? RewardsRate,
    decimal? CurrentBalance,
    int? RewardPointsBalance,
    string? Status
);
