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
    public async Task<IActionResult> GetBudgetProfile([FromQuery] int? month, [FromQuery] int? year)
    {
        if (!IsMonthYearValid(month, year, out var monthValue, out var yearValue))
            return BadRequest("When provided, month and year must both be valid values.");

        var profile = await EnsureProfileAsync();
        await _db.Entry(profile).Collection(p => p.FixedExpenses).LoadAsync();

        var incomeOverride = await GetIncomeOverrideAsync(profile.Id, monthValue, yearValue);
        var fixedOverrideMap = await GetFixedExpenseOverridesAsync(profile.FixedExpenses.Select(e => e.Id).ToList(), monthValue, yearValue);

        return Ok(ToDto(profile, monthValue, yearValue, incomeOverride, fixedOverrideMap));
    }

    [HttpPut]
    public async Task<IActionResult> UpdateIncome([FromBody] UpdateBudgetIncomeRequest request)
    {
        var profile = await EnsureProfileAsync();
        profile.MonthlyIncome = request.MonthlyIncome;
        profile.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _db.Entry(profile).Collection(p => p.FixedExpenses).LoadAsync();
        return Ok(ToDto(profile, null, null, null, new Dictionary<Guid, MonthlyFixedExpenseOverride>()));
    }

    [HttpPut("monthly-income-override")]
    public async Task<IActionResult> UpsertMonthlyIncomeOverride([FromBody] UpsertMonthlyIncomeOverrideRequest request)
    {
        if (!IsMonthYearValid(request.Month, request.Year))
            return BadRequest("Invalid month/year.");
        if (request.Amount < 0)
            return BadRequest("Amount must be >= 0.");

        var profile = await EnsureProfileAsync();
        var existing = await _db.MonthlyIncomeOverrides
            .FirstOrDefaultAsync(o => o.ProfileId == profile.Id && o.Month == request.Month && o.Year == request.Year);

        if (existing == null)
        {
            existing = new MonthlyIncomeOverride
            {
                ProfileId = profile.Id,
                Month = request.Month,
                Year = request.Year,
                Amount = request.Amount
            };
            _db.MonthlyIncomeOverrides.Add(existing);
        }
        else
        {
            existing.Amount = request.Amount;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        profile.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _db.Entry(profile).Collection(p => p.FixedExpenses).LoadAsync();

        var fixedOverrideMap = await GetFixedExpenseOverridesAsync(profile.FixedExpenses.Select(e => e.Id).ToList(), request.Month, request.Year);
        return Ok(ToDto(profile, request.Month, request.Year, existing, fixedOverrideMap));
    }

    [HttpDelete("monthly-income-override")]
    public async Task<IActionResult> DeleteMonthlyIncomeOverride([FromQuery] int month, [FromQuery] int year)
    {
        if (!IsMonthYearValid(month, year))
            return BadRequest("Invalid month/year.");

        var profile = await EnsureProfileAsync();
        var existing = await _db.MonthlyIncomeOverrides
            .FirstOrDefaultAsync(o => o.ProfileId == profile.Id && o.Month == month && o.Year == year);

        if (existing != null)
            _db.MonthlyIncomeOverrides.Remove(existing);

        profile.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _db.Entry(profile).Collection(p => p.FixedExpenses).LoadAsync();

        var fixedOverrideMap = await GetFixedExpenseOverridesAsync(profile.FixedExpenses.Select(e => e.Id).ToList(), month, year);
        return Ok(ToDto(profile, month, year, null, fixedOverrideMap));
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
        return Ok(ToDto(profile, null, null, null, new Dictionary<Guid, MonthlyFixedExpenseOverride>()));
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
        return Ok(ToDto(profile, null, null, null, new Dictionary<Guid, MonthlyFixedExpenseOverride>()));
    }

    [HttpPut("fixed-expenses/{id}/override")]
    public async Task<IActionResult> UpsertFixedExpenseOverride(Guid id, [FromBody] UpsertFixedExpenseOverrideRequest request)
    {
        if (!IsMonthYearValid(request.Month, request.Year))
            return BadRequest("Invalid month/year.");
        if (request.Amount < 0)
            return BadRequest("Amount must be >= 0.");

        var profile = await EnsureProfileAsync();
        await _db.Entry(profile).Collection(p => p.FixedExpenses).LoadAsync();

        var expense = profile.FixedExpenses.FirstOrDefault(e => e.Id == id);
        if (expense == null) return NotFound();

        var existing = await _db.MonthlyFixedExpenseOverrides
            .FirstOrDefaultAsync(o => o.FixedExpenseId == id && o.Month == request.Month && o.Year == request.Year);

        if (existing == null)
        {
            existing = new MonthlyFixedExpenseOverride
            {
                FixedExpenseId = id,
                Month = request.Month,
                Year = request.Year,
                Amount = request.Amount
            };
            _db.MonthlyFixedExpenseOverrides.Add(existing);
        }
        else
        {
            existing.Amount = request.Amount;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        profile.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var incomeOverride = await GetIncomeOverrideAsync(profile.Id, request.Month, request.Year);
        var fixedOverrideMap = await GetFixedExpenseOverridesAsync(profile.FixedExpenses.Select(e => e.Id).ToList(), request.Month, request.Year);
        return Ok(ToDto(profile, request.Month, request.Year, incomeOverride, fixedOverrideMap));
    }

    [HttpDelete("fixed-expenses/{id}/override")]
    public async Task<IActionResult> DeleteFixedExpenseOverride(Guid id, [FromQuery] int month, [FromQuery] int year)
    {
        if (!IsMonthYearValid(month, year))
            return BadRequest("Invalid month/year.");

        var profile = await EnsureProfileAsync();
        await _db.Entry(profile).Collection(p => p.FixedExpenses).LoadAsync();

        var expense = profile.FixedExpenses.FirstOrDefault(e => e.Id == id);
        if (expense == null) return NotFound();

        var existing = await _db.MonthlyFixedExpenseOverrides
            .FirstOrDefaultAsync(o => o.FixedExpenseId == id && o.Month == month && o.Year == year);

        if (existing != null)
            _db.MonthlyFixedExpenseOverrides.Remove(existing);

        profile.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var incomeOverride = await GetIncomeOverrideAsync(profile.Id, month, year);
        var fixedOverrideMap = await GetFixedExpenseOverridesAsync(profile.FixedExpenses.Select(e => e.Id).ToList(), month, year);
        return Ok(ToDto(profile, month, year, incomeOverride, fixedOverrideMap));
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

    private async Task<MonthlyIncomeOverride?> GetIncomeOverrideAsync(Guid profileId, int? month, int? year)
    {
        if (!month.HasValue || !year.HasValue)
            return null;

        return await _db.MonthlyIncomeOverrides
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.ProfileId == profileId && o.Month == month && o.Year == year);
    }

    private async Task<Dictionary<Guid, MonthlyFixedExpenseOverride>> GetFixedExpenseOverridesAsync(
        List<Guid> fixedExpenseIds,
        int? month,
        int? year)
    {
        if (!month.HasValue || !year.HasValue || fixedExpenseIds.Count == 0)
            return new Dictionary<Guid, MonthlyFixedExpenseOverride>();

        var rows = await _db.MonthlyFixedExpenseOverrides
            .AsNoTracking()
            .Where(o => fixedExpenseIds.Contains(o.FixedExpenseId) && o.Month == month && o.Year == year)
            .ToListAsync();

        return rows.ToDictionary(o => o.FixedExpenseId, o => o);
    }

    private static bool IsMonthYearValid(int month, int year)
    {
        return month is >= 1 and <= 12 && year is >= 2000 and <= 9999;
    }

    private static bool IsMonthYearValid(int? month, int? year, out int? monthValue, out int? yearValue)
    {
        monthValue = month;
        yearValue = year;

        if (!month.HasValue && !year.HasValue)
            return true;

        if (!month.HasValue || !year.HasValue)
            return false;

        return IsMonthYearValid(month.Value, year.Value);
    }

    private static BudgetProfileDto ToDto(
        FinanceBudgetProfile profile,
        int? month,
        int? year,
        MonthlyIncomeOverride? incomeOverride,
        Dictionary<Guid, MonthlyFixedExpenseOverride> fixedOverrideMap)
    {
        var effectiveIncome = incomeOverride?.Amount ?? profile.MonthlyIncome;

        return new BudgetProfileDto
        {
            Id = profile.Id,
            MonthlyIncome = profile.MonthlyIncome,
            Month = month,
            Year = year,
            EffectiveMonthlyIncome = effectiveIncome,
            IsMonthlyIncomeOverridden = incomeOverride != null,
            MonthlyIncomeOverrideAmount = incomeOverride?.Amount,
            FixedExpenses = profile.FixedExpenses
                .OrderBy(e => e.SortOrder)
                .Select(e => new FixedExpenseDto
                {
                    Id = e.Id,
                    Name = e.Name,
                    Amount = fixedOverrideMap.TryGetValue(e.Id, out var monthlyOverride) ? monthlyOverride.Amount : e.Amount,
                    DefaultAmount = e.Amount,
                    EffectiveAmount = fixedOverrideMap.TryGetValue(e.Id, out monthlyOverride) ? monthlyOverride.Amount : e.Amount,
                    IsOverridden = fixedOverrideMap.ContainsKey(e.Id),
                    OverrideAmount = fixedOverrideMap.TryGetValue(e.Id, out monthlyOverride) ? monthlyOverride.Amount : null
                })
                .ToList()
        };
    }
}
