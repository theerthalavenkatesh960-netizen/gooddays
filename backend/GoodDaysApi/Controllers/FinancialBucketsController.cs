using GoodDaysApi.DTOs.Financial;
using GoodDaysApi.Services.Financial;
using Microsoft.AspNetCore.Mvc;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FinancialBucketsController : ControllerBase
{
    private readonly IFinancialService _financialService;

    public FinancialBucketsController(IFinancialService financialService)
    {
        _financialService = financialService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? userId = null)
    {
        var resolvedUserId = ResolveUserId(userId);
        if (resolvedUserId == null) return BadRequest("userId is required.");

        var buckets = await _financialService.GetAllBucketsAsync(resolvedUserId.Value);
        return Ok(buckets);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id, [FromQuery] int? userId = null)
    {
        var resolvedUserId = ResolveUserId(userId);
        if (resolvedUserId == null) return BadRequest("userId is required.");

        var bucket = await _financialService.GetBucketByIdAsync(id, resolvedUserId.Value);
        if (bucket == null) return NotFound();
        return Ok(bucket);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFinancialBucketRequest request, [FromQuery] int? userId = null)
    {
        var resolvedUserId = ResolveUserId(userId);
        if (resolvedUserId == null) return BadRequest("userId is required.");

        var bucket = await _financialService.CreateBucketAsync(request, resolvedUserId.Value);
        return CreatedAtAction(nameof(GetById), new { id = bucket.Id }, bucket);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFinancialBucketRequest request, [FromQuery] int? userId = null)
    {
        var resolvedUserId = ResolveUserId(userId);
        if (resolvedUserId == null) return BadRequest("userId is required.");

        var bucket = await _financialService.UpdateBucketAsync(id, request, resolvedUserId.Value);
        if (bucket == null) return NotFound();
        return Ok(bucket);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] int? userId = null)
    {
        var resolvedUserId = ResolveUserId(userId);
        if (resolvedUserId == null) return BadRequest("userId is required.");

        var result = await _financialService.DeleteBucketAsync(id, resolvedUserId.Value);
        if (!result) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/contributions")]
    public async Task<IActionResult> AddContribution(Guid id, [FromBody] CreateBucketContributionRequest request, [FromQuery] int? userId = null)
    {
        var resolvedUserId = ResolveUserId(userId);
        if (resolvedUserId == null) return BadRequest("userId is required.");

        var bucket = await _financialService.AddBucketContributionAsync(id, request, resolvedUserId.Value);
        if (bucket == null) return NotFound();
        return Ok(bucket);
    }

    [HttpDelete("{id}/contributions/{contributionId}")]
    public async Task<IActionResult> DeleteContribution(Guid id, Guid contributionId, [FromQuery] int? userId = null)
    {
        var resolvedUserId = ResolveUserId(userId);
        if (resolvedUserId == null) return BadRequest("userId is required.");

        var bucket = await _financialService.DeleteBucketContributionAsync(id, contributionId, resolvedUserId.Value);
        if (bucket == null) return NotFound();
        return Ok(bucket);
    }

    private int? ResolveUserId(int? explicitUserId)
    {
        if (explicitUserId.HasValue) return explicitUserId;

        var userIdClaim =
            User.FindFirst("userId")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        return int.TryParse(userIdClaim, out var parsed) ? parsed : null;
    }
}