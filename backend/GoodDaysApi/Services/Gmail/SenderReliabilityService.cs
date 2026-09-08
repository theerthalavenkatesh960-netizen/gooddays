using System.Text.RegularExpressions;
using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Services.Gmail;

public interface ISenderReliabilityService
{
    Task<decimal> GetConfidenceAdjustmentAsync(int userId, string? from, CancellationToken cancellationToken = default);
    Task RecordOutcomeAsync(int userId, string? from, bool confirmed, CancellationToken cancellationToken = default);
}

public class SenderReliabilityService : ISenderReliabilityService
{
    private const int TrustThreshold = 3;

    private readonly AppDbContext _db;

    public SenderReliabilityService(AppDbContext db)
    {
        _db = db;
    }

    public static string NormalizeSender(string? from)
    {
        if (string.IsNullOrWhiteSpace(from)) return string.Empty;
        var match = Regex.Match(from, @"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+");
        return (match.Success ? match.Value : from).Trim().ToLowerInvariant();
    }

    public async Task<decimal> GetConfidenceAdjustmentAsync(int userId, string? from, CancellationToken cancellationToken = default)
    {
        var key = NormalizeSender(from);
        if (string.IsNullOrEmpty(key)) return 0m;

        var stat = await _db.GmailSenderStats.AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId && x.SenderKey == key, cancellationToken);
        if (stat == null) return 0m;

        if (stat.RejectedCount > stat.ConfirmedCount) return -0.15m;
        if (stat.ConfirmedCount >= TrustThreshold && stat.RejectedCount == 0) return 0.10m;
        return 0m;
    }

    public async Task RecordOutcomeAsync(int userId, string? from, bool confirmed, CancellationToken cancellationToken = default)
    {
        var key = NormalizeSender(from);
        if (string.IsNullOrEmpty(key)) return;

        var stat = await _db.GmailSenderStats.FirstOrDefaultAsync(x => x.UserId == userId && x.SenderKey == key, cancellationToken);
        if (stat == null)
        {
            stat = new GmailSenderStat { UserId = userId, SenderKey = key };
            _db.GmailSenderStats.Add(stat);
        }

        if (confirmed) stat.ConfirmedCount++;
        else stat.RejectedCount++;
        stat.LastSeenUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
    }
}
