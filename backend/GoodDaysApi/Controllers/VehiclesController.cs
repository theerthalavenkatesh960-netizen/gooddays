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
    private const double MinimumGapDistanceKm = 2000;
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
        pricePerLitre = r.PricePerLitre,
        odometer = r.Odometer,
        mileage = r.Mileage,
        rangeLeft = r.RangeLeft,
        gapDetected = r.GapDetected,
        isEstimated = r.IsEstimated,
        mileageConfidence = r.MileageConfidence,
        estimatedFuelUsed = r.EstimatedFuelUsed,
        estimatedFuelCost = r.EstimatedFuelCost,
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

        if ((!req.Litres.HasValue || req.Litres <= 0) && (!req.Amount.HasValue || req.Amount <= 0))
            return BadRequest("At least one of litres or amount must be greater than zero.");
        if (req.Litres.HasValue && req.Litres <= 0 || req.Amount.HasValue && req.Amount <= 0 || req.PricePerLitre.HasValue && req.PricePerLitre <= 0)
            return BadRequest("Fuel values must be greater than zero when provided.");

        var litres = req.Litres;
        var amount = req.Amount;
        var pricePerLitre = req.PricePerLitre;
        if (!pricePerLitre.HasValue && litres.HasValue && amount.HasValue)
            pricePerLitre = amount.Value / litres.Value;
        if (!litres.HasValue && amount.HasValue && pricePerLitre.HasValue)
            litres = amount.Value / pricePerLitre.Value;
        if (!amount.HasValue && litres.HasValue && pricePerLitre.HasValue)
            amount = litres.Value * pricePerLitre.Value;

        var history = vehicle.Refills.OrderByDescending(r => r.Date).ToList();
        var lastRefill = history.FirstOrDefault();
        var distance = lastRefill != null && req.Odometer > lastRefill.Odometer ? req.Odometer - lastRefill.Odometer : 0;
        var priorIntervals = history.Zip(history.Skip(1), (newer, older) => newer.Odometer - older.Odometer)
            .Where(interval => interval > 0).OrderBy(interval => interval).ToList();
        var medianInterval = priorIntervals.Count == 0 ? 0 : priorIntervals.Count % 2 == 1
            ? priorIntervals[priorIntervals.Count / 2]
            : (priorIntervals[priorIntervals.Count / 2 - 1] + priorIntervals[priorIntervals.Count / 2]) / 2.0;
        var gapDetected = distance > Math.Max(MinimumGapDistanceKm, medianInterval > 0 ? medianInterval * 2 : MinimumGapDistanceKm);
        var confirmedMileages = history.Where(r => r.Mileage.HasValue && r.Mileage > 0)
            .OrderByDescending(r => r.Date).Take(3).Select(r => r.Mileage!.Value).ToList();
        var rollingMileage = confirmedMileages.Count > 0 ? confirmedMileages.Average() : (double?)null;
        var latestPrice = pricePerLitre ?? history.FirstOrDefault(r => r.PricePerLitre.HasValue)?.PricePerLitre;
        double? mileage = null;
        double? estimatedFuelUsed = null;
        double? estimatedFuelCost = null;
        var isEstimated = false;
        if (gapDetected && rollingMileage.HasValue)
        {
            mileage = Math.Round(rollingMileage.Value, 1);
            estimatedFuelUsed = Math.Round(distance / rollingMileage.Value, 2);
            estimatedFuelCost = latestPrice.HasValue ? Math.Round(estimatedFuelUsed.Value * latestPrice.Value, 2) : null;
            isEstimated = true;
        }
        else if (lastRefill != null && distance > 0 && litres.HasValue)
        {
            mileage = Math.Round(distance / litres.Value, 1);
        }

        var refill = new VehicleRefill
        {
            VehicleId = vehicleId,
            Date = ParseDate(req.Date),
            Litres = litres,
            Amount = amount,
            PricePerLitre = pricePerLitre,
            Odometer = req.Odometer,
            Mileage = mileage,
            RangeLeft = req.RangeLeft,
            GapDetected = gapDetected,
            IsEstimated = isEstimated,
            MileageConfidence = gapDetected ? (rollingMileage.HasValue ? "estimated" : "low") : mileage.HasValue ? "confirmed" : null,
            EstimatedFuelUsed = estimatedFuelUsed,
            EstimatedFuelCost = estimatedFuelCost,
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

    [HttpGet("{vehicleId}/fuel-candidates")]
    public async Task<IActionResult> FuelCandidates(int vehicleId)
    {
        var userId = GetUserId();
        var vehicle = await _db.Vehicles
            .Where(v => v.Id == vehicleId && v.UserId == userId)
            .Include(v => v.Refills)
            .FirstOrDefaultAsync();
        if (vehicle == null) return NotFound();

        var fuelExpenses = await _db.Expenses.AsNoTracking()
            .Where(x => x.UserId == userId
                        && (x.Category == "Fuel"
                            || x.Description.ToLower().Contains("petrol")
                            || x.Description.ToLower().Contains("fuel")
                            || x.Description.ToLower().Contains("diesel")
                            || x.Description.ToLower().Contains("hpcl")
                            || x.Description.ToLower().Contains("hindustan petroleum")
                            || x.Description.ToLower().Contains("bharat petroleum")
                            || x.Description.ToLower().Contains("bpcl")
                            || x.Description.ToLower().Contains("indian oil")
                            || x.Description.ToLower().Contains("indianoil")
                            || x.Description.ToLower().Contains("iocl")
                            || x.Description.ToLower().Contains("shell")
                            || x.Description.ToLower().Contains("reliance petrol")
                            || x.Description.ToLower().Contains("reliance petroleum")
                            || x.Description.ToLower().Contains("jio-bp")
                            || x.Description.ToLower().Contains("jiobp")
                            || x.Description.ToLower().Contains("nayara")
                            || x.Description.ToLower().Contains("essar")
                            || x.Description.ToLower().Contains("mrpl")
                            || x.Description.ToLower().Contains("petrol pump")
                            || x.Description.ToLower().Contains("filling station")
                            || x.Description.ToLower().Contains("fuel station")
                            || x.Description.ToLower().Contains("service station")
                            || x.Description.ToLower().Contains("fuel bunk"))
                        && x.Amount > 0
                        && x.Date != null)
            .OrderByDescending(x => x.Date)
            .Take(100)
            .Select(x => new { x.Id, x.Description, x.Amount, x.Date, x.Category, x.SourceType })
            .ToListAsync();

        var candidates = fuelExpenses.Where(expense => !vehicle.Refills.Any(refill =>
            refill.Amount.HasValue
            && Math.Abs(refill.Amount.Value - (double)expense.Amount) < 0.01
            && Math.Abs((refill.Date.Date - expense.Date!.Value.Date).TotalDays) <= 1))
            .Select(x => new
            {
                id = x.Id,
                description = x.Description,
                amount = x.Amount,
                date = x.Date,
                sourceType = x.SourceType
            });

        return Ok(candidates);
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
    public double? Litres { get; set; }
    public double? Amount { get; set; }
    public double? PricePerLitre { get; set; }
    public int Odometer { get; set; }
    public double? RangeLeft { get; set; }
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
