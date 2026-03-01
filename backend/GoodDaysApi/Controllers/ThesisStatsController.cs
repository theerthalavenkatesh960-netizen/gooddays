using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/thesis/stats")]
public class ThesisStatsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ThesisStatsController(AppDbContext db) { _db = db; }

    [HttpGet("{userId}")]
    public async Task<IActionResult> GetStats(string userId)
    {
        if (!int.TryParse(userId, out var uid)) return BadRequest("invalid user id");
        var patients = await _db.ThesisPatients.Where(p => p.UserId == uid).ToListAsync();
        var followups = await _db.ThesisFollowups.Where(f => patients.Select(p => p.Id).Contains(f.PatientId)).ToListAsync();

        var total = patients.Count;
        var dropped = patients.Count(p => p.DroppedOut);
        var dropoutPercent = total == 0 ? 0 : Math.Round(100.0 * dropped / total, 2);

        // Monthly recruitment
        var monthly = patients
            .Where(p => p.RecruitmentDate != default)
            .GroupBy(p => new { Year = p.RecruitmentDate.Year, Month = p.RecruitmentDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new { Year = g.Key.Year, Month = g.Key.Month, Count = g.Count() })
            .ToList();

        // Group distribution
        var groups = patients.GroupBy(p => string.IsNullOrEmpty(p.GroupName) ? "Unassigned" : p.GroupName)
            .Select(g => new { Group = g.Key, Count = g.Count() })
            .ToList();

        // Gender and age
        var genderDist = patients.GroupBy(p => string.IsNullOrEmpty(p.Gender) ? "Unknown" : p.Gender)
            .Select(g => new { Gender = g.Key, Count = g.Count() }).ToList();
        var ages = patients.Where(p => p.Age.HasValue).Select(p => p.Age.Value).ToList();
        var avgAge = ages.Any() ? Math.Round(ages.Average(), 1) : 0;

        // Followup completion
        var totalFollowups = followups.Count;
        var completedFollowups = followups.Count(f => f.Completed);
        var followupCompletionPercent = totalFollowups == 0 ? 0 : Math.Round(100.0 * completedFollowups / totalFollowups, 2);

        return Ok(new {
            totalRecruited = total,
            dropoutPercent,
            monthlyRecruitment = monthly,
            groupDistribution = groups,
            genderDistribution = genderDist,
            averageAge = avgAge,
            followupCompletionPercent
        });
    }

    [HttpGet("export/patients/{userId}")]
    public async Task<IActionResult> ExportPatientsCsv(string userId)
    {
        if (!int.TryParse(userId, out var uid)) return BadRequest("invalid user id");
        var patients = await _db.ThesisPatients.Where(p => p.UserId == uid).ToListAsync();
        var sb = new StringBuilder();
        sb.AppendLine("PatientCode,StudyNumber,Group,RecruitmentDate,Age,Gender,ProformaStatus,FollowupStatus,DroppedOut,Notes");
        foreach (var p in patients)
        {
            var line = string.Join(",",
                EscapeCsv(p.PatientCode),
                EscapeCsv(p.StudyNumber),
                EscapeCsv(p.GroupName),
                (p.RecruitmentDate == default ? "" : p.RecruitmentDate.ToString("yyyy-MM-dd")),
                (p.Age.HasValue ? p.Age.Value.ToString() : ""),
                EscapeCsv(p.Gender),
                EscapeCsv(p.ProformaStatus),
                EscapeCsv(p.FollowupStatus),
                (p.DroppedOut ? "1" : "0"),
                EscapeCsv(p.Notes)
            );
            sb.AppendLine(line);
        }
        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", "thesis_patients.csv");
    }

    private string EscapeCsv(string input)
    {
        if (string.IsNullOrEmpty(input)) return "";
        if (input.Contains(",") || input.Contains("\n") || input.Contains("\r") || input.Contains("\"") )
        {
            return "\"" + input.Replace("\"", "\"\"") + "\"";
        }
        return input;
    }
}
