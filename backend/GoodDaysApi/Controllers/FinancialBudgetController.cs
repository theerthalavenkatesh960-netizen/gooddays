using GoodDaysApi.Data;
using GoodDaysApi.DTOs.Financial;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FinancialBudgetController : ControllerBase
{
    private readonly AppDbContext _db;

    public FinancialBudgetController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetBudgetProfile()
    {
        var profile = await EnsureProfileAsync();
        await _db.Entry(profile).Collection(p => p.FixedExpenses).LoadAsync();

        return Ok(ToDto(profile));
    }

    [HttpPut]
    public async Task<IActionResult> UpdateIncome([FromBody] UpdateBudgetIncomeRequest request)
    {
        var profile = await EnsureProfileAsync();
        profile.MonthlyIncome = request.MonthlyIncome;
        profile.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _db.Entry(profile).Collection(p => p.FixedExpenses).LoadAsync();
        return Ok(ToDto(profile));
    }

    [HttpPost("fixed-expenses")]
    public async Task<IActionResult> AddFixedExpense([FromBody] CreateFixedExpenseRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Amount <= 0)
            return BadRequest("Name and amount are required");

        var profile = await EnsureProfileAsync();
        var sortOrder = await _db.FinanceFixedExpenses
            .Where(e => e.ProfileId == profile.Id)
            .Select(e => (int?)e.SortOrder)
            .MaxAsync() ?? 0;

        var expense = new FinanceFixedExpense
        {
            ProfileId = profile.Id,
            Name = request.Name.Trim(),
            Amount = request.Amount,
            SortOrder = sortOrder + 1
        };

        _db.FinanceFixedExpenses.Add(expense);
        profile.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _db.Entry(profile).Collection(p => p.FixedExpenses).LoadAsync();
        return Ok(ToDto(profile));
    }

    [HttpDelete("fixed-expenses/{id}")]
    public async Task<IActionResult> DeleteFixedExpense(Guid id)
    {
        var expense = await _db.FinanceFixedExpenses.FirstOrDefaultAsync(e => e.Id == id);
        if (expense == null) return NotFound();

        var profile = await EnsureProfileAsync();
        _db.FinanceFixedExpenses.Remove(expense);
        profile.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _db.Entry(profile).Collection(p => p.FixedExpenses).LoadAsync();
        return Ok(ToDto(profile));
    }

    private async Task<FinanceBudgetProfile> EnsureProfileAsync()
    {
        var profile = await _db.FinanceBudgetProfiles
            .Include(p => p.FixedExpenses)
            .OrderBy(p => p.CreatedAt)
            .FirstOrDefaultAsync();

        if (profile != null) return profile;

        profile = new FinanceBudgetProfile { MonthlyIncome = 0 };
        _db.FinanceBudgetProfiles.Add(profile);
        await _db.SaveChangesAsync();
        return profile;
    }

    private static BudgetProfileDto ToDto(FinanceBudgetProfile profile)
    {
        return new BudgetProfileDto
        {
            Id = profile.Id,
            MonthlyIncome = profile.MonthlyIncome,
            FixedExpenses = profile.FixedExpenses
                .OrderBy(e => e.SortOrder)
                .Select(e => new FixedExpenseDto
                {
                    Id = e.Id,
                    Name = e.Name,
                    Amount = e.Amount
                })
                .ToList()
        };
    }
}
