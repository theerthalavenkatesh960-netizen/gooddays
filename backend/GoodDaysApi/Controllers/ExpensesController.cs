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
            Description = req.Description ?? req.Note ?? string.Empty,
            Amount = req.Amount,
            Category = req.Category,
            Date = req.Date ?? DateTime.UtcNow
        };
        _db.Expenses.Add(expense);
        await _db.SaveChangesAsync();
        return Ok(expense);
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> BulkCreateExpenses([FromBody] List<BulkExpenseItem> items)
    {
        if (items == null || items.Count == 0)
            return Ok(new { count = 0, cardIdMap = new Dictionary<Guid, int>() });

        var createdExpenses = new List<Expense>();
        var cardIdMap = new Dictionary<Guid, int>();

        foreach (var item in items)
        {
            var expense = new Expense
            {
                UserId = item.Expense.UserId,
                Description = item.Expense.Description ?? item.Expense.Note ?? string.Empty,
                Amount = item.Expense.Amount,
                Category = item.Expense.Category,
                Date = item.Expense.Date ?? DateTime.UtcNow
            };
            _db.Expenses.Add(expense);
            createdExpenses.Add(expense);
        }

        await _db.SaveChangesAsync();

        // Now link expenses to cards if card_id is provided
        for (int i = 0; i < items.Count; i++)
        {
            if (items[i].CardId.HasValue && items[i].CardId != Guid.Empty)
            {
                var cardExpense = new CardExpense
                {
                    CardId = items[i].CardId.Value,
                    ExpenseId = createdExpenses[i].Id,
                    AssignedAt = DateTime.UtcNow
                };
                _db.CardExpenses.Add(cardExpense);

                // Track count per card
                if (!cardIdMap.ContainsKey(items[i].CardId.Value))
                    cardIdMap[items[i].CardId.Value] = 0;
                cardIdMap[items[i].CardId.Value]++;
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new { count = createdExpenses.Count, cardIdMap });
    }


    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateExpense(int id, [FromBody] UpdateExpenseRequest req)
    {
        var expense = await _db.Expenses.FindAsync(id);
        if (expense == null) return NotFound();
        
        expense.Description = req.Description ?? req.Note ?? expense.Description;
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

public record CreateExpenseRequest(int UserId, string? Description, string? Note, decimal Amount, string? Category, DateTime? Date);
public record UpdateExpenseRequest(string? Description, string? Note, decimal? Amount, string? Category, DateTime? Date);
public record BulkExpenseItem(CreateExpenseRequest Expense, Guid? CardId);
