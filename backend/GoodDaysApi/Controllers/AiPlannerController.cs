using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using GoodDaysApi.Data;
using GoodDaysApi.Models;
using GoodDaysApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Controllers;

[ApiController]
[Authorize]
[Route("api/ai-planner")]
public class AiPlannerController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AiService _aiService;

    public AiPlannerController(AppDbContext db, IHttpClientFactory httpClientFactory, AiService aiService)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _aiService = aiService;
    }

    private int GetUserId() => int.Parse(
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("User id claim missing"));

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var userId = GetUserId();
        var settings = await _db.UserAiSettings.FirstOrDefaultAsync(s => s.UserId == userId);
        if (settings is null)
        {
            return Ok(new
            {
                provider = "local-llama",
                localEndpoint = "http://localhost:11434",
                localModel = "llama3.1:8b",
                claudeApiKey = "",
                claudeModel = "claude-3-5-sonnet-latest",
            });
        }

        return Ok(new
        {
            provider = settings.Provider,
            localEndpoint = settings.LocalEndpoint,
            localModel = settings.LocalModel,
            claudeApiKey = settings.ClaudeApiKey ?? "",
            claudeModel = settings.ClaudeModel,
        });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpsertSettings([FromBody] UpsertAiSettingsRequest req)
    {
        var userId = GetUserId();
        var provider = string.IsNullOrWhiteSpace(req.Provider) ? "local-llama" : req.Provider.Trim().ToLowerInvariant();
        if (provider != "local-llama" && provider != "claude")
        {
            return BadRequest("Provider must be either 'local-llama' or 'claude'.");
        }

        var endpoint = string.IsNullOrWhiteSpace(req.LocalEndpoint) ? "http://localhost:11434" : req.LocalEndpoint.Trim();
        var localModel = string.IsNullOrWhiteSpace(req.LocalModel) ? "llama3.1:8b" : req.LocalModel.Trim();
        var claudeModel = string.IsNullOrWhiteSpace(req.ClaudeModel) ? "claude-3-5-sonnet-latest" : req.ClaudeModel.Trim();

        var settings = await _db.UserAiSettings.FirstOrDefaultAsync(s => s.UserId == userId);
        if (settings is null)
        {
            settings = new UserAiSetting
            {
                UserId = userId,
                Provider = provider,
                LocalEndpoint = endpoint,
                LocalModel = localModel,
                ClaudeApiKey = string.IsNullOrWhiteSpace(req.ClaudeApiKey) ? null : req.ClaudeApiKey.Trim(),
                ClaudeModel = claudeModel,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.UserAiSettings.Add(settings);
        }
        else
        {
            settings.Provider = provider;
            settings.LocalEndpoint = endpoint;
            settings.LocalModel = localModel;
            settings.ClaudeApiKey = string.IsNullOrWhiteSpace(req.ClaudeApiKey) ? settings.ClaudeApiKey : req.ClaudeApiKey.Trim();
            settings.ClaudeModel = claudeModel;
            settings.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            provider = settings.Provider,
            localEndpoint = settings.LocalEndpoint,
            localModel = settings.LocalModel,
            claudeApiKey = settings.ClaudeApiKey ?? "",
            claudeModel = settings.ClaudeModel,
        });
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetUserId();
        var profile = await _db.UserHealthProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile is null)
        {
            return Ok(new
            {
                age = (int?)null,
                gender = (string?)null,
                heightCm = (decimal?)null,
                weightKg = (decimal?)null,
                targetWeightKg = (decimal?)null,
                dailyCaloriesTarget = (int?)null,
                dietPreference = (string?)null,
                budgetPerWeek = (decimal?)null,
                activityLevel = (string?)null,
                medicalConditions = Array.Empty<MedicalCondition>(),
                targetDate = (string?)null,
            });
        }

        return Ok(new
        {
            age = profile.Age,
            gender = profile.Gender,
            heightCm = profile.HeightCm,
            weightKg = profile.WeightKg,
            targetWeightKg = profile.TargetWeightKg,
            dailyCaloriesTarget = profile.DailyCaloriesTarget,
            dietPreference = profile.DietPreference,
            budgetPerWeek = profile.BudgetPerWeek,
            activityLevel = profile.ActivityLevel,
            medicalConditions = ParseMedicalConditions(profile.MedicalConditions),
            targetDate = profile.TargetDate.HasValue ? profile.TargetDate.Value.ToString("yyyy-MM-dd") : (string?)null,
        });
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpsertProfile([FromBody] UpsertHealthProfileRequest req)
    {
        var userId = GetUserId();
        var profile = await _db.UserHealthProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile is null)
        {
            profile = new UserHealthProfile
            {
                UserId = userId,
            };
            _db.UserHealthProfiles.Add(profile);
        }

        profile.Age = req.Age;
        profile.Gender = string.IsNullOrWhiteSpace(req.Gender) ? null : req.Gender.Trim();
        profile.HeightCm = req.HeightCm;
        profile.WeightKg = req.WeightKg;
        profile.TargetWeightKg = req.TargetWeightKg;
        profile.DailyCaloriesTarget = req.DailyCaloriesTarget;
        profile.DietPreference = string.IsNullOrWhiteSpace(req.DietPreference) ? null : req.DietPreference.Trim();
        profile.BudgetPerWeek = req.BudgetPerWeek;
        profile.ActivityLevel = string.IsNullOrWhiteSpace(req.ActivityLevel) ? null : req.ActivityLevel.Trim();
        profile.MedicalConditions = SerializeMedicalConditions(req.MedicalConditions);
        profile.TargetDate = DateOnly.TryParse(req.TargetDate, out var td) ? td : (DateOnly?)null;
        profile.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            age = profile.Age,
            gender = profile.Gender,
            heightCm = profile.HeightCm,
            weightKg = profile.WeightKg,
            targetWeightKg = profile.TargetWeightKg,
            dailyCaloriesTarget = profile.DailyCaloriesTarget,
            dietPreference = profile.DietPreference,
            budgetPerWeek = profile.BudgetPerWeek,
            activityLevel = profile.ActivityLevel,
            medicalConditions = ParseMedicalConditions(profile.MedicalConditions),
            targetDate = profile.TargetDate.HasValue ? profile.TargetDate.Value.ToString("yyyy-MM-dd") : (string?)null,
        });
    }

    [HttpPost("generate/meals")]
    public async Task<IActionResult> GenerateMeals([FromBody] GenerateMealsRequest req)
    {
        var userId = GetUserId();
        var settings = await _db.UserAiSettings.FirstOrDefaultAsync(s => s.UserId == userId);
        var profile = await _db.UserHealthProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

        var templates = await _db.MealTemplates
            .Where(m => m.UserId == userId)
            .OrderBy(m => m.Id)
            .ToListAsync();

        if (templates.Count == 0)
        {
            return BadRequest("No meal templates found. Add meals before generating AI plan.");
        }

        var start = DateOnly.TryParse(req.StartDate, out var parsed)
            ? parsed
            : DateOnly.FromDateTime(DateTime.UtcNow);

        var prompt = BuildMealPrompt(start, req, profile, templates);
        var rawText = await InvokeProvider(settings, prompt, "meal-plan");
        var parsedPlan = ParseMealPlan(ParseJsonObject(rawText));

        var validIds = templates.Select(t => t.Id).ToHashSet();
        var sanitized = new Dictionary<string, List<object>>();
        foreach (var kv in parsedPlan)
        {
            var key = NormalizeDateKey(kv.Key);
            if (string.IsNullOrWhiteSpace(key)) continue;

            var items = kv.Value
                .Where(m => validIds.Contains(m.MealTemplateId))
                .Select(m => (object)new { mealTemplateId = m.MealTemplateId, timeOfDay = m.TimeOfDay })
                .ToList();
            if (items.Count > 0) sanitized[key] = items;
        }

        if (sanitized.Count == 0) return BadRequest("AI output did not reference valid meal template IDs.");

        return Ok(new
        {
            source = "ai",
            provider = settings?.Provider ?? "local-llama",
            mode = string.IsNullOrWhiteSpace(req.Mode) ? "profile" : req.Mode,
            plan = sanitized,
        });
    }

    [HttpPost("generate/workouts")]
    public async Task<IActionResult> GenerateWorkouts([FromBody] GenerateWorkoutsRequest req)
    {
        var userId = GetUserId();
        var settings = await _db.UserAiSettings.FirstOrDefaultAsync(s => s.UserId == userId);
        var profile = await _db.UserHealthProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

        var exercises = await _db.Exercises
            .Where(e => e.UserId == userId || !e.IsCustom)
            .OrderBy(e => e.Id)
            .ToListAsync();

        if (exercises.Count == 0)
        {
            return BadRequest("No exercises found. Add exercises before generating AI routine.");
        }

        var prompt = BuildWorkoutPrompt(req, profile, exercises);
        var rawText = await InvokeProvider(settings, prompt, "workout-routine");
        var parsedRoutine = ParseWorkoutRoutine(ParseJsonObject(rawText));

        var validIds = exercises.Select(e => e.Id).ToHashSet();
        var allowedDays = new HashSet<string>(new[] { "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday" });
        var sanitized = new Dictionary<string, List<object>>();

        foreach (var kv in parsedRoutine)
        {
            var day = (kv.Key ?? string.Empty).Trim().ToLowerInvariant();
            if (!allowedDays.Contains(day)) continue;

            var entries = kv.Value
                .Where(v => validIds.Contains(v.ExerciseId))
                .Select(v => (object)new
                {
                    exerciseId = v.ExerciseId,
                    sets = Math.Max(1, v.Sets <= 0 ? 3 : v.Sets),
                    reps = Math.Max(1, v.Reps <= 0 ? 10 : v.Reps),
                })
                .ToList();

            if (entries.Count > 0) sanitized[day] = entries;
        }

        if (sanitized.Count == 0) return BadRequest("AI output did not reference valid exercise IDs.");

        return Ok(new
        {
            source = "ai",
            provider = settings?.Provider ?? "local-llama",
            mode = string.IsNullOrWhiteSpace(req.Mode) ? "profile" : req.Mode,
            routine = sanitized,
        });
    }

    [HttpPost("recommend-health")]
    public async Task<IActionResult> RecommendHealth([FromBody] RecommendHealthRequest req)
    {
        var userId = GetUserId();
        var settings = await _db.UserAiSettings.FirstOrDefaultAsync(s => s.UserId == userId);
        var profile = await _db.UserHealthProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

        var heightCm = req.HeightCm.HasValue
            ? (int?)Math.Round(req.HeightCm.Value)
            : (profile?.HeightCm.HasValue == true ? (int?)Math.Round(profile.HeightCm.Value) : null);
        var currentWeight = req.WeightKg ?? profile?.WeightKg;
        var targetWeight = req.TargetWeightKg ?? profile?.TargetWeightKg;

        var missingFields = new List<string>();
        if (!heightCm.HasValue) missingFields.Add("heightCm");
        if (!currentWeight.HasValue) missingFields.Add("weightKg");
        if (!targetWeight.HasValue) missingFields.Add("targetWeightKg");

        if (missingFields.Count > 0)
        {
            return BadRequest(new
            {
                message = $"Missing required fields: {string.Join(", ", missingFields)}.",
                missingFields,
            });
        }

        var currentWeightValue = currentWeight.GetValueOrDefault();
        var targetWeightValue = targetWeight.GetValueOrDefault();

        var targetDate = DateTime.UtcNow.Date.AddDays(90);
        var targetDateString = req.TargetDate
            ?? (profile?.TargetDate.HasValue == true ? profile.TargetDate.Value.ToString("yyyy-MM-dd") : null);
        if (!string.IsNullOrWhiteSpace(targetDateString) && DateTime.TryParse(targetDateString, out var parsedDate))
        {
            targetDate = parsedDate;
        }

        var recommendation = await _aiService.GetHealthRecommendations(
            settings,
            heightCm,
            currentWeightValue,
            targetWeightValue,
            targetDate,
            req.Age ?? profile?.Age,
            req.Gender ?? profile?.Gender,
            req.ActivityLevel ?? profile?.ActivityLevel,
            req.MedicalConditions ?? ParseMedicalConditions(profile?.MedicalConditions),
            req.DietPreference ?? profile?.DietPreference);

        var recommendedBudget = profile?.BudgetPerWeek ?? 2000m;
        var recommendedDietPreference = profile?.DietPreference ?? "Mixed";

        return Ok(new
        {
            dailyCaloriesTarget = recommendation.RecommendedDailyCalories,
            budgetPerWeek = recommendedBudget,
            activityLevel = recommendation.RecommendedActivityLevel,
            dietPreference = recommendedDietPreference,
            rationale = recommendation.Rationale,
            feasible = recommendation.Feasible,
            goalType = recommendation.GoalType,
            analysis = recommendation.Analysis,
        });
    }

    private async Task<string> InvokeProvider(UserAiSetting? settings, string prompt, string purpose)
    {
        var provider = (settings?.Provider ?? "local-llama").Trim().ToLowerInvariant();
        if (provider == "claude") return await InvokeClaude(settings, prompt, purpose);
        return await InvokeLocalLlama(settings, prompt, purpose);
    }

    private async Task<string> InvokeLocalLlama(UserAiSetting? settings, string prompt, string purpose)
    {
        var endpoint = string.IsNullOrWhiteSpace(settings?.LocalEndpoint) ? "http://localhost:11434" : settings!.LocalEndpoint.Trim();
        var url = endpoint.TrimEnd('/') + "/api/generate";

        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(120);

        var payload = new
        {
            model = string.IsNullOrWhiteSpace(settings?.LocalModel) ? "llama3.1:8b" : settings!.LocalModel.Trim(),
            prompt,
            stream = false,
            format = "json",
        };

        var response = await client.PostAsync(url, new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Local Llama request failed ({(int)response.StatusCode}) for {purpose}: {body}");
        }

        using var doc = JsonDocument.Parse(body);
        if (!doc.RootElement.TryGetProperty("response", out var responseNode))
        {
            throw new InvalidOperationException($"Local Llama returned no 'response' field for {purpose}.");
        }

        return responseNode.GetString() ?? "{}";
    }

    private async Task<string> InvokeClaude(UserAiSetting? settings, string prompt, string purpose)
    {
        var apiKey = settings?.ClaudeApiKey;
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Claude is selected but API key is empty in AI Planner settings.");
        }

        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(120);

        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
        req.Headers.Add("x-api-key", apiKey.Trim());
        req.Headers.Add("anthropic-version", "2023-06-01");
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        req.Content = new StringContent(JsonSerializer.Serialize(new
        {
            model = string.IsNullOrWhiteSpace(settings?.ClaudeModel) ? "claude-3-5-sonnet-latest" : settings!.ClaudeModel.Trim(),
            max_tokens = 1800,
            temperature = 0.2,
            messages = new[] { new { role = "user", content = prompt } },
        }), Encoding.UTF8, "application/json");

        var response = await client.SendAsync(req);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Claude request failed ({(int)response.StatusCode}) for {purpose}: {body}");
        }

        using var doc = JsonDocument.Parse(body);
        if (!doc.RootElement.TryGetProperty("content", out var contentNode) || contentNode.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException($"Claude returned invalid content payload for {purpose}.");
        }

        var sb = new StringBuilder();
        foreach (var item in contentNode.EnumerateArray())
        {
            if (item.TryGetProperty("type", out var typeNode)
                && string.Equals(typeNode.GetString(), "text", StringComparison.OrdinalIgnoreCase)
                && item.TryGetProperty("text", out var textNode))
            {
                sb.AppendLine(textNode.GetString());
            }
        }
        return sb.ToString();
    }

    private static string BuildMealPrompt(DateOnly start, GenerateMealsRequest req, UserHealthProfile? profile, List<MealTemplate> templates)
    {
        var templateRows = templates.Select(t => $"- id={t.Id}, name={t.Name}, timing={t.Timing}, timeOfDay={t.TimeOfDay ?? ""}");
                var sb = new StringBuilder();
                sb.AppendLine("Return STRICT JSON only.");
                sb.AppendLine($"Plan meals for 7 days from {start:yyyy-MM-dd}.");
                sb.AppendLine("Use ONLY these mealTemplateIds:");
                sb.AppendLine(string.Join("\n", templateRows));
                sb.AppendLine();
                var isCustomMode = req.Mode?.Equals("custom", StringComparison.OrdinalIgnoreCase) ?? false;
                if (isCustomMode)
                {
                    sb.AppendLine("*** MODE: CUSTOM (user-defined overrides) ***");
                    if (req.BudgetPerWeek.HasValue) sb.AppendLine($"PRIORITY: Use budget={req.BudgetPerWeek} per week (override profile)");
                    if (!string.IsNullOrWhiteSpace(req.DietPreference)) sb.AppendLine($"PRIORITY: Use diet preference='{req.DietPreference}' (override profile)");
                }
                else
                {
                    sb.AppendLine("*** MODE: PROFILE (use saved user profile) ***");
                }
                sb.AppendLine();
                sb.AppendLine($"mode={req.Mode ?? "profile"}, budgetOverride={req.BudgetPerWeek?.ToString() ?? "none"}, dietOverride={req.DietPreference ?? "none"}");
                sb.AppendLine($"profileHeightCm={profile?.HeightCm?.ToString() ?? "null"}, profileWeightKg={profile?.WeightKg?.ToString() ?? "null"}, profileTargetWeightKg={profile?.TargetWeightKg?.ToString() ?? "null"}, profileCalories={profile?.DailyCaloriesTarget?.ToString() ?? "null"}, profileDiet={profile?.DietPreference ?? "null"}, profileBudget={profile?.BudgetPerWeek?.ToString() ?? "null"}, profileActivity={profile?.ActivityLevel ?? "null"}");
                sb.AppendLine();
                sb.AppendLine("Output schema:");
                sb.AppendLine("{");
                sb.AppendLine("  \"plan\": {");
                sb.AppendLine("    \"YYYY-MM-DD\": [");
                sb.AppendLine("      { \"mealTemplateId\": 1, \"timeOfDay\": \"08:00\" },");
                sb.AppendLine("      { \"mealTemplateId\": 2, \"timeOfDay\": \"13:00\" },");
                sb.AppendLine("      { \"mealTemplateId\": 3, \"timeOfDay\": \"20:00\" }");
                sb.AppendLine("    ]");
                sb.AppendLine("  }");
                sb.AppendLine("}");
                return sb.ToString();
    }

    private static string BuildWorkoutPrompt(GenerateWorkoutsRequest req, UserHealthProfile? profile, List<Exercise> exercises)
    {
        var exerciseRows = exercises.Select(e => $"- id={e.Id}, name={e.Name}, muscleGroup={e.MuscleGroup}");
                var sb = new StringBuilder();
                sb.AppendLine("Return STRICT JSON only.");
                sb.AppendLine("Build weekly routine for monday..sunday.");
                sb.AppendLine("Use ONLY these exerciseIds:");
                sb.AppendLine(string.Join("\n", exerciseRows));
                sb.AppendLine();
                var isCustomMode = req.Mode?.Equals("custom", StringComparison.OrdinalIgnoreCase) ?? false;
                if (isCustomMode)
                {
                    sb.AppendLine("*** MODE: CUSTOM (user-defined overrides) ***");
                    if (req.DaysPerWeek.HasValue) sb.AppendLine($"PRIORITY: Generate routine for {req.DaysPerWeek} days/week (override profile)");
                    if (req.MinutesPerSession.HasValue) sb.AppendLine($"PRIORITY: Each session {req.MinutesPerSession} minutes (override profile)");
                    if (req.SetsDefault.HasValue) sb.AppendLine($"PRIORITY: Default {req.SetsDefault} sets per exercise");
                    if (req.RepsDefault.HasValue) sb.AppendLine($"PRIORITY: Default {req.RepsDefault} reps per set");
                }
                else
                {
                    sb.AppendLine("*** MODE: PROFILE (use saved user profile) ***");
                }
                sb.AppendLine();
                sb.AppendLine($"mode={req.Mode ?? "profile"}, daysPerWeek={req.DaysPerWeek?.ToString() ?? "none"}, minutesPerSession={req.MinutesPerSession?.ToString() ?? "none"}, setsDefault={req.SetsDefault?.ToString() ?? "none"}, repsDefault={req.RepsDefault?.ToString() ?? "none"}");
                sb.AppendLine($"profileHeightCm={profile?.HeightCm?.ToString() ?? "null"}, profileWeightKg={profile?.WeightKg?.ToString() ?? "null"}, profileTargetWeightKg={profile?.TargetWeightKg?.ToString() ?? "null"}, profileCalories={profile?.DailyCaloriesTarget?.ToString() ?? "null"}, profileActivity={profile?.ActivityLevel ?? "null"}");
                sb.AppendLine();
                sb.AppendLine("Output schema:");
                sb.AppendLine("{");
                sb.AppendLine("  \"routine\": {");
                sb.AppendLine("    \"monday\": [{ \"exerciseId\": 1, \"sets\": 3, \"reps\": 10 }],");
                sb.AppendLine("    \"tuesday\": [{ \"exerciseId\": 2, \"sets\": 3, \"reps\": 10 }],");
                sb.AppendLine("    \"wednesday\": [],");
                sb.AppendLine("    \"thursday\": [{ \"exerciseId\": 3, \"sets\": 3, \"reps\": 10 }],");
                sb.AppendLine("    \"friday\": [{ \"exerciseId\": 4, \"sets\": 3, \"reps\": 10 }],");
                sb.AppendLine("    \"saturday\": [],");
                sb.AppendLine("    \"sunday\": []");
                sb.AppendLine("  }");
                sb.AppendLine("}");
                return sb.ToString();
    }

    private static JsonElement ParseJsonObject(string text)
    {
        var trimmed = (text ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed)) throw new InvalidOperationException("AI returned empty response.");

        if (trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            var firstBrace = trimmed.IndexOf('{');
            var lastBrace = trimmed.LastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace) trimmed = trimmed.Substring(firstBrace, lastBrace - firstBrace + 1);
        }

        var start = trimmed.IndexOf('{');
        var end = trimmed.LastIndexOf('}');
        if (start >= 0 && end > start) trimmed = trimmed.Substring(start, end - start + 1);

        using var doc = JsonDocument.Parse(trimmed);
        return doc.RootElement.Clone();
    }

    private static Dictionary<string, List<MealPlanItem>> ParseMealPlan(JsonElement root)
    {
        if (!root.TryGetProperty("plan", out var planNode) || planNode.ValueKind != JsonValueKind.Object)
            throw new InvalidOperationException("Missing 'plan' object.");

        var map = new Dictionary<string, List<MealPlanItem>>(StringComparer.OrdinalIgnoreCase);
        foreach (var day in planNode.EnumerateObject())
        {
            if (day.Value.ValueKind != JsonValueKind.Array) continue;
            var list = new List<MealPlanItem>();
            foreach (var item in day.Value.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object) continue;
                if (!item.TryGetProperty("mealTemplateId", out var idNode) || !idNode.TryGetInt32(out var id)) continue;
                var time = item.TryGetProperty("timeOfDay", out var t) && t.ValueKind == JsonValueKind.String ? t.GetString() : null;
                list.Add(new MealPlanItem(id, time));
            }
            map[day.Name] = list;
        }
        return map;
    }

    private static Dictionary<string, List<WorkoutPlanItem>> ParseWorkoutRoutine(JsonElement root)
    {
        if (!root.TryGetProperty("routine", out var routineNode) || routineNode.ValueKind != JsonValueKind.Object)
            throw new InvalidOperationException("Missing 'routine' object.");

        var map = new Dictionary<string, List<WorkoutPlanItem>>(StringComparer.OrdinalIgnoreCase);
        foreach (var day in routineNode.EnumerateObject())
        {
            if (day.Value.ValueKind != JsonValueKind.Array) continue;
            var list = new List<WorkoutPlanItem>();
            foreach (var item in day.Value.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object) continue;
                if (!item.TryGetProperty("exerciseId", out var idNode) || !idNode.TryGetInt32(out var id)) continue;
                var sets = item.TryGetProperty("sets", out var s) && s.TryGetInt32(out var sv) ? sv : 3;
                var reps = item.TryGetProperty("reps", out var r) && r.TryGetInt32(out var rv) ? rv : 10;
                list.Add(new WorkoutPlanItem(id, sets, reps));
            }
            map[day.Name] = list;
        }
        return map;
    }

    private static string? SerializeMedicalConditions(IReadOnlyList<MedicalCondition>? conditions)
    {
        if (conditions == null || conditions.Count == 0) return null;
        return JsonSerializer.Serialize(conditions);
    }

    private static MedicalCondition[] ParseMedicalConditions(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return Array.Empty<MedicalCondition>();
        try
        {
            return JsonSerializer.Deserialize<MedicalCondition[]>(raw) ?? Array.Empty<MedicalCondition>();
        }
        catch
        {
            return Array.Empty<MedicalCondition>();
        }
    }

    private static string NormalizeDateKey(string key)
    {
        return DateOnly.TryParse(key, out var d) ? d.ToString("yyyy-MM-dd") : string.Empty;
    }

    private record MealPlanItem(int MealTemplateId, string? TimeOfDay);
    private record WorkoutPlanItem(int ExerciseId, int Sets, int Reps);
}

public record UpsertAiSettingsRequest(string? Provider, string? LocalEndpoint, string? LocalModel, string? ClaudeApiKey, string? ClaudeModel);

public record UpsertHealthProfileRequest(
    int? Age,
    string? Gender,
    decimal? HeightCm,
    decimal? WeightKg,
    decimal? TargetWeightKg,
    int? DailyCaloriesTarget,
    string? DietPreference,
    decimal? BudgetPerWeek,
    string? ActivityLevel,
    MedicalCondition[]? MedicalConditions,
    string? TargetDate);

public record GenerateMealsRequest(string? StartDate, string? Mode, decimal? BudgetPerWeek, string? DietPreference);

public record GenerateWorkoutsRequest(string? Mode, int? DaysPerWeek, int? MinutesPerSession, int? SetsDefault, int? RepsDefault);

public record RecommendHealthRequest(
    decimal? HeightCm,
    decimal? WeightKg,
    decimal? TargetWeightKg,
    string? TargetDate,
    int? Age,
    string? Gender,
    string? ActivityLevel,
    MedicalCondition[]? MedicalConditions,
    string? DietPreference);
