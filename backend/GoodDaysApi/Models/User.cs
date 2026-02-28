using System.ComponentModel.DataAnnotations;

namespace GoodDaysApi.Models;

public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required]
    public string Email { get; set; } = string.Empty;
    [Required]
    public string PasswordHash { get; set; } = string.Empty;
    public string? Name { get; set; }
}
