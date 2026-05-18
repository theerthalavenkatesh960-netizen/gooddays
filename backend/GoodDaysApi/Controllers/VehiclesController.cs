using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VehiclesController : ControllerBase
{
    private readonly AppDbContext _db;
    public VehiclesController(AppDbContext db) => _db = db;

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static object ToVehicleResponse(Vehicle v) => new
    {
        id = v.Id,
        name = v.Name,
        make = v.Make,
        model = v.Model,
        year = v.Year,
        regNo = v.RegNo,
        fuelType = v.FuelType,
        color = v.Color,
        odometer = v.Odometer,
        refills = v.Refills.OrderByDescending(r => r.Date).Select(r => ToRefillResponse(r)).ToList(),
        services = v.Services.OrderByDescending(s => s.Date).Select(s => ToServiceResponse(s)).ToList(),
        issues = v.Issues.OrderByDescending(i => i.Date).Select(i => ToIssueResponse(i)).ToList(),
    };

    private static object ToRefillResponse(VehicleRefill r) => new
    {
        id = r.Id,
        date = r.Date.ToString("yyyy-MM-dd"),
        litres = r.Litres,
        amount = r.Amount,
        odometer = r.Odometer,
        mileage = r.Mileage,
    };

    private static object ToServiceResponse(VehicleService s) => new
    {
        id = s.Id,
        date = s.Date.ToString("yyyy-MM-dd"),
        items = ParseItems(s.Items),
        cost = s.Cost,
        nextDue = s.NextDue.HasValue ? s.NextDue.Value.ToString("yyyy-MM-dd") : null,
        odometer = s.OdometerReading,
    };

    private static object ToIssueResponse(VehicleIssue i) => new
    {
        id = i.Id,
        date = i.Date.ToString("yyyy-MM-dd"),
        description = i.Description,
        resolved = i.Resolved,
    };

    private static List<string> ParseItems(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new List<string>();
        try { return JsonSerializer.Deserialize<List<string>>(raw) ?? new List<string>(); }
        catch { return raw.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).ToList(); }
    }

    private static DateTime ParseDate(string? raw) =>
        DateTime.TryParse(raw, out var d) ? DateTime.SpecifyKind(d, DateTimeKind.Utc) : DateTime.UtcNow;

    // ── Vehicles CRUD ─────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetVehicles()
    {
        var userId = GetUserId();
        var vehicles = await _db.Vehicles
            .Where(v => v.UserId == userId)
            .Include(v => v.Refills)
            .Include(v => v.Services)
            .Include(v => v.Issues)
            .OrderBy(v => v.CreatedAt)
            .ToListAsync();
        return Ok(vehicles.Select(ToVehicleResponse));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetVehicle(int id)
    {
        var userId = GetUserId();
        var v = await _db.Vehicles
            .Where(v => v.Id == id && v.UserId == userId)
            .Include(v => v.Refills)
            .Include(v => v.Services)
            .Include(v => v.Issues)
            .FirstOrDefaultAsync();
        if (v == null) return NotFound();
        return Ok(ToVehicleResponse(v));
    }

    [HttpPost]
    public async Task<IActionResult> CreateVehicle([FromBody] CreateVehicleRequest req)
    {
        var userId = GetUserId();
        var vehicle = new Vehicle
        {
            UserId = userId,
            Name = req.Name,
            Make = req.Make,
            Model = req.Model,
            Year = req.Year,
            RegNo = req.RegNo,
            FuelType = req.FuelType ?? "Petrol",
            Color = req.Color ?? "#6C63FF",
            Odometer = req.Odometer ?? 0,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Vehicles.Add(vehicle);
        await _db.SaveChangesAsync();
        // Reload with navigation props
        await _db.Entry(vehicle).Collection(v => v.Refills).LoadAsync();
        await _db.Entry(vehicle).Collection(v => v.Services).LoadAsync();
        await _db.Entry(vehicle).Collection(v => v.Issues).LoadAsync();
        return Ok(ToVehicleResponse(vehicle));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateVehicle(int id, [FromBody] CreateVehicleRequest req)
    {
        var userId = GetUserId();
        var vehicle = await _db.Vehicles
            .Where(v => v.Id == id && v.UserId == userId)
            .Include(v => v.Refills)
            .Include(v => v.Services)
            .Include(v => v.Issues)
            .FirstOrDefaultAsync();
        if (vehicle == null) return NotFound();

        vehicle.Name = req.Name ?? vehicle.Name;
        vehicle.Make = req.Make ?? vehicle.Make;
        vehicle.Model = req.Model ?? vehicle.Model;
        vehicle.Year = req.Year ?? vehicle.Year;
        vehicle.RegNo = req.RegNo ?? vehicle.RegNo;
        vehicle.FuelType = req.FuelType ?? vehicle.FuelType;
        vehicle.Color = req.Color ?? vehicle.Color;
        if (req.Odometer.HasValue) vehicle.Odometer = req.Odometer.Value;

        await _db.SaveChangesAsync();
        return Ok(ToVehicleResponse(vehicle));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteVehicle(int id)
    {
        var userId = GetUserId();
        var vehicle = await _db.Vehicles.Where(v => v.Id == id && v.UserId == userId).FirstOrDefaultAsync();
        if (vehicle == null) return NotFound();
        _db.Vehicles.Remove(vehicle);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ── Refills ───────────────────────────────────────────────────────────────

    [HttpPost("{vehicleId}/refills")]
    public async Task<IActionResult> AddRefill(int vehicleId, [FromBody] AddRefillRequest req)
    {
        var userId = GetUserId();
        var vehicle = await _db.Vehicles
            .Where(v => v.Id == vehicleId && v.UserId == userId)
            .Include(v => v.Refills)
            .FirstOrDefaultAsync();
        if (vehicle == null) return NotFound();

        // Calculate mileage if previous refill exists
        double? mileage = null;
        var lastRefill = vehicle.Refills.OrderByDescending(r => r.Date).FirstOrDefault();
        if (lastRefill != null && req.Odometer > lastRefill.Odometer && req.Litres > 0)
            mileage = Math.Round((req.Odometer - lastRefill.Odometer) / req.Litres, 1);

        var refill = new VehicleRefill
        {
            VehicleId = vehicleId,
            Date = ParseDate(req.Date),
            Litres = req.Litres,
            Amount = req.Amount,
            Odometer = req.Odometer,
            Mileage = mileage,
        };
        _db.VehicleRefills.Add(refill);

        // Update vehicle odometer if this is higher
        if (req.Odometer > vehicle.Odometer)
            vehicle.Odometer = req.Odometer;

        await _db.SaveChangesAsync();
        return Ok(ToRefillResponse(refill));
    }

    [HttpDelete("{vehicleId}/refills/{refillId}")]
    public async Task<IActionResult> DeleteRefill(int vehicleId, int refillId)
    {
        var userId = GetUserId();
        var vehicle = await _db.Vehicles.Where(v => v.Id == vehicleId && v.UserId == userId).FirstOrDefaultAsync();
        if (vehicle == null) return NotFound();
        var refill = await _db.VehicleRefills.Where(r => r.Id == refillId && r.VehicleId == vehicleId).FirstOrDefaultAsync();
        if (refill == null) return NotFound();
        _db.VehicleRefills.Remove(refill);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ── Services ──────────────────────────────────────────────────────────────

    [HttpPost("{vehicleId}/services")]
    public async Task<IActionResult> AddService(int vehicleId, [FromBody] AddServiceRequest req)
    {
        var userId = GetUserId();
        var vehicle = await _db.Vehicles.Where(v => v.Id == vehicleId && v.UserId == userId).FirstOrDefaultAsync();
        if (vehicle == null) return NotFound();

        var service = new VehicleService
        {
            VehicleId = vehicleId,
            Date = ParseDate(req.Date),
            Items = req.Items != null ? JsonSerializer.Serialize(req.Items) : null,
            Cost = req.Cost,
            NextDue = req.NextDue != null ? ParseDate(req.NextDue) : null,
            OdometerReading = req.Odometer,
        };
        _db.VehicleServices.Add(service);
        await _db.SaveChangesAsync();
        return Ok(ToServiceResponse(service));
    }

    [HttpDelete("{vehicleId}/services/{serviceId}")]
    public async Task<IActionResult> DeleteService(int vehicleId, int serviceId)
    {
        var userId = GetUserId();
        var vehicle = await _db.Vehicles.Where(v => v.Id == vehicleId && v.UserId == userId).FirstOrDefaultAsync();
        if (vehicle == null) return NotFound();
        var service = await _db.VehicleServices.Where(s => s.Id == serviceId && s.VehicleId == vehicleId).FirstOrDefaultAsync();
        if (service == null) return NotFound();
        _db.VehicleServices.Remove(service);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ── Issues ────────────────────────────────────────────────────────────────

    [HttpPost("{vehicleId}/issues")]
    public async Task<IActionResult> AddIssue(int vehicleId, [FromBody] AddIssueRequest req)
    {
        var userId = GetUserId();
        var vehicle = await _db.Vehicles.Where(v => v.Id == vehicleId && v.UserId == userId).FirstOrDefaultAsync();
        if (vehicle == null) return NotFound();

        var issue = new VehicleIssue
        {
            VehicleId = vehicleId,
            Date = ParseDate(req.Date),
            Description = req.Description ?? string.Empty,
            Resolved = req.Resolved ?? false,
        };
        _db.VehicleIssues.Add(issue);
        await _db.SaveChangesAsync();
        return Ok(ToIssueResponse(issue));
    }

    [HttpPut("{vehicleId}/issues/{issueId}")]
    public async Task<IActionResult> UpdateIssue(int vehicleId, int issueId, [FromBody] UpdateIssueRequest req)
    {
        var userId = GetUserId();
        var vehicle = await _db.Vehicles.Where(v => v.Id == vehicleId && v.UserId == userId).FirstOrDefaultAsync();
        if (vehicle == null) return NotFound();
        var issue = await _db.VehicleIssues.Where(i => i.Id == issueId && i.VehicleId == vehicleId).FirstOrDefaultAsync();
        if (issue == null) return NotFound();

        if (req.Resolved.HasValue) issue.Resolved = req.Resolved.Value;
        if (req.Description != null) issue.Description = req.Description;

        await _db.SaveChangesAsync();
        return Ok(ToIssueResponse(issue));
    }

    [HttpDelete("{vehicleId}/issues/{issueId}")]
    public async Task<IActionResult> DeleteIssue(int vehicleId, int issueId)
    {
        var userId = GetUserId();
        var vehicle = await _db.Vehicles.Where(v => v.Id == vehicleId && v.UserId == userId).FirstOrDefaultAsync();
        if (vehicle == null) return NotFound();
        var issue = await _db.VehicleIssues.Where(i => i.Id == issueId && i.VehicleId == vehicleId).FirstOrDefaultAsync();
        if (issue == null) return NotFound();
        _db.VehicleIssues.Remove(issue);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public class CreateVehicleRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Make { get; set; }
    public string? Model { get; set; }
    public int? Year { get; set; }
    public string? RegNo { get; set; }
    public string? FuelType { get; set; }
    public string? Color { get; set; }
    public int? Odometer { get; set; }
}

public class AddRefillRequest
{
    public string? Date { get; set; }
    public double Litres { get; set; }
    public double Amount { get; set; }
    public int Odometer { get; set; }
}

public class AddServiceRequest
{
    public string? Date { get; set; }
    public List<string>? Items { get; set; }
    public double Cost { get; set; }
    public string? NextDue { get; set; }
    public int? Odometer { get; set; }
}

public class AddIssueRequest
{
    public string? Date { get; set; }
    public string? Description { get; set; }
    public bool? Resolved { get; set; }
}

public class UpdateIssueRequest
{
    public bool? Resolved { get; set; }
    public string? Description { get; set; }
}
