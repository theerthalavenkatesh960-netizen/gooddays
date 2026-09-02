using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Services.Gmail;

public interface ICardMatchingService
{
    Task<Guid?> TryLinkExpenseToCardAsync(int userId, Expense expense, CancellationToken cancellationToken = default);
    Task<Guid?> TryMatchCardAsync(int userId, string? instrumentLast4, string? institutionName, CancellationToken cancellationToken = default);
}

public class CardMatchingService : ICardMatchingService
{
    private readonly AppDbContext _db;

    public CardMatchingService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Guid?> TryLinkExpenseToCardAsync(int userId, Expense expense, CancellationToken cancellationToken = default)
    {
        if (expense.PaymentInstrumentType != "CREDIT_CARD" && expense.PaymentInstrumentType != "DEBIT_CARD")
        {
            return null;
        }

        var cardId = await TryMatchCardAsync(userId, expense.InstrumentLast4, expense.InstitutionName, cancellationToken);
        if (cardId == null) return null;

        var alreadyLinked = await _db.CardExpenses.AnyAsync(x => x.ExpenseId == expense.Id, cancellationToken);
        if (alreadyLinked) return cardId;

        _db.CardExpenses.Add(new CardExpense
        {
            CardId = cardId.Value,
            ExpenseId = expense.Id,
            AssignedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);
        return cardId;
    }

    public async Task<Guid?> TryMatchCardAsync(int userId, string? instrumentLast4, string? institutionName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(instrumentLast4)) return null;

        var candidates = await _db.CreditCards
            .Where(c => c.UserId == userId && c.Last4Digits == instrumentLast4)
            .ToListAsync(cancellationToken);

        if (candidates.Count == 0) return null;
        if (candidates.Count == 1) return candidates[0].Id;

        // Multiple cards share the same last4: disambiguate using issuer name.
        if (!string.IsNullOrWhiteSpace(institutionName))
        {
            var issuerMatch = candidates.FirstOrDefault(c =>
                institutionName.Contains(c.Issuer, StringComparison.OrdinalIgnoreCase));
            if (issuerMatch != null) return issuerMatch.Id;
        }

        return null;
    }
}
