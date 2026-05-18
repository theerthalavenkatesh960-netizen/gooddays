using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("vehicles")]
public class Vehicle
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("make")]
    public string? Make { get; set; }

    [Column("model")]
    public string? Model { get; set; }

    [Column("year")]
    public int? Year { get; set; }

    [Column("reg_no")]
    public string? RegNo { get; set; }

    [Column("fuel_type")]
    public string FuelType { get; set; } = "Petrol";

    [Column("color")]
    public string Color { get; set; } = "#6C63FF";

    [Column("odometer")]
    public int Odometer { get; set; } = 0;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<VehicleRefill> Refills { get; set; } = new List<VehicleRefill>();
    public ICollection<VehicleService> Services { get; set; } = new List<VehicleService>();
    public ICollection<VehicleIssue> Issues { get; set; } = new List<VehicleIssue>();
}

[Table("vehicle_refills")]
public class VehicleRefill
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("vehicle_id")]
    public int VehicleId { get; set; }

    [Column("date")]
    public DateTime Date { get; set; } = DateTime.UtcNow;

    [Column("litres")]
    public double Litres { get; set; }

    [Column("amount")]
    public double Amount { get; set; }

    [Column("odometer")]
    public int Odometer { get; set; }

    [Column("mileage")]
    public double? Mileage { get; set; }

    public Vehicle? Vehicle { get; set; }
}

[Table("vehicle_services")]
public class VehicleService
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("vehicle_id")]
    public int VehicleId { get; set; }

    [Column("date")]
    public DateTime Date { get; set; } = DateTime.UtcNow;

    [Column("items")]
    public string? Items { get; set; }  // JSON array stored as text

    [Column("cost")]
    public double Cost { get; set; }

    [Column("next_due")]
    public DateTime? NextDue { get; set; }

    [Column("odometer")]
    public int? OdometerReading { get; set; }

    public Vehicle? Vehicle { get; set; }
}

[Table("vehicle_issues")]
public class VehicleIssue
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("vehicle_id")]
    public int VehicleId { get; set; }

    [Column("date")]
    public DateTime Date { get; set; } = DateTime.UtcNow;

    [Column("description")]
    public string Description { get; set; } = string.Empty;

    [Column("resolved")]
    public bool Resolved { get; set; } = false;

    public Vehicle? Vehicle { get; set; }
}
