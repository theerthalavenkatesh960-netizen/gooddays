using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("bucket_contributions")]
public class BucketContribution
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("bucket_id")]
    public Guid BucketId { get; set; }

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("note")]
    [MaxLength(500)]
    public string? Note { get; set; }

    [Column("contribution_date")]
    public DateTime ContributionDate { get; set; } = DateTime.UtcNow;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public InvestmentBucket? Bucket { get; set; }
}
