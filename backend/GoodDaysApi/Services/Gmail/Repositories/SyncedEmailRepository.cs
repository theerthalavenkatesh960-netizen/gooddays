using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Services.Gmail.Repositories;

public class SyncedEmailRepository : ISyncedEmailRepository
{
    private readonly AppDbContext _db;

    public SyncedEmailRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<bool> ExistsAsync(int userId, string gmailMessageId, CancellationToken cancellationToken = default)
    {
        return _db.SyncedEmails.AnyAsync(x => x.UserId == userId && x.GmailMessageId == gmailMessageId && x.ProcessingStatus == "PROCESSED", cancellationToken);
    }

    public async Task AddAsync(SyncedEmail item, CancellationToken cancellationToken = default)
    {
        _db.SyncedEmails.Add(item);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public Task<DateTime?> GetLatestInternalDateAsync(int userId, CancellationToken cancellationToken = default)
    {
        return _db.SyncedEmails
            .Where(x => x.UserId == userId && x.ProcessingStatus == "PROCESSED")
            .OrderByDescending(x => x.InternalDate)
            .Select(x => (DateTime?)x.InternalDate)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task DeleteByUserAsync(int userId, CancellationToken cancellationToken = default)
    {
        await _db.SyncedEmails
            .Where(x => x.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);
    }
}
