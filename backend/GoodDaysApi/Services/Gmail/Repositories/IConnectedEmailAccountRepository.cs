using GoodDaysApi.Models;

namespace GoodDaysApi.Services.Gmail.Repositories;

public interface IConnectedEmailAccountRepository
{
    Task<ConnectedEmailAccount?> GetByUserAsync(int userId, string provider, CancellationToken cancellationToken = default);
    Task<List<ConnectedEmailAccount>> GetAllByProviderAsync(string provider, CancellationToken cancellationToken = default);
    Task UpsertAsync(ConnectedEmailAccount account, CancellationToken cancellationToken = default);
    Task DeleteByUserAsync(int userId, string provider, CancellationToken cancellationToken = default);
}
