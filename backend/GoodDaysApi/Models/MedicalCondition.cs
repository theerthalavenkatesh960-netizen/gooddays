using System.Text.Json.Serialization;

namespace GoodDaysApi.Models;

public class MedicalCondition
{
    [JsonPropertyName("condition_name")]
    public string ConditionName { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "active"; // active | controlled | history

    [JsonPropertyName("severity")]
    public string Severity { get; set; } = "mild"; // mild | moderate | severe

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("diet_restrictions")]
    public List<string> DietRestrictions { get; set; } = new();

    [JsonPropertyName("exercise_limits")]
    public List<string> ExerciseLimits { get; set; } = new();

    [JsonPropertyName("medications_affecting_plan")]
    public List<string> MedicationsAffectingPlan { get; set; } = new();
}
