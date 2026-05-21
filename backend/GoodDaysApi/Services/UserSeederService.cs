using GoodDaysApi.Data;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Services;

public interface IUserSeederService
{
    Task SeedUserLibrariesAsync(int userId);
}

public class UserSeederService : IUserSeederService
{
    private readonly AppDbContext _db;
    private readonly ILogger<UserSeederService> _logger;

    public UserSeederService(AppDbContext db, ILogger<UserSeederService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task SeedUserLibrariesAsync(int userId)
    {
        try
        {
            await SeedMealIngredientsAsync(userId);
            await SeedMealTemplatesAsync(userId);
            await SeedWorkoutPresetAsync(userId);
            _logger.LogInformation("Successfully seeded libraries for user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to seed libraries for user {UserId}", userId);
            throw;
        }
    }

    private class IngredientSeed
    {
        public string Name { get; set; } = string.Empty;
        public int CaloriesKcal { get; set; }
        public double ProteinG { get; set; }
        public double CarbsG { get; set; }
        public double FatsG { get; set; }
    }

    private async Task SeedMealIngredientsAsync(int userId)
    {
        // Check if user already has ingredients (avoid re-seeding)
        var existingCount = await _db.MealIngredients.CountAsync(i => i.UserId == userId);
        if (existingCount > 0) return;

        var ingredients = new List<IngredientSeed>
        {
            // Proteins
            new IngredientSeed { Name = "Chicken Breast", CaloriesKcal = 165, ProteinG = 31, CarbsG = 0, FatsG = 3.6 },
            new IngredientSeed { Name = "Egg Whole", CaloriesKcal = 155, ProteinG = 13, CarbsG = 1.1, FatsG = 11 },
            new IngredientSeed { Name = "Egg Whites", CaloriesKcal = 52, ProteinG = 11, CarbsG = 0.7, FatsG = 0.2 },
            new IngredientSeed { Name = "Paneer", CaloriesKcal = 265, ProteinG = 18, CarbsG = 6, FatsG = 20 },
            new IngredientSeed { Name = "Whey Protein", CaloriesKcal = 400, ProteinG = 80, CarbsG = 8, FatsG = 6 },
            new IngredientSeed { Name = "Greek Yogurt", CaloriesKcal = 97, ProteinG = 10, CarbsG = 3.6, FatsG = 5 },

            // Carbs
            new IngredientSeed { Name = "White Rice Cooked", CaloriesKcal = 130, ProteinG = 2.7, CarbsG = 28, FatsG = 0.3 },
            new IngredientSeed { Name = "Oats Rolled", CaloriesKcal = 389, ProteinG = 16.9, CarbsG = 66.3, FatsG = 6.9 },
            new IngredientSeed { Name = "Whole Wheat Roti", CaloriesKcal = 120, ProteinG = 4, CarbsG = 22, FatsG = 2.5 },
            new IngredientSeed { Name = "Sweet Potato", CaloriesKcal = 86, ProteinG = 1.6, CarbsG = 20, FatsG = 0.1 },
            new IngredientSeed { Name = "Banana", CaloriesKcal = 89, ProteinG = 1.1, CarbsG = 23, FatsG = 0.3 },

            // Vegetables
            new IngredientSeed { Name = "Spinach", CaloriesKcal = 23, ProteinG = 2.9, CarbsG = 3.6, FatsG = 0.4 },
            new IngredientSeed { Name = "Broccoli", CaloriesKcal = 34, ProteinG = 2.8, CarbsG = 7, FatsG = 0.4 },
            new IngredientSeed { Name = "Mixed Vegetables", CaloriesKcal = 65, ProteinG = 3, CarbsG = 12, FatsG = 1 },

            // Fats
            new IngredientSeed { Name = "Almonds", CaloriesKcal = 579, ProteinG = 21, CarbsG = 22, FatsG = 50 },
            new IngredientSeed { Name = "Peanut Butter", CaloriesKcal = 588, ProteinG = 25, CarbsG = 20, FatsG = 50 },

            // Misc
            new IngredientSeed { Name = "Milk Toned", CaloriesKcal = 46, ProteinG = 3.5, CarbsG = 4.7, FatsG = 1.5 },
            new IngredientSeed { Name = "Curd Homemade", CaloriesKcal = 60, ProteinG = 3.5, CarbsG = 4.7, FatsG = 3.3 },
        };

        foreach (var ing in ingredients)
        {
            var exists = await _db.MealIngredients.AnyAsync(i =>
                i.UserId == userId && i.Name.ToLower() == ing.Name.ToLower());

            if (!exists)
            {
                var ingredient = new Models.MealIngredient
                {
                    UserId = userId,
                    Name = ing.Name,
                    CaloriesKcal = ing.CaloriesKcal,
                    ProteinG = ing.ProteinG,
                    CarbsG = ing.CarbsG,
                    FatsG = ing.FatsG,
                    CreatedAt = DateTime.UtcNow,
                };
                _db.MealIngredients.Add(ingredient);
            }
        }

        await _db.SaveChangesAsync();
    }

    private async Task SeedMealTemplatesAsync(int userId)
    {
        // Check if user already has templates (avoid re-seeding)
        var existingCount = await _db.MealTemplates.CountAsync(t => t.UserId == userId);
        if (existingCount > 0) return;

        var templates = new[]
        {
            new
            {
                Name = "Egg White Omelette + Oats Bowl",
                Timing = "breakfast",
                IngredientsJson = @"[{""name"":""Egg Whites"",""qty"":200,""caloriesKcal"":104,""proteinG"":22,""carbsG"":1.4,""fatsG"":0.4},{""name"":""Oats Rolled"",""qty"":80,""caloriesKcal"":311.2,""proteinG"":13.52,""carbsG"":53.04,""fatsG"":5.52}]",
                Recipe = "Cook 2 egg whites as omelette + 80g oats with milk. ~415 kcal | 35.5g protein.",
            },
            new
            {
                Name = "Chicken Dal Rice Thali",
                Timing = "lunch",
                IngredientsJson = @"[{""name"":""Chicken Breast"",""qty"":200,""caloriesKcal"":330,""proteinG"":62,""carbsG"":0,""fatsG"":7.2},{""name"":""White Rice Cooked"",""qty"":250,""caloriesKcal"":325,""proteinG"":6.75,""carbsG"":70,""fatsG"":0.75}]",
                Recipe = "200g grilled chicken + 250g rice + dal. ~935 kcal | 85g protein.",
            },
            new
            {
                Name = "Banana Oats Pre-Workout",
                Timing = "pre-workout",
                IngredientsJson = @"[{""name"":""Banana"",""qty"":200,""caloriesKcal"":178,""proteinG"":2.2,""carbsG"":46,""fatsG"":0.6},{""name"":""Oats Rolled"",""qty"":60,""caloriesKcal"":233.4,""proteinG"":10.14,""carbsG"":39.78,""fatsG"":4.14}]",
                Recipe = "2 bananas + 60g oats. ~411 kcal | 12g protein.",
            },
            new
            {
                Name = "Whey Banana Post-Workout Shake",
                Timing = "post-workout",
                IngredientsJson = @"[{""name"":""Whey Protein"",""qty"":40,""caloriesKcal"":160,""proteinG"":32,""carbsG"":3.2,""fatsG"":2.4},{""name"":""Banana"",""qty"":150,""caloriesKcal"":133.5,""proteinG"":1.65,""carbsG"":34.5,""fatsG"":0.45},{""name"":""Milk Toned"",""qty"":300,""caloriesKcal"":138,""proteinG"":10.5,""carbsG"":14.1,""fatsG"":4.5}]",
                Recipe = "Whey + banana + milk. ~432 kcal | 44g protein.",
            },
            new
            {
                Name = "Boiled Eggs Snack",
                Timing = "snack",
                IngredientsJson = @"[{""name"":""Egg Whole"",""qty"":100,""caloriesKcal"":155,""proteinG"":13,""carbsG"":1.1,""fatsG"":11},{""name"":""Egg Whites"",""qty"":100,""caloriesKcal"":52,""proteinG"":11,""carbsG"":0.7,""fatsG"":0.2}]",
                Recipe = "2 whole eggs + 2 egg whites. ~207 kcal | 24g protein.",
            },
        };

        foreach (var template in templates)
        {
            var exists = await _db.MealTemplates.AnyAsync(t =>
                t.UserId == userId && t.Name.ToLower() == template.Name.ToLower());

            if (!exists)
            {
                var mealTemplate = new Models.MealTemplate
                {
                    UserId = userId,
                    Name = template.Name,
                    Timing = template.Timing,
                    IngredientsJson = template.IngredientsJson,
                    Recipe = template.Recipe,
                    CreatedAt = DateTime.UtcNow,
                };
                _db.MealTemplates.Add(mealTemplate);
            }
        }

        await _db.SaveChangesAsync();
    }

    private async Task SeedWorkoutPresetAsync(int userId)
    {
        // Check if user already has a preset (avoid re-seeding)
        var existingPreset = await _db.WorkoutSplitPresets.FirstOrDefaultAsync(s =>
            s.UserId == userId && s.Name.ToLower().Contains("lean bulk"));

        if (existingPreset != null) return;

        // Build the day configs JSON (simplified version)
        var dayConfigs = new
        {
            monday = new object[] { },
            tuesday = new object[] { },
            wednesday = new object[] { },
            thursday = new object[] { },
            friday = new object[] { },
            saturday = new object[] { },
            sunday = new object[] { },
        };

        var preset = new Models.WorkoutSplitPreset
        {
            UserId = userId,
            Name = "Lean Bulk 5-Day - Intermediate",
            DayConfigs = System.Text.Json.JsonSerializer.Serialize(dayConfigs),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        _db.WorkoutSplitPresets.Add(preset);
        await _db.SaveChangesAsync();
    }
}
