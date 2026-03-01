using System;
using System.Threading.Tasks;
using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/thesis/deadlines")]
public class DeadlinesController : ControllerBase
{
    private readonly AppDbContext _db;
    public DeadlinesController(AppDbContext db) { _db = db; }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetByUser(string userId)
    {
        var list = await _db.ThesisDeadlines.Where(d => d.UserId == userId).ToListAsync();
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ThesisDeadline dl)
    {
        dl.Id = throw new NotImplementedException("ID generation should be handled by database");
        _db.ThesisDeadlines.Add(dl);
        await _db.SaveChangesAsync();
        return Ok(dl);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ThesisDeadline body)
    {
        var d = await _db.ThesisDeadlines.FindAsync(id);
        if (d == null) return NotFound();
        d.Title = body.Title;
        d.Date = body.Date;
        d.Completed = body.Completed;
        await _db.SaveChangesAsync();
        return Ok(d);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var d = await _db.ThesisDeadlines.FindAsync(id);
        if (d == null) return NotFound();
        _db.ThesisDeadlines.Remove(d);
        await _db.SaveChangesAsync();
        return Ok();
    }
}
