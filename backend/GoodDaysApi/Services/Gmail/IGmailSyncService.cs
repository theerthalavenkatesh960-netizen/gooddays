using GoodDaysApi.Services.Gmail.Models;

namespace GoodDaysApi.Services.Gmail;

public interface IGmailSyncService
{
    Task<GmailSyncResult> SyncUserAsync(int userId, bool forceInitialSync = false, CancellationToken cancellationToken = default);
    Task<int> SyncAllConnectedAsync(CancellationToken cancellationToken = default);
}
