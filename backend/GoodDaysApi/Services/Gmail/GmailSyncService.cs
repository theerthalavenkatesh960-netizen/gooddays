using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GoodDaysApi.Data;
using GoodDaysApi.Models;
using GoodDaysApi.Services.Gmail.Models;
using GoodDaysApi.Services.Gmail.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GoodDaysApi.Services.Gmail;

public class GmailSyncService : IGmailSyncService
{
    private const string Provider = "gmail";

    private readonly AppDbContext _db;
    private readonly HttpClient _httpClient;
    private readonly IGmailService _gmailService;
    private readonly GmailOptions _options;
    private readonly ITransactionExtractionService _extraction;
    private readonly IConnectedEmailAccountRepository _accounts;
    private readonly ISyncedEmailRepository _syncedEmails;
    private readonly ICardMatchingService _cardMatching;
    private readonly ICardStatementExtractionService _statementExtraction;
    private readonly IOrderExtractionService _orderExtraction;
    private readonly IOrderMatchingService _orderMatching;
    private readonly IMerchantAliasService _merchantAlias;
    private readonly ISenderReliabilityService _senderReliability;
    private readonly ITokenEncryptionService _tokenEncryption;
    private readonly ILogger<GmailSyncService> _logger;

    public GmailSyncService(
        AppDbContext db,
        IHttpClientFactory httpClientFactory,
        IGmailService gmailService,
        IOptions<GmailOptions> options,
        ITransactionExtractionService extraction,
        IConnectedEmailAccountRepository accounts,
        ISyncedEmailRepository syncedEmails,
        ICardMatchingService cardMatching,
        ICardStatementExtractionService statementExtraction,
        IOrderExtractionService orderExtraction,
        IOrderMatchingService orderMatching,
        IMerchantAliasService merchantAlias,
        ISenderReliabilityService senderReliability,
        ITokenEncryptionService tokenEncryption,
        ILogger<GmailSyncService> logger)
    {
        _db = db;
        _httpClient = httpClientFactory.CreateClient();
        _gmailService = gmailService;
        _options = options.Value;
        _extraction = extraction;
        _accounts = accounts;
        _syncedEmails = syncedEmails;
        _cardMatching = cardMatching;
        _statementExtraction = statementExtraction;
        _orderExtraction = orderExtraction;
        _orderMatching = orderMatching;
        _merchantAlias = merchantAlias;
        _senderReliability = senderReliability;
        _tokenEncryption = tokenEncryption;
        _logger = logger;
    }

    public async Task<GmailSyncResult> SyncUserAsync(int userId, bool forceInitialSync = false, CancellationToken cancellationToken = default)
    {
        var result = new GmailSyncResult();
        var startedAt = Stopwatch.StartNew();

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

        var initialSince = DateTime.UtcNow.AddDays(-Math.Max(1, _options.InitialSyncDays));
        var latestSynced = await _syncedEmails.GetLatestInternalDateAsync(userId, cancellationToken)
                           ?? account.LastSyncedUtc;
        var incrementalSince = latestSynced.HasValue
            ? (latestSynced.Value.AddDays(-2) < initialSince ? initialSince : latestSynced.Value.AddDays(-2))
            : initialSince;

        var since = forceInitialSync ? initialSince : incrementalSince;
        var messages = new List<(string messageId, string? threadId)>();
        var syncSettings = await GetSyncSettingsAsync(userId, cancellationToken);
        foreach (var query in BuildGmailQueries(since, syncSettings))
        {
            if (string.IsNullOrWhiteSpace(query)) continue;
            messages.AddRange(await ListCandidateMessagesAsync(accessToken, query, cancellationToken));
        }

        // Gmail lists newest-first; a truncated backfill would then only ever cover the most recent days.
        messages = messages
            .GroupBy(x => x.messageId)
            .Select(g => g.First())
            .Reverse()
            .Take(Math.Max(1, _options.MaxMessagesPerSync))
            .ToList();

        var timeBudget = TimeSpan.FromSeconds(Math.Max(5, forceInitialSync
            ? _options.MaxFullSyncDurationSeconds
            : _options.MaxSyncDurationSeconds));

        foreach (var messageRef in messages)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (startedAt.Elapsed >= timeBudget)
            {
                _logger.LogInformation("Gmail sync stopped early for user {UserId} after {ElapsedSeconds}s. Scanned {Scanned} messages in this batch.", userId, startedAt.Elapsed.TotalSeconds, result.Scanned);
                break;
            }

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

            if (IsBlockedSender(message.From, syncSettings.BlockedSenderPatterns))
            {
                await RecordEmailAsync(userId, message, "IGNORED_BLOCKED_SENDER", "Sender matches blocked finance/order pattern.", cancellationToken);
                continue;
            }

            if (_statementExtraction.TryExtract(message.Subject, message.Snippet, message.BodyText, out var statement) && statement.ConfidenceScore >= 0.60m)
            {
                await RecordEmailAsync(userId, message, "IGNORED_STATEMENT", "Statement parsing is disabled for Gmail sync.", cancellationToken);
                continue;
            }

            if (_orderExtraction.TryExtract(message.Subject, message.Snippet, message.BodyText, out var order, message.From, syncSettings.TrustedOrderDomains))
            {
                order.UserId = userId;
                order.SourceMessageId = message.MessageId;
                var existingOrder = await _db.Orders.FirstOrDefaultAsync(
                    x => x.UserId == userId
                         && (x.SourceMessageId == message.MessageId
                             || (!string.IsNullOrWhiteSpace(order.OrderNumber)
                                 && x.OrderNumber == order.OrderNumber
                                 && x.Merchant == order.Merchant)), cancellationToken);
                if (existingOrder == null)
                {
                    _db.Orders.Add(order);
                    await _db.SaveChangesAsync(cancellationToken);

                    var lineItems = _orderExtraction.ExtractItems(message.Subject, message.Snippet, message.BodyText);
                    foreach (var item in lineItems)
                    {
                        item.OrderId = order.Id;
                        _db.OrderItems.Add(item);
                    }
                    if (lineItems.Count > 0) await _db.SaveChangesAsync(cancellationToken);
                }
                else
                {
                    existingOrder.TotalAmount ??= order.TotalAmount;
                    existingOrder.OrderDate ??= order.OrderDate;
                    existingOrder.EvidenceJson = MergeOrderEvidence(existingOrder.EvidenceJson, order.EvidenceJson, message.MessageId);
                    order = existingOrder;
                    await _db.SaveChangesAsync(cancellationToken);
                }
                await _orderMatching.TryLinkOrderAsync(userId, order, cancellationToken);
                await RecordEmailAsync(userId, message, "PROCESSED", null, cancellationToken);
                continue;
            }

            var transactions = _extraction.ExtractMany(message.Subject, message.Snippet, message.BodyText, message.From);
            if (transactions.Count == 0)
            {
                if (!_extraction.HasMonetaryAmount(message.Subject, message.Snippet, message.BodyText))
                {
                    await RecordEmailAsync(userId, message, "IGNORED_NO_AMOUNT", "No currency amount found in email.", cancellationToken);
                    continue;
                }

                result.ParseFailed++;
                await SaveCandidateAsync(userId, message, "NEEDS_REVIEW", "No high-confidence transaction evidence.", cancellationToken);
                await RecordEmailAsync(userId, message, "NEEDS_REVIEW", "No high-confidence transaction evidence.", cancellationToken);
                continue;
            }

            var needsReview = false;
            var senderAdjustment = await _senderReliability.GetConfidenceAdjustmentAsync(userId, message.From, cancellationToken);
            foreach (var tx in transactions)
            {
                var effectiveConfidence = tx.ConfidenceScore + senderAdjustment;
                if (effectiveConfidence < 0.70m || tx.TransactionStatus != "COMPLETED")
                {
                    result.ParseFailed++;
                    needsReview = true;
                    await SaveCandidateAsync(userId, message, tx.TransactionStatus == "COMPLETED" ? "NEEDS_REVIEW" : tx.TransactionStatus, tx.EvidenceJson, cancellationToken);
                    continue;
                }

                result.Parsed++;
                if (await IsDuplicateTransactionAsync(userId, message.MessageId, tx, message.InternalDateUtc, cancellationToken))
                {
                    result.DuplicatesSkipped++;
                    continue;
                }

                var rawMerchant = tx.Merchant;
                var resolvedAlias = await _merchantAlias.ResolveAsync(userId, rawMerchant, cancellationToken);
                if (resolvedAlias != null)
                {
                    tx.Merchant = resolvedAlias.Value.merchant;
                    if (!string.IsNullOrWhiteSpace(resolvedAlias.Value.category))
                    {
                        tx.SuggestedCategory = resolvedAlias.Value.category!;
                    }
                }

                var transactionDate = tx.TransactionDateUtc.HasValue
                    ? DateTime.SpecifyKind(tx.TransactionDateUtc.Value.Date + message.InternalDateUtc.TimeOfDay, DateTimeKind.Utc)
                    : message.InternalDateUtc;

                var expense = new Expense
                {
                    UserId = userId,
                    Description = BuildDescription(tx),
                    Amount = tx.Amount,
                    Category = tx.SuggestedCategory,
                    Date = transactionDate,
                    CreatedAt = DateTime.UtcNow,
                    GmailMessageId = message.MessageId,
                    ExternalReference = tx.ReferenceNumber,
                    SourceType = "gmail",
                    Direction = tx.Direction,
                    TransactionType = tx.TransactionType,
                    TransactionStatus = tx.TransactionStatus,
                    PaymentInstrumentType = tx.InstrumentType,
                    InstitutionName = tx.ProviderOrBank,
                    InstrumentLast4 = tx.InstrumentLast4,
                    SourceInstrumentType = tx.SourceInstrumentType,
                    SourceInstrumentLast4 = tx.SourceInstrumentLast4,
                    DestinationInstrumentType = tx.DestinationInstrumentType,
                    DestinationInstrumentName = tx.DestinationInstrumentName,
                    MerchantName = tx.Merchant,
                    CounterpartyName = tx.CounterpartyName,
                    CounterpartyIdentifier = tx.CounterpartyIdentifier,
                    Currency = tx.Currency,
                    ConfidenceScore = tx.ConfidenceScore,
                    ExtractionVersion = "v3.0",
                    EvidenceJson = tx.EvidenceJson,
                    RawMerchant = rawMerchant,
                    IsReviewed = false,
                    ReviewedAt = null
                };

                _db.Expenses.Add(expense);
                await _db.SaveChangesAsync(cancellationToken);
                result.Created++;
                await _cardMatching.TryLinkExpenseToCardAsync(userId, expense, cancellationToken);
            }

            await RecordEmailAsync(userId, message, needsReview ? "NEEDS_REVIEW" : "PROCESSED", null, cancellationToken);
        }

        account.LastSyncedUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return result;
    }

    private async Task SaveCandidateAsync(int userId, GmailMessageLite message, string status, string evidenceOrError, CancellationToken cancellationToken)
    {
        var candidate = await _db.TransactionCandidates.FirstOrDefaultAsync(
            x => x.UserId == userId && x.SourceMessageId == message.MessageId, cancellationToken);
        if (candidate == null)
        {
            _db.TransactionCandidates.Add(new TransactionCandidate
            {
                UserId = userId,
                SourceMessageId = message.MessageId,
                SourceThreadId = message.ThreadId,
                Status = status,
                EvidenceJson = evidenceOrError.StartsWith("{", StringComparison.Ordinal) ? evidenceOrError : "{}",
                Error = evidenceOrError.StartsWith("{", StringComparison.Ordinal) ? null : evidenceOrError
            });
        }
        else
        {
            candidate.Status = status;
            candidate.Error = evidenceOrError.StartsWith("{", StringComparison.Ordinal) ? null : evidenceOrError;
            if (evidenceOrError.StartsWith("{", StringComparison.Ordinal)) candidate.EvidenceJson = evidenceOrError;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task RecordEmailAsync(int userId, GmailMessageLite message, string status, string? error, CancellationToken cancellationToken)
    {
        var existing = await _db.SyncedEmails.FirstOrDefaultAsync(
            x => x.UserId == userId && x.GmailMessageId == message.MessageId, cancellationToken);
        if (existing == null)
        {
            _db.SyncedEmails.Add(new SyncedEmail
            {
                UserId = userId,
                GmailMessageId = message.MessageId,
                ThreadId = message.ThreadId,
                InternalDate = message.InternalDateUtc,
                Subject = _tokenEncryption.Encrypt(message.Subject ?? string.Empty),
                Snippet = _tokenEncryption.Encrypt(message.Snippet ?? string.Empty),
                BodyText = _tokenEncryption.Encrypt(message.BodyText ?? string.Empty),
                Sender = message.From,
                ProcessingStatus = status,
                ProcessingError = error,
                ExtractionVersion = "v2.0",
                IsContentEncrypted = true
            });
        }
        else
        {
            existing.ThreadId = message.ThreadId;
            existing.InternalDate = message.InternalDateUtc;
            existing.Subject = _tokenEncryption.Encrypt(message.Subject ?? string.Empty);
            existing.Snippet = _tokenEncryption.Encrypt(message.Snippet ?? string.Empty);
            existing.BodyText = _tokenEncryption.Encrypt(message.BodyText ?? string.Empty);
            existing.Sender = message.From;
            existing.ProcessingStatus = status;
            existing.ProcessingError = error;
            existing.ProcessedAt = DateTime.UtcNow;
            existing.ExtractionVersion = "v2.0";
            existing.IsContentEncrypted = true;
        }

        await _db.SaveChangesAsync(cancellationToken);
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
        var pageSize = Math.Clamp(_options.ListPageSize, 1, 500);
        var maxPages = Math.Max(1, _options.MaxPagesPerQuery);

        do
        {
            pageCount++;
            var url = $"https://gmail.googleapis.com/gmail/v1/users/me/messages?q={Uri.EscapeDataString(query)}&maxResults={pageSize}";
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
        } while (!string.IsNullOrWhiteSpace(pageToken) && pageCount < maxPages);

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
        var plainChunks = new List<string>();
        var htmlChunks = new List<string>();
        WalkPayload(payload, plainChunks, htmlChunks);

        // Plain-text parts carry the same content with far less markup noise, so prefer them when present.
        var chunks = plainChunks.Any(c => !string.IsNullOrWhiteSpace(c)) ? plainChunks : htmlChunks;
        return string.Join("\n", chunks.Where(c => !string.IsNullOrWhiteSpace(c)));
    }

    private static void WalkPayload(JsonElement part, List<string> plainChunks, List<string> htmlChunks)
    {
        if (part.TryGetProperty("mimeType", out var mimeEl))
        {
            var mime = mimeEl.GetString();
            var isPlain = mime != null && mime.Equals("text/plain", StringComparison.OrdinalIgnoreCase);
            var isHtml = mime != null && mime.Equals("text/html", StringComparison.OrdinalIgnoreCase);

            if ((isPlain || isHtml)
                && part.TryGetProperty("body", out var bodyEl)
                && bodyEl.TryGetProperty("data", out var dataEl))
            {
                var decoded = DecodeBase64Url(dataEl.GetString());
                if (!string.IsNullOrWhiteSpace(decoded))
                {
                    (isPlain ? plainChunks : htmlChunks).Add(decoded);
                }
            }
        }

        if (part.TryGetProperty("parts", out var partsEl) && partsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var child in partsEl.EnumerateArray())
            {
                WalkPayload(child, plainChunks, htmlChunks);
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
        return TransactionExtractionService.BuildDisplayTitle(
            tx.CounterpartyName ?? tx.Merchant,
            tx.ProviderOrBank,
            tx.InstrumentType,
            tx.InstrumentLast4,
            tx.TransactionType,
            tx.Direction);
    }

    private static string MergeOrderEvidence(string existingEvidenceJson, string newEvidenceJson, string sourceMessageId)
    {
        return JsonSerializer.Serialize(new
        {
            previous = JsonSerializer.Deserialize<JsonElement>(string.IsNullOrWhiteSpace(existingEvidenceJson) ? "{}" : existingEvidenceJson),
            latest = JsonSerializer.Deserialize<JsonElement>(string.IsNullOrWhiteSpace(newEvidenceJson) ? "{}" : newEvidenceJson),
            additionalSourceMessageId = sourceMessageId,
            mergedAt = DateTime.UtcNow
        });
    }

    private IEnumerable<string> BuildGmailQueries(DateTime since, GmailSyncSettings syncSettings)
    {
        yield return BuildFinanceQuery(since, syncSettings.FinanceSenderAllowlist);
        yield return BuildOrderQuery(since, syncSettings.TrustedOrderDomains);
        yield return BuildWalletQuery(since);
        yield return BuildInvestmentQuery(since);
    }

    private string BuildFinanceQuery(DateTime since, IEnumerable<string> financeSenderAllowlist)
    {
        var datePart = since.ToString("yyyy/MM/dd");
        var senderFilter = BuildSenderFilter(financeSenderAllowlist);
        var positiveTerms = string.Join(" OR ", new[]
        {
            "\"payment\"",
            "\"payment made\"",
            "\"payment received\"",
            "\"debited\"",
            "\"credited\"",
            "\"spent\"",
            "\"charged\"",
            "\"transaction alert\"",
            "\"UPI\"",
            "\"UTR\"",
            "\"transacted\"",
            "\"withdrawn\"",
            "\"deposited\"",
            "\"transferred\"",
            "\"sent\"",
            "\"received\""
        });

        // When specific bank/issuer senders are whitelisted, avoid footer-matching exclusions like -loan / -offers
        if (!string.IsNullOrWhiteSpace(senderFilter))
        {
            return $"{senderFilter}({positiveTerms}) after:{datePart}";
        }

        var exclusions = string.Join(" ", new[]
        {
            "-newsletter",
            "-otp",
            "-login",
            "-kyc"
        });
        return $"({positiveTerms}) {exclusions} after:{datePart}";
    }

    // Every non-finance lane is sender-scoped; an unrestricted "delivered"/"invoice" scan matches most of a mailbox.
    private string BuildOrderQuery(DateTime since, IEnumerable<string> trustedOrderDomains)
    {
        var datePart = since.ToString("yyyy/MM/dd");
        var senderFilter = BuildSenderFilter(trustedOrderDomains);
        if (string.IsNullOrWhiteSpace(senderFilter)) return string.Empty;

        var positiveTerms = string.Join(" OR ", new[]
        {
            "\"order confirmed\"",
            "\"order placed\"",
            "\"order number\"",
            "\"order id\"",
            "\"invoice\"",
            "\"total paid\"",
            "\"bill details\"",
            "\"delivered\""
        });

        return $"{senderFilter}({positiveTerms}) -newsletter -wishlist after:{datePart}";
    }

    private string BuildWalletQuery(DateTime since)
    {
        var datePart = since.ToString("yyyy/MM/dd");
        var senderFilter = BuildSenderFilter(_options.WalletSenderAllowlist);
        if (string.IsNullOrWhiteSpace(senderFilter)) return string.Empty;

        var positiveTerms = string.Join(" OR ", new[]
        {
            "\"Amazon Pay\"",
            "\"wallet balance\"",
            "\"added money\"",
            "\"money added\"",
            "\"wallet loaded\"",
            "\"paid using wallet\"",
            "\"toll payment\"",
            "\"payment to\""
        });

        return $"{senderFilter}({positiveTerms}) -newsletter after:{datePart}";
    }

    private string BuildInvestmentQuery(DateTime since)
    {
        var datePart = since.ToString("yyyy/MM/dd");
        var positiveTerms = "(\"fund added\" OR \"funds added\" OR \"add funds\" OR \"deposited\" OR \"SIP\" OR \"mutual fund\" OR \"equity\")";

        var senderFilter = BuildSenderFilter(_options.InvestmentSenderAllowlist);
        if (!string.IsNullOrWhiteSpace(senderFilter))
        {
            return $"{senderFilter}{positiveTerms} -newsletter after:{datePart}";
        }

        // Without known investment senders, require the platform name so this stays narrow.
        return $"(\"Zerodha\" OR \"Groww\" OR \"INDmoney\" OR \"IND Money\") {positiveTerms} -newsletter after:{datePart}";
    }

    private static string BuildSenderFilter(IEnumerable<string> senders)
    {
        var senderTerms = senders
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => $"from:{s.Trim()}")
            .ToArray();

        return senderTerms.Length == 0 ? string.Empty : $"({string.Join(" OR ", senderTerms)}) ";
    }

    private bool IsBlockedSender(string? from, IEnumerable<string> blockedSenderPatterns)
    {
        if (string.IsNullOrWhiteSpace(from)) return false;
        return blockedSenderPatterns.Any(pattern =>
            !string.IsNullOrWhiteSpace(pattern)
            && from.Contains(pattern, StringComparison.OrdinalIgnoreCase));
    }

    private async Task<GmailSyncSettings> GetSyncSettingsAsync(int userId, CancellationToken cancellationToken)
    {
        var prefs = await _db.GmailSyncPreferences.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        return new GmailSyncSettings(
            ParseLines(prefs?.FinanceSenderAllowlist).DefaultIfEmpty().Any(x => !string.IsNullOrWhiteSpace(x)) ? ParseLines(prefs?.FinanceSenderAllowlist) : _options.FinanceSenderAllowlist,
            ParseLines(prefs?.BlockedSenderPatterns).DefaultIfEmpty().Any(x => !string.IsNullOrWhiteSpace(x)) ? ParseLines(prefs?.BlockedSenderPatterns) : _options.BlockedSenderPatterns,
            ParseLines(prefs?.TrustedOrderDomains).DefaultIfEmpty().Any(x => !string.IsNullOrWhiteSpace(x)) ? ParseLines(prefs?.TrustedOrderDomains) : _options.TrustedOrderDomains);
    }

    private static string[] ParseLines(string? value)
    {
        return (value ?? string.Empty)
            .Split(new[] { '\r', '\n', ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private record GmailSyncSettings(string[] FinanceSenderAllowlist, string[] BlockedSenderPatterns, string[] TrustedOrderDomains);
}
