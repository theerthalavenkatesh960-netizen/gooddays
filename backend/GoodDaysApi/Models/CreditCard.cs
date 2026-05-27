namespace GoodDaysApi.Models;

using System.ComponentModel.DataAnnotations.Schema;

public class CreditCard
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Issuer { get; set; } = "Other"; // HDFC, ICICI, SBI, Axis, Other
    [Column("last4_digits")]
    public string? Last4Digits { get; set; }
    public decimal? CreditLimit { get; set; }
    public int? BillingCycleStartDate { get; set; } // 1-31
    public int? BillingCycleEndDate { get; set; } // 1-31
    public decimal RewardsRate { get; set; } = 0; // percentage
    public int RewardPointsBalance { get; set; } = 0;
    public decimal CurrentBalance { get; set; } = 0;
    public string Status { get; set; } = "active"; // active, inactive, closed
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual User? User { get; set; }
    public virtual ICollection<CardExpense> CardExpenses { get; set; } = new List<CardExpense>();
}
