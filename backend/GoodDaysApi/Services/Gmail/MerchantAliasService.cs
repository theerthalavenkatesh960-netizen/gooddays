using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Services.Gmail;

public interface IMerchantAliasService
{
    Task<(string merchant, string? category)?> ResolveAsync(int userId, string? rawMerchant, CancellationToken cancellationToken = default);
    Task UpsertAsync(int userId, string rawMerchant, string correctedMerchant, string? correctedCategory, CancellationToken cancellationToken = default);
}

public class MerchantAliasService : IMerchantAliasService
{
    private readonly AppDbContext _db;

    public MerchantAliasService(AppDbContext db)
    {
        _db = db;
    }

    public static string Normalize(string value) => value.Trim().ToLowerInvariant();

    public async Task<(string merchant, string? category)?> ResolveAsync(int userId, string? rawMerchant, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawMerchant)) return null;

        var key = Normalize(rawMerchant);
        var alias = await _db.MerchantAliases.FirstOrDefaultAsync(
            x => x.UserId == userId && x.RawMerchantKey == key, cancellationToken);

        return alias == null ? null : (alias.CorrectedMerchant, alias.CorrectedCategory);
    }

    public async Task UpsertAsync(int userId, string rawMerchant, string correctedMerchant, string? correctedCategory, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawMerchant)) return;

        var key = Normalize(rawMerchant);
        var existing = await _db.MerchantAliases.FirstOrDefaultAsync(
            x => x.UserId == userId && x.RawMerchantKey == key, cancellationToken);

        if (existing == null)
        {
            _db.MerchantAliases.Add(new MerchantAlias
            {
                UserId = userId,
                RawMerchantKey = key,
                CorrectedMerchant = correctedMerchant,
                CorrectedCategory = correctedCategory
            });
        }
        else
        {
            existing.CorrectedMerchant = correctedMerchant;
            existing.CorrectedCategory = correctedCategory ?? existing.CorrectedCategory;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }
}
