using System.Text.Json;
using GoodDaysApi.Models;
using GoodDaysApi.Models.DTOs;
using GoodDaysApi.Services.Goals;
using GoodDaysApi.Services.Meals;
using GoodDaysApi.Services.Workouts;
using GoodDaysApi.Services.Journal;
using GoodDaysApi.Services.Finance;
using GoodDaysApi.Services.Body;

namespace GoodDaysApi.Services.Ai;

public interface IAiToolExecutor
{
    Task<string> ExecuteAsync(int userId, string toolName, Dictionary<string, JsonElement> parameters);
}

public class AiToolExecutor : IAiToolExecutor
{
    private readonly IGoalsService _goalsService;
    private readonly IMealService _mealService;
    private readonly IWorkoutService _workoutService;
    private readonly IJournalService _journalService;
    private readonly IExpenseService _expenseService;
    private readonly IBodyMetricsService _bodyMetricsService;
    private readonly ILogger<AiToolExecutor> _logger;

    public AiToolExecutor(
        IGoalsService goalsService,
        IMealService mealService,
        IWorkoutService workoutService,
        IJournalService journalService,
        IExpenseService expenseService,
        IBodyMetricsService bodyMetricsService,
        ILogger<AiToolExecutor> logger)
    {
        _goalsService = goalsService;
        _mealService = mealService;
        _workoutService = workoutService;
        _journalService = journalService;
        _expenseService = expenseService;
        _bodyMetricsService = bodyMetricsService;
        _logger = logger;
    }

    public async Task<string> ExecuteAsync(int userId, string toolName, Dictionary<string, JsonElement> parameters)
    {
        try
        {
            return toolName switch
            {
                // ===== GOALS =====
                "create_goal" => await HandleCreateGoal(userId, parameters),
                "update_goal_progress" => await HandleUpdateGoalProgress(userId, parameters),
                "list_goals" => await HandleListGoals(userId, parameters),

                // ===== MEALS & INGREDIENTS =====
                "create_meal_template" => await HandleCreateMealTemplate(userId, parameters),
                "log_meal" => await HandleLogMeal(userId, parameters),
                "add_ingredient" => await HandleAddIngredient(userId, parameters),
                "analyze_nutrition" => await HandleAnalyzeNutrition(userId, parameters),

                // ===== WORKOUTS & EXERCISES =====
                "create_exercise" => await HandleCreateExercise(userId, parameters),
                "log_workout" => await HandleLogWorkout(userId, parameters),
                "log_personal_record" => await HandleLogPersonalRecord(userId, parameters),
                "analyze_workout" => await HandleAnalyzeWorkout(userId, parameters),

                // ===== DAILY TRACKING =====
                "log_daily_metrics" => await HandleLogDailyMetrics(userId, parameters),
                "get_daily_summary" => await HandleGetDailySummary(userId, parameters),
                "analyze_metrics" => await HandleAnalyzeMetrics(userId, parameters),

                // ===== JOURNAL & NOTES =====
                "add_journal_entry" => await HandleAddJournalEntry(userId, parameters),
                "analyze_journal" => await HandleAnalyzeJournal(userId, parameters),

                // ===== EXPENSES & FINANCE =====
                "log_expense" => await HandleLogExpense(userId, parameters),
                "analyze_spending" => await HandleAnalyzeSpending(userId, parameters),
                "get_financial_summary" => await HandleGetFinancialSummary(userId, parameters),

                // ===== BODY METRICS =====
                "log_body_weight" => await HandleLogBodyWeight(userId, parameters),
                "analyze_body_progress" => await HandleAnalyzeBodyProgress(userId, parameters),

                // ===== ANALYSIS & INSIGHTS =====
                "get_weekly_stats" => await HandleGetWeeklyStats(userId, parameters),
                "get_monthly_stats" => await HandleGetMonthlyStats(userId, parameters),
                "get_insights" => await HandleGetInsights(userId, parameters),
                "get_current_status" => await HandleGetCurrentStatus(userId, parameters),

                _ => $"Unknown tool: {toolName}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error executing tool {toolName}");
            return $"Error: {ex.Message}";
        }
    }

    // ===== GOALS =====
    private async Task<string> HandleCreateGoal(int userId, Dictionary<string, JsonElement> parameters)
    {
        var title = GetStringParam(parameters, "title");
        var target = GetDecimalParam(parameters, "target");
        var unit = GetStringParam(parameters, "unit");
        var category = GetStringParam(parameters, "category");
        var recurring = GetBoolParam(parameters, "recurring");
        var interval = GetStringParam(parameters, "interval");
        var deadline = GetStringParam(parameters, "deadline");

        var goal = new Goal
        {
            UserId = userId,
            Title = title,
            TargetValue = (double)target,
            Unit = unit,
            Category = category,
            IsRecurring = recurring,
            RecurringInterval = recurring ? interval : null,
            Deadline = !string.IsNullOrEmpty(deadline) ? DateTime.Parse(deadline) : null,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _goalsService.CreateGoalAsync(goal);
        return $"✅ Created goal: {title} (ID: {result.Id})";
    }

    private async Task<string> HandleUpdateGoalProgress(int userId, Dictionary<string, JsonElement> parameters)
    {
        var goalId = GetIntParam(parameters, "goal_id");
        var progressValue = GetDecimalParam(parameters, "progress_value");

        var goal = await _goalsService.GetGoalByIdAsync(goalId);
        if (goal == null || goal.UserId != userId)
            return "Goal not found";

        goal.CurrentValue = (double)progressValue;
        goal.UpdatedAt = DateTime.UtcNow;
        await _goalsService.UpdateGoalAsync(goal);

        var percentComplete = (progressValue / goal.TargetValue * 100);
        return $"✅ Updated {goal.Title}: {progressValue}/{goal.TargetValue} {goal.Unit} ({percentComplete:F1}% complete)";
    }

    private async Task<string> HandleListGoals(int userId, Dictionary<string, JsonElement> parameters)
    {
        var filter = GetStringParam(parameters, "filter") ?? "all";

        var goals = await _goalsService.GetUserGoalsAsync(userId);

        if (filter == "recurring")
            goals = goals.Where(g => g.IsRecurring).ToList();
        else if (filter == "one-time")
            goals = goals.Where(g => !g.IsRecurring).ToList();

        if (!goals.Any())
            return "No goals found";

        var list = string.Join("\n", goals.Select(g =>
            $"• {g.Title}: {g.CurrentValue}/{g.TargetValue} {g.Unit}" +
            (g.IsRecurring ? $" (every {g.RecurringInterval})" : "")));

        return $"📋 Your goals:\n{list}";
    }

    // ===== MEALS & INGREDIENTS =====
    private async Task<string> HandleCreateMealTemplate(int userId, Dictionary<string, JsonElement> parameters)
    {
        var name = GetStringParam(parameters, "name");
        var ingredientsJson = parameters["ingredients"].GetString();
        var calories = GetDecimalParam(parameters, "calories");

        // Parse ingredients array - simplified for now
        var result = await _mealService.CreateMealTemplateAsync(new MealTemplate
        {
            UserId = userId,
            Name = name,
            Calories = calories == 0 ? null : (int?)calories,
            CreatedAt = DateTime.UtcNow
        });

        return $"✅ Created meal template: {name}";
    }

    private async Task<string> HandleLogMeal(int userId, Dictionary<string, JsonElement> parameters)
    {
        var mealName = GetStringParam(parameters, "meal_name");
        var date = GetStringParam(parameters, "date");
        var calories = GetDecimalParam(parameters, "calories");

        var mealLog = new MealLog
        {
            UserId = userId,
            MealName = mealName,
            LoggedDate = DateTime.Parse(date),
            Calories = calories == 0 ? null : (int?)calories,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _mealService.LogMealAsync(mealLog);
        return $"✅ Logged meal: {mealName} on {date}" + (calories > 0 ? $" ({calories} cal)" : "");
    }

    private async Task<string> HandleAddIngredient(int userId, Dictionary<string, JsonElement> parameters)
    {
        var name = GetStringParam(parameters, "name");
        var caloriesPer100g = GetDecimalParam(parameters, "calories_per_100g");
        var protein = GetDecimalParam(parameters, "protein_g");
        var carbs = GetDecimalParam(parameters, "carbs_g");
        var fat = GetDecimalParam(parameters, "fat_g");

        var ingredient = new Ingredient
        {
            UserId = userId,
            Name = name,
            CaloriesPer100g = caloriesPer100g,
            ProteinPer100g = protein,
            CarbsPer100g = carbs,
            FatPer100g = fat,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _mealService.AddIngredientAsync(ingredient);
        return $"✅ Added ingredient: {name}";
    }

    private async Task<string> HandleAnalyzeNutrition(int userId, Dictionary<string, JsonElement> parameters)
    {
        var startDate = DateTime.Parse(GetStringParam(parameters, "start_date"));
        var endDate = DateTime.Parse(GetStringParam(parameters, "end_date"));

        var analysis = await _mealService.AnalyzeNutritionAsync(userId, startDate, endDate);
        return $"📊 Nutrition Analysis ({startDate:MMM d} - {endDate:MMM d}):\n" +
               $"Total Calories: {analysis.TotalCalories}\n" +
               $"Avg Daily: {analysis.AverageDaily}\n" +
               $"Protein: {analysis.TotalProtein}g\n" +
               $"Carbs: {analysis.TotalCarbs}g\n" +
               $"Fat: {analysis.TotalFat}g";
    }

    // ===== WORKOUTS & EXERCISES =====
    private async Task<string> HandleCreateExercise(int userId, Dictionary<string, JsonElement> parameters)
    {
        var name = GetStringParam(parameters, "name");
        var category = GetStringParam(parameters, "category");

        var exercise = new Exercise
        {
            UserId = userId,
            Name = name,
            Category = category,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _workoutService.CreateExerciseAsync(exercise);
        return $"✅ Added exercise: {name}";
    }

    private async Task<string> HandleLogWorkout(int userId, Dictionary<string, JsonElement> parameters)
    {
        var exerciseName = GetStringParam(parameters, "exercise_name");
        var date = GetStringParam(parameters, "date");
        var sets = GetIntParam(parameters, "sets");
        var reps = GetIntParam(parameters, "reps");
        var weightKg = GetDecimalParam(parameters, "weight_kg");
        var durationMinutes = GetIntParam(parameters, "duration_minutes");

        var workout = new WorkoutLog
        {
            UserId = userId,
            ExerciseName = exerciseName,
            LoggedDate = DateTime.Parse(date),
            Sets = sets,
            Reps = reps,
            WeightKg = weightKg > 0 ? weightKg : null,
            DurationMinutes = durationMinutes > 0 ? durationMinutes : null,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _workoutService.LogWorkoutAsync(workout);
        return $"✅ Logged workout: {sets}x{reps} {exerciseName}" +
               (weightKg > 0 ? $" @ {weightKg}kg" : "") +
               (durationMinutes > 0 ? $" ({durationMinutes}min)" : "");
    }

    private async Task<string> HandleLogPersonalRecord(int userId, Dictionary<string, JsonElement> parameters)
    {
        var exerciseName = GetStringParam(parameters, "exercise_name");
        var weightKg = GetDecimalParam(parameters, "weight_kg");
        var reps = GetIntParam(parameters, "reps");

        var pr = new PersonalRecord
        {
            UserId = userId,
            ExerciseName = exerciseName,
            WeightKg = weightKg,
            Reps = reps,
            RecordedAt = DateTime.UtcNow
        };

        var result = await _workoutService.LogPersonalRecordAsync(pr);
        return $"🏆 New PR! {exerciseName}: {reps} reps @ {weightKg}kg";
    }

    private async Task<string> HandleAnalyzeWorkout(int userId, Dictionary<string, JsonElement> parameters)
    {
        var daysBack = GetIntParam(parameters, "days_back");

        var startDate = DateTime.UtcNow.AddDays(-daysBack);
        var analysis = await _workoutService.AnalyzeWorkoutTrendsAsync(userId, startDate, DateTime.UtcNow);

        return $"💪 Workout Analysis (last {daysBack} days):\n" +
               $"Total Sessions: {analysis.TotalSessions}\n" +
               $"Total Volume: {analysis.TotalVolume}kg\n" +
               $"Avg per session: {analysis.AveragePerSession}kg";
    }

    // ===== DAILY TRACKING =====
    private async Task<string> HandleLogDailyMetrics(int userId, Dictionary<string, JsonElement> parameters)
    {
        var date = GetStringParam(parameters, "date");
        var sleepHours = GetDecimalParam(parameters, "sleep_hours");
        var workoutMinutes = GetIntParam(parameters, "workout_minutes");
        var mood = GetIntParam(parameters, "mood");
        var waterCups = GetDecimalParam(parameters, "water_cups");
        var calories = GetDecimalParam(parameters, "calories");

        var metrics = new DailyMetrics
        {
            UserId = userId,
            LoggedDate = DateTime.Parse(date),
            SleepHours = sleepHours > 0 ? sleepHours : null,
            WorkoutMinutes = workoutMinutes > 0 ? workoutMinutes : null,
            Mood = mood > 0 ? mood : null,
            WaterCups = waterCups > 0 ? waterCups : null,
            Calories = calories > 0 ? (int?)calories : null,
            CreatedAt = DateTime.UtcNow
        };

        await _bodyMetricsService.LogDailyMetricsAsync(metrics);
        return $"✅ Logged daily metrics for {date}";
    }

    private async Task<string> HandleGetDailySummary(int userId, Dictionary<string, JsonElement> parameters)
    {
        var date = GetStringParam(parameters, "date");
        var metrics = await _bodyMetricsService.GetDailyMetricsAsync(userId, DateTime.Parse(date));

        if (metrics == null)
            return $"No metrics logged for {date}";

        return $"📈 Daily Summary for {date}:\n" +
               $"Sleep: {metrics.SleepHours}h\n" +
               $"Workout: {metrics.WorkoutMinutes}min\n" +
               $"Mood: {metrics.Mood}/10\n" +
               $"Water: {metrics.WaterCups} cups\n" +
               $"Calories: {metrics.Calories}";
    }

    private async Task<string> HandleAnalyzeMetrics(int userId, Dictionary<string, JsonElement> parameters)
    {
        var metricType = GetStringParam(parameters, "metric_type") ?? "all";
        var daysBack = GetIntParam(parameters, "days_back");

        var startDate = DateTime.UtcNow.AddDays(-daysBack);
        var analysis = await _bodyMetricsService.AnalyzeMetricsAsync(userId, startDate, DateTime.UtcNow);

        return $"📊 Metrics Analysis (last {daysBack} days):\n" +
               $"Avg Sleep: {analysis.AvgSleep}h\n" +
               $"Avg Mood: {analysis.AvgMood}/10\n" +
               $"Workouts: {analysis.WorkoutCount}\n" +
               $"Avg Calories: {analysis.AvgCalories}";
    }

    // ===== JOURNAL & NOTES =====
    private async Task<string> HandleAddJournalEntry(int userId, Dictionary<string, JsonElement> parameters)
    {
        var content = GetStringParam(parameters, "content");
        var date = GetStringParam(parameters, "date");
        var mood = GetIntParam(parameters, "mood");

        var entry = new JournalEntry
        {
            UserId = userId,
            Content = content,
            EntryDate = DateTime.Parse(date),
            Mood = mood > 0 ? mood : null,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _journalService.CreateEntryAsync(entry);
        return $"📝 Journal entry created for {date}";
    }

    private async Task<string> HandleAnalyzeJournal(int userId, Dictionary<string, JsonElement> parameters)
    {
        var daysBack = GetIntParam(parameters, "days_back");

        var startDate = DateTime.UtcNow.AddDays(-daysBack);
        var analysis = await _journalService.AnalyzeEntriesAsync(userId, startDate, DateTime.UtcNow);

        return $"📚 Journal Analysis (last {daysBack} days):\n" +
               $"Entries: {analysis.EntryCount}\n" +
               $"Avg Mood: {analysis.AvgMood}/10\n" +
               $"Most common themes: {string.Join(", ", analysis.TopThemes)}";
    }

    // ===== EXPENSES & FINANCE =====
    private async Task<string> HandleLogExpense(int userId, Dictionary<string, JsonElement> parameters)
    {
        var amount = GetDecimalParam(parameters, "amount");
        var category = GetStringParam(parameters, "category");
        var description = GetStringParam(parameters, "description");
        var date = GetStringParam(parameters, "date");

        var expense = new Expense
        {
            UserId = userId,
            Amount = amount,
            Category = category,
            Description = description,
            TransactionDate = DateTime.Parse(date),
            CreatedAt = DateTime.UtcNow
        };

        var result = await _expenseService.LogExpenseAsync(expense);
        return $"💰 Logged expense: {category} - ${amount} ({description})";
    }

    private async Task<string> HandleAnalyzeSpending(int userId, Dictionary<string, JsonElement> parameters)
    {
        var period = GetStringParam(parameters, "period") ?? "monthly";

        var analysis = await _expenseService.AnalyzeSpendingAsync(userId, period);

        var categoryBreakdown = string.Join("\n", analysis.ByCategory
            .Select(kvp => $"  {kvp.Key}: ${kvp.Value}"));

        return $"💸 Spending Analysis ({period}):\n" +
               $"Total: ${analysis.Total}\n" +
               $"By Category:\n{categoryBreakdown}";
    }

    private async Task<string> HandleGetFinancialSummary(int userId, Dictionary<string, JsonElement> parameters)
    {
        var period = GetStringParam(parameters, "period") ?? "monthly";

        var summary = await _expenseService.GetFinancialSummaryAsync(userId, period);

        return $"📊 Financial Summary ({period}):\n" +
               $"Total Spent: ${summary.TotalSpent}\n" +
               $"Categories: {summary.CategoryCount}\n" +
               $"Avg per transaction: ${summary.AvgTransaction}";
    }

    // ===== BODY METRICS =====
    private async Task<string> HandleLogBodyWeight(int userId, Dictionary<string, JsonElement> parameters)
    {
        var weightKg = GetDecimalParam(parameters, "weight_kg");
        var date = GetStringParam(parameters, "date");

        var weight = new BodyWeight
        {
            UserId = userId,
            WeightKg = weightKg,
            LoggedDate = DateTime.Parse(date),
            CreatedAt = DateTime.UtcNow
        };

        await _bodyMetricsService.LogBodyWeightAsync(weight);
        return $"⚖️ Logged weight: {weightKg}kg on {date}";
    }

    private async Task<string> HandleAnalyzeBodyProgress(int userId, Dictionary<string, JsonElement> parameters)
    {
        var daysBack = GetIntParam(parameters, "days_back");

        var startDate = DateTime.UtcNow.AddDays(-daysBack);
        var progress = await _bodyMetricsService.AnalyzeBodyProgressAsync(userId, startDate, DateTime.UtcNow);

        var trend = progress.LatestWeight < progress.StartWeight ? "📉 Down" : "📈 Up";
        var diff = Math.Abs(progress.LatestWeight - progress.StartWeight);

        return $"💪 Body Progress (last {daysBack} days):\n" +
               $"{trend} {diff}kg\n" +
               $"Start: {progress.StartWeight}kg\n" +
               $"Current: {progress.LatestWeight}kg\n" +
               $"Avg: {progress.AvgWeight}kg";
    }

    // ===== ANALYSIS & INSIGHTS =====
    private async Task<string> HandleGetWeeklyStats(int userId, Dictionary<string, JsonElement> parameters)
    {
        var stats = await GetComprehensiveStatsAsync(userId, 7);
        return stats;
    }

    private async Task<string> HandleGetMonthlyStats(int userId, Dictionary<string, JsonElement> parameters)
    {
        var stats = await GetComprehensiveStatsAsync(userId, 30);
        return stats;
    }

    private async Task<string> HandleGetInsights(int userId, Dictionary<string, JsonElement> parameters)
    {
        var startDate = DateTime.UtcNow.AddDays(-30);
        
        // Collect insights from various services
        var goals = await _goalsService.GetUserGoalsAsync(userId);
        var workouts = await _workoutService.GetRecentWorkoutsAsync(userId, startDate);
        var meals = await _mealService.GetRecentMealsAsync(userId, startDate);
        var metrics = await _bodyMetricsService.GetMetricsAsync(userId, startDate, DateTime.UtcNow);

        var insights = new List<string>();

        if (goals.Any(g => g.CurrentValue >= g.TargetValue))
            insights.Add("✅ You've completed some goals!");

        if (workouts.Count() > 15)
            insights.Add("💪 Great consistency with workouts!");

        if (meals.Any())
            insights.Add("🥗 You've been tracking meals regularly!");

        if (metrics.Any(m => m.SleepHours >= 8))
            insights.Add("😴 Getting good sleep!");

        return "🔍 Insights:\n" + string.Join("\n", insights);
    }

    private async Task<string> HandleGetCurrentStatus(int userId, Dictionary<string, JsonElement> parameters)
    {
        var goals = await _goalsService.GetUserGoalsAsync(userId);
        var todayWorkouts = await _workoutService.GetTodayWorkoutsAsync(userId);
        var todayMetrics = await _bodyMetricsService.GetDailyMetricsAsync(userId, DateTime.UtcNow.Date);

        return $"📊 Current Status:\n" +
               $"Active Goals: {goals.Count()}\n" +
               $"Today's Workouts: {todayWorkouts.Count()}\n" +
               $"Mood Today: {todayMetrics?.Mood}/10";
    }

    private async Task<string> GetComprehensiveStatsAsync(int userId, int days)
    {
        var startDate = DateTime.UtcNow.AddDays(-days);

        var goals = await _goalsService.GetUserGoalsAsync(userId);
        var workouts = await _workoutService.GetRecentWorkoutsAsync(userId, startDate);
        var metrics = await _bodyMetricsService.GetMetricsAsync(userId, startDate, DateTime.UtcNow);

        var period = days == 7 ? "Weekly" : "Monthly";
        return $"📊 {period} Stats:\n" +
               $"Goals Progress: {goals.Count()} active\n" +
               $"Workouts: {workouts.Count()} sessions\n" +
               $"Avg Sleep: {metrics.Average(m => m.SleepHours ?? 0):F1}h\n" +
               $"Avg Mood: {metrics.Average(m => m.Mood ?? 0):F1}/10";
    }

    // ===== HELPER METHODS =====
    private string GetStringParam(Dictionary<string, JsonElement> parameters, string key)
    {
        return parameters.TryGetValue(key, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString() ?? string.Empty
            : string.Empty;
    }

    private int GetIntParam(Dictionary<string, JsonElement> parameters, string key)
    {
        return parameters.TryGetValue(key, out var value) && value.ValueKind == JsonValueKind.Number
            ? value.GetInt32()
            : 0;
    }

    private decimal GetDecimalParam(Dictionary<string, JsonElement> parameters, string key)
    {
        return parameters.TryGetValue(key, out var value) && value.ValueKind == JsonValueKind.Number
            ? (decimal)value.GetDouble()
            : 0;
    }

    private bool GetBoolParam(Dictionary<string, JsonElement> parameters, string key)
    {
        return parameters.TryGetValue(key, out var value) && value.ValueKind == JsonValueKind.True;
    }
}
