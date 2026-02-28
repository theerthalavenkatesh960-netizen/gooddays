using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("user_profiles")]
public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    // login credentials (local database)
    [Required]
    public string Email { get; set; } = string.Empty;
    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    // profile fields defined in supabase migration
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? GoogleId { get; set; }
    public int Level { get; set; } = 1;
    public int Points { get; set; } = 0;
    public string Theme { get; set; } = "light";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
