using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

// learned correction: raw detected merchant text -> user-confirmed merchant name, applied to future emails
[Table("merchant_aliases")]
public class MerchantAlias
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [Column("raw_merchant_key")]
    [MaxLength(200)]
    public string RawMerchantKey { get; set; } = string.Empty;

    [Required]
    [Column("corrected_merchant")]
    [MaxLength(200)]
    public string CorrectedMerchant { get; set; } = string.Empty;

    [Column("corrected_category")]
    [MaxLength(60)]
    public string? CorrectedCategory { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
