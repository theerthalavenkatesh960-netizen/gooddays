using GoodDaysApi.DTOs.Financial;
using GoodDaysApi.Services.Financial;
using Microsoft.AspNetCore.Mvc;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SnapshotsController : ControllerBase
{
    private readonly IFinancialService _financialService;

    public SnapshotsController(IFinancialService financialService)
    {
        _financialService = financialService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var snapshots = await _financialService.GetAllSnapshotsAsync();
        return Ok(snapshots);
    }

    [HttpGet("{month}/{year}")]
    public async Task<IActionResult> GetByMonth(int month, int year)
    {
        var snapshot = await _financialService.GetSnapshotAsync(month, year);
        if (snapshot == null) return NotFound();
        return Ok(snapshot);
    }

    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] CreateSnapshotRequest request)
    {
        var snapshot = await _financialService.UpsertSnapshotAsync(request);
        return Ok(snapshot);
    }
}