using GoodDaysApi.Services.Financial;
using Microsoft.AspNetCore.Mvc;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IFinancialService _financialService;

    public DashboardController(IFinancialService financialService)
    {
        _financialService = financialService;
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent()
    {
        var dashboard = await _financialService.GetDashboardDataAsync();
        return Ok(dashboard);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        var history = await _financialService.GetMonthlyHistoryAsync();
        return Ok(history);
    }
}