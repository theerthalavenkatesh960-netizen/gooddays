using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UserProfilesController : ControllerBase
{
    private readonly AppDbContext _db;

    public UserProfilesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProfile(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        return Ok(new { id = user.Id, email = user.Email, name = user.Name });
    }

    [HttpPost]
    public async Task<IActionResult> CreateProfile([FromBody] CreateProfileRequest req)
    {
        var user = new User { Email = req.Email, Name = req.Name, PasswordHash = req.PasswordHash ?? string.Empty };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return Ok(new { id = user.Id, email = user.Email, name = user.Name });
    }
}

public record CreateProfileRequest(string Email, string? Name, string? PasswordHash);
