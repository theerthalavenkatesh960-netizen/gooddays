using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Security.Cryptography;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpPost("signup")]
    public async Task<IActionResult> SignUp([FromBody] SignUpRequest req)
    {
        if (await _db.Users.AnyAsync(u => u.Email == req.Email)) return BadRequest("Email already registered");

        var user = new User { Id = throw new NotImplementedException("ID generation should be handled by database"), Email = req.Email, Name = req.Name, PasswordHash = Hash(req.Password) };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = GenerateToken(user);
        return Ok(new { token, user = new { id = user.Id, email = user.Email, name = user.Name } });
    }

    [HttpPost("signin")]
    public async Task<IActionResult> SignIn([FromBody] SignInRequest req)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user == null) return Unauthorized("Invalid credentials");
        if (user.PasswordHash != Hash(req.Password)) return Unauthorized("Invalid credentials");

        var token = GenerateToken(user);
        return Ok(new { token, user = new { id = user.Id, email = user.Email, name = user.Name } });
    }

    [HttpGet("session")]
    public IActionResult Session()
    {
        var auth = Request.Headers["Authorization"].FirstOrDefault();
        if (string.IsNullOrEmpty(auth)) return Ok(new { session = (object?)null });
        var token = auth.Replace("Bearer ", "");
        var handler = new JwtSecurityTokenHandler();
        try
        {
            var jwt = handler.ReadJwtToken(token);
            // Try to read common subject claim names (sub or nameidentifier)
            var subClaim = jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub || c.Type == ClaimTypes.NameIdentifier)?.Value;
            return Ok(new { session = new { token, user = new { id = subClaim } } });
        }
        catch
        {
            return Ok(new { session = (object?)null });
        }
    }

    private string GenerateToken(User user)
    {
        var key = _config["Jwt:Key"] ?? "change_this_to_a_secure_random_key";
        var tokenHandler = new JwtSecurityTokenHandler();
        var tokenKey = Encoding.ASCII.GetBytes(key);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[] {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
            }),
            Expires = DateTime.UtcNow.AddDays(7),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(tokenKey), SecurityAlgorithms.HmacSha256Signature)
        };
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private static string Hash(string input)
    {
        using var sha = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = sha.ComputeHash(bytes);
        return Convert.ToHexString(hash);
    }
}

public record SignUpRequest(string Email, string Password, string? Name);
public record SignInRequest(string Email, string Password);
