using System.Globalization;
using System.Text.RegularExpressions;
using GoodDaysApi.Data;
using GoodDaysApi.Models;
using GoodDaysApi.Services.Gmail.Models;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Services.Gmail;

public interface IGmailLearningService
{
    Task<IReadOnlyList<GmailLearningSignal>> BuildSignalsAsync(int userId, string? sender, string text, ExtractedTransaction transaction, CancellationToken cancellationToken = default);
    Task ApplyAsync(int userId, string? sender, string text, ExtractedTransaction transaction, CancellationToken cancellationToken = default);
    Task RecordOutcomeAsync(int userId, string? sender, IReadOnlyList<GmailLearningSignal> signals, bool confirmed, CancellationToken cancellationToken = default);
}

public sealed record GmailLearningSignal(string RuleType, string PatternKey, string LearnedValue);

public class GmailLearningService : IGmailLearningService
{
    private readonly AppDbContext _db;
    public GmailLearningService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<GmailLearningSignal>> BuildSignalsAsync(int userId, string? sender, string text, ExtractedTransaction transaction, CancellationToken cancellationToken = default)
    {
        var senderKey = SenderReliabilityService.NormalizeSender(sender);
        if (string.IsNullOrWhiteSpace(senderKey)) return Array.Empty<GmailLearningSignal>();
        var signals = BuildSignals(text, transaction);
        return await Task.FromResult(signals);
    }

    public async Task ApplyAsync(int userId, string? sender, string text, ExtractedTransaction transaction, CancellationToken cancellationToken = default)
    {
        var senderKey = SenderReliabilityService.NormalizeSender(sender);
        if (string.IsNullOrWhiteSpace(senderKey)) return;
        var rules = await _db.GmailLearningRules.AsNoTracking()
            .Where(x => x.UserId == userId && x.SenderKey == senderKey && x.ConfirmedCount >= 3 && x.ConfirmedCount > x.RejectedCount * 2)
            .ToListAsync(cancellationToken);
        var signals = BuildSignals(text, transaction);
        foreach (var rule in rules.Where(rule => signals.Any(signal => signal.RuleType == rule.RuleType && signal.PatternKey == rule.PatternKey)))
        {
            switch (rule.RuleType)
            {
                case "category": transaction.SuggestedCategory = rule.LearnedValue; break;
                case "transaction_type": transaction.TransactionType = rule.LearnedValue; break;
                case "instrument": transaction.InstrumentType = rule.LearnedValue; break;
                case "payment_rail": transaction.PaymentRail = rule.LearnedValue; break;
            }
        }
    }

    public async Task RecordOutcomeAsync(int userId, string? sender, IReadOnlyList<GmailLearningSignal> signals, bool confirmed, CancellationToken cancellationToken = default)
    {
        var senderKey = SenderReliabilityService.NormalizeSender(sender);
        if (string.IsNullOrWhiteSpace(senderKey)) return;
        foreach (var signal in signals.Distinct())
        {
            var rule = await _db.GmailLearningRules.FirstOrDefaultAsync(x => x.UserId == userId && x.SenderKey == senderKey && x.RuleType == signal.RuleType && x.PatternKey == signal.PatternKey && x.LearnedValue == signal.LearnedValue, cancellationToken);
            if (rule == null)
            {
                rule = new GmailLearningRule { UserId = userId, SenderKey = senderKey, RuleType = signal.RuleType, PatternKey = signal.PatternKey, LearnedValue = signal.LearnedValue };
                _db.GmailLearningRules.Add(rule);
            }
            if (confirmed) rule.ConfirmedCount++; else rule.RejectedCount++;
            rule.LastSeenUtc = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static IReadOnlyList<GmailLearningSignal> BuildSignals(string text, ExtractedTransaction tx)
    {
        var normalized = text.ToLowerInvariant();
        var amountBand = tx.Amount <= 500 ? "0-500" : tx.Amount <= 5000 ? "501-5000" : tx.Amount <= 50000 ? "5001-50000" : "50000+";
        var dateShape = Regex.IsMatch(normalized, @"\b\d{1,2}-[a-z]{3}-\d{4}\b") ? "dd-mmm-yyyy" : Regex.IsMatch(normalized, @"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b") ? "numeric-date" : "long-date";
        var signals = new List<GmailLearningSignal>
        {
            new("amount_band", amountBand, amountBand),
            new("date_shape", dateShape, dateShape),
            new("category", amountBand, tx.SuggestedCategory),
            new("transaction_type", amountBand, tx.TransactionType),
            new("instrument", amountBand, tx.InstrumentType),
            new("payment_rail", amountBand, tx.PaymentRail ?? "UNKNOWN")
        };
        foreach (var token in Regex.Matches(normalized, @"\b[a-z][a-z0-9&.-]{3,}\b").Select(x => x.Value).Where(x => x is not ("transaction" or "payment" or "account" or "credit" or "debit" or "card" or "amount" or "reference" or "number" or "spent" or "your" or "this" or "from" or "with" or "date" or "via")).Take(8))
            signals.Add(new("merchant_token", token, tx.Merchant ?? tx.CounterpartyName ?? string.Empty));
        return signals.Where(x => !string.IsNullOrWhiteSpace(x.LearnedValue)).ToArray();
    }
}
