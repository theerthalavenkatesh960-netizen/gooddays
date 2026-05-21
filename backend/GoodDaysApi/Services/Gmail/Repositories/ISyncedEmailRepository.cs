using GoodDaysApi.Models;

namespace GoodDaysApi.Services.Gmail.Repositories;

public interface ISyncedEmailRepository
{
    Task<bool> ExistsAsync(int userId, string gmailMessageId, CancellationToken cancellationToken = default);
    Task AddAsync(SyncedEmail item, CancellationToken cancellationToken = default);
    Task<DateTime?> GetLatestInternalDateAsync(int userId, CancellationToken cancellationToken = default);
    Task DeleteByUserAsync(int userId, CancellationToken cancellationToken = default);
}
