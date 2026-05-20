using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GoodDaysApi.Data;
using GoodDaysApi.Models;
using GoodDaysApi.Services.Gmail.Models;
using GoodDaysApi.Services.Gmail.Repositories;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Services.Gmail;

public class GmailSyncService : IGmailSyncService
{
    private const string Provider = "gmail";

    private readonly AppDbContext _db;
    private readonly HttpClient _httpClient;
    private readonly IGmailService _gmailService;
    private readonly ITransactionExtractionService _extraction;
    private readonly IConnectedEmailAccountRepository _accounts;
    private readonly ISyncedEmailRepository _syncedEmails;
    private readonly ILogger<GmailSyncService> _logger;

    public GmailSyncService(
        AppDbContext db,
        IHttpClientFactory httpClientFactory,
        IGmailService gmailService,
        ITransactionExtractionService extraction,
        IConnectedEmailAccountRepository accounts,
        ISyncedEmailRepository syncedEmails,
        ILogger<GmailSyncService> logger)
    {
        _db = db;
        _httpClient = httpClientFactory.CreateClient();
        _gmailService = gmailService;
        _extraction = extraction;
        _accounts = accounts;
        _syncedEmails = syncedEmails;
        _logger = logger;
    }

    public async Task<GmailSyncResult> SyncUserAsync(int userId, bool forceInitialSync = false, CancellationToken cancellationToken = default)
    {
        var result = new GmailSyncResult();

        var account = await _db.ConnectedEmailAccounts
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Provider == Provider, cancellationToken);

        if (account == null)
        {
            return result;
        }

        string accessToken;
        try
        {
            accessToken = await _gmailService.GetValidAccessTokenAsync(account, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to refresh Gmail token for user {UserId}. Disconnecting account.", userId);
            await _accounts.DeleteByUserAsync(userId, Provider, cancellationToken);
            await _syncedEmails.DeleteByUserAsync(userId, cancellationToken);
            result.ApiErrors++;
            return result;
        }

        var initialSince = DateTime.UtcNow.AddDays(-90);
        var incrementalSince = await _syncedEmails.GetLatestInternalDateAsync(userId, cancellationToken)
                              ?? account.LastSyncedUtc
                              ?? initialSince;

        var since = forceInitialSync ? initialSince : incrementalSince;
        var query = BuildFinanceQuery(since);

        var messages = await ListCandidateMessagesAsync(accessToken, query, cancellationToken);

        foreach (var messageRef in messages)
        {
            cancellationToken.ThrowIfCancellationRequested();
            result.Scanned++;

            if (await _syncedEmails.ExistsAsync(userId, messageRef.messageId, cancellationToken))
            {
                result.DuplicatesSkipped++;
                continue;
            }

            GmailMessageLite? message;
            try
            {
                message = await GetMessageAsync(accessToken, messageRef.messageId, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch Gmail message {MessageId}", messageRef.messageId);
                result.ApiErrors++;
                continue;
            }

            if (message == null)
            {
                continue;
            }

            if (!_extraction.TryExtract(message.Subject, message.Snippet, message.BodyText, out var tx))
            {
                result.ParseFailed++;
                await _syncedEmails.AddAsync(new SyncedEmail
                {
                    UserId = userId,
                    GmailMessageId = message.MessageId,
                    ThreadId = message.ThreadId,
                    InternalDate = message.InternalDateUtc,
                    ProcessedAt = DateTime.UtcNow
                }, cancellationToken);
                continue;
            }

            if (tx.ConfidenceScore < 0.50m)
            {
                result.ParseFailed++;
                await _syncedEmails.AddAsync(new SyncedEmail
                {
                    UserId = userId,
                    GmailMessageId = message.MessageId,
                    ThreadId = message.ThreadId,
                    InternalDate = message.InternalDateUtc,
                    ProcessedAt = DateTime.UtcNow
                }, cancellationToken);
                continue;
            }

            result.Parsed++;
            if (await IsDuplicateTransactionAsync(userId, message.MessageId, tx, message.InternalDateUtc, cancellationToken))
            {
                result.DuplicatesSkipped++;
                await _syncedEmails.AddAsync(new SyncedEmail
                {
                    UserId = userId,
                    GmailMessageId = message.MessageId,
                    ThreadId = message.ThreadId,
                    InternalDate = message.InternalDateUtc,
                    ProcessedAt = DateTime.UtcNow
                }, cancellationToken);
                continue;
            }

            var expense = new Expense
            {
                UserId = userId,
                Description = BuildDescription(tx),
                Amount = tx.Amount,
                Category = tx.SuggestedCategory,
                Date = tx.TransactionDateUtc ?? message.InternalDateUtc,
                CreatedAt = DateTime.UtcNow,
                GmailMessageId = message.MessageId,
                ExternalReference = tx.ReferenceNumber,
                SourceType = "gmail",
                IsReviewed = false,
                ReviewedAt = null
            };

            _db.Expenses.Add(expense);
            await _db.SaveChangesAsync(cancellationToken);
            result.Created++;

            await _syncedEmails.AddAsync(new SyncedEmail
            {
                UserId = userId,
                GmailMessageId = message.MessageId,
                ThreadId = message.ThreadId,
                InternalDate = message.InternalDateUtc,
                ProcessedAt = DateTime.UtcNow
            }, cancellationToken);
        }

        account.LastSyncedUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return result;
    }

    public async Task<int> SyncAllConnectedAsync(CancellationToken cancellationToken = default)
    {
        var accounts = await _accounts.GetAllByProviderAsync(Provider, cancellationToken);
        var totalCreated = 0;

        foreach (var account in accounts)
        {
            try
            {
                var res = await SyncUserAsync(account.UserId, false, cancellationToken);
                totalCreated += res.Created;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background Gmail sync failed for user {UserId}", account.UserId);
            }
        }

        return totalCreated;
    }

    private async Task<List<(string messageId, string? threadId)>> ListCandidateMessagesAsync(string accessToken, string query, CancellationToken cancellationToken)
    {
        var list = new List<(string messageId, string? threadId)>();
        string? pageToken = null;
        var pageCount = 0;

        do
        {
            pageCount++;
            var url = $"https://gmail.googleapis.com/gmail/v1/users/me/messages?q={Uri.EscapeDataString(query)}&maxResults=100";
            if (!string.IsNullOrWhiteSpace(pageToken))
            {
                url += $"&pageToken={Uri.EscapeDataString(pageToken)}";
            }

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            if (response.StatusCode == (HttpStatusCode)429)
            {
                await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
                continue;
            }

            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Gmail list messages failed: {response.StatusCode} {body}");
            }

            using var json = JsonDocument.Parse(body);
            if (json.RootElement.TryGetProperty("messages", out var messagesEl) && messagesEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in messagesEl.EnumerateArray())
                {
                    var messageId = item.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
                    var threadId = item.TryGetProperty("threadId", out var threadEl) ? threadEl.GetString() : null;
                    if (!string.IsNullOrWhiteSpace(messageId))
                    {
                        list.Add((messageId!, threadId));
                    }
                }
            }

            pageToken = json.RootElement.TryGetProperty("nextPageToken", out var nextEl)
                ? nextEl.GetString()
                : null;
        } while (!string.IsNullOrWhiteSpace(pageToken) && pageCount < 10);

        return list;
    }

    private async Task<GmailMessageLite?> GetMessageAsync(string accessToken, string messageId, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"https://gmail.googleapis.com/gmail/v1/users/me/messages/{Uri.EscapeDataString(messageId)}?format=full");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
                return null;
            }

            throw new InvalidOperationException($"Gmail get message failed: {response.StatusCode} {body}");
        }

        using var json = JsonDocument.Parse(body);
        var root = json.RootElement;

        var id = root.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
        var threadId = root.TryGetProperty("threadId", out var threadEl) ? threadEl.GetString() : null;
        var internalDate = root.TryGetProperty("internalDate", out var dateEl) ? dateEl.GetString() : null;
        var snippet = root.TryGetProperty("snippet", out var snippetEl) ? snippetEl.GetString() ?? string.Empty : string.Empty;

        var subject = string.Empty;
        var from = string.Empty;
        var bodyText = string.Empty;

        if (root.TryGetProperty("payload", out var payloadEl))
        {
            if (payloadEl.TryGetProperty("headers", out var headersEl) && headersEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var header in headersEl.EnumerateArray())
                {
                    var name = header.TryGetProperty("name", out var n) ? n.GetString() : null;
                    var value = header.TryGetProperty("value", out var v) ? v.GetString() : null;
                    if (name == null || value == null) continue;

                    if (name.Equals("Subject", StringComparison.OrdinalIgnoreCase)) subject = value;
                    if (name.Equals("From", StringComparison.OrdinalIgnoreCase)) from = value;
                }
            }

            bodyText = ExtractBodyText(payloadEl);
        }

        var internalUtc = DateTime.UtcNow;
        if (long.TryParse(internalDate, out var epochMs))
        {
            internalUtc = DateTimeOffset.FromUnixTimeMilliseconds(epochMs).UtcDateTime;
        }

        if (string.IsNullOrWhiteSpace(id))
        {
            return null;
        }

        return new GmailMessageLite
        {
            MessageId = id,
            ThreadId = threadId,
            InternalDateUtc = internalUtc,
            Subject = subject,
            Snippet = snippet,
            BodyText = bodyText,
            From = from
        };
    }

    private static string ExtractBodyText(JsonElement payload)
    {
        var chunks = new List<string>();
        WalkPayload(payload, chunks);
        return string.Join("\n", chunks.Where(c => !string.IsNullOrWhiteSpace(c)));
    }

    private static void WalkPayload(JsonElement part, List<string> chunks)
    {
        if (part.TryGetProperty("mimeType", out var mimeEl))
        {
            var mime = mimeEl.GetString();
            if (mime != null && (mime.Equals("text/plain", StringComparison.OrdinalIgnoreCase) || mime.Equals("text/html", StringComparison.OrdinalIgnoreCase)))
            {
                if (part.TryGetProperty("body", out var bodyEl) && bodyEl.TryGetProperty("data", out var dataEl))
                {
                    var decoded = DecodeBase64Url(dataEl.GetString());
                    if (!string.IsNullOrWhiteSpace(decoded))
                    {
                        chunks.Add(decoded);
                    }
                }
            }
        }

        if (part.TryGetProperty("parts", out var partsEl) && partsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var child in partsEl.EnumerateArray())
            {
                WalkPayload(child, chunks);
            }
        }
    }

    private static string DecodeBase64Url(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
        var normalized = raw.Replace('-', '+').Replace('_', '/');
        normalized = normalized.PadRight((normalized.Length + 3) / 4 * 4, '=');
        try
        {
            var bytes = Convert.FromBase64String(normalized);
            return Encoding.UTF8.GetString(bytes);
        }
        catch
        {
            return string.Empty;
        }
    }

    private async Task<bool> IsDuplicateTransactionAsync(int userId, string gmailMessageId, ExtractedTransaction tx, DateTime fallbackDateUtc, CancellationToken cancellationToken)
    {
        var hasMessageId = await _db.Expenses.AnyAsync(
            x => x.UserId == userId && x.GmailMessageId == gmailMessageId,
            cancellationToken);

        if (hasMessageId)
        {
            return true;
        }

        if (!string.IsNullOrWhiteSpace(tx.ReferenceNumber))
        {
            var hasReference = await _db.Expenses.AnyAsync(
                x => x.UserId == userId && x.ExternalReference == tx.ReferenceNumber,
                cancellationToken);

            if (hasReference)
            {
                return true;
            }
        }

        var txDate = tx.TransactionDateUtc ?? fallbackDateUtc;
        var minTime = txDate.AddMinutes(-5);
        var maxTime = txDate.AddMinutes(5);

        return await _db.Expenses.AnyAsync(
            x => x.UserId == userId
                 && x.Amount == tx.Amount
                 && x.Date.HasValue
                 && x.Date.Value >= minTime
                 && x.Date.Value <= maxTime,
            cancellationToken);
    }

    private static string BuildDescription(ExtractedTransaction tx)
    {
        var merchant = string.IsNullOrWhiteSpace(tx.Merchant) ? "Transaction" : tx.Merchant;
        var provider = string.IsNullOrWhiteSpace(tx.ProviderOrBank) ? string.Empty : $" [{tx.ProviderOrBank}]";
        return $"{merchant}{provider}";
    }

    private static string BuildFinanceQuery(DateTime since)
    {
        var datePart = since.ToString("yyyy/MM/dd");
        return $"category:updates (debited OR credited OR transaction OR spent OR received OR upi) after:{datePart}";
    }
}
