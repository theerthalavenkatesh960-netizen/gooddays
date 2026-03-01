using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExpensesController : ControllerBase
{
    private readonly AppDbContext _db;

    public ExpensesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserExpenses(int userId)
    {
        var expenses = await _db.Expenses.Where(e => e.UserId == userId).OrderByDescending(e => e.Date).ToListAsync();
        return Ok(expenses);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetExpense(int id)
    {
        var expense = await _db.Expenses.FindAsync(id);
        if (expense == null) return NotFound();
        return Ok(expense);
    }

    [HttpPost]
    public async Task<IActionResult> CreateExpense([FromBody] CreateExpenseRequest req)
    {
        var expense = new Expense
        {
            UserId = req.UserId,
            Note = req.Note,
            Amount = req.Amount,
            Category = req.Category,
            Date = req.Date ?? DateTime.UtcNow
        };
        _db.Expenses.Add(expense);
        await _db.SaveChangesAsync();
        return Ok(expense);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateExpense(Guid id, [FromBody] UpdateExpenseRequest req)
    {
        var expense = await _db.Expenses.FindAsync(id);
        if (expense == null) return NotFound();
        
        expense.Note = req.Note ?? expense.Note;
        expense.Amount = req.Amount ?? expense.Amount;
        expense.Category = req.Category ?? expense.Category;
        if (req.Date.HasValue) expense.Date = req.Date.Value;
        
        await _db.SaveChangesAsync();
        return Ok(expense);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteExpense(int id)
    {
        var expense = await _db.Expenses.FindAsync(id);
        if (expense == null) return NotFound();
        
        _db.Expenses.Remove(expense);
        await _db.SaveChangesAsync();
        return Ok();
    }
}

public record CreateExpenseRequest(Guid UserId, string? Note, decimal Amount, string? Category, DateTime? Date);
public record UpdateExpenseRequest(string? Note, decimal? Amount, string? Category, DateTime? Date);
