using GoodDaysApi.DTOs.Financial;
using GoodDaysApi.Services.Financial;
using Microsoft.AspNetCore.Mvc;
namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/financial-tasks")]
public class FinancialTasksController : ControllerBase
{
    private readonly IFinancialService _financialService;

    public FinancialTasksController(IFinancialService financialService)
    {
        _financialService = financialService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tasks = await _financialService.GetAllTasksAsync();
        return Ok(tasks);
    }

    [HttpGet("monthly/{month}/{year}")]
    public async Task<IActionResult> GetByMonth(int month, int year)
    {
        var tasks = await _financialService.GetTasksByMonthAsync(month, year);
        return Ok(tasks);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFinanceTaskRequest request)
    {
        var task = await _financialService.CreateTaskAsync(request);
        return Ok(task);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFinanceTaskRequest request)
    {
        var task = await _financialService.UpdateTaskAsync(id, request);
        if (task == null) return NotFound();
        return Ok(task);
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> Complete(Guid id, [FromBody] CompleteFinanceTaskRequest request)
    {
        var result = await _financialService.CompleteTaskAsync(id, request);
        if (!result) return NotFound();
        return Ok();
    }

    [HttpPost("{id}/uncomplete")]
    public async Task<IActionResult> Uncomplete(Guid id)
    {
        var result = await _financialService.UncompleteTaskAsync(id);
        if (!result) return NotFound();
        return Ok();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _financialService.DeleteTaskAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }
}