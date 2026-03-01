using System;
using System.Threading.Tasks;
using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/thesis/followups")]
public class FollowupsController : ControllerBase
{
    private readonly AppDbContext _db;
    public FollowupsController(AppDbContext db) { _db = db; }

    [HttpGet("patient/{patientId}")]
    public async Task<IActionResult> GetByPatient(Guid patientId)
    {
        var list = await _db.ThesisFollowups.Where(f => f.PatientId == patientId).ToListAsync();
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ThesisFollowup f)
    {
        f.Id = Guid.NewGuid();
        _db.ThesisFollowups.Add(f);
        await _db.SaveChangesAsync();
        return Ok(f);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ThesisFollowup body)
    {
        var f = await _db.ThesisFollowups.FindAsync(id);
        if (f == null) return NotFound();
        f.Date = body.Date;
        f.Completed = body.Completed;
        f.Notes = body.Notes;
        f.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(f);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var f = await _db.ThesisFollowups.FindAsync(id);
        if (f == null) return NotFound();
        _db.ThesisFollowups.Remove(f);
        await _db.SaveChangesAsync();
        return Ok();
    }
}
