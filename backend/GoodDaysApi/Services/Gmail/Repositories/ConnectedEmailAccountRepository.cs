using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Services.Gmail.Repositories;

public class ConnectedEmailAccountRepository : IConnectedEmailAccountRepository
{
    private readonly AppDbContext _db;

    public ConnectedEmailAccountRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<ConnectedEmailAccount?> GetByUserAsync(int userId, string provider, CancellationToken cancellationToken = default)
    {
        return _db.ConnectedEmailAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Provider == provider, cancellationToken);
    }

    public Task<List<ConnectedEmailAccount>> GetAllByProviderAsync(string provider, CancellationToken cancellationToken = default)
    {
        return _db.ConnectedEmailAccounts
            .AsNoTracking()
            .Where(x => x.Provider == provider)
            .ToListAsync(cancellationToken);
    }

    public async Task UpsertAsync(ConnectedEmailAccount account, CancellationToken cancellationToken = default)
    {
        var existing = await _db.ConnectedEmailAccounts
            .FirstOrDefaultAsync(x => x.UserId == account.UserId && x.Provider == account.Provider, cancellationToken);

        if (existing == null)
        {
            _db.ConnectedEmailAccounts.Add(account);
        }
        else
        {
            existing.Email = account.Email;
            existing.AccessTokenEncrypted = account.AccessTokenEncrypted;
            existing.RefreshTokenEncrypted = account.RefreshTokenEncrypted;
            existing.TokenExpiryUtc = account.TokenExpiryUtc;
            existing.LastSyncedUtc = account.LastSyncedUtc;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteByUserAsync(int userId, string provider, CancellationToken cancellationToken = default)
    {
        await _db.ConnectedEmailAccounts
            .Where(x => x.UserId == userId && x.Provider == provider)
            .ExecuteDeleteAsync(cancellationToken);
    }
}
