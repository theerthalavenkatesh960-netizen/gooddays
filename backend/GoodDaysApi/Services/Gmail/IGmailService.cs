using GoodDaysApi.Models;
using GoodDaysApi.Services.Gmail.Models;

namespace GoodDaysApi.Services.Gmail;

public interface IGmailService
{
    Task<string> GenerateConnectUrlAsync(int userId, CancellationToken cancellationToken = default);
    Task<GmailCallbackResult> HandleOAuthCallbackAsync(string code, string state, CancellationToken cancellationToken = default);
    Task<GmailConnectionStatus> GetStatusAsync(int userId, CancellationToken cancellationToken = default);
    Task DisconnectAsync(int userId, CancellationToken cancellationToken = default);
    Task<string> GetValidAccessTokenAsync(ConnectedEmailAccount account, CancellationToken cancellationToken = default);
    Task<string?> GetPrimaryEmailAsync(string accessToken, CancellationToken cancellationToken = default);
}
