using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GoodDaysApi.Services;

public interface IClerkAuthService
{
    Task<User> GetOrCreateUserFromClerkAsync(string clerkId, string email, string? name = null);
}

public class ClerkAuthService : IClerkAuthService
{
    private readonly AppDbContext _db;
    private readonly IUserSeederService _seederService;
    private readonly ILogger<ClerkAuthService> _logger;

    public ClerkAuthService(AppDbContext db, IUserSeederService seederService, ILogger<ClerkAuthService> logger)
    {
        _db = db;
        _seederService = seederService;
        _logger = logger;
    }

    public async Task<User> GetOrCreateUserFromClerkAsync(string clerkId, string email, string? name = null)
    {
        // Try to find existing user by ClerkId first
        var user = await _db.Users.FirstOrDefaultAsync(u => u.ClerkId == clerkId);
        if (user != null)
        {
            _logger.LogInformation("Found existing user by ClerkId: {UserId}", user.Id);
            return user;
        }

        // Try to find existing user by email
        user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user != null)
        {
            // Link Clerk ID to existing user
            user.ClerkId = clerkId;
            await _db.SaveChangesAsync();
            _logger.LogInformation("Linked ClerkId to existing user: {UserId}", user.Id);
            return user;
        }

        // Create new user
        user = new User
        {
            Email = email,
            Name = name ?? email.Split('@')[0],
            ClerkId = clerkId,
            PasswordHash = "", // Empty password for Clerk-authenticated users
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Created new user from Clerk: {UserId}", user.Id);

        // Seed user libraries on first creation
        try
        {
            await _seederService.SeedUserLibrariesAsync(user.Id);
            _logger.LogInformation("Successfully seeded libraries for new Clerk user {UserId}", user.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to seed libraries for Clerk user {UserId}", user.Id);
            // Don't throw - user is still created, just without seeded data
        }

        return user;
    }
}
