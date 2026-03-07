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
    public async Task<IActionResult> GetAll()
    {
        var buckets = await _financialService.GetAllBucketsAsync();
        return Ok(buckets);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var bucket = await _financialService.GetBucketByIdAsync(id);
        if (bucket == null) return NotFound();
        return Ok(bucket);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFinancialBucketRequest request)
    {
        var bucket = await _financialService.CreateBucketAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = bucket.Id }, bucket);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFinancialBucketRequest request)
    {
        var bucket = await _financialService.UpdateBucketAsync(id, request);
        if (bucket == null) return NotFound();
        return Ok(bucket);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _financialService.DeleteBucketAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }
}