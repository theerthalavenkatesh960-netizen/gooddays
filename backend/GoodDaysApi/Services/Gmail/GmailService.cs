using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using GoodDaysApi.Models;
using GoodDaysApi.Services.Gmail.Models;
using GoodDaysApi.Services.Gmail.Repositories;
using Microsoft.Extensions.Options;

namespace GoodDaysApi.Services.Gmail;

public class GmailService : IGmailService
{
    private const string Provider = "gmail";
    private const string Scope = "https://www.googleapis.com/auth/gmail.readonly";

    private readonly HttpClient _httpClient;
    private readonly GmailOptions _options;
    private readonly IConnectedEmailAccountRepository _accounts;
    private readonly ISyncedEmailRepository _syncedEmails;
    private readonly ITokenEncryptionService _tokenEncryption;
    private readonly ILogger<GmailService> _logger;

    public GmailService(
        IHttpClientFactory httpClientFactory,
        IOptions<GmailOptions> options,
        IConnectedEmailAccountRepository accounts,
        ISyncedEmailRepository syncedEmails,
        ITokenEncryptionService tokenEncryption,
        ILogger<GmailService> logger)
    {
        _httpClient = httpClientFactory.CreateClient();
        _options = options.Value;
        _accounts = accounts;
        _syncedEmails = syncedEmails;
        _tokenEncryption = tokenEncryption;
        _logger = logger;
    }

    public Task<string> GenerateConnectUrlAsync(int userId, CancellationToken cancellationToken = default)
    {
        var state = BuildState(userId);
        var query = new Dictionary<string, string>
        {
            ["client_id"] = _options.ClientId,
            ["redirect_uri"] = _options.RedirectUri,
            ["response_type"] = "code",
            ["scope"] = Scope,
            ["access_type"] = "offline",
            ["prompt"] = "consent",
            ["state"] = state,
            ["include_granted_scopes"] = "true"
        };

        var queryString = string.Join("&", query.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));
        return Task.FromResult($"https://accounts.google.com/o/oauth2/v2/auth?{queryString}");
    }

    public async Task<GmailCallbackResult> HandleOAuthCallbackAsync(string code, string state, CancellationToken cancellationToken = default)
    {
        var userId = ValidateAndParseState(state);

        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"] = code,
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["redirect_uri"] = _options.RedirectUri,
            ["grant_type"] = "authorization_code"
        });

        var tokenResp = await _httpClient.PostAsync("https://oauth2.googleapis.com/token", content, cancellationToken);
        var tokenBody = await tokenResp.Content.ReadAsStringAsync(cancellationToken);
        if (!tokenResp.IsSuccessStatusCode)
        {
            _logger.LogWarning("Google OAuth callback token exchange failed. Response: {Response}", tokenBody);
            throw new InvalidOperationException("Failed to exchange OAuth code with Google.");
        }

        using var tokenDoc = JsonDocument.Parse(tokenBody);
        var accessToken = tokenDoc.RootElement.GetProperty("access_token").GetString() ?? string.Empty;
        var refreshToken = tokenDoc.RootElement.TryGetProperty("refresh_token", out var refreshEl)
            ? refreshEl.GetString()
            : null;
        var expiresIn = tokenDoc.RootElement.TryGetProperty("expires_in", out var expiresEl) ? expiresEl.GetInt32() : 3600;

        var email = await GetPrimaryEmailAsync(accessToken, cancellationToken) ?? "unknown@gmail.com";

        var existing = await _accounts.GetByUserAsync(userId, Provider, cancellationToken);
        var effectiveRefresh = refreshToken;
        if (string.IsNullOrWhiteSpace(effectiveRefresh) && existing != null)
        {
            effectiveRefresh = _tokenEncryption.Decrypt(existing.RefreshTokenEncrypted);
        }

        if (string.IsNullOrWhiteSpace(effectiveRefresh))
        {
            throw new InvalidOperationException("Google did not return a refresh token. Reconnect with consent prompt.");
        }

        var account = new ConnectedEmailAccount
        {
            UserId = userId,
            Email = email,
            Provider = Provider,
            AccessTokenEncrypted = _tokenEncryption.Encrypt(accessToken),
            RefreshTokenEncrypted = _tokenEncryption.Encrypt(effectiveRefresh),
            TokenExpiryUtc = DateTime.UtcNow.AddSeconds(expiresIn - 60),
            LastSyncedUtc = existing?.LastSyncedUtc
        };

        await _accounts.UpsertAsync(account, cancellationToken);

        return new GmailCallbackResult
        {
            Success = true,
            Email = email,
            Message = "Gmail connected successfully."
        };
    }

    public async Task<GmailConnectionStatus> GetStatusAsync(int userId, CancellationToken cancellationToken = default)
    {
        var account = await _accounts.GetByUserAsync(userId, Provider, cancellationToken);
        if (account == null)
        {
            return new GmailConnectionStatus { Connected = false, Provider = Provider };
        }

        return new GmailConnectionStatus
        {
            Connected = true,
            Email = account.Email,
            LastSyncedUtc = account.LastSyncedUtc,
            Provider = account.Provider
        };
    }

    public async Task DisconnectAsync(int userId, CancellationToken cancellationToken = default)
    {
        await _accounts.DeleteByUserAsync(userId, Provider, cancellationToken);
        await _syncedEmails.DeleteByUserAsync(userId, cancellationToken);
    }

    public async Task<string> GetValidAccessTokenAsync(ConnectedEmailAccount account, CancellationToken cancellationToken = default)
    {
        if (account.TokenExpiryUtc > DateTime.UtcNow.AddMinutes(2))
        {
            return _tokenEncryption.Decrypt(account.AccessTokenEncrypted);
        }

        var refreshToken = _tokenEncryption.Decrypt(account.RefreshTokenEncrypted);
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["refresh_token"] = refreshToken,
            ["grant_type"] = "refresh_token"
        });

        var resp = await _httpClient.PostAsync("https://oauth2.googleapis.com/token", content, cancellationToken);
        var body = await resp.Content.ReadAsStringAsync(cancellationToken);
        if (!resp.IsSuccessStatusCode)
        {
            _logger.LogWarning("Google token refresh failed for user {UserId}. Response: {Body}", account.UserId, body);
            throw new InvalidOperationException("Failed to refresh Gmail access token.");
        }

        using var json = JsonDocument.Parse(body);
        var accessToken = json.RootElement.GetProperty("access_token").GetString() ?? string.Empty;
        var expiresIn = json.RootElement.TryGetProperty("expires_in", out var expiresEl) ? expiresEl.GetInt32() : 3600;

        account.AccessTokenEncrypted = _tokenEncryption.Encrypt(accessToken);
        account.TokenExpiryUtc = DateTime.UtcNow.AddSeconds(expiresIn - 60);

        await _accounts.UpsertAsync(account, cancellationToken);
        return accessToken;
    }

    public async Task<string?> GetPrimaryEmailAsync(string accessToken, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://gmail.googleapis.com/gmail/v1/users/me/profile");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var resp = await _httpClient.SendAsync(request, cancellationToken);
        if (!resp.IsSuccessStatusCode)
        {
            return null;
        }

        var body = await resp.Content.ReadAsStringAsync(cancellationToken);
        using var json = JsonDocument.Parse(body);
        if (json.RootElement.TryGetProperty("emailAddress", out var emailEl))
        {
            return emailEl.GetString();
        }

        return null;
    }

    private string BuildState(int userId)
    {
        var payload = $"{userId}|{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}|{Guid.NewGuid():N}";
        var sig = Sign(payload);
        return $"{ToBase64Url(payload)}.{ToBase64Url(sig)}";
    }

    private int ValidateAndParseState(string state)
    {
        var parts = state.Split('.');
        if (parts.Length != 2)
        {
            throw new InvalidOperationException("Invalid OAuth state.");
        }

        var payload = FromBase64Url(parts[0]);
        var sentSig = FromBase64Url(parts[1]);
        var expectedSig = Sign(payload);

        if (!FixedTimeEquals(sentSig, expectedSig))
        {
            throw new InvalidOperationException("Invalid OAuth state signature.");
        }

        var payloadParts = payload.Split('|');
        if (payloadParts.Length != 3 || !int.TryParse(payloadParts[0], out var userId))
        {
            throw new InvalidOperationException("Invalid OAuth state payload.");
        }

        if (!long.TryParse(payloadParts[1], out var unixSeconds))
        {
            throw new InvalidOperationException("Invalid OAuth state timestamp.");
        }

        var age = DateTimeOffset.UtcNow - DateTimeOffset.FromUnixTimeSeconds(unixSeconds);
        if (age > TimeSpan.FromMinutes(20))
        {
            throw new InvalidOperationException("OAuth state expired.");
        }

        return userId;
    }

    private string Sign(string payload)
    {
        var secret = string.IsNullOrWhiteSpace(_options.OAuthStateSecret)
            ? _options.ClientSecret
            : _options.OAuthStateSecret;

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToBase64String(hash);
    }

    private static string ToBase64Url(string value)
    {
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(value)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static string FromBase64Url(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded = padded.PadRight((padded.Length + 3) / 4 * 4, '=');
        return Encoding.UTF8.GetString(Convert.FromBase64String(padded));
    }

    private static bool FixedTimeEquals(string left, string right)
    {
        var leftBytes = Encoding.UTF8.GetBytes(left);
        var rightBytes = Encoding.UTF8.GetBytes(right);
        return CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
    }
}
