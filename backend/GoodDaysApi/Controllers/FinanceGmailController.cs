using GoodDaysApi.DTOs.Gmail;
using GoodDaysApi.Data;
using GoodDaysApi.Services.Gmail;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

    public FinanceGmailController(
        IGmailService gmailService,
        IGmailSyncService gmailSyncService,
        IConfiguration configuration,
        AppDbContext db,
        IMerchantAliasService merchantAlias)
    {
        _gmailService = gmailService;
        _gmailSyncService = gmailSyncService;
        _configuration = configuration;
        _db = db;
        _merchantAlias = merchantAlias;
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
    public async Task<IActionResult> Sync(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var result = await _gmailSyncService.SyncUserAsync(userId.Value, false, cancellationToken);
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
                x.Amount,
                x.Category,
                x.Date,
                x.CreatedAt,
                x.GmailMessageId,
                x.ExternalReference,
                x.SourceType,
                x.IsReviewed,
                x.ReviewedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(items);
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

        var provider = string.IsNullOrWhiteSpace(expense.InstitutionName) ? string.Empty : $" [{expense.InstitutionName}]";
        expense.Description = $"{request.Merchant}{provider}";
        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            expense.Category = request.Category;
        }
        expense.IsReviewed = true;
        expense.ReviewedAt = DateTime.UtcNow;

        if (request.ApplyToFuture && !string.IsNullOrWhiteSpace(expense.RawMerchant))
        {
            await _merchantAlias.UpsertAsync(userId.Value, expense.RawMerchant, request.Merchant, request.Category, cancellationToken);
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { updated = true, expense.Description, expense.Category });
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

        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id,
                x.SourceMessageId,
                x.SourceThreadId,
                x.Status,
                x.EvidenceJson,
                x.Error,
                x.ExtractionVersion,
                x.CreatedAt
            })
            .ToListAsync(cancellationToken);

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
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { updated = true });
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
