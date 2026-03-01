using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SelfCareTemplateController : ControllerBase
{
    private readonly AppDbContext _db;

    public SelfCareTemplateController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetTemplates(Guid userId)
    {
        var items = await _db.SelfCareTemplates
            .Where(t => t.UserId == userId)
            .OrderBy(t => t.OrderIndex)
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateTemplateRequest req)
    {
        var item = new SelfCareTemplate
        {
            UserId = req.UserId,
            Category = req.Category,
            Item = req.Item,
            OrderIndex = req.OrderIndex,
        };
        _db.SelfCareTemplates.Add(item);
        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTemplate(Guid id)
    {
        var item = await _db.SelfCareTemplates.FindAsync(id);
        if (item == null) return NotFound();
        _db.SelfCareTemplates.Remove(item);
        await _db.SaveChangesAsync();
        return Ok();
    }
}

public record CreateTemplateRequest(Guid UserId, string Category, string Item, int OrderIndex);
