using GoodDaysApi.DTOs.Financial;
using GoodDaysApi.Services.Financial;
using Microsoft.AspNetCore.Mvc;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/rules")]
public class FinancialRulesController : ControllerBase
{
    private readonly IFinancialService _financialService;

    public FinancialRulesController(IFinancialService financialService)
    {
        _financialService = financialService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rules = await _financialService.GetGroupedRulesAsync();
        return Ok(rules);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRuleRequest request)
    {
        var rule = await _financialService.CreateRuleAsync(request);
        return Ok(rule);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateRuleRequest request)
    {
        var rule = await _financialService.UpdateRuleAsync(id, request);
        if (rule == null) return NotFound();
        return Ok(rule);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _financialService.DeleteRuleAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }
}