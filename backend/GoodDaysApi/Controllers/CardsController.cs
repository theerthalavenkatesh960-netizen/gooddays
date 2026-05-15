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
        if (req.CreditLimit.HasValue) card.CreditLimit = req.CreditLimit;
        if (req.CurrentBalance.HasValue) card.CurrentBalance = req.CurrentBalance;
        if (req.RewardPointsBalance.HasValue) card.RewardPointsBalance = req.RewardPointsBalance;
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

        var query = _db.CardExpenses
            .Where(ce => ce.CardId == id)
            .Include(ce => ce.Expense)
            .OrderByDescending(ce => ce.Expense!.Date);

        if (startDate.HasValue)
            query = query.Where(ce => ce.Expense!.Date >= startDate);
        if (endDate.HasValue)
            query = query.Where(ce => ce.Expense!.Date <= endDate);

        var expenses = await query.Select(ce => ce.Expense).ToListAsync();
        return Ok(expenses);
    }

    // GET /api/cards/{id}/analytics
    [HttpGet("{id}/analytics")]
    public async Task<IActionResult> GetCardAnalytics(Guid id, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var card = await _db.CreditCards.FindAsync(id);
        if (card == null) return NotFound();

        var query = _db.CardExpenses
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
    decimal? CreditLimit,
    decimal? CurrentBalance,
    int? RewardPointsBalance,
    string? Status
);
