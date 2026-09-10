using GoodDaysApi.DTOs.Gmail;
using System.Text.Json;
using GoodDaysApi.Data;
using GoodDaysApi.Models;
using GoodDaysApi.Services.Gmail;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/finance/gmail")]
public class FinanceGmailController : ControllerBase
{
    private readonly IGmailService _gmailService;
    private readonly IGmailSyncService _gmailSyncService;
    private readonly IConfiguration _configuration;
    private readonly AppDbContext _db;
    private readonly IMerchantAliasService _merchantAlias;
    private readonly ITokenEncryptionService _tokenEncryption;
    private readonly ISenderReliabilityService _senderReliability;
    private readonly IGmailLearningService _learning;
    private readonly GmailOptions _gmailOptions;

    public FinanceGmailController(
        IGmailService gmailService,
        IGmailSyncService gmailSyncService,
        IConfiguration configuration,
        AppDbContext db,
        IMerchantAliasService merchantAlias,
        ITokenEncryptionService tokenEncryption,
        ISenderReliabilityService senderReliability,
        IGmailLearningService learning,
        IOptions<GmailOptions> gmailOptions)
    {
        _gmailService = gmailService;
        _gmailSyncService = gmailSyncService;
        _configuration = configuration;
        _db = db;
        _merchantAlias = merchantAlias;
        _tokenEncryption = tokenEncryption;
        _senderReliability = senderReliability;
        _learning = learning;
        _gmailOptions = gmailOptions.Value;
    }

    [HttpGet("connect")]
    [Authorize]
    public async Task<ActionResult<GmailConnectUrlDto>> Connect(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var url = await _gmailService.GenerateConnectUrlAsync(userId.Value, cancellationToken);
        return Ok(new GmailConnectUrlDto { Url = url });
    }

    [HttpGet("callback")]
    [AllowAnonymous]
    public async Task<IActionResult> Callback([FromQuery] string? code, [FromQuery] string? state, [FromQuery] string? error, CancellationToken cancellationToken)
    {
        var frontendRedirect = _configuration["Google:FrontendRedirectAfterCallback"];

        if (!string.IsNullOrWhiteSpace(error))
        {
            if (!string.IsNullOrWhiteSpace(frontendRedirect))
            {
                return Redirect($"{frontendRedirect}?gmail=error&reason={Uri.EscapeDataString(error)}");
            }

            return BadRequest(new { message = "Google authorization failed.", error });
        }

        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state))
        {
            return BadRequest(new { message = "Missing OAuth callback parameters." });
        }

        try
        {
            var result = await _gmailService.HandleOAuthCallbackAsync(code, state, cancellationToken);
            if (!string.IsNullOrWhiteSpace(frontendRedirect))
            {
                return Redirect($"{frontendRedirect}?gmail=connected&email={Uri.EscapeDataString(result.Email ?? string.Empty)}");
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            if (!string.IsNullOrWhiteSpace(frontendRedirect))
            {
                return Redirect($"{frontendRedirect}?gmail=error&reason={Uri.EscapeDataString(ex.Message)}");
            }

            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("sync")]
    [Authorize]
    public async Task<IActionResult> Sync([FromQuery] bool full = true, CancellationToken cancellationToken = default)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var result = await _gmailSyncService.SyncUserAsync(userId.Value, full, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("disconnect")]
    [Authorize]
    public async Task<IActionResult> Disconnect(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        await _gmailService.DisconnectAsync(userId.Value, cancellationToken);
        return Ok(new { message = "Gmail disconnected." });
    }

    [HttpGet("status")]
    [Authorize]
    public async Task<ActionResult<GmailStatusDto>> Status(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var status = await _gmailService.GetStatusAsync(userId.Value, cancellationToken);
        return Ok(new GmailStatusDto
        {
            Connected = status.Connected,
            Email = status.Email,
            LastSyncedUtc = status.LastSyncedUtc,
            Provider = status.Provider
        });
    }

    [HttpGet("transactions")]
    [Authorize]
    public async Task<IActionResult> Transactions([FromQuery] bool? reviewed, [FromQuery] int take = 300, CancellationToken cancellationToken = default)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        take = Math.Clamp(take, 1, 500);
        var query = _db.Expenses
            .Where(x => x.UserId == userId.Value && x.SourceType == "gmail");

        if (reviewed.HasValue)
        {
            query = query.Where(x => x.IsReviewed == reviewed.Value);
        }

        var items = await query
            .OrderByDescending(x => x.Date ?? x.CreatedAt)
            .Take(take)
            .Select(x => new
            {
                x.Id,
                x.Description,
                x.ShortNote,
                x.Amount,
                x.Currency,
                x.Category,
                x.Date,
                x.CreatedAt,
                x.GmailMessageId,
                x.ExternalReference,
                x.SourceType,
                x.IsReviewed,
                x.ReviewedAt,
                x.Direction,
                x.TransactionType,
                x.TransactionStatus,
                x.PaymentInstrumentType,
                x.PaymentRail,
                x.InstitutionName,
                x.InstrumentLast4,
                x.SourceInstrumentType,
                x.SourceInstrumentLast4,
                x.DestinationInstrumentType,
                x.DestinationInstrumentName,
                x.MerchantName,
                x.CounterpartyName,
                x.CounterpartyIdentifier,
                x.ConfidenceScore
            })
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpGet("transactions/{id:int}")]
    [Authorize]
    public async Task<IActionResult> TransactionDetail(int id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var expense = await _db.Expenses.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value, cancellationToken);
        if (expense == null) return NotFound();

        var card = await _db.CardExpenses.AsNoTracking()
            .Where(ce => ce.ExpenseId == id)
            .Join(_db.CreditCards, ce => ce.CardId, c => c.Id, (ce, c) => new { c.Id, c.Name, c.Issuer, c.Last4Digits })
            .FirstOrDefaultAsync(cancellationToken);

        var orders = await _db.OrderTransactionLinks.AsNoTracking()
            .Where(link => link.ExpenseId == id)
            .Include(link => link.Order)
            .Select(link => new
            {
                link.Status,
                link.MatchScore,
                link.MatchMethod,
                Order = link.Order,
                Items = _db.OrderItems.Where(i => i.OrderId == link.OrderId)
                    .OrderBy(i => i.LineNumber)
                    .Select(i => new { i.Name, i.Quantity, i.Amount })
                    .ToList()
            })
            .ToListAsync(cancellationToken);

        var email = await _db.SyncedEmails.AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId.Value && x.GmailMessageId == expense.GmailMessageId, cancellationToken);

        return Ok(new
        {
            expense.Id,
            expense.Description,
            expense.ShortNote,
            expense.Amount,
            expense.Currency,
            expense.Category,
            expense.Date,
            expense.CreatedAt,
            expense.Direction,
            expense.TransactionType,
            expense.TransactionStatus,
            expense.PaymentInstrumentType,
            expense.PaymentRail,
            expense.InstitutionName,
            expense.InstrumentLast4,
            expense.SourceInstrumentType,
            expense.SourceInstrumentLast4,
            expense.DestinationInstrumentType,
            expense.DestinationInstrumentName,
            expense.MerchantName,
            expense.CounterpartyName,
            expense.CounterpartyIdentifier,
            expense.ExternalReference,
            expense.ConfidenceScore,
            expense.ExtractionVersion,
            expense.EvidenceJson,
            expense.IsReviewed,
            expense.ReviewedAt,
            Card = card,
            Orders = orders,
            SourceEmail = email == null ? null : new
            {
                email.Sender,
                email.InternalDate,
                Subject = ReadStoredEmailText(email.Subject, email.IsContentEncrypted),
                Snippet = ReadStoredEmailText(email.Snippet, email.IsContentEncrypted),
                BodyText = ReadStoredEmailBody(email.BodyText, email.IsContentEncrypted)
            }
        });
    }

    [HttpGet("merchant-history")]
    [Authorize]
    public async Task<IActionResult> MerchantHistory([FromQuery] string merchant, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(merchant)) return BadRequest(new { message = "Merchant is required." });

        var normalized = merchant.Trim();
        var transactions = await _db.Expenses.AsNoTracking()
            .Where(x => x.UserId == userId.Value
                        && x.SourceType == "gmail"
                        && (x.MerchantName == normalized || x.CounterpartyName == normalized || x.RawMerchant == normalized))
            .OrderByDescending(x => x.Date ?? x.CreatedAt)
            .Select(x => new
            {
                x.Id, x.Description, x.Amount, x.Currency, x.Category, x.Date, x.CreatedAt,
                x.Direction, x.TransactionType, x.TransactionStatus, x.PaymentInstrumentType,
                x.PaymentRail, x.InstitutionName, x.InstrumentLast4, x.MerchantName, x.CounterpartyName
            })
            .ToListAsync(cancellationToken);

        var orders = await _db.Orders.AsNoTracking()
            .Where(x => x.UserId == userId.Value && x.Merchant == normalized)
            .OrderByDescending(x => x.OrderDate ?? x.CreatedAt)
            .Select(x => new
            {
                x.Id, x.Merchant, x.OrderNumber, x.OrderDate, x.TotalAmount, x.Currency,
                Items = _db.OrderItems.Where(i => i.OrderId == x.Id)
                    .OrderBy(i => i.LineNumber)
                    .Select(i => new { i.Name, i.Quantity, i.Amount })
                    .ToList()
            })
            .ToListAsync(cancellationToken);

        return Ok(new { merchant = normalized, transactions, orders });
    }

    [HttpGet("orders/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> OrderDetail(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var order = await _db.Orders.AsNoTracking()
            .Where(x => x.Id == id && x.UserId == userId.Value)
            .Select(x => new
            {
                x.Id, x.Merchant, x.OrderNumber, x.OrderDate, x.TotalAmount, x.Currency,
                x.SourceMessageId,
                Items = _db.OrderItems.Where(i => i.OrderId == x.Id)
                    .OrderBy(i => i.LineNumber)
                    .Select(i => new { i.Name, i.Quantity, i.Amount })
                    .ToList(),
                Transactions = _db.OrderTransactionLinks
                    .Where(link => link.OrderId == x.Id)
                    .Select(link => new { link.ExpenseId, link.Status, link.MatchScore })
                    .ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        return order == null ? NotFound() : Ok(order);
    }

    [HttpPost("transactions/{id:int}/items")]
    [Authorize]
    public async Task<IActionResult> SaveTransactionItems(int id, [FromBody] TransactionItemsRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var expense = await _db.Expenses.FirstOrDefaultAsync(
            x => x.Id == id && x.UserId == userId.Value && x.SourceType == "gmail", cancellationToken);
        if (expense == null) return NotFound();

        var items = (request.Items ?? new List<TransactionItemRequest>())
            .Where(x => !string.IsNullOrWhiteSpace(x.Name) && x.Quantity > 0)
            .Select((x, index) => new OrderItem
            {
                Name = x.Name.Trim(),
                Quantity = x.Quantity,
                Amount = x.Amount,
                LineNumber = index
            })
            .ToList();

        var link = await _db.OrderTransactionLinks
            .Include(x => x.Order)
            .FirstOrDefaultAsync(x => x.ExpenseId == id && x.Order.UserId == userId.Value, cancellationToken);

        if (link == null)
        {
            var order = new Order
            {
                UserId = userId.Value,
                Merchant = expense.MerchantName ?? expense.CounterpartyName,
                TotalAmount = expense.Amount,
                OrderDate = expense.Date ?? expense.CreatedAt,
                EvidenceJson = "{\"source\":\"manual-transaction-items\"}"
            };
            _db.Orders.Add(order);
            link = new OrderTransactionLink
            {
                Order = order,
                Expense = expense,
                MatchScore = 1m,
                MatchMethod = "MANUAL",
                Status = "VALIDATED",
                EvidenceJson = "{\"source\":\"manual-transaction-items\"}"
            };
            _db.OrderTransactionLinks.Add(link);
        }

        var orderId = link.OrderId == Guid.Empty ? link.Order!.Id : link.OrderId;
        var existingItems = await _db.OrderItems.Where(x => x.OrderId == orderId).ToListAsync(cancellationToken);
        _db.OrderItems.RemoveRange(existingItems);
        foreach (var item in items) item.OrderId = orderId;
        _db.OrderItems.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { saved = items.Count });
    }

    [HttpPost("transactions/{id:int}/copy")]
    [Authorize]
    public async Task<IActionResult> CopyTransaction(int id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var source = await _db.Expenses.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value, cancellationToken);
        if (source == null) return NotFound();

        var copy = new Expense
        {
            UserId = userId.Value,
            Description = source.Description,
            ShortNote = source.ShortNote,
            Amount = source.Amount,
            Category = source.Category,
            SourceType = "manual",
            Direction = source.Direction,
            TransactionType = source.TransactionType,
            TransactionStatus = "COMPLETED",
            PaymentInstrumentType = source.PaymentInstrumentType,
            PaymentRail = source.PaymentRail,
            InstitutionName = source.InstitutionName,
            InstrumentLast4 = source.InstrumentLast4,
            SourceInstrumentType = source.SourceInstrumentType,
            SourceInstrumentLast4 = source.SourceInstrumentLast4,
            DestinationInstrumentType = source.DestinationInstrumentType,
            DestinationInstrumentName = source.DestinationInstrumentName,
            MerchantName = source.MerchantName,
            CounterpartyName = source.CounterpartyName,
            CounterpartyIdentifier = source.CounterpartyIdentifier,
            Currency = source.Currency,
            Date = source.Date,
            CreatedAt = DateTime.UtcNow,
            IsReviewed = true,
            ReviewedAt = DateTime.UtcNow,
            EvidenceJson = "{\"source\":\"copied-transaction\"}"
        };

        _db.Expenses.Add(copy);
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { id = copy.Id });
    }

    [HttpPost("transactions/{id:int}/decision")]
    [Authorize]
    public async Task<IActionResult> DecideTransaction(int id, [FromBody] TransactionDecisionRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var expense = await _db.Expenses
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value && x.SourceType == "gmail", cancellationToken);
        if (expense == null) return NotFound();

        var email = await _db.SyncedEmails
            .FirstOrDefaultAsync(x => x.UserId == userId.Value && x.GmailMessageId == expense.GmailMessageId, cancellationToken);

        if (string.Equals(request.Decision, "REJECT", StringComparison.OrdinalIgnoreCase))
        {
            await RecordLearningOutcomeAsync(userId.Value, expense, email, false, cancellationToken);
            _db.Expenses.Remove(expense);
            if (email != null)
            {
                email.ProcessingStatus = "REJECTED";
                email.ProcessingError = "Rejected during review.";
                email.ProcessedAt = DateTime.UtcNow;
                await _senderReliability.RecordOutcomeAsync(userId.Value, email.Sender, confirmed: false, cancellationToken);
            }

            await _db.SaveChangesAsync(cancellationToken);
            return Ok(new { decision = "REJECTED" });
        }

        expense.IsReviewed = true;
        expense.ReviewedAt = DateTime.UtcNow;
        await RecordLearningOutcomeAsync(userId.Value, expense, email, true, cancellationToken);
        if (email != null)
        {
            await _senderReliability.RecordOutcomeAsync(userId.Value, email.Sender, confirmed: true, cancellationToken);
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { decision = "APPROVED" });
    }

    [HttpPost("transactions/decision")]
    [Authorize]
    public async Task<IActionResult> DecideTransactions([FromBody] TransactionBulkDecisionRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();
        if (request.ExpenseIds == null || request.ExpenseIds.Count == 0) return BadRequest(new { message = "At least one transaction is required." });
        if (request.Decision is not ("APPROVE" or "REJECT")) return BadRequest(new { message = "Decision must be APPROVE or REJECT." });

        var expenses = await _db.Expenses
            .Where(x => x.UserId == userId.Value && x.SourceType == "gmail" && request.ExpenseIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        var messageIds = expenses.Where(x => !string.IsNullOrWhiteSpace(x.GmailMessageId)).Select(x => x.GmailMessageId!).ToList();
        var emails = await _db.SyncedEmails
            .Where(x => x.UserId == userId.Value && messageIds.Contains(x.GmailMessageId))
            .ToListAsync(cancellationToken);

        foreach (var expense in expenses)
        {
            var email = emails.FirstOrDefault(x => x.GmailMessageId == expense.GmailMessageId);
            var rejected = request.Decision == "REJECT";
            if (rejected)
            {
                await RecordLearningOutcomeAsync(userId.Value, expense, email, false, cancellationToken);
                _db.Expenses.Remove(expense);
                if (email != null)
                {
                    email.ProcessingStatus = "REJECTED";
                    email.ProcessingError = "Rejected during bulk review.";
                    email.ProcessedAt = DateTime.UtcNow;
                    await _senderReliability.RecordOutcomeAsync(userId.Value, email.Sender, confirmed: false, cancellationToken);
                }
            }
            else
            {
                expense.IsReviewed = true;
                expense.ReviewedAt = DateTime.UtcNow;
                await RecordLearningOutcomeAsync(userId.Value, expense, email, true, cancellationToken);
                if (email != null)
                {
                    await _senderReliability.RecordOutcomeAsync(userId.Value, email.Sender, confirmed: true, cancellationToken);
                }
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { updated = expenses.Count, decision = request.Decision });
    }

    private async Task RecordLearningOutcomeAsync(int userId, Expense expense, SyncedEmail? email, bool confirmed, CancellationToken cancellationToken)
    {
        if (email == null || string.IsNullOrWhiteSpace(expense.EvidenceJson)) return;
        try
        {
            using var document = JsonDocument.Parse(expense.EvidenceJson);
            if (!document.RootElement.TryGetProperty("learningSignals", out var signalsElement)) return;
            var signals = JsonSerializer.Deserialize<List<GmailLearningSignal>>(signalsElement.GetRawText()) ?? new();
            await _learning.RecordOutcomeAsync(userId, email.Sender, signals, confirmed, cancellationToken);
        }
        catch (JsonException) { }
    }

    [HttpPost("review")]
    [Authorize]
    public async Task<IActionResult> BulkReview([FromBody] GmailBulkReviewRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();
        if (request.ExpenseIds == null || request.ExpenseIds.Count == 0)
        {
            return BadRequest(new { message = "At least one expense id is required." });
        }

        var ids = request.ExpenseIds.Distinct().ToList();
        var items = await _db.Expenses
            .Where(x => x.UserId == userId.Value && x.SourceType == "gmail" && ids.Contains(x.Id))
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var item in items)
        {
            item.IsReviewed = request.IsReviewed;
            item.ReviewedAt = request.IsReviewed ? now : null;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { updated = items.Count });
    }

    [HttpPost("merchant")]
    [Authorize]
    public async Task<IActionResult> UpdateMerchant([FromBody] GmailMerchantCorrectionRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Merchant))
        {
            return BadRequest(new { message = "Merchant is required." });
        }

        var expense = await _db.Expenses.FirstOrDefaultAsync(
            x => x.Id == request.ExpenseId && x.UserId == userId.Value && x.SourceType == "gmail", cancellationToken);
        if (expense == null) return NotFound();

        var requestedMerchant = request.Merchant.Trim();
        var normalizedRequestedMerchant = requestedMerchant.ToLower();
        var canonicalMerchant = await _db.Expenses.AsNoTracking()
            .Where(x => x.UserId == userId.Value
                        && x.SourceType == "gmail"
                        && x.MerchantName != null
                        && x.MerchantName.ToLower() == normalizedRequestedMerchant)
            .Select(x => x.MerchantName)
            .FirstOrDefaultAsync(cancellationToken);
        canonicalMerchant ??= await _db.Expenses.AsNoTracking()
            .Where(x => x.UserId == userId.Value
                        && x.SourceType == "gmail"
                        && x.CounterpartyName != null
                        && x.CounterpartyName.ToLower() == normalizedRequestedMerchant)
            .Select(x => x.CounterpartyName)
            .FirstOrDefaultAsync(cancellationToken);
        canonicalMerchant ??= await _db.MerchantAliases.AsNoTracking()
            .Where(x => x.UserId == userId.Value)
            .Select(x => x.CorrectedMerchant)
            .FirstOrDefaultAsync(x => x.ToLower() == normalizedRequestedMerchant, cancellationToken);
        canonicalMerchant ??= requestedMerchant;

        expense.Description = canonicalMerchant;
        expense.MerchantName = canonicalMerchant;
        expense.CounterpartyName = canonicalMerchant;
        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            expense.Category = request.Category;
        }
        expense.IsReviewed = true;
        expense.ReviewedAt = DateTime.UtcNow;

        if (request.ApplyToFuture && !string.IsNullOrWhiteSpace(expense.RawMerchant))
        {
            await _merchantAlias.UpsertAsync(userId.Value, expense.RawMerchant, canonicalMerchant, request.Category, cancellationToken);
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { updated = true, expense.Description, expense.Category });
    }

    [HttpGet("merchants")]
    [Authorize]
    public async Task<IActionResult> Merchants(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var merchantNames = await _db.Expenses.AsNoTracking()
            .Where(x => x.UserId == userId.Value && x.SourceType == "gmail")
            .Where(x => x.MerchantName != null && x.MerchantName != "")
            .Select(x => x.MerchantName)
            .ToListAsync(cancellationToken);
        var counterpartyNames = await _db.Expenses.AsNoTracking()
            .Where(x => x.UserId == userId.Value && x.SourceType == "gmail")
            .Where(x => x.CounterpartyName != null && x.CounterpartyName != "")
            .Select(x => x.CounterpartyName)
            .ToListAsync(cancellationToken);
        var detected = merchantNames.Concat(counterpartyNames)
            .Where(x => x != null && x != "")
            .ToList();
        var corrected = await _db.MerchantAliases.AsNoTracking()
            .Where(x => x.UserId == userId.Value)
            .Select(x => x.CorrectedMerchant)
            .ToListAsync(cancellationToken);

        var merchants = detected.Concat(corrected)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return Ok(merchants);
    }

    [HttpGet("categories")]
    [Authorize]
    public async Task<IActionResult> Categories(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var expenseCategories = await _db.Expenses.AsNoTracking()
            .Where(x => x.UserId == userId.Value && x.Category != null && x.Category != "")
            .Select(x => x.Category)
            .ToListAsync(cancellationToken);
        var aliasCategories = await _db.MerchantAliases.AsNoTracking()
            .Where(x => x.UserId == userId.Value && x.CorrectedCategory != null && x.CorrectedCategory != "")
            .Select(x => x.CorrectedCategory)
            .ToListAsync(cancellationToken);

        var categories = expenseCategories.Concat(aliasCategories)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return Ok(categories);
    }

    [HttpGet("comments")]
    [Authorize]
    public async Task<IActionResult> Comments(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var comments = await _db.Expenses.AsNoTracking()
            .Where(x => x.UserId == userId.Value && x.ShortNote != null && x.ShortNote != "")
            .Select(x => x.ShortNote)
            .ToListAsync(cancellationToken);

        return Ok(comments
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
            .Take(100)
            .ToList());
    }

    [HttpPost("category")]
    [Authorize]
    public async Task<IActionResult> BulkCategory([FromBody] GmailBulkCategoryRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();
        if (request.ExpenseIds == null || request.ExpenseIds.Count == 0 || string.IsNullOrWhiteSpace(request.Category))
        {
            return BadRequest(new { message = "Expense ids and category are required." });
        }

        var ids = request.ExpenseIds.Distinct().ToList();
        var items = await _db.Expenses
            .Where(x => x.UserId == userId.Value && x.SourceType == "gmail" && ids.Contains(x.Id))
            .ToListAsync(cancellationToken);

        foreach (var item in items)
        {
            item.Category = request.Category;
            if (request.MarkReviewedOnCategoryChange)
            {
                item.IsReviewed = true;
                item.ReviewedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { updated = items.Count });
    }

    [HttpGet("candidates")]
    [Authorize]
    public async Task<IActionResult> Candidates([FromQuery] string? status, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var query = _db.TransactionCandidates.Where(x => x.UserId == userId.Value);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status);

        var candidates = await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .ToListAsync(cancellationToken);

        var messageIds = candidates.Select(c => c.SourceMessageId).ToList();
        var emails = await _db.SyncedEmails.AsNoTracking()
            .Where(e => e.UserId == userId.Value && messageIds.Contains(e.GmailMessageId))
            .ToListAsync(cancellationToken);

        var items = candidates.Select(candidate =>
        {
            var email = emails.FirstOrDefault(e => e.GmailMessageId == candidate.SourceMessageId);
            return new
            {
                candidate.Id,
                candidate.SourceMessageId,
                candidate.SourceThreadId,
                candidate.Status,
                candidate.EvidenceJson,
                candidate.Error,
                candidate.ExtractionVersion,
                candidate.CreatedAt,
                Subject = email == null ? null : ReadStoredEmailText(email.Subject, email.IsContentEncrypted),
                Snippet = email == null ? null : ReadStoredEmailText(email.Snippet, email.IsContentEncrypted),
                Sender = email?.Sender,
                ReceivedAt = email?.InternalDate
            };
        }).ToList();

        return Ok(items);
    }

    [HttpPost("candidates/{id:guid}/status")]
    [Authorize]
    public async Task<IActionResult> UpdateCandidateStatus(Guid id, [FromBody] CandidateStatusRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();
        var allowed = new[] { "NEEDS_REVIEW", "REJECTED" };
        if (!allowed.Contains(request.Status, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Only NEEDS_REVIEW or REJECTED is allowed until a candidate is explicitly promoted." });
        }

        var candidate = await _db.TransactionCandidates.FirstOrDefaultAsync(
            x => x.Id == id && x.UserId == userId.Value, cancellationToken);
        if (candidate == null) return NotFound();
        candidate.Status = request.Status.ToUpperInvariant();
        if (candidate.Status == "REJECTED")
        {
            var syncedEmail = await _db.SyncedEmails.FirstOrDefaultAsync(
                x => x.UserId == userId.Value && x.GmailMessageId == candidate.SourceMessageId, cancellationToken);
            if (syncedEmail != null)
            {
                syncedEmail.ProcessingStatus = "REJECTED";
                syncedEmail.ProcessingError = "Rejected during manual review.";
                syncedEmail.ProcessedAt = DateTime.UtcNow;
                await _senderReliability.RecordOutcomeAsync(userId.Value, syncedEmail.Sender, confirmed: false, cancellationToken);
            }
        }
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { updated = true });
    }

    [HttpPost("candidates/{id:guid}/promote")]
    [Authorize]
    public async Task<IActionResult> PromoteCandidate(Guid id, [FromBody] PromoteCandidateRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();
        if (request.Amount <= 0 || string.IsNullOrWhiteSpace(request.Merchant))
        {
            return BadRequest(new { message = "Amount and merchant are required." });
        }

        var candidate = await _db.TransactionCandidates.FirstOrDefaultAsync(
            x => x.Id == id && x.UserId == userId.Value, cancellationToken);
        if (candidate == null) return NotFound();

        var expense = new Expense
        {
            UserId = userId.Value,
            Description = request.Merchant,
            Amount = request.Amount,
            Category = request.Category ?? "Other",
            Date = request.TransactionDate ?? DateTime.UtcNow,
            GmailMessageId = candidate.SourceMessageId,
            SourceType = "gmail",
            Direction = request.Direction,
            TransactionType = request.TransactionType,
            TransactionStatus = "COMPLETED",
            PaymentInstrumentType = request.PaymentInstrumentType,
            InstitutionName = request.InstitutionName,
            InstrumentLast4 = request.InstrumentLast4,
            SourceInstrumentType = request.SourceInstrumentType,
            SourceInstrumentLast4 = request.SourceInstrumentLast4,
            DestinationInstrumentType = request.DestinationInstrumentType,
            DestinationInstrumentName = request.DestinationInstrumentName,
            ExtractionVersion = "manual-review-v1",
            EvidenceJson = candidate.EvidenceJson,
            RawMerchant = request.Merchant,
            IsReviewed = true,
            ReviewedAt = DateTime.UtcNow
        };

        _db.Expenses.Add(expense);
        candidate.Status = "PROMOTED";

        var syncedEmail = await _db.SyncedEmails.FirstOrDefaultAsync(
            x => x.UserId == userId.Value && x.GmailMessageId == candidate.SourceMessageId, cancellationToken);
        if (syncedEmail != null)
        {
            syncedEmail.ProcessingStatus = "PROCESSED";
            syncedEmail.ProcessingError = null;
            syncedEmail.ProcessedAt = DateTime.UtcNow;
            await _senderReliability.RecordOutcomeAsync(userId.Value, syncedEmail.Sender, confirmed: true, cancellationToken);
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(expense);
    }

    [HttpGet("settings")]
    [Authorize]
    public async Task<IActionResult> Settings(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var prefs = await _db.GmailSyncPreferences.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId.Value, cancellationToken);
        return Ok(new GmailSyncSettingsDto(
            LinesOrDefaults(prefs?.FinanceSenderAllowlist, _gmailOptions.FinanceSenderAllowlist),
            LinesOrDefaults(prefs?.BlockedSenderPatterns, _gmailOptions.BlockedSenderPatterns),
            LinesOrDefaults(prefs?.TrustedOrderDomains, _gmailOptions.TrustedOrderDomains)));
    }

    [HttpPut("settings")]
    [Authorize]
    public async Task<IActionResult> UpdateSettings([FromBody] GmailSyncSettingsDto request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var prefs = await _db.GmailSyncPreferences.FirstOrDefaultAsync(x => x.UserId == userId.Value, cancellationToken);
        if (prefs == null)
        {
            prefs = new GmailSyncPreference { UserId = userId.Value };
            _db.GmailSyncPreferences.Add(prefs);
        }

        prefs.FinanceSenderAllowlist = string.Join('\n', request.FinanceSenderAllowlist ?? Array.Empty<string>());
        prefs.BlockedSenderPatterns = string.Join('\n', request.BlockedSenderPatterns ?? Array.Empty<string>());
        prefs.TrustedOrderDomains = string.Join('\n', request.TrustedOrderDomains ?? Array.Empty<string>());
        prefs.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(request);
    }

    [HttpGet("candidates/{id:guid}/email")]
    [Authorize]
    public async Task<IActionResult> CandidateEmail(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var candidate = await _db.TransactionCandidates.FirstOrDefaultAsync(
            x => x.Id == id && x.UserId == userId.Value, cancellationToken);
        if (candidate == null) return NotFound();

        var email = await _db.SyncedEmails.FirstOrDefaultAsync(
            x => x.UserId == userId.Value && x.GmailMessageId == candidate.SourceMessageId, cancellationToken);
        if (email == null)
        {
            return Ok(new
            {
                candidate.SourceMessageId,
                Sender = (string?)null,
                InternalDate = candidate.CreatedAt,
                Subject = "Source email is unavailable",
                Snippet = candidate.Error,
                BodyText = "This candidate was created before source-email audit storage was enabled. Re-syncing will create a readable source record for future candidates."
            });
        }

        return Ok(new
        {
            email.GmailMessageId,
            email.ThreadId,
            email.Sender,
            email.InternalDate,
            email.ProcessingStatus,
            email.ProcessingError,
            Subject = ReadStoredEmailText(email.Subject, email.IsContentEncrypted),
            Snippet = ReadStoredEmailText(email.Snippet, email.IsContentEncrypted),
            BodyText = ReadStoredEmailBody(email.BodyText, email.IsContentEncrypted)
        });
    }

    private string ReadStoredEmailText(string value, bool isEncrypted)
    {
        if (!isEncrypted) return value;
        try { return _tokenEncryption.Decrypt(value); }
        catch { return string.Empty; }
    }

    // Stored bodies are frequently raw HTML, so previews are normalised into readable text.
    private string ReadStoredEmailBody(string value, bool isEncrypted) =>
        EmailTextNormalizer.Normalize(ReadStoredEmailText(value, isEncrypted));

    private static string[] LinesOrDefaults(string? value, string[] defaults)
    {
        var lines = (value ?? string.Empty)
            .Split(new[] { '\r', '\n', ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        return lines.Length == 0 ? defaults : lines;
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim =
            User.FindFirst("userId")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        if (int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }

        return null;
    }
}

public class CandidateStatusRequest
{
    public string Status { get; set; } = "NEEDS_REVIEW";
}

public record GmailBulkReviewRequest(List<int> ExpenseIds, bool IsReviewed);
public record GmailBulkCategoryRequest(List<int> ExpenseIds, string Category, bool MarkReviewedOnCategoryChange = true);
public record GmailMerchantCorrectionRequest(int ExpenseId, string Merchant, string? Category, bool ApplyToFuture = true);
public record TransactionItemsRequest(List<TransactionItemRequest>? Items);
public record TransactionItemRequest(string Name, int Quantity, decimal? Amount);
public record PromoteCandidateRequest(
    decimal Amount,
    string Merchant,
    string? Category,
    DateTime? TransactionDate,
    string Direction = "DEBIT",
    string TransactionType = "PURCHASE",
    string PaymentInstrumentType = "UNKNOWN",
    string? InstitutionName = null,
    string? InstrumentLast4 = null,
    string? SourceInstrumentType = null,
    string? SourceInstrumentLast4 = null,
    string? DestinationInstrumentType = null,
    string? DestinationInstrumentName = null);
public record GmailSyncSettingsDto(string[] FinanceSenderAllowlist, string[] BlockedSenderPatterns, string[] TrustedOrderDomains);
public record TransactionDecisionRequest(string Decision);
public record TransactionBulkDecisionRequest(List<int> ExpenseIds, string Decision);
